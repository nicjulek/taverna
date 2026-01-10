import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common'
import { InvitePreviewDto } from '@taverna/shared'
import { AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { InvitesService } from './invites.service'

@Controller()
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get('invites/:code')
  preview(@CurrentUser() user: AuthUser, @Param('code') code: string): Promise<InvitePreviewDto> {
    return this.invites.preview(code, user.id)
  }

  @Post('invites/:code/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('code') code: string): Promise<{ campaignId: string }> {
    return this.invites.accept(code, user.id)
  }

  @Post('campaigns/:id/invite')
  regenerate(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<{ inviteCode: string }> {
    return this.invites.regenerate(id, user.id)
  }

  @Delete('campaigns/:id/invite')
  @HttpCode(204)
  disable(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<void> {
    return this.invites.disable(id, user.id)
  }
}
