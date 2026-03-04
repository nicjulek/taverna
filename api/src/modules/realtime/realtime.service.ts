import { Injectable } from '@nestjs/common'
import { ClientToServerEvents, RollDto, ServerToClientEvents } from '@taverna/shared'
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

  roll(roll: RollDto, userIds?: string[]): void {
    if (!this.server) return
    if (!userIds) {
      this.server.to(campaignRoom(roll.campaignId)).emit('roll:new', roll)
      return
    }
    this.server.to(userIds.map(userRoom)).emit('roll:new', roll)
  }

  removed(campaignId: string, userIds: string[]): void {
    if (!this.server) return
    for (const userId of userIds) {
      this.server.to(userRoom(userId)).emit('campaign:removed', { campaignId })
      this.server.in(userRoom(userId)).socketsLeave(campaignRoom(campaignId))
    }
  }
}
