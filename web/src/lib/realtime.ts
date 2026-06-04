import { useQueryClient } from '@tanstack/react-query'
import type { ChangeScope, ClientToServerEvents, PresenceDto, ServerToClientEvents } from '@taverna/shared'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { queryKeys } from './queryKeys'

type TavernaSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TavernaSocket | null = null

export function getSocket(): TavernaSocket {
  socket ??= io({ withCredentials: true, transports: ['websocket', 'polling'] })
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export function useCampaignRoom(campaignId: string): { online: PresenceDto[]; connected: boolean } {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [online, setOnline] = useState<PresenceDto[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const client = getSocket()
    const join = () => {
      client.emit('campaign:join', campaignId, (result) => setConnected(result.ok))
    }
    const onDisconnect = () => setConnected(false)
    const onPresence = (users: PresenceDto[]) => setOnline(users)
    const onChanged = ({ campaignId: id, scope }: { campaignId: string; scope: ChangeScope }) => {
      if (id !== campaignId) return
      if (scope === 'journals') void queryClient.invalidateQueries({ queryKey: queryKeys.journals(campaignId) })
      else if (scope === 'assets') void queryClient.invalidateQueries({ queryKey: queryKeys.assets(campaignId) })
      else if (scope === 'compendium') void queryClient.invalidateQueries({ queryKey: queryKeys.compendium(campaignId) })
      else if (scope === 'characters') void queryClient.invalidateQueries({ queryKey: queryKeys.characters(campaignId) })
      else void queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) })
      if (scope === 'members' || scope === 'campaign') void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns, exact: true })
    }
    const onRemoved = ({ campaignId: id }: { campaignId: string }) => {
      if (id !== campaignId) return
      queryClient.removeQueries({ queryKey: queryKeys.campaign(campaignId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns })
      toast('Você não faz mais parte desta campanha.')
      void navigate('/campanhas', { replace: true })
    }

    client.on('connect', join)
    client.on('disconnect', onDisconnect)
    client.on('presence:list', onPresence)
    client.on('campaign:changed', onChanged)
    client.on('campaign:removed', onRemoved)
    if (client.connected) join()

    return () => {
      client.emit('campaign:leave', campaignId)
      client.off('connect', join)
      client.off('disconnect', onDisconnect)
      client.off('presence:list', onPresence)
      client.off('campaign:changed', onChanged)
      client.off('campaign:removed', onRemoved)
      setOnline([])
    }
  }, [campaignId, queryClient, navigate])

  return { online, connected }
}
