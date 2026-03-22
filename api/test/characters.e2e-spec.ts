import { INestApplication } from '@nestjs/common'
import type { CharacterDto, CharacterSummaryDto } from '@taverna/shared'
import { createApp, signUp, TestUser } from './helpers'

describe('fichas', () => {
  let app: INestApplication
  let gm: TestUser
  let ana: TestUser
  let bruno: TestUser
  let base: string

  beforeAll(async () => {
    app = await createApp()
    gm = await signUp(app, 'Mestra')
    ana = await signUp(app, 'Ana')
    bruno = await signUp(app, 'Bruno')
    const campaign = await gm.agent().post('/api/campaigns').send({ name: 'Vale' }).expect(201)
    base = `/api/campaigns/${campaign.body.id}/characters`
    for (const user of [ana, bruno]) await user.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
  })

  afterAll(async () => {
    await app.close()
  })

  const create = async (user: TestUser, name: string, classKey = 'rogue') =>
    (await user.agent().post(base).send({ name, classKey, level: 3, race: 'Halfling' }).expect(201)).body as CharacterDto

  it('cria a ficha com os valores da classe', async () => {
    const pip = await create(ana, 'Pip')
    expect(pip).toMatchObject({ name: 'Pip', ownerId: ana.id, access: 'edit', defaultAccess: 'view', version: 1 })
    expect(pip.sheet.classes).toEqual([{ key: 'rogue', level: 3, caster: 'none', subclass: '' }])
    expect(pip.sheet.saves).toEqual(['dex', 'int'])
    expect(pip.sheet.hp.max).toBe(18)
  })

  it('o grupo vê, mas só o dono e os mestres editam', async () => {
    const pip = await create(ana, 'Pip 2')
    const list = (await bruno.agent().get(base).expect(200)).body as CharacterSummaryDto[]
    expect(list.find((c) => c.id === pip.id)).toMatchObject({ access: 'view', ownerName: 'Ana' })
    await bruno.agent().patch(`${base}/${pip.id}`).send({ version: 1, name: 'Roubado' }).expect(403)
    const edited = await gm.agent().patch(`${base}/${pip.id}`).send({ version: 1, name: 'Pip, o Ágil' }).expect(200)
    expect(edited.body).toMatchObject({ name: 'Pip, o Ágil', version: 2 })
  })

  it('recusa versão antiga para não apagar o que outra pessoa salvou', async () => {
    const pip = await create(ana, 'Pip 3')
    const sheet = { ...pip.sheet, armorClass: 15 }
    await ana.agent().patch(`${base}/${pip.id}`).send({ version: 1, sheet }).expect(200)
    const stale = await gm
      .agent()
      .patch(`${base}/${pip.id}`)
      .send({ version: 1, sheet: { ...pip.sheet, armorClass: 12 } })
      .expect(409)
    expect(stale.body.message).toContain('mudou em outra tela')
    const fresh = await gm.agent().get(`${base}/${pip.id}`).expect(200)
    expect(fresh.body.sheet.armorClass).toBe(15)
  })

  it('valida a ficha e limita os PV ao máximo', async () => {
    const pip = await create(ana, 'Pip 4')
    await ana
      .agent()
      .patch(`${base}/${pip.id}`)
      .send({ version: 1, sheet: { ...pip.sheet, abilities: { ...pip.sheet.abilities, str: 40 } } })
      .expect(400)
    const res = await ana
      .agent()
      .patch(`${base}/${pip.id}`)
      .send({ version: 1, sheet: { ...pip.sheet, hp: { current: 99, max: 20, temporary: 0 } } })
      .expect(200)
    expect(res.body.sheet.hp).toEqual({ current: 20, max: 20, temporary: 0 })
  })

  it('o dono esconde a ficha e libera só para o mestre', async () => {
    const secret = await create(bruno, 'Espião', 'bard')
    await bruno
      .agent()
      .patch(`${base}/${secret.id}`)
      .send({ version: 1, access: { defaultAccess: 'none', grants: {} } })
      .expect(200)
    await ana.agent().get(`${base}/${secret.id}`).expect(404)
    await gm.agent().get(`${base}/${secret.id}`).expect(200)
    await ana.agent().delete(`${base}/${secret.id}`).expect(404)
  })

  it('outro jogador não apaga, o mestre apaga', async () => {
    const pip = await create(ana, 'Pip 5')
    await bruno.agent().delete(`${base}/${pip.id}`).expect(403)
    await gm.agent().delete(`${base}/${pip.id}`).expect(204)
    await ana.agent().get(`${base}/${pip.id}`).expect(404)
  })
})
