import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CampaignDto, CampaignSummaryDto, CreateCampaignInput, MemberDto, UpdateCampaignInput } from '@taverna/shared'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useCampaigns() {
  return useQuery({ queryKey: queryKeys.campaigns, queryFn: () => api.get<CampaignSummaryDto[]>('/campaigns') })
}

export function useCampaign(id: string) {
  return useQuery({ queryKey: queryKeys.campaign(id), queryFn: () => api.get<CampaignDto>(`/campaigns/${id}`) })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => api.post<CampaignDto>('/campaigns', input),
    onSuccess: (campaign) => {
      queryClient.setQueryData(queryKeys.campaign(campaign.id), campaign)
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns, exact: true })
    }
  })
}

export function useBringCampaign() {
  const queryClient = useQueryClient()
  const done = (campaign: CampaignDto) => {
    queryClient.setQueryData(queryKeys.campaign(campaign.id), campaign)
    void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns, exact: true })
  }
  return {
    importFile: useMutation({
      mutationFn: (file: File) => {
        const form = new FormData()
        form.append('file', file)
        return api.upload<CampaignDto>('/campaigns/import', form)
      },
      onSuccess: done
    }),
    demo: useMutation({ mutationFn: () => api.post<CampaignDto>('/campaigns/demo', {}), onSuccess: done })
  }
}

export function useUpdateCampaign(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCampaignInput) => api.patch<CampaignDto>(`/campaigns/${id}`, input),
    onSuccess: (campaign) => {
      queryClient.setQueryData(queryKeys.campaign(id), campaign)
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns, exact: true })
    }
  })
}

export function useDeleteCampaign(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.campaign(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns, exact: true })
    }
  })
}

export function useMemberActions(campaignId: string) {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns, exact: true })
  }
  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'cogm' | 'player' }) =>
      api.patch<MemberDto[]>(`/campaigns/${campaignId}/members/${userId}`, { role }),
    onSuccess: refresh
  })
  const remove = useMutation({
    mutationFn: (userId: string) => api.delete(`/campaigns/${campaignId}/members/${userId}`),
    onSuccess: refresh
  })
  const regenerateInvite = useMutation({
    mutationFn: () => api.post<{ inviteCode: string }>(`/campaigns/${campaignId}/invite`),
    onSuccess: refresh
  })
  const disableInvite = useMutation({
    mutationFn: () => api.delete(`/campaigns/${campaignId}/invite`),
    onSuccess: refresh
  })
  return { changeRole, remove, regenerateInvite, disableInvite }
}
