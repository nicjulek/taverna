import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  AccessLevel,
  canEdit,
  canView,
  CreateJournalInput,
  isGameMaster,
  JournalDto,
  JournalSummaryDto,
  resolveAccess,
  Role,
  UpdateJournalInput
} from '@taverna/shared'
import { and, asc, eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, journals, users } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'

type JournalRow = typeof journals.$inferSelect & { authorName: string | null }

@Injectable()
export class JournalsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async list(campaignId: string, userId: string): Promise<JournalSummaryDto[]> {
    const role = await this.access.requireMember(campaignId, userId)
    const rows = await this.rows(campaignId)
    return rows.map((row) => this.toSummary(row, this.levelFor(row, userId, role))).filter((journal) => canView(journal.access))
  }

  async get(campaignId: string, journalId: string, userId: string): Promise<JournalDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const row = await this.find(campaignId, journalId)
    const level = this.levelFor(row, userId, role)
    if (!canView(level)) throw new NotFoundException('Página não encontrada')
    return this.toDto(row, level, role, userId)
  }

  async create(campaignId: string, userId: string, input: CreateJournalInput): Promise<JournalDto> {
    await this.access.requireMember(campaignId, userId)
    const [row] = await this.db
      .insert(journals)
      .values({ campaignId, authorId: userId, title: input.title, content: input.content ?? '', folder: input.folder ?? '' })
      .returning({ id: journals.id })
    this.realtime.changed(campaignId, 'journals')
    return this.get(campaignId, row!.id, userId)
  }

  async update(campaignId: string, journalId: string, userId: string, input: UpdateJournalInput): Promise<JournalDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const row = await this.find(campaignId, journalId)
    const level = this.levelFor(row, userId, role)
    if (!canEdit(level))
      throw canView(level) ? new ForbiddenException('Você só pode ler esta página') : new NotFoundException('Página não encontrada')
    const { access, ...fields } = input
    const changes: Partial<typeof journals.$inferInsert> = { ...fields }
    if (access) {
      if (!this.canShare(row, userId, role)) throw new ForbiddenException('Só o autor ou o mestre pode mudar quem vê esta página')
      changes.defaultAccess = access.defaultAccess
      changes.grants = await this.sanitizeGrants(campaignId, access.grants)
    }
    await this.db.update(journals).set(changes).where(eq(journals.id, journalId))
    this.realtime.changed(campaignId, 'journals')
    return this.get(campaignId, journalId, userId)
  }

  async remove(campaignId: string, journalId: string, userId: string): Promise<void> {
    const role = await this.access.requireMember(campaignId, userId)
    const row = await this.find(campaignId, journalId)
    if (!this.canShare(row, userId, role)) {
      throw canView(this.levelFor(row, userId, role))
        ? new ForbiddenException('Só o autor ou o mestre pode apagar esta página')
        : new NotFoundException('Página não encontrada')
    }
    await this.db.delete(journals).where(eq(journals.id, journalId))
    this.realtime.changed(campaignId, 'journals')
  }

  private canShare(row: JournalRow, userId: string, role: Role): boolean {
    return isGameMaster(role) || row.authorId === userId
  }

  private levelFor(row: JournalRow, userId: string, role: Role): AccessLevel {
    return resolveAccess({ userId, role, ownerId: row.authorId, defaultAccess: row.defaultAccess, grants: row.grants })
  }

  private async sanitizeGrants(campaignId: string, grants: Record<string, AccessLevel>): Promise<Record<string, AccessLevel>> {
    const members = await this.db
      .select({ userId: campaignMembers.userId })
      .from(campaignMembers)
      .where(eq(campaignMembers.campaignId, campaignId))
    const ids = new Set(members.map((member) => member.userId))
    return Object.fromEntries(Object.entries(grants).filter(([id, level]) => ids.has(id) && level !== 'none'))
  }

  private async rows(campaignId: string, journalId?: string): Promise<JournalRow[]> {
    const where = journalId ? and(eq(journals.campaignId, campaignId), eq(journals.id, journalId)) : eq(journals.campaignId, campaignId)
    const rows = await this.db
      .select({ journal: journals, authorName: users.displayName })
      .from(journals)
      .leftJoin(users, eq(users.id, journals.authorId))
      .where(where)
      .orderBy(asc(journals.folder), asc(journals.title))
    return rows.map((row) => ({ ...row.journal, authorName: row.authorName }))
  }

  private async find(campaignId: string, journalId: string): Promise<JournalRow> {
    const [row] = await this.rows(campaignId, journalId)
    if (!row) throw new NotFoundException('Página não encontrada')
    return row
  }

  private toSummary(row: JournalRow, access: AccessLevel): JournalSummaryDto {
    return {
      id: row.id,
      title: row.title,
      folder: row.folder,
      authorId: row.authorId ?? '',
      authorName: row.authorName ?? 'Ex-participante',
      access,
      defaultAccess: row.defaultAccess,
      updatedAt: row.updatedAt.toISOString()
    }
  }

  private toDto(row: JournalRow, access: AccessLevel, role: Role, userId: string): JournalDto {
    return {
      ...this.toSummary(row, access),
      content: row.content,
      grants: this.canShare(row, userId, role) ? row.grants : {}
    }
  }
}
