import type { SceneItemDto, SceneItemInput, SceneLayer, SceneWithItemsDto } from '@taverna/shared'
import {
  type Grid,
  hexCorners,
  hexToPixel,
  measure,
  normalizeRect,
  type Point,
  type Rect as Box,
  snap,
  type TemplateKind,
  templateShape
} from '@taverna/tabletop'
import type Konva from 'konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Ellipse, Group, Image as KonvaImage, Label, Layer, Line, Rect, Shape, Stage, Tag, Text, Transformer } from 'react-konva'
import { canEdit, type DrawStyle, drawingItem, initials, shapeItem, templateItem, type Tool } from './items'
import { texture } from './textures'

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
}

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
  }
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
  | null

export function TableCanvas(props: CanvasProps) {
  const { scene, gm, me, tool, layer, visibleLayers, selectedId, style, template, view, onView, onSelect, onCreate, onUpdate } = props
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

  const onMove = () => {
    if (!draft) return
    const p = pointer()
    if (draft.kind === 'brush') setDraft({ kind: 'brush', points: [...draft.points, p] })
    else setDraft({ ...draft, to: p })
  }

  const onUp = () => {
    if (panning) return
    const p = pointer()
    if (!draft) {
      if (tool === 'text' || tool === 'token' || tool === 'marker') props.onPlace(tool, p)
      return
    }
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

  const renderItem = (item: SceneItemDto) => {
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
  const resizable = selected && !['template', 'line', 'drawing', 'marker'].includes(selected.kind)

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
        <Layer>
          <Transformer
            ref={transformer}
            rotateEnabled={selected?.kind !== 'token'}
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
