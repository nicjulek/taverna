import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { CampaignDto, CampaignSummaryDto, CreateCampaignInput, createCampaignSchema, UpdateCampaignInput, updateCampaignSchema } from '@taverna/shared'
import { AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { CampaignsService } from './campaigns.service'

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<CampaignSummaryDto[]> {
    return this.campaigns.list(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createCampaignSchema)) body: CreateCampaignInput): Promise<CampaignDto> {
    return this.campaigns.create(user.id, body)
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<CampaignDto> {
    return this.campaigns.get(id, user.id)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', UuidPipe) id: string,
    @Body(new ZodPipe(updateCampaignSchema)) body: UpdateCampaignInput
  ): Promise<CampaignDto> {
    return this.campaigns.update(id, user.id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<void> {
    return this.campaigns.remove(id, user.id)
  }
}
