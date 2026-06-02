import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  type CreateSceneInput,
  DEFAULT_SCENE_SETTINGS,
  isGameMaster,
  PLAYER_ITEM_KINDS,
  type Role,
  type SceneDto,
  type SceneItemDto,
  type SceneItemValues,
  type SceneWithItemsDto,
  type UpdateSceneInput,
  type UpdateSceneItemInput
} from '@taverna/shared'
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, sceneItems, scenes } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'

type SceneRow = typeof scenes.$inferSelect
type ItemRow = typeof sceneItems.$inferSelect

@Injectable()
export class ScenesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async list(campaignId: string, userId: string): Promise<SceneDto[]> {
    const role = await this.access.requireMember(campaignId, userId)
    const where = isGameMaster(role) ? eq(scenes.campaignId, campaignId) : and(eq(scenes.campaignId, campaignId), eq(scenes.active, true))
    const rows = await this.db.select().from(scenes).where(where).orderBy(asc(scenes.sortOrder), asc(scenes.createdAt))
    return rows.map((row) => this.toScene(row))
  }

  async active(campaignId: string, userId: string): Promise<SceneWithItemsDto | null> {
    const role = await this.access.requireMember(campaignId, userId)
    const [row] = await this.db
      .select()
      .from(scenes)
      .where(and(eq(scenes.campaignId, campaignId), eq(scenes.active, true)))
    return row ? this.withItems(row, role) : null
  }

  async get(campaignId: string, sceneId: string, userId: string): Promise<SceneWithItemsDto> {
    const role = await this.access.requireMember(campaignId, userId)
    return this.withItems(await this.find(campaignId, sceneId, role), role)
  }

  async create(campaignId: string, userId: string, input: CreateSceneInput): Promise<SceneDto> {
    await this.requireGameMaster(campaignId, userId)
    const [{ count, max }] = (await this.db
      .select({ count: sql<number>`count(*)::int`, max: sql<number>`coalesce(max(${scenes.sortOrder}), -1)::int` })
      .from(scenes)
      .where(eq(scenes.campaignId, campaignId))) as [{ count: number; max: number }]
    const [row] = await this.db
      .insert(scenes)
      .values({ campaignId, name: input.name, settings: input.settings ?? DEFAULT_SCENE_SETTINGS, sortOrder: max + 1, active: count === 0 })
      .returning()
    this.realtime.emit({ campaignId }, 'scene:list', { campaignId })
    if (row!.active) this.realtime.emit({ campaignId }, 'scene:active', { campaignId, sceneId: row!.id })
    return this.toScene(row!)
  }

  async update(campaignId: string, sceneId: string, userId: string, input: UpdateSceneInput): Promise<SceneDto> {
    const role = await this.requireGameMaster(campaignId, userId)
    await this.find(campaignId, sceneId, role)
    const [row] = await this.db.update(scenes).set(input).where(eq(scenes.id, sceneId)).returning()
    this.realtime.emit({ campaignId }, 'scene:list', { campaignId })
    return this.toScene(row!)
  }

  async remove(campaignId: string, sceneId: string, userId: string): Promise<void> {
    const role = await this.requireGameMaster(campaignId, userId)
    const scene = await this.find(campaignId, sceneId, role)
    await this.db.delete(scenes).where(eq(scenes.id, sceneId))
    this.realtime.emit({ campaignId }, 'scene:list', { campaignId })
    if (scene.active) this.realtime.emit({ campaignId }, 'scene:active', { campaignId, sceneId: null })
  }

  async activate(campaignId: string, sceneId: string, userId: string): Promise<SceneDto> {
    const role = await this.requireGameMaster(campaignId, userId)
    await this.find(campaignId, sceneId, role)
    const row = await this.db.transaction(async (tx) => {
      await tx
        .update(scenes)
        .set({ active: false })
        .where(and(eq(scenes.campaignId, campaignId), ne(scenes.id, sceneId)))
      const [updated] = await tx.update(scenes).set({ active: true }).where(eq(scenes.id, sceneId)).returning()
      return updated!
    })
    this.realtime.emit({ campaignId }, 'scene:active', { campaignId, sceneId })
    this.realtime.emit({ campaignId }, 'scene:list', { campaignId })
    return this.toScene(row)
  }

  async duplicate(campaignId: string, sceneId: string, userId: string): Promise<SceneDto> {
    const role = await this.requireGameMaster(campaignId, userId)
    const source = await this.find(campaignId, sceneId, role)
    const copy = await this.create(campaignId, userId, { name: `${source.name} (cópia)`.slice(0, 60), settings: source.settings })
    const items = await this.db.select().from(sceneItems).where(eq(sceneItems.sceneId, sceneId))
    if (items.length > 0) {
      await this.db
        .insert(sceneItems)
        .values(items.map(({ id: _id, sceneId: _scene, createdAt: _c, updatedAt: _u, ...rest }) => ({ ...rest, sceneId: copy.id })))
    }
    return copy
  }

  async createItem(campaignId: string, sceneId: string, userId: string, input: SceneItemValues): Promise<SceneItemDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const scene = await this.find(campaignId, sceneId, role)
    const gm = isGameMaster(role)
    if (!gm) {
      if (!PLAYER_ITEM_KINDS.includes(input.kind)) throw new ForbiddenException('Só os mestres colocam mapas e vídeos')
      if (input.layer === 'gm' || input.layer === 'map')
        throw new ForbiddenException('Jogadores desenham na camada de objetos ou de tokens')
    }
    const [{ max }] = (await this.db
      .select({ max: sql<number>`coalesce(max(${sceneItems.z}), 0)::int` })
      .from(sceneItems)
      .where(eq(sceneItems.sceneId, sceneId))) as [{ max: number }]
    const [row] = await this.db
      .insert(sceneItems)
      .values({
        ...input,
        z: input.z ?? max + 1,
        ownerId: gm ? (input.ownerId ?? null) : userId,
        createdBy: userId,
        sceneId
      })
      .returning()
    await this.publish(campaignId, scene, row!)
    return this.toItem(row!)
  }

  async updateItem(
    campaignId: string,
    sceneId: string,
    itemId: string,
    userId: string,
    input: UpdateSceneItemInput
  ): Promise<SceneItemDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const scene = await this.find(campaignId, sceneId, role)
    const item = await this.findItem(sceneId, itemId, role)
    if (!isGameMaster(role)) {
      const mine = item.createdBy === userId || item.ownerId === userId
      if (!mine) throw new ForbiddenException('Você só mexe no que é seu')
      if (item.locked) throw new ForbiddenException('Esse item está travado pelo mestre')
      if (input.layer === 'gm' || input.layer === 'map' || input.locked !== undefined || input.ownerId !== undefined)
        throw new ForbiddenException('Só os mestres mudam camada, trava e dono')
    }
    const [row] = await this.db.update(sceneItems).set(input).where(eq(sceneItems.id, itemId)).returning()
    await this.publish(campaignId, scene, row!, item.layer)
    return this.toItem(row!)
  }

  async removeItem(campaignId: string, sceneId: string, itemId: string, userId: string): Promise<void> {
    const role = await this.access.requireMember(campaignId, userId)
    const scene = await this.find(campaignId, sceneId, role)
    const item = await this.findItem(sceneId, itemId, role)
    if (!isGameMaster(role) && item.createdBy !== userId) throw new ForbiddenException('Você só apaga o que criou')
    await this.db.delete(sceneItems).where(eq(sceneItems.id, itemId))
    const payload = { campaignId, sceneId, id: itemId }
    if (scene.active && item.layer !== 'gm') this.realtime.emit({ campaignId }, 'scene:item:removed', payload)
    else this.realtime.emit({ userIds: await this.masters(campaignId) }, 'scene:item:removed', payload)
  }

  private async publish(campaignId: string, scene: SceneRow, row: ItemRow, previousLayer?: string): Promise<void> {
    const item = this.toItem(row)
    const payload = { campaignId, sceneId: scene.id, item }
    if (scene.active && row.layer !== 'gm') {
      this.realtime.emit({ campaignId }, 'scene:item', payload)
      return
    }
    if (scene.active && previousLayer && previousLayer !== 'gm') {
      this.realtime.emit({ campaignId }, 'scene:item:removed', { campaignId, sceneId: scene.id, id: row.id })
    }
    this.realtime.emit({ userIds: await this.masters(campaignId) }, 'scene:item', payload)
  }

  private async masters(campaignId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: campaignMembers.userId })
      .from(campaignMembers)
      .where(and(eq(campaignMembers.campaignId, campaignId), inArray(campaignMembers.role, ['gm', 'cogm'])))
    return rows.map((row) => row.userId)
  }

  private async requireGameMaster(campaignId: string, userId: string): Promise<Role> {
    const role = await this.access.requireMember(campaignId, userId)
    if (!isGameMaster(role)) throw new ForbiddenException('Só os mestres mexem nas cenas')
    return role
  }

  private async find(campaignId: string, sceneId: string, role: Role): Promise<SceneRow> {
    const [row] = await this.db
      .select()
      .from(scenes)
      .where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, campaignId)))
    if (!row || (!isGameMaster(role) && !row.active)) throw new NotFoundException('Cena não encontrada')
    return row
  }

  private async findItem(sceneId: string, itemId: string, role: Role): Promise<ItemRow> {
    const [row] = await this.db
      .select()
      .from(sceneItems)
      .where(and(eq(sceneItems.id, itemId), eq(sceneItems.sceneId, sceneId)))
    if (!row || (!isGameMaster(role) && row.layer === 'gm')) throw new NotFoundException('Item não encontrado')
    return row
  }

  private async withItems(row: SceneRow, role: Role): Promise<SceneWithItemsDto> {
    const where = isGameMaster(role) ? eq(sceneItems.sceneId, row.id) : and(eq(sceneItems.sceneId, row.id), ne(sceneItems.layer, 'gm'))
    const items = await this.db.select().from(sceneItems).where(where).orderBy(asc(sceneItems.z))
    return { ...this.toScene(row), items: items.map((item) => this.toItem(item)) }
  }

  private toScene(row: SceneRow): SceneDto {
    return {
      id: row.id,
      campaignId: row.campaignId,
      name: row.name,
      sortOrder: row.sortOrder,
      active: row.active,
      settings: row.settings,
      updatedAt: row.updatedAt.toISOString()
    }
  }

  private toItem(row: ItemRow): SceneItemDto {
    return {
      id: row.id,
      sceneId: row.sceneId,
      layer: row.layer,
      kind: row.kind,
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      rotation: row.rotation,
      flipX: row.flipX,
      flipY: row.flipY,
      locked: row.locked,
      z: row.z,
      ownerId: row.ownerId,
      createdBy: row.createdBy,
      data: row.data,
      updatedAt: row.updatedAt.toISOString()
    }
  }
}
