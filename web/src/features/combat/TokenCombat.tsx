import { CONDITIONS, type ConditionKey, DAMAGE_TYPES, type DamageType, type Effect } from '@taverna/rules-5e'
import { HP_CHANGES, type SceneItemDto, type SceneWithItemsDto } from '@taverna/shared'
import { HeartPulse, Shield, Sparkles, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { Button, Input, Select } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useHpChange } from './hooks'
import { tokenAc, tokenAura, tokenEffects, tokenHp } from './stats'

const NO_TYPE = 'none'
const CHANGE_LABELS: Record<(typeof HP_CHANGES)[number], string> = { damage: 'Dano', healing: 'Cura', temporary: 'PV temporários' }
const DEFENSE_LABELS = { resistances: 'Resistências', immunities: 'Imunidades', vulnerabilities: 'Vulnerabilidades' } as const
type DefenseKey = keyof typeof DEFENSE_LABELS

function Block({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-line pb-3 last:border-0">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-moss">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

function SmallNumber({
  label,
  value,
  onCommit,
  min = 0,
  max = 9999
}: {
  label: string
  value: number
  onCommit: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-moss">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        defaultValue={value}
        key={value}
        onBlur={(e) => {
          const n = Math.round(Number(e.target.value))
          if (Number.isFinite(n) && n !== value) onCommit(Math.min(max, Math.max(min, n)))
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="h-8 w-full rounded-control border border-line-strong bg-felt-deep px-2 text-sm text-bone focus-visible:border-brass focus-visible:outline-none"
      />
    </label>
  )
}

interface TokenCombatProps {
  campaignId: string
  scene: SceneWithItemsDto
  item: SceneItemDto
  gm: boolean
  editable: boolean
  onData: (patch: Record<string, unknown>) => void
}

export function TokenCombat({ campaignId, scene, item, gm, editable, onData }: TokenCombatProps) {
  const hp = tokenHp(item)
  const ac = tokenAc(item)
  const effects = tokenEffects(item)
  const aura = tokenAura(item)
  const linked = typeof item.data.characterId === 'string'
  const change = useHpChange(campaignId)
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<string>(NO_TYPE)
  const [effectLabel, setEffectLabel] = useState('')
  const [effectRounds, setEffectRounds] = useState('10')
  const name = String(item.data.name ?? 'Token')
  const defenses = (item.data.defenses ?? {}) as Partial<Record<DefenseKey, string[]>>
  const seeNumbers = gm || item.ownerId !== null

  const apply = (kind: (typeof HP_CHANGES)[number]) => {
    const value = Math.round(Number(amount))
    if (!Number.isFinite(value) || value <= 0) return
    change.mutate(
      { sceneId: scene.id, itemId: item.id, change: kind, amount: value, type: kind === 'damage' && type !== NO_TYPE ? type : undefined },
      {
        onSuccess: (result) => {
          setAmount('')
          const extra =
            result.adjustment === 'immune'
              ? ' (imune)'
              : result.adjustment === 'resistant'
                ? ' (resistente)'
                : result.adjustment === 'vulnerable'
                  ? ' (vulnerável)'
                  : ''
          if (kind === 'damage')
            toast(`${name} perdeu ${result.amount} PV${extra}`, { description: result.droppedToZero ? `${name} caiu.` : undefined })
          else if (kind === 'healing') toast(`${name} recuperou PV`)
          else toast(`${name} tem ${result.hp.temporary} PV temporários`)
          if (result.concentrationDc) toast(`${name}: teste de Constituição CD ${result.concentrationDc} para manter a concentração`)
        }
      }
    )
  }

  const setEffects = (next: Effect[]) => onData({ effects: next })
  const toggleCondition = (key: ConditionKey) => {
    const has = effects.some((e) => e.condition === key)
    setEffects(
      has
        ? effects.filter((e) => e.condition !== key)
        : [...effects, { id: crypto.randomUUID(), label: CONDITIONS[key].label, condition: key, rounds: null }]
    )
  }

  return (
    <>
      <Block title="Pontos de vida" icon={<HeartPulse className="size-4" aria-hidden />}>
        {hp ? (
          seeNumbers ? (
            <div className="flex flex-col gap-1.5">
              <div
                className="h-2.5 overflow-hidden rounded-full bg-felt-deep"
                role="meter"
                aria-label={`Pontos de vida de ${name}`}
                aria-valuemin={0}
                aria-valuemax={hp.max}
                aria-valuenow={hp.current}
              >
                <div
                  className={cn(
                    'h-full rounded-full',
                    hp.current / hp.max > 0.5 ? 'bg-[#7fb487]' : hp.current / hp.max > 0.25 ? 'bg-brass' : 'bg-[#e07a66]'
                  )}
                  style={{ width: `${(hp.current / hp.max) * 100}%` }}
                />
              </div>
              <p className="font-display text-xl tabular-nums">
                {hp.current} / {hp.max}
                {hp.temporary > 0 && <span className="ml-2 text-base text-[#6fa8dc]">+{hp.temporary} temporários</span>}
              </p>
            </div>
          ) : (
            <p className="text-sm text-moss">{hp.current === 0 ? 'Caído' : hp.current <= hp.max / 2 ? 'Sangrando' : 'De pé'}</p>
          )
        ) : (
          <p className="text-sm text-moss-dim">Sem pontos de vida. {gm ? 'Defina o máximo abaixo.' : ''}</p>
        )}
        {gm && !linked && (
          <div className="grid grid-cols-3 gap-2">
            <SmallNumber
              label="PV atuais"
              value={hp?.current ?? 0}
              onCommit={(current) => onData({ hp: { ...(hp ?? { max: current, temporary: 0 }), current } })}
            />
            <SmallNumber
              label="PV máximos"
              value={hp?.max ?? 0}
              min={1}
              onCommit={(max) => onData({ hp: { current: Math.min(hp?.current ?? max, max), max, temporary: hp?.temporary ?? 0 } })}
            />
            <SmallNumber label="CA" value={ac ?? 10} min={1} max={40} onCommit={(value) => onData({ ac: value })} />
          </div>
        )}
        {linked && <p className="text-sm text-moss-dim">PV e CA vêm da ficha{seeNumbers && ac ? ` · CA ${ac}` : ''}.</p>}
        {hp && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              apply('damage')
            }}
          >
            <div className="flex gap-2">
              <Input
                aria-label="Quantidade"
                inputMode="numeric"
                placeholder="Quanto"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                className="h-8 w-20"
              />
              <Select
                label="Tipo de dano"
                size="sm"
                value={type}
                onChange={setType}
                options={[
                  { value: NO_TYPE, label: 'Sem tipo' },
                  ...(Object.keys(DAMAGE_TYPES) as DamageType[]).map((value) => ({ value, label: DAMAGE_TYPES[value] }))
                ]}
                className="flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {HP_CHANGES.map((kind) => (
                <Button
                  key={kind}
                  type={kind === 'damage' ? 'submit' : 'button'}
                  size="sm"
                  variant={kind === 'damage' ? 'secondary' : 'ghost'}
                  disabled={!amount || change.isPending}
                  onClick={kind === 'damage' ? undefined : () => apply(kind)}
                >
                  {CHANGE_LABELS[kind]}
                </Button>
              ))}
            </div>
          </form>
        )}
      </Block>

      {(editable || effects.length > 0) && (
        <Block title="Condições e efeitos" icon={<Sparkles className="size-4" aria-hidden />}>
          {editable && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Condições">
              {(Object.keys(CONDITIONS) as ConditionKey[]).map((key) => {
                const on = effects.some((e) => e.condition === key)
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCondition(key)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-xs',
                      on ? 'border-[#c5523f] bg-[#5c2116] text-bone' : 'border-line-strong text-moss hover:text-bone'
                    )}
                  >
                    {CONDITIONS[key].label}
                  </button>
                )
              })}
            </div>
          )}
          {effects.length > 0 && (
            <ul className="flex flex-col gap-1">
              {effects.map((effect) => (
                <li key={effect.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {effect.label}
                    <span className="text-moss-dim">
                      {' '}
                      · {effect.rounds === null ? 'sem duração' : `${effect.rounds} ${effect.rounds === 1 ? 'rodada' : 'rodadas'}`}
                    </span>
                  </span>
                  {editable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label={`Tirar ${effect.label}`}
                      onClick={() => setEffects(effects.filter((e) => e.id !== effect.id))}
                    >
                      <X />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const label = effectLabel.trim()
                const rounds = Math.round(Number(effectRounds))
                if (!label) return
                setEffects([
                  ...effects,
                  { id: crypto.randomUUID(), label: label.slice(0, 40), condition: null, rounds: rounds > 0 ? rounds : null }
                ])
                setEffectLabel('')
              }}
            >
              <Input
                aria-label="Efeito"
                placeholder="Bênção, Velocidade…"
                value={effectLabel}
                maxLength={40}
                onChange={(e) => setEffectLabel(e.target.value)}
                className="h-8 flex-1"
              />
              <Input
                aria-label="Rodadas"
                inputMode="numeric"
                value={effectRounds}
                onChange={(e) => setEffectRounds(e.target.value.replace(/\D/g, ''))}
                className="h-8 w-14"
              />
              <Button type="submit" size="sm" variant="ghost" disabled={!effectLabel.trim()}>
                Pôr
              </Button>
            </form>
          )}
          {editable && <p className="text-xs text-moss-dim">A duração conta uma rodada no começo de cada vez deste token.</p>}
        </Block>
      )}

      {gm && !linked && (
        <Block title="Defesas" icon={<Shield className="size-4" aria-hidden />}>
          {(Object.keys(DEFENSE_LABELS) as DefenseKey[]).map((key) => (
            <fieldset key={key} className="flex flex-col gap-1">
              <legend className="text-xs text-moss">{DEFENSE_LABELS[key]}</legend>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(DAMAGE_TYPES) as DamageType[]).map((damage) => {
                  const list = defenses[key] ?? []
                  const on = list.includes(damage)
                  return (
                    <button
                      key={damage}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onData({ defenses: { ...defenses, [key]: on ? list.filter((d) => d !== damage) : [...list, damage] } })
                      }
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs',
                        on ? 'border-brass bg-brass/20 text-brass-bright' : 'border-line text-moss-dim hover:text-bone'
                      )}
                    >
                      {DAMAGE_TYPES[damage]}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </Block>
      )}
      {linked && gm && (
        <Block title="Defesas" icon={<Shield className="size-4" aria-hidden />}>
          <p className="text-sm text-moss-dim">
            {(['resistances', 'immunities', 'vulnerabilities'] as DefenseKey[])
              .map((key) =>
                defenses[key]?.length
                  ? `${DEFENSE_LABELS[key]}: ${defenses[key]!.map((d) => DAMAGE_TYPES[d as DamageType] ?? d).join(', ')}`
                  : ''
              )
              .filter(Boolean)
              .join(' · ') || 'Nenhuma resistência marcada no token.'}
          </p>
        </Block>
      )}

      {editable && (
        <Block title="Aura" icon={<Sparkles className="size-4" aria-hidden />}>
          <div className="grid grid-cols-2 items-end gap-2">
            <SmallNumber
              label="Alcance (quadrados)"
              value={aura?.radius ?? 0}
              max={30}
              onCommit={(radius) => onData({ aura: radius > 0 ? { radius, color: aura?.color ?? '#d6a446' } : null })}
            />
            <label className="flex items-center gap-2 text-sm text-moss">
              Cor
              <input
                type="color"
                value={aura?.color ?? '#d6a446'}
                disabled={!aura}
                onChange={(e) => aura && onData({ aura: { ...aura, color: e.target.value } })}
                className="h-8 w-12 rounded disabled:opacity-40"
              />
            </label>
          </div>
        </Block>
      )}
    </>
  )
}
