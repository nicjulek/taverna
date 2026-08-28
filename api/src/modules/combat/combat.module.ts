import { Module } from '@nestjs/common'
import { RollsModule } from '../rolls/rolls.module'
import { ScenesModule } from '../scenes/scenes.module'
import { CombatController } from './combat.controller'
import { CombatService } from './combat.service'

@Module({
  imports: [RollsModule, ScenesModule],
  controllers: [CombatController],
  providers: [CombatService]
})
export class CombatModule {}
