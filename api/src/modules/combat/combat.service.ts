import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { criticalDamage, d20, derive, initiativeOrder, nextTurn, previousTurn } from '@taverna/rules-5e'
import {
  type AttackInput,
  type AttackResult,
  type CombatantDto,
  type CombatDto,
  isGameMaster,
  type Role,
  type RollDto,
  type StartCombatInput,
  type UpdateCombatantInput
} from '@taverna/shared'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { campaignMembers, combatants, combats, scenes } from '../../database/schema'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { RealtimeService } from '../realtime/realtime.service'
import { RollsService } from '../rolls/rolls.service'
import { ScenesService } from '../scenes/scenes.service'

type CombatRow = typeof combats.$inferSelect
type CombatantRow = typeof combatants.$inferSelect
type TokenRow = Awaited<ReturnType<ScenesService['tokens']>>[number]

@Injectable()
export class CombatService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService,
    private readonly rolls: RollsService,
    private readonly scenes: ScenesService
  ) {}

  async get(campaignId: string, userId: string): Promise<CombatDto | null> {
    const role = await this.access.requireMember(campaignId, userId)
    const combat = await this.current(campaignId)
    return combat ? this.toDto(combat, await this.list(combat.id), isGameMaster(role)) : null
  }

  async start(campaignId: string, userId: string, input: StartCombatInput): Promise<CombatDto> {
    await this.requireGameMaster(campaignId, userId)
    if (await this.current(campaignId)) throw new ConflictException('Já tem um combate em andamento')
    const [scene] = await this.db
      .select({ id: scenes.id })
      .from(scenes)
      .where(and(eq(scenes.id, input.sceneId), eq(scenes.campaignId, campaignId)))
    if (!scene) throw new NotFoundException('Cena não encontrada')
    const tokens = input.tokenIds?.length
      ? await this.scenes.tokens(campaignId, scene.id, input.tokenIds)
      : await this.scenes.sceneTokens(campaignId, scene.id)
    const [combat] = await this.db.insert(combats).values({ campaignId, sceneId: scene.id }).returning()
    await this.insertTokens(campaignId, combat!.id, tokens)
    return this.broadcast(campaignId, combat!)
  }

  async add(campaignId: string, userId: string, tokenIds: string[]): Promise<CombatDto> {
    await this.requireGameMaster(campaignId, userId)
    const combat = await this.require(campaignId)
    const existing = new Set((await this.list(combat.id)).map((c) => c.tokenId))
    const tokens = (await this.scenes.tokens(campaignId, combat.sceneId, tokenIds)).filter((t) => !existing.has(t.id))
    await this.insertTokens(campaignId, combat.id, tokens)
    return this.broadcast(campaignId, combat)
  }

  async update(campaignId: string, userId: string, combatantId: string, input: UpdateCombatantInput): Promise<CombatDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const combat = await this.require(campaignId)
    const combatant = await this.combatant(combat.id, combatantId)
    if (!isGameMaster(role)) {
      if (combatant.ownerId !== userId) throw new ForbiddenException('Você só muda a sua iniciativa')
      if (input.name !== undefined || input.hidden !== undefined || input.bonus !== undefined)
        throw new ForbiddenException('Só os mestres mudam nome, bônus e quem aparece')
    }
    await this.db.update(combatants).set(input).where(eq(combatants.id, combatantId))
    return this.broadcast(campaignId, combat)
  }

  async remove(campaignId: string, userId: string, combatantId: string): Promise<CombatDto> {
    await this.requireGameMaster(campaignId, userId)
    const combat = await this.require(campaignId)
    await this.combatant(combat.id, combatantId)
    let next = combat
    if (combat.turnId === combatantId) {
      const list = await this.list(combat.id)
      const step = nextTurn(list, combatantId, combat.round)
      const turnId = step.turn === combatantId ? null : step.turn
      ;[next] = (await this.db.update(combats).set({ turnId, round: step.round }).where(eq(combats.id, combat.id)).returning()) as [
        CombatRow
      ]
    }
    await this.db.delete(combatants).where(eq(combatants.id, combatantId))
    return this.broadcast(campaignId, next)
  }

  async rollInitiative(campaignId: string, userId: string, ids?: string[]): Promise<CombatDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const gm = isGameMaster(role)
    const combat = await this.require(campaignId)
    const list = await this.list(combat.id)
    const targets = list.filter((c) => {
      if (ids) return ids.includes(c.id) && (gm || c.ownerId === userId)
      return gm ? c.initiative === null && c.ownerId === null : c.ownerId === userId && c.initiative === null
    })
    if (targets.length === 0) throw new BadRequestException('Ninguém para rolar iniciativa')
    for (const combatant of targets) {
      const roll = await this.rolls.create(campaignId, userId, {
        expression: d20(combatant.bonus),
        label: `Iniciativa: ${combatant.name}`.slice(0, 80),
        visibility: combatant.hidden || (gm && combatant.ownerId === null) ? 'gm' : 'public'
      })
      await this.db.update(combatants).set({ initiative: roll.result.total }).where(eq(combatants.id, combatant.id))
    }
    return this.broadcast(campaignId, combat)
  }

  async next(campaignId: string, userId: string): Promise<CombatDto> {
    const role = await this.access.requireMember(campaignId, userId)
    const combat = await this.require(campaignId)
    const list = await this.list(combat.id)
    const current = list.find((c) => c.id === combat.turnId)
    if (!isGameMaster(role) && (!current || current.ownerId !== userId))
      throw new ForbiddenException('Só quem está na vez ou o mestre passa o turno')
    const step = nextTurn(list, combat.turnId, combat.round)
    const [row] = await this.db.update(combats).set({ turnId: step.turn, round: step.round }).where(eq(combats.id, combat.id)).returning()
    const now = list.find((c) => c.id === step.turn)
    let notice: string | undefined
    if (now?.tokenId) {
      const ended = await this.scenes.tickToken(campaignId, now.tokenId)
      if (ended.length) notice = `${ended.join(', ')} ${ended.length > 1 ? 'acabaram' : 'acabou'} em ${now.name}`
    }
    return this.broadcast(campaignId, row!, notice)
  }

  async previous(campaignId: string, userId: string): Promise<CombatDto> {
    await this.requireGameMaster(campaignId, userId)
    const combat = await this.require(campaignId)
    const step = previousTurn(await this.list(combat.id), combat.turnId, combat.round)
    const [row] = await this.db.update(combats).set({ turnId: step.turn, round: step.round }).where(eq(combats.id, combat.id)).returning()
    return this.broadcast(campaignId, row!)
  }

  async end(campaignId: string, userId: string): Promise<void> {
    await this.requireGameMaster(campaignId, userId)
    const combat = await this.require(campaignId)
    await this.db.delete(combats).where(eq(combats.id, combat.id))
    this.realtime.emit({ campaignId }, 'combat:update', { campaignId, combat: null, notice: 'Fim do combate' })
  }

  async attack(campaignId: string, userId: string, input: AttackInput): Promise<AttackResult> {
    const role = await this.access.requireMember(campaignId, userId)
    const gm = isGameMaster(role)
    const [attacker, target] = await Promise.all([
      this.visibleToken(campaignId, input.sceneId, input.attackerId, gm),
      this.visibleToken(campaignId, input.sceneId, input.targetId, gm)
    ])
    if (!gm && attacker.ownerId !== userId) throw new ForbiddenException('Você só ataca com o seu token')
    const attackerName = tokenName(attacker)
    const targetName = tokenName(target)
    const visibility = input.visibility ?? 'public'
    const attack = await this.rolls.create(campaignId, userId, {
      expression: d20(input.bonus, { mode: input.mode ?? 'normal' }),
      label: `${attackerName} ataca ${targetName}: ${input.name}`.slice(0, 80),
      visibility
    })
    const natural = attack.result.natural
    const critical = natural === 20
    const fumble = natural === 1
    const armorClass = typeof target.data.ac === 'number' ? target.data.ac : null
    const hit = critical || (!fumble && (armorClass === null || attack.result.total >= armorClass))
    const damage: { roll: RollDto; type: string }[] = []
    if (hit) {
      for (const part of input.damage ?? []) {
        let expression: string
        try {
          expression = critical ? criticalDamage(part.dice) : part.dice
        } catch {
          throw new BadRequestException(`Não entendi o dano ${part.dice}`)
        }
        const roll = await this.rolls.create(campaignId, userId, {
          expression,
          label: `Dano em ${targetName}: ${input.name}`.slice(0, 80),
          visibility
        })
        damage.push({ roll, type: part.type ?? '' })
      }
    }
    return { attack, hit, critical, fumble, armorClass: gm ? armorClass : null, damage }
  }

  private async visibleToken(campaignId: string, sceneId: string, tokenId: string, gm: boolean): Promise<TokenRow> {
    const [token] = await this.scenes.tokens(campaignId, sceneId, [tokenId])
    if (!token || (!gm && token.layer === 'gm')) throw new NotFoundException('Token não encontrado')
    return token
  }

  private async insertTokens(campaignId: string, combatId: string, tokens: TokenRow[]): Promise<void> {
    if (tokens.length === 0) return
    const values = await Promise.all(
      tokens.map(async (token) => {
        const characterId = typeof token.data.characterId === 'string' ? token.data.characterId : null
        const character = characterId ? await this.scenes.character(campaignId, characterId) : null
        const bonus = character ? derive(character.sheet).initiative : Math.round(Number(token.data.initiative ?? 0)) || 0
        return { combatId, tokenId: token.id, name: tokenName(token), bonus, hidden: token.layer === 'gm', ownerId: token.ownerId }
      })
    )
    await this.db.insert(combatants).values(values)
  }

  private async broadcast(campaignId: string, combat: CombatRow, notice?: string): Promise<CombatDto> {
    const list = await this.list(combat.id)
    const full = this.toDto(combat, list, true)
    const members = await this.db
      .select({ userId: campaignMembers.userId, role: campaignMembers.role })
      .from(campaignMembers)
      .where(eq(campaignMembers.campaignId, campaignId))
    const gms = members.filter((m) => isGameMaster(m.role as Role)).map((m) => m.userId)
    const players = members.filter((m) => !isGameMaster(m.role as Role)).map((m) => m.userId)
    if (gms.length) this.realtime.emit({ userIds: gms }, 'combat:update', { campaignId, combat: full, notice })
    if (players.length) {
      const hiddenTurn = list.find((c) => c.id === combat.turnId)?.hidden
      this.realtime.emit({ userIds: players }, 'combat:update', {
        campaignId,
        combat: this.toDto(combat, list, false),
        notice: hiddenTurn ? undefined : notice
      })
    }
    return full
  }

  private toDto(combat: CombatRow, list: CombatantRow[], gm: boolean): CombatDto {
    const visible = gm ? list : list.filter((c) => !c.hidden)
    const turnVisible = visible.some((c) => c.id === combat.turnId)
    return {
      id: combat.id,
      campaignId: combat.campaignId,
      sceneId: combat.sceneId,
      round: combat.round,
      turnId: turnVisible ? combat.turnId : null,
      combatants: initiativeOrder(visible).map((c): CombatantDto => ({
        id: c.id,
        tokenId: c.tokenId,
        name: c.name,
        initiative: c.initiative,
        bonus: c.bonus,
        hidden: c.hidden,
        ownerId: c.ownerId
      }))
    }
  }

  private async current(campaignId: string): Promise<CombatRow | null> {
    const [row] = await this.db.select().from(combats).where(eq(combats.campaignId, campaignId))
    return row ?? null
  }

  private async require(campaignId: string): Promise<CombatRow> {
    const combat = await this.current(campaignId)
    if (!combat) throw new NotFoundException('Nenhum combate em andamento')
    return combat
  }

  private async list(combatId: string): Promise<CombatantRow[]> {
    return this.db.select().from(combatants).where(eq(combatants.combatId, combatId)).orderBy(asc(combatants.createdAt))
  }

  private async combatant(combatId: string, id: string): Promise<CombatantRow> {
    const [row] = await this.db
      .select()
      .from(combatants)
      .where(and(eq(combatants.combatId, combatId), inArray(combatants.id, [id])))
    if (!row) throw new NotFoundException('Combatente não encontrado')
    return row
  }

  private async requireGameMaster(campaignId: string, userId: string): Promise<Role> {
    const role = await this.access.requireMember(campaignId, userId)
    if (!isGameMaster(role)) throw new ForbiddenException('Só os mestres conduzem o combate')
    return role
  }
}

function tokenName(token: { data: Record<string, unknown> }): string {
  const name = typeof token.data.name === 'string' ? token.data.name.trim() : ''
  return (name || 'Token').slice(0, 40)
}
