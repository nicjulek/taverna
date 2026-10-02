import type { MessageDto } from './chat'
import type { CombatUpdate } from './combat'
import type { HandoutDto } from './handouts'
import type { JukeboxDto } from './jukebox'
import type { RollDto } from './rolls'
import type { SceneItemDto } from './scenes'

export interface PresenceDto {
  userId: string
  displayName: string
  color: string
}

export type ChangeScope = 'members' | 'journals' | 'campaign' | 'characters' | 'compendium' | 'assets' | 'handouts'

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
  'combat:update': (payload: CombatUpdate) => void
  'message:new': (message: MessageDto) => void
  'handout:show': (handout: HandoutDto) => void
  'jukebox:update': (payload: { campaignId: string; state: JukeboxDto }) => void
  'jukebox:sfx': (payload: { campaignId: string; url: string; volume: number }) => void
  'rtc:peers': (payload: { campaignId: string; peers: RtcPeer[] }) => void
  'rtc:signal': (payload: { campaignId: string; from: string; data: RtcSignal }) => void
}

export interface RtcPeer {
  userId: string
  socketId: string
  displayName: string
  color: string
  video: boolean
}

export type RtcSignal =
  | { type: 'offer' | 'answer'; sdp: string }
  | { type: 'candidate'; candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null } }

export interface ClientToServerEvents {
  'campaign:join': (campaignId: string, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void
  'campaign:leave': (campaignId: string) => void
  'rtc:join': (payload: { campaignId: string; video: boolean }) => void
  'rtc:leave': (payload: { campaignId: string }) => void
  'rtc:signal': (payload: { campaignId: string; to: string; data: RtcSignal }) => void
}
