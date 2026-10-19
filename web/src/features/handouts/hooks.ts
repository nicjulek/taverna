import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateHandoutInput, HandoutDto, ShowHandoutInput, UpdateHandoutInput } from '@taverna/shared'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { getSocket } from '@/lib/realtime'

export function useHandouts(campaignId: string) {
  return useQuery({ queryKey: queryKeys.handouts(campaignId), queryFn: () => api.get<HandoutDto[]>(`/campaigns/${campaignId}/handouts`) })
}

export function useHandoutMutations(campaignId: string) {
  const queryClient = useQueryClient()
  const base = `/campaigns/${campaignId}/handouts`
  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.handouts(campaignId) })
  const onError = (error: Error) => toast.error(error.message)
  return {
    create: useMutation({ mutationFn: (input: CreateHandoutInput) => api.post<HandoutDto>(base, input), onSuccess: refresh, onError }),
    update: useMutation({
      mutationFn: ({ id, ...input }: UpdateHandoutInput & { id: string }) => api.patch<HandoutDto>(`${base}/${id}`, input),
      onSuccess: refresh,
      onError
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`${base}/${id}`), onSuccess: refresh, onError }),
    show: useMutation({
      mutationFn: ({ id, to }: ShowHandoutInput & { id: string }) => api.post<HandoutDto>(`${base}/${id}/show`, { to }),
      onSuccess: refresh,
      onError
    })
  }
}

export function useHandoutFeed(campaignId: string, onShow: (handout: HandoutDto) => void) {
  const queryClient = useQueryClient()
  const callback = useRef(onShow)
  useEffect(() => {
    callback.current = onShow
  })
  useEffect(() => {
    const socket = getSocket()
    const handle = (handout: HandoutDto) => {
      if (handout.campaignId !== campaignId) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.handouts(campaignId) })
      callback.current(handout)
    }
    socket.on('handout:show', handle)
    return () => {
      socket.off('handout:show', handle)
    }
  }, [campaignId, queryClient])
}
