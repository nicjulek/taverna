import { describe, expect, it } from 'vitest'
import {
  applyDamage,
  applyHealing,
  averageHitPointsPerLevel,
  firstLevelHitPoints,
  grantTemporary,
  hitDiceRecoveredOnLongRest,
  hitDieRoll
} from './index'

const hp = { current: 20, max: 30, temporary: 0 }

describe('pontos de vida', () => {
  it('dano tira dos PV', () => {
    expect(applyDamage(hp, 8)).toMatchObject({ current: 12, droppedToZero: false })
  })

  it('PV temporário absorve primeiro', () => {
    expect(applyDamage({ ...hp, temporary: 5 }, 8)).toMatchObject({ current: 17, temporary: 0 })
    expect(applyDamage({ ...hp, temporary: 10 }, 8)).toMatchObject({ current: 20, temporary: 2 })
  })

  it('cair a 0 sem morte instantânea', () => {
    expect(applyDamage(hp, 25)).toMatchObject({ current: 0, droppedToZero: true, instantDeath: false })
  })

  it('morte instantânea quando o que sobra passa do máximo', () => {
    expect(applyDamage(hp, 50)).toMatchObject({ current: 0, instantDeath: true })
  })

  it('cura não passa do máximo', () => {
    expect(applyHealing(hp, 50).current).toBe(30)
  })

  it('PV temporário não acumula, fica o maior', () => {
    expect(grantTemporary({ ...hp, temporary: 6 }, 4).temporary).toBe(6)
    expect(grantTemporary({ ...hp, temporary: 6 }, 9).temporary).toBe(9)
  })

  it('recusa números negativos', () => {
    expect(() => applyDamage(hp, -1)).toThrowError(RangeError)
    expect(() => applyHealing(hp, -1)).toThrowError(RangeError)
  })
})

describe('dados de vida e níveis', () => {
  it('primeiro nível é o dado cheio mais Constituição, mínimo 1', () => {
    expect(firstLevelHitPoints(10, 2)).toBe(12)
    expect(firstLevelHitPoints(6, -6)).toBe(1)
  })

  it.each([
    [6, 0, 4],
    [8, 1, 6],
    [10, 2, 8],
    [12, 3, 10]
  ] as const)('média do d%d com Con %d é %d', (die, con, value) => {
    expect(averageHitPointsPerLevel(die, con)).toBe(value)
  })

  it('rolagem do dado de vida no descanso curto', () => {
    expect(hitDieRoll(8, 2)).toBe('1d8+2')
    expect(hitDieRoll(12, -1)).toBe('1d12-1')
  })

  it('descanso longo devolve metade dos dados, mínimo 1', () => {
    expect(hitDiceRecoveredOnLongRest(1)).toBe(1)
    expect(hitDiceRecoveredOnLongRest(5)).toBe(2)
    expect(hitDiceRecoveredOnLongRest(20)).toBe(10)
  })
})
