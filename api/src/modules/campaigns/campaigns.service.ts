import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { CampaignDto, CampaignSummaryDto, CreateCampaignInput, isGameMaster, MemberDto, UpdateCampaignInput } from '@taverna/shared'
import { randomBytes } from 'node:crypto'
import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, campaigns, users } from '../../database/schema'
import { CampaignAccessService } from './campaign-access.service'

export function newInviteCode(): string {
  return randomBytes(9).toString('base64url')
}

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService
  ) {}

  async list(userId: string): Promise<CampaignSummaryDto[]> {
    const rows = await this.db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        description: campaigns.description,
        system: campaigns.system,
        updatedAt: campaigns.updatedAt,
        role: campaignMembers.role
      })
      .from(campaignMembers)
      .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
      .where(eq(campaignMembers.userId, userId))
      .orderBy(desc(campaigns.updatedAt))
    if (rows.length === 0) return []
    const counts = await this.db
      .select({ campaignId: campaignMembers.campaignId, total: sql<number>`count(*)::int` })
      .from(campaignMembers)
      .where(
        inArray(
          campaignMembers.campaignId,
          rows.map((row) => row.id)
        )
      )
      .groupBy(campaignMembers.campaignId)
    const totals = new Map(counts.map((count) => [count.campaignId, count.total]))
    return rows.map((row) => ({ ...row, members: totals.get(row.id) ?? 1, updatedAt: row.updatedAt.toISOString() }))
  }

  async create(userId: string, input: CreateCampaignInput): Promise<CampaignDto> {
    const campaignId = await this.db.transaction(async (tx) => {
      const [campaign] = await tx
        .insert(campaigns)
        .values({ name: input.name, description: input.description ?? '', system: input.system ?? 'dnd5e', ownerId: userId, inviteCode: newInviteCode() })
        .returning({ id: campaigns.id })
      await tx.insert(campaignMembers).values({ campaignId: campaign!.id, userId, role: 'gm' })
      return campaign!.id
    })
    return this.get(campaignId, userId)
  }

  async get(campaignId: string, userId: string): Promise<CampaignDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const campaign = await this.db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) })
    if (!campaign) throw new NotFoundException('Campanha não encontrada')
    const memberList = await this.members(campaignId)
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      system: campaign.system,
      ownerId: campaign.ownerId,
      role,
      members: memberList.length,
      memberList,
      inviteCode: isGameMaster(role) ? campaign.inviteCode : null,
      updatedAt: campaign.updatedAt.toISOString()
    }
  }

  async update(campaignId: string, userId: string, input: UpdateCampaignInput): Promise<CampaignDto> {
    await this.access.requireGameMaster(campaignId, userId)
    await this.db.update(campaigns).set(input).where(eq(campaigns.id, campaignId))
    return this.get(campaignId, userId)
  }

  async remove(campaignId: string, userId: string): Promise<void> {
    await this.access.requireOwner(campaignId, userId)
    await this.db.delete(campaigns).where(eq(campaigns.id, campaignId))
  }

  async members(campaignId: string): Promise<MemberDto[]> {
    const rows = await this.db
      .select({
        userId: users.id,
        displayName: users.displayName,
        color: users.color,
        role: campaignMembers.role,
        joinedAt: campaignMembers.joinedAt
      })
      .from(campaignMembers)
      .innerJoin(users, eq(users.id, campaignMembers.userId))
      .where(eq(campaignMembers.campaignId, campaignId))
      .orderBy(asc(campaignMembers.joinedAt))
    const order = { gm: 0, cogm: 1, player: 2 }
    return rows
      .map((row) => ({ ...row, joinedAt: row.joinedAt.toISOString() }))
      .sort((a, b) => order[a.role] - order[b.role] || a.joinedAt.localeCompare(b.joinedAt))
  }
}
