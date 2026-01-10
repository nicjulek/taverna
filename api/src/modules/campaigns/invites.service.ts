import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InvitePreviewDto } from '@taverna/shared'
import { and, eq, sql } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, campaigns, users } from '../../database/schema'
import { CampaignAccessService } from './campaign-access.service'
import { newInviteCode } from './campaigns.service'

export const MAX_MEMBERS = 12

@Injectable()
export class InvitesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService
  ) {}

  async preview(code: string, userId: string): Promise<InvitePreviewDto> {
    const campaign = await this.findByCode(code)
    const [gm] = await this.db.select({ name: users.displayName }).from(users).where(eq(users.id, campaign.ownerId))
    const total = await this.countMembers(campaign.id)
    const role = await this.access.roleOf(campaign.id, userId)
    return {
      campaignId: campaign.id,
      name: campaign.name,
      description: campaign.description,
      system: campaign.system,
      gmName: gm?.name ?? 'Mestre',
      members: total,
      alreadyMember: role !== null
    }
  }

  async accept(code: string, userId: string): Promise<{ campaignId: string }> {
    const campaign = await this.findByCode(code)
    const role = await this.access.roleOf(campaign.id, userId)
    if (role) return { campaignId: campaign.id }
    if ((await this.countMembers(campaign.id)) >= MAX_MEMBERS) throw new BadRequestException(`A mesa já tem ${MAX_MEMBERS} participantes`)
    await this.db.insert(campaignMembers).values({ campaignId: campaign.id, userId, role: 'player' }).onConflictDoNothing()
    return { campaignId: campaign.id }
  }

  async regenerate(campaignId: string, userId: string): Promise<{ inviteCode: string }> {
    await this.access.requireGameMaster(campaignId, userId)
    const inviteCode = newInviteCode()
    await this.db.update(campaigns).set({ inviteCode }).where(eq(campaigns.id, campaignId))
    return { inviteCode }
  }

  async disable(campaignId: string, userId: string): Promise<void> {
    await this.access.requireGameMaster(campaignId, userId)
    await this.db.update(campaigns).set({ inviteCode: null }).where(eq(campaigns.id, campaignId))
  }

  private async findByCode(code: string) {
    const campaign = await this.db.query.campaigns.findFirst({ where: and(eq(campaigns.inviteCode, code)) })
    if (!campaign) throw new NotFoundException('Convite inválido ou desativado')
    return campaign
  }

  private async countMembers(campaignId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(campaignMembers)
      .where(eq(campaignMembers.campaignId, campaignId))
    return row?.total ?? 0
  }
}
