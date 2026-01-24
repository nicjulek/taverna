import { useQuery } from '@tanstack/react-query'
import type { UserDto } from '@taverna/shared'
import { api, ApiError } from './api'
import { queryKeys } from './queryKeys'

export function useSession() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await api.get<UserDto>('/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: Infinity
  })
}

export function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/campanhas'
  return target
}
