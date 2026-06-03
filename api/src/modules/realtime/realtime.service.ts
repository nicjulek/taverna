import { Injectable } from '@nestjs/common'
import { ChangeScope, ClientToServerEvents, RollDto, ServerToClientEvents } from '@taverna/shared'
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

  changed(campaignId: string, scope: ChangeScope, id?: string): void {
    this.server?.to(campaignRoom(campaignId)).emit('campaign:changed', { campaignId, scope, id })
  }

  emit<E extends keyof ServerToClientEvents>(
    target: { campaignId: string } | { userIds: string[] },
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    if (!this.server) return
    const rooms = 'campaignId' in target ? campaignRoom(target.campaignId) : target.userIds.map(userRoom)
    if (Array.isArray(rooms) && rooms.length === 0) return
    ;(this.server.to(rooms).emit as (event: E, ...rest: Parameters<ServerToClientEvents[E]>) => boolean)(event, ...args)
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
