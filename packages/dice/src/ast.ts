export type Modifier =
  | { kind: 'keep'; which: 'high' | 'low'; amount: number }
  | { kind: 'drop'; which: 'high' | 'low'; amount: number }
  | { kind: 'explode' }
  | { kind: 'reroll'; atMost: number }

export interface DiceNode {
  type: 'dice'
  count: number
  sides: number
  modifiers: Modifier[]
}

export type Node =
  | { type: 'number'; value: number }
  | DiceNode
  | { type: 'binary'; op: '+' | '-' | '*' | '/'; left: Node; right: Node }
  | { type: 'negate'; value: Node }
  | { type: 'group'; value: Node }

export class DiceError extends Error {
  constructor(
    message: string,
    readonly position?: number
  ) {
    super(message)
    this.name = 'DiceError'
  }
}

export const LIMITS = {
  length: 200,
  count: 100,
  sides: 1000,
  totalDice: 300,
  explosions: 100
} as const

export function modifierNotation(modifier: Modifier): string {
  switch (modifier.kind) {
    case 'keep':
      return `k${modifier.which === 'high' ? 'h' : 'l'}${modifier.amount}`
    case 'drop':
      return `d${modifier.which === 'high' ? 'h' : 'l'}${modifier.amount}`
    case 'explode':
      return '!'
    case 'reroll':
      return `r${modifier.atMost}`
  }
}

export function diceNotation(node: DiceNode): string {
  const sides = node.sides === 100 ? '100' : String(node.sides)
  return `${node.count}d${sides}${node.modifiers.map(modifierNotation).join('')}`
}

const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 } as const

export function toNotation(node: Node): string {
  switch (node.type) {
    case 'number':
      return String(node.value)
    case 'dice':
      return diceNotation(node)
    case 'group':
      return `(${toNotation(node.value)})`
    case 'negate':
      return `-${toNotation(node.value)}`
    case 'binary': {
      const right =
        node.right.type === 'binary' && PRECEDENCE[node.right.op] <= PRECEDENCE[node.op]
          ? `(${toNotation(node.right)})`
          : toNotation(node.right)
      return `${toNotation(node.left)} ${node.op} ${right}`
    }
  }
}

export function mapDice(node: Node, fn: (dice: DiceNode) => Node): Node {
  switch (node.type) {
    case 'number':
      return node
    case 'dice':
      return fn(node)
    case 'group':
      return { type: 'group', value: mapDice(node.value, fn) }
    case 'negate':
      return { type: 'negate', value: mapDice(node.value, fn) }
    case 'binary':
      return { ...node, left: mapDice(node.left, fn), right: mapDice(node.right, fn) }
  }
}

export function collectDice(node: Node): DiceNode[] {
  const found: DiceNode[] = []
  mapDice(node, (dice) => {
    found.push(dice)
    return dice
  })
  return found
}
