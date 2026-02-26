import { describe, expect, it } from 'vitest'
import { abilityCheckBonus, combineModes, passiveScore, proficiencyBonus, savingThrowBonus } from './index'

describe('bônus de proficiência', () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6]
  ])('nível %d dá +%d', (level, bonus) => {
    expect(proficiencyBonus(level)).toBe(bonus)
  })

  it('recusa níveis fora de 1 a 20', () => {
    expect(() => proficiencyBonus(0)).toThrowError(RangeError)
    expect(() => proficiencyBonus(21)).toThrowError(RangeError)
  })
})

describe('testes de perícia', () => {
  it('sem proficiência usa só o modificador', () => {
    expect(abilityCheckBonus({ modifier: 3, level: 5 })).toBe(3)
  })

  it('proficiente soma o bônus', () => {
    expect(abilityCheckBonus({ modifier: 3, level: 5, proficiency: 'proficient' })).toBe(6)
  })

  it('especialização dobra o bônus', () => {
    expect(abilityCheckBonus({ modifier: 3, level: 5, proficiency: 'expertise' })).toBe(9)
  })

  it('pau para toda obra soma metade, arredondando para baixo, onde não há proficiência', () => {
    expect(abilityCheckBonus({ modifier: 1, level: 5, jackOfAllTrades: true })).toBe(2)
    expect(abilityCheckBonus({ modifier: 1, level: 9, jackOfAllTrades: true })).toBe(3)
  })

  it('pau para toda obra não mexe em perícia proficiente', () => {
    expect(abilityCheckBonus({ modifier: 1, level: 5, proficiency: 'proficient', jackOfAllTrades: true })).toBe(4)
  })

  it('bônus extra entra na conta', () => {
    expect(abilityCheckBonus({ modifier: 0, level: 1, extra: 1 })).toBe(1)
  })
})

describe('salvaguardas e passivas', () => {
  it('salvaguarda proficiente', () => {
    expect(savingThrowBonus(2, 9, true)).toBe(6)
    expect(savingThrowBonus(2, 9, false)).toBe(2)
  })

  it('percepção passiva com vantagem e desvantagem', () => {
    expect(passiveScore(5)).toBe(15)
    expect(passiveScore(5, 'advantage')).toBe(20)
    expect(passiveScore(5, 'disadvantage')).toBe(10)
  })
})

describe('vantagem e desvantagem juntas', () => {
  it.each([
    [[], 'normal'],
    [['advantage'], 'advantage'],
    [['advantage', 'advantage'], 'advantage'],
    [['disadvantage'], 'disadvantage'],
    [['advantage', 'disadvantage'], 'normal'],
    [['advantage', 'advantage', 'disadvantage'], 'normal']
  ] as const)('%j resulta em %s', (sources, mode) => {
    expect(combineModes(sources)).toBe(mode)
  })
})
