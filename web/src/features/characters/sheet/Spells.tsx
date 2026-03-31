import { ABILITIES, type Ability } from '@taverna/rules-5e'
import { Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { cn } from '@/lib/cn'
import { signed } from '../format'
import { useSheet } from './sheet-context'
import { CheckButton, Pips } from './controls'

const LEVEL_LABEL = (level: number) => (level === 0 ? 'Truques' : `${level}º círculo`)

export function SpellsTab() {
  const { sheet, derived, editable, change } = useSheet()
  const [name, setName] = useState('')
  const [level, setLevel] = useState('1')
  const byLevel = Array.from({ length: 10 }, (_, l) => sheet.spells.filter((s) => s.level === l)).map((list, l) => ({ level: l, list }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select<Ability | 'none'>
          label="Atributo de conjuração"
          value={sheet.spellAbility ?? 'none'}
          disabled={!editable}
          onChange={(value) => change((s) => ({ ...s, spellAbility: value === 'none' ? null : value }))}
          options={[{ value: 'none', label: 'Sem magia' }, ...ABILITIES.map((a) => ({ value: a.key, label: a.label }))]}
          className="w-44"
        />
        {derived.spellDc !== null && derived.spellAttack !== null && (
          <>
            <span className="rounded-control border border-line px-3 py-1.5 text-sm">
              CD <strong className="font-display text-lg lining-nums">{derived.spellDc}</strong>
            </span>
            <span className="flex items-center gap-2 text-sm text-moss">
              Ataque mágico <CheckButton bonus={derived.spellAttack} label="Ataque mágico" />
            </span>
          </>
        )}
      </div>

      <div className="rounded-control border border-line p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-moss">Concentrando em</span>
          {editable ? (
            <input
              value={sheet.concentration}
              maxLength={80}
              onChange={(event) => change((s) => ({ ...s, concentration: event.target.value }))}
              placeholder="nada no momento"
              aria-label="Magia em concentração"
              className="h-8 min-w-0 flex-1 rounded-control border border-line bg-felt-deep px-2 placeholder:text-moss-dim focus-visible:border-brass focus-visible:outline-none"
            />
          ) : (
            <span className="flex-1">{sheet.concentration || 'nada no momento'}</span>
          )}
          {editable && sheet.concentration && (
            <Button size="sm" variant="ghost" onClick={() => change((s) => ({ ...s, concentration: '' }))}>
              <X /> Encerrar
            </Button>
          )}
        </div>
      </div>

      {(derived.slots.some((n) => n > 0) || derived.pact) && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-moss">Espaços de magia</p>
          {derived.slots.map((total, i) =>
            total > 0 ? (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 text-sm">{LEVEL_LABEL(i + 1)}</span>
                <Pips
                  total={total}
                  used={Math.min(total, sheet.slotsUsed[i] ?? 0)}
                  label={`Espaço de ${i + 1}º círculo`}
                  disabled={!editable}
                  onChange={(used) => change((s) => ({ ...s, slotsUsed: s.slotsUsed.map((u, j) => (j === i ? used : u)) }))}
                />
              </div>
            ) : null
          )}
          {derived.pact && (
            <div className="flex items-center gap-3">
              <span className="w-24 text-sm">Pacto ({derived.pact.level}º)</span>
              <Pips
                total={derived.pact.count}
                used={Math.min(derived.pact.count, sheet.pactUsed)}
                label="Espaço de pacto"
                disabled={!editable}
                onChange={(pactUsed) => change((s) => ({ ...s, pactUsed }))}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {byLevel
          .filter(({ list }) => list.length > 0)
          .map(({ level: l, list }) => (
            <div key={l}>
              <p className="mb-1 text-sm text-moss">{LEVEL_LABEL(l)}</p>
              <ul className="flex flex-col gap-1">
                {list.map((spell) => (
                  <li key={spell.id} className="flex items-center gap-2 rounded-control px-1 py-0.5 hover:bg-surface">
                    {l > 0 && (
                      <input
                        type="checkbox"
                        checked={spell.prepared}
                        disabled={!editable}
                        aria-label={`${spell.name} preparada`}
                        onChange={(event) =>
                          change((s) => ({
                            ...s,
                            spells: s.spells.map((x) => (x.id === spell.id ? { ...x, prepared: event.target.checked } : x))
                          }))
                        }
                        className="size-4 accent-[var(--color-brass)]"
                      />
                    )}
                    <span className={cn('flex-1', l > 0 && !spell.prepared && 'text-moss')}>{spell.name}</span>
                    {editable && sheet.concentration !== spell.name && (
                      <button
                        type="button"
                        className="text-xs text-moss-dim hover:text-brass-bright"
                        onClick={() => change((s) => ({ ...s, concentration: spell.name }))}
                      >
                        concentrar
                      </button>
                    )}
                    {editable && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remover ${spell.name}`}
                        onClick={() => change((s) => ({ ...s, spells: s.spells.filter((x) => x.id !== spell.id) }))}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        {sheet.spells.length === 0 && <p className="text-moss">Nenhuma magia anotada.</p>}
      </div>

      {editable && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!name.trim()) return
            const spellLevel = Number(level)
            change((s) => ({
              ...s,
              spells: [
                ...s.spells,
                { id: crypto.randomUUID(), name: name.trim(), level: spellLevel, prepared: spellLevel === 0, notes: '' }
              ]
            }))
            setName('')
          }}
        >
          <Input
            aria-label="Nome da magia"
            placeholder="Mísseis mágicos"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Select
            label="Círculo da magia"
            value={level}
            onChange={setLevel}
            options={Array.from({ length: 10 }, (_, l) => ({ value: String(l), label: l === 0 ? 'Truque' : `${l}º` }))}
            className="w-28"
          />
          <Button type="submit" variant="secondary" disabled={!name.trim()}>
            <Plus /> Adicionar
          </Button>
        </form>
      )}
      {derived.spellAttack !== null && <p className="text-xs text-moss-dim">Bônus de ataque mágico: {signed(derived.spellAttack)}</p>}
    </div>
  )
}
