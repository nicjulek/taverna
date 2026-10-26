import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  ASSET_MAX_BYTES,
  type AssetDto,
  ASSET_TYPES,
  defaultAssetKind,
  isAudio,
  isGameMaster,
  type UpdateAssetInput
} from '@taverna/shared'
import { and, desc, eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { assetBlobs, assets } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'
import { compressImage } from './compress'
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

  async upload(campaignId: string, userId: string, file: Express.Multer.File | undefined, wanted?: string): Promise<AssetDto> {
    await this.access.requireMember(campaignId, userId)
    if (!file) throw new BadRequestException('Escolha um arquivo')
    if (file.size > ASSET_MAX_BYTES) throw new BadRequestException('O arquivo pode ter até 25 MB')
    const mime = sniffMime(file.buffer)
    if (!mime) throw new BadRequestException(`Formato não aceito. Use ${Object.values(ASSET_TYPES).join(', ')}.`)
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[\\/]/g, '').trim().slice(0, 120) || 'arquivo'
    const kind = defaultAssetKind(mime, wanted)
    const stored = await compressImage(file.buffer, mime, kind)
    const row = await this.store(campaignId, userId, { name, kind, mime: stored.mime, data: stored.data, originalSize: file.size })
    this.realtime.changed(campaignId, 'assets')
    return this.toDto(row)
  }

  async store(
    campaignId: string,
    userId: string | null,
    input: { name: string; kind: AssetDto['kind']; mime: AssetDto['mime']; data: Buffer; originalSize?: number },
    tx: Pick<Database, 'insert'> = this.db
  ): Promise<AssetRow> {
    const [asset] = await tx
      .insert(assets)
      .values({
        campaignId,
        uploaderId: userId,
        name: input.name,
        mime: input.mime,
        kind: input.kind,
        size: input.data.length,
        originalSize: input.originalSize ?? input.data.length
      })
      .returning()
    await tx.insert(assetBlobs).values({ assetId: asset!.id, data: input.data })
    return asset!
  }

  async update(campaignId: string, id: string, userId: string, input: UpdateAssetInput): Promise<AssetDto> {
    const row = await this.editable(campaignId, id, userId)
    if (input.kind && (input.kind === 'audio') !== isAudio(row.mime))
      throw new BadRequestException(isAudio(row.mime) ? 'Áudio só pode ficar entre os áudios' : 'Só arquivos de som vão para os áudios')
    const [updated] = await this.db
      .update(assets)
      .set({ ...(input.name ? { name: input.name } : {}), ...(input.kind ? { kind: input.kind } : {}) })
      .where(eq(assets.id, id))
      .returning()
    this.realtime.changed(campaignId, 'assets')
    return this.toDto(updated!)
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
    await this.editable(campaignId, id, userId)
    await this.db.delete(assets).where(eq(assets.id, id))
    this.realtime.changed(campaignId, 'assets')
  }

  private async editable(campaignId: string, id: string, userId: string): Promise<AssetRow> {
    const role = await this.access.requireMember(campaignId, userId)
    const [row] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.campaignId, campaignId)))
    if (!row) throw new NotFoundException('Arquivo não encontrado')
    if (!isGameMaster(role) && row.uploaderId !== userId) throw new ForbiddenException('Só quem enviou ou os mestres mexem')
    return row
  }

  private toDto(row: AssetRow): AssetDto {
    return {
      id: row.id,
      name: row.name,
      mime: row.mime,
      kind: row.kind,
      size: row.size,
      originalSize: row.originalSize || row.size,
      url: `/api/assets/${row.id}`,
      uploaderId: row.uploaderId,
      createdAt: row.createdAt.toISOString()
    }
  }
}
