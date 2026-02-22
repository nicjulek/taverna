export type Rng = (sides: number) => number

const buffer = new Uint32Array(1)

export const cryptoRng: Rng = (sides) => {
  const limit = Math.floor(0x1_0000_0000 / sides) * sides
  for (;;) {
    globalThis.crypto.getRandomValues(buffer)
    const value = buffer[0]!
    if (value < limit) return (value % sides) + 1
  }
}

export function sequenceRng(values: number[]): Rng {
  let i = 0
  return () => {
    if (i >= values.length) throw new Error('sequenceRng sem valores')
    return values[i++]!
  }
}
