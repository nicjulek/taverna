import { ABILITIES, type Ability, attackDamage, criticalDamage, type SheetAttack } from '@taverna/rules-5e'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { useSheet } from './sheet-context'
import { CheckButton, NumberInput, Toggle } from './controls'

const blank = (): SheetAttack => ({
  id: crypto.randomUUID(),
  name: '',
  ability: 'str',
  proficient: true,
  bonus: 0,
  damage: '1d8',
  damageType: ''
})

export function AttacksTab() {
  const { sheet, derived, editable, change, roll, rolling } = useSheet()
  const [draft, setDraft] = useState<SheetAttack | null>(null)
  const editAttack = (id: string, patch: Partial<SheetAttack>) =>
    change((s) => ({ ...s, attacks: s.attacks.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))

  return (
    <div className="flex flex-col gap-3">
      {sheet.attacks.length === 0 && !draft && <p className="text-moss">Nenhum ataque ainda. Adicione armas e truques de ataque.</p>}
      <ul className="flex flex-col gap-2">
        {sheet.attacks.map((attack) => {
          const damage = attackDamage(sheet, attack)
          return (
            <li key={attack.id} className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-felt-deep/60 p-2">
              <div className="min-w-32 flex-1">
                <p className="font-medium">{attack.name}</p>
                <p className="text-sm text-moss-dim">
                  {ABILITIES.find((a) => a.key === attack.ability)?.short}
                  {attack.damageType && ` · ${attack.damageType}`}
                </p>
              </div>
              <CheckButton bonus={derived.attacks[attack.id] ?? 0} label={`Ataque com ${attack.name}`} />
              {damage && editable && (
                <>
                  <Button size="sm" variant="secondary" disabled={rolling} onClick={() => roll(damage, `Dano de ${attack.name}`)}>
                    {damage}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={rolling}
                    onClick={() => roll(criticalDamage(damage), `Crítico de ${attack.name}`)}
                  >
                    Crítico
                  </Button>
                </>
              )}
              {damage && !editable && <span className="text-moss">{damage}</span>}
              {editable && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover ${attack.name}`}
                  onClick={() => change((s) => ({ ...s, attacks: s.attacks.filter((a) => a.id !== attack.id) }))}
                >
                  <Trash2 />
                </Button>
              )}
              {editable && (
                <div className="flex w-full flex-wrap items-center gap-3 border-t border-line pt-2 text-sm">
                  <Toggle
                    label="Proficiente"
                    checked={attack.proficient}
                    onChange={(proficient) => editAttack(attack.id, { proficient })}
                  />
                  <label className="flex items-center gap-2 text-moss">
                    Bônus mágico
                    <NumberInput
                      label={`Bônus mágico de ${attack.name}`}
                      value={attack.bonus}
                      min={-10}
                      max={20}
                      className="h-8 w-12 text-base"
                      onCommit={(bonus) => editAttack(attack.id, { bonus })}
                    />
                  </label>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {editable && draft && (
        <form
          className="grid gap-3 rounded-control border border-brass/50 p-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!draft.name.trim()) return
            change((s) => ({ ...s, attacks: [...s.attacks, { ...draft, name: draft.name.trim() }] }))
            setDraft(null)
          }}
        >
          <Input
            aria-label="Nome do ataque"
            placeholder="Espada longa"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            autoFocus
          />
          <Select<Ability>
            label="Atributo do ataque"
            value={draft.ability}
            onChange={(ability) => setDraft({ ...draft, ability })}
            options={ABILITIES.map((a) => ({ value: a.key, label: a.label }))}
          />
          <Input
            aria-label="Dano"
            placeholder="1d8"
            value={draft.damage}
            onChange={(e) => setDraft({ ...draft, damage: e.target.value })}
          />
          <Input
            aria-label="Tipo de dano"
            placeholder="cortante"
            value={draft.damageType}
            onChange={(e) => setDraft({ ...draft, damageType: e.target.value })}
          />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!draft.name.trim()}>
              Adicionar ataque
            </Button>
          </div>
        </form>
      )}
      {editable && !draft && (
        <Button variant="secondary" className="self-start" onClick={() => setDraft(blank())}>
          <Plus /> Novo ataque
        </Button>
      )}
    </div>
  )
}
