import {
  BACKGROUND_TEXTURE_LABELS,
  BACKGROUND_TEXTURES,
  SCENE_LAYER_LABELS,
  SCENE_LAYERS,
  type SceneItemDto,
  type SceneLayer,
  type SceneSettings,
  type SceneWithItemsDto
} from '@taverna/shared'
import { fitToSquares, squaresOf } from '@taverna/tabletop'
import { ArrowDownToLine, ArrowUpToLine, FlipHorizontal2, FlipVertical2, Lock, LockOpen, Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { canEdit } from './items'
import { useDraftValue } from './useDraftValue'

function ColorField({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [draft, change] = useDraftValue(value, onCommit)
  return (
    <label className="flex items-center gap-2 text-sm text-moss">
      {label}
      <input type="color" value={draft} onChange={(e) => change(e.target.value)} className="h-8 w-12 rounded" />
    </label>
  )
}

function TextField({
  label,
  value,
  onCommit,
  maxLength
}: {
  label: string
  value: string
  onCommit: (v: string) => void
  maxLength: number
}) {
  const [draft, change] = useDraftValue(value, onCommit)
  return <Input aria-label={label} value={draft} maxLength={maxLength} onChange={(e) => change(e.target.value)} />
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-line pb-3 last:border-0">
      <h3 className="text-sm font-medium text-moss">{title}</h3>
      {children}
    </section>
  )
}

function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1
}: {
  label: string
  value: number
  onCommit: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(Math.round(value * 100) / 100)), [value])
  const commit = () => {
    const parsed = Number(text.replace(',', '.'))
    if (!Number.isFinite(parsed)) return setText(String(value))
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed))
    if (clamped !== value) onCommit(clamped)
  }
  return (
    <label className="flex flex-col gap-1 text-xs text-moss">
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={text}
        step={step}
        min={min}
        max={max}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && commit()}
        className="h-8 w-full rounded-control border border-line-strong bg-felt-deep px-2 text-sm text-bone focus-visible:border-brass focus-visible:outline-none"
      />
    </label>
  )
}

interface ItemInspectorProps {
  item: SceneItemDto
  scene: SceneWithItemsDto
  gm: boolean
  me: string
  onUpdate: (patch: Partial<SceneItemDto>) => void
  onRemove: () => void
  onCalibrate: () => void
}

const KIND_LABELS: Record<SceneItemDto['kind'], string> = {
  image: 'Imagem',
  video: 'Vídeo',
  drawing: 'Desenho',
  rect: 'Retângulo',
  ellipse: 'Elipse',
  line: 'Linha',
  text: 'Texto',
  marker: 'Marcador',
  token: 'Token',
  template: 'Molde de área'
}

export function ItemInspector({ item, scene, gm, me, onUpdate, onRemove, onCalibrate }: ItemInspectorProps) {
  const editable = canEdit(item, gm, me)
  const grid = {
    type: scene.settings.grid.type,
    size: scene.settings.grid.size,
    offsetX: scene.settings.grid.offsetX,
    offsetY: scene.settings.grid.offsetY
  }
  const squares = squaresOf(item, grid)
  const [cols, setCols] = useState(String(squares.cols))
  const [rows, setRows] = useState(String(squares.rows))
  useEffect(() => {
    setCols(String(squares.cols))
    setRows(String(squares.rows))
  }, [squares.cols, squares.rows])
  const media = item.kind === 'image' || item.kind === 'video'
  const setData = (patch: Record<string, unknown>) => onUpdate({ data: { ...item.data, ...patch } })

  return (
    <div className="flex flex-col gap-3" aria-label="Item selecionado">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-moss">{KIND_LABELS[item.kind]}</p>
          <p className="font-display text-lg">
            {String(item.data.name ?? item.data.label ?? item.data.text ?? SCENE_LAYER_LABELS[item.layer]).slice(0, 40)}
          </p>
        </div>
        {editable && (
          <Button size="icon" variant="ghost" aria-label="Apagar item" onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>
      {!editable && <p className="text-sm text-moss">Só quem colocou ou o mestre mexe neste item.</p>}

      {editable && (
        <>
          {item.kind === 'token' && (
            <Section title="Token">
              <TextField label="Nome do token" value={String(item.data.name ?? '')} maxLength={40} onCommit={(name) => setData({ name })} />
              <ColorField label="Cor" value={String(item.data.color ?? '#c58b3a')} onCommit={(color) => setData({ color })} />
            </Section>
          )}
          {item.kind === 'text' && (
            <Section title="Texto">
              <TextField label="Texto" value={String(item.data.text ?? '')} maxLength={200} onCommit={(text) => setData({ text })} />
              <ColorField label="Cor" value={String(item.data.color ?? '#ece4d4')} onCommit={(color) => setData({ color })} />
              <NumberField
                label="Tamanho da letra"
                value={Number(item.data.fontSize ?? 28)}
                min={8}
                max={200}
                onCommit={(fontSize) => setData({ fontSize })}
              />
            </Section>
          )}
          {item.kind === 'marker' && (
            <Section title="Marcador">
              <TextField
                label="Rótulo do marcador"
                value={String(item.data.label ?? '')}
                maxLength={40}
                onCommit={(label) => setData({ label })}
              />
              <ColorField label="Cor" value={String(item.data.color ?? '#c5523f')} onCommit={(color) => setData({ color })} />
            </Section>
          )}
          {item.kind === 'template' && (
            <Section title="Molde de área">
              <NumberField
                label={`Tamanho (${scene.settings.scale.unit === 'm' ? 'metros' : 'pés'})`}
                value={Number(item.data.size ?? 15)}
                min={1}
                max={500}
                onCommit={(size) => setData({ size })}
              />
            </Section>
          )}

          {media && gm && (
            <Section title="Tamanho em quadrados">
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const c = Number(cols.replace(',', '.'))
                  const r = Number(rows.replace(',', '.'))
                  if (c > 0 && r > 0) onUpdate(fitToSquares(item, c, r, grid))
                }}
              >
                <label className="flex flex-1 flex-col gap-1 text-xs text-moss">
                  Largura
                  <Input
                    aria-label="Largura em quadrados"
                    value={cols}
                    inputMode="decimal"
                    onChange={(e) => setCols(e.target.value)}
                    className="h-8"
                  />
                </label>
                <span className="pb-1.5 text-moss" aria-hidden>
                  ×
                </span>
                <label className="flex flex-1 flex-col gap-1 text-xs text-moss">
                  Altura
                  <Input
                    aria-label="Altura em quadrados"
                    value={rows}
                    inputMode="decimal"
                    onChange={(e) => setRows(e.target.value)}
                    className="h-8"
                  />
                </label>
                <Button type="submit" size="sm" variant="secondary">
                  Encaixar
                </Button>
              </form>
              <Button size="sm" variant="ghost" onClick={onCalibrate} className="self-start">
                Calibrar pela grade da imagem
              </Button>
            </Section>
          )}

          {item.kind !== 'template' && (
            <Section title="Posição">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="X" value={item.x} onCommit={(x) => onUpdate({ x })} />
                <NumberField label="Y" value={item.y} onCommit={(y) => onUpdate({ y })} />
                {item.kind !== 'token' && (
                  <NumberField
                    label="Giro (graus)"
                    value={item.rotation}
                    min={-360}
                    max={360}
                    onCommit={(rotation) => onUpdate({ rotation })}
                  />
                )}
              </div>
              {media && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" aria-pressed={item.flipX} onClick={() => onUpdate({ flipX: !item.flipX })}>
                    <FlipHorizontal2 /> Espelhar
                  </Button>
                  <Button size="sm" variant="ghost" aria-pressed={item.flipY} onClick={() => onUpdate({ flipY: !item.flipY })}>
                    <FlipVertical2 /> Virar
                  </Button>
                </div>
              )}
            </Section>
          )}

          {gm && (
            <Section title="Camada e ordem">
              <Select<SceneLayer>
                label="Camada do item"
                size="sm"
                value={item.layer}
                onChange={(layer) => onUpdate({ layer })}
                options={SCENE_LAYERS.map((value) => ({ value, label: SCENE_LAYER_LABELS[value] }))}
              />
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => onUpdate({ z: Math.max(...scene.items.map((i) => i.z)) + 1 })}>
                  <ArrowUpToLine /> Para frente
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onUpdate({ z: Math.min(...scene.items.map((i) => i.z)) - 1 })}>
                  <ArrowDownToLine /> Para trás
                </Button>
                <Button size="sm" variant="ghost" aria-pressed={item.locked} onClick={() => onUpdate({ locked: !item.locked })}>
                  {item.locked ? <Lock /> : <LockOpen />} {item.locked ? 'Travado' : 'Travar'}
                </Button>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

export function SceneSettingsPanel({ settings, onChange }: { settings: SceneSettings; onChange: (settings: SceneSettings) => void }) {
  const set = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => onChange({ ...settings, [key]: value })
  return (
    <div className="flex flex-col gap-3" aria-label="Configurações da cena">
      <Section title="Grade">
        <Select
          label="Tipo de grade"
          size="sm"
          value={settings.grid.type}
          onChange={(type) => set('grid', { ...settings.grid, type })}
          options={[
            { value: 'square', label: 'Quadrada' },
            { value: 'hex', label: 'Hexagonal' },
            { value: 'none', label: 'Sem grade (teatro da mente)' }
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Tamanho da célula (px)"
            value={settings.grid.size}
            min={20}
            max={300}
            onCommit={(size) => set('grid', { ...settings.grid, size })}
          />
          <NumberField
            label="Opacidade"
            value={settings.grid.opacity}
            min={0}
            max={1}
            step={0.05}
            onCommit={(opacity) => set('grid', { ...settings.grid, opacity })}
          />
          <NumberField
            label="Deslocar X"
            value={settings.grid.offsetX}
            min={-300}
            max={300}
            onCommit={(offsetX) => set('grid', { ...settings.grid, offsetX })}
          />
          <NumberField
            label="Deslocar Y"
            value={settings.grid.offsetY}
            min={-300}
            max={300}
            onCommit={(offsetY) => set('grid', { ...settings.grid, offsetY })}
          />
        </div>
        <ColorField label="Cor da grade" value={settings.grid.color} onCommit={(color) => set('grid', { ...settings.grid, color })} />
      </Section>
      <Section title="Escala e régua">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Cada quadrado vale"
            value={settings.scale.value}
            min={0.1}
            max={1000}
            step={0.5}
            onCommit={(value) => set('scale', { ...settings.scale, value })}
          />
          <Select
            label="Unidade"
            size="sm"
            value={settings.scale.unit}
            onChange={(unit) => set('scale', { value: unit === 'm' ? 1.5 : 5, unit })}
            options={[
              { value: 'm', label: 'metros' },
              { value: 'ft', label: 'pés' }
            ]}
          />
        </div>
        <Select
          label="Diagonais"
          size="sm"
          value={settings.diagonal}
          onChange={(diagonal) => set('diagonal', diagonal)}
          options={[
            { value: 'equal', label: 'Diagonal vale 1 quadrado (5e)' },
            { value: 'alternate', label: 'Diagonais alternadas (5-10-5)' }
          ]}
        />
      </Section>
      <Section title="Tamanho e fundo">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Largura (quadrados)" value={settings.width} min={1} max={200} onCommit={(width) => set('width', width)} />
          <NumberField label="Altura (quadrados)" value={settings.height} min={1} max={200} onCommit={(height) => set('height', height)} />
        </div>
        <ColorField
          label="Cor de fundo"
          value={settings.background.color}
          onCommit={(color) => set('background', { ...settings.background, color })}
        />
        <Select
          label="Textura de fundo"
          size="sm"
          value={settings.background.texture}
          onChange={(texture) => set('background', { ...settings.background, texture })}
          options={BACKGROUND_TEXTURES.map((value) => ({ value, label: BACKGROUND_TEXTURE_LABELS[value] }))}
        />
      </Section>
    </div>
  )
}
