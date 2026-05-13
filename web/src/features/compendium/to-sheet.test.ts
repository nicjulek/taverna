import type { CompendiumEntryDto } from '@taverna/shared'
import { describe, expect, it } from 'vitest'
import { attackFromEntry, canAddToSheet, spellFromEntry } from './to-sheet'

const entry = (patch: Partial<CompendiumEntryDto>): CompendiumEntryDto => ({
  id: 'x',
  kind: 'spell',
  name: 'Fireball',
  summary: '',
  source: 'srd',
  lang: 'en',
  published: true,
  meta: {},
  body: '',
  data: {},
  authorId: null,
  updatedAt: '',
  ...patch
})

describe('do compêndio para a ficha', () => {
  it('magias e armas podem ir para a ficha, o resto não', () => {
    expect(canAddToSheet({ kind: 'spell', meta: {} })).toBe('spell')
    expect(canAddToSheet({ kind: 'item', meta: { category: 'weapon' } })).toBe('attack')
    expect(canAddToSheet({ kind: 'item', meta: { category: 'gear' } })).toBeNull()
    expect(canAddToSheet({ kind: 'monster', meta: {} })).toBeNull()
  })

  it('magia leva círculo e um resumo de tempo, alcance e duração', () => {
    const spell = spellFromEntry(entry({ meta: { level: 3, castingTime: '1 action', range: '150 feet', duration: 'Instantaneous' } }))
    expect(spell).toMatchObject({ name: 'Fireball', level: 3, prepared: false, notes: '1 action · 150 feet · Instantaneous' })
  })

  it('truque já entra preparado', () => {
    expect(spellFromEntry(entry({ meta: { level: 0 } })).prepared).toBe(true)
  })

  it('arma de acuidade ou à distância usa Destreza', () => {
    const rapier = attackFromEntry(
      entry({ kind: 'item', name: 'Rapier', data: { damage: '1d8', damageType: 'Perfurante', properties: ['finesse'] } })
    )
    expect(rapier).toMatchObject({ ability: 'dex', damage: '1d8', damageType: 'perfurante', proficient: true })
    expect(attackFromEntry(entry({ kind: 'item', data: { damage: '1d8', ranged: true } })).ability).toBe('dex')
    expect(attackFromEntry(entry({ kind: 'item', data: { damage: '2d6', properties: ['heavy'] } })).ability).toBe('str')
  })
})
