import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { DiceError, roll, type RollResult } from '@taverna/dice'
import { isGameMaster, ROLL_PAGE_SIZE, type CreateRollInput, type RollDto, type RollVisibility } from '@taverna/shared'
import { and, desc, eq, inArray, lt, or, type SQL } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, rolls, users } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'

@Injectable()
export class RollsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async create(campaignId: string, userId: string, input: CreateRollInput): Promise<RollDto> {
    await this.access.requireMember(campaignId, userId)
    const visibility = input.visibility ?? 'public'
    let result: RollResult
    try {
      result = roll(input.expression)
    } catch (error) {
      if (error instanceof DiceError) throw new BadRequestException({ message: error.message, fields: { expression: error.message } })
      throw error
    }
    const label = input.label?.trim() || result.label
    result = { ...result, label }
    const [row] = await this.db.insert(rolls).values({ campaignId, userId, label, visibility, result }).returning()
    const author = await this.db.query.users.findFirst({ where: eq(users.id, userId), columns: { displayName: true, color: true } })
    const dto: RollDto = {
      id: row!.id,
      campaignId,
      userId,
      displayName: author?.displayName ?? '',
      color: author?.color ?? '#c58b3a',
      label,
      visibility,
      result,
      createdAt: row!.createdAt.toISOString()
    }
    if (visibility === 'public') this.realtime.roll(dto)
    else if (visibility === 'blind') {
      const masters = await this.masters(campaignId)
      this.realtime.roll(dto, masters)
      if (!masters.includes(userId)) this.realtime.roll(redact(dto), [userId])
    } else this.realtime.roll(dto, await this.audience(campaignId, userId, visibility))
    return dto
  }

  async createFor(campaignId: string, userId: string, input: CreateRollInput): Promise<RollDto> {
    const dto = await this.create(campaignId, userId, input)
    if (dto.visibility !== 'blind') return dto
    const role = await this.access.requireMember(campaignId, userId)
    return isGameMaster(role) ? dto : redact(dto)
  }

  async list(campaignId: string, userId: string, before?: Date): Promise<RollDto[]> {
    const role = await this.access.requireMember(campaignId, userId)
    const visible: SQL[] = [eq(rolls.visibility, 'public'), eq(rolls.userId, userId)]
    if (isGameMaster(role)) visible.push(eq(rolls.visibility, 'gm'), eq(rolls.visibility, 'blind'))
    const rows = await this.db
      .select({
        id: rolls.id,
        userId: rolls.userId,
        label: rolls.label,
        visibility: rolls.visibility,
        result: rolls.result,
        createdAt: rolls.createdAt,
        displayName: users.displayName,
        color: users.color
      })
      .from(rolls)
      .innerJoin(users, eq(users.id, rolls.userId))
      .where(and(eq(rolls.campaignId, campaignId), or(...visible), before ? lt(rolls.createdAt, before) : undefined))
      .orderBy(desc(rolls.createdAt))
      .limit(ROLL_PAGE_SIZE)
    return rows.map((row) => {
      const dto = { ...row, campaignId, createdAt: row.createdAt.toISOString() }
      return dto.visibility === 'blind' && !isGameMaster(role) ? redact(dto) : dto
    })
  }

  private async audience(campaignId: string, userId: string, visibility: RollVisibility): Promise<string[]> {
    if (visibility === 'self') return [userId]
    return [...new Set([userId, ...(await this.masters(campaignId))])]
  }

  private async masters(campaignId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: campaignMembers.userId })
      .from(campaignMembers)
      .where(and(eq(campaignMembers.campaignId, campaignId), inArray(campaignMembers.role, ['gm', 'cogm'])))
    return rows.map((m) => m.userId)
  }
}

export function redact(dto: RollDto): RollDto {
  const { expression } = dto.result
  return {
    ...dto,
    hidden: true,
    result: {
      expression,
      label: dto.label,
      total: 0,
      terms: [],
      segments: [{ kind: 'text', text: expression }],
      natural: null,
      critical: null
    }
  }
}
