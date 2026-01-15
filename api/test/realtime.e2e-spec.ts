import { INestApplication } from '@nestjs/common'
import { ClientToServerEvents, PresenceDto, ServerToClientEvents } from '@taverna/shared'
import { AddressInfo } from 'node:net'
import { io, Socket } from 'socket.io-client'
import { createApp, signUp, TestUser } from './helpers'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

describe('tempo real', () => {
  let app: INestApplication
  let url: string
  let gm: TestUser
  let player: TestUser
  let campaignId: string
  const sockets: Client[] = []

  const connect = (user: TestUser): Promise<Client> =>
    new Promise((resolve, reject) => {
      const socket: Client = io(url, { transports: ['websocket'], extraHeaders: { Cookie: user.cookie }, forceNew: true })
      sockets.push(socket)
      socket.on('connect', () => resolve(socket))
      socket.on('connect_error', reject)
    })

  const join = (socket: Client, id: string) => new Promise<{ ok: boolean }>((resolve) => socket.emit('campaign:join', id, resolve))

  const next = <E extends keyof ServerToClientEvents>(socket: Client, event: E) =>
    new Promise<Parameters<ServerToClientEvents[E]>[0]>((resolve) => {
      socket.once(event as 'presence:list', ((payload: unknown) => resolve(payload as Parameters<ServerToClientEvents[E]>[0])) as never)
    })

  beforeAll(async () => {
    app = await createApp()
    await app.listen(0)
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`
    gm = await signUp(app, 'Mestra')
    player = await signUp(app, 'Ladina')
    const campaign = await gm.agent().post('/api/campaigns').send({ name: 'Cripta' }).expect(201)
    campaignId = campaign.body.id
    await player.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
  })

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect())
    await app.close()
  })

  it('recusa conexão sem sessão', async () => {
    const socket = io(url, { transports: ['websocket'], forceNew: true })
    sockets.push(socket)
    await new Promise<void>((resolve) => socket.on('disconnect', () => resolve()))
  })

  it('mostra quem está online e avisa quando alguém sai', async () => {
    const gmSocket = await connect(gm)
    expect(await join(gmSocket, campaignId)).toEqual({ ok: true })

    const playerSocket = await connect(player)
    const presence = next(gmSocket, 'presence:list')
    await join(playerSocket, campaignId)
    expect(((await presence) as PresenceDto[]).map((user) => user.displayName)).toEqual(['Ladina', 'Mestra'])

    const afterLeave = next(gmSocket, 'presence:list')
    playerSocket.disconnect()
    expect(((await afterLeave) as PresenceDto[]).map((user) => user.displayName)).toEqual(['Mestra'])
  })

  it('não deixa entrar na sala de campanha alheia', async () => {
    const outsider = await signUp(app, 'Intrusa')
    const socket = await connect(outsider)
    expect(await join(socket, campaignId)).toEqual({ ok: false, error: 'Campanha não encontrada' })
  })

  it('avisa a sala quando o diário muda e o jogador quando é removido', async () => {
    const gmSocket = await connect(gm)
    await join(gmSocket, campaignId)
    const playerSocket = await connect(player)
    await join(playerSocket, campaignId)

    const changed = next(playerSocket, 'campaign:changed')
    await gm.agent().post(`/api/campaigns/${campaignId}/journals`).send({ title: 'Pistas' }).expect(201)
    expect(await changed).toEqual({ campaignId, scope: 'journals' })

    const removed = next(playerSocket, 'campaign:removed')
    await gm.agent().delete(`/api/campaigns/${campaignId}/members/${player.id}`).expect(204)
    expect(await removed).toEqual({ campaignId })
  })
})
