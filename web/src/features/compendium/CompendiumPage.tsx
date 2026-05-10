import { CLASSES } from '@taverna/rules-5e'
import {
  COMPENDIUM_KIND_LABELS,
  COMPENDIUM_KINDS,
  type CompendiumEntryDto,
  type CompendiumKind,
  type CompendiumQuery,
  isGameMaster,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  MONSTER_TYPES,
  SPELL_SCHOOLS,
  SRD_ATTRIBUTION
} from '@taverna/shared'
import { ArrowLeft, FlaskConical, Search } from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Grimoire } from '@/components/art/Grimoire'
import { Badge, Button, Dialog, DialogContent, EmptyState, ErrorNote, Input, Select, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCampaignContext } from '../campaigns/context'
import { EntryView } from './EntryView'
import { HomebrewDialog } from './HomebrewDialog'
import { useCompendiumEntry, useCompendiumSearch, useHomebrewMutations } from './hooks'
import { DRAG_TYPE } from './to-sheet'

const ALL = '__todos'
const CR_STEPS = ['0.25', '0.5', '1', '2', '3', '5', '8', '10', '15', '20', '30']

function filterOptions(entries: Record<string, string>, everything: string) {
  return [{ value: ALL, label: everything }, ...Object.entries(entries).map(([value, label]) => ({ value, label }))]
}

function useCompendiumFilters() {
  const [params, setParams] = useSearchParams()
  const get = (key: string) => params.get(key) ?? undefined
  const filters: Omit<CompendiumQuery, 'offset'> = {
    kind: get('kind') as CompendiumKind | undefined,
    q: get('q'),
    source: get('source') as 'srd' | 'homebrew' | undefined,
    level: get('level') !== undefined ? Number(get('level')) : undefined,
    school: get('school'),
    className: get('className'),
    type: get('type'),
    crMax: get('crMax') !== undefined ? Number(get('crMax')) : undefined,
    category: get('category'),
    rarity: get('rarity')
  }
  const pending = useRef<URLSearchParams | null>(null)
  useEffect(() => {
    pending.current = null
  }, [params])
  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(pending.current ?? params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || value === ALL) next.delete(key)
      else next.set(key, value)
    }
    pending.current = next
    setParams(next, { replace: true })
  }
  return { filters, update, search: params.toString() }
}

export function CompendiumPage() {
  const { campaign } = useCampaignContext()
  const { entryId } = useParams()
  const navigate = useNavigate()
  const gm = isGameMaster(campaign.role)
  const { filters, update, search } = useCompendiumFilters()
  const [text, setText] = useState(filters.q ?? '')
  const deferred = useDeferredValue(text)
  const query = { ...filters, q: deferred.trim() || undefined }
  const results = useCompendiumSearch(campaign.id, query)
  const entry = useCompendiumEntry(campaign.id, entryId)
  const { remove } = useHomebrewMutations(campaign.id)
  const [editor, setEditor] = useState<{ editing?: CompendiumEntryDto | null; copyFrom?: CompendiumEntryDto | null } | null>(null)
  const [deleting, setDeleting] = useState<CompendiumEntryDto | null>(null)
  const items = results.data?.pages.flatMap((page) => page.items) ?? []
  const suffix = search ? `?${search}` : ''

  const selectKind = (kind?: CompendiumKind) =>
    update({
      kind,
      level: undefined,
      school: undefined,
      className: undefined,
      type: undefined,
      crMax: undefined,
      category: undefined,
      rarity: undefined
    })

  const list = (
    <aside className={cn('flex min-w-0 flex-col gap-3', entryId && 'max-lg:hidden')} aria-label="Busca no compêndio">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl">Compêndio</h2>
        {gm && (
          <Button size="sm" onClick={() => setEditor({})}>
            <FlaskConical /> Novo homebrew
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-moss-dim" aria-hidden />
        <Input
          type="search"
          aria-label="Procurar no compêndio"
          placeholder="Bola de fogo, goblin, espada…"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            update({ q: event.target.value.trim() || undefined })
          }}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de entrada">
        {[undefined, ...COMPENDIUM_KINDS].map((kind) => (
          <button
            key={kind ?? 'all'}
            type="button"
            aria-pressed={filters.kind === kind}
            onClick={() => selectKind(kind)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm pointer-coarse:py-2',
              filters.kind === kind ? 'border-brass bg-brass/15 text-bone' : 'border-line text-moss hover:text-bone'
            )}
          >
            {kind ? COMPENDIUM_KIND_LABELS[kind].many : 'Tudo'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {filters.kind === 'spell' && (
          <>
            <Select
              label="Círculo"
              size="sm"
              value={filters.level === undefined ? ALL : String(filters.level)}
              onChange={(level) => update({ level })}
              options={[
                { value: ALL, label: 'Todo círculo' },
                ...Array.from({ length: 10 }, (_, l) => ({ value: String(l), label: l === 0 ? 'Truques' : `${l}º círculo` }))
              ]}
            />
            <Select
              label="Escola"
              size="sm"
              value={filters.school ?? ALL}
              onChange={(school) => update({ school })}
              options={filterOptions(SPELL_SCHOOLS, 'Toda escola')}
            />
            <Select
              label="Classe"
              size="sm"
              value={filters.className ?? ALL}
              onChange={(className) => update({ className })}
              options={filterOptions(
                Object.fromEntries(CLASSES.filter((c) => c.caster !== 'none').map((c) => [c.key, c.label])),
                'Toda classe'
              )}
            />
          </>
        )}
        {filters.kind === 'monster' && (
          <>
            <Select
              label="Tipo de criatura"
              size="sm"
              value={filters.type ?? ALL}
              onChange={(type) => update({ type })}
              options={filterOptions(MONSTER_TYPES, 'Todo tipo')}
            />
            <Select
              label="Nível de desafio máximo"
              size="sm"
              value={filters.crMax === undefined ? ALL : String(filters.crMax)}
              onChange={(crMax) => update({ crMax })}
              options={[
                { value: ALL, label: 'Qualquer ND' },
                ...CR_STEPS.map((cr) => ({ value: cr, label: `ND até ${cr === '0.25' ? '1/4' : cr === '0.5' ? '1/2' : cr}` }))
              ]}
            />
          </>
        )}
        {filters.kind === 'item' && (
          <>
            <Select
              label="Categoria"
              size="sm"
              value={filters.category ?? ALL}
              onChange={(category) => update({ category, rarity: undefined })}
              options={filterOptions(ITEM_CATEGORIES, 'Toda categoria')}
            />
            {filters.category === 'magic' && (
              <Select
                label="Raridade"
                size="sm"
                value={filters.rarity ?? ALL}
                onChange={(rarity) => update({ rarity })}
                options={filterOptions(ITEM_RARITIES, 'Toda raridade')}
              />
            )}
          </>
        )}
        <Select
          label="Origem"
          size="sm"
          value={filters.source ?? ALL}
          onChange={(source) => update({ source })}
          options={[
            { value: ALL, label: 'SRD e homebrew' },
            { value: 'srd', label: 'Só SRD 5.1' },
            { value: 'homebrew', label: 'Só homebrew' }
          ]}
        />
      </div>

      {results.error && <ErrorNote>{results.error.message}</ErrorNote>}
      {results.isPending && <Skeleton className="h-64" />}
      {results.data && items.length === 0 && <p className="py-6 text-center text-moss">Nada encontrado com esses filtros.</p>}
      <ul className={cn('flex flex-col gap-1', results.isPlaceholderData && 'opacity-60')} aria-busy={results.isFetching}>
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={`${entryId ? '../' : ''}${item.id}${suffix}`}
              relative="path"
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: item.id, kind: item.kind, name: item.name }))
              }
              aria-current={item.id === entryId ? 'page' : undefined}
              className={cn(
                'flex flex-col rounded-control border border-transparent px-3 py-2 hover:border-line hover:bg-surface',
                item.id === entryId && 'border-line-strong bg-surface-raised'
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{item.name}</span>
                {item.source === 'homebrew' && <Badge tone="brass">Homebrew</Badge>}
                {item.source === 'homebrew' && !item.published && <span className="text-xs text-moss-dim">rascunho</span>}
              </span>
              <span className="text-sm text-moss">
                {!filters.kind && `${COMPENDIUM_KIND_LABELS[item.kind].one} · `}
                {item.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {results.hasNextPage && (
        <Button
          variant="secondary"
          className="self-center"
          loading={results.isFetchingNextPage}
          onClick={() => void results.fetchNextPage()}
        >
          Mostrar mais
        </Button>
      )}
    </aside>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-[24rem_1fr]">
        {list}
        <section className={cn('min-w-0', !entryId && 'max-lg:hidden')} aria-live="polite">
          {entryId && (
            <Link
              to={`..${suffix}`}
              relative="path"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-moss hover:text-bone lg:hidden"
            >
              <ArrowLeft className="size-4" aria-hidden /> Voltar para a busca
            </Link>
          )}
          {!entryId && (
            <EmptyState art={<Grimoire className="mx-auto w-56" />} title="Abra uma entrada">
              Magias, monstros, itens e condições do SRD 5.1, mais o homebrew da sua mesa. Escolha algo na lista para ler aqui.
            </EmptyState>
          )}
          {entryId && entry.isPending && <Skeleton className="h-96" />}
          {entryId && entry.error && <ErrorNote>{entry.error.message}</ErrorNote>}
          {entry.data && (
            <div className="rounded-panel border border-line bg-surface/70 p-5">
              <EntryView
                entry={entry.data}
                campaignId={campaign.id}
                isGameMaster={gm}
                onEdit={() => setEditor({ editing: entry.data })}
                onCopy={() => setEditor({ copyFrom: entry.data })}
                onDelete={() => setDeleting(entry.data)}
              />
            </div>
          )}
        </section>
      </div>
      <p className="text-xs text-moss-dim">{SRD_ATTRIBUTION}</p>

      <HomebrewDialog
        campaignId={campaign.id}
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
        editing={editor?.editing}
        copyFrom={editor?.copyFrom}
        onSaved={(saved) => void navigate(`/campanhas/${campaign.id}/compendio/${saved.id}${suffix}`)}
      />
      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent
          title={`Apagar ${deleting?.name ?? ''}?`}
          description="Some do compêndio da mesa. Fichas que já usaram continuam como estão."
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success('Homebrew apagado')
                    setDeleting(null)
                    void navigate(`/campanhas/${campaign.id}/compendio${suffix}`)
                  }
                })
              }
            >
              Apagar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
