import { HANDOUT_KIND_LABELS, HANDOUT_KINDS, type HandoutDto, type HandoutKind, isGameMaster, isVisual } from '@taverna/shared'
import { Eye, EyeOff, Feather, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Button,
  Dialog,
  DialogContent,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  EmptyState,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCampaignContext } from '../campaigns/context'
import { useAssets } from '../table/hooks'
import { useUploadFiles } from '../table/upload'
import { useHandoutMutations, useHandouts } from './hooks'
import { HandoutView } from './HandoutView'

interface Draft {
  id: string | null
  title: string
  kind: HandoutKind
  body: string
  assetId: string | null
}

const EMPTY: Draft = { id: null, title: '', kind: 'letter', body: '', assetId: null }
const VISUAL_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'

function ImagePicker({ campaignId, value, onChange }: { campaignId: string; value: string | null; onChange: (id: string | null) => void }) {
  const assets = useAssets(campaignId)
  const upload = useUploadFiles(campaignId)
  const input = useRef<HTMLInputElement>(null)
  const images = (assets.data ?? []).filter((a) => isVisual(a.mime) && a.mime.startsWith('image/'))
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm text-moss">Imagem</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cn(
            'grid size-16 place-items-center rounded-control border text-xs text-moss',
            value === null ? 'border-brass' : 'border-line'
          )}
        >
          Sem imagem
        </button>
        {images.map((asset) => (
          <button
            key={asset.id}
            type="button"
            aria-pressed={value === asset.id}
            aria-label={asset.name}
            onClick={() => onChange(asset.id)}
            className={cn('size-16 overflow-hidden rounded-control border-2', value === asset.id ? 'border-brass' : 'border-transparent')}
          >
            <img src={asset.url} alt="" className="size-full object-cover" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={upload.pending}
          className="grid size-16 place-items-center rounded-control border border-dashed border-line-strong text-moss hover:text-bone"
          aria-label="Enviar imagem"
        >
          <Upload className="size-5" aria-hidden />
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept={VISUAL_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          const [sent] = await upload.run(files)
          if (sent) onChange(sent.id)
        }}
      />
    </fieldset>
  )
}

function sharedLabel(handout: HandoutDto, names: Map<string, string>): string {
  if (handout.sharedWith === 'all') return 'Todos veem'
  if (handout.sharedWith === 'none') return 'Só os mestres'
  return `Só ${handout.sharedWith.map((id) => names.get(id) ?? 'alguém').join(', ')}`
}

export function HandoutsPage() {
  const { campaign } = useCampaignContext()
  const gm = isGameMaster(campaign.role)
  const handouts = useHandouts(campaign.id)
  const m = useHandoutMutations(campaign.id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [viewing, setViewing] = useState<HandoutDto | null>(null)
  const [confirm, setConfirm] = useState<HandoutDto | null>(null)
  const names = new Map(campaign.memberList.map((m) => [m.userId, m.displayName]))
  const players = campaign.memberList.filter((member) => !isGameMaster(member.role))

  const save = () => {
    if (!draft || !draft.title.trim()) return
    const input = { title: draft.title.trim(), kind: draft.kind, body: draft.body, assetId: draft.assetId }
    if (draft.id) m.update.mutate({ id: draft.id, ...input }, { onSuccess: () => setDraft(null) })
    else m.create.mutate(input, { onSuccess: () => setDraft(null) })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Revelações</h2>
          <p className="text-moss">
            {gm
              ? 'Cartas, enigmas, retratos e itens que você mostra na tela dos jogadores na hora certa.'
              : 'O que o mestre já mostrou para você.'}
          </p>
        </div>
        {gm && (
          <Button onClick={() => setDraft(EMPTY)}>
            <Plus /> Nova revelação
          </Button>
        )}
      </div>

      {handouts.isPending && <Skeleton className="h-48" />}
      {handouts.data?.length === 0 && (
        <EmptyState
          art={<Feather className="mx-auto size-12 text-brass" aria-hidden />}
          title={gm ? 'Nada preparado ainda' : 'Nada revelado ainda'}
        >
          {gm
            ? 'Escreva a carta do vilão ou monte o retrato de um NPC, e mostre quando a mesa chegar lá.'
            : 'Quando o mestre mostrar algo, aparece na sua tela e fica guardado aqui.'}
        </EmptyState>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {handouts.data?.map((handout) => (
          <li key={handout.id} className="flex flex-col gap-3 rounded-panel border border-line bg-surface/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-brass-bright">{HANDOUT_KIND_LABELS[handout.kind]}</p>
                <h3 className="truncate font-display text-xl">{handout.title}</h3>
                {gm && <p className="text-sm text-moss-dim">{sharedLabel(handout, names)}</p>}
              </div>
              {gm && (
                <div className="flex shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Editar ${handout.title}`}
                    onClick={() =>
                      setDraft({ id: handout.id, title: handout.title, kind: handout.kind, body: handout.body, assetId: handout.assetId })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Apagar ${handout.title}`} onClick={() => setConfirm(handout)}>
                    <Trash2 />
                  </Button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setViewing(handout)}
              className="max-h-56 overflow-hidden rounded-control text-left [mask-image:linear-gradient(black_70%,transparent)]"
            >
              <span className="sr-only">Abrir {handout.title}</span>
              <span aria-hidden className="block">
                <HandoutView handout={handout} />
              </span>
            </button>
            {gm && (
              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={() =>
                    m.show.mutate({ id: handout.id, to: 'all' }, { onSuccess: () => toast(`${handout.title} apareceu na tela de todos`) })
                  }
                >
                  <Eye /> Mostrar a todos
                </Button>
                {players.length > 0 && (
                  <Dropdown>
                    <DropdownTrigger asChild>
                      <Button size="sm" variant="secondary">
                        Só para…
                      </Button>
                    </DropdownTrigger>
                    <DropdownContent align="start">
                      {players.map((p) => (
                        <DropdownItem
                          key={p.userId}
                          onSelect={() =>
                            m.show.mutate(
                              { id: handout.id, to: [p.userId] },
                              { onSuccess: () => toast(`${handout.title} apareceu para ${p.displayName}`) }
                            )
                          }
                        >
                          {p.displayName}
                        </DropdownItem>
                      ))}
                    </DropdownContent>
                  </Dropdown>
                )}
                {handout.sharedWith !== 'none' && (
                  <Button size="sm" variant="ghost" onClick={() => m.show.mutate({ id: handout.id, to: 'none' })}>
                    <EyeOff /> Esconder
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent title={draft?.id ? 'Editar revelação' : 'Nova revelação'} className="max-w-3xl">
          {draft && (
            <form
              className="grid gap-6 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                save()
              }}
            >
              <div className="flex flex-col gap-4">
                <Field label="Título">
                  {(props) => (
                    <Input
                      {...props}
                      value={draft.title}
                      maxLength={80}
                      autoFocus
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                  )}
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-moss" aria-hidden>
                    Tipo
                  </span>
                  <Select<HandoutKind>
                    label="Tipo"
                    value={draft.kind}
                    onChange={(kind) => setDraft({ ...draft, kind })}
                    options={HANDOUT_KINDS.map((value) => ({ value, label: HANDOUT_KIND_LABELS[value] }))}
                  />
                </div>
                <Field label="Texto">
                  {(props) => (
                    <Textarea
                      {...props}
                      rows={8}
                      value={draft.body}
                      maxLength={5000}
                      onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    />
                  )}
                </Field>
                <ImagePicker campaignId={campaign.id} value={draft.assetId} onChange={(assetId) => setDraft({ ...draft, assetId })} />
                <Button
                  type="submit"
                  className="self-start"
                  loading={m.create.isPending || m.update.isPending}
                  disabled={!draft.title.trim()}
                >
                  {draft.id ? 'Salvar' : 'Guardar revelação'}
                </Button>
              </div>
              <div aria-label="Prévia" className="rounded-panel bg-felt-deep/60 p-4">
                <p className="mb-3 text-sm text-moss">Assim aparece para os jogadores</p>
                <HandoutView
                  handout={{
                    id: 'previa',
                    campaignId: campaign.id,
                    title: draft.title || 'Sem título',
                    kind: draft.kind,
                    body: draft.body,
                    assetId: draft.assetId,
                    imageUrl: draft.assetId ? `/api/assets/${draft.assetId}` : null,
                    sharedWith: 'none',
                    updatedAt: ''
                  }}
                />
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent title={viewing ? HANDOUT_KIND_LABELS[viewing.kind] : ''} className="max-w-2xl">
          {viewing && <HandoutView handout={viewing} large />}
        </DialogContent>
      </Dialog>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent title={`Apagar ${confirm?.title ?? ''}?`} description="Some também da lista de quem já viu.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Manter
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm) m.remove.mutate(confirm.id)
                setConfirm(null)
              }}
            >
              Apagar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
