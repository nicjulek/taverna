import type { Point } from './geometry'
import { type DiagonalRule, type Grid, gridDistance } from './grid'

export type DistanceUnit = 'm' | 'ft'

export interface Scale {
  value: number
  unit: DistanceUnit
}

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function formatDistance(cells: number, scale: Scale): string {
  const total = cells * scale.value
  return scale.unit === 'm' ? `${number.format(total)} m` : `${number.format(total)} ${total === 1 ? 'pé' : 'pés'}`
}

export interface Measurement {
  cells: number
  distance: number
  label: string
}

export function measure(from: Point, to: Point, grid: Grid, scale: Scale, rule: DiagonalRule = 'equal'): Measurement {
  const raw = gridDistance(from, to, grid, rule)
  const cells = grid.type === 'none' ? Math.round(raw * 10) / 10 : raw
  return { cells, distance: cells * scale.value, label: formatDistance(cells, scale) }
}

export function pixelsPerUnit(grid: Grid, scale: Scale): number {
  return grid.size / scale.value
}
