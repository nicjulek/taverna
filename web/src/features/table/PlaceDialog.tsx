import type { CharacterSummaryDto } from '@taverna/shared'
import { ImagePlus, X } from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { Button, Dialog, DialogContent, Field, Input, Select } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCompendiumSearch } from '../compendium/hooks'
import { useAssets } from './hooks'
import { useUploadFiles } from './upload'

function TokenArt({ campaignId, value, onChange }: { campaignId: string; value: string | null; onChange: (id: string | null) => void }) {
  const assets = useAssets(campaignId)
  const upload = useUploadFiles(campaignId, 'token')
  const input = useRef<HTMLInputElement>(null)
  const tokens = (assets.data ?? []).filter((asset) => asset.kind === 'token' && asset.mime.startsWith('image/'))
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm text-moss">Imagem do token</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cn(
            'grid size-14 place-items-center rounded-full border-2 text-xs text-moss',
            value === null ? 'border-brass' : 'border-line hover:border-moss-dim'
          )}
        >
          Iniciais
        </button>
        {tokens.map((token) => (
          <button
            key={token.id}
            type="button"
            aria-pressed={value === token.id}
            aria-label={token.name}
            onClick={() => onChange(token.id)}
            className={cn(
              'size-14 overflow-hidden rounded-full border-2',
              value === token.id ? 'border-brass' : 'border-line hover:border-moss-dim'
            )}
          >
            <img src={token.url} alt="" className="size-full object-cover" />
          </button>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-14 rounded-full"
          aria-label="Enviar imagem de token"
          loading={upload.pending}
          onClick={() => input.current?.click()}
        >
          <ImagePlus />
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ''
            const [sent] = await upload.run(files)
            if (sent) onChange(sent.id)
          }}
        />
      </div>
    </fieldset>
  )
}

const SPAN_BY_SIZE: Record<string, number> = { Large: 2, Huge: 3, Gargantuan: 4 }

function MonsterPicker({
  campaignId,
  onPick
}: {
  campaignId: string
  onPick: (monster: { id: string; name: string; span: number }) => void
}) {
  const [q, setQ] = useState('')
  const deferred = useDeferredValue(q.trim())
  const search = useCompendiumSearch(campaignId, { kind: 'monster', q: deferred || undefined })
  const results = deferred.length >= 2 ? (search.data?.pages[0]?.items ?? []).slice(0, 6) : []
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-moss">
        Criatura do compêndio
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Goblin, esqueleto, lobo…" />
      </label>
      {results.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Criaturas encontradas">
          {results.map((monster) => (
            <li key={monster.id}>
              <button
                type="button"
                onClick={() => {
                  onPick({ id: monster.id, name: monster.name, span: SPAN_BY_SIZE[String(monster.meta.size ?? '')] ?? 1 })
                  setQ('')
                }}
                className="flex w-full justify-between rounded-control px-2 py-1.5 text-left text-sm hover:bg-surface-raised"
              >
                <span>{monster.name}</span>
                <span className="text-moss-dim">ND {String(monster.meta.crLabel ?? monster.meta.cr ?? '?')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export type PlaceKind = 'text' | 'token' | 'marker'

export interface PlaceValues {
  text: string
  color: string
  span: number
  characterId: string | null
  compendiumId: string | null
  assetId: string | null
}

const TITLES: Record<PlaceKind, string> = { text: 'Escrever na mesa', token: 'Novo token', marker: 'Novo marcador' }
const NONE = '__nenhum'

interface PlaceDialogProps {
  campaignId: string
  gm: boolean
  kind: PlaceKind | null
  characters: CharacterSummaryDto[]
  color: string
  onCancel: () => void
  onConfirm: (values: PlaceValues) => void
}

export function PlaceDialog({ campaignId, gm, kind, characters, color, onCancel, onConfirm }: PlaceDialogProps) {
  const [values, setValues] = useState<PlaceValues>({ text: '', color, span: 1, characterId: null, compendiumId: null, assetId: null })
  useEffect(() => {
    if (kind)
      setValues({
        text: kind === 'marker' ? 'A' : '',
        color: kind === 'token' ? '#c58b3a' : color,
        span: 1,
        characterId: null,
        compendiumId: null,
        assetId: null
      })
  }, [kind, color])
  const label = kind === 'text' ? 'Texto' : kind === 'token' ? 'Nome do token' : 'Rótulo (até 2 letras aparecem no mapa)'

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent title={kind ? TITLES[kind] : ''}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (values.text.trim()) onConfirm({ ...values, text: values.text.trim() })
          }}
        >
          {kind === 'token' && characters.length > 0 && (
            <Select
              label="Ficha ligada"
              value={values.characterId ?? NONE}
              onChange={(id) => {
                const character = characters.find((c) => c.id === id)
                setValues((v) => ({
                  ...v,
                  characterId: character?.id ?? null,
                  text: character?.name ?? v.text,
                  color: character?.ownerColor ?? v.color
                }))
              }}
              options={[{ value: NONE, label: 'Nenhuma (criatura avulsa)' }, ...characters.map((c) => ({ value: c.id, label: c.name }))]}
            />
          )}
          {kind === 'token' && gm && !values.characterId && !values.compendiumId && (
            <MonsterPicker
              campaignId={campaignId}
              onPick={(monster) =>
                setValues((v) => ({ ...v, compendiumId: monster.id, text: monster.name, span: monster.span, color: '#8a3b2a' }))
              }
            />
          )}
          {values.compendiumId && (
            <p className="flex items-center justify-between rounded-control bg-surface-raised px-3 py-2 text-sm">
              <span>Com PV, CA, ataques e defesas do compêndio</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Não usar o compêndio"
                onClick={() => setValues((v) => ({ ...v, compendiumId: null }))}
              >
                <X />
              </Button>
            </p>
          )}
          <Field label={label}>
            {(props) => (
              <Input
                {...props}
                autoFocus
                value={values.text}
                maxLength={kind === 'text' ? 200 : 40}
                onChange={(e) => setValues((v) => ({ ...v, text: e.target.value }))}
              />
            )}
          </Field>
          {kind === 'token' && (
            <TokenArt campaignId={campaignId} value={values.assetId} onChange={(assetId) => setValues((v) => ({ ...v, assetId }))} />
          )}
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-moss">
              Cor
              <input
                type="color"
                value={values.color}
                onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))}
                className="h-9 w-12 rounded"
              />
            </label>
            {kind === 'token' && (
              <Select
                label="Tamanho"
                value={String(values.span)}
                onChange={(span) => setValues((v) => ({ ...v, span: Number(span) }))}
                options={[
                  { value: '1', label: 'Médio ou menor (1 quadrado)' },
                  { value: '2', label: 'Grande (2 × 2)' },
                  { value: '3', label: 'Enorme (3 × 3)' },
                  { value: '4', label: 'Imenso (4 × 4)' }
                ]}
                className="min-w-56"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!values.text.trim()}>
              Colocar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
