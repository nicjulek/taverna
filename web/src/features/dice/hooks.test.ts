import type { RollDto } from '@taverna/shared'
import { describe, expect, it } from 'vitest'
import { prependRoll } from './hooks'

const roll = (id: string) => ({ id }) as RollDto

describe('prependRoll', () => {
  it('coloca a rolagem nova no topo', () => {
    const data = { pages: [[roll('b')], [roll('a')]], pageParams: [null, 'x'] }
    expect(prependRoll(data, roll('c'))?.pages[0]?.map((r) => r.id)).toEqual(['c', 'b'])
  })

  it('ignora a rolagem que já chegou pela resposta', () => {
    const data = { pages: [[roll('b')]], pageParams: [null] }
    expect(prependRoll(data, roll('b'))).toBe(data)
  })

  it('não cria cache que não existe', () => {
    expect(prependRoll(undefined, roll('a'))).toBeUndefined()
  })
})
