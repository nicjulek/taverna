import { isGameMaster } from '@taverna/shared'
import { Check, Copy } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { OpenBook } from '@/components/art/OpenBook'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { inviteUrl } from '@/lib/invite'
import { useCopy } from '@/lib/useCopy'
import { useCampaignContext } from '../campaigns/context'
import { useJournalMutations, useJournals } from './hooks'

export function JournalIndex() {
  const { campaign } = useCampaignContext()
  const { data: pages } = useJournals(campaign.id)
  if (!pages) return null

  const invited = campaign.members > 1
  const wrote = pages.length > 0
  const shared = pages.some((page) => page.defaultAccess !== 'none')
  const showSteps = isGameMaster(campaign.role) && !(invited && wrote && shared)

  if (showSteps) return <FirstSteps invited={invited} wrote={wrote} shared={shared} />

  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-4 rounded-panel border border-dashed border-line-strong p-8 text-center">
      <OpenBook className="w-56" />
      {pages.length > 0 ? (
        <p className="max-w-xs text-moss">Escolha uma página na lista ou crie uma nova.</p>
      ) : (
        <p className="max-w-sm text-moss">
          As páginas que o mestre compartilhar aparecem aqui. Você também pode escrever as suas, como o diário do seu personagem.
        </p>
      )}
    </div>
  )
}

function FirstSteps({ invited, wrote, shared }: { invited: boolean; wrote: boolean; shared: boolean }) {
  const { campaign } = useCampaignContext()
  const navigate = useNavigate()
  const { create } = useJournalMutations(campaign.id)
  const { copied, copy } = useCopy()
  const link = campaign.inviteCode ? inviteUrl(campaign.inviteCode) : null

  const steps = [
    {
      done: invited,
      title: 'Chame o grupo',
      text: 'Mande o link de convite no grupo de vocês. Quem abrir entra como jogador.',
      action: link ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => !(await copy(link)) && toast.error('Não deu para copiar. Abra a aba Jogadores e copie de lá.')}
        >
          {copied ? <Check /> : <Copy />} {copied ? 'Link copiado' : 'Copiar link de convite'}
        </Button>
      ) : (
        <Button size="sm" variant="secondary" asChild>
          <Link to="../jogadores">Criar link de convite</Link>
        </Button>
      )
    },
    {
      done: wrote,
      title: 'Escreva a primeira página',
      text: 'Um resumo da sessão zero, os NPCs da cidade inicial ou as regras da casa.',
      action: (
        <Button
          size="sm"
          variant="secondary"
          loading={create.isPending}
          onClick={() => create.mutate({ title: 'Página sem título' }, { onSuccess: (page) => void navigate(`${page.id}?editar=1`) })}
        >
          Nova página
        </Button>
      )
    },
    {
      done: shared,
      title: 'Decida o que o grupo vê',
      text: 'Toda página começa secreta. Abra uma página e use o botão de compartilhar para liberar a leitura.',
      action: null
    }
  ]

  return (
    <section className="rounded-panel border border-line bg-surface/70 p-6 sm:p-8" aria-labelledby="first-steps">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <OpenBook className="w-40 shrink-0 self-center" />
        <div>
          <h2 id="first-steps" className="text-3xl">
            Prepare a mesa
          </h2>
          <p className="mt-1 text-moss">Três passos para a primeira sessão.</p>
        </div>
      </div>
      <ol className="mt-6 flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step.title} className={cn('flex gap-4 rounded-control border border-line p-4', step.done && 'opacity-70')}>
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full font-display font-bold',
                step.done ? 'bg-leaf text-felt-deep' : 'border border-brass text-brass'
              )}
              aria-hidden
            >
              {step.done ? <Check className="size-4" /> : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-sans text-lg font-medium">
                {step.title}
                {step.done && <span className="sr-only"> (feito)</span>}
              </h3>
              <p className="text-moss">{step.text}</p>
              {!step.done && step.action && <div className="mt-3">{step.action}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
