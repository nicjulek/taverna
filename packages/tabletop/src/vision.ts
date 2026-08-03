import { type Point, pointInPolygon, type Rect } from './geometry'

export interface Segment {
  a: Point
  b: Point
}

export const WALL_TYPES = ['wall', 'door', 'window'] as const
export type WallType = (typeof WALL_TYPES)[number]
export const DOOR_STATES = ['open', 'closed', 'locked'] as const
export type DoorState = (typeof DOOR_STATES)[number]
export type Ambient = 'bright' | 'dim' | 'dark'
export type BlockPurpose = 'sight' | 'move'

export interface WallLike {
  x: number
  y: number
  data: Record<string, unknown>
}

export function wallType(wall: WallLike): WallType {
  const type = wall.data.type
  return type === 'door' || type === 'window' ? type : 'wall'
}

export function doorState(wall: WallLike): DoorState {
  const state = wall.data.state
  return state === 'open' || state === 'locked' ? state : 'closed'
}

export function wallPoints(wall: WallLike): Point[] {
  const raw = Array.isArray(wall.data.points) ? (wall.data.points as unknown[]) : []
  const points: Point[] = []
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const x = Number(raw[i])
    const y = Number(raw[i + 1])
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x: wall.x + x, y: wall.y + y })
  }
  return points
}

export function blocks(type: WallType, state: DoorState, purpose: BlockPurpose): boolean {
  if (type === 'door') return state !== 'open'
  if (type === 'window') return purpose === 'move'
  return true
}

export function wallSegments(walls: WallLike[], purpose: BlockPurpose): Segment[] {
  const segments: Segment[] = []
  for (const wall of walls) {
    if (!blocks(wallType(wall), doorState(wall), purpose)) continue
    const points = wallPoints(wall)
    for (let i = 1; i < points.length; i++) segments.push({ a: points[i - 1]!, b: points[i]! })
  }
  return segments
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

export function segmentsCross(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const d1 = cross(q1, q2, p1)
  const d2 = cross(q1, q2, p2)
  const d3 = cross(p1, p2, q1)
  const d4 = cross(p1, p2, q2)
  if (d1 === 0 && d2 === 0) return false
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0) || d1 === 0 || d2 === 0) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0) || d3 === 0 || d4 === 0)
  )
}

export function pathBlocked(from: Point, to: Point, segments: Segment[]): boolean {
  return segments.some((s) => segmentsCross(from, to, s.a, s.b))
}

function rectSegments(r: Rect): Segment[] {
  const a = { x: r.x, y: r.y }
  const b = { x: r.x + r.width, y: r.y }
  const c = { x: r.x + r.width, y: r.y + r.height }
  const d = { x: r.x, y: r.y + r.height }
  return [
    { a, b },
    { a: b, b: c },
    { a: c, b: d },
    { a: d, b: a }
  ]
}

function rayHit(origin: Point, dx: number, dy: number, s: Segment): number | null {
  const sx = s.b.x - s.a.x
  const sy = s.b.y - s.a.y
  const denom = dx * sy - dy * sx
  if (Math.abs(denom) < 1e-12) return null
  const t = ((s.a.x - origin.x) * sy - (s.a.y - origin.y) * sx) / denom
  const u = ((s.a.x - origin.x) * dy - (s.a.y - origin.y) * dx) / denom
  return t >= 0 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null
}

export function visibilityPolygon(origin: Point, segments: Segment[], bounds: Rect): Point[] {
  const o = {
    x: Math.min(bounds.x + bounds.width - 0.5, Math.max(bounds.x + 0.5, origin.x)),
    y: Math.min(bounds.y + bounds.height - 0.5, Math.max(bounds.y + 0.5, origin.y))
  }
  const edges = [...segments, ...rectSegments(bounds)]
  const angles: number[] = []
  for (const s of edges) {
    for (const p of [s.a, s.b]) {
      const angle = Math.atan2(p.y - o.y, p.x - o.x)
      angles.push(angle - 1e-5, angle, angle + 1e-5)
    }
  }
  angles.sort((a, b) => a - b)
  const polygon: Point[] = []
  for (const angle of angles) {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    let best = Infinity
    for (const s of edges) {
      const t = rayHit(o, dx, dy, s)
      if (t !== null && t < best) best = t
    }
    if (best < Infinity) polygon.push({ x: o.x + dx * best, y: o.y + dy * best })
  }
  return polygon
}

export interface LightSource {
  center: Point
  bright: number
  dim: number
  polygon: Point[]
}

export interface Viewer {
  center: Point
  darkvision: number
  polygon: Point[]
}

export type Visibility = 'bright' | 'dim' | null

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export function illumination(point: Point, lights: LightSource[], ambient: Ambient): Ambient {
  let level: Ambient = ambient
  for (const light of lights) {
    if (level === 'bright') break
    const d = distance(point, light.center)
    if (d > Math.max(light.bright, light.dim) || !pointInPolygon(point, light.polygon)) continue
    level = d <= light.bright ? 'bright' : 'dim'
  }
  return level
}

export function sees(point: Point, viewer: Viewer, lights: LightSource[], ambient: Ambient): Visibility {
  if (!pointInPolygon(point, viewer.polygon)) return null
  const level = illumination(point, lights, ambient)
  if (level === 'bright') return 'bright'
  const inDarkvision = viewer.darkvision > 0 && distance(point, viewer.center) <= viewer.darkvision
  if (level === 'dim') return inDarkvision ? 'bright' : 'dim'
  return inDarkvision ? 'dim' : null
}

export const EXPLORE_RESOLUTION = 2

export function exploredDims(widthCells: number, heightCells: number) {
  return { cols: widthCells * EXPLORE_RESOLUTION, rows: heightCells * EXPLORE_RESOLUTION }
}

export function visibleCells(
  viewers: Viewer[],
  lights: LightSource[],
  ambient: Ambient,
  cellSize: number,
  cols: number,
  rows: number
): number[] {
  const step = cellSize / EXPLORE_RESOLUTION
  const seen = new Set<number>()
  for (const viewer of viewers) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of viewer.polygon) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    const c0 = Math.max(0, Math.floor(minX / step))
    const c1 = Math.min(cols - 1, Math.floor(maxX / step))
    const r0 = Math.max(0, Math.floor(minY / step))
    const r1 = Math.min(rows - 1, Math.floor(maxY / step))
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const index = r * cols + c
        if (seen.has(index)) continue
        if (sees({ x: (c + 0.5) * step, y: (r + 0.5) * step }, viewer, lights, ambient)) seen.add(index)
      }
    }
  }
  return [...seen].sort((a, b) => a - b)
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function encodeBits(bits: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bits.length; i += 3) {
    const n = (bits[i]! << 16) | ((bits[i + 1] ?? 0) << 8) | (bits[i + 2] ?? 0)
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]!
    out += i + 1 < bits.length ? ALPHABET[(n >> 6) & 63]! : '='
    out += i + 2 < bits.length ? ALPHABET[n & 63]! : '='
  }
  return out
}

export function decodeBits(text: string | null | undefined, cells: number): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(cells / 8))
  if (!text) return bytes
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '')
  let byte = 0
  for (let i = 0; i < clean.length && byte < bytes.length; i += 4) {
    const n = clean
      .slice(i, i + 4)
      .padEnd(4, 'A')
      .split('')
      .reduce((acc, ch) => (acc << 6) | ALPHABET.indexOf(ch), 0)
    for (const shift of [16, 8, 0]) if (byte < bytes.length) bytes[byte++] = (n >> shift) & 255
  }
  return bytes
}

export function hasBit(bits: Uint8Array, index: number): boolean {
  return ((bits[index >> 3] ?? 0) & (1 << (index & 7))) !== 0
}

export function setBits(bits: Uint8Array, indexes: number[]): number {
  let added = 0
  for (const index of indexes) {
    const slot = index >> 3
    if (slot < 0 || slot >= bits.length) continue
    const mask = 1 << (index & 7)
    if (!(bits[slot]! & mask)) {
      bits[slot] = bits[slot]! | mask
      added++
    }
  }
  return added
}
