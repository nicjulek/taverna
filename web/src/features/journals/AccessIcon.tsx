import type { AccessLevel } from '@taverna/shared'
import { Eye, Lock, Users } from 'lucide-react'

export function AccessIcon({ level, className }: { level: AccessLevel; className?: string }) {
  if (level === 'none') return <Lock className={className} aria-label="Secreta" />
  if (level === 'view') return <Eye className={className} aria-label="Todos podem ver" />
  return <Users className={className} aria-label="Todos podem editar" />
}
