import { describe, expect, it } from 'vitest'
import {
  affectedSquares,
  calibrate,
  containsPoint,
  fitToSquares,
  formatDistance,
  type Grid,
  gridDistance,
  hexCorners,
  hexDistance,
  hexToPixel,
  measure,
  pixelToHex,
  snap,
  squaresOf,
  templateShape
} from './index'

const square: Grid = { type: 'square', size: 50, offsetX: 0, offsetY: 0 }
const hex: Grid = { type: 'hex', size: 50, offsetX: 0, offsetY: 0 }
const metric = { value: 1.5, unit: 'm' as const }
const feet = { value: 5, unit: 'ft' as const }

describe('grade quadrada', () => {
  it('token de 1 quadrado vai para o centro da célula', () => {
    expect(snap({ x: 61, y: 140 }, square)).toEqual({ x: 75, y: 125 })
  })

  it('token de 2 quadrados vai para o cruzamento das linhas', () => {
    expect(snap({ x: 61, y: 140 }, square, 2)).toEqual({ x: 50, y: 150 })
  })

  it('respeita o deslocamento da grade', () => {
    expect(snap({ x: 61, y: 140 }, { ...square, offsetX: 10, offsetY: 5 })).toEqual({ x: 85, y: 130 })
  })

  it('sem grade não encaixa', () => {
    expect(snap({ x: 61, y: 140 }, { ...square, type: 'none' })).toEqual({ x: 61, y: 140 })
  })

  it('diagonal conta como um quadrado, como no 5e', () => {
    expect(gridDistance({ x: 25, y: 25 }, { x: 175, y: 125 }, square)).toBe(3)
  })

  it('regra alternada 5-10-5', () => {
    expect(gridDistance({ x: 25, y: 25 }, { x: 175, y: 175 }, square, 'alternate')).toBe(4)
    expect(gridDistance({ x: 25, y: 25 }, { x: 225, y: 225 }, square, 'alternate')).toBe(6)
  })

  it('sem grade mede em linha reta', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 150, y: 200 }, { ...square, type: 'none' })).toBe(5)
  })
})

describe('grade hexagonal', () => {
  it('ida e volta entre pixel e hexágono', () => {
    for (const cell of [
      { q: 0, r: 0 },
      { q: 3, r: -1 },
      { q: -2, r: 4 }
    ]) {
      expect(pixelToHex(hexToPixel(cell, hex), hex)).toEqual(cell)
    }
  })

  it('encaixa no centro do hexágono mais perto', () => {
    const center = hexToPixel({ q: 2, r: 1 }, hex)
    expect(snap({ x: center.x + 8, y: center.y - 6 }, hex)).toEqual(center)
  })

  it('distância em hexágonos', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3)
    expect(gridDistance(hexToPixel({ q: 0, r: 0 }, hex), hexToPixel({ q: -2, r: 4 }, hex), hex)).toBe(4)
  })

  it('seis cantos à mesma distância do centro', () => {
    const corners = hexCorners({ x: 100, y: 100 }, 50)
    expect(corners).toHaveLength(6)
    for (const c of corners) expect(Math.hypot(c.x - 100, c.y - 100)).toBeCloseTo(50 / Math.sqrt(3))
  })
})

describe('régua', () => {
  it('em metros e em pés', () => {
    expect(measure({ x: 25, y: 25 }, { x: 325, y: 25 }, square, metric).label).toBe('9 m')
    expect(measure({ x: 25, y: 25 }, { x: 325, y: 25 }, square, feet)).toMatchObject({ cells: 6, distance: 30, label: '30 pés' })
  })

  it('formata decimais em português', () => {
    expect(formatDistance(1, metric)).toBe('1,5 m')
    expect(formatDistance(1, { value: 1, unit: 'ft' })).toBe('1 pé')
  })
})

describe('moldes de área', () => {
  it('cone de 15 pés saindo de um canto pega os quadrados com o centro dentro', () => {
    const shape = templateShape({ kind: 'cone', origin: { x: 0, y: 150 }, angle: 0, size: 15 }, square, feet)
    expect(containsPoint(shape, { x: 125, y: 150 })).toBe(true)
    expect(containsPoint(shape, { x: 25, y: 75 })).toBe(false)
    expect(affectedSquares(shape, square, { cols: 10, rows: 10 })).toBe(4)
  })

  it('esfera de 10 pés tem raio de 2 quadrados', () => {
    const shape = templateShape({ kind: 'sphere', origin: { x: 250, y: 250 }, angle: 0, size: 10 }, square, feet)
    expect(shape).toEqual({ type: 'circle', center: { x: 250, y: 250 }, radius: 100 })
    expect(affectedSquares(shape, square, { cols: 10, rows: 10 })).toBe(12)
  })

  it('linha de 30 pés tem 1 quadrado de largura', () => {
    const shape = templateShape({ kind: 'line', origin: { x: 0, y: 125 }, angle: 0, size: 30 }, square, feet)
    expect(affectedSquares(shape, square, { cols: 10, rows: 10 })).toBe(6)
  })

  it('cubo gira junto com o molde', () => {
    const shape = templateShape({ kind: 'cube', origin: { x: 250, y: 250 }, angle: Math.PI / 2, size: 10 }, square, feet)
    expect(containsPoint(shape, { x: 250, y: 320 })).toBe(true)
    expect(containsPoint(shape, { x: 320, y: 250 })).toBe(false)
  })
})

describe('ajustar o mapa', () => {
  it('encaixa um mapa em 30 por 20 quadrados', () => {
    expect(fitToSquares({ x: 12, y: 37, width: 900, height: 700 }, 30, 20, square)).toEqual({ x: 0, y: 50, width: 1500, height: 1000 })
    expect(squaresOf({ x: 0, y: 0, width: 1500, height: 1000 }, square)).toEqual({ cols: 30, rows: 20 })
  })

  it('recusa zero quadrados', () => {
    expect(() => fitToSquares({ x: 0, y: 0, width: 10, height: 10 }, 0, 4, square)).toThrowError(RangeError)
  })

  it('calibra pela célula desenhada sobre o mapa', () => {
    const map = { x: 7, y: 3, width: 800, height: 600 }
    const cell = { x: 47, y: 43, width: 40, height: 40 }
    const fixed = calibrate(map, cell, square)
    expect(fixed.width).toBe(1000)
    expect(fixed.height).toBe(750)
    const cellX = fixed.x + (cell.x - map.x) * (50 / 40)
    const cellY = fixed.y + (cell.y - map.y) * (50 / 40)
    expect(cellX % 50).toBe(0)
    expect(cellY % 50).toBe(0)
  })

  it('não calibra com um quadrado minúsculo', () => {
    expect(() => calibrate({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 2, height: 2 }, square)).toThrowError(
      'célula inteira'
    )
  })
})
