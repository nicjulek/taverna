import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  type CreateHandoutInput,
  type HandoutDto,
  isGameMaster,
  isVisual,
  type ShowHandoutInput,
  type UpdateHandoutInput
} from '@taverna/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { assets, campaignMembers, handouts } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'

type HandoutRow = typeof handouts.$inferSelect

@Injectable()
export class HandoutsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async list(campaignId: string, userId: string): Promise<HandoutDto[]> {
    const role = await this.access.requireMember(campaignId, userId)
    const rows = await this.db
      .select()
      .from(handouts)
      .where(
        and(
          eq(handouts.campaignId, campaignId),
          isGameMaster(role)
            ? undefined
            : sql`(${handouts.sharedWith} = '"all"'::jsonb or ${handouts.sharedWith} @> ${JSON.stringify([userId])}::jsonb)`
        )
      )
      .orderBy(desc(handouts.updatedAt))
    return rows.map((row) => this.toDto(row, isGameMaster(role)))
  }

  async create(campaignId: string, userId: string, input: CreateHandoutInput): Promise<HandoutDto> {
    await this.requireGameMaster(campaignId, userId)
    await this.checkAsset(campaignId, input.assetId ?? null)
    const [row] = await this.db
      .insert(handouts)
      .values({ campaignId, title: input.title, kind: input.kind ?? 'letter', body: input.body ?? '', assetId: input.assetId ?? null })
      .returning()
    this.realtime.changed(campaignId, 'handouts', row!.id)
    return this.toDto(row!, true)
  }

  async update(campaignId: string, id: string, userId: string, input: UpdateHandoutInput): Promise<HandoutDto> {
    await this.requireGameMaster(campaignId, userId)
    await this.find(campaignId, id)
    if (input.assetId !== undefined) await this.checkAsset(campaignId, input.assetId)
    const [row] = await this.db
      .update(handouts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(handouts.id, id))
      .returning()
    this.realtime.changed(campaignId, 'handouts', id)
    return this.toDto(row!, true)
  }

  async remove(campaignId: string, id: string, userId: string): Promise<void> {
    await this.requireGameMaster(campaignId, userId)
    await this.find(campaignId, id)
    await this.db.delete(handouts).where(eq(handouts.id, id))
    this.realtime.changed(campaignId, 'handouts', id)
  }

  async show(campaignId: string, id: string, userId: string, input: ShowHandoutInput): Promise<HandoutDto> {
    await this.requireGameMaster(campaignId, userId)
    await this.find(campaignId, id)
    let sharedWith: HandoutRow['sharedWith'] = input.to
    if (Array.isArray(input.to)) {
      const members = await this.db
        .select({ userId: campaignMembers.userId })
        .from(campaignMembers)
        .where(eq(campaignMembers.campaignId, campaignId))
      const ids = new Set(members.map((m) => m.userId))
      if (input.to.some((u) => !ids.has(u))) throw new BadRequestException('Só dá para mostrar a quem está na campanha')
      sharedWith = [...new Set(input.to)]
    }
    const [row] = await this.db
      .update(handouts)
      .set({ sharedWith: sql`${JSON.stringify(sharedWith)}::jsonb`, updatedAt: new Date() })
      .where(eq(handouts.id, id))
      .returning()
    const dto = this.toDto(row!, false)
    this.realtime.changed(campaignId, 'handouts', id)
    if (sharedWith === 'all') this.realtime.emit({ campaignId }, 'handout:show', dto)
    else if (Array.isArray(sharedWith)) this.realtime.emit({ userIds: sharedWith }, 'handout:show', dto)
    return this.toDto(row!, true)
  }

  private toDto(row: HandoutRow, gm: boolean): HandoutDto {
    return {
      id: row.id,
      campaignId: row.campaignId,
      title: row.title,
      kind: row.kind,
      body: row.body,
      assetId: row.assetId,
      imageUrl: row.assetId ? `/api/assets/${row.assetId}` : null,
      sharedWith: gm ? row.sharedWith : 'all',
      updatedAt: row.updatedAt.toISOString()
    }
  }

  private async checkAsset(campaignId: string, assetId: string | null): Promise<void> {
    if (!assetId) return
    const [asset] = await this.db
      .select({ mime: assets.mime })
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.campaignId, campaignId)))
    if (!asset || !isVisual(asset.mime)) throw new BadRequestException('Escolha uma imagem da galeria desta campanha')
  }

  private async find(campaignId: string, id: string): Promise<HandoutRow> {
    const [row] = await this.db
      .select()
      .from(handouts)
      .where(and(eq(handouts.id, id), eq(handouts.campaignId, campaignId)))
    if (!row) throw new NotFoundException('Revelação não encontrada')
    return row
  }

  private async requireGameMaster(campaignId: string, userId: string): Promise<void> {
    const role = await this.access.requireMember(campaignId, userId)
    if (!isGameMaster(role)) throw new ForbiddenException('Só os mestres preparam revelações')
  }
}
