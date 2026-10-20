import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { JukeboxDto, JukeboxInput } from '@taverna/shared'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { getSocket } from '@/lib/realtime'

let skew = 0

export function serverNow(): number {
  return Date.now() + skew
}

function learn(state: JukeboxDto) {
  skew = Date.parse(state.serverTime) - Date.now()
  return state
}

export function useJukebox(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.jukebox(campaignId),
    queryFn: async () => learn(await api.get<JukeboxDto>(`/campaigns/${campaignId}/jukebox`))
  })
}

export function useJukeboxFeed(campaignId: string, onSfx: (url: string, volume: number) => void) {
  const queryClient = useQueryClient()
  const sfx = useRef(onSfx)
  useEffect(() => {
    sfx.current = onSfx
  })
  useEffect(() => {
    const socket = getSocket()
    const onUpdate = ({ campaignId: id, state }: { campaignId: string; state: JukeboxDto }) =>
      id === campaignId && queryClient.setQueryData(queryKeys.jukebox(campaignId), learn(state))
    const onSfxEvent = ({ campaignId: id, url, volume }: { campaignId: string; url: string; volume: number }) =>
      id === campaignId && sfx.current(url, volume)
    socket.on('jukebox:update', onUpdate)
    socket.on('jukebox:sfx', onSfxEvent)
    return () => {
      socket.off('jukebox:update', onUpdate)
      socket.off('jukebox:sfx', onSfxEvent)
    }
  }, [campaignId, queryClient])
}

export function useJukeboxControls(campaignId: string) {
  const queryClient = useQueryClient()
  return {
    set: useMutation({
      mutationFn: (input: JukeboxInput) => api.put<JukeboxDto>(`/campaigns/${campaignId}/jukebox`, input),
      onSuccess: (state) => queryClient.setQueryData(queryKeys.jukebox(campaignId), learn(state)),
      onError: (error: Error) => toast.error(error.message)
    }),
    sfx: useMutation({
      mutationFn: (assetId: string) => api.post(`/campaigns/${campaignId}/jukebox/sfx`, { assetId }),
      onError: (error: Error) => toast.error(error.message)
    })
  }
}

const VOLUME_KEY = 'taverna:volume'

export function readLocalVolume(): number {
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY))
    return localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.8
  } catch {
    return 0.8
  }
}

export function writeLocalVolume(value: number) {
  try {
    localStorage.setItem(VOLUME_KEY, String(value))
  } catch {
    return
  }
}
