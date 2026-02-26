import { describe, expect, it } from 'vitest'
import { formatBonus, getSystem, listSystems, registerSystem, type RulesSystem, withBonus } from './index'

const fake: RulesSystem = {
  id: 'teste',
  name: 'Sistema de teste',
  abilities: [],
  skills: [],
  check: (bonus) => withBonus('1d6', bonus),
  damage: (expression) => expression,
  judge: () => ({ tone: 'neutral', text: '' })
}

describe('registro de sistemas', () => {
  it('registra e encontra pelo id', () => {
    registerSystem(fake)
    expect(getSystem('teste')).toBe(fake)
    expect(listSystems()).toContain(fake)
  })

  it('avisa quando o sistema não existe', () => {
    expect(() => getSystem('gurps')).toThrowError('desconhecido')
  })
})

describe('bônus', () => {
  it.each([
    [3, '+3'],
    [0, '+0'],
    [-2, '-2']
  ])('%d vira %s', (value, text) => {
    expect(formatBonus(value)).toBe(text)
  })

  it('só soma quando o bônus não é zero', () => {
    expect(withBonus('1d20', 0)).toBe('1d20')
    expect(withBonus('1d20', -1)).toBe('1d20-1')
  })
})
