import { z } from 'zod'

export const MESSAGE_AUDIENCES = ['all', 'gm', 'whisper'] as const
export type MessageAudience = (typeof MESSAGE_AUDIENCES)[number]

export const createMessageSchema = z
  .object({
    text: z.string().trim().min(1, 'Escreva uma mensagem').max(1000),
    audience: z.enum(MESSAGE_AUDIENCES).default('all'),
    recipients: z.array(z.uuid()).max(20).default([])
  })
  .refine((m) => m.audience !== 'whisper' || m.recipients.length > 0, { message: 'Escolha para quem cochichar', path: ['recipients'] })

export type CreateMessageInput = z.input<typeof createMessageSchema>

export interface MessageDto {
  id: string
  campaignId: string
  userId: string
  displayName: string
  color: string
  text: string
  audience: MessageAudience
  recipients: { userId: string; displayName: string }[]
  createdAt: string
}

export const MESSAGE_PAGE_SIZE = 50
