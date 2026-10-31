import { INestApplication } from '@nestjs/common'
import type { AssetDto, CampaignDto, CampaignExport, CharacterDto, HandoutDto, SceneDto, SceneWithItemsDto } from '@taverna/shared'
import sharp from 'sharp'
import { createApp, signUp, TestUser } from './helpers'

const noise = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#3d6b5a' } })
    .png({ compressionLevel: 0 })
    .toBuffer()

describe('portabilidade', () => {
  let app: INestApplication
  let gm: TestUser
  let ana: TestUser
  let bia: TestUser
  let base: string
  let campaignId: string

  beforeAll(async () => {
    app = await createApp()
    gm = await signUp(app, 'Mestra')
    ana = await signUp(app, 'Ana')
    bia = await signUp(app, 'Bia')
    const campaign = await gm
      .agent()
      .post('/api/campaigns')
      .send({ name: 'Ilha das Névoas', description: 'Piratas e fantasmas' })
      .expect(201)
    campaignId = campaign.body.id
    base = `/api/campaigns/${campaignId}`
    await ana.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
  })

  afterAll(async () => {
    await app.close()
  })

  it('comprime mapas e tokens e separa a galeria por tipo', async () => {
    const big = await noise(4600, 200)
    const map = (await gm.agent().post(`${base}/assets`).attach('file', big, 'ilha.png').expect(201)).body as AssetDto
    expect(map).toMatchObject({ kind: 'map', mime: 'image/webp', originalSize: big.length })
    expect(map.size).toBeLessThan(map.originalSize)

    const face = await noise(900, 900)
    const token = (await gm.agent().post(`${base}/assets`).field('kind', 'token').attach('file', face, 'capitao.png').expect(201))
      .body as AssetDto
    expect(token.kind).toBe('token')
    const file = await gm
      .agent()
      .get(token.url)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => done(null, Buffer.concat(chunks)))
      })
    expect((await sharp(file.body as Buffer).metadata()).width).toBe(512)

    await gm.agent().patch(`${base}/assets/${map.id}`).send({ kind: 'audio' }).expect(400)
    const renamed = await gm.agent().patch(`${base}/assets/${map.id}`).send({ name: 'Ilha', kind: 'image' }).expect(200)
    expect(renamed.body).toMatchObject({ name: 'Ilha', kind: 'image' })
    await ana.agent().patch(`${base}/assets/${map.id}`).send({ name: 'Minha' }).expect(403)
  })

  it('exporta e importa fichas', async () => {
    const pip = (await ana.agent().post(`${base}/characters`).send({ name: 'Pip', classKey: 'rogue', level: 3 }).expect(201))
      .body as CharacterDto
    const exported = await ana.agent().get(`${base}/characters/${pip.id}/export`).expect(200)
    expect(exported.headers['content-disposition']).toContain('pip.ficha.json')
    expect(exported.body).toMatchObject({ format: 'taverna.ficha', version: 1, name: 'Pip' })
    await bia.agent().get(`${base}/characters/${pip.id}/export`).expect(404)

    const copy = (
      await ana
        .agent()
        .post(`${base}/characters/import`)
        .send({ ...exported.body, name: 'Pip II' })
        .expect(201)
    ).body as CharacterDto
    expect(copy.name).toBe('Pip II')
    expect(copy.sheet.classes).toEqual(pip.sheet.classes)
    await ana.agent().post(`${base}/characters/import`).send({ format: 'outra', name: 'X' }).expect(400)
  })

  it('exporta a campanha inteira e importa como mestre de uma nova', async () => {
    const assets = (await gm.agent().get(`${base}/assets`).expect(200)).body as AssetDto[]
    const image = assets.find((a) => a.kind === 'image')!
    const token = assets.find((a) => a.kind === 'token')!
    const characters = (await gm.agent().get(`${base}/characters`).expect(200)).body as CharacterDto[]
    const goblin = (
      await gm
        .agent()
        .get('/api/campaigns/' + campaignId + '/compendium?kind=monster&q=Goblin')
        .expect(200)
    ).body.items[0] as { id: string }
    const scene = (await gm.agent().post(`${base}/scenes`).send({ name: 'Porto' }).expect(201)).body as SceneDto
    const add = (body: object) => gm.agent().post(`${base}/scenes/${scene.id}/items`).send(body).expect(201)
    await add({ layer: 'map', kind: 'image', x: 0, y: 0, width: 2000, height: 1000, data: { assetId: image.id } })
    await add({
      layer: 'tokens',
      kind: 'token',
      x: 70,
      y: 70,
      width: 70,
      height: 70,
      data: { name: 'Pip', characterId: characters[0]!.id }
    })
    await add({ layer: 'tokens', kind: 'token', x: 140, y: 70, width: 70, height: 70, data: { name: 'Capitão', assetId: token.id } })
    await add({ layer: 'gm', kind: 'token', x: 210, y: 70, width: 70, height: 70, data: { name: 'Goblin', compendiumId: goblin.id } })
    await gm.agent().post(`${base}/handouts`).send({ title: 'Mapa do tesouro', kind: 'image', assetId: image.id }).expect(201)
    await gm.agent().post(`${base}/journals`).send({ title: 'Segredos', content: '# Ilha' }).expect(201)

    await ana.agent().get(`${base}/export`).expect(403)
    const file = await gm.agent().get(`${base}/export`).expect(200)
    const data = file.body as CampaignExport
    expect(data.format).toBe('taverna.campanha')
    expect(data.assets).toHaveLength(2)
    expect(Object.values(data.srd ?? {})).toContain('srd-monster-goblin')

    const imported = (
      await bia
        .agent()
        .post('/api/campaigns/import')
        .attach('file', Buffer.from(JSON.stringify(data)), 'ilha.campanha.json')
        .expect(201)
    ).body as CampaignDto
    expect(imported).toMatchObject({ name: 'Ilha das Névoas', role: 'gm', members: 1 })
    const next = `/api/campaigns/${imported.id}`
    const newAssets = (await bia.agent().get(`${next}/assets`).expect(200)).body as AssetDto[]
    const newCharacters = (await bia.agent().get(`${next}/characters`).expect(200)).body as CharacterDto[]
    expect(newCharacters.map((c) => c.name).sort()).toEqual(['Pip', 'Pip II'])
    const [porto] = (await bia.agent().get(`${next}/scenes`).expect(200)).body as SceneDto[]
    const full = (await bia.agent().get(`${next}/scenes/${porto!.id}`).expect(200)).body as SceneWithItemsDto
    const byName = (name: string) => full.items.find((item) => item.data.name === name)!
    expect(newAssets.map((a) => a.id)).toContain(full.items.find((i) => i.kind === 'image')!.data.assetId)
    expect(newCharacters.map((c) => c.id)).toContain(byName('Pip').data.characterId)
    expect(byName('Goblin').data.compendiumId).toBe(goblin.id)
    expect(byName('Goblin').layer).toBe('gm')
    const notes = (await bia.agent().get(`${next}/handouts`).expect(200)).body as HandoutDto[]
    expect(notes[0]).toMatchObject({ title: 'Mapa do tesouro', sharedWith: 'none' })
    expect(newAssets.map((a) => a.id)).toContain(notes[0]!.assetId)
    await gm.agent().get(`${next}/assets`).expect(404)
  })

  it('recusa arquivos que não são campanhas', async () => {
    const bad = await bia.agent().post('/api/campaigns/import').attach('file', Buffer.from('não é json'), 'x.json').expect(400)
    expect(bad.body.message).toContain('JSON')
    const sheet = { format: 'taverna.ficha', version: 1, name: 'Pip', sheet: {} }
    const wrong = await bia
      .agent()
      .post('/api/campaigns/import')
      .attach('file', Buffer.from(JSON.stringify(sheet)), 'pip.json')
      .expect(400)
    expect(wrong.body.message).toContain('ficha')
    const fake = {
      format: 'taverna.campanha',
      version: 1,
      campaign: { name: 'Falsa' },
      assets: [{ ref: 'a', name: 'virus.png', mime: 'image/png', data: Buffer.from('<script>').toString('base64') }]
    }
    await bia
      .agent()
      .post('/api/campaigns/import')
      .attach('file', Buffer.from(JSON.stringify(fake)), 'f.json')
      .expect(400)
    const mine = (await bia.agent().get('/api/campaigns').expect(200)).body as CampaignDto[]
    expect(mine.map((c) => c.name)).not.toContain('Falsa')
  })

  it('abre a campanha de demonstração pronta', async () => {
    const demo = (await bia.agent().post('/api/campaigns/demo').expect(201)).body as CampaignDto
    expect(demo).toMatchObject({ name: 'As Minas de Pedraluz', role: 'gm' })
    const scenes = (await bia.agent().get(`/api/campaigns/${demo.id}/scenes`).expect(200)).body as SceneDto[]
    expect(scenes.map((s) => s.name)).toEqual(['Mina antiga', 'Vau-do-Corvo'])
    expect(scenes.filter((s) => s.active)).toHaveLength(1)
    const handouts = (await bia.agent().get(`/api/campaigns/${demo.id}/handouts`).expect(200)).body as HandoutDto[]
    expect(handouts).toHaveLength(3)
  })
})
