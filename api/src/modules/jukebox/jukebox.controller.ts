import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common'
import { type JukeboxDto, type JukeboxInput, jukeboxSchema, type SfxInput, sfxSchema } from '@taverna/shared'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { JukeboxService } from './jukebox.service'

@Controller('campaigns/:campaignId/jukebox')
export class JukeboxController {
  constructor(private readonly jukebox: JukeboxService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<JukeboxDto> {
    return this.jukebox.get(campaignId, user.id)
  }

  @Put()
  set(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(jukeboxSchema)) body: JukeboxInput
  ): Promise<JukeboxDto> {
    return this.jukebox.set(campaignId, user.id, body)
  }

  @Post('sfx')
  @HttpCode(204)
  sfx(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(sfxSchema)) body: SfxInput
  ): Promise<void> {
    return this.jukebox.sfx(campaignId, user.id, body)
  }
}
