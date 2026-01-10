import { Global, Module } from '@nestjs/common'
import { CampaignAccessService } from './campaign-access.service'
import { CampaignsController } from './campaigns.controller'
import { CampaignsService } from './campaigns.service'
import { InvitesController } from './invites.controller'
import { InvitesService } from './invites.service'
import { MembersController } from './members.controller'
import { MembersService } from './members.service'

@Global()
@Module({
  controllers: [CampaignsController, InvitesController, MembersController],
  providers: [CampaignsService, CampaignAccessService, InvitesService, MembersService],
  exports: [CampaignsService, CampaignAccessService]
})
export class CampaignsModule {}
