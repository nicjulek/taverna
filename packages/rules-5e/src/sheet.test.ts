import { describe, expect, it } from 'vitest'
import { attackDamage, derive, longRest, newSheet, rollDeathSave, type Sheet5e, shortRest, spendHitDie } from './index'

const ranger = (): Sheet5e => ({
  ...newSheet({ classKey: 'ranger', level: 5, race: 'Elfa' }),
  abilities: { str: 12, dex: 18, con: 14, int: 10, wis: 15, cha: 8 },
  skills: { perception: 'proficient', stealth: 'expertise' },
  attacks: [{ id: 'arco', name: 'Arco longo', ability: 'dex', proficient: true, bonus: 1, damage: '1d8', damageType: 'perfurante' }]
})

describe('ficha nova', () => {
  it('começa com as salvaguardas, o atributo de magia e os PV médios da classe', () => {
    const sheet = newSheet({ classKey: 'wizard', level: 3 })
    expect(sheet.saves).toEqual(['int', 'wis'])
    expect(sheet.spellAbility).toBe('int')
    expect(sheet.hp).toEqual({ current: 14, max: 14, temporary: 0 })
    expect(sheet.slotsUsed).toHaveLength(9)
  })

  it('traz os contadores sugeridos da classe', () => {
    expect(newSheet({ classKey: 'monk', level: 4 }).resources).toEqual([{ id: 'ki', name: 'Ki', max: 4, used: 0, reset: 'short' }])
  })
})

describe('valores calculados', () => {
  const d = derive(ranger())

  it('modificadores, proficiência e salvaguardas', () => {
    expect(d.level).toBe(5)
    expect(d.proficiency).toBe(3)
    expect(d.modifiers).toMatchObject({ dex: 4, wis: 2, cha: -1 })
    expect(d.saves).toMatchObject({ str: 4, dex: 7, cha: -1 })
  })

  it('perícias com proficiência e especialização', () => {
    expect(d.skills.perception).toBe(5)
    expect(d.skills.stealth).toBe(10)
    expect(d.skills.arcana).toBe(0)
    expect(d.passivePerception).toBe(15)
  })

  it('iniciativa, CD e ataque de magia', () => {
    expect(d.initiative).toBe(4)
    expect(d.spellDc).toBe(13)
    expect(d.spellAttack).toBe(5)
  })

  it('espaços de magia do meio-conjurador', () => {
    expect(d.slots).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0])
    expect(d.pact).toBeNull()
  })

  it('ataque soma atributo, proficiência e bônus da arma', () => {
    const sheet = ranger()
    expect(d.attacks.arco).toBe(8)
    expect(attackDamage(sheet, sheet.attacks[0]!)).toBe('1d8+4')
  })

  it('pau para toda obra entra na iniciativa', () => {
    expect(derive({ ...ranger(), jackOfAllTrades: true }).initiative).toBe(5)
  })

  it('multiclasse soma os dados de vida por tipo e o bruxo ganha pacto', () => {
    const sheet: Sheet5e = {
      ...ranger(),
      classes: [
        { key: 'paladin', level: 6, caster: 'half', subclass: '' },
        { key: 'warlock', level: 3, caster: 'pact', subclass: '' },
        { key: 'fighter', level: 1, caster: 'none', subclass: '' }
      ]
    }
    const m = derive(sheet)
    expect(m.level).toBe(10)
    expect(m.hitDice).toEqual([
      { die: 'd10', total: 7, used: 0 },
      { die: 'd8', total: 3, used: 0 }
    ])
    expect(m.slots).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0])
    expect(m.pact).toEqual({ count: 2, level: 2 })
  })
})

describe('descansos', () => {
  const tired = (): Sheet5e => ({
    ...ranger(),
    hp: { current: 9, max: 44, temporary: 5 },
    hitDiceUsed: { d10: 4 },
    slotsUsed: [3, 1, 0, 0, 0, 0, 0, 0, 0],
    concentration: 'Marca do Caçador',
    deathSaves: { successes: 1, failures: 1 },
    resources: [
      { id: 'a', name: 'Curto', max: 2, used: 2, reset: 'short' },
      { id: 'b', name: 'Longo', max: 1, used: 1, reset: 'long' },
      { id: 'c', name: 'Manual', max: 3, used: 3, reset: 'none' }
    ]
  })

  it('descanso curto só recupera o que volta no curto', () => {
    const rested = shortRest(tired())
    expect(rested.resources.map((r) => r.used)).toEqual([0, 1, 3])
    expect(rested.hp.current).toBe(9)
    expect(rested.slotsUsed[0]).toBe(3)
  })

  it('descanso longo recupera PV, espaços, contadores e metade dos dados de vida', () => {
    const rested = longRest(tired())
    expect(rested.hp).toEqual({ current: 44, max: 44, temporary: 0 })
    expect(rested.slotsUsed).toEqual(Array(9).fill(0))
    expect(rested.resources.map((r) => r.used)).toEqual([0, 0, 3])
    expect(rested.hitDiceUsed).toEqual({ d10: 2 })
    expect(rested.concentration).toBe('')
    expect(rested.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('gastar dado de vida cura e marca o dado', () => {
    const healed = spendHitDie(tired(), 'd10', 8)
    expect(healed.hp.current).toBe(17)
    expect(healed.hitDiceUsed.d10).toBe(5)
  })

  it('não gasta dado de vida que acabou', () => {
    expect(() => spendHitDie({ ...tired(), hitDiceUsed: { d10: 5 } }, 'd10', 3)).toThrowError('Não sobrou')
  })
})

describe('testes contra a morte na ficha', () => {
  it('marca sucesso e falha', () => {
    expect(rollDeathSave(ranger(), 12).deathSaves).toEqual({ successes: 1, failures: 0 })
    expect(rollDeathSave(ranger(), 1).deathSaves).toEqual({ successes: 0, failures: 2 })
  })

  it('20 natural acorda com 1 PV', () => {
    const sheet = rollDeathSave({ ...ranger(), hp: { current: 0, max: 44, temporary: 0 }, deathSaves: { successes: 0, failures: 2 } }, 20)
    expect(sheet.hp.current).toBe(1)
    expect(sheet.deathSaves).toEqual({ successes: 0, failures: 0 })
  })
})
