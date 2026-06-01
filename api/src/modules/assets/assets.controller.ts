import { Controller, Delete, Get, HttpCode, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ASSET_MAX_BYTES, type AssetDto } from '@taverna/shared'
import type { Response } from 'express'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { AssetsService } from './assets.service'

@Controller()
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get('campaigns/:campaignId/assets')
  list(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<AssetDto[]> {
    return this.assets.list(campaignId, user.id)
  }

  @Post('campaigns/:campaignId/assets')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: ASSET_MAX_BYTES, files: 1 } }))
  upload(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @UploadedFile() file: Express.Multer.File | undefined
  ): Promise<AssetDto> {
    return this.assets.upload(campaignId, user.id, file)
  }

  @Delete('campaigns/:campaignId/assets/:id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('id', UuidPipe) id: string
  ): Promise<void> {
    return this.assets.remove(campaignId, id, user.id)
  }

  @Get('assets/:id')
  async file(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string, @Res() res: Response): Promise<void> {
    const file = await this.assets.file(id, user.id)
    res.setHeader('Content-Type', file.mime)
    res.setHeader('Content-Length', String(file.size))
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
    res.end(file.data)
  }
}
