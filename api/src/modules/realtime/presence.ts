import { PresenceDto } from '@taverna/shared'

export class PresenceRegistry {
  private readonly rooms = new Map<string, Map<string, { user: PresenceDto; sockets: Set<string> }>>()

  join(campaignId: string, socketId: string, user: PresenceDto): PresenceDto[] {
    const room = this.rooms.get(campaignId) ?? new Map<string, { user: PresenceDto; sockets: Set<string> }>()
    const entry = room.get(user.userId) ?? { user, sockets: new Set<string>() }
    entry.sockets.add(socketId)
    room.set(user.userId, entry)
    this.rooms.set(campaignId, room)
    return this.list(campaignId)
  }

  leave(campaignId: string, socketId: string): PresenceDto[] {
    const room = this.rooms.get(campaignId)
    if (!room) return []
    for (const [userId, entry] of room) {
      entry.sockets.delete(socketId)
      if (entry.sockets.size === 0) room.delete(userId)
    }
    if (room.size === 0) this.rooms.delete(campaignId)
    return this.list(campaignId)
  }

  list(campaignId: string): PresenceDto[] {
    const room = this.rooms.get(campaignId)
    if (!room) return []
    return [...room.values()].map((entry) => entry.user).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }
}
