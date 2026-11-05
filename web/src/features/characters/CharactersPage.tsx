import { FileUp, Shield, UserPlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { BlankSheet } from '@/components/art/BlankSheet'
import { Button, EmptyState, ErrorNote, Seal, Skeleton, Token } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCampaignContext } from '../campaigns/context'
import { CreateCharacterDialog } from './CreateCharacterDialog'
import { classLine, hpTone } from './format'
import { useCharacterMutations, useCharacters } from './hooks'
import { readJsonFile } from '@/lib/readJson'

export function CharactersPage() {
  const { campaign } = useCampaignContext()
  const { data, isPending, error } = useCharacters(campaign.id)
  const [creating, setCreating] = useState(false)
  const { importSheet } = useCharacterMutations(campaign.id)
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const created = await importSheet.mutateAsync(await readJsonFile(file))
      toast(`${created.name} entrou na campanha.`)
      void navigate(created.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu para importar a ficha.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">Fichas</h2>
          <p className="text-moss">Cada um cuida da sua. O mestre vê e edita todas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => input.current?.click()} loading={importSheet.isPending}>
            <FileUp /> Importar ficha
          </Button>
          <Button onClick={() => setCreating(true)}>
            <UserPlus /> Nova ficha
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void importFile(file)
            }}
          />
        </div>
      </div>
      {error && <ErrorNote>{error.message}</ErrorNote>}
      {isPending && <Skeleton className="h-40" />}
      {data && data.length === 0 && (
        <EmptyState
          art={<BlankSheet className="mx-auto w-56" />}
          title="Nenhuma ficha ainda"
          action={<Button onClick={() => setCreating(true)}>Criar a primeira ficha</Button>}
        >
          Crie seu personagem e role testes, ataques e magias direto da ficha.
        </EmptyState>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((character) => {
          const { hp, armorClass, race, classes } = character.summary
          const tone = hpTone(hp.current, hp.max)
          return (
            <li key={character.id}>
              <Link
                to={character.id}
                className="group flex h-full flex-col gap-4 rounded-panel border border-line bg-surface/70 p-4 transition-colors hover:border-brass/60"
              >
                <div className="flex items-start gap-3">
                  <Seal name={character.name} seed={character.id} size={52} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl group-hover:text-brass-bright">{character.name}</h3>
                    <p className="truncate text-sm text-moss">{classLine(race, classes)}</p>
                  </div>
                  <span
                    className="relative grid size-11 shrink-0 place-items-center text-bone"
                    aria-label={`Classe de armadura ${armorClass}`}
                  >
                    <Shield className="absolute size-11 text-line-strong" aria-hidden />
                    <span className="relative font-display text-lg font-bold lining-nums">{armorClass}</span>
                  </span>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-moss">Pontos de vida</span>
                    <span className="font-display lining-nums tabular-nums">
                      {hp.current}/{hp.max}
                      {hp.temporary > 0 && <span className="text-leaf"> +{hp.temporary}</span>}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-felt-deep" aria-hidden>
                    <div
                      className={cn('h-full rounded-full', tone === 'ok' ? 'bg-leaf' : tone === 'hurt' ? 'bg-brass' : 'bg-seal')}
                      style={{ width: `${Math.max(0, Math.min(100, (hp.current / hp.max) * 100))}%` }}
                    />
                  </div>
                </div>
                <p className="mt-auto flex items-center gap-2 text-sm text-moss-dim">
                  <Token name={character.ownerName} color={character.ownerColor} size="sm" decorative />
                  {character.ownerName}
                  {character.access !== 'edit' && <span className="ml-auto">Só leitura</span>}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
      <CreateCharacterDialog campaignId={campaign.id} open={creating} onOpenChange={setCreating} />
    </div>
  )
}
