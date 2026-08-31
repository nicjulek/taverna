import { INestApplication } from '@nestjs/common'
import type {
  AttackResult,
  CharacterDto,
  ClientToServerEvents,
  CombatDto,
  CombatUpdate,
  HpChangeResult,
  SceneDto,
  SceneItemDto,
  ServerToClientEvents
} from '@taverna/shared'
import { AddressInfo } from 'node:net'
import { io, Socket } from 'socket.io-client'
import { createApp, signUp, TestUser } from './helpers'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

describe('combate', () => {
  let app: INestApplication
  let url: string
  let gm: TestUser
  let player: TestUser
  let campaignId: string
  let base: string
  let scene: SceneDto
  let hero: SceneItemDto
  let goblin: SceneItemDto
  let shade: SceneItemDto
  let character: CharacterDto
  const sockets: Client[] = []
  const items = () => `${base}/scenes/${scene.id}/items`

  beforeAll(async () => {
    app = await createApp()
    await app.listen(0)
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`
    gm = await signUp(app, 'Mestra')
    player = await signUp(app, 'Jogadora')
    const campaign = await gm.agent().post('/api/campaigns').send({ name: 'Ponte' }).expect(201)
    campaignId = campaign.body.id
    base = `/api/campaigns/${campaignId}`
    await player.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
    scene = (await gm.agent().post(`${base}/scenes`).send({ name: 'Ponte' }).expect(201)).body as SceneDto
    character = (
      await player.agent().post(`${base}/characters`).send({ name: 'Iris', classKey: 'fighter', level: 1, race: 'Humana' }).expect(201)
    ).body as CharacterDto
  })

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect())
    await app.close()
  })

  const connect = async (user: TestUser): Promise<Client> => {
    const socket: Client = io(url, { transports: ['websocket'], extraHeaders: { Cookie: user.cookie }, forceNew: true })
    sockets.push(socket)
    await new Promise<void>((resolve, reject) => {
      socket.on('connect', resolve)
      socket.on('connect_error', reject)
    })
    await new Promise((resolve) => socket.emit('campaign:join', campaignId, resolve))
    return socket
  }

  const token = async (data: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    (
      await gm
        .agent()
        .post(items())
        .send({ layer: 'tokens', kind: 'token', x: 0, y: 0, width: 70, height: 70, data, ...extra })
        .expect(201)
    ).body as SceneItemDto

  it('token ligado à ficha copia PV e CA da ficha', async () => {
    hero = await token({ name: 'Iris', characterId: character.id }, { ownerId: player.id })
    expect(hero.data.hp).toEqual(character.sheet.hp)
    expect(hero.data.ac).toBe(character.sheet.armorClass)
    goblin = await token({
      name: 'Goblin',
      hp: { current: 7, max: 7, temporary: 0 },
      ac: 15,
      initiative: 2,
      defenses: { vulnerabilities: ['Concussão'], immunities: ['poison'] }
    })
    shade = await token({ name: 'Sombra', hp: { current: 16, max: 16, temporary: 0 }, ac: 12 }, { layer: 'gm' })
  })

  it('dano considera vulnerabilidade e imunidade', async () => {
    const crushed = (
      await player.agent().post(`${items()}/${goblin.id}/hp`).send({ change: 'damage', amount: 3, type: 'concussão' }).expect(200)
    ).body as HpChangeResult
    expect(crushed).toMatchObject({ amount: 6, adjustment: 'vulnerable', hp: { current: 1, max: 7 } })
    const poisoned = (await gm.agent().post(`${items()}/${goblin.id}/hp`).send({ change: 'damage', amount: 9, type: 'Veneno' }).expect(200))
      .body as HpChangeResult
    expect(poisoned).toMatchObject({ amount: 0, adjustment: 'immune', droppedToZero: false })
    const healed = (await gm.agent().post(`${items()}/${goblin.id}/hp`).send({ change: 'healing', amount: 20 }).expect(200))
      .body as HpChangeResult
    expect(healed.hp.current).toBe(7)
    await player.agent().post(`${items()}/${shade.id}/hp`).send({ change: 'damage', amount: 1 }).expect(404)
  })

  it('dano no token da ficha muda a ficha e os outros tokens dela', async () => {
    const before = character.sheet.hp
    const res = (await gm.agent().post(`${items()}/${hero.id}/hp`).send({ change: 'temporary', amount: 5 }).expect(200))
      .body as HpChangeResult
    expect(res.hp).toEqual({ ...before, temporary: 5 })
    await gm.agent().post(`${items()}/${hero.id}/hp`).send({ change: 'damage', amount: 7 }).expect(200)
    const sheet = (await player.agent().get(`${base}/characters/${character.id}`).expect(200)).body as CharacterDto
    expect(sheet.sheet.hp).toEqual({ ...before, current: before.current - 2, temporary: 0 })
    expect(sheet.version).toBe(character.version + 2)
    await player
      .agent()
      .patch(`${base}/characters/${character.id}`)
      .send({ version: sheet.version, sheet: { ...sheet.sheet, hp: { ...sheet.sheet.hp, current: before.max } } })
      .expect(200)
    const fresh = (await gm.agent().get(`${base}/scenes/${scene.id}`).expect(200)).body.items as SceneItemDto[]
    expect(fresh.find((i) => i.id === hero.id)!.data.hp).toEqual({ ...before, current: before.max, temporary: 0 })
  })

  it('o mestre começa o combate e o jogador não vê quem está oculto', async () => {
    const playerSocket = await connect(player)
    const updates: CombatUpdate[] = []
    playerSocket.on('combat:update', (update) => updates.push(update))
    await player.agent().post(`${base}/combat`).send({ sceneId: scene.id }).expect(403)
    const combat = (await gm.agent().post(`${base}/combat`).send({ sceneId: scene.id }).expect(201)).body as CombatDto
    expect(combat.combatants.map((c) => c.name).sort()).toEqual(['Goblin', 'Iris', 'Sombra'])
    expect(combat.combatants.find((c) => c.name === 'Goblin')!.bonus).toBe(2)
    await gm.agent().post(`${base}/combat`).send({ sceneId: scene.id }).expect(409)
    const seen = (await player.agent().get(`${base}/combat`).expect(200)).body as CombatDto
    expect(seen.combatants.map((c) => c.name).sort()).toEqual(['Goblin', 'Iris'])
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(updates.at(-1)!.combat!.combatants).toHaveLength(2)
  })

  it('iniciativa: o mestre rola os monstros, o jogador a sua', async () => {
    const afterGm = (await gm.agent().post(`${base}/combat/initiative`).send({}).expect(200)).body as CombatDto
    const iris = afterGm.combatants.find((c) => c.name === 'Iris')!
    expect(iris.initiative).toBeNull()
    expect(afterGm.combatants.filter((c) => c.initiative !== null)).toHaveLength(2)
    const goblinId = afterGm.combatants.find((c) => c.name === 'Goblin')!.id
    await player
      .agent()
      .post(`${base}/combat/initiative`)
      .send({ combatantIds: [goblinId] })
      .expect(400)
    const done = (await player.agent().post(`${base}/combat/initiative`).send({}).expect(200)).body as CombatDto
    expect(done.combatants.every((c) => c.initiative !== null)).toBe(true)
    await player.agent().patch(`${base}/combat/combatants/${goblinId}`).send({ initiative: 1 }).expect(403)
    await gm.agent().patch(`${base}/combat/combatants/${iris.id}`).send({ initiative: 30 }).expect(200)
  })

  it('turnos, rodadas e efeitos que acabam no início da vez', async () => {
    await gm
      .agent()
      .patch(`${items()}/${goblin.id}`)
      .send({
        data: {
          ...goblin.data,
          hp: { current: 7, max: 7, temporary: 0 },
          effects: [
            { id: 'e1', condition: 'prone' },
            { id: 'e2', label: 'Lentidão', rounds: 1 }
          ]
        }
      })
      .expect(200)
    const first = (await gm.agent().post(`${base}/combat/next`).expect(200)).body as CombatDto
    expect(first.round).toBe(1)
    const irisId = first.combatants.find((c) => c.name === 'Iris')!.id
    expect(first.turnId).toBe(irisId)
    const gmSocket = await connect(gm)
    const notices: string[] = []
    gmSocket.on('combat:update', ({ notice }) => notice && notices.push(notice))
    let combat = first
    for (let i = 0; i < 3 && combat.combatants.find((c) => c.id === combat.turnId)?.name !== 'Goblin'; i++) {
      const turn = combat.combatants.find((c) => c.id === combat.turnId)!
      const actor = turn.ownerId === player.id ? player : gm
      combat = (await actor.agent().post(`${base}/combat/next`).expect(200)).body as CombatDto
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(notices).toContain('Lentidão acabou em Goblin')
    const fresh = (await gm.agent().get(`${base}/scenes/${scene.id}`).expect(200)).body.items as SceneItemDto[]
    expect(fresh.find((i) => i.id === goblin.id)!.data.effects).toEqual([{ id: 'e1', label: 'Caído', condition: 'prone', rounds: null }])
    await player.agent().post(`${base}/combat/next`).expect(403)
    const back = (await gm.agent().post(`${base}/combat/previous`).expect(200)).body as CombatDto
    expect(back.turnId).not.toBe(combat.turnId)
  })

  it('ataque rola contra a CA e o dano só vem quando acerta', async () => {
    await gm.agent().post(`${base}/scenes/${scene.id}/activate`).expect(200)
    await player
      .agent()
      .post(`${base}/combat/attack`)
      .send({ sceneId: scene.id, attackerId: goblin.id, targetId: hero.id, name: 'Cimitarra', bonus: 4 })
      .expect(403)
    await player
      .agent()
      .post(`${base}/combat/attack`)
      .send({ sceneId: scene.id, attackerId: hero.id, targetId: shade.id, name: 'Espada', bonus: 5 })
      .expect(404)
    const results: AttackResult[] = []
    for (let i = 0; i < 12; i++) {
      results.push(
        (
          await player
            .agent()
            .post(`${base}/combat/attack`)
            .send({
              sceneId: scene.id,
              attackerId: hero.id,
              targetId: goblin.id,
              name: 'Espada longa',
              bonus: 5,
              damage: [{ dice: '1d8+3', type: 'Cortante' }]
            })
            .expect(200)
        ).body as AttackResult
      )
    }
    for (const r of results) {
      expect(r.armorClass).toBeNull()
      expect(r.attack.label).toBe('Iris ataca Goblin: Espada longa')
      expect(r.hit).toBe(r.critical || (!r.fumble && r.attack.result.total >= 15))
      expect(r.damage).toHaveLength(r.hit ? 1 : 0)
      if (r.critical) expect(r.damage[0]!.roll.result.expression).toMatch(/^2d8 ?\+ ?3$/)
    }
    const gmView = (
      await gm
        .agent()
        .post(`${base}/combat/attack`)
        .send({ sceneId: scene.id, attackerId: shade.id, targetId: hero.id, name: 'Toque', bonus: 4, mode: 'advantage', visibility: 'gm' })
        .expect(200)
    ).body as AttackResult
    expect(gmView.armorClass).toBe(character.sheet.armorClass)
    expect(gmView.attack.result.expression).toBe('2d20kh1 + 4')
    expect(gmView.attack.visibility).toBe('gm')
  })

  it('só o mestre encerra o combate', async () => {
    await player.agent().delete(`${base}/combat`).expect(403)
    await gm.agent().delete(`${base}/combat`).expect(204)
    expect((await player.agent().get(`${base}/combat`).expect(200)).text).toBe('')
  })
})
