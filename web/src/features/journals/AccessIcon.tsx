import type { AccessLevel } from '@taverna/shared'
import { Eye, Lock, Users } from 'lucide-react'

const LABELS: Record<AccessLevel, string> = { none: '(secreta)', view: '(todos leem)', edit: '(todos editam)' }

export function AccessIcon({ level, className }: { level: AccessLevel; className?: string }) {
  const Icon = level === 'none' ? Lock : level === 'view' ? Eye : Users
  return (
    <>
      <Icon className={className} aria-hidden />
      <span className="sr-only">{LABELS[level]}</span>
    </>
  )
}
