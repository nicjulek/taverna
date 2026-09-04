import { damageTypeOf } from '@taverna/rules-5e'
import { type AttackResult, ROLL_MODES, type RollModeKey, type SceneItemDto, type SceneWithItemsDto } from '@taverna/shared'
import { Crosshair, Swords } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCharacter } from '../characters/hooks'
import { useCompendiumEntry } from '../compendium/hooks'
import { useAttack, useHpChange } from './hooks'
import { type CombatAttack, monsterAttacks, sheetAttacks } from './stats'

const MODE_LABELS: Record<RollModeKey, string> = { normal: 'Normal', advantage: 'Vantagem', disadvantage: 'Desvantagem' }

function useAttacks(campaignId: string, attacker: SceneItemDto): { attacks: CombatAttack[]; loading: boolean } {
  const characterId = typeof attacker.data.characterId === 'string' ? attacker.data.characterId : ''
  const compendiumId = typeof attacker.data.compendiumId === 'string' ? attacker.data.compendiumId : undefined
  const character = useCharacter(campaignId, characterId, Boolean(characterId))
  const monster = useCompendiumEntry(campaignId, compendiumId)
  if (characterId) return { attacks: character.data ? sheetAttacks(character.data.sheet) : [], loading: character.isPending }
  if (compendiumId) return { attacks: monster.data ? monsterAttacks(monster.data.data.actions) : [], loading: monster.isPending }
  return { attacks: [], loading: false }
}

function signed(n: number) {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`
}

interface AttackPanelProps {
  campaignId: string
  scene: SceneWithItemsDto
  attacker: SceneItemDto
  target: SceneItemDto | null
  gm: boolean
}

export function AttackPanel({ campaignId, scene, attacker, target, gm }: AttackPanelProps) {
  const { attacks, loading } = useAttacks(campaignId, attacker)
  const attack = useAttack(campaignId)
  const hp = useHpChange(campaignId)
  const [mode, setMode] = useState<RollModeKey>('normal')
  const [secret, setSecret] = useState(gm && attacker.ownerId === null)
  const [free, setFree] = useState({ bonus: '0', dice: '1d6' })
  const [result, setResult] = useState<{ attack: CombatAttack; target: SceneItemDto; data: AttackResult; applied: boolean } | null>(null)
  const targetName = target ? String(target.data.name ?? 'alvo') : ''

  const run = (choice: CombatAttack) => {
    if (!target) return
    attack.mutate(
      {
        sceneId: scene.id,
        attackerId: attacker.id,
        targetId: target.id,
        name: choice.name,
        bonus: choice.bonus,
        damage: choice.damage,
        mode,
        visibility: secret ? 'gm' : 'public'
      },
      { onSuccess: (data) => setResult({ attack: choice, target, data, applied: false }) }
    )
  }

  const applyDamage = async () => {
    if (!result) return
    const name = String(result.target.data.name ?? 'Alvo')
    const lines: string[] = []
    let dropped = false
    let concentration: number | null = null
    for (const part of result.data.damage) {
      const outcome = await hp.mutateAsync({
        sceneId: scene.id,
        itemId: result.target.id,
        change: 'damage',
        amount: part.roll.result.total,
        type: damageTypeOf(part.type) ?? undefined
      })
      dropped ||= outcome.droppedToZero
      concentration = outcome.concentrationDc ?? concentration
      const note =
        outcome.adjustment === 'immune'
          ? ' (imune)'
          : outcome.adjustment === 'resistant'
            ? ' (resistente)'
            : outcome.adjustment === 'vulnerable'
              ? ' (vulnerável)'
              : ''
      lines.push(`${outcome.amount}${part.type ? ` ${part.type.toLowerCase()}` : ''}${note}`)
    }
    setResult({ ...result, applied: true })
    toast(`${name} levou ${lines.join(' + ')}`, { description: dropped ? `${name} caiu.` : undefined })
    if (concentration) toast(`${name}: teste de Constituição CD ${concentration} para manter a concentração`)
  }

  const total = result?.data.damage.reduce((sum, d) => sum + d.roll.result.total, 0) ?? 0

  return (
    <section className="flex flex-col gap-2 border-b border-line pb-3" aria-label="Atacar">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-moss">
        <Swords className="size-4" aria-hidden /> Atacar
      </h3>
      {target ? (
        <p className="flex items-center gap-1.5 text-sm">
          <Crosshair className="size-4 text-[#e07a66]" aria-hidden />
          Alvo: <strong className="font-medium">{targetName}</strong>
        </p>
      ) : (
        <p className="text-sm text-moss-dim">Clique duas vezes num token, ou use a mira na lista de tokens, para escolher o alvo.</p>
      )}

      <div className="flex gap-1" role="group" aria-label="Modo da rolagem">
        {ROLL_MODES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              'rounded-control px-2 py-1 text-xs text-moss hover:text-bone',
              mode === value && 'bg-brass/20 text-brass-bright ring-1 ring-brass/60'
            )}
          >
            {MODE_LABELS[value]}
          </button>
        ))}
      </div>
      {gm && (
        <label className="flex items-center gap-2 text-sm text-moss">
          <input
            type="checkbox"
            checked={secret}
            onChange={(e) => setSecret(e.target.checked)}
            className="size-4 accent-[var(--color-brass)]"
          />
          Rolar em segredo
        </label>
      )}

      {loading ? (
        <p className="text-sm text-moss-dim">Buscando ataques…</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {attacks.map((choice) => (
            <li key={choice.key}>
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-between"
                disabled={!target || attack.isPending}
                onClick={() => run(choice)}
              >
                <span className="truncate">{choice.name}</span>
                <span className="tabular-nums text-moss">
                  {signed(choice.bonus)}
                  {choice.damage[0] ? ` · ${choice.damage[0].dice}` : ''}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex items-end gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          run({
            key: 'livre',
            name: 'Ataque',
            bonus: Math.round(Number(free.bonus)) || 0,
            damage: free.dice.trim() ? [{ dice: free.dice.trim(), type: '' }] : []
          })
        }}
      >
        <label className="flex w-16 flex-col gap-1 text-xs text-moss">
          Bônus
          <Input
            value={free.bonus}
            inputMode="numeric"
            onChange={(e) => setFree({ ...free, bonus: e.target.value.replace(/[^\d-]/g, '') })}
            className="h-8"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-moss">
          Dano
          <Input value={free.dice} onChange={(e) => setFree({ ...free, dice: e.target.value })} className="h-8" />
        </label>
        <Button type="submit" size="sm" variant="ghost" disabled={!target || attack.isPending}>
          Ataque livre
        </Button>
      </form>

      {result && (
        <div role="status" className="rounded-control border border-line-strong bg-felt-deep p-3 text-sm">
          <p className={cn('font-display text-lg', result.data.hit ? 'text-[#7fb487]' : 'text-[#e07a66]')}>
            {result.data.critical ? 'Acerto crítico!' : result.data.fumble ? 'Erro automático' : result.data.hit ? 'Acertou' : 'Errou'}
          </p>
          <p className="text-moss">
            {result.attack.name}: {result.data.attack.result.total}
            {result.data.armorClass !== null && ` contra CA ${result.data.armorClass}`}
          </p>
          {result.data.damage.length > 0 && (
            <>
              <p className="mt-1">
                Dano:{' '}
                {result.data.damage.map((d, i) => (
                  <span key={d.roll.id}>
                    {i > 0 && ' + '}
                    <strong className="font-medium tabular-nums">{d.roll.result.total}</strong> {d.type.toLowerCase()}
                  </span>
                ))}
              </p>
              <Button size="sm" className="mt-2" disabled={result.applied || hp.isPending} onClick={() => void applyDamage()}>
                {result.applied ? 'Dano aplicado' : `Aplicar ${total} de dano em ${String(result.target.data.name ?? 'alvo')}`}
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
