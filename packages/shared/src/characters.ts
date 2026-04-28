import type { Sheet5e } from '@taverna/rules-5e'
import { z } from 'zod'
import { accessSchema, type AccessLevel } from './permissions'

const ABILITY = z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])
const SKILL = z.enum([
  'acrobatics',
  'animal-handling',
  'arcana',
  'athletics',
  'performance',
  'deception',
  'stealth',
  'history',
  'intimidation',
  'insight',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'persuasion',
  'sleight-of-hand',
  'religion',
  'survival'
])
const text = (max: number) => z.string().max(max)
const int = (min: number, max: number) => z.number().int().min(min).max(max)
const id = z.string().min(1).max(40)

export const sheet5eSchema = z.object({
  race: text(60),
  background: text(60),
  alignment: text(40),
  classes: z
    .array(
      z.object({
        key: z.enum([
          'barbarian',
          'bard',
          'warlock',
          'cleric',
          'druid',
          'sorcerer',
          'fighter',
          'rogue',
          'wizard',
          'monk',
          'paladin',
          'ranger'
        ]),
        level: int(1, 20),
        caster: z.enum(['full', 'half', 'third', 'pact', 'none']),
        subclass: text(60)
      })
    )
    .min(1)
    .max(12)
    .refine((list) => list.reduce((sum, c) => sum + c.level, 0) <= 20, 'A soma dos níveis vai até 20'),
  abilities: z.object({ str: int(1, 30), dex: int(1, 30), con: int(1, 30), int: int(1, 30), wis: int(1, 30), cha: int(1, 30) }),
  saves: z.array(ABILITY).max(6),
  skills: z.partialRecord(SKILL, z.enum(['none', 'proficient', 'expertise'])),
  jackOfAllTrades: z.boolean(),
  halflingLucky: z.boolean(),
  armorClass: int(0, 40),
  speed: int(0, 60),
  initiativeBonus: int(-10, 20),
  hp: z.object({ current: int(0, 9999), max: int(1, 9999), temporary: int(0, 9999) }),
  hitDiceUsed: z.partialRecord(z.enum(['d6', 'd8', 'd10', 'd12']), int(0, 20)),
  deathSaves: z.object({ successes: int(0, 3), failures: int(0, 3) }),
  inspiration: z.boolean(),
  spellAbility: ABILITY.nullable(),
  slotsUsed: z.array(int(0, 9)).length(9),
  pactUsed: int(0, 4),
  concentration: text(80),
  spells: z.array(z.object({ id, name: text(80).min(1), level: int(0, 9), prepared: z.boolean(), notes: text(500) })).max(200),
  attacks: z
    .array(
      z.object({
        id,
        name: text(60).min(1),
        ability: ABILITY,
        proficient: z.boolean(),
        bonus: int(-10, 20),
        damage: text(60),
        damageType: text(30)
      })
    )
    .max(30),
  resources: z
    .array(z.object({ id, name: text(40).min(1), max: int(1, 99), used: int(0, 99), reset: z.enum(['short', 'long', 'none']) }))
    .max(30),
  notes: text(20_000)
}) satisfies z.ZodType<Sheet5e>

export const createCharacterSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome').max(60),
  classKey: z.enum([
    'barbarian',
    'bard',
    'warlock',
    'cleric',
    'druid',
    'sorcerer',
    'fighter',
    'rogue',
    'wizard',
    'monk',
    'paladin',
    'ranger'
  ]),
  level: z.number().int().min(1).max(20).default(1),
  race: z.string().trim().max(60).default('')
})

export const updateCharacterSchema = z.object({
  version: z.number().int().min(1),
  name: z.string().trim().min(1).max(60).optional(),
  sheet: sheet5eSchema.optional(),
  access: accessSchema.optional()
})

export type CreateCharacterInput = z.input<typeof createCharacterSchema>
export type UpdateCharacterInput = Omit<z.infer<typeof updateCharacterSchema>, 'sheet'> & { sheet?: Sheet5e }

export interface CharacterSummaryDto {
  id: string
  name: string
  ownerId: string
  ownerName: string
  ownerColor: string
  summary: { race: string; classes: { key: string; level: number }[]; hp: Sheet5e['hp']; armorClass: number }
  access: AccessLevel
  defaultAccess: AccessLevel
  updatedAt: string
}

export interface CharacterDto extends CharacterSummaryDto {
  version: number
  sheet: Sheet5e
  grants: Record<string, AccessLevel>
}
