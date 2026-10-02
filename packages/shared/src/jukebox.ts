import { z } from 'zod'

export const jukeboxSchema = z.object({
  assetId: z.uuid().nullable(),
  playing: z.boolean(),
  position: z.number().min(0).max(86_400),
  loop: z.boolean().default(true),
  volume: z.number().min(0).max(1).default(0.8)
})

export const sfxSchema = z.object({ assetId: z.uuid(), volume: z.number().min(0).max(1).default(1) })

export type JukeboxInput = z.input<typeof jukeboxSchema>
export type SfxInput = z.input<typeof sfxSchema>

export interface JukeboxDto {
  assetId: string | null
  url: string | null
  name: string | null
  playing: boolean
  position: number
  loop: boolean
  volume: number
  updatedAt: string
  serverTime: string
}

export function jukeboxPosition(state: Pick<JukeboxDto, 'playing' | 'position' | 'updatedAt'>, now: number): number {
  if (!state.playing) return state.position
  return state.position + Math.max(0, (now - Date.parse(state.updatedAt)) / 1000)
}
