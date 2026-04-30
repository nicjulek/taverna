import { z } from 'zod'

export const COMPENDIUM_KINDS = ['spell', 'monster', 'item', 'condition', 'race', 'feat', 'background'] as const
export type CompendiumKind = (typeof COMPENDIUM_KINDS)[number]

export const COMPENDIUM_KIND_LABELS: Record<CompendiumKind, { one: string; many: string }> = {
  spell: { one: 'Magia', many: 'Magias' },
  monster: { one: 'Monstro', many: 'Monstros' },
  item: { one: 'Item', many: 'Itens' },
  condition: { one: 'Condição', many: 'Condições' },
  race: { one: 'Raça', many: 'Raças' },
  feat: { one: 'Talento', many: 'Talentos' },
  background: { one: 'Antecedente', many: 'Antecedentes' }
}

export const HOMEBREW_KINDS = ['spell', 'monster', 'item', 'condition', 'feat'] as const satisfies readonly CompendiumKind[]

export const SPELL_SCHOOLS: Record<string, string> = {
  abjuration: 'Abjuração',
  conjuration: 'Conjuração',
  divination: 'Adivinhação',
  enchantment: 'Encantamento',
  evocation: 'Evocação',
  illusion: 'Ilusão',
  necromancy: 'Necromancia',
  transmutation: 'Transmutação'
}

export const MONSTER_TYPES: Record<string, string> = {
  aberration: 'Aberração',
  beast: 'Fera',
  celestial: 'Celestial',
  construct: 'Constructo',
  dragon: 'Dragão',
  elemental: 'Elemental',
  fey: 'Fada',
  fiend: 'Corruptor',
  giant: 'Gigante',
  humanoid: 'Humanoide',
  monstrosity: 'Monstruosidade',
  ooze: 'Limo',
  plant: 'Planta',
  swarm: 'Enxame',
  undead: 'Morto-vivo'
}

export const ITEM_CATEGORIES: Record<string, string> = {
  weapon: 'Armas',
  armor: 'Armaduras',
  gear: 'Equipamento',
  tool: 'Ferramentas',
  mount: 'Montarias e veículos',
  magic: 'Itens mágicos'
}

export const ITEM_RARITIES: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  'very-rare': 'Muito raro',
  legendary: 'Lendário',
  artifact: 'Artefato',
  varies: 'Varia'
}

export const compendiumQuerySchema = z.object({
  kind: z.enum(COMPENDIUM_KINDS).optional(),
  q: z.string().trim().max(80).optional(),
  source: z.enum(['srd', 'homebrew']).optional(),
  level: z.coerce.number().int().min(0).max(9).optional(),
  school: z.string().max(20).optional(),
  className: z.string().max(20).optional(),
  type: z.string().max(20).optional(),
  crMin: z.coerce.number().min(0).max(30).optional(),
  crMax: z.coerce.number().min(0).max(30).optional(),
  category: z.string().max(20).optional(),
  rarity: z.string().max(20).optional(),
  offset: z.coerce.number().int().min(0).max(5000).default(0)
})

export type CompendiumQuery = z.input<typeof compendiumQuerySchema>
export type CompendiumFilters = z.output<typeof compendiumQuerySchema>

const meta = z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean(), z.null(), z.array(z.string().max(40)).max(20)]))

export const homebrewSchema = z.object({
  kind: z.enum(HOMEBREW_KINDS),
  name: z.string().trim().min(1, 'Dê um nome').max(80),
  summary: z.string().trim().max(160).default(''),
  meta: meta.default({}),
  body: z.string().max(20_000).default(''),
  data: z.record(z.string(), z.unknown()).default({}),
  published: z.boolean().default(false)
})

export type HomebrewInput = z.input<typeof homebrewSchema>

export interface CompendiumSummaryDto {
  id: string
  kind: CompendiumKind
  name: string
  summary: string
  source: 'srd' | 'homebrew'
  lang: string
  published: boolean
  meta: Record<string, unknown>
}

export interface MonsterAction {
  name: string
  desc: string
  attackBonus: number | null
  damage: { dice: string; type: string }[]
  dc: { ability: string; value: number } | null
}

export interface CompendiumEntryDto extends CompendiumSummaryDto {
  body: string
  data: Record<string, unknown>
  authorId: string | null
  updatedAt: string
}

export const COMPENDIUM_PAGE_SIZE = 40

export const SRD_ATTRIBUTION =
  'Este trabalho inclui material do System Reference Document 5.1 (SRD 5.1) da Wizards of the Coast LLC, disponível em https://dnd.wizards.com/resources/systems-reference-document, sob a licença Creative Commons Atribuição 4.0 Internacional (https://creativecommons.org/licenses/by/4.0/legalcode).'
