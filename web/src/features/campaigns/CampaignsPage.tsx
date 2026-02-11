import { ROLE_LABELS } from '@taverna/shared'
import { Plus, Ticket } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { EmptyTable } from '@/components/art/EmptyTable'
import { Badge, Button, EmptyState, ErrorNote, Seal, Skeleton } from '@/components/ui'
import { plural, timeAgo } from '@/lib/format'
import { CreateCampaignDialog } from './CreateCampaignDialog'
import { useCampaigns } from './hooks'
import { JoinDialog } from './JoinDialog'

export function CampaignsPage() {
  const { data: campaigns, isPending, error } = useCampaigns()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Suas mesas</h1>
          <p className="mt-1 text-moss">As campanhas que você mestra e as que você joga.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setJoining(true)}>
            <Ticket /> Tenho um convite
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nova campanha
          </Button>
        </div>
      </div>

      {error && <ErrorNote>{error.message}</ErrorNote>}

      {isPending && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-24" />
          ))}
        </div>
      )}

      {campaigns && campaigns.length === 0 && (
        <EmptyState
          title="Nenhuma mesa por aqui ainda"
          art={<EmptyTable className="w-full" />}
          action={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setCreating(true)}>
                <Plus /> Criar minha campanha
              </Button>
              <Button variant="secondary" onClick={() => setJoining(true)}>
                Entrar com convite
              </Button>
            </div>
          }
        >
          Crie uma campanha para mestrar ou cole o convite que seu mestre mandou.
        </EmptyState>
      )}

      {campaigns && campaigns.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface/60">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                to={`/campanhas/${campaign.id}`}
                className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-raised/60 sm:px-5"
              >
                <Seal name={campaign.name} seed={campaign.id} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl group-hover:text-brass-bright">{campaign.name}</h2>
                    <Badge tone={campaign.role === 'player' ? 'neutral' : 'brass'}>{ROLE_LABELS[campaign.role]}</Badge>
                  </div>
                  {campaign.description && <p className="mt-0.5 line-clamp-1 text-moss">{campaign.description}</p>}
                  <p className="mt-1 text-sm text-moss-dim">
                    D&D 5e, {plural(campaign.members, 'participante', 'participantes')}, atualizada {timeAgo(campaign.updatedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateCampaignDialog open={creating} onOpenChange={setCreating} />
      <JoinDialog open={joining} onOpenChange={setJoining} />
    </div>
  )
}
