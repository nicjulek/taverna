import { ChatPanel } from '../chat/ChatPanel'
import { useCampaignContext } from '../campaigns/context'
import { DiceRoller } from './DiceRoller'

export function DicePage() {
  const { campaign } = useCampaignContext()
  return (
    <div className="grid flex-1 items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="lg:sticky lg:top-20">
        <DiceRoller campaignId={campaign.id} />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="text-2xl">Conversa da mesa</h2>
        <ChatPanel />
      </div>
    </div>
  )
}
