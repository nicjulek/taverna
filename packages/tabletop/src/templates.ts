import { type Point, pointInPolygon, rotate } from './geometry'
import type { Grid } from './grid'
import { pixelsPerUnit, type Scale } from './measure'

export type TemplateKind = 'cone' | 'sphere' | 'cylinder' | 'line' | 'cube'

export interface Template {
  kind: TemplateKind
  origin: Point
  angle: number
  size: number
}

export type TemplateShape = { type: 'circle'; center: Point; radius: number } | { type: 'polygon'; points: Point[] }

export function templateShape(template: Template, grid: Grid, scale: Scale): TemplateShape {
  const length = template.size * pixelsPerUnit(grid, scale)
  const { origin, angle } = template
  const local = (points: Point[]) => points.map((p) => rotate({ x: origin.x + p.x, y: origin.y + p.y }, angle, origin))
  switch (template.kind) {
    case 'sphere':
    case 'cylinder':
      return { type: 'circle', center: origin, radius: length }
    case 'cone':
      return {
        type: 'polygon',
        points: local([
          { x: 0, y: 0 },
          { x: length, y: -length / 2 },
          { x: length, y: length / 2 }
        ])
      }
    case 'line': {
      const half = grid.size / 2
      return {
        type: 'polygon',
        points: local([
          { x: 0, y: -half },
          { x: length, y: -half },
          { x: length, y: half },
          { x: 0, y: half }
        ])
      }
    }
    case 'cube':
      return {
        type: 'polygon',
        points: local([
          { x: 0, y: -length / 2 },
          { x: length, y: -length / 2 },
          { x: length, y: length / 2 },
          { x: 0, y: length / 2 }
        ])
      }
  }
}

export function containsPoint(shape: TemplateShape, point: Point): boolean {
  if (shape.type === 'circle') return Math.hypot(point.x - shape.center.x, point.y - shape.center.y) <= shape.radius + 1e-6
  return pointInPolygon(point, shape.points)
}

export function affectedSquares(shape: TemplateShape, grid: Grid, bounds: { cols: number; rows: number }): number {
  if (grid.type !== 'square') return 0
  let count = 0
  for (let col = 0; col < bounds.cols; col++) {
    for (let row = 0; row < bounds.rows; row++) {
      const center = { x: grid.offsetX + (col + 0.5) * grid.size, y: grid.offsetY + (row + 0.5) * grid.size }
      if (containsPoint(shape, center)) count += 1
    }
  }
  return count
}
