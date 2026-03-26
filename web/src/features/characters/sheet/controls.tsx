import { d20 } from '@taverna/rules-5e'
import { type ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { signed } from '../format'
import { useSheet } from './sheet-context'

export function Panel({
  title,
  action,
  children,
  className
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-panel border border-line bg-surface/70 p-4', className)} aria-label={title}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xl">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  )
}

export function CheckButton({
  bonus,
  label,
  className,
  size = 'md'
}: {
  bonus: number
  label: string
  className?: string
  size?: 'md' | 'lg'
}) {
  const { editable, mode, sheet, roll, rolling } = useSheet()
  const text = signed(bonus)
  const classes = cn(
    'inline-flex items-center justify-center rounded-control font-display font-bold tabular-nums lining-nums',
    size === 'lg' ? 'h-10 min-w-12 px-2 text-xl' : 'h-8 min-w-11 px-2 text-base pointer-coarse:h-10',
    className
  )
  if (!editable) return <span className={cn(classes, 'text-bone')}>{text}</span>
  return (
    <button
      type="button"
      disabled={rolling}
      onClick={() => roll(d20(bonus, { mode, rerollOnes: sheet.halflingLucky }), label, { d20: true })}
      className={cn(
        classes,
        'border border-line-strong bg-felt-deep text-bone transition-colors hover:border-brass hover:text-brass-bright disabled:opacity-60',
        mode === 'advantage' && 'border-leaf/70',
        mode === 'disadvantage' && 'border-seal-soft/70'
      )}
      aria-label={`Rolar ${label} ${text}`}
    >
      {text}
    </button>
  )
}

export function NumberInput({
  value,
  onCommit,
  label,
  min = 0,
  max = 999,
  className,
  disabled
}: {
  value: number
  onCommit: (value: number) => void
  label: string
  min?: number
  max?: number
  className?: string
  disabled?: boolean
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const parsed = Number.parseInt(text, 10)
    if (Number.isNaN(parsed)) return setText(String(value))
    const clamped = Math.min(max, Math.max(min, parsed))
    setText(String(clamped))
    if (clamped !== value) onCommit(clamped)
  }
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      value={text}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
      }}
      className={cn(
        'h-9 w-16 rounded-control border border-line-strong bg-felt-deep px-2 text-center font-display text-lg tabular-nums lining-nums [appearance:textfield] focus-visible:border-brass focus-visible:outline-none disabled:border-transparent disabled:bg-transparent disabled:opacity-100 [&::-webkit-inner-spin-button]:appearance-none',
        className
      )}
    />
  )
}

export function Pips({
  total,
  used,
  onChange,
  label,
  disabled
}: {
  total: number
  used: number
  onChange: (used: number) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label}: ${total - used} de ${total} disponíveis`}>
      {Array.from({ length: total }, (_, i) => {
        const spent = i < used
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            aria-pressed={spent}
            aria-label={`${label} ${i + 1}${spent ? ', gasto' : ', disponível'}`}
            onClick={() => onChange(spent ? i : i + 1)}
            className={cn(
              'size-5 rounded-full border-2 transition-colors pointer-coarse:size-7',
              spent ? 'border-line-strong bg-transparent' : 'border-brass bg-brass',
              !disabled && 'hover:border-brass-bright'
            )}
          />
        )
      })}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <label className={cn('flex items-center gap-2 text-sm', disabled ? 'text-moss-dim' : 'cursor-pointer text-moss')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[var(--color-brass)]"
      />
      {label}
    </label>
  )
}
