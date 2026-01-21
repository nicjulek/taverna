import { INestApplication } from '@nestjs/common'
import { createApp, signUp, TestUser } from './helpers'

describe('campanhas, convites e papéis', () => {
  let app: INestApplication
  let gm: TestUser
  let player: TestUser
  let outsider: TestUser
  let campaignId: string
  let inviteCode: string

  beforeAll(async () => {
    app = await createApp()
    gm = await signUp(app, 'Mestra')
    player = await signUp(app, 'Bardo')
    outsider = await signUp(app, 'Estranho')
    const res = await gm
      .agent()
      .post('/api/campaigns')
      .send({ name: 'A Mina Perdida', description: 'Uma aventura nas montanhas' })
      .expect(201)
    campaignId = res.body.id
    inviteCode = res.body.inviteCode
  })

  afterAll(async () => {
    await app.close()
  })

  it('o criador vira mestre e a campanha começa em D&D 5e', async () => {
    const res = await gm.agent().get(`/api/campaigns/${campaignId}`).expect(200)
    expect(res.body).toMatchObject({ role: 'gm', system: 'dnd5e', members: 1 })
    expect(res.body.inviteCode).toHaveLength(12)
  })

  it('quem não participa não enxerga a campanha', async () => {
    await outsider.agent().get(`/api/campaigns/${campaignId}`).expect(404)
    await outsider.agent().get(`/api/campaigns/${campaignId}/members`).expect(404)
  })

  it('o jogador vê o convite e entra como jogador', async () => {
    const preview = await player.agent().get(`/api/invites/${inviteCode}`).expect(200)
    expect(preview.body).toMatchObject({ name: 'A Mina Perdida', gmName: 'Mestra', alreadyMember: false })
    await player.agent().post(`/api/invites/${inviteCode}/accept`).expect(200)
    const campaign = await player.agent().get(`/api/campaigns/${campaignId}`).expect(200)
    expect(campaign.body.role).toBe('player')
    expect(campaign.body.inviteCode).toBeNull()
    const list = await player.agent().get('/api/campaigns').expect(200)
    expect(list.body[0]).toMatchObject({ id: campaignId, members: 2, role: 'player' })
  })

  it('aceitar duas vezes não duplica', async () => {
    await player.agent().post(`/api/invites/${inviteCode}/accept`).expect(200)
    const res = await gm.agent().get(`/api/campaigns/${campaignId}/members`).expect(200)
    expect(res.body).toHaveLength(2)
  })

  it('jogador não edita a campanha nem gera convite', async () => {
    await player.agent().patch(`/api/campaigns/${campaignId}`).send({ name: 'Tomada' }).expect(403)
    await player.agent().post(`/api/campaigns/${campaignId}/invite`).expect(403)
  })

  it('o mestre promove a co-mestre, que passa a ver o convite', async () => {
    await gm.agent().patch(`/api/campaigns/${campaignId}/members/${player.id}`).send({ role: 'cogm' }).expect(200)
    const res = await player.agent().get(`/api/campaigns/${campaignId}`).expect(200)
    expect(res.body.role).toBe('cogm')
    expect(res.body.inviteCode).toBe(inviteCode)
  })

  it('o convite antigo para de funcionar quando o mestre gera outro', async () => {
    const res = await gm.agent().post(`/api/campaigns/${campaignId}/invite`).expect(201)
    expect(res.body.inviteCode).not.toBe(inviteCode)
    await outsider.agent().get(`/api/invites/${inviteCode}`).expect(404)
  })

  it('o mestre dono não pode sair, mas o jogador pode', async () => {
    await gm.agent().delete(`/api/campaigns/${campaignId}/members/${gm.id}`).expect(403)
    await player.agent().delete(`/api/campaigns/${campaignId}/members/${player.id}`).expect(204)
    await player.agent().get(`/api/campaigns/${campaignId}`).expect(404)
  })

  it('só o dono apaga a campanha', async () => {
    await outsider.agent().delete(`/api/campaigns/${campaignId}`).expect(404)
    await gm.agent().delete(`/api/campaigns/${campaignId}`).expect(204)
    await gm.agent().get(`/api/campaigns/${campaignId}`).expect(404)
  })
})
