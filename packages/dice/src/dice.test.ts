import { describe as group, expect, it } from 'vitest'
import { DiceError, describe, parse, roll, sequenceRng, stats, toNotation } from './index'

group('parse', () => {
  it.each([
    ['d20', '1d20'],
    ['1d20+5', '1d20 + 5'],
    ['2D6 + 1d4 - 1', '2d6 + 1d4 - 1'],
    ['4d6dl1', '4d6dl1'],
    ['2d20kh', '2d20kh1'],
    ['2d20k1', '2d20kh1'],
    ['2d20kl1', '2d20kl1'],
    ['d%', '1d100'],
    ['3d6!', '3d6!'],
    ['2d6r2', '2d6r2'],
    ['(1d8+3)*2', '(1d8 + 3) * 2'],
    ['2d6x2', '2d6 * 2'],
    ['-1d4', '-1d4'],
    ['10 - (2 - 1)', '10 - (2 - 1)']
  ])('%s vira %s', (input, notation) => {
    expect(toNotation(parse(input).ast)).toBe(notation)
  })

  it('separa o rótulo depois do #', () => {
    expect(parse('1d20+7 # Ataque com espada')).toMatchObject({ label: 'Ataque com espada' })
  })

  it.each([
    ['', 'Escreva uma rolagem'],
    ['2d', 'Faltou o número de lados'],
    ['0d6', 'pelo menos 1 dado'],
    ['101d6', 'até 100 dados'],
    ['1d1001', 'até 1000 lados'],
    ['1d20+', 'terminou no meio'],
    ['(1d6', 'fechar o parêntese'],
    ['2d20kh3', 'manter de 1 a 2'],
    ['4d6dl4', 'descartar de 1 a 3'],
    ['4d6kh3dl1', 'só um manter ou descartar'],
    ['1d1!', 'não pode explodir'],
    ['1d6r6', 'nunca para'],
    ['1d20 abc', 'Não entendi']
  ])('"%s" dá erro claro', (input, message) => {
    expect(() => parse(input)).toThrowError(DiceError)
    expect(() => parse(input)).toThrowError(message)
  })
})

group('roll', () => {
  it('soma dados e modificadores', () => {
    const result = roll('2d6+3', sequenceRng([4, 5]))
    expect(result.total).toBe(12)
    expect(result.terms[0]?.dice.map((d) => d.value)).toEqual([4, 5])
    expect(describe(result)).toBe('2d6 [4, 5] + 3 = 12')
  })

  it('vantagem fica com o maior d20', () => {
    const result = roll('2d20kh1+5', sequenceRng([7, 18]))
    expect(result.total).toBe(23)
    expect(result.terms[0]?.dice).toEqual([{ value: 7, dropped: true }, { value: 18 }])
    expect(result.natural).toBe(18)
    expect(result.critical).toBeNull()
  })

  it('desvantagem fica com o menor d20 e marca falha crítica', () => {
    const result = roll('2d20kl1+5', sequenceRng([1, 15]))
    expect(result.total).toBe(6)
    expect(result.natural).toBe(1)
    expect(result.critical).toBe('failure')
  })

  it('20 natural é sucesso crítico', () => {
    expect(roll('1d20+2', sequenceRng([20])).critical).toBe('success')
  })

  it('sem natural quando há mais de um d20 contando', () => {
    expect(roll('2d20', sequenceRng([20, 3])).natural).toBeNull()
  })

  it('4d6 descartando o menor', () => {
    const result = roll('4d6dl1', sequenceRng([3, 1, 6, 4]))
    expect(result.total).toBe(13)
    expect(result.terms[0]?.dice[1]).toEqual({ value: 1, dropped: true })
  })

  it('descartar o menor com empate tira só o primeiro', () => {
    const result = roll('3d6dl1', sequenceRng([2, 2, 5]))
    expect(result.terms[0]?.dice.filter((d) => d.dropped)).toHaveLength(1)
    expect(result.total).toBe(7)
  })

  it('dados explodem no valor máximo', () => {
    const result = roll('2d6!', sequenceRng([6, 4, 6, 2]))
    expect(result.terms[0]?.dice).toEqual([{ value: 6 }, { value: 6, explosion: true }, { value: 2, explosion: true }, { value: 4 }])
    expect(result.total).toBe(18)
  })

  it('rerrola uma vez os valores baixos (estilo de luta com armas grandes)', () => {
    const result = roll('2d6r2', sequenceRng([1, 5, 2]))
    expect(result.terms[0]?.dice).toEqual([{ value: 2, rerolledFrom: 1 }, { value: 5 }])
    expect(result.total).toBe(7)
  })

  it('sortudo e vantagem juntos', () => {
    const result = roll('2d20r1kh1', sequenceRng([1, 9, 14]))
    expect(result.terms[0]?.dice).toEqual([
      { value: 14, rerolledFrom: 1 },
      { value: 9, dropped: true }
    ])
    expect(result.total).toBe(14)
  })

  it('divide arredondando para baixo', () => {
    expect(roll('7/2').total).toBe(3)
    expect(roll('(1d6+1)/2', sequenceRng([4])).total).toBe(2)
  })

  it('não divide por zero', () => {
    expect(() => roll('1d6/0', sequenceRng([3]))).toThrowError('dividir por zero')
  })

  it('negativos e parênteses', () => {
    expect(roll('-(1d4+1)', sequenceRng([3])).total).toBe(-4)
    expect(roll('10-2-3').total).toBe(5)
  })

  it('limita explosões infinitas', () => {
    expect(() => roll('1d2!', () => 2)).toThrowError('explodiram vezes demais')
  })

  it('limita o total de dados', () => {
    expect(() => roll('100d6+100d6+100d6+1d6')).toThrowError('até 300 dados')
  })

  it('o rolador padrão fica dentro do intervalo', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const { total } = roll('1d6')
      expect(total).toBeGreaterThanOrEqual(1)
      expect(total).toBeLessThanOrEqual(6)
      seen.add(total)
    }
    expect(seen.size).toBe(6)
  })

  it('separa texto e dados para a interface', () => {
    const result = roll('1d20+1d4+2', sequenceRng([10, 3]))
    expect(result.segments).toEqual([
      { kind: 'term', index: 0 },
      { kind: 'text', text: ' + ' },
      { kind: 'term', index: 1 },
      { kind: 'text', text: ' + 2' }
    ])
  })
})

group('stats', () => {
  it.each([
    ['1d20', 1, 20, 10.5],
    ['2d6+3', 5, 15, 10],
    ['1d8-1', 0, 7, 3.5],
    ['2d20kh1', 1, 20, 13.825],
    ['2d20kl1', 1, 20, 7.175],
    ['(1d6)*2', 2, 12, 7]
  ])('%s vai de %d a %d com média %d', (input, min, max, average) => {
    const s = stats(input)
    expect(s.min).toBe(min)
    expect(s.max).toBe(max)
    expect(s.average).toBeCloseTo(average, 3)
  })

  it('4d6dl1 tem média 12,24', () => {
    expect(stats('4d6dl1').average).toBeCloseTo(12.2446, 3)
  })

  it('estilo de luta com armas grandes aumenta a média do 2d6', () => {
    expect(stats('2d6r2').average).toBeCloseTo(8.333, 3)
  })

  it('explosão não tem máximo', () => {
    expect(stats('1d6!')).toMatchObject({ min: 1, max: Infinity, average: 4.2 })
  })
})
