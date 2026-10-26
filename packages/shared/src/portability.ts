import type { Sheet5e } from '@taverna/rules-5e'
import { z } from 'zod'
import { sheet5eSchema } from './characters'
import { COMPENDIUM_KINDS } from './compendium'
import { HANDOUT_KINDS } from './handouts'
import { ASSET_KINDS, ASSET_TYPES, SCENE_ITEM_KINDS, SCENE_LAYERS, sceneSettingsSchema } from './scenes'

export const CHARACTER_FORMAT = 'taverna.ficha'
export const CAMPAIGN_FORMAT = 'taverna.campanha'
export const IMPORT_MAX_BYTES = 150 * 1024 * 1024

const ref = z.string().min(1).max(64)
const access = z.enum(['none', 'view', 'edit'])
const record = z.record(z.string(), z.unknown())

export const characterExportSchema = z.object({
  format: z.literal(CHARACTER_FORMAT),
  version: z.literal(1),
  name: z.string().trim().min(1).max(60),
  sheet: sheet5eSchema
})
export type CharacterExport = Omit<z.infer<typeof characterExportSchema>, 'sheet'> & { sheet: Sheet5e }

const finite = z.number().finite()

export const campaignExportSchema = z.object({
  format: z.literal(CAMPAIGN_FORMAT),
  version: z.literal(1),
  exportedAt: z.string().max(40).optional(),
  campaign: z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().max(2000).default(''),
    system: z.literal('dnd5e').default('dnd5e')
  }),
  assets: z
    .array(
      z.object({
        ref,
        name: z.string().min(1).max(120),
        mime: z.enum(Object.keys(ASSET_TYPES) as [keyof typeof ASSET_TYPES, ...(keyof typeof ASSET_TYPES)[]]),
        kind: z.enum(ASSET_KINDS).default('map'),
        data: z.string().max(40 * 1024 * 1024)
      })
    )
    .max(500)
    .default([]),
  journals: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        folder: z.string().max(60).default(''),
        content: z.string().max(200_000).default(''),
        defaultAccess: access.default('none')
      })
    )
    .max(2000)
    .default([]),
  characters: z
    .array(z.object({ ref, name: z.string().trim().min(1).max(60), sheet: sheet5eSchema, defaultAccess: access.default('view') }))
    .max(500)
    .default([]),
  compendium: z
    .array(
      z.object({
        ref,
        kind: z.enum(COMPENDIUM_KINDS),
        name: z.string().min(1).max(120),
        summary: z.string().max(500).default(''),
        lang: z.string().max(10).default('pt-BR'),
        meta: record.default({}),
        body: z.string().max(50_000).default(''),
        data: record.default({}),
        published: z.boolean().default(true)
      })
    )
    .max(2000)
    .default([]),
  srd: z.record(ref, z.string().max(120)).default({}),
  scenes: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        sortOrder: z.number().int().default(0),
        active: z.boolean().default(false),
        settings: sceneSettingsSchema,
        explored: z.string().max(2_000_000).nullable().default(null),
        items: z
          .array(
            z.object({
              layer: z.enum(SCENE_LAYERS),
              kind: z.enum(SCENE_ITEM_KINDS),
              x: finite,
              y: finite,
              width: finite,
              height: finite,
              rotation: finite.default(0),
              flipX: z.boolean().default(false),
              flipY: z.boolean().default(false),
              locked: z.boolean().default(false),
              z: z.number().int().default(0),
              data: record.default({})
            })
          )
          .max(10_000)
          .default([])
      })
    )
    .max(200)
    .default([]),
  handouts: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        kind: z.enum(HANDOUT_KINDS).default('letter'),
        body: z.string().max(5000).default(''),
        asset: ref.nullable().default(null)
      })
    )
    .max(500)
    .default([]),
  jukebox: z
    .object({ asset: ref.nullable(), loop: z.boolean(), volume: z.number().min(0).max(1) })
    .nullable()
    .default(null)
})
type CampaignShape = z.input<typeof campaignExportSchema>
export type CampaignExport = Omit<CampaignShape, 'characters'> & {
  characters: (Omit<NonNullable<CampaignShape['characters']>[number], 'sheet'> & { sheet: Sheet5e })[]
}
export type CampaignImport = z.output<typeof campaignExportSchema>

export function exportFileName(name: string, format: typeof CHARACTER_FORMAT | typeof CAMPAIGN_FORMAT): string {
  const slug =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'taverna'
  return `${slug}.${format === CHARACTER_FORMAT ? 'ficha' : 'campanha'}.json`
}
