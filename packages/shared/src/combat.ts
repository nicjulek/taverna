import { z } from 'zod'
import { ROLL_VISIBILITIES, type RollDto } from './rolls'

export interface CombatantDto {
  id: string
  tokenId: string | null
  name: string
  initiative: number | null
  bonus: number
  hidden: boolean
  ownerId: string | null
}

export interface CombatDto {
  id: string
  campaignId: string
  sceneId: string
  round: number
  turnId: string | null
  combatants: CombatantDto[]
}

export interface CombatUpdate {
  campaignId: string
  combat: CombatDto | null
  notice?: string
}

export const startCombatSchema = z.object({
  sceneId: z.uuid(),
  tokenIds: z.array(z.uuid()).max(100).default([])
})

export const addCombatantsSchema = z.object({ tokenIds: z.array(z.uuid()).min(1).max(100) })

export const updateCombatantSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  initiative: z.number().int().min(-20).max(60).nullable().optional(),
  bonus: z.number().int().min(-20).max(30).optional(),
  hidden: z.boolean().optional()
})

export const rollInitiativeSchema = z.object({ combatantIds: z.array(z.uuid()).max(100).optional() })

export const ROLL_MODES = ['normal', 'advantage', 'disadvantage'] as const

const damagePart = z.object({ dice: z.string().trim().min(1).max(60), type: z.string().trim().max(30).default('') })

export const attackSchema = z.object({
  sceneId: z.uuid(),
  attackerId: z.uuid(),
  targetId: z.uuid(),
  name: z.string().trim().min(1).max(60),
  bonus: z.number().int().min(-20).max(30),
  damage: z.array(damagePart).max(4).default([]),
  mode: z.enum(ROLL_MODES).default('normal'),
  visibility: z.enum(ROLL_VISIBILITIES).default('public')
})

export const HP_CHANGES = ['damage', 'healing', 'temporary'] as const

export const hpChangeSchema = z.object({
  change: z.enum(HP_CHANGES),
  amount: z.number().int().min(0).max(9999),
  type: z.string().trim().max(30).optional()
})

export type StartCombatInput = z.input<typeof startCombatSchema>
export type AddCombatantsInput = z.infer<typeof addCombatantsSchema>
export type UpdateCombatantInput = z.infer<typeof updateCombatantSchema>
export type RollInitiativeInput = z.infer<typeof rollInitiativeSchema>
export type AttackInput = z.input<typeof attackSchema>
export type HpChangeInput = z.infer<typeof hpChangeSchema>
export type RollModeKey = (typeof ROLL_MODES)[number]

export interface TokenHp {
  current: number
  max: number
  temporary: number
}

export interface HpChangeResult {
  hp: TokenHp
  amount: number
  adjustment: 'normal' | 'resistant' | 'vulnerable' | 'immune'
  droppedToZero: boolean
  concentrationDc: number | null
}

export interface AttackResult {
  attack: RollDto
  hit: boolean
  critical: boolean
  fumble: boolean
  armorClass: number | null
  damage: { roll: RollDto; type: string }[]
}
