import type { RollDto } from '@taverna/shared'
import type { DieRequest } from './engine'

const SUPPORTED = new Set([4, 6, 8, 10, 12, 20])
const TENS = ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']
const UNITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function diceFor(roll: RollDto, limit = 10): DieRequest[] {
  if (roll.hidden) return []
  const out: DieRequest[] = []
  for (const term of roll.result.terms) {
    for (const die of term.dice) {
      if (out.length >= limit) return out
      if (term.sides === 100) {
        const tens = Math.floor((die.value % 100) / 10)
        const units = die.value % 10
        out.push({ sides: 10, value: tens + 1, dropped: Boolean(die.dropped), labels: TENS })
        out.push({ sides: 10, value: units + 1, dropped: Boolean(die.dropped), labels: UNITS })
      } else if (SUPPORTED.has(term.sides)) out.push({ sides: term.sides, value: die.value, dropped: Boolean(die.dropped) })
    }
  }
  return out
}
