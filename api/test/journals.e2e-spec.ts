import { INestApplication } from '@nestjs/common'
import { createApp, signUp, TestUser } from './helpers'

describe('diário e permissões', () => {
  let app: INestApplication
  let gm: TestUser
  let ana: TestUser
  let bruno: TestUser
  let campaignId: string

  beforeAll(async () => {
    app = await createApp()
    gm = await signUp(app, 'Mestra')
    ana = await signUp(app, 'Ana')
    bruno = await signUp(app, 'Bruno')
    const campaign = await gm.agent().post('/api/campaigns').send({ name: 'Ruínas' }).expect(201)
    campaignId = campaign.body.id
    for (const user of [ana, bruno]) await user.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
  })

  afterAll(async () => {
    await app.close()
  })

  it('página nova do mestre começa secreta', async () => {
    const page = await gm
      .agent()
      .post(`/api/campaigns/${campaignId}/journals`)
      .send({ title: 'O traidor', content: 'É o prefeito.' })
      .expect(201)
    expect(page.body).toMatchObject({ access: 'edit', defaultAccess: 'none' })
    const list = await ana.agent().get(`/api/campaigns/${campaignId}/journals`).expect(200)
    expect(list.body).toHaveLength(0)
    await ana.agent().get(`/api/campaigns/${campaignId}/journals/${page.body.id}`).expect(404)
  })

  it('o mestre libera leitura para todos e edição só para a Ana', async () => {
    const page = await gm.agent().post(`/api/campaigns/${campaignId}/journals`).send({ title: 'Mapa da cidade' }).expect(201)
    const id = page.body.id
    await gm
      .agent()
      .patch(`/api/campaigns/${campaignId}/journals/${id}`)
      .send({ access: { defaultAccess: 'view', grants: { [ana.id]: 'edit' } } })
      .expect(200)

    const asBruno = await bruno.agent().get(`/api/campaigns/${campaignId}/journals/${id}`).expect(200)
    expect(asBruno.body.access).toBe('view')
    expect(asBruno.body.grants).toEqual({})
    await bruno.agent().patch(`/api/campaigns/${campaignId}/journals/${id}`).send({ content: 'rabisco' }).expect(403)

    const edited = await ana.agent().patch(`/api/campaigns/${campaignId}/journals/${id}`).send({ content: 'Taverna ao norte' }).expect(200)
    expect(edited.body).toMatchObject({ access: 'edit', content: 'Taverna ao norte' })
    await ana
      .agent()
      .patch(`/api/campaigns/${campaignId}/journals/${id}`)
      .send({ access: { defaultAccess: 'edit', grants: {} } })
      .expect(403)
  })

  it('o diário pessoal do jogador fica escondido até do outro jogador, mas não do mestre', async () => {
    const page = await bruno
      .agent()
      .post(`/api/campaigns/${campaignId}/journals`)
      .send({ title: 'Anotações do Bruno', folder: 'Pessoal' })
      .expect(201)
    await ana.agent().get(`/api/campaigns/${campaignId}/journals/${page.body.id}`).expect(404)
    const asGm = await gm.agent().get(`/api/campaigns/${campaignId}/journals/${page.body.id}`).expect(200)
    expect(asGm.body.access).toBe('edit')
    await ana.agent().delete(`/api/campaigns/${campaignId}/journals/${page.body.id}`).expect(404)
    await bruno.agent().delete(`/api/campaigns/${campaignId}/journals/${page.body.id}`).expect(204)
  })

  it('ignora permissões para quem não é da campanha', async () => {
    const outsider = await signUp(app, 'Fora')
    const page = await gm.agent().post(`/api/campaigns/${campaignId}/journals`).send({ title: 'Lista' }).expect(201)
    const res = await gm
      .agent()
      .patch(`/api/campaigns/${campaignId}/journals/${page.body.id}`)
      .send({ access: { defaultAccess: 'none', grants: { [outsider.id]: 'edit', [ana.id]: 'view' } } })
      .expect(200)
    expect(res.body.grants).toEqual({ [ana.id]: 'view' })
  })
})
