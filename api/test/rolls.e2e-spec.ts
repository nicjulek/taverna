import { INestApplication } from '@nestjs/common'
import { ClientToServerEvents, RollDto, ServerToClientEvents } from '@taverna/shared'
import { AddressInfo } from 'node:net'
import { io, Socket } from 'socket.io-client'
import { createApp, signUp, TestUser } from './helpers'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

describe('rolagens', () => {
  let app: INestApplication
  let url: string
  let gm: TestUser
  let ana: TestUser
  let bruno: TestUser
  let campaignId: string
  const sockets: Client[] = []

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

  const collect = (socket: Client): RollDto[] => {
    const received: RollDto[] = []
    socket.on('roll:new', (roll) => received.push(roll))
    return received
  }

  const rollsPath = () => `/api/campaigns/${campaignId}/rolls`

  beforeAll(async () => {
    app = await createApp()
    await app.listen(0)
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`
    gm = await signUp(app, 'Mestra')
    ana = await signUp(app, 'Ana')
    bruno = await signUp(app, 'Bruno')
    const campaign = await gm.agent().post('/api/campaigns').send({ name: 'Torre' }).expect(201)
    campaignId = campaign.body.id
    for (const user of [ana, bruno]) await user.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
  })

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect())
    await app.close()
  })

  it('o servidor rola e devolve cada dado', async () => {
    const res = await ana.agent().post(rollsPath()).send({ expression: '2d20kh1+5 # Ataque' }).expect(201)
    const roll = res.body as RollDto
    expect(roll).toMatchObject({ userId: ana.id, displayName: 'Ana', label: 'Ataque', visibility: 'public' })
    expect(roll.result.expression).toBe('2d20kh1 + 5')
    expect(roll.result.terms[0]?.dice).toHaveLength(2)
    expect(roll.result.total).toBeGreaterThanOrEqual(6)
    expect(roll.result.total).toBeLessThanOrEqual(25)
  })

  it('o rótulo do formulário vale mais que o do #', async () => {
    const res = await ana.agent().post(rollsPath()).send({ expression: '1d6 # dano', label: 'Adaga' }).expect(201)
    expect(res.body.label).toBe('Adaga')
  })

  it('notação errada volta com a explicação', async () => {
    const res = await ana.agent().post(rollsPath()).send({ expression: '2d' }).expect(400)
    expect(res.body.fields.expression).toContain('número de lados')
  })

  it('quem não está na campanha não rola nem vê', async () => {
    const outsider = await signUp(app, 'Intrusa')
    await outsider.agent().post(rollsPath()).send({ expression: '1d20' }).expect(404)
    await outsider.agent().get(rollsPath()).expect(404)
  })

  it('cada um vê só o que pode', async () => {
    const forGm = await bruno.agent().post(rollsPath()).send({ expression: '1d20', visibility: 'gm', label: 'Furtividade' }).expect(201)
    const secret = await gm.agent().post(rollsPath()).send({ expression: '1d20', visibility: 'self', label: 'Emboscada' }).expect(201)

    const ids = async (user: TestUser) => ((await user.agent().get(rollsPath()).expect(200)).body as RollDto[]).map((r) => r.id)
    expect(await ids(bruno)).toContain(forGm.body.id)
    expect(await ids(gm)).toEqual(expect.arrayContaining([forGm.body.id, secret.body.id]))
    expect(await ids(ana)).not.toContain(forGm.body.id)
    expect(await ids(ana)).not.toContain(secret.body.id)
    expect(await ids(bruno)).not.toContain(secret.body.id)
  })

  it('lista da mais nova para a mais antiga e pagina por data', async () => {
    const all = (await gm.agent().get(rollsPath()).expect(200)).body as RollDto[]
    const dates = all.map((r) => r.createdAt)
    expect([...dates].sort().reverse()).toEqual(dates)
    const older = (
      await gm
        .agent()
        .get(`${rollsPath()}?before=${encodeURIComponent(all[1]!.createdAt)}`)
        .expect(200)
    ).body as RollDto[]
    expect(older.every((r) => r.createdAt < all[1]!.createdAt)).toBe(true)
    await gm.agent().get(`${rollsPath()}?before=ontem`).expect(400)
  })

  it('avisa na hora só quem pode ver', async () => {
    const gmSocket = await connect(gm)
    const anaSocket = await connect(ana)
    const brunoSocket = await connect(bruno)
    const [toGm, toAna, toBruno] = [collect(gmSocket), collect(anaSocket), collect(brunoSocket)]

    const open = await ana.agent().post(rollsPath()).send({ expression: '1d8+2' }).expect(201)
    const hidden = await bruno.agent().post(rollsPath()).send({ expression: '1d20', visibility: 'gm' }).expect(201)
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(toGm.map((r) => r.id)).toEqual([open.body.id, hidden.body.id])
    expect(toBruno.map((r) => r.id)).toEqual([open.body.id, hidden.body.id])
    expect(toAna.map((r) => r.id)).toEqual([open.body.id])
  })
})
