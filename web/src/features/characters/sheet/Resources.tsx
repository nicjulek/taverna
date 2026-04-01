import { classResources, type ResourceReset } from '@taverna/rules-5e'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { useSheet } from './sheet-context'
import { Pips } from './controls'

const RESET_LABEL: Record<ResourceReset, string> = {
  short: 'volta no descanso curto',
  long: 'volta no descanso longo',
  none: 'não volta sozinho'
}

export function ResourcesTab() {
  const { sheet, editable, change } = useSheet()
  const [name, setName] = useState('')
  const [max, setMax] = useState('3')
  const [reset, setReset] = useState<ResourceReset>('long')

  const suggestions = sheet.classes
    .flatMap((c) => classResources(c.key, c.level, sheet.abilities))
    .filter((preset) => !sheet.resources.some((r) => r.id === preset.key || r.name === preset.name))

  const setUsed = (id: string, used: number) =>
    change((s) => ({ ...s, resources: s.resources.map((r) => (r.id === id ? { ...r, used: Math.max(0, Math.min(r.max, used)) } : r)) }))

  return (
    <div className="flex flex-col gap-4">
      {sheet.resources.length === 0 && <p className="text-moss">Nenhum contador. Use para Ki, Fúria, cargas de itens ou o que precisar.</p>}
      <ul className="flex flex-col gap-3">
        {sheet.resources.map((resource) => (
          <li key={resource.id} className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-felt-deep/60 p-3">
            <div className="min-w-36 flex-1">
              <p className="font-medium">{resource.name}</p>
              <p className="text-sm text-moss-dim">{RESET_LABEL[resource.reset]}</p>
            </div>
            {resource.max <= 12 ? (
              <Pips
                total={resource.max}
                used={resource.used}
                label={resource.name}
                disabled={!editable}
                onChange={(used) => setUsed(resource.id, used)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!editable}
                  aria-label={`Gastar ${resource.name}`}
                  onClick={() => setUsed(resource.id, resource.used + 1)}
                >
                  <Minus />
                </Button>
                <span className="min-w-16 text-center font-display text-xl tabular-nums lining-nums" aria-live="polite">
                  {resource.max - resource.used}/{resource.max}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!editable}
                  aria-label={`Recuperar ${resource.name}`}
                  onClick={() => setUsed(resource.id, resource.used - 1)}
                >
                  <Plus />
                </Button>
              </div>
            )}
            {editable && (
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remover ${resource.name}`}
                onClick={() => change((s) => ({ ...s, resources: s.resources.filter((r) => r.id !== resource.id) }))}
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {editable && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-moss">Sugestões da classe:</span>
          {suggestions.map((preset) => (
            <Button
              key={preset.key}
              size="sm"
              variant="secondary"
              onClick={() =>
                change((s) => ({
                  ...s,
                  resources: [
                    ...s.resources,
                    { id: preset.key, name: preset.name, max: Math.min(99, preset.max), used: 0, reset: preset.reset }
                  ]
                }))
              }
            >
              <Plus /> {preset.name}
            </Button>
          ))}
        </div>
      )}

      {editable && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const total = Number.parseInt(max, 10)
            if (!name.trim() || !Number.isInteger(total) || total < 1) return
            change((s) => ({
              ...s,
              resources: [...s.resources, { id: crypto.randomUUID(), name: name.trim(), max: Math.min(99, total), used: 0, reset }]
            }))
            setName('')
          }}
        >
          <Input
            aria-label="Nome do contador"
            placeholder="Cargas da varinha"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Input aria-label="Máximo" type="number" min={1} max={99} value={max} onChange={(e) => setMax(e.target.value)} className="w-20" />
          <Select<ResourceReset>
            label="Quando volta"
            value={reset}
            onChange={setReset}
            options={[
              { value: 'short', label: 'Descanso curto' },
              { value: 'long', label: 'Descanso longo' },
              { value: 'none', label: 'Manual' }
            ]}
            className="w-40"
          />
          <Button type="submit" variant="secondary" disabled={!name.trim()}>
            <Plus /> Adicionar
          </Button>
        </form>
      )}
    </div>
  )
}
