import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import {
  type CreateHandoutInput,
  createHandoutSchema,
  type HandoutDto,
  type ShowHandoutInput,
  showHandoutSchema,
  type UpdateHandoutInput,
  updateHandoutSchema
} from '@taverna/shared'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { HandoutsService } from './handouts.service'

@Controller('campaigns/:campaignId/handouts')
export class HandoutsController {
  constructor(private readonly handouts: HandoutsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<HandoutDto[]> {
    return this.handouts.list(campaignId, user.id)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(createHandoutSchema)) body: CreateHandoutInput
  ): Promise<HandoutDto> {
    return this.handouts.create(campaignId, user.id, body)
  }

  @Patch(':handoutId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('handoutId', UuidPipe) handoutId: string,
    @Body(new ZodPipe(updateHandoutSchema)) body: UpdateHandoutInput
  ): Promise<HandoutDto> {
    return this.handouts.update(campaignId, handoutId, user.id, body)
  }

  @Delete(':handoutId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('handoutId', UuidPipe) handoutId: string
  ): Promise<void> {
    return this.handouts.remove(campaignId, handoutId, user.id)
  }

  @Post(':handoutId/show')
  @HttpCode(200)
  show(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('handoutId', UuidPipe) handoutId: string,
    @Body(new ZodPipe(showHandoutSchema)) body: ShowHandoutInput
  ): Promise<HandoutDto> {
    return this.handouts.show(campaignId, handoutId, user.id, body)
  }
}
