import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway } from '@nestjs/websockets'
import { ClientToServerEvents, type RtcPeer, ServerToClientEvents } from '@taverna/shared'
import { parse } from 'cookie'
import { Socket } from 'socket.io'
import { readSession, SESSION_COOKIE } from '../../common/auth'
import { UsersService } from '../auth/users.service'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { PresenceRegistry } from './presence'
import { campaignRoom, RealtimeService, TavernaServer, userRoom } from './realtime.service'

interface SocketData {
  userId: string
  displayName: string
  color: string
  campaigns: Set<string>
}

type TavernaSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

@WebSocketGateway({ cors: { origin: (process.env.WEB_ORIGIN ?? 'http://localhost:5173').split(','), credentials: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name)
  private readonly presence = new PresenceRegistry()
  private readonly voice = new Map<string, Map<string, RtcPeer>>()
  private server!: TavernaServer

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly access: CampaignAccessService,
    private readonly realtime: RealtimeService
  ) {}

  afterInit(server: TavernaServer): void {
    this.server = server
    this.realtime.attach(server)
  }

  handleConnection(socket: TavernaSocket): Promise<boolean> {
    const ready = this.authenticate(socket)
    this.listen(socket, ready)
    return ready
  }

  private async authenticate(socket: TavernaSocket): Promise<boolean> {
    const cookies = parse(socket.handshake.headers.cookie ?? '')
    const session = await readSession(this.jwt, cookies[SESSION_COOKIE])
    const user = session ? await this.users.findById(session.id).catch(() => null) : null
    if (!user) {
      socket.disconnect(true)
      return false
    }
    socket.data = { userId: user.id, displayName: user.displayName, color: user.color, campaigns: new Set() }
    await socket.join(userRoom(user.id))
    return true
  }

  handleDisconnect(socket: TavernaSocket): void {
    for (const campaignId of socket.data?.campaigns ?? []) this.leave(socket, campaignId)
  }

  private voiceRoom = (campaignId: string) => `voz:${campaignId}`

  private leaveVoice(socket: TavernaSocket, campaignId: string): void {
    const peers = this.voice.get(campaignId)
    if (!peers?.delete(socket.id)) return
    void socket.leave(this.voiceRoom(campaignId))
    if (peers.size === 0) this.voice.delete(campaignId)
    this.server.to(this.voiceRoom(campaignId)).emit('rtc:peers', { campaignId, peers: [...peers.values()] })
  }

  private listen(socket: TavernaSocket, ready: Promise<boolean>): void {
    socket.on('campaign:join', async (campaignId, ack) => {
      if (!(await ready)) return
      const role = await this.access.roleOf(campaignId, socket.data.userId).catch(() => null)
      if (!role) {
        ack?.({ ok: false, error: 'Campanha não encontrada' })
        return
      }
      await socket.join(campaignRoom(campaignId))
      socket.data.campaigns.add(campaignId)
      const { userId, displayName, color } = socket.data
      const list = this.presence.join(campaignId, socket.id, { userId, displayName, color })
      this.server.to(campaignRoom(campaignId)).emit('presence:list', list)
      ack?.({ ok: true })
    })

    socket.on('rtc:join', async ({ campaignId, video }) => {
      if (!(await ready) || !socket.data.campaigns.has(campaignId)) return
      const peers = this.voice.get(campaignId) ?? new Map<string, RtcPeer>()
      this.voice.set(campaignId, peers)
      const { userId, displayName, color } = socket.data
      peers.set(socket.id, { userId, socketId: socket.id, displayName, color, video: Boolean(video) })
      await socket.join(this.voiceRoom(campaignId))
      this.server.to(this.voiceRoom(campaignId)).emit('rtc:peers', { campaignId, peers: [...peers.values()] })
    })

    socket.on('rtc:leave', async ({ campaignId }) => {
      if (!(await ready)) return
      this.leaveVoice(socket, campaignId)
    })

    socket.on('rtc:signal', async ({ campaignId, to, data }) => {
      if (!(await ready)) return
      const peers = this.voice.get(campaignId)
      if (!peers?.has(socket.id) || !peers.has(to)) return
      this.server.to(to).emit('rtc:signal', { campaignId, from: socket.id, data })
    })

    socket.on('campaign:leave', async (campaignId) => {
      if (!(await ready)) return
      void socket.leave(campaignRoom(campaignId))
      this.leave(socket, campaignId)
    })
  }

  private leave(socket: TavernaSocket, campaignId: string): void {
    this.leaveVoice(socket, campaignId)
    socket.data.campaigns.delete(campaignId)
    const list = this.presence.leave(campaignId, socket.id)
    this.server.to(campaignRoom(campaignId)).emit('presence:list', list)
    this.logger.debug(`saiu de ${campaignId}`)
  }
}
