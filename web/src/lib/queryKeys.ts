export const queryKeys = {
  me: ['me'] as const,
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaigns', id] as const,
  journals: (campaignId: string) => ['campaigns', campaignId, 'journals'] as const,
  journal: (campaignId: string, id: string) => ['campaigns', campaignId, 'journals', id] as const,
  characters: (campaignId: string) => ['campaigns', campaignId, 'characters'] as const,
  character: (campaignId: string, id: string) => ['campaigns', campaignId, 'characters', id] as const,
  rolls: (campaignId: string) => ['campaigns', campaignId, 'rolls'] as const,
  invite: (code: string) => ['invite', code] as const
}
