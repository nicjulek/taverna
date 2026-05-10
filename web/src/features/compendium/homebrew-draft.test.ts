import type { CompendiumEntryDto } from '@taverna/shared'
import { describe, expect, it } from 'vitest'
import { draftFromEntry, empty, toHomebrew } from './homebrew-draft'

describe('rascunho de homebrew', () => {
  it('magia nova vira meta, resumo e dano por círculo', () => {
    const input = toHomebrew({
      ...empty(),
      kind: 'spell',
      name: ' Lança de Brasa ',
      level: '2',
      school: 'evocation',
      damage: '3d8',
      damageType: 'Fogo'
    })
    expect(input).toMatchObject({
      kind: 'spell',
      name: 'Lança de Brasa',
      summary: '2º círculo de evocação',
      meta: { level: 2, school: 'evocation' },
      data: { damageBySlot: { '2': '3d8' }, damageType: 'Fogo' }
    })
  })

  it('monstro guarda atributos limitados e ações com rolagem', () => {
    const input = toHomebrew({
      ...empty(),
      kind: 'monster',
      name: 'Lobo de cinza',
      cr: '1/2'.replace('1/2', '0.5'),
      abilities: { str: '40', dex: '14', con: '12', int: '3', wis: '12', cha: '6' },
      actions: [
        { name: 'Mordida', attackBonus: '4', dice: '2d4 + 2', desc: 'Derruba.' },
        { name: '', attackBonus: '', dice: '', desc: '' }
      ]
    })
    expect(input.meta).toMatchObject({ cr: 0.5, type: 'monstrosity' })
    expect((input.data as { abilities: Record<string, number> }).abilities.str).toBe(30)
    expect((input.data as { actions: unknown[] }).actions).toEqual([
      { name: 'Mordida', desc: 'Derruba.', attackBonus: 4, damage: [{ dice: '2d4+2', type: '' }], dc: null }
    ])
  })

  it('copiar uma arma do SRD traz dano e começa como rascunho', () => {
    const entry = {
      id: '1',
      kind: 'item',
      name: 'Longsword',
      summary: 'Martial Melee weapon',
      source: 'srd',
      lang: 'en',
      published: true,
      meta: { category: 'weapon', cost: '15 gp' },
      body: '',
      data: { damage: '1d8', damageType: 'Cortante' },
      authorId: null,
      updatedAt: ''
    } satisfies CompendiumEntryDto
    const draft = draftFromEntry(entry)
    expect(draft).toMatchObject({ kind: 'item', name: 'Longsword', category: 'weapon', damage: '1d8', published: false })
    expect(toHomebrew(draft).data).toMatchObject({ damage: '1d8' })
  })
})
