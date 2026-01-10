import { Body, Controller, Delete, Get, HttpCode, Param, Patch } from '@nestjs/common'
import { MemberDto, updateMemberSchema } from '@taverna/shared'
import { AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { CampaignAccessService } from './campaign-access.service'
import { CampaignsService } from './campaigns.service'
import { MembersService } from './members.service'

@Controller('campaigns/:id/members')
export class MembersController {
  constructor(
    private readonly members: MembersService,
    private readonly campaigns: CampaignsService,
    private readonly access: CampaignAccessService
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<MemberDto[]> {
    await this.access.requireMember(id, user.id)
    return this.campaigns.members(id)
  }

  @Patch(':userId')
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('id', UuidPipe) id: string,
    @Param('userId', UuidPipe) userId: string,
    @Body(new ZodPipe(updateMemberSchema)) body: { role: 'cogm' | 'player' }
  ): Promise<MemberDto[]> {
    return this.members.changeRole(id, user.id, userId, body.role)
  }

  @Delete(':userId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string, @Param('userId', UuidPipe) userId: string): Promise<void> {
    return this.members.remove(id, user.id, userId)
  }
}
