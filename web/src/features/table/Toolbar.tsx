import { SCENE_LAYER_LABELS, SCENE_LAYERS, type SceneLayer } from '@taverna/shared'
import type { TemplateKind } from '@taverna/tabletop'
import {
  Brush,
  Circle,
  Crosshair,
  Eye,
  EyeOff,
  Hand,
  ImagePlus,
  MapPin,
  Minus,
  MousePointer2,
  Ruler,
  Square,
  Triangle,
  Type,
  UserRound,
  type LucideIcon
} from 'lucide-react'
import { Select } from '@/components/ui'
import { cn } from '@/lib/cn'
import { type DrawStyle, PLAYER_TOOLS, type Tool, TOOL_LABELS } from './items'

const ICONS: Record<Tool, LucideIcon> = {
  select: MousePointer2,
  pan: Hand,
  brush: Brush,
  rect: Square,
  ellipse: Circle,
  line: Minus,
  text: Type,
  marker: MapPin,
  ruler: Ruler,
  template: Triangle,
  token: UserRound,
  calibrate: Crosshair
}

const TEMPLATE_LABELS: Record<TemplateKind, string> = { cone: 'Cone', sphere: 'Esfera', cylinder: 'Cilindro', line: 'Linha', cube: 'Cubo' }
const COLORS = ['#e07a66', '#d6a446', '#7fb487', '#6fa8dc', '#ece4d4', '#101a16']

interface ToolbarProps {
  gm: boolean
  tool: Tool
  onTool: (tool: Tool) => void
  layer: SceneLayer
  onLayer: (layer: SceneLayer) => void
  visibleLayers: Record<SceneLayer, boolean>
  onToggleLayer: (layer: SceneLayer) => void
  style: DrawStyle
  onStyle: (style: DrawStyle) => void
  template: { kind: TemplateKind; size: number }
  onTemplate: (template: { kind: TemplateKind; size: number }) => void
  unit: string
  onGallery: () => void
}

export function Toolbar(props: ToolbarProps) {
  const { gm, tool, onTool, layer, onLayer, style, onStyle, template, onTemplate } = props
  const tools = gm ? (Object.keys(TOOL_LABELS) as Tool[]) : PLAYER_TOOLS
  const layers = gm ? SCENE_LAYERS : (['objects', 'tokens'] as const)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-panel border border-line bg-surface/80 p-2">
      <div role="toolbar" aria-label="Ferramentas da mesa" className="flex flex-wrap gap-1">
        {tools.map((key) => {
          const Icon = ICONS[key]
          return (
            <button
              key={key}
              type="button"
              aria-pressed={tool === key}
              aria-label={TOOL_LABELS[key]}
              title={TOOL_LABELS[key]}
              onClick={() => onTool(key)}
              className={cn(
                'grid size-9 place-items-center rounded-control text-moss hover:bg-surface-raised hover:text-bone pointer-coarse:size-11',
                tool === key && 'bg-brass/20 text-brass-bright ring-1 ring-brass/60'
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
            </button>
          )
        })}
        {gm && (
          <button
            type="button"
            aria-label="Galeria de mapas"
            title="Galeria de mapas"
            onClick={props.onGallery}
            className="grid size-9 place-items-center rounded-control text-moss hover:bg-surface-raised hover:text-bone pointer-coarse:size-11"
          >
            <ImagePlus className="size-[18px]" aria-hidden />
          </button>
        )}
      </div>

      <div className="mx-1 h-7 w-px bg-line max-sm:hidden" aria-hidden />

      <Select<SceneLayer>
        label="Camada para desenhar"
        size="sm"
        value={layers.includes(layer as never) ? layer : 'objects'}
        onChange={onLayer}
        options={layers.map((value) => ({ value, label: SCENE_LAYER_LABELS[value] }))}
        className="w-48"
      />
      {gm && (
        <div className="flex gap-0.5" role="group" aria-label="Camadas visíveis">
          {SCENE_LAYERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={props.visibleLayers[value]}
              onClick={() => props.onToggleLayer(value)}
              title={`${props.visibleLayers[value] ? 'Esconder' : 'Mostrar'} ${SCENE_LAYER_LABELS[value].toLowerCase()}`}
              className="flex items-center gap-1 rounded-control px-1.5 py-1 text-xs text-moss hover:text-bone"
            >
              {props.visibleLayers[value] ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
              {SCENE_LAYER_LABELS[value].split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1" role="group" aria-label="Cor do traço">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-pressed={style.stroke === color}
            aria-label={`Cor ${color}`}
            onClick={() => onStyle({ ...style, stroke: color })}
            className={cn('size-6 rounded-full border-2', style.stroke === color ? 'border-bone' : 'border-transparent')}
            style={{ background: color }}
          />
        ))}
      </div>

      {tool === 'template' && (
        <div className="flex items-center gap-2">
          <Select<TemplateKind>
            label="Tipo de molde"
            size="sm"
            value={template.kind}
            onChange={(kind) => onTemplate({ ...template, kind })}
            options={(Object.keys(TEMPLATE_LABELS) as TemplateKind[]).map((value) => ({ value, label: TEMPLATE_LABELS[value] }))}
            className="w-32"
          />
          <label className="flex items-center gap-1.5 text-sm text-moss">
            Tamanho
            <input
              type="number"
              min={1}
              max={500}
              value={template.size}
              onChange={(event) => onTemplate({ ...template, size: Math.max(1, Number(event.target.value) || 1) })}
              className="h-8 w-16 rounded-control border border-line-strong bg-felt-deep px-2 text-bone"
            />
            {props.unit}
          </label>
        </div>
      )}
    </div>
  )
}
