import { DiceError, type Node, parse, stats, toNotation } from '@taverna/dice'

export const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const
export type DieSides = (typeof DIE_SIDES)[number]

interface Part {
  sign: 1 | -1
  node: Node
}

function flatten(node: Node, sign: 1 | -1 = 1, out: Part[] = []): Part[] {
  if (node.type === 'binary' && (node.op === '+' || node.op === '-')) {
    flatten(node.left, sign, out)
    flatten(node.right, node.op === '-' ? (sign === 1 ? -1 : 1) : sign, out)
  } else {
    out.push({ sign, node })
  }
  return out
}

function join(parts: Part[]): string {
  if (parts.length === 0) return ''
  return parts
    .map((part, index) => {
      const text = toNotation(part.node)
      if (index === 0) return part.sign === -1 ? `-${text}` : text
      return `${part.sign === -1 ? ' - ' : ' + '}${text}`
    })
    .join('')
}

function tryParts(text: string): Part[] | null {
  if (!text.trim()) return []
  try {
    return flatten(parse(text).ast)
  } catch {
    return null
  }
}

export function addDie(text: string, sides: DieSides): string {
  const parts = tryParts(text)
  if (parts === null) return `${text.trim()} + 1d${sides}`
  const same = parts.find((p) => p.sign === 1 && p.node.type === 'dice' && p.node.sides === sides && p.node.modifiers.length === 0)
  if (same && same.node.type === 'dice') same.node = { ...same.node, count: Math.min(same.node.count + 1, 100) }
  else {
    const firstNumber = parts.findIndex((p) => p.node.type === 'number')
    const die: Part = { sign: 1, node: { type: 'dice', count: 1, sides, modifiers: [] } }
    if (firstNumber === -1) parts.push(die)
    else parts.splice(firstNumber, 0, die)
  }
  return join(parts)
}

export function adjustModifier(text: string, delta: number): string {
  const parts = tryParts(text)
  if (parts === null) return text
  const index = parts.findLastIndex((p) => p.node.type === 'number')
  const current = index === -1 ? 0 : (parts[index]!.node as { value: number }).value * parts[index]!.sign
  const next = current + delta
  const replacement: Part | null = next === 0 ? null : { sign: next < 0 ? -1 : 1, node: { type: 'number', value: Math.abs(next) } }
  if (index === -1) {
    if (replacement) parts.push(replacement)
  } else if (replacement) parts[index] = replacement
  else parts.splice(index, 1)
  return join(parts)
}

export function currentModifier(text: string): number {
  const parts = tryParts(text) ?? []
  return parts.filter((p) => p.node.type === 'number').reduce((sum, p) => sum + (p.node as { value: number }).value * p.sign, 0)
}

export type Preview = { ok: true; min: number; max: number; average: number | null; hasD20: boolean } | { ok: false; error: string }

export function preview(text: string): Preview | null {
  if (!text.trim()) return null
  try {
    const ast = parse(text).ast
    const s = stats(text)
    return { ok: true, ...s, hasD20: JSON.stringify(ast).includes('"sides":20') }
  } catch (error) {
    return { ok: false, error: error instanceof DiceError ? error.message : 'Rolagem inválida' }
  }
}

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function describeRange(p: Extract<Preview, { ok: true }>): string {
  const range =
    p.min === p.max
      ? `sempre ${number.format(p.min)}`
      : Number.isFinite(p.max)
        ? `de ${number.format(p.min)} a ${number.format(p.max)}`
        : `a partir de ${number.format(p.min)}`
  return p.average === null || p.min === p.max ? range : `${range}, média ${number.format(p.average)}`
}
