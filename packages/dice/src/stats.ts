import { type DiceNode, type Node } from './ast'
import { parse } from './parser'

export interface RollStats {
  min: number
  max: number
  average: number | null
}

const ENUMERATION_LIMIT = 200_000

export function stats(input: string): RollStats {
  return statsOf(parse(input).ast)
}

export function statsOf(node: Node): RollStats {
  switch (node.type) {
    case 'number':
      return { min: node.value, max: node.value, average: node.value }
    case 'dice':
      return diceStats(node)
    case 'group':
      return statsOf(node.value)
    case 'negate': {
      const s = statsOf(node.value)
      return { min: -s.max, max: -s.min, average: s.average === null ? null : -s.average }
    }
    case 'binary': {
      const a = statsOf(node.left)
      const b = statsOf(node.right)
      switch (node.op) {
        case '+':
          return { min: a.min + b.min, max: a.max + b.max, average: sum(a.average, b.average, 1) }
        case '-':
          return { min: a.min - b.max, max: a.max - b.min, average: sum(a.average, b.average, -1) }
        case '*': {
          const ends = [a.min * b.min, a.min * b.max, a.max * b.min, a.max * b.max].filter((n) => !Number.isNaN(n))
          const constant = a.min === a.max ? a.min : b.min === b.max ? b.min : null
          const other = a.min === a.max ? b : a
          return {
            min: Math.min(...ends),
            max: Math.max(...ends),
            average: constant !== null && other.average !== null ? other.average * constant : null
          }
        }
        case '/': {
          if (b.min <= 0 && b.max >= 0) return { min: -Infinity, max: Infinity, average: null }
          const ends = [a.min / b.min, a.min / b.max, a.max / b.min, a.max / b.max].map(Math.floor)
          return { min: Math.min(...ends), max: Math.max(...ends), average: null }
        }
      }
    }
  }
}

function sum(a: number | null, b: number | null, sign: 1 | -1): number | null {
  return a === null || b === null ? null : a + sign * b
}

function diceStats(node: DiceNode): RollStats {
  const { count, sides, modifiers } = node
  const explode = modifiers.some((m) => m.kind === 'explode')
  const reroll = modifiers.find((m) => m.kind === 'reroll')
  const selection = modifiers.find((m) => m.kind === 'keep' || m.kind === 'drop')
  const kept = !selection
    ? count
    : selection.kind === 'keep'
      ? selection.amount
      : count - (selection.kind === 'drop' ? selection.amount : 0)
  const min = kept
  const max = explode ? Infinity : kept * sides

  if (!selection) {
    let perDie = (sides + 1) / 2
    if (reroll && reroll.kind === 'reroll') {
      let above = 0
      for (let v = reroll.atMost + 1; v <= sides; v++) above += v
      perDie = above / sides + (reroll.atMost / sides) * ((sides + 1) / 2)
    }
    if (explode) perDie = perDie * (sides / (sides - 1))
    return { min, max, average: perDie * count }
  }

  if (explode || reroll || sides ** count > ENUMERATION_LIMIT) return { min, max, average: null }
  return { min, max, average: enumerate(count, sides, selection) }
}

function enumerate(count: number, sides: number, selection: { kind: string; which?: string; amount?: number }): number {
  const faces = new Array<number>(count).fill(1)
  let total = 0
  let outcomes = 0
  for (;;) {
    const sorted = [...faces].sort((a, b) => b - a)
    const amount = selection.amount ?? 1
    let chosen: number[]
    if (selection.kind === 'keep') chosen = selection.which === 'high' ? sorted.slice(0, amount) : sorted.slice(-amount)
    else chosen = selection.which === 'high' ? sorted.slice(amount) : sorted.slice(0, sorted.length - amount)
    total += chosen.reduce((s, v) => s + v, 0)
    outcomes += 1
    let i = 0
    while (i < count && faces[i] === sides) {
      faces[i] = 1
      i += 1
    }
    if (i === count) break
    faces[i]! += 1
  }
  return total / outcomes
}
