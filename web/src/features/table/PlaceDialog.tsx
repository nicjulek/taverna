import type { CharacterSummaryDto } from '@taverna/shared'
import { useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, Field, Input, Select } from '@/components/ui'

export type PlaceKind = 'text' | 'token' | 'marker'

export interface PlaceValues {
  text: string
  color: string
  span: number
  characterId: string | null
}

const TITLES: Record<PlaceKind, string> = { text: 'Escrever na mesa', token: 'Novo token', marker: 'Novo marcador' }
const NONE = '__nenhum'

interface PlaceDialogProps {
  kind: PlaceKind | null
  characters: CharacterSummaryDto[]
  color: string
  onCancel: () => void
  onConfirm: (values: PlaceValues) => void
}

export function PlaceDialog({ kind, characters, color, onCancel, onConfirm }: PlaceDialogProps) {
  const [values, setValues] = useState<PlaceValues>({ text: '', color, span: 1, characterId: null })
  useEffect(() => {
    if (kind) setValues({ text: kind === 'marker' ? 'A' : '', color: kind === 'token' ? '#c58b3a' : color, span: 1, characterId: null })
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
