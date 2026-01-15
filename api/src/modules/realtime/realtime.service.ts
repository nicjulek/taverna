import { Injectable } from '@nestjs/common'
import { ClientToServerEvents, ServerToClientEvents } from '@taverna/shared'
import { Server } from 'socket.io'

export type TavernaServer = Server<ClientToServerEvents, ServerToClientEvents>

export const campaignRoom = (campaignId: string) => `campaign:${campaignId}`
export const userRoom = (userId: string) => `user:${userId}`

@Injectable()
export class RealtimeService {
  private server: TavernaServer | null = null

  attach(server: TavernaServer): void {
    this.server = server
  }

  changed(campaignId: string, scope: 'members' | 'journals' | 'campaign'): void {
    this.server?.to(campaignRoom(campaignId)).emit('campaign:changed', { campaignId, scope })
  }

  removed(campaignId: string, userIds: string[]): void {
    if (!this.server) return
    for (const userId of userIds) {
      this.server.to(userRoom(userId)).emit('campaign:removed', { campaignId })
      this.server.in(userRoom(userId)).socketsLeave(campaignRoom(campaignId))
    }
  }
}
