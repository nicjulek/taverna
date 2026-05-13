import type { SheetAttack, SheetSpell } from '@taverna/rules-5e'
import type { CompendiumEntryDto } from '@taverna/shared'

export const DRAG_TYPE = 'application/x-taverna-compendium'

export interface DragPayload {
  id: string
  kind: string
  name: string
}

export function canAddToSheet(entry: { kind: string; meta: Record<string, unknown> }): 'spell' | 'attack' | null {
  if (entry.kind === 'spell') return 'spell'
  if (entry.kind === 'item' && entry.meta.category === 'weapon') return 'attack'
  return null
}

export function spellFromEntry(entry: CompendiumEntryDto): SheetSpell {
  const level = Number(entry.meta.level ?? 0)
  const notes = [entry.meta.castingTime, entry.meta.range, entry.meta.duration].filter(Boolean).join(' · ')
  return { id: crypto.randomUUID(), name: entry.name.slice(0, 80), level, prepared: level === 0, notes: notes.slice(0, 500) }
}

export function attackFromEntry(entry: CompendiumEntryDto): SheetAttack {
  const data = entry.data as { damage?: string | null; damageType?: string | null; ranged?: boolean; properties?: string[] }
  const finesse = data.ranged || (data.properties ?? []).includes('finesse')
  return {
    id: crypto.randomUUID(),
    name: entry.name.slice(0, 60),
    ability: finesse ? 'dex' : 'str',
    proficient: true,
    bonus: 0,
    damage: (data.damage ?? '').slice(0, 60),
    damageType: (data.damageType ?? '').toLowerCase().slice(0, 30)
  }
}
