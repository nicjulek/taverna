import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { MemberDto, Role } from '@taverna/shared'
import { and, eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers } from '../../database/schema'
import { CampaignAccessService } from './campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'
import { CampaignsService } from './campaigns.service'

export function canRemoveMember(actor: Role, target: Role, self: boolean): boolean {
  if (target === 'gm') return false
  if (self) return true
  if (actor === 'gm') return true
  return actor === 'cogm' && target === 'player'
}

@Injectable()
export class MembersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly campaigns: CampaignsService,
    private readonly realtime: RealtimeService
  ) {}

  async changeRole(campaignId: string, actorId: string, targetId: string, role: 'cogm' | 'player'): Promise<MemberDto[]> {
    await this.access.requireOwner(campaignId, actorId)
    const target = await this.access.roleOf(campaignId, targetId)
    if (!target) throw new NotFoundException('Jogador não encontrado')
    if (target === 'gm') throw new BadRequestException('O papel do mestre dono não pode ser alterado')
    await this.db
      .update(campaignMembers)
      .set({ role })
      .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, targetId)))
    this.realtime.changed(campaignId, 'members')
    return this.campaigns.members(campaignId)
  }

  async remove(campaignId: string, actorId: string, targetId: string): Promise<void> {
    const actor = await this.access.requireMember(campaignId, actorId)
    const target = await this.access.roleOf(campaignId, targetId)
    if (!target) throw new NotFoundException('Jogador não encontrado')
    if (!canRemoveMember(actor, target, actorId === targetId)) {
      throw new ForbiddenException(
        target === 'gm' ? 'O mestre dono não pode sair da própria campanha' : 'Você não pode remover esse jogador'
      )
    }
    await this.db.delete(campaignMembers).where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, targetId)))
    this.realtime.removed(campaignId, [targetId])
    this.realtime.changed(campaignId, 'members')
  }
}
