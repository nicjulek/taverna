import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { createRollSchema, type CreateRollInput, type RollDto } from '@taverna/shared'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { RollsService } from './rolls.service'

@Controller('campaigns/:campaignId/rolls')
export class RollsController {
  constructor(private readonly rolls: RollsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Query('before') before?: string
  ): Promise<RollDto[]> {
    const date = before ? new Date(before) : undefined
    if (date && Number.isNaN(date.getTime())) throw new BadRequestException('Data inválida')
    return this.rolls.list(campaignId, user.id, date)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(createRollSchema)) body: CreateRollInput
  ): Promise<RollDto> {
    return this.rolls.createFor(campaignId, user.id, body)
  }
}
