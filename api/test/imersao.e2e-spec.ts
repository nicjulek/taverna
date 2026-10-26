import { INestApplication } from '@nestjs/common'
import type {
  ClientToServerEvents,
  HandoutDto,
  JukeboxDto,
  MessageDto,
  RollDto,
  RtcPeer,
  RtcSignal,
  ServerToClientEvents
} from '@taverna/shared'
import { AddressInfo } from 'node:net'
import { io, Socket } from 'socket.io-client'
import { createApp, signUp, TestUser } from './helpers'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

const wav = () => {
  const data = Buffer.alloc(800, 128)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'latin1')
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8, 'latin1')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(8000, 24)
  header.writeUInt32LE(8000, 28)
  header.writeUInt16LE(1, 32)
  header.writeUInt16LE(8, 34)
  header.write('data', 36, 'latin1')
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAEUlEQVR4nGPQCLDBihgGUgIA4J0hwc2Dia0AAAAASUVORK5CYII=', 'base64')

describe('chat e imersão', () => {
  let app: INestApplication
  let url: string
  let gm: TestUser
  let ana: TestUser
  let bia: TestUser
  let base: string
  let campaignId: string
  const sockets: Client[] = []

  beforeAll(async () => {
    app = await createApp()
    await app.listen(0)
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`
    gm = await signUp(app, 'Mestra')
    ana = await signUp(app, 'Ana')
    bia = await signUp(app, 'Bia')
    const campaign = await gm.agent().post('/api/campaigns').send({ name: 'Brumas' }).expect(201)
    campaignId = campaign.body.id
    base = `/api/campaigns/${campaignId}`
    await ana.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
    await bia.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
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
  const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

  it('rolagem às cegas: o mestre vê, quem rolou não vê o resultado', async () => {
    const gmSocket = await connect(gm)
    const anaSocket = await connect(ana)
    const seen: { gm: RollDto[]; ana: RollDto[] } = { gm: [], ana: [] }
    gmSocket.on('roll:new', (roll) => seen.gm.push(roll))
    anaSocket.on('roll:new', (roll) => seen.ana.push(roll))
    const mine = (
      await ana.agent().post(`${base}/rolls`).send({ expression: '1d20+5', label: 'Intuição', visibility: 'blind' }).expect(201)
    ).body as RollDto
    expect(mine.hidden).toBe(true)
    expect(mine.result.terms).toEqual([])
    await wait()
    expect(seen.gm[0]!.hidden).toBeUndefined()
    expect(seen.gm[0]!.result.total).toBeGreaterThanOrEqual(6)
    expect(seen.ana[0]!.hidden).toBe(true)
    const anaList = (await ana.agent().get(`${base}/rolls`).expect(200)).body as RollDto[]
    expect(anaList[0]!.hidden).toBe(true)
    const biaList = (await bia.agent().get(`${base}/rolls`).expect(200)).body as RollDto[]
    expect(biaList).toHaveLength(0)
    const gmList = (await gm.agent().get(`${base}/rolls`).expect(200)).body as RollDto[]
    expect(gmList[0]!.result.total).toBe(seen.gm[0]!.result.total)
  })

  it('chat: mensagem para todos, só para os mestres e cochicho', async () => {
    await ana.agent().post(`${base}/messages`).send({ text: 'Abro a porta.' }).expect(201)
    await ana.agent().post(`${base}/messages`).send({ text: 'Roubo a bolsa dele.', audience: 'gm' }).expect(201)
    const whisper = (
      await ana
        .agent()
        .post(`${base}/messages`)
        .send({ text: 'Cuidado com o padre.', audience: 'whisper', recipients: [bia.id] })
        .expect(201)
    ).body as MessageDto
    expect(whisper.recipients).toEqual([{ userId: bia.id, displayName: 'Bia' }])
    await ana.agent().post(`${base}/messages`).send({ text: 'x', audience: 'whisper', recipients: [] }).expect(400)
    await ana
      .agent()
      .post(`${base}/messages`)
      .send({ text: 'x', audience: 'whisper', recipients: [crypto.randomUUID()] })
      .expect(400)
    const texts = async (user: TestUser) =>
      ((await user.agent().get(`${base}/messages`).expect(200)).body as MessageDto[]).map((m) => m.text)
    expect(await texts(ana)).toEqual(['Cuidado com o padre.', 'Roubo a bolsa dele.', 'Abro a porta.'])
    expect(await texts(bia)).toEqual(['Cuidado com o padre.', 'Abro a porta.'])
    expect(await texts(gm)).toEqual(['Roubo a bolsa dele.', 'Abro a porta.'])
  })

  it('revelações: só o mestre prepara e a tela do jogador recebe', async () => {
    const image = (await gm.agent().post(`${base}/assets`).attach('file', PNG, 'retrato.png').expect(201)).body
    await ana.agent().post(`${base}/handouts`).send({ title: 'Carta' }).expect(403)
    const letter = (await gm.agent().post(`${base}/handouts`).send({ title: 'Carta do padre', body: 'Venha sozinho.' }).expect(201))
      .body as HandoutDto
    expect(letter).toMatchObject({ kind: 'letter', sharedWith: 'none' })
    const portrait = (
      await gm.agent().post(`${base}/handouts`).send({ title: 'Irmã Odete', kind: 'portrait', assetId: image.id }).expect(201)
    ).body as HandoutDto
    expect(portrait.imageUrl).toBe(`/api/assets/${image.id}`)
    expect((await ana.agent().get(`${base}/handouts`).expect(200)).body).toEqual([])

    const biaSocket = await connect(bia)
    const shown: HandoutDto[] = []
    biaSocket.on('handout:show', (h) => shown.push(h))
    await gm
      .agent()
      .post(`${base}/handouts/${letter.id}/show`)
      .send({ to: [ana.id] })
      .expect(200)
    await gm.agent().post(`${base}/handouts/${portrait.id}/show`).send({ to: 'all' }).expect(200)
    await wait()
    expect(shown.map((h) => h.title)).toEqual(['Irmã Odete'])
    expect(((await ana.agent().get(`${base}/handouts`).expect(200)).body as HandoutDto[]).map((h) => h.title).sort()).toEqual([
      'Carta do padre',
      'Irmã Odete'
    ])
    expect(((await bia.agent().get(`${base}/handouts`).expect(200)).body as HandoutDto[]).map((h) => h.sharedWith)).toEqual(['all'])
    await gm.agent().post(`${base}/handouts/${portrait.id}/show`).send({ to: 'none' }).expect(200)
    expect((await bia.agent().get(`${base}/handouts`).expect(200)).body).toEqual([])
    const music = (await gm.agent().post(`${base}/assets`).attach('file', wav(), 'chuva.wav').expect(201)).body
    expect(music.mime).toBe('audio/wav')
    await gm.agent().patch(`${base}/handouts/${letter.id}`).send({ assetId: music.id }).expect(400)
    await gm.agent().delete(`${base}/handouts/${letter.id}`).expect(204)
  })

  it('trilha sonora sincronizada e efeitos sonoros', async () => {
    const music = ((await gm.agent().get(`${base}/assets`).expect(200)).body as { id: string; mime: string }[]).find(
      (a) => a.mime === 'audio/wav'
    )!
    const anaSocket = await connect(ana)
    const updates: JukeboxDto[] = []
    const sfx: string[] = []
    anaSocket.on('jukebox:update', ({ state }) => updates.push(state))
    anaSocket.on('jukebox:sfx', ({ url }) => sfx.push(url))
    const idle = (await ana.agent().get(`${base}/jukebox`).expect(200)).body as JukeboxDto
    expect(idle).toMatchObject({ assetId: null, playing: false })
    await ana.agent().put(`${base}/jukebox`).send({ assetId: music.id, playing: true, position: 0 }).expect(403)
    const playing = (
      await gm.agent().put(`${base}/jukebox`).send({ assetId: music.id, playing: true, position: 12.5, volume: 0.5 }).expect(200)
    ).body as JukeboxDto
    expect(playing).toMatchObject({
      assetId: music.id,
      name: 'chuva.wav',
      playing: true,
      position: 12.5,
      volume: 0.5,
      url: `/api/assets/${music.id}`
    })
    const image = ((await gm.agent().get(`${base}/assets`).expect(200)).body as { id: string; mime: string }[]).find((a) =>
      a.mime.startsWith('image/')
    )!
    await gm.agent().put(`${base}/jukebox`).send({ assetId: image.id, playing: true, position: 0 }).expect(400)
    await gm.agent().post(`${base}/jukebox/sfx`).send({ assetId: music.id }).expect(204)
    await wait()
    expect(updates.map((u) => u.playing)).toEqual([true])
    expect(sfx).toEqual([`/api/assets/${music.id}`])
  })

  it('voz e vídeo: sinalização só entre quem entrou na sala', async () => {
    const a = await connect(ana)
    const b = await connect(bia)
    const peers: RtcPeer[][] = []
    a.on('rtc:peers', ({ peers: list }) => peers.push(list))
    const signals: { from: string; data: RtcSignal }[] = []
    b.on('rtc:signal', ({ from, data }) => signals.push({ from, data }))
    a.emit('rtc:join', { campaignId, video: true })
    await wait()
    a.emit('rtc:signal', { campaignId, to: b.id!, data: { type: 'offer', sdp: 'x' } })
    await wait()
    expect(signals).toEqual([])
    b.emit('rtc:join', { campaignId, video: false })
    await wait()
    expect(peers.at(-1)!.map((p) => [p.displayName, p.video])).toEqual([
      ['Ana', true],
      ['Bia', false]
    ])
    a.emit('rtc:signal', { campaignId, to: b.id!, data: { type: 'offer', sdp: 'v=0' } })
    await wait()
    expect(signals).toEqual([{ from: a.id, data: { type: 'offer', sdp: 'v=0' } }])
    b.disconnect()
    await wait()
    expect(peers.at(-1)!.map((p) => p.displayName)).toEqual(['Ana'])
  })
})
