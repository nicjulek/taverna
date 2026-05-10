import { ABILITIES } from '@taverna/rules-5e'
import {
  COMPENDIUM_KIND_LABELS,
  type CompendiumEntryDto,
  HOMEBREW_KINDS,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  MONSTER_TYPES,
  SPELL_SCHOOLS
} from '@taverna/shared'
import { Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Dialog, DialogContent, ErrorNote, Input, Select, Textarea } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { type Draft, draftFromEntry, empty, type Kind, toHomebrew } from './homebrew-draft'
import { useHomebrewMutations } from './hooks'

function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-moss">
      {label}
      {children}
    </label>
  )
}

interface HomebrewDialogProps {
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: CompendiumEntryDto | null
  copyFrom?: CompendiumEntryDto | null
  onSaved?: (entry: CompendiumEntryDto) => void
}

export function HomebrewDialog({ campaignId, open, onOpenChange, editing, copyFrom, onSaved }: HomebrewDialogProps) {
  const { save } = useHomebrewMutations(campaignId)
  const [draft, setDraft] = useState<Draft>(empty)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  useEffect(() => {
    if (!open) return
    save.reset()
    const source = editing ?? copyFrom
    setDraft(source ? draftFromEntry(source) : empty())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, copyFrom])

  const fieldError = save.error instanceof ApiError ? save.error.fields : {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={editing ? `Editar ${editing.name}` : 'Novo homebrew'}
        description="Só os mestres veem enquanto for rascunho. Publique para o grupo ver no compêndio."
        className="max-w-2xl"
      >
        <form
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate(
              { id: editing?.id, ...toHomebrew(draft) },
              {
                onSuccess: (entry) => {
                  toast.success(entry.published ? 'Homebrew publicado' : 'Rascunho salvo')
                  onOpenChange(false)
                  onSaved?.(entry)
                }
              }
            )
          }}
        >
          {save.error && <ErrorNote>{save.error.message}</ErrorNote>}
          <Row>
            <Labeled label="Tipo">
              <Select<Kind>
                label="Tipo"
                value={draft.kind}
                onChange={(kind) => set('kind', kind)}
                options={HOMEBREW_KINDS.map((k) => ({ value: k, label: COMPENDIUM_KIND_LABELS[k].one }))}
              />
            </Labeled>
            <Labeled label="Nome">
              <Input
                value={draft.name}
                maxLength={80}
                onChange={(e) => set('name', e.target.value)}
                aria-invalid={Boolean(fieldError.name)}
              />
            </Labeled>
          </Row>
          {fieldError.name && <p className="-mt-2 text-sm text-seal-soft">{fieldError.name}</p>}

          {draft.kind === 'spell' && (
            <>
              <Row>
                <Labeled label="Círculo">
                  <Select
                    label="Círculo"
                    value={draft.level}
                    onChange={(v) => set('level', v)}
                    options={Array.from({ length: 10 }, (_, l) => ({ value: String(l), label: l === 0 ? 'Truque' : `${l}º` }))}
                  />
                </Labeled>
                <Labeled label="Escola">
                  <Select
                    label="Escola"
                    value={draft.school}
                    onChange={(v) => set('school', v)}
                    options={Object.entries(SPELL_SCHOOLS).map(([value, label]) => ({ value, label }))}
                  />
                </Labeled>
              </Row>
              <Row>
                <Labeled label="Tempo de conjuração">
                  <Input value={draft.castingTime} onChange={(e) => set('castingTime', e.target.value)} />
                </Labeled>
                <Labeled label="Alcance">
                  <Input value={draft.range} placeholder="36 metros" onChange={(e) => set('range', e.target.value)} />
                </Labeled>
              </Row>
              <Row>
                <Labeled label="Componentes">
                  <Input value={draft.components} onChange={(e) => set('components', e.target.value)} />
                </Labeled>
                <Labeled label="Duração">
                  <Input value={draft.duration} onChange={(e) => set('duration', e.target.value)} />
                </Labeled>
              </Row>
              <div className="flex gap-4 text-sm text-moss">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.concentration}
                    onChange={(e) => set('concentration', e.target.checked)}
                    className="size-4 accent-[var(--color-brass)]"
                  />
                  Concentração
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.ritual}
                    onChange={(e) => set('ritual', e.target.checked)}
                    className="size-4 accent-[var(--color-brass)]"
                  />
                  Ritual
                </label>
              </div>
            </>
          )}

          {draft.kind === 'item' && (
            <Row>
              <Labeled label="Categoria">
                <Select
                  label="Categoria"
                  value={draft.category}
                  onChange={(v) => set('category', v)}
                  options={Object.entries(ITEM_CATEGORIES).map(([value, label]) => ({ value, label }))}
                />
              </Labeled>
              {draft.category === 'magic' ? (
                <Labeled label="Raridade">
                  <Select
                    label="Raridade"
                    value={draft.rarity}
                    onChange={(v) => set('rarity', v)}
                    options={Object.entries(ITEM_RARITIES).map(([value, label]) => ({ value, label }))}
                  />
                </Labeled>
              ) : (
                <Labeled label="Custo">
                  <Input value={draft.cost} placeholder="15 po" onChange={(e) => set('cost', e.target.value)} />
                </Labeled>
              )}
            </Row>
          )}

          {(draft.kind === 'spell' || draft.kind === 'item') && (
            <Row>
              <Labeled label="Dano (opcional)">
                <Input value={draft.damage} placeholder="2d6" onChange={(e) => set('damage', e.target.value)} />
              </Labeled>
              <Labeled label="Tipo de dano">
                <Input value={draft.damageType} placeholder="Fogo" onChange={(e) => set('damageType', e.target.value)} />
              </Labeled>
            </Row>
          )}

          {draft.kind === 'monster' && (
            <>
              <Row>
                <Labeled label="Tipo de criatura">
                  <Select
                    label="Tipo de criatura"
                    value={draft.type}
                    onChange={(v) => set('type', v)}
                    options={Object.entries(MONSTER_TYPES).map(([value, label]) => ({ value, label }))}
                  />
                </Labeled>
                <Labeled label="Nível de desafio">
                  <Input value={draft.cr} inputMode="decimal" onChange={(e) => set('cr', e.target.value)} />
                </Labeled>
              </Row>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Labeled label="CA">
                  <Input value={draft.ac} inputMode="numeric" onChange={(e) => set('ac', e.target.value)} />
                </Labeled>
                <Labeled label="PV">
                  <Input value={draft.hp} inputMode="numeric" onChange={(e) => set('hp', e.target.value)} />
                </Labeled>
                <Labeled label="Dados de vida">
                  <Input value={draft.hitDice} onChange={(e) => set('hitDice', e.target.value)} />
                </Labeled>
                <Labeled label="Deslocamento">
                  <Input value={draft.speed} onChange={(e) => set('speed', e.target.value)} />
                </Labeled>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {ABILITIES.map((ability) => (
                  <Labeled key={ability.key} label={ability.short}>
                    <Input
                      value={draft.abilities[ability.key] ?? '10'}
                      inputMode="numeric"
                      aria-label={ability.label}
                      onChange={(e) => set('abilities', { ...draft.abilities, [ability.key]: e.target.value })}
                    />
                  </Labeled>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-moss">Ações</p>
                {draft.actions.map((action, i) => {
                  const update = (patch: Partial<Draft['actions'][number]>) =>
                    set(
                      'actions',
                      draft.actions.map((a, j) => (j === i ? { ...a, ...patch } : a))
                    )
                  return (
                    <div key={i} className="grid gap-2 rounded-control border border-line p-2 sm:grid-cols-[1fr_5rem_6rem_auto]">
                      <Input
                        aria-label={`Nome da ação ${i + 1}`}
                        placeholder="Mordida"
                        value={action.name}
                        onChange={(e) => update({ name: e.target.value })}
                      />
                      <Input
                        aria-label={`Bônus de ataque da ação ${i + 1}`}
                        placeholder="+5"
                        value={action.attackBonus}
                        onChange={(e) => update({ attackBonus: e.target.value })}
                      />
                      <Input
                        aria-label={`Dano da ação ${i + 1}`}
                        placeholder="2d6+3"
                        value={action.dice}
                        onChange={(e) => update({ dice: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ação ${i + 1}`}
                        onClick={() =>
                          set(
                            'actions',
                            draft.actions.filter((_, j) => j !== i)
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                      <Textarea
                        aria-label={`Descrição da ação ${i + 1}`}
                        rows={2}
                        className="sm:col-span-4"
                        value={action.desc}
                        onChange={(e) => update({ desc: e.target.value })}
                      />
                    </div>
                  )
                })}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => set('actions', [...draft.actions, { name: '', attackBonus: '', dice: '', desc: '' }])}
                >
                  <Plus /> Ação
                </Button>
              </div>
            </>
          )}

          <Labeled label="Resumo (opcional)">
            <Input value={draft.summary} maxLength={160} onChange={(e) => set('summary', e.target.value)} />
          </Labeled>
          <Labeled label="Descrição">
            <Textarea
              rows={6}
              value={draft.body}
              maxLength={20_000}
              placeholder="Aceita markdown: **negrito**, listas e títulos."
              onChange={(e) => set('body', e.target.value)}
            />
          </Labeled>
          <label className="flex items-center gap-2 text-sm text-moss">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => set('published', e.target.checked)}
              className="size-4 accent-[var(--color-brass)]"
            />
            Publicar para o grupo
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!draft.name.trim()}>
              {draft.published ? 'Salvar e publicar' : 'Salvar rascunho'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
