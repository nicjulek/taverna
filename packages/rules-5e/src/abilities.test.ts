import { describe, expect, it } from 'vitest'
import { ABILITIES, abilityModifier, carryingCapacity, SKILLS } from './index'

describe('atributos', () => {
  it.each([
    [1, -5],
    [3, -4],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [15, 2],
    [20, 5],
    [30, 10]
  ])('valor %d dá modificador %d', (score, modifier) => {
    expect(abilityModifier(score)).toBe(modifier)
  })

  it('recusa valores fora de 1 a 30', () => {
    expect(() => abilityModifier(0)).toThrowError(RangeError)
    expect(() => abilityModifier(31)).toThrowError(RangeError)
    expect(() => abilityModifier(10.5)).toThrowError(RangeError)
  })

  it('tem os 6 atributos e as 18 perícias ligadas a um deles', () => {
    expect(ABILITIES).toHaveLength(6)
    expect(SKILLS).toHaveLength(18)
    const keys = new Set(ABILITIES.map((a) => a.key))
    for (const skill of SKILLS) expect(keys.has(skill.ability)).toBe(true)
  })

  it('capacidade de carga é 15 vezes a Força', () => {
    expect(carryingCapacity(15)).toBe(225)
    expect(carryingCapacity(15, 2)).toBe(450)
  })
})
