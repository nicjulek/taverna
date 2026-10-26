import { Module } from '@nestjs/common'
import { AssetsModule } from '../assets/assets.module'
import { CampaignsModule } from '../campaigns/campaigns.module'
import { CharactersModule } from '../characters/characters.module'
import { PortabilityController } from './portability.controller'
import { PortabilityService } from './portability.service'

@Module({
  imports: [CampaignsModule, CharactersModule, AssetsModule],
  controllers: [PortabilityController],
  providers: [PortabilityService]
})
export class PortabilityModule {}
