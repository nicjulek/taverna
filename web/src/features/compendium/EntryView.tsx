import { CLASSES } from '@taverna/rules-5e'
import {
  COMPENDIUM_KIND_LABELS,
  type CompendiumEntryDto,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  type RollVisibility,
  SPELL_SCHOOLS
} from '@taverna/shared'
import { Copy, Languages, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Button } from '@/components/ui'
import { renderMarkdown } from '@/lib/markdown'
import { Statblock } from './Statblock'

interface EntryViewProps {
  entry: CompendiumEntryDto
  campaignId: string
  isGameMaster: boolean
  onEdit?: () => void
  onCopy?: () => void
  onDelete?: () => void
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, value]) => value !== null && value !== undefined && value !== '')
  if (shown.length === 0) return null
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-control border border-line bg-felt-deep/60 p-3 sm:grid-cols-2">
      {shown.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-moss">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EntryView({ entry, campaignId, isGameMaster, onEdit, onCopy, onDelete }: EntryViewProps) {
  const meta = entry.meta
  const data = entry.data
  const rollVisibility: RollVisibility = isGameMaster ? 'gm' : 'public'

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-moss">{COMPENDIUM_KIND_LABELS[entry.kind].one}</p>
          <h2 className="text-3xl">{entry.name}</h2>
          {entry.summary && <p className="text-moss">{entry.summary}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={entry.source === 'homebrew' ? 'brass' : 'neutral'}>{entry.source === 'homebrew' ? 'Homebrew' : 'SRD 5.1'}</Badge>
            {entry.source === 'homebrew' && !entry.published && <Badge>Rascunho, só os mestres veem</Badge>}
            {entry.lang === 'en' && (
              <span className="inline-flex items-center gap-1 text-sm text-moss-dim">
                <Languages className="size-4" aria-hidden /> Texto original em inglês
              </span>
            )}
          </div>
        </div>
        {isGameMaster && (
          <div className="flex flex-wrap gap-2">
            {entry.source === 'homebrew' ? (
              <>
                <Button variant="secondary" size="sm" onClick={onEdit}>
                  <Pencil /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 /> Apagar
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onCopy}>
                <Copy /> Copiar para homebrew
              </Button>
            )}
          </div>
        )}
      </header>

      {entry.kind === 'spell' && (
        <Facts
          items={[
            ['Círculo', Number(meta.level) === 0 ? 'Truque' : `${String(meta.level)}º`],
            ['Escola', SPELL_SCHOOLS[String(meta.school)] ?? (meta.school as string)],
            ['Tempo de conjuração', meta.castingTime as string],
            ['Alcance', meta.range as string],
            ['Componentes', meta.components as string],
            ['Duração', `${meta.concentration ? 'Concentração, ' : ''}${String(meta.duration ?? '')}`],
            ['Ritual', meta.ritual ? 'Sim' : null],
            [
              'Classes',
              Array.isArray(meta.classes) && meta.classes.length
                ? (meta.classes as string[]).map((key) => CLASSES.find((c) => c.key === key)?.label ?? key).join(', ')
                : null
            ],
            [
              'Dano',
              data.damageBySlot
                ? Object.entries(data.damageBySlot as Record<string, string>)
                    .slice(0, 3)
                    .map(([slot, dice]) => `${slot}º: ${dice}`)
                    .join(' · ') + (data.damageType ? ` (${String(data.damageType).toLowerCase()})` : '')
                : data.damageByLevel
                  ? Object.entries(data.damageByLevel as Record<string, string>)
                      .map(([level, dice]) => `nível ${level}: ${dice}`)
                      .join(' · ')
                  : null
            ]
          ]}
        />
      )}

      {entry.kind === 'item' && (
        <Facts
          items={[
            ['Categoria', ITEM_CATEGORIES[String(meta.category)] ?? null],
            ['Raridade', meta.rarity ? ITEM_RARITIES[String(meta.rarity)] : null],
            ['Custo', meta.cost as string],
            ['Peso', meta.weight ? `${String(meta.weight)} lb` : null],
            ['Dano', data.damage ? `${String(data.damage)} ${String(data.damageType ?? '').toLowerCase()}` : null],
            ['Duas mãos', (data.twoHanded as string) ?? null],
            ['Propriedades', Array.isArray(data.properties) && data.properties.length ? (data.properties as string[]).join(', ') : null]
          ]}
        />
      )}

      {entry.kind === 'monster' && <Statblock entry={entry} campaignId={campaignId} rollVisibility={rollVisibility} />}

      {entry.body && <div className="prose-taverna" dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.body) }} />}

      {entry.kind === 'monster' && isGameMaster && <p className="text-sm text-moss-dim">Suas rolagens daqui ficam só para os mestres.</p>}
    </div>
  )
}
