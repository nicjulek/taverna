import { describe, expect, it } from 'vitest'
import { classDef, classResources, CLASSES } from './index'

const scores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 }
const max = (key: string, level: number, name: string) => classResources(key, level, scores).find((r) => r.name === name)?.max

describe('classes', () => {
  it('as 12 classes do SRD têm dado de vida e duas salvaguardas', () => {
    expect(CLASSES).toHaveLength(12)
    for (const c of CLASSES) {
      expect([6, 8, 10, 12]).toContain(c.hitDie)
      expect(c.saves).toHaveLength(2)
    }
  })

  it('classe desconhecida avisa', () => {
    expect(() => classDef('artifice')).toThrowError('desconhecida')
  })

  it.each([
    [1, 2],
    [3, 3],
    [6, 4],
    [12, 5],
    [17, 6],
    [20, 99]
  ])('fúria do bárbaro nível %d: %d', (level, uses) => {
    expect(max('barbarian', level, 'Fúria')).toBe(uses)
  })

  it('ki e pontos de feitiçaria seguem o nível a partir do 2º', () => {
    expect(classResources('monk', 1, scores)).toEqual([])
    expect(max('monk', 7, 'Ki')).toBe(7)
    expect(max('sorcerer', 5, 'Pontos de Feitiçaria')).toBe(5)
  })

  it('inspiração bárdica usa o Carisma e volta no descanso curto a partir do 5º', () => {
    expect(classResources('bard', 1, scores)[0]).toMatchObject({ max: 3, reset: 'long' })
    expect(classResources('bard', 5, scores)[0]).toMatchObject({ reset: 'short' })
    expect(classResources('bard', 1, { ...scores, cha: 8 })[0]?.max).toBe(1)
  })

  it.each([
    [3, 4],
    [7, 5],
    [15, 6]
  ])('dados de superioridade do guerreiro nível %d: %d', (level, dice) => {
    expect(max('fighter', level, 'Dados de Superioridade')).toBe(dice)
  })

  it('cura pelas mãos do paladino é 5 por nível', () => {
    expect(max('paladin', 4, 'Cura pelas Mãos')).toBe(20)
  })

  it('classes sem contador não sugerem nada', () => {
    expect(classResources('wizard', 10, scores)).toEqual([])
  })
})
