import { z } from 'zod'

export const HANDOUT_KINDS = ['letter', 'riddle', 'portrait', 'item', 'image'] as const
export type HandoutKind = (typeof HANDOUT_KINDS)[number]

export const HANDOUT_KIND_LABELS: Record<HandoutKind, string> = {
  letter: 'Carta',
  riddle: 'Enigma',
  portrait: 'Retrato de NPC',
  item: 'Item',
  image: 'Imagem'
}

const fields = {
  title: z.string().trim().min(1, 'Dê um título').max(80),
  kind: z.enum(HANDOUT_KINDS).default('letter'),
  body: z.string().max(5000).default(''),
  assetId: z.uuid().nullable().default(null)
}

export const createHandoutSchema = z.object(fields)
export const updateHandoutSchema = z.object({
  title: fields.title.optional(),
  kind: z.enum(HANDOUT_KINDS).optional(),
  body: z.string().max(5000).optional(),
  assetId: z.uuid().nullable().optional()
})
export const showHandoutSchema = z.object({ to: z.union([z.literal('all'), z.literal('none'), z.array(z.uuid()).min(1).max(30)]) })

export type CreateHandoutInput = z.input<typeof createHandoutSchema>
export type UpdateHandoutInput = z.infer<typeof updateHandoutSchema>
export type ShowHandoutInput = z.infer<typeof showHandoutSchema>

export interface HandoutDto {
  id: string
  campaignId: string
  title: string
  kind: HandoutKind
  body: string
  assetId: string | null
  imageUrl: string | null
  sharedWith: 'all' | 'none' | string[]
  updatedAt: string
}
