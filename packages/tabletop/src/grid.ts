import type { Point } from './geometry'

export type GridType = 'square' | 'hex' | 'none'

export interface Grid {
  type: GridType
  size: number
  offsetX: number
  offsetY: number
}

export interface Hex {
  q: number
  r: number
}

const SQRT3 = Math.sqrt(3)

export function hexRadius(size: number): number {
  return size / SQRT3
}

export function hexToPixel(hex: Hex, grid: Grid): Point {
  const radius = hexRadius(grid.size)
  return { x: grid.offsetX + radius * SQRT3 * (hex.q + hex.r / 2), y: grid.offsetY + radius * 1.5 * hex.r }
}

export function hexRound(q: number, r: number): Hex {
  const s = -q - r
  let rq = Math.round(q)
  let rr = Math.round(r)
  const rs = Math.round(s)
  const dq = Math.abs(rq - q)
  const dr = Math.abs(rr - r)
  const ds = Math.abs(rs - s)
  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs
  return { q: rq + 0, r: rr + 0 }
}

export function pixelToHex(point: Point, grid: Grid): Hex {
  const radius = hexRadius(grid.size)
  const x = point.x - grid.offsetX
  const y = point.y - grid.offsetY
  return hexRound(((SQRT3 / 3) * x - y / 3) / radius, ((2 / 3) * y) / radius)
}

export function hexCorners(center: Point, size: number): Point[] {
  const radius = hexRadius(size)
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
  })
}

export function hexDistance(a: Hex, b: Hex): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

export function snap(point: Point, grid: Grid, span = 1): Point {
  if (grid.type === 'none') return point
  if (grid.type === 'hex') return hexToPixel(pixelToHex(point, grid), grid)
  const half = span % 2 === 0 ? 0 : grid.size / 2
  return {
    x: grid.offsetX + Math.round((point.x - grid.offsetX - half) / grid.size) * grid.size + half,
    y: grid.offsetY + Math.round((point.y - grid.offsetY - half) / grid.size) * grid.size + half
  }
}

export function snapToLine(value: number, size: number, offset: number): number {
  return offset + Math.round((value - offset) / size) * size
}

export type DiagonalRule = 'equal' | 'alternate'

export function gridDistance(a: Point, b: Point, grid: Grid, rule: DiagonalRule = 'equal'): number {
  if (grid.type === 'hex') return hexDistance(pixelToHex(a, grid), pixelToHex(b, grid))
  const dx = Math.abs(b.x - a.x) / grid.size
  const dy = Math.abs(b.y - a.y) / grid.size
  if (grid.type === 'none') return Math.hypot(dx, dy)
  const cols = Math.round(dx)
  const rows = Math.round(dy)
  const diagonal = Math.min(cols, rows)
  const straight = Math.max(cols, rows) - diagonal
  return rule === 'alternate' ? straight + diagonal + Math.floor(diagonal / 2) : straight + diagonal
}
