import type { Grid, Point, TemplateKind, WallType } from '@taverna/tabletop'
import { normalizeRect, snap } from '@taverna/tabletop'
import { LIGHT_PRESETS, type LightPreset, type SceneItemDto, type SceneItemInput, type SceneLayer } from '@taverna/shared'

export type Tool =
  | 'select'
  | 'pan'
  | 'brush'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'text'
  | 'marker'
  | 'ruler'
  | 'template'
  | 'token'
  | 'wall'
  | 'light'
  | 'calibrate'

export const TOOL_LABELS: Record<Tool, string> = {
  select: 'Selecionar e mover',
  pan: 'Arrastar a mesa',
  brush: 'Pincel',
  rect: 'Retângulo',
  ellipse: 'Elipse',
  line: 'Linha',
  text: 'Texto',
  marker: 'Marcador',
  ruler: 'Régua',
  template: 'Molde de área',
  token: 'Token',
  wall: 'Paredes, portas e janelas',
  light: 'Luz',
  calibrate: 'Calibrar pela grade do mapa'
}

export const PLAYER_TOOLS: Tool[] = ['select', 'pan', 'brush', 'rect', 'ellipse', 'line', 'text', 'marker', 'ruler', 'template']

export interface DrawStyle {
  stroke: string
  fill: string
  strokeWidth: number
}

export function drawingItem(points: Point[], layer: SceneLayer, style: DrawStyle): SceneItemInput | null {
  if (points.length < 2) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return {
    layer,
    kind: 'drawing',
    x: minX,
    y: minY,
    width: Math.max(1, Math.max(...xs) - minX),
    height: Math.max(1, Math.max(...ys) - minY),
    data: {
      points: points.flatMap((p) => [Math.round(p.x - minX), Math.round(p.y - minY)]),
      stroke: style.stroke,
      strokeWidth: style.strokeWidth
    }
  }
}

export function shapeItem(
  kind: 'rect' | 'ellipse' | 'line',
  from: Point,
  to: Point,
  layer: SceneLayer,
  style: DrawStyle
): SceneItemInput | null {
  const rect = normalizeRect(from, to)
  if (rect.width < 4 && rect.height < 4) return null
  if (kind === 'line') {
    return {
      layer,
      kind,
      x: from.x,
      y: from.y,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
      data: { dx: to.x - from.x, dy: to.y - from.y, stroke: style.stroke, strokeWidth: style.strokeWidth, arrow: true }
    }
  }
  return { layer, kind, ...rect, width: Math.max(1, rect.width), height: Math.max(1, rect.height), data: { ...style } }
}

export function templateItem(kind: TemplateKind, origin: Point, to: Point, size: number, layer: SceneLayer, color: string): SceneItemInput {
  const angle = Math.atan2(to.y - origin.y, to.x - origin.x)
  return { layer, kind: 'template', x: origin.x, y: origin.y, width: 1, height: 1, data: { template: kind, size, angle, color } }
}

export function tokenItem(
  at: Point,
  grid: Grid,
  data: { name: string; color: string; span: number; characterId?: string | null; assetId?: string | null }
): SceneItemInput {
  const center = snap(at, grid, data.span)
  const size = grid.size * data.span
  return { layer: 'tokens', kind: 'token', x: center.x - size / 2, y: center.y - size / 2, width: size, height: size, data }
}

export function mediaItem(
  kind: 'image' | 'video',
  assetId: string,
  at: Point,
  natural: { width: number; height: number },
  name: string
): SceneItemInput {
  return {
    layer: 'map',
    kind,
    x: Math.round(at.x - natural.width / 2),
    y: Math.round(at.y - natural.height / 2),
    width: natural.width,
    height: natural.height,
    data: { assetId, name }
  }
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '?') + (words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '')).toUpperCase()
}

export function canEdit(item: SceneItemDto, gm: boolean, me: string): boolean {
  return gm || (!item.locked && (item.createdBy === me || item.ownerId === me))
}

export function wallItem(points: Point[], type: WallType): SceneItemInput | null {
  const clean = points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y)
  if (clean.length < 2) return null
  const xs = clean.map((p) => p.x)
  const ys = clean.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return {
    layer: 'objects',
    kind: 'wall',
    x: minX,
    y: minY,
    width: Math.max(1, Math.max(...xs) - minX),
    height: Math.max(1, Math.max(...ys) - minY),
    data: {
      type,
      ...(type === 'door' ? { state: 'closed' } : {}),
      points: clean.flatMap((p) => [Math.round((p.x - minX) * 10) / 10, Math.round((p.y - minY) * 10) / 10])
    }
  }
}

export function lightItem(at: Point, preset: LightPreset): SceneItemInput {
  const { bright, dim } = LIGHT_PRESETS[preset]
  return {
    layer: 'objects',
    kind: 'light',
    x: at.x - 20,
    y: at.y - 20,
    width: 40,
    height: 40,
    data: { preset, bright, dim, color: '#ffd27a' }
  }
}
