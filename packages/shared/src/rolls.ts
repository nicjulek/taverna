import type { RollResult } from '@taverna/dice'
import { z } from 'zod'

export const ROLL_VISIBILITIES = ['public', 'gm', 'self'] as const
export type RollVisibility = (typeof ROLL_VISIBILITIES)[number]

export const ROLL_VISIBILITY_LABELS: Record<RollVisibility, string> = {
  public: 'Todos veem',
  gm: 'Só os mestres',
  self: 'Só eu'
}

export const createRollSchema = z.object({
  expression: z.string().trim().min(1, 'Escreva uma rolagem').max(200),
  label: z.string().trim().max(80).optional(),
  visibility: z.enum(ROLL_VISIBILITIES).default('public')
})

export type CreateRollInput = z.input<typeof createRollSchema>

export interface RollDto {
  id: string
  campaignId: string
  userId: string
  displayName: string
  color: string
  label: string
  visibility: RollVisibility
  result: RollResult
  createdAt: string
}

export const ROLL_PAGE_SIZE = 50
