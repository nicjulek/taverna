import { BadRequestException, Body, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  type CampaignDto,
  CAMPAIGN_FORMAT,
  CHARACTER_FORMAT,
  type CharacterDto,
  type CharacterExport,
  characterExportSchema,
  exportFileName,
  IMPORT_MAX_BYTES
} from '@taverna/shared'
import type { Response } from 'express'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { loadDemo } from './demo'
import { parseCampaignFile, PortabilityService } from './portability.service'

function download(res: Response, name: string, body: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

@Controller()
export class PortabilityController {
  constructor(private readonly portability: PortabilityService) {}

  @Get('campaigns/:campaignId/characters/:characterId/export')
  async exportCharacter(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('characterId', UuidPipe) characterId: string,
    @Res() res: Response
  ): Promise<void> {
    const sheet = await this.portability.exportCharacter(campaignId, characterId, user.id)
    download(res, exportFileName(sheet.name, CHARACTER_FORMAT), sheet)
  }

  @Post('campaigns/:campaignId/characters/import')
  importCharacter(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(characterExportSchema)) body: CharacterExport
  ): Promise<CharacterDto> {
    return this.portability.importCharacter(campaignId, user.id, body)
  }

  @Get('campaigns/:campaignId/export')
  async exportCampaign(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Res() res: Response
  ): Promise<void> {
    const campaign = await this.portability.exportCampaign(campaignId, user.id)
    download(res, exportFileName(campaign.campaign.name, CAMPAIGN_FORMAT), campaign)
  }

  @Post('campaigns/import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  importCampaign(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File | undefined): Promise<CampaignDto> {
    if (!file) throw new BadRequestException('Escolha o arquivo da campanha')
    return this.portability.importCampaign(user.id, parseCampaignFile(file.buffer))
  }

  @Post('campaigns/demo')
  importDemo(@CurrentUser() user: AuthUser): Promise<CampaignDto> {
    return this.portability.importCampaign(user.id, loadDemo())
  }
}
