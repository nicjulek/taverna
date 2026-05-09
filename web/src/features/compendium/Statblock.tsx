import { ABILITIES, abilityModifier } from '@taverna/rules-5e'
import { type CompendiumEntryDto, MONSTER_TYPES, type MonsterAction, type RollVisibility } from '@taverna/shared'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { useRoll } from '../dice/hooks'
import { signed } from '../characters/format'

interface MonsterData {
  subtype?: string | null
  alignment?: string
  armorClass?: { value: number; type: string }[]
  hitPoints?: number
  hitDice?: string
  speed?: Record<string, string>
  abilities?: Record<string, number>
  proficiencies?: { name: string; value: number }[]
  vulnerabilities?: string[]
  resistances?: string[]
  immunities?: string[]
  conditionImmunities?: string[]
  senses?: Record<string, string | number>
  languages?: string
  traits?: MonsterAction[]
  actions?: MonsterAction[]
  reactions?: MonsterAction[]
  legendary?: MonsterAction[]
}

const SIZES: Record<string, string> = {
  Tiny: 'Miúdo',
  Small: 'Pequeno',
  Medium: 'Médio',
  Large: 'Grande',
  Huge: 'Enorme',
  Gargantuan: 'Imenso'
}

export function Statblock({
  entry,
  campaignId,
  rollVisibility
}: {
  entry: CompendiumEntryDto
  campaignId: string
  rollVisibility: RollVisibility | null
}) {
  const data = entry.data as MonsterData
  const roll = useRoll(campaignId)
  const type = String(entry.meta.type ?? '')
  const size = String(entry.meta.size ?? '')

  const rollIt = (expression: string, what: string) =>
    rollVisibility &&
    roll.mutate(
      { expression, label: `${entry.name}: ${what}`.slice(0, 80), visibility: rollVisibility },
      {
        onSuccess: (result) => toast(`${entry.name} · ${what}: ${result.result.total}`, { description: result.result.expression }),
        onError: (error) => toast.error(error.message)
      }
    )

  const line = (label: string, value: string | undefined | null) =>
    value ? (
      <p>
        <strong className="text-[#7a2e1f]">{label}</strong> {value}
      </p>
    ) : null

  const list = (values?: string[]) => (values && values.length ? values.join(', ') : null)
  const senses = data.senses
    ? Object.entries(data.senses)
        .map(([key, value]) => `${key.replace(/_/g, ' ')} ${value}`)
        .join(', ')
    : null

  const actions = (title: string, items?: MonsterAction[]) =>
    items && items.length > 0 ? (
      <section className="mt-3">
        <h4 className="border-b border-[#7a2e1f]/60 font-display text-xl text-[#7a2e1f]">{title}</h4>
        <ul className="mt-1.5 flex flex-col gap-2">
          {items.map((action) => (
            <li key={action.name}>
              <p>
                <strong className="italic">{action.name}.</strong> {action.desc}
              </p>
              {rollVisibility && (action.attackBonus !== null || action.damage.length > 0) && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {action.attackBonus !== null && (
                    <RollChip
                      onClick={() => rollIt(`1d20${signed(action.attackBonus!).replace('−', '-')}`, action.name)}
                      disabled={roll.isPending}
                    >
                      Ataque {signed(action.attackBonus)}
                    </RollChip>
                  )}
                  {action.damage.map((d, i) => (
                    <RollChip key={i} onClick={() => rollIt(d.dice, `dano de ${action.name}`)} disabled={roll.isPending}>
                      {d.dice} {d.type.toLowerCase()}
                    </RollChip>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    ) : null

  return (
    <article
      className="rounded-panel border-2 border-[#b8955a] bg-[#efe3c6] p-5 text-[#2b1d12] shadow-[0_10px_30px_-12px_rgba(0,0,0,.7)]"
      aria-label={`Ficha de ${entry.name}`}
    >
      <p className="italic">
        {SIZES[size] ?? size} {(MONSTER_TYPES[type] ?? type).toLowerCase()}
        {data.subtype ? ` (${data.subtype})` : ''}
        {data.alignment ? `, ${data.alignment}` : ''}
      </p>
      <hr className="my-2 border-[#7a2e1f]/60" />
      {line('Classe de Armadura', data.armorClass?.map((a) => `${a.value}${a.type && a.type !== 'dex' ? ` (${a.type})` : ''}`).join(', '))}
      <p>
        <strong className="text-[#7a2e1f]">Pontos de Vida</strong> {data.hitPoints}
        {data.hitDice && (
          <>
            {' '}
            (
            {rollVisibility ? (
              <button
                type="button"
                className="underline decoration-dotted underline-offset-2 hover:text-[#7a2e1f]"
                onClick={() => rollIt(data.hitDice!.replace(/\s+/g, ''), 'pontos de vida')}
              >
                {data.hitDice}
              </button>
            ) : (
              data.hitDice
            )}
            )
          </>
        )}
      </p>
      {line(
        'Deslocamento',
        data.speed
          ? Object.entries(data.speed)
              .map(([k, v]) => (k === 'walk' ? v : `${k} ${v}`))
              .join(', ')
          : null
      )}
      <hr className="my-2 border-[#7a2e1f]/60" />
      <dl className="grid grid-cols-3 gap-1 text-center sm:grid-cols-6">
        {ABILITIES.map((ability) => {
          const score = data.abilities?.[ability.key] ?? 10
          const mod = abilityModifier(Math.min(30, Math.max(1, score)))
          return (
            <div key={ability.key}>
              <dt className="text-sm font-bold text-[#7a2e1f]">{ability.short}</dt>
              <dd>
                {rollVisibility ? (
                  <button
                    type="button"
                    onClick={() => rollIt(`1d20${mod < 0 ? mod : `+${mod}`}`, `teste de ${ability.label}`)}
                    className="rounded px-1 tabular-nums hover:bg-[#7a2e1f]/10"
                  >
                    {score} ({signed(mod)})<span className="sr-only">, rolar teste de {ability.label}</span>
                  </button>
                ) : (
                  <span className="tabular-nums">
                    {score} ({signed(mod)})
                  </span>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      <hr className="my-2 border-[#7a2e1f]/60" />
      <div className="flex flex-col gap-0.5">
        {line(
          'Salvaguardas e perícias',
          data.proficiencies?.map((p) => `${p.name.replace(/^(Saving Throw|Skill): /, '')} ${signed(p.value)}`).join(', ')
        )}
        {line('Vulnerável a', list(data.vulnerabilities))}
        {line('Resistente a', list(data.resistances))}
        {line('Imune a', list(data.immunities))}
        {line('Imune às condições', list(data.conditionImmunities))}
        {line('Sentidos', senses)}
        {line('Idiomas', data.languages || '—')}
        {line('Nível de desafio', `${String(entry.meta.crLabel ?? entry.meta.cr ?? '?')} (${String(entry.meta.xp ?? 0)} XP)`)}
      </div>
      {data.traits && data.traits.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {data.traits.map((trait) => (
            <li key={trait.name}>
              <strong className="italic">{trait.name}.</strong> {trait.desc}
            </li>
          ))}
        </ul>
      )}
      {actions('Ações', data.actions)}
      {actions('Reações', data.reactions)}
      {actions('Ações lendárias', data.legendary)}
    </article>
  )
}

function RollChip({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-full border border-[#7a2e1f]/50 px-2.5 py-0.5 text-sm text-[#5c2116] hover:bg-[#7a2e1f] hover:text-[#efe3c6] disabled:opacity-60'
      )}
    >
      {children}
    </button>
  )
}
