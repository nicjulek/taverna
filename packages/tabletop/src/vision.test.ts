import { describe, expect, it } from 'vitest'
import { pointInPolygon } from './geometry'
import {
  decodeBits,
  encodeBits,
  hasBit,
  illumination,
  pathBlocked,
  sees,
  setBits,
  visibilityPolygon,
  visibleCells,
  wallSegments,
  type WallLike
} from './vision'

const room = { x: 0, y: 0, width: 700, height: 700 }
const wall = (points: number[], data: Record<string, unknown> = {}): WallLike => ({ x: 0, y: 0, data: { points, ...data } })

describe('paredes', () => {
  const walls = [
    wall([350, 0, 350, 700]),
    wall([0, 350, 700, 350], { type: 'door', state: 'closed' }),
    wall([100, 600, 200, 600], { type: 'window' })
  ]

  it('separa o que bloqueia visão do que bloqueia movimento', () => {
    expect(wallSegments(walls, 'sight')).toHaveLength(2)
    expect(wallSegments(walls, 'move')).toHaveLength(3)
    expect(wallSegments([wall([0, 0, 10, 10], { type: 'door', state: 'open' })], 'move')).toHaveLength(0)
  })

  it('bloqueia o caminho que atravessa a parede', () => {
    const segments = wallSegments(walls, 'move')
    expect(pathBlocked({ x: 100, y: 100 }, { x: 500, y: 100 }, segments)).toBe(true)
    expect(pathBlocked({ x: 100, y: 100 }, { x: 200, y: 200 }, segments)).toBe(false)
    expect(pathBlocked({ x: 150, y: 550 }, { x: 150, y: 650 }, segments)).toBe(true)
  })
})

describe('linha de visão', () => {
  it('não enxerga atrás da parede', () => {
    const polygon = visibilityPolygon({ x: 100, y: 100 }, wallSegments([wall([350, 0, 350, 700])], 'sight'), room)
    expect(pointInPolygon({ x: 300, y: 600 }, polygon)).toBe(true)
    expect(pointInPolygon({ x: 500, y: 100 }, polygon)).toBe(false)
  })

  it('enxerga pela janela e pela porta aberta', () => {
    const open = visibilityPolygon(
      { x: 100, y: 100 },
      wallSegments([wall([350, 0, 350, 700], { type: 'door', state: 'open' })], 'sight'),
      room
    )
    expect(pointInPolygon({ x: 500, y: 100 }, open)).toBe(true)
  })

  it('precisa de luz ou visão no escuro', () => {
    const polygon = visibilityPolygon({ x: 100, y: 100 }, [], room)
    const viewer = { center: { x: 100, y: 100 }, darkvision: 0, polygon }
    const torch = { center: { x: 100, y: 100 }, bright: 140, dim: 280, polygon }
    expect(sees({ x: 600, y: 600 }, viewer, [], 'dark')).toBeNull()
    expect(sees({ x: 600, y: 600 }, viewer, [], 'dim')).toBe('dim')
    expect(sees({ x: 150, y: 150 }, viewer, [torch], 'dark')).toBe('bright')
    expect(sees({ x: 300, y: 100 }, viewer, [torch], 'dark')).toBe('dim')
    expect(sees({ x: 300, y: 100 }, { ...viewer, darkvision: 420 }, [], 'dark')).toBe('dim')
    expect(illumination({ x: 600, y: 600 }, [torch], 'dark')).toBe('dark')
  })

  it('marca as células vistas', () => {
    const polygon = visibilityPolygon({ x: 35, y: 35 }, [], { x: 0, y: 0, width: 140, height: 140 })
    const cells = visibleCells([{ center: { x: 35, y: 35 }, darkvision: 0, polygon }], [], 'bright', 70, 4, 4)
    expect(cells).toHaveLength(16)
  })
})

describe('áreas vistas', () => {
  it('guarda e lê os bits', () => {
    const bits = decodeBits(null, 40)
    expect(setBits(bits, [0, 9, 39])).toBe(3)
    expect(setBits(bits, [9])).toBe(0)
    const back = decodeBits(encodeBits(bits), 40)
    expect([0, 9, 39, 10].map((i) => hasBit(back, i))).toEqual([true, true, true, false])
  })
})
