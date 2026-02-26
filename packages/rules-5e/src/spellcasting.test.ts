import { describe, expect, it } from 'vitest'
import {
  cantripDice,
  concentrationDc,
  multiclassCasterLevel,
  pactSlots,
  singleClassCasterLevel,
  slotsForCasterLevel,
  spellAttackBonus,
  spellSaveDc,
  spellSlots
} from './index'

describe('espaços de magia', () => {
  it.each([
    [1, [2, 0, 0, 0, 0, 0, 0, 0, 0]],
    [3, [4, 2, 0, 0, 0, 0, 0, 0, 0]],
    [5, [4, 3, 2, 0, 0, 0, 0, 0, 0]],
    [9, [4, 3, 3, 3, 1, 0, 0, 0, 0]],
    [17, [4, 3, 3, 3, 2, 1, 1, 1, 1]],
    [20, [4, 3, 3, 3, 3, 2, 2, 1, 1]]
  ])('conjurador nível %d', (level, slots) => {
    expect(slotsForCasterLevel(level)).toEqual(slots)
  })

  it('nível 0 não tem espaços', () => {
    expect(slotsForCasterLevel(0)).toEqual(Array(9).fill(0))
  })

  it.each([
    ['half', 1, 0],
    ['half', 2, 1],
    ['half', 5, 3],
    ['half', 20, 10],
    ['third', 2, 0],
    ['third', 3, 1],
    ['third', 7, 3],
    ['third', 19, 7],
    ['pact', 5, 0]
  ] as const)('%s nível %d conta como conjurador %d', (progression, level, casterLevel) => {
    expect(singleClassCasterLevel(progression, level)).toBe(casterLevel)
  })

  it('paladino 5 sozinho usa a tabela dele', () => {
    expect(spellSlots([{ progression: 'half', level: 5 }])).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0])
  })

  it('multiclasse soma níveis arredondando para baixo', () => {
    expect(
      multiclassCasterLevel([
        { progression: 'full', level: 3 },
        { progression: 'half', level: 3 },
        { progression: 'third', level: 5 }
      ])
    ).toBe(5)
  })

  it('bruxo não entra na conta da multiclasse', () => {
    expect(
      multiclassCasterLevel([
        { progression: 'full', level: 4 },
        { progression: 'pact', level: 3 }
      ])
    ).toBe(4)
  })

  it.each([
    [1, 1, 1],
    [2, 2, 1],
    [3, 2, 2],
    [5, 2, 3],
    [9, 2, 5],
    [11, 3, 5],
    [17, 4, 5]
  ])('magia de pacto do bruxo nível %d: %d espaços de %dº nível', (level, count, slotLevel) => {
    expect(pactSlots(level)).toEqual({ count, level: slotLevel })
  })
})

describe('CD e ataque de magia', () => {
  it('CD = 8 + proficiência + modificador', () => {
    expect(spellSaveDc(3, 1)).toBe(13)
    expect(spellSaveDc(5, 17)).toBe(19)
  })

  it('ataque = proficiência + modificador', () => {
    expect(spellAttackBonus(4, 5)).toBe(7)
  })

  it('CD de concentração é a maior entre 10 e metade do dano', () => {
    expect(concentrationDc(7)).toBe(10)
    expect(concentrationDc(22)).toBe(11)
    expect(concentrationDc(45)).toBe(22)
  })

  it.each([
    [1, 1],
    [5, 2],
    [11, 3],
    [17, 4]
  ])('truque no nível %d rola %d dados', (level, dice) => {
    expect(cantripDice(level)).toBe(dice)
  })
})
