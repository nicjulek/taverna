import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CompendiumEntryDto, CompendiumQuery, CompendiumSummaryDto, HomebrewInput } from '@taverna/shared'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

type Page = { items: CompendiumSummaryDto[]; hasMore: boolean }

export function toSearchParams(filters: CompendiumQuery, offset = 0): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters))
    if (value !== undefined && value !== '' && value !== null) params.set(key, String(value))
  if (offset) params.set('offset', String(offset))
  return params.toString()
}

export function useCompendiumSearch(campaignId: string, filters: Omit<CompendiumQuery, 'offset'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.compendiumSearch(campaignId, filters),
    queryFn: ({ pageParam }) => api.get<Page>(`/campaigns/${campaignId}/compendium?${toSearchParams(filters, pageParam)}`),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.reduce((sum, page) => sum + page.items.length, 0) : undefined),
    placeholderData: keepPreviousData
  })
}

export function compendiumEntryQuery(campaignId: string, id: string) {
  return {
    queryKey: queryKeys.compendiumEntry(campaignId, id),
    queryFn: () => api.get<CompendiumEntryDto>(`/campaigns/${campaignId}/compendium/${id}`),
    staleTime: 5 * 60_000
  }
}

export function useCompendiumEntry(campaignId: string, id: string | undefined) {
  return useQuery({ ...compendiumEntryQuery(campaignId, id ?? ''), enabled: Boolean(id) })
}

export function useHomebrewMutations(campaignId: string) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.compendium(campaignId) })
  const save = useMutation({
    mutationFn: ({ id, ...input }: HomebrewInput & { id?: string }) =>
      id
        ? api.patch<CompendiumEntryDto>(`/campaigns/${campaignId}/compendium/${id}`, input)
        : api.post<CompendiumEntryDto>(`/campaigns/${campaignId}/compendium`, input),
    onSuccess: (entry) => {
      queryClient.setQueryData(queryKeys.compendiumEntry(campaignId, entry.id), entry)
      void refresh()
    }
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${campaignId}/compendium/${id}`),
    onSuccess: () => void refresh()
  })
  return { save, remove }
}
