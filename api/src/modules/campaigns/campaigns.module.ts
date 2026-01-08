import { Global, Module } from '@nestjs/common'
import { CampaignAccessService } from './campaign-access.service'
import { CampaignsController } from './campaigns.controller'
import { CampaignsService } from './campaigns.service'

@Global()
@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignAccessService],
  exports: [CampaignsService, CampaignAccessService]
})
export class CampaignsModule {}
