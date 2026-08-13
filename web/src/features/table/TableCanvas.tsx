import type { LightPreset, SceneItemDto, SceneItemInput, SceneLayer, SceneWithItemsDto } from '@taverna/shared'
import {
  doorState,
  type Grid,
  hasBit,
  hexCorners,
  hexToPixel,
  measure,
  normalizeRect,
  type Point,
  type Rect as Box,
  snap,
  pathBlocked,
  type TemplateKind,
  templateShape,
  wallPoints,
  type WallType,
  wallType
} from '@taverna/tabletop'
import type Konva from 'konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Ellipse, Group, Image as KonvaImage, Label, Layer, Line, Rect, Shape, Stage, Tag, Text, Transformer } from 'react-konva'
import { canEdit, type DrawStyle, drawingItem, initials, lightItem, shapeItem, templateItem, type Tool, wallItem } from './items'
import { texture } from './textures'
import type { VisionState } from './vision'

export interface View {
  x: number
  y: number
  scale: number
}

interface CanvasProps {
  scene: SceneWithItemsDto
  gm: boolean
  me: string
  tool: Tool
  layer: SceneLayer
  visibleLayers: Record<SceneLayer, boolean>
  selectedId: string | null
  style: DrawStyle
  template: { kind: TemplateKind; size: number }
  view: View
  onView: (view: View) => void
  onSelect: (id: string | null) => void
  onCreate: (item: SceneItemInput) => void
  onUpdate: (id: string, patch: Partial<SceneItemDto>) => void
  onRemove: (id: string) => void
  onCalibrate: (cell: Box) => void
  onPlace: (tool: 'text' | 'token' | 'marker', point: Point) => void
  onDropFiles: (files: File[], point: Point) => void
  vision: VisionState | null
  wallType: WallType
  lightPreset: LightPreset
  onDoor: (id: string, state: 'open' | 'closed') => void
  onBlocked: () => void
}

const WALL_COLORS: Record<WallType, string> = { wall: '#e8bb5f', door: '#c58b3a', window: '#6fa8dc' }

const LAYER_ORDER: SceneLayer[] = ['map', 'objects', 'tokens', 'gm']

function useMedia(url: string | null, kind: 'image' | 'video'): HTMLImageElement | HTMLVideoElement | null {
  const [media, setMedia] = useState<HTMLImageElement | HTMLVideoElement | null>(null)
  useEffect(() => {
    if (!url) return
    if (kind === 'video') {
      const video = document.createElement('video')
      video.src = url
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.addEventListener('loadeddata', () => {
        setMedia(video)
        void video.play().catch(() => undefined)
      })
      return () => {
        video.pause()
        video.removeAttribute('src')
      }
    }
    const image = new window.Image()
    image.onload = () => setMedia(image)
    image.src = url
    return () => {
      image.onload = null
    }
  }, [url, kind])
  return media
}

function MediaNode({ item }: { item: SceneItemDto }) {
  const assetId = typeof item.data.assetId === 'string' ? item.data.assetId : null
  const media = useMedia(assetId ? `/api/assets/${assetId}` : null, item.kind === 'video' ? 'video' : 'image')
  const ref = useRef<Konva.Image>(null)
  useEffect(() => {
    if (item.kind !== 'video' || !media || !ref.current) return
    const layer = ref.current.getLayer()
    let frame = 0
    const tick = () => {
      layer?.batchDraw()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [media, item.kind])
  if (!media) return <Rect width={item.width} height={item.height} fill="#283b34" stroke="#5d7a6b" dash={[8, 8]} />
  return <KonvaImage ref={ref} image={media} width={item.width} height={item.height} />
}

function TokenNode({ item }: { item: SceneItemDto }) {
  const name = String(item.data.name ?? '')
  const color = String(item.data.color ?? '#c58b3a')
  const assetId = typeof item.data.assetId === 'string' ? item.data.assetId : null
  const image = useMedia(assetId ? `/api/assets/${assetId}` : null, 'image')
  const r = Math.min(item.width, item.height) / 2
  return (
    <>
      <Circle x={r} y={r} radius={r - 2} fill={color} shadowColor="#000" shadowBlur={8} shadowOpacity={0.5} perfectDrawEnabled={false} />
      {image ? (
        <Group clipFunc={(ctx) => ctx.arc(r, r, r - 5, 0, Math.PI * 2)}>
          <KonvaImage image={image} width={item.width} height={item.height} />
        </Group>
      ) : (
        <Text
          text={initials(name)}
          width={r * 2}
          height={r * 2}
          align="center"
          verticalAlign="middle"
          fontFamily="Alegreya"
          fontStyle="bold"
          fontSize={r * 0.8}
          fill="#101a16"
        />
      )}
      <Circle x={r} y={r} radius={r - 2} stroke="#ece4d4" strokeWidth={3} />
      {name && (
        <Label x={r} y={r * 2 + 4}>
          <Tag fill="#101a16" opacity={0.85} cornerRadius={4} pointerDirection="up" pointerWidth={0} pointerHeight={0} />
          <Text text={name} fontFamily="Alegreya Sans" fontSize={14} padding={4} fill="#ece4d4" offsetX={0} />
        </Label>
      )}
    </>
  )
}

function TemplateNode({ item, grid, scale }: { item: SceneItemDto; grid: Grid; scale: SceneWithItemsDto['settings']['scale'] }) {
  const kind = (item.data.template as TemplateKind) ?? 'sphere'
  const color = String(item.data.color ?? '#d6a446')
  const shape = templateShape(
    { kind, origin: { x: 0, y: 0 }, angle: Number(item.data.angle ?? 0), size: Number(item.data.size ?? 15) },
    grid,
    scale
  )
  const common = { fill: color, opacity: 0.28, stroke: color, strokeWidth: 3 }
  return shape.type === 'circle' ? (
    <Circle x={0} y={0} radius={shape.radius} {...common} />
  ) : (
    <Line points={shape.points.flatMap((p) => [p.x, p.y])} closed {...common} />
  )
}

function ItemBody({ item, grid, scene }: { item: SceneItemDto; grid: Grid; scene: SceneWithItemsDto }) {
  const stroke = String(item.data.stroke ?? '#e07a66')
  const strokeWidth = Number(item.data.strokeWidth ?? 4)
  const fill = String(item.data.fill ?? '#00000000')
  switch (item.kind) {
    case 'image':
    case 'video':
      return <MediaNode item={item} />
    case 'drawing':
      return (
        <Line
          points={(item.data.points as number[]) ?? []}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          hitStrokeWidth={16}
        />
      )
    case 'rect':
      return <Rect width={item.width} height={item.height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
    case 'ellipse':
      return (
        <Ellipse
          x={item.width / 2}
          y={item.height / 2}
          radiusX={item.width / 2}
          radiusY={item.height / 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
        />
      )
    case 'line': {
      const dx = Number(item.data.dx ?? item.width)
      const dy = Number(item.data.dy ?? 0)
      return <Line points={[0, 0, dx, dy]} stroke={stroke} strokeWidth={strokeWidth} lineCap="round" hitStrokeWidth={16} />
    }
    case 'text':
      return (
        <Text
          text={String(item.data.text ?? '')}
          width={item.width}
          fontFamily="Alegreya"
          fontSize={Number(item.data.fontSize ?? 28)}
          fill={String(item.data.color ?? '#ece4d4')}
          shadowColor="#000"
          shadowBlur={4}
        />
      )
    case 'marker': {
      const label = String(item.data.label ?? '')
      return (
        <>
          <Circle
            x={item.width / 2}
            y={item.height / 2}
            radius={item.width / 3}
            fill={String(item.data.color ?? '#c5523f')}
            stroke="#ece4d4"
            strokeWidth={3}
          />
          <Text
            text={label.slice(0, 2)}
            width={item.width}
            height={item.height}
            align="center"
            verticalAlign="middle"
            fontFamily="Alegreya"
            fontStyle="bold"
            fontSize={item.width / 3}
            fill="#ece4d4"
          />
        </>
      )
    }
    case 'token':
      return <TokenNode item={item} />
    case 'template':
      return <TemplateNode item={item} grid={grid} scale={scene.settings.scale} />
    case 'wall': {
      const type = wallType(item)
      const points = wallPoints({ ...item, x: 0, y: 0 }).flatMap((p) => [p.x, p.y])
      const open = type === 'door' && doorState(item) === 'open'
      return (
        <Line
          points={points}
          stroke={WALL_COLORS[type]}
          strokeWidth={type === 'door' ? 8 : 5}
          dash={type === 'window' ? [14, 8] : open ? [4, 10] : undefined}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={18}
          shadowColor="#000"
          shadowBlur={4}
        />
      )
    }
    case 'light': {
      const r = item.width / 2
      return (
        <>
          <Circle x={r} y={r} radius={r} fill="#101a16" opacity={0.75} />
          <Circle x={r} y={r} radius={r * 0.45} fill={String(item.data.color ?? '#ffd27a')} shadowColor="#ffd27a" shadowBlur={12} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return (
              <Line
                key={i}
                points={[r + Math.cos(a) * r * 0.6, r + Math.sin(a) * r * 0.6, r + Math.cos(a) * r * 0.9, r + Math.sin(a) * r * 0.9]}
                stroke="#ffd27a"
                strokeWidth={2.5}
                lineCap="round"
              />
            )
          })}
        </>
      )
    }
  }
}

type Raw = { _context: CanvasRenderingContext2D }

function FogShape({ vision, preview }: { vision: VisionState; preview: boolean }) {
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      opacity={preview ? 0.82 : 1}
      sceneFunc={(context) => {
        const ctx = (context as unknown as Raw)._context
        const { bounds, cell, viewers, lights, ambient, explored } = vision
        const pad = Math.max(bounds.width, bounds.height) * 4
        const fill = (alpha: number) => {
          ctx.fillStyle = `rgba(0,0,0,${alpha})`
          ctx.fill()
        }
        const polygon = (points: Point[]) => {
          ctx.beginPath()
          points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
          ctx.closePath()
        }
        ctx.save()
        ctx.fillStyle = '#05080a'
        ctx.fillRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2)
        ctx.globalCompositeOperation = 'destination-out'
        if (explored) {
          const step = cell / 2
          ctx.fillStyle = 'rgba(0,0,0,0.42)'
          for (let r = 0; r < explored.rows; r++) {
            let start = -1
            for (let c = 0; c <= explored.cols; c++) {
              const on = c < explored.cols && hasBit(explored.bits, r * explored.cols + c)
              if (on && start < 0) start = c
              if (!on && start >= 0) {
                ctx.fillRect(start * step, r * step, (c - start) * step, step)
                start = -1
              }
            }
          }
        }
        for (const viewer of viewers) {
          ctx.save()
          polygon(viewer.polygon)
          ctx.clip()
          if (ambient === 'bright') {
            ctx.fillStyle = '#000'
            ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
          } else {
            if (ambient === 'dim') {
              ctx.fillStyle = 'rgba(0,0,0,0.62)'
              ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
            }
            for (const light of lights) {
              const outer = Math.max(light.bright, light.dim)
              if (outer <= 0) continue
              ctx.save()
              polygon(light.polygon)
              ctx.clip()
              const gradient = ctx.createRadialGradient(light.center.x, light.center.y, 0, light.center.x, light.center.y, outer)
              const edge = Math.min(0.999, light.bright / outer)
              gradient.addColorStop(0, 'rgba(0,0,0,1)')
              gradient.addColorStop(edge, 'rgba(0,0,0,1)')
              gradient.addColorStop(Math.min(1, edge + 0.001), 'rgba(0,0,0,0.62)')
              gradient.addColorStop(1, 'rgba(0,0,0,0.55)')
              ctx.fillStyle = gradient
              ctx.beginPath()
              ctx.arc(light.center.x, light.center.y, outer, 0, Math.PI * 2)
              ctx.fill()
              ctx.restore()
            }
            if (viewer.darkvision > 0) {
              ctx.beginPath()
              ctx.arc(viewer.center.x, viewer.center.y, viewer.darkvision, 0, Math.PI * 2)
              fill(0.6)
            }
          }
          ctx.restore()
        }
        ctx.restore()
      }}
    />
  )
}

function DoorHandle({ item, onToggle }: { item: SceneItemDto; onToggle: () => void }) {
  const points = wallPoints(item)
  if (points.length < 2) return null
  const a = points[0]!
  const b = points[points.length - 1]!
  const state = doorState(item)
  const color = state === 'open' ? '#7fb487' : state === 'locked' ? '#c5523f' : '#c58b3a'
  return (
    <Group
      x={(a.x + b.x) / 2}
      y={(a.y + b.y) / 2}
      onPointerDown={(event) => (event.cancelBubble = true)}
      onPointerUp={(event) => {
        event.cancelBubble = true
        onToggle()
      }}
      onMouseEnter={(event) => {
        const container = event.target.getStage()?.container()
        if (container) container.style.cursor = 'pointer'
      }}
      onMouseLeave={(event) => {
        const container = event.target.getStage()?.container()
        if (container) container.style.cursor = ''
      }}
    >
      <Circle radius={15} fill="#101a16" stroke={color} strokeWidth={3} />
      <Rect
        x={-6}
        y={-8}
        width={12}
        height={16}
        cornerRadius={2}
        stroke={color}
        strokeWidth={2.5}
        fill={state === 'open' ? undefined : color}
      />
      {state === 'locked' && <Circle x={0} y={1} radius={2} fill="#101a16" />}
    </Group>
  )
}

function GridShape({ grid, cols, rows, color, opacity }: { grid: Grid; cols: number; rows: number; color: string; opacity: number }) {
  if (grid.type === 'none') return null
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      opacity={opacity}
      sceneFunc={(ctx, shape) => {
        ctx.beginPath()
        const width = cols * grid.size
        const height = rows * grid.size
        if (grid.type === 'square') {
          for (let c = 0; c <= cols; c++) {
            const x = grid.offsetX + c * grid.size
            ctx.moveTo(x, grid.offsetY)
            ctx.lineTo(x, grid.offsetY + height)
          }
          for (let r = 0; r <= rows; r++) {
            const y = grid.offsetY + r * grid.size
            ctx.moveTo(grid.offsetX, y)
            ctx.lineTo(grid.offsetX + width, y)
          }
        } else {
          const hexRows = Math.ceil(height / (grid.size * 0.866))
          for (let r = 0; r <= hexRows; r++) {
            for (let c = -Math.ceil(r / 2); c <= cols; c++) {
              const center = hexToPixel({ q: c, r }, grid)
              if (center.x < grid.offsetX - grid.size || center.x > grid.offsetX + width + grid.size) continue
              const corners = hexCorners(center, grid.size)
              ctx.moveTo(corners[0]!.x, corners[0]!.y)
              for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y)
              ctx.closePath()
            }
          }
        }
        ctx.strokeShape(shape)
      }}
      stroke={color}
      strokeWidth={1.5}
    />
  )
}

type Draft =
  | { kind: 'brush'; points: Point[] }
  | { kind: 'rect' | 'ellipse' | 'line' | 'ruler' | 'template' | 'calibrate'; from: Point; to: Point }
  | { kind: 'wall'; points: Point[]; hover: Point }
  | null

export function TableCanvas(props: CanvasProps) {
  const { scene, gm, me, tool, layer, visibleLayers, selectedId, style, template, view, onView, onSelect, onCreate, onUpdate, vision } =
    props
  const container = useRef<HTMLDivElement>(null)
  const stage = useRef<Konva.Stage>(null)
  const transformer = useRef<Konva.Transformer>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [draft, setDraft] = useState<Draft>(null)
  const [spacePan, setSpacePan] = useState(false)
  const { settings } = scene
  const grid: Grid = useMemo(
    () => ({ type: settings.grid.type, size: settings.grid.size, offsetX: settings.grid.offsetX, offsetY: settings.grid.offsetY }),
    [settings.grid]
  )
  const pattern = useMemo(() => texture(settings.background.texture, settings.background.color), [settings.background])
  const selected = scene.items.find((item) => item.id === selectedId) ?? null

  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry?.contentRect ?? { width: 0, height: 0 }
      if (width >= 1 && height >= 1) setSize({ width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = selectedId ? stage.current?.findOne(`#item-${selectedId}`) : null
    transformer.current?.nodes(node && selected && canEdit(selected, gm, me) && tool === 'select' ? [node] : [])
    transformer.current?.getLayer()?.batchDraw()
  }, [selectedId, selected, gm, me, tool, scene.items])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement))
        setSpacePan(true)
    }
    const up = (event: KeyboardEvent) => event.code === 'Space' && setSpacePan(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const finishWall = (points: Point[]) => {
    setDraft(null)
    const item = wallItem(points, props.wallType)
    if (item) onCreate(item)
  }
  const finishRef = useRef(finishWall)
  useEffect(() => {
    finishRef.current = finishWall
  })

  useEffect(() => {
    if (draft?.kind !== 'wall') return
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setDraft(null)
      } else if (event.key === 'Enter') finishRef.current(draft.points)
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [draft])

  useEffect(() => {
    if (tool !== 'wall') setDraft((current) => (current?.kind === 'wall' ? null : current))
  }, [tool])

  const corner = (p: Point, free: boolean) => (free || grid.type === 'none' ? p : snap(p, { ...grid, type: 'square' }, 2))

  const pointer = (): Point => stage.current?.getRelativePointerPosition() ?? { x: 0, y: 0 }
  const panning = tool === 'pan' || spacePan

  const onDown = (event: Konva.KonvaEventObject<PointerEvent>) => {
    if (panning || event.evt.button === 1) return
    const p = pointer()
    if (tool === 'select') {
      if (event.target === stage.current || event.target.name() === 'background') onSelect(null)
      return
    }
    if (tool === 'brush') setDraft({ kind: 'brush', points: [p] })
    else if (tool === 'rect' || tool === 'ellipse' || tool === 'line' || tool === 'ruler' || tool === 'template' || tool === 'calibrate')
      setDraft({ kind: tool, from: tool === 'template' ? snap(p, grid, 2) : p, to: p })
  }

  const onMove = (event: Konva.KonvaEventObject<PointerEvent>) => {
    if (!draft) return
    const p = pointer()
    if (draft.kind === 'wall') setDraft({ ...draft, hover: corner(p, event.evt.altKey) })
    else if (draft.kind === 'brush') setDraft({ kind: 'brush', points: [...draft.points, p] })
    else setDraft({ ...draft, to: p })
  }

  const onUp = (event: Konva.KonvaEventObject<PointerEvent>) => {
    if (panning || event.evt.button === 1) return
    const p = pointer()
    if (tool === 'wall') {
      const at = corner(p, event.evt.altKey)
      const points = draft?.kind === 'wall' ? draft.points : []
      const first = points[0]
      if (first && points.length > 2 && Math.hypot(first.x - at.x, first.y - at.y) < grid.size / 4) return finishWall([...points, first])
      const last = points[points.length - 1]
      const next = last && last.x === at.x && last.y === at.y ? points : [...points, at]
      if (props.wallType !== 'wall' && next.length === 2) return finishWall(next)
      setDraft({ kind: 'wall', points: next, hover: at })
      return
    }
    if (tool === 'light') {
      onCreate(lightItem(grid.type === 'none' || event.evt.altKey ? p : snap(p, grid, 1), props.lightPreset))
      return
    }
    if (!draft) {
      if (tool === 'text' || tool === 'token' || tool === 'marker') props.onPlace(tool, p)
      return
    }
    if (draft.kind === 'wall') return
    setDraft(null)
    if (draft.kind === 'brush') {
      const item = drawingItem(draft.points, layer, style)
      if (item) onCreate(item)
    } else if (draft.kind === 'rect' || draft.kind === 'ellipse' || draft.kind === 'line') {
      const item = shapeItem(draft.kind, draft.from, draft.to, layer, style)
      if (item) onCreate(item)
    } else if (draft.kind === 'template') {
      onCreate(templateItem(template.kind, draft.from, draft.to, template.size, layer === 'map' ? 'objects' : layer, style.stroke))
    } else if (draft.kind === 'calibrate') {
      props.onCalibrate(normalizeRect(draft.from, draft.to))
    }
  }

  const pinch = useRef<{ distance: number; center: Point } | null>(null)
  const onTouchMove = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const [a, b] = Array.from(event.evt.touches)
    if (!a || !b) return
    event.evt.preventDefault()
    setDraft(null)
    const rect = container.current?.getBoundingClientRect()
    const center = { x: (a.clientX + b.clientX) / 2 - (rect?.left ?? 0), y: (a.clientY + b.clientY) / 2 - (rect?.top ?? 0) }
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const last = pinch.current
    pinch.current = { distance, center }
    if (!last) return
    const next = Math.min(4, Math.max(0.15, view.scale * (distance / last.distance)))
    const world = { x: (last.center.x - view.x) / view.scale, y: (last.center.y - view.y) / view.scale }
    onView({ scale: next, x: center.x - world.x * next, y: center.y - world.y * next })
  }

  const onWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const node = stage.current
    if (!node) return
    const old = view.scale
    const at = node.getPointerPosition() ?? { x: size.width / 2, y: size.height / 2 }
    const next = Math.min(4, Math.max(0.15, old * (event.evt.deltaY > 0 ? 0.9 : 1.1)))
    const world = { x: (at.x - view.x) / old, y: (at.y - view.y) / old }
    onView({ scale: next, x: at.x - world.x * next, y: at.y - world.y * next })
  }

  const width = settings.width * settings.grid.size
  const height = settings.height * settings.grid.size
  const visibleItems = (target: SceneLayer) => scene.items.filter((item) => item.layer === target)

  const shown = (item: SceneItemDto) => {
    if (!gm && (item.kind === 'wall' || item.kind === 'light')) return false
    if (vision?.active && item.kind === 'token' && !vision.visibleTokens.has(item.id)) return false
    if (vision?.active && (item.kind === 'wall' || item.kind === 'light')) return false
    return true
  }

  const renderItem = (item: SceneItemDto) => {
    if (!shown(item)) return null
    const editable = canEdit(item, gm, me)
    const draggable = editable && tool === 'select' && !item.locked
    const isTemplate = item.kind === 'template'
    return (
      <Group
        key={item.id}
        id={`item-${item.id}`}
        x={item.x}
        y={item.y}
        rotation={isTemplate ? 0 : item.rotation}
        opacity={item.layer === 'gm' ? 0.65 : 1}
        draggable={draggable}
        onPointerDown={(event) => {
          if (tool !== 'select') return
          event.cancelBubble = true
          onSelect(item.id)
        }}
        onDragEnd={(event) => {
          const node = event.target
          let next = { x: node.x(), y: node.y() }
          if (item.kind === 'token' && !event.evt.altKey) {
            const span = Math.max(1, Math.round(item.width / grid.size))
            const center = snap({ x: next.x + item.width / 2, y: next.y + item.height / 2 }, grid, span)
            next = { x: center.x - item.width / 2, y: center.y - item.height / 2 }
            node.position(next)
          }
          if (item.kind === 'token' && !gm && vision) {
            const from = { x: item.x + item.width / 2, y: item.y + item.height / 2 }
            const to = { x: next.x + item.width / 2, y: next.y + item.height / 2 }
            if (pathBlocked(from, to, vision.moveSegments)) {
              node.position({ x: item.x, y: item.y })
              props.onBlocked()
              return
            }
          }
          onUpdate(item.id, next)
        }}
        onTransformEnd={(event) => {
          const node = event.target
          const sx = Math.abs(node.scaleX())
          const sy = Math.abs(node.scaleY())
          node.scale({ x: 1, y: 1 })
          onUpdate(item.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(4, item.width * sx),
            height: Math.max(4, item.height * sy),
            rotation: Math.round(node.rotation() * 10) / 10
          })
        }}
      >
        <Group x={item.flipX ? item.width : 0} y={item.flipY ? item.height : 0} scaleX={item.flipX ? -1 : 1} scaleY={item.flipY ? -1 : 1}>
          <ItemBody item={item} grid={grid} scene={scene} />
        </Group>
      </Group>
    )
  }

  const ruler =
    draft?.kind === 'ruler' ? measure(snap(draft.from, grid), snap(draft.to, grid), grid, settings.scale, settings.diagonal) : null
  const resizable = selected && !['template', 'line', 'drawing', 'marker', 'wall', 'light'].includes(selected.kind)
  const doors = scene.items.filter((item) => item.kind === 'wall' && wallType(item) === 'door')

  return (
    <div
      ref={container}
      className="relative h-full w-full touch-none overflow-hidden bg-[#0b120f]"
      style={{ cursor: panning ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
      onDragOver={(event) => {
        if (gm && event.dataTransfer.types.includes('Files')) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!gm || event.dataTransfer.files.length === 0) return
        event.preventDefault()
        const rect = container.current!.getBoundingClientRect()
        const point = { x: (event.clientX - rect.left - view.x) / view.scale, y: (event.clientY - rect.top - view.y) / view.scale }
        props.onDropFiles([...event.dataTransfer.files], point)
      }}
    >
      <Stage
        ref={stage}
        width={size.width}
        height={size.height}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        draggable={panning}
        onDragEnd={(event) => event.target === stage.current && onView({ ...view, x: event.target.x(), y: event.target.y() })}
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDblClick={() => draft?.kind === 'wall' && finishWall(draft.points)}
        onTouchMove={onTouchMove}
        onTouchEnd={() => (pinch.current = null)}
      >
        <Layer>
          <Rect
            name="background"
            x={0}
            y={0}
            width={width}
            height={height}
            fill={settings.background.color}
            fillPatternImage={(pattern ?? undefined) as HTMLImageElement | undefined}
            fillPatternRepeat="repeat"
            fillPriority={pattern ? 'pattern' : 'color'}
          />
          {visibleLayers.map && visibleItems('map').map(renderItem)}
          <GridShape grid={grid} cols={settings.width} rows={settings.height} color={settings.grid.color} opacity={settings.grid.opacity} />
        </Layer>
        {LAYER_ORDER.slice(1).map((target) =>
          visibleLayers[target] && (target !== 'gm' || gm) ? <Layer key={target}>{visibleItems(target).map(renderItem)}</Layer> : null
        )}
        {doors.length > 0 && (
          <Layer>
            {doors.map((door) => (
              <DoorHandle
                key={door.id}
                item={door}
                onToggle={() => tool === 'select' && props.onDoor(door.id, doorState(door) === 'open' ? 'closed' : 'open')}
              />
            ))}
          </Layer>
        )}
        {vision?.active && (
          <Layer listening={false}>
            <FogShape vision={vision} preview={gm} />
          </Layer>
        )}
        <Layer>
          <Transformer
            ref={transformer}
            rotateEnabled={!['token', 'wall', 'light'].includes(selected?.kind ?? '')}
            resizeEnabled={Boolean(resizable)}
            keepRatio={selected?.kind === 'token'}
            shiftBehavior="default"
            anchorStroke="#d6a446"
            anchorFill="#101a16"
            borderStroke="#d6a446"
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          />
          {draft?.kind === 'brush' && (
            <Line
              points={draft.points.flatMap((p) => [p.x, p.y])}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              lineCap="round"
              tension={0.4}
            />
          )}
          {draft && (draft.kind === 'rect' || draft.kind === 'calibrate') && (
            <Rect
              {...normalizeRect(draft.from, draft.to)}
              stroke={draft.kind === 'calibrate' ? '#7fb487' : style.stroke}
              strokeWidth={2 / view.scale}
              dash={draft.kind === 'calibrate' ? [6, 4] : undefined}
            />
          )}
          {draft?.kind === 'ellipse' && (
            <Ellipse
              x={(draft.from.x + draft.to.x) / 2}
              y={(draft.from.y + draft.to.y) / 2}
              radiusX={Math.abs(draft.to.x - draft.from.x) / 2}
              radiusY={Math.abs(draft.to.y - draft.from.y) / 2}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
            />
          )}
          {draft?.kind === 'line' && (
            <Line points={[draft.from.x, draft.from.y, draft.to.x, draft.to.y]} stroke={style.stroke} strokeWidth={style.strokeWidth} />
          )}
          {draft?.kind === 'template' && (
            <Group x={draft.from.x} y={draft.from.y}>
              <TemplateNode
                item={{
                  ...({} as SceneItemDto),
                  data: {
                    template: template.kind,
                    size: template.size,
                    angle: Math.atan2(draft.to.y - draft.from.y, draft.to.x - draft.from.x),
                    color: style.stroke
                  }
                }}
                grid={grid}
                scale={settings.scale}
              />
            </Group>
          )}
          {draft?.kind === 'wall' && (
            <>
              <Line
                points={[...draft.points, draft.hover].flatMap((p) => [p.x, p.y])}
                stroke={WALL_COLORS[props.wallType]}
                strokeWidth={5 / view.scale}
                dash={[10 / view.scale, 6 / view.scale]}
                lineCap="round"
              />
              {draft.points.map((p, i) => (
                <Circle key={i} x={p.x} y={p.y} radius={6 / view.scale} fill={WALL_COLORS[props.wallType]} />
              ))}
            </>
          )}
          {ruler && draft?.kind === 'ruler' && (
            <>
              <Line
                points={[snap(draft.from, grid).x, snap(draft.from, grid).y, snap(draft.to, grid).x, snap(draft.to, grid).y]}
                stroke="#d6a446"
                strokeWidth={4 / view.scale}
                dash={[12, 6]}
              />
              <Label x={draft.to.x + 12 / view.scale} y={draft.to.y + 12 / view.scale} scaleX={1 / view.scale} scaleY={1 / view.scale}>
                <Tag fill="#101a16" stroke="#d6a446" cornerRadius={6} />
                <Text
                  text={`${ruler.label} · ${ruler.cells} ${ruler.cells === 1 ? 'quadrado' : 'quadrados'}`}
                  padding={8}
                  fontFamily="Alegreya Sans"
                  fontSize={16}
                  fill="#ece4d4"
                />
              </Label>
            </>
          )}
        </Layer>
      </Stage>
    </div>
  )
}
