import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { newSheet } from '@taverna/rules-5e'
import {
  type AccessLevel,
  canEdit,
  canView,
  type CharacterDto,
  type CharacterSummaryDto,
  type CreateCharacterInput,
  isGameMaster,
  resolveAccess,
  type Role,
  type UpdateCharacterInput
} from '@taverna/shared'
import { and, asc, eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, characters, users } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'

type CharacterRow = typeof characters.$inferSelect & { ownerName: string | null; ownerColor: string | null }

@Injectable()
export class CharactersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async list(campaignId: string, userId: string): Promise<CharacterSummaryDto[]> {
    const role = await this.access.requireMember(campaignId, userId)
    const rows = await this.rows(campaignId)
    return rows.map((row) => this.toSummary(row, this.levelFor(row, userId, role))).filter((c) => canView(c.access))
  }

  async get(campaignId: string, id: string, userId: string): Promise<CharacterDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const row = await this.find(campaignId, id)
    const level = this.levelFor(row, userId, role)
    if (!canView(level)) throw new NotFoundException('Ficha não encontrada')
    return this.toDto(row, level, role, userId)
  }

  async create(campaignId: string, userId: string, input: CreateCharacterInput): Promise<CharacterDto> {
    await this.access.requireMember(campaignId, userId)
    const sheet = newSheet({ classKey: input.classKey, level: input.level ?? 1, race: input.race ?? '' })
    const [row] = await this.db
      .insert(characters)
      .values({ campaignId, ownerId: userId, name: input.name, sheet })
      .returning({ id: characters.id })
    this.realtime.changed(campaignId, 'characters')
    return this.get(campaignId, row!.id, userId)
  }

  async update(campaignId: string, id: string, userId: string, input: UpdateCharacterInput): Promise<CharacterDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const row = await this.find(campaignId, id)
    const level = this.levelFor(row, userId, role)
    if (!canEdit(level))
      throw canView(level) ? new ForbiddenException('Você só pode ver esta ficha') : new NotFoundException('Ficha não encontrada')
    const changes: Partial<typeof characters.$inferInsert> = { version: row.version + 1 }
    if (input.name) changes.name = input.name
    if (input.sheet)
      changes.sheet = { ...input.sheet, hp: { ...input.sheet.hp, current: Math.min(input.sheet.hp.current, input.sheet.hp.max) } }
    if (input.access) {
      if (!this.canShare(row, userId, role)) throw new ForbiddenException('Só o dono da ficha ou o mestre pode mudar quem vê')
      changes.defaultAccess = input.access.defaultAccess
      changes.grants = await this.sanitizeGrants(campaignId, input.access.grants)
    }
    const updated = await this.db
      .update(characters)
      .set(changes)
      .where(and(eq(characters.id, id), eq(characters.version, input.version)))
      .returning({ id: characters.id })
    if (updated.length === 0) throw new ConflictException('A ficha mudou em outra tela. Recarregamos a versão nova.')
    this.realtime.changed(campaignId, 'characters', id)
    return this.get(campaignId, id, userId)
  }

  async remove(campaignId: string, id: string, userId: string): Promise<void> {
    const role = await this.access.requireMember(campaignId, userId)
    const row = await this.find(campaignId, id)
    if (!this.canShare(row, userId, role)) {
      throw canView(this.levelFor(row, userId, role))
        ? new ForbiddenException('Só o dono da ficha ou o mestre pode apagar')
        : new NotFoundException('Ficha não encontrada')
    }
    await this.db.delete(characters).where(eq(characters.id, id))
    this.realtime.changed(campaignId, 'characters', id)
  }

  private canShare(row: CharacterRow, userId: string, role: Role): boolean {
    return isGameMaster(role) || row.ownerId === userId
  }

  private levelFor(row: CharacterRow, userId: string, role: Role): AccessLevel {
    return resolveAccess({ userId, role, ownerId: row.ownerId, defaultAccess: row.defaultAccess, grants: row.grants })
  }

  private async sanitizeGrants(campaignId: string, grants: Record<string, AccessLevel>): Promise<Record<string, AccessLevel>> {
    const members = await this.db
      .select({ userId: campaignMembers.userId })
      .from(campaignMembers)
      .where(eq(campaignMembers.campaignId, campaignId))
    const ids = new Set(members.map((member) => member.userId))
    return Object.fromEntries(Object.entries(grants).filter(([memberId, level]) => ids.has(memberId) && level !== 'none'))
  }

  private async rows(campaignId: string, id?: string): Promise<CharacterRow[]> {
    const where = id ? and(eq(characters.campaignId, campaignId), eq(characters.id, id)) : eq(characters.campaignId, campaignId)
    const rows = await this.db
      .select({ character: characters, ownerName: users.displayName, ownerColor: users.color })
      .from(characters)
      .leftJoin(users, eq(users.id, characters.ownerId))
      .where(where)
      .orderBy(asc(characters.name))
    return rows.map((row) => ({ ...row.character, ownerName: row.ownerName, ownerColor: row.ownerColor }))
  }

  private async find(campaignId: string, id: string): Promise<CharacterRow> {
    const [row] = await this.rows(campaignId, id)
    if (!row) throw new NotFoundException('Ficha não encontrada')
    return row
  }

  private toSummary(row: CharacterRow, access: AccessLevel): CharacterSummaryDto {
    return {
      id: row.id,
      name: row.name,
      ownerId: row.ownerId ?? '',
      ownerName: row.ownerName ?? 'Ex-participante',
      ownerColor: row.ownerColor ?? '#5d7a6b',
      summary: {
        race: row.sheet.race,
        classes: row.sheet.classes.map((c) => ({ key: c.key, level: c.level })),
        hp: row.sheet.hp,
        armorClass: row.sheet.armorClass
      },
      access,
      defaultAccess: row.defaultAccess,
      updatedAt: row.updatedAt.toISOString()
    }
  }

  private toDto(row: CharacterRow, access: AccessLevel, role: Role, userId: string): CharacterDto {
    return {
      ...this.toSummary(row, access),
      version: row.version,
      sheet: row.sheet,
      grants: this.canShare(row, userId, role) ? row.grants : {}
    }
  }
}
