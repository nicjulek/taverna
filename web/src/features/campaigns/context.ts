import type { CampaignDto, PresenceDto } from '@taverna/shared'
import { useOutletContext } from 'react-router'

export interface CampaignContext {
  campaign: CampaignDto
  online: PresenceDto[]
}

export function useCampaignContext() {
  return useOutletContext<CampaignContext>()
}
