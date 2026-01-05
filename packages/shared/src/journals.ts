import { z } from 'zod'
import { accessSchema, type AccessLevel } from './permissions'

export const createJournalSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título').max(120),
  content: z.string().max(100_000).default(''),
  folder: z.string().trim().max(60).default('')
})

export const updateJournalSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    content: z.string().max(100_000),
    folder: z.string().trim().max(60)
  })
  .partial()
  .extend({ access: accessSchema.optional() })

export type CreateJournalInput = z.input<typeof createJournalSchema>
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>

export interface JournalSummaryDto {
  id: string
  title: string
  folder: string
  authorId: string
  authorName: string
  access: AccessLevel
  defaultAccess: AccessLevel
  updatedAt: string
}

export interface JournalDto extends JournalSummaryDto {
  content: string
  grants: Record<string, AccessLevel>
}
