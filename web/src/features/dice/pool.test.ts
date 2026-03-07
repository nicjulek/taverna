import { describe, expect, it } from 'vitest'
import { addDie, adjustModifier, currentModifier, describeRange, preview } from './pool'

describe('montar a rolagem pelos botões', () => {
  it('começa do zero', () => {
    expect(addDie('', 20)).toBe('1d20')
  })

  it('soma no grupo do mesmo dado', () => {
    expect(addDie('1d6', 6)).toBe('2d6')
    expect(addDie('1d20 + 2d6 + 3', 6)).toBe('1d20 + 3d6 + 3')
  })

  it('dado novo entra antes do modificador', () => {
    expect(addDie('1d20 + 5', 4)).toBe('1d20 + 1d4 + 5')
  })

  it('não mexe em grupo com manter ou explosão', () => {
    expect(addDie('2d20kh1', 20)).toBe('2d20kh1 + 1d20')
  })

  it('texto inválido só ganha o dado no fim', () => {
    expect(addDie('2d', 8)).toBe('2d + 1d8')
  })
})

describe('modificador', () => {
  it('soma, subtrai e some no zero', () => {
    expect(adjustModifier('1d20', 1)).toBe('1d20 + 1')
    expect(adjustModifier('1d20 + 1', 1)).toBe('1d20 + 2')
    expect(adjustModifier('1d20 + 1', -1)).toBe('1d20')
    expect(adjustModifier('1d20', -2)).toBe('1d20 - 2')
    expect(adjustModifier('1d20 - 2', 3)).toBe('1d20 + 1')
  })

  it('lê o modificador atual', () => {
    expect(currentModifier('1d20 + 5 - 1')).toBe(4)
    expect(currentModifier('2d')).toBe(0)
  })
})

describe('prévia', () => {
  it('mostra faixa e média', () => {
    const p = preview('2d6+3')
    expect(p).toMatchObject({ ok: true, hasD20: false })
    if (p?.ok) expect(describeRange(p)).toBe('de 5 a 15, média 10')
  })

  it('reconhece d20 para liberar vantagem', () => {
    expect(preview('1d20+4')).toMatchObject({ ok: true, hasD20: true })
  })

  it('explica o erro', () => {
    expect(preview('1d20+')).toEqual({ ok: false, error: 'A rolagem terminou no meio' })
  })

  it('vazio não mostra nada', () => {
    expect(preview('  ')).toBeNull()
  })

  it('explosão não tem máximo', () => {
    const p = preview('1d6!')
    if (p?.ok) expect(describeRange(p)).toBe('a partir de 1, média 4,2')
  })
})
