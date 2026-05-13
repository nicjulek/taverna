import { GripVertical, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCompendiumSearch } from '../../compendium/hooks'
import { DRAG_TYPE } from '../../compendium/to-sheet'
import { useSheet } from './sheet-context'
import { useAddFromCompendium } from './use-add-from-compendium'

export function CompendiumPanel({
  open,
  onClose,
  onAdded
}: {
  open: boolean
  onClose: () => void
  onAdded: (target: 'spell' | 'attack') => void
}) {
  const { campaignId } = useSheet()
  const [kind, setKind] = useState<'spell' | 'weapon'>('spell')
  const [q, setQ] = useState('')
  const search = useCompendiumSearch(
    campaignId,
    kind === 'spell' ? { kind: 'spell', q: q.trim() || undefined } : { kind: 'item', category: 'weapon', q: q.trim() || undefined }
  )
  const add = useAddFromCompendium(onAdded)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const items = search.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <aside
      aria-label="Compêndio da ficha"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col gap-3 border-l border-line-strong bg-felt p-4 shadow-[-20px_0_40px_-20px_rgba(0,0,0,.8)]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl">Compêndio</h3>
        <Button variant="ghost" size="icon" aria-label="Fechar compêndio" onClick={onClose}>
          <X />
        </Button>
      </div>
      <p className="text-sm text-moss">Arraste para as abas Ataques ou Magias, ou use o botão de adicionar.</p>
      <div className="flex rounded-control border border-line-strong p-0.5" role="group" aria-label="O que procurar">
        {(
          [
            ['spell', 'Magias'],
            ['weapon', 'Armas']
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            className={cn(
              'flex-1 rounded-[0.35rem] py-1.5 text-sm',
              kind === value ? 'bg-surface-raised text-bone' : 'text-moss hover:text-bone'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <Input
        ref={input}
        type="search"
        aria-label="Procurar no compêndio"
        placeholder={kind === 'spell' ? 'Mísseis mágicos…' : 'Espada longa…'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1">
        {items.map((item) => (
          <li
            key={item.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'copy'
              event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: item.id, kind: item.kind, name: item.name }))
            }}
            className="group flex cursor-grab items-center gap-2 rounded-control border border-line bg-surface/70 px-2 py-1.5 active:cursor-grabbing"
          >
            <GripVertical className="size-4 shrink-0 text-moss-dim" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{item.name}</span>
              <span className="block truncate text-xs text-moss">{item.summary}</span>
            </span>
            <Button variant="ghost" size="icon" aria-label={`Adicionar ${item.name} à ficha`} onClick={() => void add(item.id)}>
              <Plus />
            </Button>
          </li>
        ))}
        {search.data && items.length === 0 && <li className="py-4 text-center text-moss">Nada encontrado.</li>}
      </ul>
      {search.hasNextPage && (
        <Button variant="secondary" size="sm" loading={search.isFetchingNextPage} onClick={() => void search.fetchNextPage()}>
          Mostrar mais
        </Button>
      )}
    </aside>
  )
}
