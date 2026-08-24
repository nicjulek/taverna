import { describe, expect, it } from 'vitest'
import { bloodied, initiativeOrder, nextTurn, previousTurn, readEffects, tickEffects } from './conditions'
import { adjustDamage, damageTypeOf, damageTypesIn } from './damage'

describe('tipos de dano', () => {
  it('entende o nome em português e em inglês', () => {
    expect(damageTypeOf('Concussão')).toBe('bludgeoning')
    expect(damageTypeOf('cortante')).toBe('slashing')
    expect(damageTypeOf('Necrotic')).toBe('necrotic')
    expect(damageTypeOf('mágico')).toBeNull()
    expect(damageTypesIn(['acid', 'bludgeoning, piercing, and slashing from nonmagical weapons'])).toEqual([
      'acid',
      'bludgeoning',
      'piercing',
      'slashing'
    ])
  })

  it('aplica resistência, imunidade e vulnerabilidade', () => {
    const skeleton = { immunities: ['poison' as const], vulnerabilities: ['bludgeoning' as const], resistances: [] }
    expect(adjustDamage(7, 'bludgeoning', skeleton)).toEqual({ amount: 14, adjustment: 'vulnerable' })
    expect(adjustDamage(7, 'poison', skeleton)).toEqual({ amount: 0, adjustment: 'immune' })
    expect(adjustDamage(7, 'fire', { resistances: ['fire'] })).toEqual({ amount: 3, adjustment: 'resistant' })
    expect(adjustDamage(7, 'fire', { resistances: ['fire'], vulnerabilities: ['fire'] })).toEqual({ amount: 7, adjustment: 'normal' })
    expect(adjustDamage(7.8, null, {})).toEqual({ amount: 7, adjustment: 'normal' })
  })
})

describe('iniciativa', () => {
  const entries = [
    { id: 'a', name: 'Kobold', initiative: 12, bonus: 2 },
    { id: 'b', name: 'Lia', initiative: 18, bonus: 4 },
    { id: 'c', name: 'Doran', initiative: 12, bonus: 0 },
    { id: 'd', name: 'Lobo', initiative: null, bonus: 2 }
  ]

  it('ordena por iniciativa e desempata pelo bônus', () => {
    expect(initiativeOrder(entries).map((e) => e.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('passa a vez e conta as rodadas', () => {
    expect(nextTurn(entries, null, 0)).toEqual({ turn: 'b', round: 1 })
    expect(nextTurn(entries, 'c', 1)).toEqual({ turn: 'd', round: 1 })
    expect(nextTurn(entries, 'd', 1)).toEqual({ turn: 'b', round: 2 })
    expect(previousTurn(entries, 'b', 2)).toEqual({ turn: 'd', round: 1 })
    expect(previousTurn(entries, 'b', 1)).toEqual({ turn: 'b', round: 1 })
  })
})

describe('condições e efeitos', () => {
  it('lê efeitos guardados e descarta lixo', () => {
    expect(readEffects([{ id: '1', condition: 'prone' }, { label: 'Bênção', rounds: 10 }, 3, { condition: 'xyz' }])).toEqual([
      { id: '1', label: 'Caído', condition: 'prone', rounds: null },
      { id: 'Bênção', label: 'Bênção', condition: null, rounds: 10 }
    ])
  })

  it('conta a duração e encerra no fim', () => {
    const { kept, ended } = tickEffects([
      { id: '1', label: 'Caído', condition: 'prone', rounds: null },
      { id: '2', label: 'Bênção', condition: null, rounds: 2 },
      { id: '3', label: 'Atordoado', condition: 'stunned', rounds: 1 }
    ])
    expect(kept.map((e) => [e.id, e.rounds])).toEqual([
      ['1', null],
      ['2', 1]
    ])
    expect(ended.map((e) => e.label)).toEqual(['Atordoado'])
  })

  it('sangrando abaixo da metade', () => {
    expect(bloodied({ current: 5, max: 10 })).toBe(true)
    expect(bloodied({ current: 6, max: 10 })).toBe(false)
    expect(bloodied({ current: 0, max: 10 })).toBe(false)
  })
})
