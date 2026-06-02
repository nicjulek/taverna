import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import {
  type CreateSceneInput,
  createSceneSchema,
  type SceneDto,
  type SceneItemDto,
  sceneItemSchema,
  type SceneItemValues,
  type SceneWithItemsDto,
  type UpdateSceneInput,
  type UpdateSceneItemInput,
  updateSceneItemSchema,
  updateSceneSchema
} from '@taverna/shared'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { ScenesService } from './scenes.service'

@Controller('campaigns/:campaignId/scenes')
export class ScenesController {
  constructor(private readonly scenes: ScenesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<SceneDto[]> {
    return this.scenes.list(campaignId, user.id)
  }

  @Get('active')
  active(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<SceneWithItemsDto | null> {
    return this.scenes.active(campaignId, user.id)
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(createSceneSchema)) body: CreateSceneInput
  ): Promise<SceneDto> {
    return this.scenes.create(campaignId, user.id, body)
  }

  @Get(':sceneId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('sceneId', UuidPipe) sceneId: string
  ): Promise<SceneWithItemsDto> {
    return this.scenes.get(campaignId, sceneId, user.id)
  }

  @Patch(':sceneId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('sceneId', UuidPipe) sceneId: string,
    @Body(new ZodPipe(updateSceneSchema)) body: UpdateSceneInput
  ): Promise<SceneDto> {
    return this.scenes.update(campaignId, sceneId, user.id, body)
  }

  @Delete(':sceneId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('sceneId', UuidPipe) sceneId: string
  ): Promise<void> {
    return this.scenes.remove(campaignId, sceneId, user.id)
  }

  @Post(':sceneId/activate')
  @HttpCode(200)
  activate(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('sceneId', UuidPipe) sceneId: string
  ): Promise<SceneDto> {
    return this.scenes.activate(campaignId, sceneId, user.id)
  }

  @Post(':sceneId/duplicate')
  duplicate(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('sceneId', UuidPipe) sceneId: string
  ): Promise<SceneDto> {
    return this.scenes.duplicate(campaignId, sceneId, user.id)
  }

  @Post(':sceneId/items')
  createItem(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('sceneId', UuidPipe) sceneId: string,
    @Body(new ZodPipe(sceneItemSchema)) body: SceneItemValues
  ): Promise<SceneItemDto> {
    return this.scenes.createItem(campaignId, sceneId, user.id, body)
  }

  @Patch(':sceneId/items/:itemId')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('sceneId', UuidPipe) sceneId: string,
    @Param('itemId', UuidPipe) itemId: string,
    @Body(new ZodPipe(updateSceneItemSchema)) body: UpdateSceneItemInput
  ): Promise<SceneItemDto> {
    return this.scenes.updateItem(campaignId, sceneId, itemId, user.id, body)
  }

  @Delete(':sceneId/items/:itemId')
  @HttpCode(204)
  removeItem(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('sceneId', UuidPipe) sceneId: string,
    @Param('itemId', UuidPipe) itemId: string
  ): Promise<void> {
    return this.scenes.removeItem(campaignId, sceneId, itemId, user.id)
  }
}
