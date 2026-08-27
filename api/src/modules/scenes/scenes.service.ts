import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  adjustDamage,
  applyDamage,
  applyHealing,
  concentrationDc,
  damageTypeOf,
  type Defenses,
  grantTemporary,
  readEffects,
  type Sheet5e,
  tickEffects
} from '@taverna/rules-5e'
import {
  type CreateSceneInput,
  type HpChangeInput,
  type HpChangeResult,
  DEFAULT_SCENE_SETTINGS,
  isGameMaster,
  PLAYER_ITEM_KINDS,
  type Role,
  sceneSettings,
  type SceneDto,
  type SceneItemDto,
  type SceneItemValues,
  type SceneWithItemsDto,
  type TokenHp,
  type UpdateSceneInput,
  type UpdateSceneItemInput
} from '@taverna/shared'
import { decodeBits, doorState, encodeBits, exploredDims, pathBlocked, setBits, wallSegments, wallType } from '@taverna/tabletop'
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, characters, sceneItems, scenes } from '../../database/schema'
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
      .values({
        campaignId,
        name: input.name,
        settings: input.settings ? sceneSettings(input.settings) : DEFAULT_SCENE_SETTINGS,
        sortOrder: max + 1,
        active: count === 0
      })
      .returning()
    this.realtime.emit({ campaignId }, 'scene:list', { campaignId })
    if (row!.active) this.realtime.emit({ campaignId }, 'scene:active', { campaignId, sceneId: row!.id })
    return this.toScene(row!)
  }

  async update(campaignId: string, sceneId: string, userId: string, input: UpdateSceneInput): Promise<SceneDto> {
    const role = await this.requireGameMaster(campaignId, userId)
    const current = await this.find(campaignId, sceneId, role)
    const before = sceneSettings(current.settings)
    const resized = input.settings && (input.settings.width !== before.width || input.settings.height !== before.height)
    const [row] = await this.db
      .update(scenes)
      .set(resized ? { ...input, explored: null } : input)
      .where(eq(scenes.id, sceneId))
      .returning()
    this.realtime.emit({ campaignId }, 'scene:list', { campaignId })
    if (resized) this.realtime.emit({ campaignId }, 'scene:explored', { campaignId, sceneId, explored: null })
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
        data: input.kind === 'token' ? await this.withVitals(campaignId, input.data ?? {}) : input.data,
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
      if (item.kind === 'token' && (input.x !== undefined || input.y !== undefined)) await this.checkPath(sceneId, item, input)
    }
    const changes = item.kind === 'token' && input.data ? { ...input, data: await this.withVitals(campaignId, input.data) } : input
    const [row] = await this.db.update(sceneItems).set(changes).where(eq(sceneItems.id, itemId)).returning()
    await this.publish(campaignId, scene, row!, item.layer)
    return this.toItem(row!)
  }

  async changeHp(campaignId: string, sceneId: string, itemId: string, userId: string, input: HpChangeInput): Promise<HpChangeResult> {
    const role = await this.access.requireMember(campaignId, userId)
    const scene = await this.find(campaignId, sceneId, role)
    const item = await this.findItem(sceneId, itemId, role)
    if (item.kind !== 'token') throw new BadRequestException('Só tokens têm pontos de vida')
    const characterId = typeof item.data.characterId === 'string' ? item.data.characterId : null
    const character = characterId ? await this.character(campaignId, characterId) : null
    const before = character ? character.sheet.hp : readHp(item.data.hp)
    if (!before) throw new BadRequestException('Este token ainda não tem pontos de vida')
    let amount = input.amount
    let adjustment: HpChangeResult['adjustment'] = 'normal'
    let hp: TokenHp
    let droppedToZero = false
    if (input.change === 'damage') {
      const adjusted = adjustDamage(input.amount, damageTypeOf(input.type), readDefenses(item.data.defenses))
      amount = adjusted.amount
      adjustment = adjusted.adjustment
      const result = applyDamage(before, amount)
      hp = { current: result.current, max: result.max, temporary: result.temporary }
      droppedToZero = result.droppedToZero
    } else if (input.change === 'healing') hp = applyHealing(before, input.amount)
    else hp = grantTemporary(before, input.amount)
    if (character) {
      await this.db
        .update(characters)
        .set({ sheet: { ...character.sheet, hp }, version: character.version + 1 })
        .where(eq(characters.id, character.id))
      this.realtime.changed(campaignId, 'characters', character.id)
      await this.syncCharacterTokens(campaignId, character.id, { ...character.sheet, hp })
    } else {
      const [row] = await this.db
        .update(sceneItems)
        .set({ data: { ...item.data, hp } })
        .where(eq(sceneItems.id, itemId))
        .returning()
      await this.publish(campaignId, scene, row!)
    }
    const concentrating = readEffects(item.data.effects).some((e) => e.condition === 'concentrating')
    return {
      hp,
      amount,
      adjustment,
      droppedToZero,
      concentrationDc: input.change === 'damage' && concentrating && amount > 0 && hp.current > 0 ? concentrationDc(amount) : null
    }
  }

  async syncCharacterTokens(campaignId: string, characterId: string, sheet: Sheet5e): Promise<void> {
    const rows = await this.db
      .select({ item: sceneItems, scene: scenes })
      .from(sceneItems)
      .innerJoin(scenes, eq(scenes.id, sceneItems.sceneId))
      .where(and(eq(scenes.campaignId, campaignId), eq(sceneItems.kind, 'token'), sql`${sceneItems.data}->>'characterId' = ${characterId}`))
    for (const { item, scene } of rows) {
      const hp = sheet.hp
      const current = readHp(item.data.hp)
      if (
        current &&
        current.current === hp.current &&
        current.max === hp.max &&
        current.temporary === hp.temporary &&
        item.data.ac === sheet.armorClass
      )
        continue
      const [row] = await this.db
        .update(sceneItems)
        .set({ data: { ...item.data, hp, ac: sheet.armorClass } })
        .where(eq(sceneItems.id, item.id))
        .returning()
      await this.publish(campaignId, scene, row!)
    }
  }

  async tickToken(campaignId: string, tokenId: string): Promise<string[]> {
    const [found] = await this.db
      .select({ item: sceneItems, scene: scenes })
      .from(sceneItems)
      .innerJoin(scenes, eq(scenes.id, sceneItems.sceneId))
      .where(and(eq(sceneItems.id, tokenId), eq(scenes.campaignId, campaignId)))
    if (!found) return []
    const effects = readEffects(found.item.data.effects)
    if (!effects.some((e) => e.rounds !== null)) return []
    const { kept, ended } = tickEffects(effects)
    const [row] = await this.db
      .update(sceneItems)
      .set({ data: { ...found.item.data, effects: kept } })
      .where(eq(sceneItems.id, tokenId))
      .returning()
    await this.publish(campaignId, found.scene, row!)
    return ended.map((e) => e.label)
  }

  async tokens(campaignId: string, sceneId: string, ids: string[]): Promise<ItemRow[]> {
    if (ids.length === 0) return []
    return this.db
      .select({ item: sceneItems })
      .from(sceneItems)
      .innerJoin(scenes, eq(scenes.id, sceneItems.sceneId))
      .where(
        and(eq(scenes.campaignId, campaignId), eq(sceneItems.sceneId, sceneId), inArray(sceneItems.id, ids), eq(sceneItems.kind, 'token'))
      )
      .then((rows) => rows.map((r) => r.item))
  }

  async sceneTokens(campaignId: string, sceneId: string): Promise<ItemRow[]> {
    const rows = await this.db
      .select({ item: sceneItems })
      .from(sceneItems)
      .innerJoin(scenes, eq(scenes.id, sceneItems.sceneId))
      .where(and(eq(scenes.campaignId, campaignId), eq(sceneItems.sceneId, sceneId), eq(sceneItems.kind, 'token')))
    return rows.map((r) => r.item)
  }

  async character(campaignId: string, characterId: string) {
    const [row] = await this.db
      .select({ id: characters.id, sheet: characters.sheet, version: characters.version })
      .from(characters)
      .where(and(eq(characters.id, characterId), eq(characters.campaignId, campaignId)))
    return row ?? null
  }

  private async withVitals(campaignId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const characterId = typeof data.characterId === 'string' ? data.characterId : null
    if (!characterId) return data
    const character = await this.character(campaignId, characterId)
    if (!character) return { ...data, characterId: null }
    return { ...data, hp: character.sheet.hp, ac: character.sheet.armorClass }
  }

  async door(campaignId: string, sceneId: string, itemId: string, userId: string, state: 'open' | 'closed'): Promise<SceneItemDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const scene = await this.find(campaignId, sceneId, role)
    const item = await this.findItem(sceneId, itemId, role)
    if (item.kind !== 'wall' || wallType(item) !== 'door') throw new BadRequestException('Isso não é uma porta')
    if (!isGameMaster(role) && doorState(item) === 'locked') throw new ForbiddenException('A porta está trancada')
    const [row] = await this.db
      .update(sceneItems)
      .set({ data: { ...item.data, state } })
      .where(eq(sceneItems.id, itemId))
      .returning()
    await this.publish(campaignId, scene, row!)
    return this.toItem(row!)
  }

  async explore(campaignId: string, sceneId: string, userId: string, cells: number[]): Promise<{ explored: string | null }> {
    const role = await this.access.requireMember(campaignId, userId)
    await this.find(campaignId, sceneId, role)
    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(scenes).where(eq(scenes.id, sceneId)).for('update')
      const settings = sceneSettings(row!.settings)
      const { cols, rows } = exploredDims(settings.width, settings.height)
      const bits = decodeBits(row!.explored, cols * rows)
      if (setBits(bits, cells) === 0) return { explored: row!.explored, changed: false }
      const explored = encodeBits(bits)
      await tx.update(scenes).set({ explored }).where(eq(scenes.id, sceneId))
      return { explored, changed: true }
    })
    if (result.changed) this.realtime.emit({ campaignId }, 'scene:explored', { campaignId, sceneId, explored: result.explored })
    return { explored: result.explored }
  }

  async resetExplored(campaignId: string, sceneId: string, userId: string): Promise<void> {
    const role = await this.requireGameMaster(campaignId, userId)
    await this.find(campaignId, sceneId, role)
    await this.db.update(scenes).set({ explored: null }).where(eq(scenes.id, sceneId))
    this.realtime.emit({ campaignId }, 'scene:explored', { campaignId, sceneId, explored: null })
  }

  private async checkPath(sceneId: string, item: ItemRow, input: UpdateSceneItemInput): Promise<void> {
    const walls = await this.db
      .select()
      .from(sceneItems)
      .where(and(eq(sceneItems.sceneId, sceneId), eq(sceneItems.kind, 'wall')))
    if (walls.length === 0) return
    const center = (x: number, y: number) => ({ x: x + item.width / 2, y: y + item.height / 2 })
    const from = center(item.x, item.y)
    const to = center(input.x ?? item.x, input.y ?? item.y)
    if (pathBlocked(from, to, wallSegments(walls, 'move'))) throw new BadRequestException('Uma parede bloqueia o caminho')
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
      settings: sceneSettings(row.settings),
      explored: row.explored,
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

export function readHp(value: unknown): TokenHp | null {
  if (!value || typeof value !== 'object') return null
  const hp = value as Record<string, unknown>
  const max = Number(hp.max)
  if (!Number.isFinite(max) || max <= 0) return null
  const current = Number(hp.current)
  const temporary = Number(hp.temporary)
  return {
    max: Math.floor(max),
    current: Number.isFinite(current) ? Math.max(0, Math.min(Math.floor(max), Math.floor(current))) : Math.floor(max),
    temporary: Number.isFinite(temporary) ? Math.max(0, Math.floor(temporary)) : 0
  }
}

export function readDefenses(value: unknown): Partial<Defenses> {
  if (!value || typeof value !== 'object') return {}
  const raw = value as Record<string, unknown>
  const list = (key: string) =>
    Array.isArray(raw[key]) ? (raw[key] as unknown[]).map((v) => damageTypeOf(String(v))).filter((v) => v !== null) : []
  return { resistances: list('resistances'), immunities: list('immunities'), vulnerabilities: list('vulnerabilities') }
}
