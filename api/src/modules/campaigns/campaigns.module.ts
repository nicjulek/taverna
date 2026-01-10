import { Global, Module } from '@nestjs/common'
import { CampaignAccessService } from './campaign-access.service'
import { CampaignsController } from './campaigns.controller'
import { CampaignsService } from './campaigns.service'
import { InvitesController } from './invites.controller'
import { InvitesService } from './invites.service'

@Global()
@Module({
  controllers: [CampaignsController, InvitesController],
  providers: [CampaignsService, CampaignAccessService, InvitesService],
  exports: [CampaignsService, CampaignAccessService]
})
export class CampaignsModule {}
