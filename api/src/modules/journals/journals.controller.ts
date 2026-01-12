import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { CreateJournalInput, createJournalSchema, JournalDto, JournalSummaryDto, UpdateJournalInput, updateJournalSchema } from '@taverna/shared'
import { AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { JournalsService } from './journals.service'

@Controller('campaigns/:campaignId/journals')
export class JournalsController {
  constructor(private readonly journals: JournalsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<JournalSummaryDto[]> {
    return this.journals.list(campaignId, user.id)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(createJournalSchema)) body: CreateJournalInput
  ): Promise<JournalDto> {
    return this.journals.create(campaignId, user.id, body)
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string, @Param('id', UuidPipe) id: string): Promise<JournalDto> {
    return this.journals.get(campaignId, id, user.id)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('id', UuidPipe) id: string,
    @Body(new ZodPipe(updateJournalSchema)) body: UpdateJournalInput
  ): Promise<JournalDto> {
    return this.journals.update(campaignId, id, user.id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string, @Param('id', UuidPipe) id: string): Promise<void> {
    return this.journals.remove(campaignId, id, user.id)
  }
}
