import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateJournalInput, JournalDto, JournalSummaryDto, UpdateJournalInput } from '@taverna/shared'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useJournals(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.journals(campaignId),
    queryFn: () => api.get<JournalSummaryDto[]>(`/campaigns/${campaignId}/journals`)
  })
}

export function useJournal(campaignId: string, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.journal(campaignId, id ?? ''),
    queryFn: () => api.get<JournalDto>(`/campaigns/${campaignId}/journals/${id}`),
    enabled: Boolean(id)
  })
}

export function useJournalMutations(campaignId: string) {
  const queryClient = useQueryClient()
  const store = (page: JournalDto) => {
    queryClient.setQueryData(queryKeys.journal(campaignId, page.id), page)
    void queryClient.invalidateQueries({ queryKey: queryKeys.journals(campaignId), exact: true })
  }
  const create = useMutation({
    mutationFn: (input: CreateJournalInput) => api.post<JournalDto>(`/campaigns/${campaignId}/journals`, input),
    onSuccess: store
  })
  const update = useMutation({
    mutationFn: ({ id, ...input }: UpdateJournalInput & { id: string }) =>
      api.patch<JournalDto>(`/campaigns/${campaignId}/journals/${id}`, input),
    onSuccess: store
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${campaignId}/journals/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.journal(campaignId, id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.journals(campaignId), exact: true })
    }
  })
  return { create, update, remove }
}

export function groupByFolder(pages: JournalSummaryDto[]): { folder: string; pages: JournalSummaryDto[] }[] {
  const groups = new Map<string, JournalSummaryDto[]>()
  for (const page of pages) {
    const list = groups.get(page.folder) ?? []
    list.push(page)
    groups.set(page.folder, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b, 'pt-BR')))
    .map(([folder, list]) => ({ folder, pages: list.sort((x, y) => x.title.localeCompare(y.title, 'pt-BR')) }))
}
