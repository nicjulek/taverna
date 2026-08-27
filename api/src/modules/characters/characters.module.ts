import { Module } from '@nestjs/common'
import { CharactersController } from './characters.controller'
import { CharactersService } from './characters.service'
import { ScenesModule } from '../scenes/scenes.module'

@Module({
  imports: [ScenesModule],
  controllers: [CharactersController],
  providers: [CharactersService]
})
export class CharactersModule {}
