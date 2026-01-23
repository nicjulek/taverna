export const queryKeys = {
  me: ['me'] as const,
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaigns', id] as const,
  journals: (campaignId: string) => ['campaigns', campaignId, 'journals'] as const,
  journal: (campaignId: string, id: string) => ['campaigns', campaignId, 'journals', id] as const,
  invite: (code: string) => ['invite', code] as const
}
