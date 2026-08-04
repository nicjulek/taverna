import type { RollDto } from './rolls'
import type { SceneItemDto } from './scenes'

export interface PresenceDto {
  userId: string
  displayName: string
  color: string
}

export type ChangeScope = 'members' | 'journals' | 'campaign' | 'characters' | 'compendium' | 'assets'

export interface ServerToClientEvents {
  'presence:list': (users: PresenceDto[]) => void
  'campaign:changed': (payload: { campaignId: string; scope: ChangeScope; id?: string }) => void
  'campaign:removed': (payload: { campaignId: string }) => void
  'roll:new': (roll: RollDto) => void
  'scene:list': (payload: { campaignId: string }) => void
  'scene:active': (payload: { campaignId: string; sceneId: string | null }) => void
  'scene:item': (payload: { campaignId: string; sceneId: string; item: SceneItemDto }) => void
  'scene:item:removed': (payload: { campaignId: string; sceneId: string; id: string }) => void
  'scene:explored': (payload: { campaignId: string; sceneId: string; explored: string | null }) => void
}

export interface ClientToServerEvents {
  'campaign:join': (campaignId: string, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void
  'campaign:leave': (campaignId: string) => void
}
