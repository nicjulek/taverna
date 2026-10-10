import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { type CreateMessageInput, isGameMaster, MESSAGE_PAGE_SIZE, type MessageDto, type Role } from '@taverna/shared'
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, messages, users } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'

@Injectable()
export class ChatService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  async create(campaignId: string, userId: string, input: CreateMessageInput): Promise<MessageDto> {
    await this.access.requireMember(campaignId, userId)
    const audience = input.audience ?? 'all'
    const members = await this.members(campaignId)
    const recipients = audience === 'whisper' ? [...new Set(input.recipients ?? [])].filter((id) => id !== userId) : []
    if (audience === 'whisper' && (recipients.length === 0 || recipients.some((id) => !members.has(id))))
      throw new BadRequestException('Só dá para cochichar com quem está na campanha')
    const [row] = await this.db.insert(messages).values({ campaignId, userId, text: input.text.trim(), audience, recipients }).returning()
    const author = members.get(userId)!
    const dto: MessageDto = {
      id: row!.id,
      campaignId,
      userId,
      displayName: author.displayName,
      color: author.color,
      text: row!.text,
      audience,
      recipients: recipients.map((id) => ({ userId: id, displayName: members.get(id)!.displayName })),
      createdAt: row!.createdAt.toISOString()
    }
    if (audience === 'all') this.realtime.emit({ campaignId }, 'message:new', dto)
    else {
      const masters = [...members.values()].filter((m) => isGameMaster(m.role)).map((m) => m.userId)
      const to = audience === 'gm' ? [userId, ...masters] : [userId, ...recipients]
      this.realtime.emit({ userIds: [...new Set(to)] }, 'message:new', dto)
    }
    return dto
  }

  async list(campaignId: string, userId: string, before?: Date): Promise<MessageDto[]> {
    const role = await this.access.requireMember(campaignId, userId)
    const visible = [
      eq(messages.audience, 'all'),
      eq(messages.userId, userId),
      sql`${messages.recipients} @> ${JSON.stringify([userId])}::jsonb`,
      ...(isGameMaster(role) ? [eq(messages.audience, 'gm')] : [])
    ]
    const rows = await this.db
      .select({ message: messages, displayName: users.displayName, color: users.color })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.userId))
      .where(and(eq(messages.campaignId, campaignId), or(...visible), before ? lt(messages.createdAt, before) : undefined))
      .orderBy(desc(messages.createdAt))
      .limit(MESSAGE_PAGE_SIZE)
    const ids = [...new Set(rows.flatMap((r) => r.message.recipients))]
    const names = ids.length
      ? new Map(
          (await this.db.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.id, ids))).map((u) => [
            u.id,
            u.displayName
          ])
        )
      : new Map<string, string>()
    return rows.map(({ message, displayName, color }) => ({
      id: message.id,
      campaignId,
      userId: message.userId,
      displayName,
      color,
      text: message.text,
      audience: message.audience,
      recipients: message.recipients.map((id) => ({ userId: id, displayName: names.get(id) ?? 'alguém' })),
      createdAt: message.createdAt.toISOString()
    }))
  }

  private async members(campaignId: string) {
    const rows = await this.db
      .select({ userId: campaignMembers.userId, role: campaignMembers.role, displayName: users.displayName, color: users.color })
      .from(campaignMembers)
      .innerJoin(users, eq(users.id, campaignMembers.userId))
      .where(eq(campaignMembers.campaignId, campaignId))
    return new Map(rows.map((r) => [r.userId, { ...r, role: r.role as Role }]))
  }
}
