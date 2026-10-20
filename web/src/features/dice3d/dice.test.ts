import type { RollDto } from '@taverna/shared'
import { describe, expect, it } from 'vitest'
import { diceFor } from './dice'

const roll = (terms: { sides: number; dice: { value: number; dropped?: boolean }[] }[], hidden = false) =>
  ({ hidden, result: { terms: terms.map((t) => ({ ...t, notation: '', total: 0 })) } }) as unknown as RollDto

describe('dados para a animação', () => {
  it('mostra os descartados e separa o d100 em dezena e unidade', () => {
    expect(
      diceFor(
        roll([
          { sides: 20, dice: [{ value: 17 }, { value: 4, dropped: true }] },
          { sides: 100, dice: [{ value: 42 }] },
          { sides: 3, dice: [{ value: 2 }] }
        ])
      )
    ).toEqual([
      { sides: 20, value: 17, dropped: false },
      { sides: 20, value: 4, dropped: true },
      { sides: 10, value: 5, dropped: false, labels: ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90'] },
      { sides: 10, value: 3, dropped: false, labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] }
    ])
  })

  it('rolagem às cegas e limite de dados', () => {
    expect(diceFor(roll([{ sides: 6, dice: [{ value: 3 }] }], true))).toEqual([])
    expect(diceFor(roll([{ sides: 6, dice: Array.from({ length: 30 }, () => ({ value: 1 })) }]))).toHaveLength(10)
  })
})
