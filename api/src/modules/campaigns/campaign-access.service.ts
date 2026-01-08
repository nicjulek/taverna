import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { isGameMaster, Role } from '@taverna/shared'
import { and, eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers } from '../../database/schema'

@Injectable()
export class CampaignAccessService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async roleOf(campaignId: string, userId: string): Promise<Role | null> {
    const member = await this.db.query.campaignMembers.findFirst({
      where: and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)),
      columns: { role: true }
    })
    return member?.role ?? null
  }

  async requireMember(campaignId: string, userId: string): Promise<Role> {
    const role = await this.roleOf(campaignId, userId)
    if (!role) throw new NotFoundException('Campanha não encontrada')
    return role
  }

  async requireGameMaster(campaignId: string, userId: string): Promise<Role> {
    const role = await this.requireMember(campaignId, userId)
    if (!isGameMaster(role)) throw new ForbiddenException('Só o mestre pode fazer isso')
    return role
  }

  async requireOwner(campaignId: string, userId: string): Promise<void> {
    const role = await this.requireMember(campaignId, userId)
    if (role !== 'gm') throw new ForbiddenException('Só o mestre dono da campanha pode fazer isso')
  }
}
