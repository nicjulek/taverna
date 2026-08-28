import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import {
  type AddCombatantsInput,
  addCombatantsSchema,
  type AttackInput,
  type AttackResult,
  attackSchema,
  type CombatDto,
  type RollInitiativeInput,
  rollInitiativeSchema,
  type StartCombatInput,
  startCombatSchema,
  type UpdateCombatantInput,
  updateCombatantSchema
} from '@taverna/shared'
import { type AuthUser, CurrentUser } from '../../common/auth'
import { UuidPipe } from '../../common/uuid.pipe'
import { ZodPipe } from '../../common/zod.pipe'
import { CombatService } from './combat.service'

@Controller('campaigns/:campaignId/combat')
export class CombatController {
  constructor(private readonly combat: CombatService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<CombatDto | null> {
    return this.combat.get(campaignId, user.id)
  }

  @Post()
  start(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(startCombatSchema)) body: StartCombatInput
  ): Promise<CombatDto> {
    return this.combat.start(campaignId, user.id, body)
  }

  @Delete()
  @HttpCode(204)
  end(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<void> {
    return this.combat.end(campaignId, user.id)
  }

  @Post('combatants')
  add(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(addCombatantsSchema)) body: AddCombatantsInput
  ): Promise<CombatDto> {
    return this.combat.add(campaignId, user.id, body.tokenIds)
  }

  @Patch('combatants/:combatantId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('combatantId', UuidPipe) combatantId: string,
    @Body(new ZodPipe(updateCombatantSchema)) body: UpdateCombatantInput
  ): Promise<CombatDto> {
    return this.combat.update(campaignId, user.id, combatantId, body)
  }

  @Delete('combatants/:combatantId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Param('combatantId', UuidPipe) combatantId: string
  ): Promise<CombatDto> {
    return this.combat.remove(campaignId, user.id, combatantId)
  }

  @Post('initiative')
  @HttpCode(200)
  initiative(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(rollInitiativeSchema)) body: RollInitiativeInput
  ): Promise<CombatDto> {
    return this.combat.rollInitiative(campaignId, user.id, body.combatantIds)
  }

  @Post('next')
  @HttpCode(200)
  next(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<CombatDto> {
    return this.combat.next(campaignId, user.id)
  }

  @Post('previous')
  @HttpCode(200)
  previous(@CurrentUser() user: AuthUser, @Param('campaignId', UuidPipe) campaignId: string): Promise<CombatDto> {
    return this.combat.previous(campaignId, user.id)
  }

  @Post('attack')
  @HttpCode(200)
  attack(
    @CurrentUser() user: AuthUser,
    @Param('campaignId', UuidPipe) campaignId: string,
    @Body(new ZodPipe(attackSchema)) body: AttackInput
  ): Promise<AttackResult> {
    return this.combat.attack(campaignId, user.id, body)
  }
}
