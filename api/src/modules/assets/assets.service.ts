import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ASSET_MAX_BYTES, type AssetDto, ASSET_TYPES, isGameMaster } from '@taverna/shared'
import { and, desc, eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { assetBlobs, assets } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'
import { sniffMime } from './sniff'

type AssetRow = typeof assets.$inferSelect

@Injectable()
export class AssetsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async list(campaignId: string, userId: string): Promise<AssetDto[]> {
    await this.access.requireMember(campaignId, userId)
    const rows = await this.db.select().from(assets).where(eq(assets.campaignId, campaignId)).orderBy(desc(assets.createdAt))
    return rows.map((row) => this.toDto(row))
  }

  async upload(campaignId: string, userId: string, file: Express.Multer.File | undefined): Promise<AssetDto> {
    await this.access.requireMember(campaignId, userId)
    if (!file) throw new BadRequestException('Escolha um arquivo')
    if (file.size > ASSET_MAX_BYTES) throw new BadRequestException('O arquivo pode ter até 25 MB')
    const mime = sniffMime(file.buffer)
    if (!mime) throw new BadRequestException(`Formato não aceito. Use ${Object.values(ASSET_TYPES).join(', ')}.`)
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[\\/]/g, '').trim().slice(0, 120) || 'mapa'
    const row = await this.db.transaction(async (tx) => {
      const [asset] = await tx.insert(assets).values({ campaignId, uploaderId: userId, name, mime, size: file.size }).returning()
      await tx.insert(assetBlobs).values({ assetId: asset!.id, data: file.buffer })
      return asset!
    })
    this.realtime.changed(campaignId, 'assets')
    return this.toDto(row)
  }

  async file(id: string, userId: string): Promise<{ mime: AssetRow['mime']; data: Buffer; size: number }> {
    const [row] = await this.db
      .select({ campaignId: assets.campaignId, mime: assets.mime, size: assets.size, data: assetBlobs.data })
      .from(assets)
      .innerJoin(assetBlobs, eq(assetBlobs.assetId, assets.id))
      .where(eq(assets.id, id))
    if (!row) throw new NotFoundException('Arquivo não encontrado')
    await this.access.requireMember(row.campaignId, userId)
    return row
  }

  async remove(campaignId: string, id: string, userId: string): Promise<void> {
    const role = await this.access.requireMember(campaignId, userId)
    const [row] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.campaignId, campaignId)))
    if (!row) throw new NotFoundException('Arquivo não encontrado')
    if (!isGameMaster(role) && row.uploaderId !== userId) throw new ForbiddenException('Só quem enviou ou os mestres apagam')
    await this.db.delete(assets).where(eq(assets.id, id))
    this.realtime.changed(campaignId, 'assets')
  }

  private toDto(row: AssetRow): AssetDto {
    return {
      id: row.id,
      name: row.name,
      mime: row.mime,
      size: row.size,
      url: `/api/assets/${row.id}`,
      uploaderId: row.uploaderId,
      createdAt: row.createdAt.toISOString()
    }
  }
}
