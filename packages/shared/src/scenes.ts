import { z } from 'zod'

export const SCENE_LAYERS = ['map', 'objects', 'tokens', 'gm'] as const
export type SceneLayer = (typeof SCENE_LAYERS)[number]

export const SCENE_LAYER_LABELS: Record<SceneLayer, string> = {
  map: 'Mapa',
  objects: 'Objetos e armadilhas',
  tokens: 'Tokens',
  gm: 'Mestre (oculta dos jogadores)'
}

export const SCENE_ITEM_KINDS = [
  'image',
  'video',
  'drawing',
  'rect',
  'ellipse',
  'line',
  'text',
  'marker',
  'token',
  'template',
  'wall',
  'light'
] as const
export type SceneItemKind = (typeof SCENE_ITEM_KINDS)[number]

export const PLAYER_ITEM_KINDS: readonly SceneItemKind[] = ['drawing', 'rect', 'ellipse', 'line', 'text', 'marker', 'template', 'token']

export const BACKGROUND_TEXTURES = ['none', 'parchment', 'stone', 'wood', 'grass'] as const
export type BackgroundTexture = (typeof BACKGROUND_TEXTURES)[number]

export const BACKGROUND_TEXTURE_LABELS: Record<BackgroundTexture, string> = {
  none: 'Liso',
  parchment: 'Pergaminho',
  stone: 'Pedra',
  wood: 'Madeira',
  grass: 'Grama'
}

const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Cor inválida')

export const sceneSettingsSchema = z.object({
  grid: z.object({
    type: z.enum(['square', 'hex', 'none']),
    size: z.number().int().min(20).max(300),
    offsetX: z.number().min(-300).max(300),
    offsetY: z.number().min(-300).max(300),
    color,
    opacity: z.number().min(0).max(1)
  }),
  scale: z.object({ value: z.number().min(0.1).max(1000), unit: z.enum(['m', 'ft']) }),
  diagonal: z.enum(['equal', 'alternate']),
  background: z.object({ color, texture: z.enum(BACKGROUND_TEXTURES) }),
  width: z.number().int().min(1).max(200),
  height: z.number().int().min(1).max(200),
  lighting: z
    .object({
      vision: z.boolean().default(false),
      ambient: z.enum(['bright', 'dim', 'dark']).default('dark'),
      explore: z.boolean().default(true)
    })
    .default({ vision: false, ambient: 'dark', explore: true })
})

export type SceneSettings = z.output<typeof sceneSettingsSchema>

export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  grid: { type: 'square', size: 70, offsetX: 0, offsetY: 0, color: '#000000', opacity: 0.25 },
  scale: { value: 1.5, unit: 'm' },
  diagonal: 'equal',
  background: { color: '#1b2a24', texture: 'none' },
  width: 30,
  height: 20,
  lighting: { vision: false, ambient: 'dark', explore: true }
}

export const AMBIENT_LABELS = { bright: 'Dia claro', dim: 'Penumbra', dark: 'Escuridão' } as const
export const WALL_TYPE_LABELS = { wall: 'Parede', door: 'Porta', window: 'Janela' } as const
export const DOOR_STATE_LABELS = { open: 'Aberta', closed: 'Fechada', locked: 'Trancada' } as const

export const LIGHT_PRESETS = {
  candle: { label: 'Vela', bright: 1, dim: 2 },
  torch: { label: 'Tocha', bright: 4, dim: 8 },
  lamp: { label: 'Lampião', bright: 3, dim: 6 },
  lantern: { label: 'Lanterna coberta', bright: 6, dim: 12 },
  light: { label: 'Magia Luz', bright: 4, dim: 8 },
  daylight: { label: 'Magia Luz do Dia', bright: 12, dim: 24 }
} as const
export type LightPreset = keyof typeof LIGHT_PRESETS

export const DARKVISION_CELLS = [0, 6, 12, 24] as const

export function sceneSettings(value: unknown): SceneSettings {
  const parsed = sceneSettingsSchema.safeParse(value)
  if (parsed.success) return parsed.data
  const base = (value ?? {}) as Partial<SceneSettings>
  return { ...DEFAULT_SCENE_SETTINGS, ...base, lighting: { ...DEFAULT_SCENE_SETTINGS.lighting, ...(base.lighting ?? {}) } }
}

export const doorSchema = z.object({ state: z.enum(['open', 'closed']) })
export const exploredSchema = z.object({ cells: z.array(z.number().int().min(0).max(160_000)).max(160_000) })

export const createSceneSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome').max(60),
  settings: sceneSettingsSchema.optional()
})

export const updateSceneSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  settings: sceneSettingsSchema.optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional()
})

const data = z.record(z.string(), z.unknown()).refine((value) => JSON.stringify(value).length <= 40_000, 'Desenho grande demais')

const coordinate = z.number().min(-100_000).max(100_000)
const dimension = z.number().min(1).max(100_000)

const itemFields = {
  layer: z.enum(SCENE_LAYERS),
  kind: z.enum(SCENE_ITEM_KINDS),
  x: coordinate,
  y: coordinate,
  width: dimension,
  height: dimension,
  rotation: z.number().min(-360).max(360),
  flipX: z.boolean(),
  flipY: z.boolean(),
  locked: z.boolean(),
  z: z.number().int().min(-1_000_000).max(1_000_000),
  ownerId: z.uuid().nullable(),
  data
}

export const sceneItemSchema = z.object({
  layer: z.enum(SCENE_LAYERS),
  kind: z.enum(SCENE_ITEM_KINDS),
  x: coordinate,
  y: coordinate,
  width: dimension,
  height: dimension,
  rotation: z.number().min(-360).max(360).default(0),
  flipX: z.boolean().default(false),
  flipY: z.boolean().default(false),
  locked: z.boolean().default(false),
  z: z.number().int().min(-1_000_000).max(1_000_000).optional(),
  ownerId: z.uuid().nullable().optional(),
  data: data.default({})
})

export const updateSceneItemSchema = z.object(itemFields).partial()

export type CreateSceneInput = z.input<typeof createSceneSchema>
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>
export type SceneItemInput = z.input<typeof sceneItemSchema>
export type SceneItemValues = z.output<typeof sceneItemSchema>
export type UpdateSceneItemInput = z.output<typeof updateSceneItemSchema>

export interface SceneDto {
  id: string
  campaignId: string
  name: string
  sortOrder: number
  active: boolean
  settings: SceneSettings
  explored: string | null
  updatedAt: string
}

export interface SceneItemDto {
  id: string
  sceneId: string
  layer: SceneLayer
  kind: SceneItemKind
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
  locked: boolean
  z: number
  ownerId: string | null
  createdBy: string | null
  data: Record<string, unknown>
  updatedAt: string
}

export interface SceneWithItemsDto extends SceneDto {
  items: SceneItemDto[]
}

export const ASSET_TYPES = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
  'video/webm': 'WebM',
  'video/mp4': 'MP4'
} as const

export type AssetMime = keyof typeof ASSET_TYPES

export const ASSET_MAX_BYTES = 25 * 1024 * 1024

export interface AssetDto {
  id: string
  name: string
  mime: AssetMime
  size: number
  url: string
  uploaderId: string | null
  createdAt: string
}
