import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type CreateMessageInput, MESSAGE_PAGE_SIZE, type MessageDto } from '@taverna/shared'
import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { getSocket } from '@/lib/realtime'

type Pages = InfiniteData<MessageDto[], string | null>

export function prependMessage(data: Pages | undefined, message: MessageDto): Pages | undefined {
  if (!data) return data
  if (data.pages.some((page) => page.some((m) => m.id === message.id))) return data
  const [first = [], ...rest] = data.pages
  return { ...data, pages: [[message, ...first], ...rest] }
}

export function useMessages(campaignId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(campaignId),
    queryFn: ({ pageParam }) =>
      api.get<MessageDto[]>(`/campaigns/${campaignId}/messages${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < MESSAGE_PAGE_SIZE ? undefined : last[last.length - 1]!.createdAt)
  })
}

export function useSendMessage(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMessageInput) => api.post<MessageDto>(`/campaigns/${campaignId}/messages`, input),
    onSuccess: (message) => queryClient.setQueryData<Pages>(queryKeys.messages(campaignId), (data) => prependMessage(data, message))
  })
}

export function useMessageFeed(campaignId: string, onMessage?: (message: MessageDto) => void) {
  const queryClient = useQueryClient()
  const callback = useRef(onMessage)
  useEffect(() => {
    callback.current = onMessage
  })
  useEffect(() => {
    const socket = getSocket()
    const handle = (message: MessageDto) => {
      if (message.campaignId !== campaignId) return
      queryClient.setQueryData<Pages>(queryKeys.messages(campaignId), (data) => prependMessage(data, message))
      callback.current?.(message)
    }
    socket.on('message:new', handle)
    return () => {
      socket.off('message:new', handle)
    }
  }, [campaignId, queryClient])
}
