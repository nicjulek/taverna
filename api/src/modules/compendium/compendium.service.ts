import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  COMPENDIUM_PAGE_SIZE,
  type CompendiumEntryDto,
  type CompendiumFilters,
  type CompendiumSummaryDto,
  type HomebrewInput,
  isGameMaster
} from '@taverna/shared'
import { and, asc, eq, ilike, isNull, or, type SQL, sql } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { compendiumEntries } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'

type Row = typeof compendiumEntries.$inferSelect

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

@Injectable()
export class CompendiumService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async search(campaignId: string, userId: string, query: CompendiumFilters): Promise<{ items: CompendiumSummaryDto[]; hasMore: boolean }> {
    const role = await this.access.requireMember(campaignId, userId)
    const e = compendiumEntries
    const meta = (key: string) => sql`${e.meta}->>${key}`
    const filters: (SQL | undefined)[] = [eq(e.system, 'dnd5e'), this.visible(campaignId, isGameMaster(role))]
    if (query.kind) filters.push(eq(e.kind, query.kind))
    if (query.source === 'srd') filters.push(isNull(e.campaignId))
    if (query.source === 'homebrew') filters.push(eq(e.campaignId, campaignId))
    if (query.q) {
      const like = `%${escapeLike(query.q)}%`
      filters.push(or(ilike(e.name, like), ilike(e.summary, like)))
    }
    if (query.level !== undefined) filters.push(sql`(${meta('level')})::int = ${query.level}`)
    if (query.school) filters.push(sql`${meta('school')} = ${query.school}`)
    if (query.className) filters.push(sql`${e.meta}->'classes' ? ${query.className}`)
    if (query.type) filters.push(sql`${meta('type')} = ${query.type}`)
    if (query.crMin !== undefined) filters.push(sql`(${meta('cr')})::numeric >= ${query.crMin}`)
    if (query.crMax !== undefined) filters.push(sql`(${meta('cr')})::numeric <= ${query.crMax}`)
    if (query.category) filters.push(sql`${meta('category')} = ${query.category}`)
    if (query.rarity) filters.push(sql`${meta('rarity')} = ${query.rarity}`)

    const rows = await this.db
      .select()
      .from(e)
      .where(and(...filters))
      .orderBy(query.kind === 'spell' ? sql`(${meta('level')})::int` : sql`1`, asc(e.name))
      .limit(COMPENDIUM_PAGE_SIZE + 1)
      .offset(query.offset)
    return { items: rows.slice(0, COMPENDIUM_PAGE_SIZE).map((row) => this.toSummary(row)), hasMore: rows.length > COMPENDIUM_PAGE_SIZE }
  }

  async get(campaignId: string, id: string, userId: string): Promise<CompendiumEntryDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const [row] = await this.db
      .select()
      .from(compendiumEntries)
      .where(and(eq(compendiumEntries.id, id), this.visible(campaignId, isGameMaster(role))))
    if (!row) throw new NotFoundException('Entrada não encontrada')
    return this.toDto(row)
  }

  async create(campaignId: string, userId: string, input: HomebrewInput): Promise<CompendiumEntryDto> {
    await this.requireGameMaster(campaignId, userId)
    const [row] = await this.db
      .insert(compendiumEntries)
      .values({
        campaignId,
        authorId: userId,
        kind: input.kind,
        name: input.name,
        summary: input.summary ?? '',
        meta: input.meta ?? {},
        body: input.body ?? '',
        data: input.data ?? {},
        published: input.published ?? false,
        lang: 'pt-BR'
      })
      .returning()
    this.realtime.changed(campaignId, 'compendium')
    return this.toDto(row!)
  }

  async update(campaignId: string, id: string, userId: string, input: HomebrewInput): Promise<CompendiumEntryDto> {
    await this.requireGameMaster(campaignId, userId)
    const [row] = await this.db
      .update(compendiumEntries)
      .set({
        kind: input.kind,
        name: input.name,
        summary: input.summary ?? '',
        meta: input.meta ?? {},
        body: input.body ?? '',
        data: input.data ?? {},
        published: input.published ?? false
      })
      .where(and(eq(compendiumEntries.id, id), eq(compendiumEntries.campaignId, campaignId)))
      .returning()
    if (!row) throw new NotFoundException('Homebrew não encontrado')
    this.realtime.changed(campaignId, 'compendium')
    return this.toDto(row)
  }

  async remove(campaignId: string, id: string, userId: string): Promise<void> {
    await this.requireGameMaster(campaignId, userId)
    const deleted = await this.db
      .delete(compendiumEntries)
      .where(and(eq(compendiumEntries.id, id), eq(compendiumEntries.campaignId, campaignId)))
      .returning({ id: compendiumEntries.id })
    if (deleted.length === 0) throw new NotFoundException('Homebrew não encontrado')
    this.realtime.changed(campaignId, 'compendium')
  }

  private visible(campaignId: string, gameMaster: boolean): SQL | undefined {
    const ours = eq(compendiumEntries.campaignId, campaignId)
    return or(isNull(compendiumEntries.campaignId), gameMaster ? ours : and(ours, eq(compendiumEntries.published, true)))
  }

  private async requireGameMaster(campaignId: string, userId: string): Promise<void> {
    const role = await this.access.requireMember(campaignId, userId)
    if (!isGameMaster(role)) throw new ForbiddenException('Só os mestres criam e editam homebrew')
  }

  private toSummary(row: Row): CompendiumSummaryDto {
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      summary: row.summary,
      source: row.campaignId ? 'homebrew' : 'srd',
      lang: row.lang,
      published: row.published,
      meta: row.meta
    }
  }

  private toDto(row: Row): CompendiumEntryDto {
    return { ...this.toSummary(row), body: row.body, data: row.data, authorId: row.authorId, updatedAt: row.updatedAt.toISOString() }
  }
}
