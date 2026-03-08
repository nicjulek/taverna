import type { DiceTerm, Die } from '@taverna/dice'
import { ROLL_VISIBILITY_LABELS, type RollDto } from '@taverna/shared'
import { EyeOff } from 'lucide-react'
import { Token } from '@/components/ui'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'

function dieLabel(die: Die): string {
  const notes = [
    die.dropped && 'descartado',
    die.explosion && 'explodiu',
    die.rerolledFrom !== undefined && `rerrolado de ${die.rerolledFrom}`
  ]
  const extra = notes.filter(Boolean).join(', ')
  return extra ? `${die.value} (${extra})` : String(die.value)
}

function DieChip({ die, term }: { die: Die; term: DiceTerm }) {
  const natural = term.sides === 20 && !die.dropped
  return (
    <span
      title={die.rerolledFrom !== undefined ? `Saiu ${die.rerolledFrom} e foi rerrolado` : undefined}
      className={cn(
        'inline-flex h-7 min-w-7 items-center justify-center rounded-[0.4rem] border px-1.5 font-display text-base tabular-nums lining-nums',
        die.dropped
          ? 'border-line text-moss-dim line-through decoration-2 opacity-60'
          : natural && die.value === 20
            ? 'border-brass bg-brass text-brass-ink'
            : natural && die.value === 1
              ? 'border-seal bg-seal text-bone'
              : 'border-line-strong bg-felt-deep text-bone',
        die.explosion && 'border-dashed'
      )}
    >
      <span aria-hidden>
        {die.value}
        {die.rerolledFrom !== undefined && <sup className="ml-0.5 text-[0.6rem] text-moss">↻</sup>}
      </span>
      <span className="sr-only">{dieLabel(die)}</span>
    </span>
  )
}

export function RollCard({ roll, fresh }: { roll: RollDto; fresh?: boolean }) {
  const { result } = roll
  return (
    <article
      className={cn(
        'flex gap-3 rounded-panel border border-line bg-surface/70 p-4',
        fresh && 'motion-safe:animate-[roll-in_420ms_cubic-bezier(.2,.9,.3,1.2)]'
      )}
      aria-label={`${roll.displayName}${roll.label ? `, ${roll.label}` : ''}: ${result.total}`}
    >
      <Token name={roll.displayName} color={roll.color} decorative />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium">{roll.displayName}</span>
          {roll.label && <span className="text-moss">{roll.label}</span>}
          <time dateTime={roll.createdAt} className="text-sm text-moss-dim">
            {timeAgo(roll.createdAt)}
          </time>
          {roll.visibility !== 'public' && (
            <span className="inline-flex items-center gap-1 text-sm text-brass-bright">
              <EyeOff className="size-3.5" aria-hidden /> {ROLL_VISIBILITY_LABELS[roll.visibility]}
            </span>
          )}
        </header>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-moss">
          {result.segments.map((segment, index) => {
            if (segment.kind === 'text')
              return (
                <span key={index} className="whitespace-pre">
                  {segment.text}
                </span>
              )
            const term = result.terms[segment.index]!
            return (
              <span key={index} className="inline-flex flex-wrap items-center gap-1">
                <span className="mr-0.5 text-sm text-moss-dim">{term.notation}</span>
                {term.dice.map((die, i) => (
                  <DieChip key={i} die={die} term={term} />
                ))}
              </span>
            )
          })}
        </p>
        {result.critical && (
          <p className={cn('mt-2 text-sm font-medium', result.critical === 'success' ? 'text-brass-bright' : 'text-seal-soft')}>
            {result.critical === 'success' ? '20 natural!' : '1 natural'}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center">
        <span className="text-xs text-moss-dim">total</span>
        <span
          className={cn(
            'font-display text-4xl leading-none font-bold tabular-nums lining-nums',
            result.critical === 'success' ? 'text-brass-bright' : result.critical === 'failure' ? 'text-seal-soft' : 'text-bone'
          )}
        >
          {result.total}
        </span>
      </div>
    </article>
  )
}
