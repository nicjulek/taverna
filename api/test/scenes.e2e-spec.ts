import { INestApplication } from '@nestjs/common'
import type { AssetDto, ClientToServerEvents, SceneDto, SceneItemDto, SceneWithItemsDto, ServerToClientEvents } from '@taverna/shared'
import { AddressInfo } from 'node:net'
import { io, Socket } from 'socket.io-client'
import { createApp, signUp, TestUser } from './helpers'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)])
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script></svg>')

describe('mesa', () => {
  let app: INestApplication
  let url: string
  let gm: TestUser
  let player: TestUser
  let campaignId: string
  let base: string
  const sockets: Client[] = []

  beforeAll(async () => {
    app = await createApp()
    await app.listen(0)
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`
    gm = await signUp(app, 'Mestra')
    player = await signUp(app, 'Jogador')
    const campaign = await gm.agent().post('/api/campaigns').send({ name: 'Cripta' }).expect(201)
    campaignId = campaign.body.id
    base = `/api/campaigns/${campaignId}`
    await player.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
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

  describe('arquivos', () => {
    it('aceita imagem pelo conteúdo e serve só para quem está na campanha', async () => {
      const res = await gm.agent().post(`${base}/assets`).attach('file', PNG, 'masmorra.png').expect(201)
      const asset = res.body as AssetDto
      expect(asset).toMatchObject({ name: 'masmorra.png', mime: 'image/png', size: PNG.length })
      const file = await player.agent().get(asset.url).expect(200)
      expect(file.headers['content-type']).toBe('image/png')
      expect(file.headers['x-content-type-options']).toBe('nosniff')
      const outsider = await signUp(app, 'Curioso')
      await outsider.agent().get(asset.url).expect(404)
    })

    it('recusa o que não é imagem nem vídeo, mesmo com extensão de imagem', async () => {
      const res = await gm
        .agent()
        .post(`${base}/assets`)
        .attach('file', Buffer.from('<html><script>x</script></html>'.padEnd(64)), 'mapa.png')
        .expect(400)
      expect(res.body.message).toContain('Formato não aceito')
    })

    it('SVG vem com política que bloqueia script', async () => {
      const res = await gm.agent().post(`${base}/assets`).attach('file', SVG, 'runas.svg').expect(201)
      const file = await gm.agent().get(res.body.url).expect(200)
      expect(file.headers['content-security-policy']).toContain('sandbox')
    })

    it('lista e apaga', async () => {
      const list = (await player.agent().get(`${base}/assets`).expect(200)).body as AssetDto[]
      expect(list.length).toBeGreaterThanOrEqual(2)
      await player.agent().delete(`${base}/assets/${list[0]!.id}`).expect(403)
      await gm.agent().delete(`${base}/assets/${list[0]!.id}`).expect(204)
    })
  })

  describe('cenas', () => {
    let first: SceneDto
    let second: SceneDto

    it('a primeira cena já fica ativa para os jogadores', async () => {
      first = (await gm.agent().post(`${base}/scenes`).send({ name: 'Taverna' }).expect(201)).body as SceneDto
      second = (await gm.agent().post(`${base}/scenes`).send({ name: 'Cripta' }).expect(201)).body as SceneDto
      expect(first.active).toBe(true)
      expect(second.active).toBe(false)
      expect(first.settings.grid).toMatchObject({ type: 'square', size: 70 })
      await player.agent().post(`${base}/scenes`).send({ name: 'Minha' }).expect(403)
    })

    it('jogador só enxerga a cena ativa', async () => {
      const list = (await player.agent().get(`${base}/scenes`).expect(200)).body as SceneDto[]
      expect(list.map((s) => s.name)).toEqual(['Taverna'])
      await player.agent().get(`${base}/scenes/${second.id}`).expect(404)
      const active = (await player.agent().get(`${base}/scenes/active`).expect(200)).body as SceneWithItemsDto
      expect(active.id).toBe(first.id)
    })

    it('camada do mestre fica escondida e trocar de camada avisa na hora', async () => {
      const playerSocket = await connect(player)
      const events: string[] = []
      playerSocket.on('scene:item', ({ item }) => events.push(`item:${item.layer}`))
      playerSocket.on('scene:item:removed', () => events.push('removed'))

      const trap = (
        await gm
          .agent()
          .post(`${base}/scenes/${first.id}/items`)
          .send({ layer: 'gm', kind: 'marker', x: 100, y: 100, width: 70, height: 70, data: { label: 'Armadilha' } })
          .expect(201)
      ).body as SceneItemDto
      const map = (
        await gm
          .agent()
          .post(`${base}/scenes/${first.id}/items`)
          .send({ layer: 'map', kind: 'image', x: 0, y: 0, width: 2100, height: 1400, data: { assetId: 'x' } })
          .expect(201)
      ).body as SceneItemDto
      expect(map.z).toBeGreaterThan(trap.z)

      const seen = (await player.agent().get(`${base}/scenes/active`).expect(200)).body as SceneWithItemsDto
      expect(seen.items.map((i) => i.layer)).toEqual(['map'])
      await player.agent().patch(`${base}/scenes/${first.id}/items/${trap.id}`).send({ x: 1 }).expect(404)

      await gm.agent().patch(`${base}/scenes/${first.id}/items/${trap.id}`).send({ layer: 'objects' }).expect(200)
      await gm.agent().patch(`${base}/scenes/${first.id}/items/${trap.id}`).send({ layer: 'gm' }).expect(200)
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(events).toEqual(['item:map', 'item:objects', 'removed'])
    })

    it('jogador desenha e move o próprio token, mas não mexe no mapa travado nem cria imagem', async () => {
      const token = (
        await player
          .agent()
          .post(`${base}/scenes/${first.id}/items`)
          .send({ layer: 'tokens', kind: 'token', x: 35, y: 35, width: 70, height: 70, data: { name: 'Bram' } })
          .expect(201)
      ).body as SceneItemDto
      expect(token.ownerId).toBe(player.id)
      await player.agent().patch(`${base}/scenes/${first.id}/items/${token.id}`).send({ x: 105 }).expect(200)
      await player.agent().patch(`${base}/scenes/${first.id}/items/${token.id}`).send({ locked: true }).expect(403)
      await player
        .agent()
        .post(`${base}/scenes/${first.id}/items`)
        .send({ layer: 'map', kind: 'image', x: 0, y: 0, width: 10, height: 10 })
        .expect(403)
      await player
        .agent()
        .post(`${base}/scenes/${first.id}/items`)
        .send({ layer: 'objects', kind: 'template', x: 0, y: 0, width: 10, height: 10, data: { template: 'cone', size: 15 } })
        .expect(201)

      const map = ((await gm.agent().get(`${base}/scenes/${first.id}`).expect(200)).body as SceneWithItemsDto).items.find(
        (i) => i.kind === 'image'
      )!
      await gm.agent().patch(`${base}/scenes/${first.id}/items/${map.id}`).send({ locked: true }).expect(200)
      await player.agent().patch(`${base}/scenes/${first.id}/items/${map.id}`).send({ x: 5 }).expect(403)
      await player.agent().delete(`${base}/scenes/${first.id}/items/${map.id}`).expect(403)
    })

    it('trocar a cena ativa avisa a mesa e duplicar copia os itens', async () => {
      const playerSocket = await connect(player)
      const active = new Promise<string | null>((resolve) => playerSocket.on('scene:active', ({ sceneId }) => resolve(sceneId)))
      await gm.agent().post(`${base}/scenes/${second.id}/activate`).expect(200)
      expect(await active).toBe(second.id)
      await player.agent().get(`${base}/scenes/${first.id}`).expect(404)

      const copy = (await gm.agent().post(`${base}/scenes/${first.id}/duplicate`).expect(201)).body as SceneDto
      const copied = (await gm.agent().get(`${base}/scenes/${copy.id}`).expect(200)).body as SceneWithItemsDto
      expect(copied.name).toBe('Taverna (cópia)')
      expect(copied.items.length).toBe(4)
    })

    it('valida configurações e apaga a cena ativa', async () => {
      await gm
        .agent()
        .patch(`${base}/scenes/${second.id}`)
        .send({ settings: { ...second.settings, grid: { ...second.settings.grid, size: 5 } } })
        .expect(400)
      await gm.agent().delete(`${base}/scenes/${second.id}`).expect(204)
      expect((await player.agent().get(`${base}/scenes/active`).expect(200)).body).toEqual({})
    })
  })
})
