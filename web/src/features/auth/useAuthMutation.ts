import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserDto } from '@taverna/shared'
import { useNavigate, useSearchParams } from 'react-router'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { safeRedirect } from '@/lib/session'
import { disconnectSocket } from '@/lib/realtime'

export function useAuthMutation<T>(path: '/auth/login' | '/auth/register') {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  return useMutation({
    mutationFn: (input: T) => api.post<UserDto>(path, input),
    onSuccess: (user) => {
      disconnectSocket()
      queryClient.setQueryData(queryKeys.me, user)
      void navigate(safeRedirect(params.get('voltar')), { replace: true })
    }
  })
}
