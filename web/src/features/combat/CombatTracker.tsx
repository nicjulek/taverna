import type { CombatantDto, SceneWithItemsDto } from '@taverna/shared'
import { ChevronLeft, ChevronRight, Dices, EyeOff, Swords, UserPlus, X } from 'lucide-react'
import { useCombat, useCombatMutations } from './hooks'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { tokenHp } from './stats'

interface CombatTrackerProps {
  campaignId: string
  scene: SceneWithItemsDto
  gm: boolean
  me: string
  selectedId: string | null
  onSelect: (tokenId: string) => void
}

function InitiativeInput({
  combatant,
  onCommit,
  label
}: {
  combatant: CombatantDto
  onCommit: (value: number | null) => void
  label: string
}) {
  return (
    <input
      type="number"
      aria-label={label}
      key={combatant.initiative ?? 'vazio'}
      defaultValue={combatant.initiative ?? ''}
      placeholder="—"
      min={-20}
      max={60}
      onBlur={(event) => {
        const raw = event.target.value.trim()
        const value = raw === '' ? null : Math.round(Number(raw))
        if (value !== combatant.initiative && (value === null || Number.isFinite(value))) onCommit(value)
      }}
      onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      className="h-8 w-12 rounded-control border border-line-strong bg-felt-deep px-1 text-center text-sm tabular-nums text-bone focus-visible:border-brass focus-visible:outline-none"
    />
  )
}

export function CombatTracker({ campaignId, scene, gm, me, selectedId, onSelect }: CombatTrackerProps) {
  const combat = useCombat(campaignId)
  const m = useCombatMutations(campaignId)
  const data = combat.data ?? null

  if (!data) {
    if (!gm) return null
    const tokens = scene.items.filter((item) => item.kind === 'token')
    return (
      <section aria-label="Combate" className="flex flex-col gap-2 border-b border-line pb-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-moss">
          <Swords className="size-4" aria-hidden /> Combate
        </h2>
        <Button
          size="sm"
          variant="secondary"
          disabled={tokens.length === 0 || m.start.isPending}
          onClick={() => m.start.mutate({ sceneId: scene.id })}
        >
          Começar combate com os {tokens.length} tokens da cena
        </Button>
      </section>
    )
  }

  if (data.sceneId !== scene.id) {
    return (
      <section aria-label="Combate" className="flex flex-col gap-2 border-b border-line pb-3">
        <p className="text-sm text-moss">Há um combate em andamento em outra cena.</p>
        {gm && (
          <Button size="sm" variant="ghost" onClick={() => m.end.mutate()}>
            Encerrar aquele combate
          </Button>
        )}
      </section>
    )
  }

  const items = new Map(scene.items.map((item) => [item.id, item]))
  const current = data.combatants.find((c) => c.id === data.turnId) ?? null
  const mine = data.combatants.filter((c) => c.ownerId === me)
  const missingNpc = data.combatants.some((c) => c.ownerId === null && c.initiative === null)
  const missingMine = mine.some((c) => c.initiative === null)
  const selectedOut = selectedId && items.get(selectedId)?.kind === 'token' && !data.combatants.some((c) => c.tokenId === selectedId)

  return (
    <section aria-label="Combate" className="flex flex-col gap-2 border-b border-line pb-3">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-moss">
          <Swords className="size-4" aria-hidden /> Combate
        </h2>
        <p className="font-display text-lg" aria-live="polite">
          {data.round === 0 ? 'Preparando' : `Rodada ${data.round}`}
        </p>
      </div>
      {current && (
        <p className="text-sm" aria-live="polite">
          Vez de <strong className="font-medium text-brass-bright">{current.name}</strong>
        </p>
      )}
      <ol className="flex flex-col gap-1">
        {data.combatants.map((combatant) => {
          const item = combatant.tokenId ? items.get(combatant.tokenId) : undefined
          const hp = item ? tokenHp(item) : null
          const turn = combatant.id === data.turnId
          const canSet = gm || combatant.ownerId === me
          return (
            <li
              key={combatant.id}
              aria-current={turn ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-control border-l-4 border-transparent py-1 pr-1 pl-2',
                turn && 'border-brass bg-brass/10',
                hp?.current === 0 && 'opacity-60'
              )}
            >
              {canSet ? (
                <InitiativeInput
                  combatant={combatant}
                  label={`Iniciativa de ${combatant.name}`}
                  onCommit={(initiative) => m.update.mutate({ id: combatant.id, initiative })}
                />
              ) : (
                <span className="w-12 text-center text-sm tabular-nums text-moss">{combatant.initiative ?? '—'}</span>
              )}
              <button
                type="button"
                disabled={!item}
                onClick={() => combatant.tokenId && onSelect(combatant.tokenId)}
                className="flex min-w-0 flex-1 flex-col text-left disabled:cursor-default"
              >
                <span className="flex items-center gap-1 truncate text-sm">
                  {combatant.name}
                  {combatant.hidden && <EyeOff className="size-3.5 text-moss-dim" aria-label="oculto dos jogadores" />}
                </span>
                {hp && (gm || combatant.ownerId !== null) && (
                  <span className="text-xs tabular-nums text-moss-dim">
                    {hp.current}/{hp.max} PV
                  </span>
                )}
              </button>
              {gm && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={`Tirar ${combatant.name} do combate`}
                  onClick={() => m.remove.mutate(combatant.id)}
                >
                  <X />
                </Button>
              )}
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap gap-1">
        {gm && missingNpc && (
          <Button size="sm" variant="ghost" disabled={m.initiative.isPending} onClick={() => m.initiative.mutate(undefined)}>
            <Dices /> Rolar iniciativa das criaturas
          </Button>
        )}
        {!gm && missingMine && (
          <Button size="sm" variant="secondary" disabled={m.initiative.isPending} onClick={() => m.initiative.mutate(undefined)}>
            <Dices /> Rolar minha iniciativa
          </Button>
        )}
        {gm && selectedOut && (
          <Button size="sm" variant="ghost" onClick={() => m.add.mutate([selectedId!])}>
            <UserPlus /> Pôr o selecionado
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {gm && data.round > 0 && (
          <Button size="sm" variant="ghost" aria-label="Turno anterior" disabled={m.previous.isPending} onClick={() => m.previous.mutate()}>
            <ChevronLeft />
          </Button>
        )}
        {(gm || current?.ownerId === me) && (
          <Button size="sm" disabled={m.next.isPending} onClick={() => m.next.mutate()}>
            {data.round === 0 ? 'Começar a primeira rodada' : current?.ownerId === me ? 'Terminar meu turno' : 'Próximo turno'}
            <ChevronRight />
          </Button>
        )}
        {gm && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => m.end.mutate()}>
            Encerrar combate
          </Button>
        )}
      </div>
    </section>
  )
}
