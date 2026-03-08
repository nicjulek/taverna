import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type CreateRollInput, ROLL_PAGE_SIZE, type RollDto } from '@taverna/shared'
import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { getSocket } from '@/lib/realtime'

type Pages = InfiniteData<RollDto[], string | null>

export function useRolls(campaignId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.rolls(campaignId),
    queryFn: ({ pageParam }) =>
      api.get<RollDto[]>(`/campaigns/${campaignId}/rolls${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < ROLL_PAGE_SIZE ? undefined : last[last.length - 1]!.createdAt)
  })
}

export function prependRoll(data: Pages | undefined, roll: RollDto): Pages | undefined {
  if (!data) return data
  if (data.pages.some((page) => page.some((r) => r.id === roll.id))) return data
  const [first = [], ...rest] = data.pages
  return { ...data, pages: [[roll, ...first], ...rest] }
}

export function useRoll(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRollInput) => api.post<RollDto>(`/campaigns/${campaignId}/rolls`, input),
    onSuccess: (roll) => queryClient.setQueryData<Pages>(queryKeys.rolls(campaignId), (data) => prependRoll(data, roll))
  })
}

export function useRollFeed(campaignId: string, onRoll?: (roll: RollDto) => void) {
  const queryClient = useQueryClient()
  const callback = useRef(onRoll)
  callback.current = onRoll

  useEffect(() => {
    const socket = getSocket()
    const handle = (roll: RollDto) => {
      if (roll.campaignId !== campaignId) return
      queryClient.setQueryData<Pages>(queryKeys.rolls(campaignId), (data) => prependRoll(data, roll))
      callback.current?.(roll)
    }
    socket.on('roll:new', handle)
    return () => {
      socket.off('roll:new', handle)
    }
  }, [campaignId, queryClient])
}
