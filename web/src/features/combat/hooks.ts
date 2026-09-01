import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AttackInput,
  AttackResult,
  CombatDto,
  CombatUpdate,
  HpChangeInput,
  HpChangeResult,
  StartCombatInput,
  UpdateCombatantInput
} from '@taverna/shared'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { getSocket } from '@/lib/realtime'

export function useCombat(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.combat(campaignId),
    queryFn: async () => (await api.get<CombatDto | null>(`/campaigns/${campaignId}/combat`)) ?? null
  })
}

export function useCombatFeed(campaignId: string) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const socket = getSocket()
    const onUpdate = ({ campaignId: id, combat, notice }: CombatUpdate) => {
      if (id !== campaignId) return
      queryClient.setQueryData(queryKeys.combat(campaignId), combat)
      if (notice) toast(notice)
    }
    const onReconnect = () => void queryClient.invalidateQueries({ queryKey: queryKeys.combat(campaignId) })
    socket.on('combat:update', onUpdate)
    socket.on('connect', onReconnect)
    return () => {
      socket.off('combat:update', onUpdate)
      socket.off('connect', onReconnect)
    }
  }, [campaignId, queryClient])
}

export function useCombatMutations(campaignId: string) {
  const queryClient = useQueryClient()
  const base = `/campaigns/${campaignId}/combat`
  const set = (combat: CombatDto | null) => queryClient.setQueryData(queryKeys.combat(campaignId), combat)
  const onError = (error: Error) => {
    toast.error(error.message)
    void queryClient.invalidateQueries({ queryKey: queryKeys.combat(campaignId) })
  }
  const options = { onSuccess: set, onError }
  return {
    start: useMutation({ mutationFn: (input: StartCombatInput) => api.post<CombatDto>(base, input), ...options }),
    end: useMutation({ mutationFn: () => api.delete(base), onSuccess: () => set(null), onError }),
    add: useMutation({ mutationFn: (tokenIds: string[]) => api.post<CombatDto>(`${base}/combatants`, { tokenIds }), ...options }),
    update: useMutation({
      mutationFn: ({ id, ...input }: UpdateCombatantInput & { id: string }) => api.patch<CombatDto>(`${base}/combatants/${id}`, input),
      ...options
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete<CombatDto>(`${base}/combatants/${id}`), ...options }),
    initiative: useMutation({
      mutationFn: (combatantIds?: string[]) => api.post<CombatDto>(`${base}/initiative`, combatantIds ? { combatantIds } : {}),
      ...options
    }),
    next: useMutation({ mutationFn: () => api.post<CombatDto>(`${base}/next`, {}), ...options }),
    previous: useMutation({ mutationFn: () => api.post<CombatDto>(`${base}/previous`, {}), ...options })
  }
}

export function useAttack(campaignId: string) {
  return useMutation({
    mutationFn: (input: AttackInput) => api.post<AttackResult>(`/campaigns/${campaignId}/combat/attack`, input),
    onError: (error: Error) => toast.error(error.message)
  })
}

export function useHpChange(campaignId: string) {
  return useMutation({
    mutationFn: ({ sceneId, itemId, ...input }: HpChangeInput & { sceneId: string; itemId: string }) =>
      api.post<HpChangeResult>(`/campaigns/${campaignId}/scenes/${sceneId}/items/${itemId}/hp`, input),
    onError: (error: Error) => toast.error(error.message)
  })
}
