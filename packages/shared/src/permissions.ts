import { z } from 'zod'
import { isGameMaster, type Role } from './campaigns'

export const ACCESS_LEVELS = ['none', 'view', 'edit'] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  none: 'Sem acesso',
  view: 'Pode ver',
  edit: 'Pode editar'
}

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 }

export function maxAccess(...levels: AccessLevel[]): AccessLevel {
  return levels.reduce<AccessLevel>((best, level) => (RANK[level] > RANK[best] ? level : best), 'none')
}

export function canView(level: AccessLevel): boolean {
  return RANK[level] >= RANK.view
}

export function canEdit(level: AccessLevel): boolean {
  return level === 'edit'
}

export interface AccessContext {
  userId: string
  role: Role
  ownerId: string | null
  defaultAccess: AccessLevel
  grants: Record<string, AccessLevel>
}

export function resolveAccess({ userId, role, ownerId, defaultAccess, grants }: AccessContext): AccessLevel {
  if (isGameMaster(role) || ownerId === userId) return 'edit'
  return maxAccess(defaultAccess, grants[userId] ?? 'none')
}

export const accessSchema = z.object({
  defaultAccess: z.enum(ACCESS_LEVELS),
  grants: z.record(z.uuid(), z.enum(ACCESS_LEVELS))
})

export type AccessInput = z.infer<typeof accessSchema>
