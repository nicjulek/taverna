import type { RollDto } from './rolls'

export interface PresenceDto {
  userId: string
  displayName: string
  color: string
}

export interface ServerToClientEvents {
  'presence:list': (users: PresenceDto[]) => void
  'campaign:changed': (payload: { campaignId: string; scope: 'members' | 'journals' | 'campaign' }) => void
  'campaign:removed': (payload: { campaignId: string }) => void
  'roll:new': (roll: RollDto) => void
}

export interface ClientToServerEvents {
  'campaign:join': (campaignId: string, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void
  'campaign:leave': (campaignId: string) => void
}
