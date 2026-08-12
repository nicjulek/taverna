import type { SceneItemDto, SceneWithItemsDto } from '@taverna/shared'
import {
  type Ambient,
  decodeBits,
  exploredDims,
  hasBit,
  type LightSource,
  type Point,
  type Rect,
  sees,
  type Segment,
  type Viewer,
  visibilityPolygon,
  visibleCells,
  wallSegments
} from '@taverna/tabletop'
import { useMemo } from 'react'

export interface VisionState {
  active: boolean
  ambient: Ambient
  bounds: Rect
  cell: number
  viewers: Viewer[]
  lights: LightSource[]
  moveSegments: Segment[]
  visibleTokens: Set<string>
  explored: { bits: Uint8Array; cols: number; rows: number } | null
  seen: number[]
}

const center = (item: SceneItemDto): Point => ({ x: item.x + item.width / 2, y: item.y + item.height / 2 })

function radius(value: unknown, cell: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n * cell : 0
}

export function tokenLight(item: SceneItemDto): { bright: number; dim: number } | null {
  const light = item.data.light as { bright?: unknown; dim?: unknown } | undefined
  if (!light) return null
  const bright = Number(light.bright)
  const dim = Number(light.dim)
  return bright > 0 || dim > 0 ? { bright: Math.max(0, bright || 0), dim: Math.max(0, dim || 0) } : null
}

export function isViewer(item: SceneItemDto, gm: boolean, me: string): boolean {
  if (item.kind !== 'token' || item.data.vision === false) return false
  return gm ? item.ownerId !== null : item.ownerId === me
}

export function computeVision(scene: SceneWithItemsDto, gm: boolean, me: string, preview: boolean): VisionState {
  const { settings } = scene
  const cell = settings.grid.size
  const bounds = { x: 0, y: 0, width: settings.width * cell, height: settings.height * cell }
  const walls = scene.items.filter((item) => item.kind === 'wall')
  const moveSegments = wallSegments(walls, 'move')
  const lighting = settings.lighting
  const active = lighting.vision && (!gm || preview)
  const base = { active, ambient: lighting.ambient, bounds, cell, moveSegments }
  if (!active) return { ...base, viewers: [], lights: [], visibleTokens: new Set(), explored: null, seen: [] }

  const sight = wallSegments(walls, 'sight')
  const lights: LightSource[] = []
  for (const item of scene.items) {
    if (item.kind === 'light') {
      const c = center(item)
      lights.push({
        center: c,
        bright: radius(item.data.bright, cell),
        dim: radius(item.data.dim, cell),
        polygon: visibilityPolygon(c, sight, bounds)
      })
    } else if (item.kind === 'token') {
      const light = tokenLight(item)
      if (!light) continue
      const c = center(item)
      lights.push({ center: c, bright: light.bright * cell, dim: light.dim * cell, polygon: visibilityPolygon(c, sight, bounds) })
    }
  }
  const viewers: Viewer[] = scene.items
    .filter((item) => isViewer(item, gm, me))
    .map((item) => {
      const c = center(item)
      return { center: c, darkvision: radius(item.data.darkvision, cell), polygon: visibilityPolygon(c, sight, bounds) }
    })

  const visibleTokens = new Set<string>()
  for (const item of scene.items) {
    if (item.kind !== 'token') continue
    if (!gm && item.ownerId === me) visibleTokens.add(item.id)
    else if (viewers.some((viewer) => sees(center(item), viewer, lights, lighting.ambient))) visibleTokens.add(item.id)
  }

  const { cols, rows } = exploredDims(settings.width, settings.height)
  const bits = decodeBits(scene.explored, cols * rows)
  const seen =
    lighting.explore && !gm ? visibleCells(viewers, lights, lighting.ambient, cell, cols, rows).filter((i) => !hasBit(bits, i)) : []
  return { ...base, viewers, lights, visibleTokens, explored: lighting.explore ? { bits, cols, rows } : null, seen }
}

export function useVision(scene: SceneWithItemsDto | null, gm: boolean, me: string, preview: boolean): VisionState | null {
  return useMemo(() => (scene ? computeVision(scene, gm, me, preview) : null), [scene, gm, me, preview])
}
