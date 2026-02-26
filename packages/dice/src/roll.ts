import { collectDice, DiceError, type DiceNode, diceNotation, LIMITS, type Node, toNotation } from './ast'
import { parse } from './parser'
import { cryptoRng, type Rng } from './rng'

export interface Die {
  value: number
  dropped?: boolean
  explosion?: boolean
  rerolledFrom?: number
}

export interface DiceTerm {
  notation: string
  sides: number
  dice: Die[]
  total: number
}

export type Segment = { kind: 'text'; text: string } | { kind: 'term'; index: number }

export interface RollResult {
  expression: string
  label: string
  total: number
  terms: DiceTerm[]
  segments: Segment[]
  natural: number | null
  critical: 'success' | 'failure' | null
}

export function roll(input: string, rng: Rng = cryptoRng): RollResult {
  const { ast, label } = parse(input)
  return rollAst(ast, label, rng)
}

export function rollAst(ast: Node, label = '', rng: Rng = cryptoRng): RollResult {
  const planned = collectDice(ast).reduce((sum, dice) => sum + dice.count, 0)
  if (planned > LIMITS.totalDice) throw new DiceError(`Dá para rolar até ${LIMITS.totalDice} dados por vez`)
  const terms: DiceTerm[] = []
  const segments: Segment[] = []
  const total = evaluate(ast, rng, terms, segments)
  const d20s = terms.filter((t) => t.sides === 20)
  const kept = d20s.length === 1 ? d20s[0]!.dice.filter((d) => !d.dropped && !d.explosion) : []
  const natural = kept.length === 1 ? kept[0]!.value : null
  return {
    expression: toNotation(ast),
    label,
    total,
    terms,
    segments: mergeText(segments),
    natural,
    critical: natural === 20 ? 'success' : natural === 1 ? 'failure' : null
  }
}

function evaluate(node: Node, rng: Rng, terms: DiceTerm[], out: Segment[]): number {
  switch (node.type) {
    case 'number':
      out.push({ kind: 'text', text: String(node.value) })
      return node.value
    case 'dice': {
      const term = rollDice(node, rng)
      out.push({ kind: 'term', index: terms.length })
      terms.push(term)
      return term.total
    }
    case 'group': {
      out.push({ kind: 'text', text: '(' })
      const value = evaluate(node.value, rng, terms, out)
      out.push({ kind: 'text', text: ')' })
      return value
    }
    case 'negate':
      out.push({ kind: 'text', text: '-' })
      return -evaluate(node.value, rng, terms, out)
    case 'binary': {
      const left = evaluate(node.left, rng, terms, out)
      out.push({ kind: 'text', text: ` ${node.op} ` })
      const right = evaluate(node.right, rng, terms, out)
      switch (node.op) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '/':
          if (right === 0) throw new DiceError('Não dá para dividir por zero')
          return Math.floor(left / right)
      }
    }
  }
}

function rollDice(node: DiceNode, rng: Rng): DiceTerm {
  const draw = () => {
    const value = rng(node.sides)
    if (!Number.isInteger(value) || value < 1 || value > node.sides) throw new Error(`rng fora do intervalo: ${value}`)
    return value
  }
  let dice: Die[] = Array.from({ length: node.count }, () => ({ value: draw() }))

  for (const mod of node.modifiers) {
    if (mod.kind === 'reroll') {
      dice = dice.map((die) => (die.value <= mod.atMost ? { value: draw(), rerolledFrom: die.value } : die))
    }
  }

  if (node.modifiers.some((m) => m.kind === 'explode')) {
    const exploded: Die[] = []
    let extra = 0
    for (const die of dice) {
      exploded.push(die)
      let last = die.value
      while (last === node.sides) {
        if (extra >= LIMITS.explosions) throw new DiceError('Os dados explodiram vezes demais')
        extra += 1
        last = draw()
        exploded.push({ value: last, explosion: true })
      }
    }
    dice = exploded
  }

  const selection = node.modifiers.find((m) => m.kind === 'keep' || m.kind === 'drop')
  if (selection && (selection.kind === 'keep' || selection.kind === 'drop')) {
    const order = dice
      .map((die, index) => ({ value: die.value, index }))
      .sort((a, b) => (selection.which === 'high' ? b.value - a.value : a.value - b.value) || a.index - b.index)
    const keep =
      selection.kind === 'keep'
        ? new Set(order.slice(0, selection.amount).map((o) => o.index))
        : new Set(order.slice(selection.amount).map((o) => o.index))
    dice = dice.map((die, index) => (keep.has(index) ? die : { ...die, dropped: true }))
  }

  return {
    notation: diceNotation(node),
    sides: node.sides,
    dice,
    total: dice.reduce((sum, die) => (die.dropped ? sum : sum + die.value), 0)
  }
}

function mergeText(segments: Segment[]): Segment[] {
  const merged: Segment[] = []
  for (const seg of segments) {
    const last = merged[merged.length - 1]
    if (seg.kind === 'text' && last?.kind === 'text') last.text += seg.text
    else merged.push({ ...seg })
  }
  return merged
}

export function describe(result: RollResult): string {
  const body = result.segments
    .map((seg) => {
      if (seg.kind === 'text') return seg.text
      const term = result.terms[seg.index]!
      const dice = term.dice.map((d) => (d.dropped ? `~${d.value}~` : d.explosion ? `${d.value}!` : String(d.value)))
      return `${term.notation} [${dice.join(', ')}]`
    })
    .join('')
  return `${body} = ${result.total}`
}
