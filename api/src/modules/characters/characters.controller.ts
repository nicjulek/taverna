import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import {
  type CharacterDto,
  type CharacterSummaryDto,
  type CreateCharacterInput,
  createCharacterSchema,
  type UpdateCharacterInput,
  updateCharacterSchema
} from '@taverna/shared'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { CharactersService } from './characters.service'

@Controller('campaigns/:campaignId/characters')
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<CharacterSummaryDto[]> {
    return this.characters.list(campaignId, user.id)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(createCharacterSchema)) body: CreateCharacterInput
  ): Promise<CharacterDto> {
    return this.characters.create(campaignId, user.id, body)
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('id', UuidPipe) id: string
  ): Promise<CharacterDto> {
    return this.characters.get(campaignId, id, user.id)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('id', UuidPipe) id: string,
    @Body(new ZodPipe(updateCharacterSchema)) body: UpdateCharacterInput
  ): Promise<CharacterDto> {
    return this.characters.update(campaignId, id, user.id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('id', UuidPipe) id: string
  ): Promise<void> {
    return this.characters.remove(campaignId, id, user.id)
  }
}
