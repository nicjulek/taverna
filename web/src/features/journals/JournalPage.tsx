import { canEdit, isGameMaster, type JournalDto } from '@taverna/shared'
import { ArrowLeft, Share2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button, EmptyState, ErrorNote, Input, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { renderMarkdown } from '@/lib/markdown'
import { useSession } from '@/lib/session'
import { useCampaignContext } from '../campaigns/context'
import { AccessIcon } from './AccessIcon'
import { useJournal, useJournalMutations } from './hooks'
import { ShareDialog } from './ShareDialog'

const ACCESS_TEXT = { none: 'Secreta', view: 'Todos podem ler', edit: 'Todos podem editar' } as const

export function JournalPage() {
  const { campaign } = useCampaignContext()
  const { pageId = '' } = useParams()
  const { data: page, error, isPending } = useJournal(campaign.id, pageId)

  if (error) {
    return <EmptyState title="Página não encontrada">Ela pode ter sido apagada ou deixado de ser compartilhada com você.</EmptyState>
  }
  if (isPending || !page) return <Skeleton className="h-96" />
  return <Editor key={page.id} page={page} />
}

function Editor({ page }: { page: JournalDto }) {
  const { campaign } = useCampaignContext()
  const { data: me } = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { update, remove } = useJournalMutations(campaign.id)
  const editable = canEdit(page.access)
  const canShare = isGameMaster(campaign.role) || page.authorId === me?.id
  const [mode, setMode] = useState<'read' | 'write'>(editable && (params.get('editar') === '1' || !page.content) ? 'write' : 'read')
  const [draft, setDraft] = useState({ title: page.title, folder: page.folder, content: page.content })
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const leaving = useRef(false)
  const dirty = draft.title !== page.title || draft.folder !== page.folder || draft.content !== page.content
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => !leaving.current && dirty && currentLocation.pathname !== nextLocation.pathname
  )

  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    if (!dirtyRef.current) setDraft({ title: page.title, folder: page.folder, content: page.content })
  }, [page.title, page.folder, page.content])

  useEffect(() => {
    if (params.has('editar')) setParams({}, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = () => {
    if (!dirty || update.isPending) return
    update.mutate(
      { id: page.id, title: draft.title.trim() || 'Página sem título', folder: draft.folder.trim(), content: draft.content },
      { onSuccess: () => toast.success('Página salva') }
    )
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <article className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="md:hidden">
          <Link to={`/campanhas/${campaign.id}/diario`}>
            <ArrowLeft /> Páginas
          </Link>
        </Button>
        <span className="flex items-center gap-1.5 text-sm text-moss">
          <AccessIcon level={page.defaultAccess} className="size-4" />
          {ACCESS_TEXT[page.defaultAccess]}
          {Object.keys(page.grants).length > 0 && `, com exceções`}
        </span>
        <span className="text-sm text-moss-dim">
          por {page.authorName}, {timeAgo(page.updatedAt)}
        </span>
        <div className="ml-auto flex gap-1">
          {editable && (
            <div className="flex rounded-control border border-line p-0.5" role="tablist" aria-label="Modo">
              {(['write', 'read'] as const).map((value) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    'rounded-[0.35rem] px-3 py-1 text-sm',
                    mode === value ? 'bg-surface-raised text-bone' : 'text-moss hover:text-bone'
                  )}
                >
                  {value === 'write' ? 'Escrever' : 'Ler'}
                </button>
              ))}
            </div>
          )}
          {canShare && (
            <Button variant="ghost" size="icon" aria-label="Quem vê esta página" onClick={() => setSharing(true)}>
              <Share2 />
            </Button>
          )}
          {canShare && (
            <Button variant="ghost" size="icon" aria-label="Apagar página" onClick={() => setDeleting(true)}>
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {update.error && <ErrorNote>{update.error.message}</ErrorNote>}

      {mode === 'write' ? (
        <div className="flex flex-col gap-3">
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            aria-label="Título"
            maxLength={120}
            className="w-full bg-transparent font-display text-3xl text-bone placeholder:text-moss-dim focus-visible:outline-none sm:text-4xl"
            placeholder="Título"
          />
          <Input
            value={draft.folder}
            onChange={(event) => setDraft({ ...draft, folder: event.target.value })}
            aria-label="Pasta"
            placeholder="Pasta (opcional): NPCs, Sessões, Lugares…"
            maxLength={60}
            className="max-w-sm"
          />
          <textarea
            value={draft.content}
            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
            aria-label="Conteúdo"
            placeholder={'Escreva em Markdown.\n\n# Título\n**negrito**, *itálico*, - listas e > citações'}
            className="min-h-[22rem] w-full rounded-panel border border-line bg-felt-deep p-4 leading-relaxed text-bone placeholder:text-moss-dim focus-visible:border-brass focus-visible:outline-none"
          />
          <div className="flex items-center gap-3">
            <Button onClick={save} loading={update.isPending} disabled={!dirty}>
              Salvar página
            </Button>
            <span className="text-sm text-moss-dim">{dirty ? 'Alterações não salvas. Ctrl+S também salva.' : 'Tudo salvo'}</span>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-3xl sm:text-4xl">{page.title}</h2>
          {page.content ? (
            <div className="prose-taverna" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
          ) : (
            <p className="text-moss">Página em branco.</p>
          )}
        </div>
      )}

      {canShare && (
        <ShareDialog campaignId={campaign.id} page={page} members={campaign.memberList} open={sharing} onOpenChange={setSharing} />
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Apagar “${page.title}”?`}
        description="A página some para todo mundo. Não dá para desfazer."
        confirmLabel="Apagar página"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(page.id, {
            onSuccess: () => {
              leaving.current = true
              setDeleting(false)
              toast.success('Página apagada')
              void navigate(`/campanhas/${campaign.id}/diario`, { replace: true })
            }
          })
        }
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="Sair sem salvar?"
        description="Você tem alterações nesta página que ainda não foram salvas."
        confirmLabel="Sair sem salvar"
        danger
        onConfirm={() => blocker.proceed?.()}
      />
    </article>
  )
}
