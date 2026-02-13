import { initials } from '@/lib/format'
import { cn } from '@/lib/cn'

export function Token({
  name,
  color,
  size = 'md',
  online,
  decorative,
  className
}: {
  name: string
  color: string
  size?: 'sm' | 'md'
  online?: boolean
  decorative?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-felt-deep',
        size === 'sm' ? 'size-7 text-xs' : 'size-9 text-sm',
        className
      )}
      style={{ background: color, boxShadow: `0 0 0 2px var(--color-felt), 0 0 0 3.5px ${color}66` }}
      title={name}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : online === undefined ? name : `${name}, ${online ? 'na mesa agora' : 'fora da mesa'}`}
    >
      {initials(name)}
      {online && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-felt bg-leaf" aria-hidden />}
    </span>
  )
}
