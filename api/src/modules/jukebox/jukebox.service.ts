import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { isAudio, isGameMaster, type JukeboxDto, type JukeboxInput, type SfxInput } from '@taverna/shared'
import { and, eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { assets, jukebox } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'

@Injectable()
export class JukeboxService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async get(campaignId: string, userId: string): Promise<JukeboxDto> {
    await this.access.requireMember(campaignId, userId)
    return this.state(campaignId)
  }

  async set(campaignId: string, userId: string, input: JukeboxInput): Promise<JukeboxDto> {
    await this.requireGameMaster(campaignId, userId)
    if (input.assetId) await this.audio(campaignId, input.assetId)
    const values = {
      assetId: input.assetId,
      playing: input.assetId ? input.playing : false,
      position: input.position,
      loop: input.loop ?? true,
      volume: input.volume ?? 0.8,
      updatedAt: new Date()
    }
    await this.db
      .insert(jukebox)
      .values({ campaignId, ...values })
      .onConflictDoUpdate({ target: jukebox.campaignId, set: values })
    const state = await this.state(campaignId)
    this.realtime.emit({ campaignId }, 'jukebox:update', { campaignId, state })
    return state
  }

  async sfx(campaignId: string, userId: string, input: SfxInput): Promise<void> {
    await this.requireGameMaster(campaignId, userId)
    await this.audio(campaignId, input.assetId)
    this.realtime.emit({ campaignId }, 'jukebox:sfx', { campaignId, url: `/api/assets/${input.assetId}`, volume: input.volume ?? 1 })
  }

  private async state(campaignId: string): Promise<JukeboxDto> {
    const [row] = await this.db
      .select({ state: jukebox, name: assets.name })
      .from(jukebox)
      .leftJoin(assets, eq(assets.id, jukebox.assetId))
      .where(eq(jukebox.campaignId, campaignId))
    const now = new Date().toISOString()
    if (!row)
      return { assetId: null, url: null, name: null, playing: false, position: 0, loop: true, volume: 0.8, updatedAt: now, serverTime: now }
    const { state } = row
    return {
      assetId: state.assetId,
      url: state.assetId ? `/api/assets/${state.assetId}` : null,
      name: row.name,
      playing: state.playing && state.assetId !== null,
      position: state.position,
      loop: state.loop,
      volume: state.volume,
      updatedAt: state.updatedAt.toISOString(),
      serverTime: now
    }
  }

  private async audio(campaignId: string, assetId: string): Promise<void> {
    const [asset] = await this.db
      .select({ mime: assets.mime })
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.campaignId, campaignId)))
    if (!asset || !isAudio(asset.mime)) throw new BadRequestException('Escolha um áudio da galeria desta campanha')
  }

  private async requireGameMaster(campaignId: string, userId: string): Promise<void> {
    const role = await this.access.requireMember(campaignId, userId)
    if (!isGameMaster(role)) throw new ForbiddenException('Só os mestres mexem na trilha')
  }
}
