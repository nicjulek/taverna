import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  type CompendiumEntryDto,
  type CompendiumFilters,
  compendiumQuerySchema,
  type CompendiumSummaryDto,
  type HomebrewInput,
  homebrewSchema
} from '@taverna/shared'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { CompendiumService } from './compendium.service'

@Controller('campaigns/:campaignId/compendium')
export class CompendiumController {
  constructor(private readonly compendium: CompendiumService) {}

  @Get()
  search(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Query(new ZodPipe(compendiumQuerySchema)) query: CompendiumFilters
  ): Promise<{ items: CompendiumSummaryDto[]; hasMore: boolean }> {
    return this.compendium.search(campaignId, user.id, query)
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('id', UuidPipe) id: string
  ): Promise<CompendiumEntryDto> {
    return this.compendium.get(campaignId, id, user.id)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(homebrewSchema)) body: HomebrewInput
  ): Promise<CompendiumEntryDto> {
    return this.compendium.create(campaignId, user.id, body)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('id', UuidPipe) id: string,
    @Body(new ZodPipe(homebrewSchema)) body: HomebrewInput
  ): Promise<CompendiumEntryDto> {
    return this.compendium.update(campaignId, id, user.id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('id', UuidPipe) id: string
  ): Promise<void> {
    return this.compendium.remove(campaignId, id, user.id)
  }
}
