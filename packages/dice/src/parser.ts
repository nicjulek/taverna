import { DiceError, type DiceNode, LIMITS, type Modifier, type Node } from './ast'

export interface ParsedRoll {
  ast: Node
  label: string
}

export function parse(input: string): ParsedRoll {
  const hash = input.indexOf('#')
  const formula = hash === -1 ? input : input.slice(0, hash)
  const label = hash === -1 ? '' : input.slice(hash + 1).trim()
  if (!formula.trim()) throw new DiceError('Escreva uma rolagem, por exemplo 1d20+5')
  if (formula.length > LIMITS.length) throw new DiceError(`A rolagem pode ter até ${LIMITS.length} caracteres`)
  const parser = new Parser(formula.toLowerCase())
  const ast = parser.expression()
  parser.end()
  return { ast, label }
}

class Parser {
  private pos = 0

  constructor(private readonly src: string) {}

  expression(): Node {
    let left = this.term()
    for (;;) {
      const op = this.peek()
      if (op !== '+' && op !== '-') return left
      this.pos += 1
      left = { type: 'binary', op, left, right: this.term() }
    }
  }

  end(): void {
    this.skip()
    if (this.pos < this.src.length) throw new DiceError(`Não entendi "${this.src.slice(this.pos).trim()}"`, this.pos)
  }

  private term(): Node {
    let left = this.unary()
    for (;;) {
      const op = this.peek()
      if (op !== '*' && op !== '/' && op !== 'x') return left
      this.pos += 1
      left = { type: 'binary', op: op === '/' ? '/' : '*', left, right: this.unary() }
    }
  }

  private unary(): Node {
    if (this.peek() === '-') {
      this.pos += 1
      return { type: 'negate', value: this.unary() }
    }
    if (this.peek() === '+') {
      this.pos += 1
      return this.unary()
    }
    return this.primary()
  }

  private primary(): Node {
    const ch = this.peek()
    if (ch === '(') {
      this.pos += 1
      const value = this.expression()
      if (this.peek() !== ')') throw new DiceError('Faltou fechar o parêntese', this.pos)
      this.pos += 1
      return { type: 'group', value }
    }
    if (ch === 'd') return this.dice(1)
    if (ch !== undefined && isDigit(ch)) {
      const value = this.number()
      if (this.src[this.pos] === 'd') return this.dice(value)
      return { type: 'number', value }
    }
    if (ch === undefined) throw new DiceError('A rolagem terminou no meio', this.pos)
    throw new DiceError(`Não entendi "${ch}"`, this.pos)
  }

  private dice(count: number): DiceNode {
    this.pos += 1
    let sides: number
    if (this.src[this.pos] === '%') {
      this.pos += 1
      sides = 100
    } else if (isDigit(this.src[this.pos])) {
      sides = this.number()
    } else {
      throw new DiceError('Faltou o número de lados depois do "d"', this.pos)
    }
    if (count < 1) throw new DiceError('Role pelo menos 1 dado', this.pos)
    if (count > LIMITS.count) throw new DiceError(`Dá para rolar até ${LIMITS.count} dados de uma vez`, this.pos)
    if (sides < 1) throw new DiceError('O dado precisa ter pelo menos 1 lado', this.pos)
    if (sides > LIMITS.sides) throw new DiceError(`O dado pode ter até ${LIMITS.sides} lados`, this.pos)
    const node: DiceNode = { type: 'dice', count, sides, modifiers: this.modifiers(count, sides) }
    return node
  }

  private modifiers(count: number, sides: number): Modifier[] {
    const mods: Modifier[] = []
    let selection = false
    for (;;) {
      const two = this.src.slice(this.pos, this.pos + 2)
      const start = this.pos
      if (two === 'kh' || two === 'kl' || two === 'dh' || two === 'dl') {
        this.pos += 2
        mods.push(this.selection(two[0] === 'k' ? 'keep' : 'drop', two[1] === 'h' ? 'high' : 'low', count, start))
      } else if (this.src[this.pos] === 'k') {
        this.pos += 1
        mods.push(this.selection('keep', 'high', count, start))
      } else if (this.src[this.pos] === '!') {
        this.pos += 1
        if (sides === 1) throw new DiceError('Um dado de 1 lado não pode explodir', start)
        if (mods.some((m) => m.kind === 'explode')) throw new DiceError('O "!" só pode aparecer uma vez', start)
        mods.push({ kind: 'explode' })
        continue
      } else if (this.src[this.pos] === 'r') {
        this.pos += 1
        const atMost = isDigit(this.src[this.pos]) ? this.number() : 1
        if (atMost >= sides) throw new DiceError(`Rerrolar até ${atMost} num d${sides} nunca para`, start)
        if (mods.some((m) => m.kind === 'reroll')) throw new DiceError('O "r" só pode aparecer uma vez', start)
        mods.push({ kind: 'reroll', atMost })
        continue
      } else {
        return mods
      }
      if (selection) throw new DiceError('Use só um manter ou descartar por grupo de dados', start)
      selection = true
    }
  }

  private selection(kind: 'keep' | 'drop', which: 'high' | 'low', count: number, start: number): Modifier {
    const amount = isDigit(this.src[this.pos]) ? this.number() : 1
    if (kind === 'keep' && (amount < 1 || amount > count)) throw new DiceError(`Dá para manter de 1 a ${count} dados aqui`, start)
    if (kind === 'drop' && (amount < 1 || amount >= count)) throw new DiceError(`Dá para descartar de 1 a ${count - 1} dados aqui`, start)
    return { kind, which, amount }
  }

  private number(): number {
    const start = this.pos
    while (isDigit(this.src[this.pos])) this.pos += 1
    const text = this.src.slice(start, this.pos)
    if (text.length > 6) throw new DiceError('Número grande demais', start)
    return Number(text)
  }

  private peek(): string | undefined {
    this.skip()
    return this.src[this.pos]
  }

  private skip(): void {
    while (this.src[this.pos] === ' ' || this.src[this.pos] === '\t') this.pos += 1
  }
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9'
}
