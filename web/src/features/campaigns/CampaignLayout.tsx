import { isGameMaster, ROLE_LABELS } from '@taverna/shared'
import { BookMarked, BookOpen, Dices, Feather, Map as MapIcon, ScrollText, Settings, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import { CriticalFail } from '@/components/art/CriticalFail'
import { Landscape } from '@/components/art/Landscape'
import { Badge, Button, EmptyState, Seal, Skeleton, Token } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useCampaignRoom } from '@/lib/realtime'
import { useSession } from '@/lib/session'
import { useMessageFeed } from '../chat/hooks'
import { useRollFeed } from '../dice/hooks'
import { HandoutOverlay } from '../handouts/HandoutOverlay'
import { Jukebox } from '../jukebox/Jukebox'
import { Dice3dOverlay } from '../dice3d/Dice3dOverlay'
import { VoiceDock } from '../voice/VoiceDock'
import type { CampaignContext } from './context'
import { useCampaign } from './hooks'

const TABS = [
  { to: 'mesa', label: 'Mesa', icon: MapIcon },
  { to: 'diario', label: 'Diário', icon: BookOpen },
  { to: 'fichas', label: 'Fichas', icon: ScrollText },
  { to: 'dados', label: 'Chat e dados', icon: Dices },
  { to: 'revelacoes', label: 'Revelações', icon: Feather },
  { to: 'compendio', label: 'Compêndio', icon: BookMarked },
  { to: 'jogadores', label: 'Jogadores', icon: Users },
  { to: 'ajustes', label: 'Ajustes', icon: Settings }
]

export function CampaignLayout() {
  const { campaignId = '' } = useParams()
  const { data: campaign, error, isPending } = useCampaign(campaignId)
  const { online, connected } = useCampaignRoom(campaignId)
  const { pathname } = useLocation()
  const { data: me } = useSession()
  useRollFeed(campaignId, (roll) => {
    if (roll.userId === me?.id || pathname.endsWith('/dados')) return
    toast(roll.hidden ? `${roll.displayName} rolou às cegas` : `${roll.displayName} rolou ${roll.result.total}`, {
      description: roll.label || roll.result.expression
    })
  })
  useMessageFeed(campaignId, (message) => {
    if (message.userId === me?.id || pathname.endsWith('/dados')) return
    toast(message.audience === 'whisper' ? `${message.displayName} cochichou` : message.displayName, {
      description: message.text.length > 120 ? `${message.text.slice(0, 117)}…` : message.text
    })
  })

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <EmptyState
          art={<CriticalFail className="mx-auto w-40" />}
          title={notFound ? 'Campanha não encontrada' : 'Não foi possível abrir a campanha'}
          action={
            <Button asChild variant="secondary">
              <Link to="/campanhas">Voltar para suas mesas</Link>
            </Button>
          }
        >
          {notFound ? 'Ela pode ter sido apagada, ou você não participa mais dela.' : error.message}
        </EmptyState>
      </div>
    )
  }

  if (isPending || !campaign) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Skeleton className="h-20 w-full max-w-lg" />
        <Skeleton className="mt-8 h-96" />
      </div>
    )
  }

  const onlineIds = new Set(online.map((user) => user.userId))

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b border-line">
        <Landscape seed={campaign.id} className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full opacity-90" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
          <header className="flex flex-wrap items-center gap-4">
            <Seal name={campaign.name} seed={campaign.id} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl sm:text-4xl">{campaign.name}</h1>
                <Badge tone={isGameMaster(campaign.role) ? 'brass' : 'neutral'}>{ROLE_LABELS[campaign.role]}</Badge>
              </div>
              <p className="text-moss">D&D 5ª edição</p>
            </div>
            <div className="flex items-center gap-3 max-sm:w-full" aria-label="Quem está na mesa">
              <div className="flex -space-x-1">
                {campaign.memberList.map((member) => (
                  <Token
                    key={member.userId}
                    name={member.displayName}
                    color={member.color}
                    online={onlineIds.has(member.userId)}
                    className={cn(!onlineIds.has(member.userId) && 'opacity-45')}
                  />
                ))}
              </div>
              <span className="text-sm text-moss" role="status">
                {connected ? `${online.length} na mesa agora` : 'Conectando…'}
              </span>
            </div>
          </header>

          <nav className="mt-8 flex gap-1 overflow-x-auto" aria-label="Seções da campanha">
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    '-mb-px flex items-center gap-2 border-b-2 px-3 py-3 whitespace-nowrap transition-colors [&_svg]:size-4',
                    isActive ? 'border-brass text-bone' : 'border-transparent text-moss hover:text-bone'
                  )
                }
              >
                <Icon /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </section>

      <div
        className={cn(
          'mx-auto flex w-full flex-1 flex-col px-4 pt-6 pb-24 sm:px-6',
          pathname.endsWith('/mesa') ? 'max-w-[110rem]' : 'max-w-6xl'
        )}
      >
        <Outlet context={{ campaign, online } satisfies CampaignContext} />
      </div>
      <HandoutOverlay campaignId={campaign.id} gm={isGameMaster(campaign.role)} />
      <Jukebox campaignId={campaign.id} gm={isGameMaster(campaign.role)} />
      <Dice3dOverlay campaignId={campaign.id} />
      {me && <VoiceDock campaignId={campaign.id} me={me} />}
    </div>
  )
}
