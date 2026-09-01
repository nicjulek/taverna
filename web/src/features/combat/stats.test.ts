import { newSheet } from '@taverna/rules-5e'
import type { CompendiumEntryDto, SceneItemDto } from '@taverna/shared'
import { describe, expect, it } from 'vitest'
import { isBloodied, monsterAttacks, monsterToken, sheetAttacks, tokenHp } from './stats'

const token = (data: Record<string, unknown>) => ({ data }) as SceneItemDto

describe('números de combate do token', () => {
  it('lê PV com limites', () => {
    expect(tokenHp(token({}))).toBeNull()
    expect(tokenHp(token({ hp: { current: 30, max: 12 } }))).toEqual({ current: 12, max: 12, temporary: 0 })
    expect(isBloodied(token({ hp: { current: 4, max: 9, temporary: 0 } }))).toBe(true)
  })

  it('transforma o monstro do compêndio em token', () => {
    const entry = {
      id: 'sk',
      meta: { size: 'Large', ac: 13, hp: 13 },
      data: {
        armorClass: [{ value: 13 }],
        hitPoints: 13,
        abilities: { dex: 14 },
        immunities: ['poison'],
        vulnerabilities: ['bludgeoning'],
        resistances: [],
        actions: [
          { name: 'Espada curta', attackBonus: 4, damage: [{ dice: '1d6 + 2', type: 'Perfurante' }] },
          { name: 'Multiataque', attackBonus: null, damage: [] }
        ]
      }
    } as unknown as CompendiumEntryDto
    expect(monsterToken(entry)).toEqual({
      span: 2,
      data: {
        compendiumId: 'sk',
        hp: { current: 13, max: 13, temporary: 0 },
        ac: 13,
        initiative: 2,
        defenses: { resistances: [], immunities: ['poison'], vulnerabilities: ['bludgeoning'] }
      }
    })
    expect(monsterAttacks(entry.data.actions)).toEqual([
      { key: '0-Espada curta', name: 'Espada curta', bonus: 4, damage: [{ dice: '1d6+2', type: 'Perfurante' }] }
    ])
  })

  it('usa os ataques da ficha', () => {
    const sheet = newSheet({ classKey: 'fighter' })
    sheet.abilities.str = 16
    sheet.attacks = [{ id: 'a', name: 'Espada longa', ability: 'str', proficient: true, bonus: 0, damage: '1d8', damageType: 'cortante' }]
    expect(sheetAttacks(sheet)).toEqual([{ key: 'a', name: 'Espada longa', bonus: 5, damage: [{ dice: '1d8+3', type: 'cortante' }] }])
  })
})
