import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CharacterDto, CharacterSummaryDto, CreateCharacterInput, UpdateCharacterInput } from '@taverna/shared'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useCharacters(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.characters(campaignId),
    queryFn: () => api.get<CharacterSummaryDto[]>(`/campaigns/${campaignId}/characters`)
  })
}

export function useCharacter(campaignId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.character(campaignId, id),
    queryFn: () => api.get<CharacterDto>(`/campaigns/${campaignId}/characters/${id}`)
  })
}

export function useCharacterMutations(campaignId: string) {
  const queryClient = useQueryClient()
  const store = (character: CharacterDto) => {
    queryClient.setQueryData(queryKeys.character(campaignId, character.id), character)
    void queryClient.invalidateQueries({ queryKey: queryKeys.characters(campaignId), exact: true })
  }
  const create = useMutation({
    mutationFn: (input: CreateCharacterInput) => api.post<CharacterDto>(`/campaigns/${campaignId}/characters`, input),
    onSuccess: store
  })
  const update = useMutation({
    mutationFn: ({ id, ...input }: UpdateCharacterInput & { id: string }) =>
      api.patch<CharacterDto>(`/campaigns/${campaignId}/characters/${id}`, input),
    onSuccess: store
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${campaignId}/characters/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.character(campaignId, id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.characters(campaignId), exact: true })
    }
  })
  return { create, update, remove }
}
