import { isGameMaster, ROLE_LABELS } from '@taverna/shared'
import { BookOpen, Settings, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
import { Badge, Button, EmptyState, Seal, Skeleton, Token } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useCampaignRoom } from '@/lib/realtime'
import type { CampaignContext } from './context'
import { useCampaign } from './hooks'

const TABS = [
  { to: 'diario', label: 'Diário', icon: BookOpen },
  { to: 'jogadores', label: 'Jogadores', icon: Users },
  { to: 'ajustes', label: 'Ajustes', icon: Settings }
]

export function CampaignLayout() {
  const { campaignId = '' } = useParams()
  const { data: campaign, error, isPending } = useCampaign(campaignId)
  const { online, connected } = useCampaignRoom(campaignId)

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <EmptyState
          title={notFound ? 'Campanha não encontrada' : 'Não foi possível abrir a campanha'}
          action={
            <Button asChild variant="secondary">
              <Link to="/campanhas">Voltar para suas mesas</Link>
            </Button>
          }
        >
          {notFound ? 'Ela pode ter sido apagada, ou você não participa mais dela.' : error.message}
        </EmptyState>
      </main>
    )
  }

  if (isPending || !campaign) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Skeleton className="h-20 w-full max-w-lg" />
        <Skeleton className="mt-8 h-96" />
      </main>
    )
  }

  const onlineIds = new Set(online.map((user) => user.userId))

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-10 sm:px-6">
      <header className="flex flex-wrap items-center gap-4">
        <Seal name={campaign.name} seed={campaign.id} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-3xl sm:text-4xl">{campaign.name}</h1>
            <Badge tone={isGameMaster(campaign.role) ? 'brass' : 'neutral'}>{ROLE_LABELS[campaign.role]}</Badge>
          </div>
          <p className="text-moss">D&D 5ª edição</p>
        </div>
        <div className="flex items-center gap-3 max-sm:w-full" aria-label="Quem está na mesa">
          <div className="flex -space-x-1.5">
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

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções da campanha">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 whitespace-nowrap transition-colors [&_svg]:size-4',
                isActive ? 'border-brass text-bone' : 'border-transparent text-moss hover:text-bone'
              )
            }
          >
            <Icon /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-1 flex-col pt-6">
        <Outlet context={{ campaign, online } satisfies CampaignContext} />
      </div>
    </main>
  )
}
