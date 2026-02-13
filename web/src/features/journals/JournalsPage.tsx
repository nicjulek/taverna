import { FilePlus2, FolderClosed } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router'
import { Button, ErrorNote, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCampaignContext } from '../campaigns/context'
import { AccessIcon } from './AccessIcon'
import { groupByFolder, useJournalMutations, useJournals } from './hooks'

export function JournalsPage() {
  const context = useCampaignContext()
  const { campaign } = context
  const { pageId } = useParams()
  const navigate = useNavigate()
  const { data: pages, isPending, error } = useJournals(campaign.id)
  const { create } = useJournalMutations(campaign.id)
  const [query, setQuery] = useState('')

  const filtered = (pages ?? []).filter((page) => page.title.toLowerCase().includes(query.trim().toLowerCase()))

  const newPage = () =>
    create.mutate(
      { title: 'Página sem título' },
      { onSuccess: (page) => void navigate(`/campanhas/${campaign.id}/diario/${page.id}?editar=1`) }
    )

  return (
    <div className="grid flex-1 gap-6 md:grid-cols-[16rem_1fr]">
      <aside className={cn('flex flex-col gap-3', pageId && 'max-md:hidden')} aria-label="Páginas do diário">
        <Button onClick={newPage} loading={create.isPending}>
          <FilePlus2 /> Nova página
        </Button>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Procurar no diário"
          aria-label="Procurar no diário"
          className="h-9 rounded-control border border-line bg-felt-deep px-3 text-sm placeholder:text-moss-dim focus-visible:border-brass focus-visible:outline-none"
        />
        {error && <ErrorNote>{error.message}</ErrorNote>}
        {isPending && <Skeleton className="h-40" />}
        {pages && pages.length === 0 && (
          <p className="text-sm text-moss">Nada escrito ainda. Anote NPCs, pistas e o resumo de cada sessão.</p>
        )}
        <nav className="flex flex-col gap-4">
          {groupByFolder(filtered).map(({ folder, pages: group }) => (
            <div key={folder || 'sem-pasta'}>
              {folder && (
                <p className="mb-1 flex items-center gap-1.5 px-2 text-sm text-moss-dim">
                  <FolderClosed className="size-3.5" /> {folder}
                </p>
              )}
              <ul className="flex flex-col">
                {group.map((page) => (
                  <li key={page.id}>
                    <NavLink
                      to={page.id}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-control px-2 py-1.5 text-[0.98rem]',
                          isActive ? 'bg-surface-raised text-bone' : 'text-moss hover:bg-surface hover:text-bone'
                        )
                      }
                    >
                      <span className="min-w-0 flex-1 truncate">{page.title}</span>
                      <AccessIcon level={page.defaultAccess} className="size-3.5 shrink-0 opacity-70" />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <section className={cn('min-w-0', !pageId && 'max-md:hidden')}>
        <Outlet context={context} />
      </section>
    </div>
  )
}
