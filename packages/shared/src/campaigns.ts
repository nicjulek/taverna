import { z } from 'zod'

export const RULE_SYSTEMS = ['dnd5e'] as const
export type RuleSystemId = (typeof RULE_SYSTEMS)[number]

export const MAX_MEMBERS = 12

export const ROLES = ['gm', 'cogm', 'player'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  gm: 'Mestre',
  cogm: 'Co-mestre',
  player: 'Jogador'
}

export function isGameMaster(role: Role | null | undefined): boolean {
  return role === 'gm' || role === 'cogm'
}

export const createCampaignSchema = z.object({
  name: z.string().trim().min(2, 'Dê um nome com pelo menos 2 letras').max(60),
  description: z.string().trim().max(500).default(''),
  system: z.enum(RULE_SYSTEMS).default('dnd5e')
})

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(500).optional()
})

export const updateMemberSchema = z.object({
  role: z.enum(['cogm', 'player'])
})

export type CreateCampaignInput = z.input<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>

export interface MemberDto {
  userId: string
  displayName: string
  color: string
  role: Role
  joinedAt: string
}

export interface CampaignSummaryDto {
  id: string
  name: string
  description: string
  system: RuleSystemId
  role: Role
  members: number
  updatedAt: string
}

export interface CampaignDto extends CampaignSummaryDto {
  ownerId: string
  inviteCode: string | null
  memberList: MemberDto[]
}

export interface InvitePreviewDto {
  campaignId: string
  name: string
  description: string
  system: RuleSystemId
  gmName: string
  members: number
  alreadyMember: boolean
}
