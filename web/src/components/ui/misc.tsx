import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-control bg-surface', className)} />
}

export function EmptyState({ title, children, action, art }: { title: string; children?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-line-strong px-6 py-10 text-center">
      {art && <div className="mb-2 w-full max-w-64">{art}</div>}
      <h3 className="text-2xl">{title}</h3>
      {children && <div className="max-w-md text-moss">{children}</div>}
      {action}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brass' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'brass' ? 'bg-brass/15 text-brass-bright' : 'bg-surface-raised text-moss'
      )}
    >
      {children}
    </span>
  )
}

export function ErrorNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn('rounded-control border border-seal/50 bg-seal/10 px-3 py-2 text-sm text-seal-soft', className)}>
      {children}
    </p>
  )
}
