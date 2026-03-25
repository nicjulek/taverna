import { describe, expect, it } from 'vitest'
import { classLine, hpTone, signed } from './format'

describe('formatos da ficha', () => {
  it('linha de raça e classes', () => {
    expect(classLine('Halfling', [{ key: 'rogue', level: 3 }])).toBe('Halfling · Ladino 3')
    expect(
      classLine('', [
        { key: 'paladin', level: 6 },
        { key: 'warlock', level: 2 }
      ])
    ).toBe('Paladino 6 / Bruxo 2')
  })

  it('bônus com sinal tipográfico', () => {
    expect(signed(3)).toBe('+3')
    expect(signed(0)).toBe('+0')
    expect(signed(-2)).toBe('−2')
  })

  it('tom dos PV', () => {
    expect(hpTone(20, 20)).toBe('ok')
    expect(hpTone(10, 20)).toBe('hurt')
    expect(hpTone(0, 20)).toBe('down')
  })
})
