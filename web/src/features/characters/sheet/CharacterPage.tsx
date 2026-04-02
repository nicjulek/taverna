import * as Tabs from '@radix-ui/react-tabs'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { CriticalFail } from '@/components/art/CriticalFail'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { useCampaignContext } from '../../campaigns/context'
import { useCharacter } from '../hooks'
import { AbilitiesPanel, SkillsPanel } from './Abilities'
import { AttacksTab } from './Attacks'
import { SheetProvider } from './context'
import { DetailsTab } from './Details'
import { SheetHeader } from './Header'
import { ResourcesTab } from './Resources'
import { SpellsTab } from './Spells'
import { VitalsPanel } from './Vitals'

const TABS = [
  { value: 'ataques', label: 'Ataques', content: AttacksTab },
  { value: 'magias', label: 'Magias', content: SpellsTab },
  { value: 'recursos', label: 'Recursos', content: ResourcesTab },
  { value: 'detalhes', label: 'Detalhes', content: DetailsTab }
]

export function CharacterPage() {
  const { campaign } = useCampaignContext()
  const { characterId = '' } = useParams()
  const { data: character, error, isPending } = useCharacter(campaign.id, characterId)

  const back = (
    <Link to=".." relative="path" className="inline-flex items-center gap-1.5 self-start text-sm text-moss hover:text-bone">
      <ArrowLeft className="size-4" aria-hidden /> Todas as fichas
    </Link>
  )

  if (error) {
    return (
      <EmptyState
        art={<CriticalFail className="mx-auto w-36" />}
        title={error instanceof ApiError && error.status === 404 ? 'Ficha não encontrada' : 'Não deu para abrir a ficha'}
        action={
          <Button asChild variant="secondary">
            <Link to=".." relative="path">
              Voltar para as fichas
            </Link>
          </Button>
        }
      >
        {error instanceof ApiError && error.status === 404 ? 'Ela pode ter sido apagada ou escondida pelo dono.' : error.message}
      </EmptyState>
    )
  }

  if (isPending || !character) return <Skeleton className="h-[32rem]" />

  return (
    <SheetProvider key={character.id} campaignId={campaign.id} character={character}>
      <div className="flex flex-col gap-5">
        {back}
        <SheetHeader />
        <div className="grid items-start gap-4 lg:grid-cols-[15rem_18rem_1fr]">
          <AbilitiesPanel />
          <SkillsPanel />
          <div className="flex min-w-0 flex-col gap-4">
            <VitalsPanel />
            <Tabs.Root defaultValue="ataques" className="rounded-panel border border-line bg-surface/70">
              <Tabs.List className="flex gap-1 overflow-x-auto border-b border-line px-2" aria-label="Partes da ficha">
                {TABS.map((tab) => (
                  <Tabs.Trigger
                    key={tab.value}
                    value={tab.value}
                    className="-mb-px border-b-2 border-transparent px-3 py-3 whitespace-nowrap text-moss hover:text-bone data-[state=active]:border-brass data-[state=active]:text-bone"
                  >
                    {tab.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              {TABS.map(({ value, content: Content }) => (
                <Tabs.Content key={value} value={value} className="p-4 focus-visible:outline-none">
                  <Content />
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </div>
        </div>
      </div>
    </SheetProvider>
  )
}
