import { roll, sequenceRng } from '@taverna/dice'
import { getSystem } from '@taverna/rules-core'
import { describe, expect, it } from 'vitest'
import { criticalDamage, d20, withMode, damageWhileDying, deathSave, dnd5e, judgeAttack, judgeCheck } from './index'

describe('d20', () => {
  it.each([
    [5, {}, '1d20+5'],
    [0, {}, '1d20'],
    [-1, {}, '1d20-1'],
    [3, { mode: 'advantage' }, '2d20kh1+3'],
    [3, { mode: 'disadvantage' }, '2d20kl1+3'],
    [2, { rerollOnes: true }, '1d20r1+2'],
    [2, { mode: 'advantage', rerollOnes: true }, '2d20r1kh1+2']
  ] as const)('bônus %d com %j vira %s', (bonus, options, expression) => {
    expect(d20(bonus, options)).toBe(expression)
  })
})

describe('vantagem numa rolagem escrita', () => {
  it.each([
    ['1d20+5', 'advantage', '2d20kh1 + 5'],
    ['d20-1', 'disadvantage', '2d20kl1 - 1'],
    ['1d20r1+2', 'advantage', '2d20r1kh1 + 2'],
    ['1d20+1d4', 'advantage', '2d20kh1 + 1d4'],
    ['2d20kh1', 'disadvantage', '2d20kh1'],
    ['2d6+3', 'advantage', '2d6+3'],
    ['1d20+5', 'normal', '1d20+5']
  ] as const)('%s com %s vira %s', (expression, mode, result) => {
    expect(withMode(expression, mode)).toBe(result)
  })
})

describe('crítico', () => {
  it.each([
    ['1d8+3', '2d8 + 3'],
    ['2d6+1d8+4', '4d6 + 2d8 + 4'],
    ['1d12r2+5', '2d12r2 + 5']
  ])('%s vira %s', (expression, critical) => {
    expect(criticalDamage(expression)).toBe(critical)
  })
})

describe('ataque e teste', () => {
  it('20 natural acerta mesmo abaixo da CA', () => {
    expect(judgeAttack(roll('1d20', sequenceRng([20])), 30).tone).toBe('critical')
  })

  it('1 natural erra mesmo acima da CA', () => {
    expect(judgeAttack(roll('1d20+20', sequenceRng([1])), 15).tone).toBe('fumble')
  })

  it('total igual à CA acerta', () => {
    expect(judgeAttack(roll('1d20+5', sequenceRng([10])), 15)).toEqual({ tone: 'success', text: 'Acertou a CA 15' })
    expect(judgeAttack(roll('1d20+5', sequenceRng([9])), 15).tone).toBe('failure')
  })

  it('teste contra CD', () => {
    expect(judgeCheck(roll('1d20+2', sequenceRng([13])), 15).tone).toBe('success')
    expect(judgeCheck(roll('1d20+2', sequenceRng([12])), 15).tone).toBe('failure')
  })
})

describe('testes contra a morte', () => {
  const zero = { successes: 0, failures: 0 }

  it('10 ou mais é sucesso, menos de 10 é falha', () => {
    expect(deathSave(zero, 10)).toMatchObject({ successes: 1, failures: 0, status: 'rolling' })
    expect(deathSave(zero, 9)).toMatchObject({ successes: 0, failures: 1, status: 'rolling' })
  })

  it('1 natural conta como duas falhas', () => {
    expect(deathSave({ successes: 0, failures: 1 }, 1)).toMatchObject({ failures: 3, status: 'dead' })
  })

  it('20 natural volta com 1 PV', () => {
    expect(deathSave({ successes: 1, failures: 2 }, 20)).toEqual({ successes: 0, failures: 0, status: 'conscious', hitPoints: 1 })
  })

  it('três sucessos estabilizam', () => {
    expect(deathSave({ successes: 2, failures: 2 }, 15)).toMatchObject({ successes: 3, status: 'stable' })
  })

  it('dano caído é uma falha, crítico são duas', () => {
    expect(damageWhileDying(zero, false)).toMatchObject({ failures: 1, status: 'rolling' })
    expect(damageWhileDying({ successes: 0, failures: 1 }, true)).toMatchObject({ failures: 3, status: 'dead' })
  })
})

describe('sistema registrado', () => {
  it('o 5e fica disponível pelo id', () => {
    expect(getSystem('dnd5e')).toBe(dnd5e)
    expect(dnd5e.check(4, { mode: 'advantage' })).toBe('2d20kh1+4')
    expect(dnd5e.damage('1d6+2', { critical: true })).toBe('2d6 + 2')
  })

  it('julga pelo alvo ou pelo natural', () => {
    expect(dnd5e.judge(roll('1d20+3', sequenceRng([12])), { ac: 15 }).tone).toBe('success')
    expect(dnd5e.judge(roll('1d20', sequenceRng([20]))).tone).toBe('critical')
    expect(dnd5e.judge(roll('1d20', sequenceRng([7])))).toEqual({ tone: 'neutral', text: '' })
  })
})
