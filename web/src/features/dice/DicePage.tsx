import { useState } from 'react'
import { DiceCup } from '@/components/art/DiceCup'
import { Button, EmptyState, ErrorNote, Skeleton } from '@/components/ui'
import { useCampaignContext } from '../campaigns/context'
import { DiceRoller } from './DiceRoller'
import { useRollFeed, useRolls } from './hooks'
import { RollCard } from './RollCard'

export function DicePage() {
  const { campaign } = useCampaignContext()
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useRolls(campaign.id)
  const [fresh, setFresh] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useRollFeed(campaign.id, (roll) => {
    setFresh(roll.id)
    setAnnouncement(`${roll.displayName} rolou ${roll.label ? `${roll.label}: ` : ''}${roll.result.total}`)
  })

  const rolls = data?.pages.flat() ?? []

  return (
    <div className="grid flex-1 items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="lg:sticky lg:top-20">
        <DiceRoller campaignId={campaign.id} />
      </div>
      <section aria-labelledby="historico" className="flex min-w-0 flex-col gap-3">
        <h2 id="historico" className="text-2xl">
          Rolagens da mesa
        </h2>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        {error && <ErrorNote>{error.message}</ErrorNote>}
        {isPending && <Skeleton className="h-48" />}
        {data && rolls.length === 0 && (
          <EmptyState art={<DiceCup className="mx-auto w-56" />} title="Nenhum dado rolado ainda">
            As rolagens de todo mundo aparecem aqui na hora. Escolha os dados ao lado e role a primeira.
          </EmptyState>
        )}
        <ol className="flex flex-col gap-3">
          {rolls.map((roll) => (
            <li key={roll.id}>
              <RollCard roll={roll} fresh={roll.id === fresh} />
            </li>
          ))}
        </ol>
        {hasNextPage && (
          <Button variant="secondary" className="self-center" loading={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            Ver rolagens anteriores
          </Button>
        )}
      </section>
    </div>
  )
}
