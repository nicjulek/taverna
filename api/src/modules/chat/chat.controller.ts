import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { createMessageSchema, type CreateMessageInput, type MessageDto } from '@taverna/shared'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { ChatService } from './chat.service'

@Controller('campaigns/:campaignId/messages')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Query('before') before?: string
  ): Promise<MessageDto[]> {
    const date = before ? new Date(before) : undefined
    if (date && Number.isNaN(date.getTime())) throw new BadRequestException('Data inválida')
    return this.chat.list(campaignId, user.id, date)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(createMessageSchema)) body: CreateMessageInput
  ): Promise<MessageDto> {
    return this.chat.create(campaignId, user.id, body)
  }
}
