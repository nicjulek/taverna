import { withMode } from '@taverna/rules-5e'
import { ROLL_VISIBILITIES, ROLL_VISIBILITY_LABELS, type RollVisibility } from '@taverna/shared'
import type { RollMode } from '@taverna/rules-core'
import { Minus, Plus, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { DieShape } from '@/components/art/DieShape'
import { Button, Field, Input, Select } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useRoll } from './hooks'
import { addDie, adjustModifier, currentModifier, describeRange, DIE_SIDES, preview } from './pool'

const MODES: { value: RollMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'advantage', label: 'Vantagem' },
  { value: 'disadvantage', label: 'Desvantagem' }
]

export function DiceRoller({ campaignId }: { campaignId: string }) {
  const [expression, setExpression] = useState('1d20')
  const [label, setLabel] = useState('')
  const [mode, setMode] = useState<RollMode>('normal')
  const [visibility, setVisibility] = useState<RollVisibility>('public')
  const roll = useRoll(campaignId)

  const check = preview(expression)
  const serverError = roll.error instanceof ApiError ? (roll.error.fields.expression ?? roll.error.message) : roll.error?.message
  const error = check && !check.ok ? check.error : serverError
  const canUseMode = Boolean(check?.ok && check.hasD20)
  const modifier = currentModifier(expression)

  const edit = (next: string) => {
    roll.reset()
    setExpression(next)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!check?.ok) return
    const final = canUseMode ? withMode(expression, mode) : expression
    roll.mutate({ expression: final, label: label.trim() || undefined, visibility }, { onSuccess: () => setMode('normal') })
  }

  const visibilityOptions = ROLL_VISIBILITIES.map((value) => ({
    value,
    label: ROLL_VISIBILITY_LABELS[value]
  }))

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-panel border border-line bg-surface/70 p-5" aria-label="Rolar dados">
      <h2 className="text-2xl">Rolar dados</h2>

      <div role="group" aria-label="Adicionar dado" className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4">
        {DIE_SIDES.map((sides) => (
          <button
            key={sides}
            type="button"
            onClick={() => edit(addDie(expression, sides))}
            className={cn(
              'flex flex-col items-center gap-1 rounded-control border border-line-strong bg-felt-deep py-2 text-moss transition-colors hover:border-brass hover:text-brass-bright pointer-coarse:py-3',
              sides === 20 && 'text-brass-bright'
            )}
            aria-label={`Adicionar um d${sides}`}
          >
            <DieShape sides={sides} className="size-8" />
            <span className="text-sm font-medium" aria-hidden>
              d{sides}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => edit('')}
          className="flex flex-col items-center justify-center gap-1 rounded-control border border-dashed border-line-strong py-2 text-moss-dim hover:text-bone"
        >
          <X className="size-6" aria-hidden />
          <span className="text-sm">Limpar</span>
        </button>
      </div>

      <Field label="Rolagem" error={error} hint={check?.ok ? describeRange(check) : 'Ex.: 1d20+5, 4d6dl1, 2d6! ou 8d6 # Bola de fogo'}>
        {(props) => (
          <div className="flex gap-2">
            <Input
              {...props}
              value={expression}
              onChange={(event) => edit(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="font-display text-lg lining-nums"
            />
            <div className="flex items-center rounded-control border border-line-strong" role="group" aria-label="Modificador">
              <button
                type="button"
                className="grid size-10 place-items-center text-moss hover:text-bone"
                onClick={() => edit(adjustModifier(expression, -1))}
                aria-label="Diminuir modificador"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-7 text-center font-display tabular-nums lining-nums" aria-live="polite">
                {modifier >= 0 ? `+${modifier}` : modifier}
              </span>
              <button
                type="button"
                className="grid size-10 place-items-center text-moss hover:text-bone"
                onClick={() => edit(adjustModifier(expression, 1))}
                aria-label="Aumentar modificador"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-moss" id="modo-d20">
          Modo do d20
        </span>
        <div className="flex rounded-control border border-line-strong p-0.5" role="group" aria-labelledby="modo-d20">
          {MODES.map(({ value, label: text }) => (
            <button
              key={value}
              type="button"
              disabled={!canUseMode}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'flex-1 rounded-[0.35rem] px-2 py-1.5 text-sm disabled:opacity-50 pointer-coarse:py-2.5',
                mode === value ? 'bg-surface-raised text-bone' : 'text-moss hover:text-bone'
              )}
            >
              {text}
            </button>
          ))}
        </div>
        {!canUseMode && <p className="text-sm text-moss-dim">Vantagem e desvantagem valem quando a rolagem tem um d20.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Field label="O que é? (opcional)">
          {(props) => (
            <Input
              {...props}
              value={label}
              maxLength={80}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ataque, dano, Furtividade…"
            />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-moss">Quem vê</span>
          <Select label="Quem vê a rolagem" value={visibility} onChange={setVisibility} options={visibilityOptions} />
        </div>
      </div>

      <Button type="submit" size="lg" loading={roll.isPending} disabled={!check?.ok}>
        <DieShape sides={20} className="size-5" /> Rolar
      </Button>
    </form>
  )
}
