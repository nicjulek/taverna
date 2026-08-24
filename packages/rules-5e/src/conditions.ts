export const CONDITIONS = {
  blinded: { label: 'Cego', short: 'Ce' },
  charmed: { label: 'Enfeitiçado', short: 'En' },
  deafened: { label: 'Surdo', short: 'Su' },
  exhaustion: { label: 'Exausto', short: 'Ex' },
  frightened: { label: 'Amedrontado', short: 'Am' },
  grappled: { label: 'Agarrado', short: 'Ag' },
  incapacitated: { label: 'Incapacitado', short: 'In' },
  invisible: { label: 'Invisível', short: 'Iv' },
  paralyzed: { label: 'Paralisado', short: 'Pa' },
  petrified: { label: 'Petrificado', short: 'Pe' },
  poisoned: { label: 'Envenenado', short: 'Ev' },
  prone: { label: 'Caído', short: 'Ca' },
  restrained: { label: 'Contido', short: 'Co' },
  stunned: { label: 'Atordoado', short: 'At' },
  unconscious: { label: 'Inconsciente', short: 'Ic' },
  concentrating: { label: 'Concentrado', short: 'Cc' }
} as const

export type ConditionKey = keyof typeof CONDITIONS

export interface Effect {
  id: string
  label: string
  condition: ConditionKey | null
  rounds: number | null
}

export function isCondition(value: unknown): value is ConditionKey {
  return typeof value === 'string' && value in CONDITIONS
}

export function readEffects(value: unknown): Effect[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw): Effect[] => {
    if (!raw || typeof raw !== 'object') return []
    const e = raw as Record<string, unknown>
    const condition = isCondition(e.condition) ? e.condition : null
    const label = typeof e.label === 'string' && e.label.trim() ? e.label.trim().slice(0, 40) : condition ? CONDITIONS[condition].label : ''
    if (!label) return []
    const rounds = typeof e.rounds === 'number' && Number.isFinite(e.rounds) && e.rounds > 0 ? Math.floor(e.rounds) : null
    return [{ id: typeof e.id === 'string' ? e.id : label, label, condition, rounds }]
  })
}

export function tickEffects(effects: Effect[]): { kept: Effect[]; ended: Effect[] } {
  const kept: Effect[] = []
  const ended: Effect[] = []
  for (const effect of effects) {
    if (effect.rounds === null) kept.push(effect)
    else if (effect.rounds <= 1) ended.push(effect)
    else kept.push({ ...effect, rounds: effect.rounds - 1 })
  }
  return { kept, ended }
}

export interface InitiativeEntry {
  id: string
  name: string
  initiative: number | null
  bonus: number
}

export function initiativeOrder<T extends InitiativeEntry>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity) ||
      b.bonus - a.bonus ||
      a.name.localeCompare(b.name, 'pt-BR') ||
      a.id.localeCompare(b.id)
  )
}

export function nextTurn<T extends InitiativeEntry>(
  entries: T[],
  current: string | null,
  round: number
): { turn: string | null; round: number } {
  const order = initiativeOrder(entries)
  if (order.length === 0) return { turn: null, round }
  if (current === null) return { turn: order[0]!.id, round: Math.max(1, round) }
  const index = order.findIndex((e) => e.id === current)
  if (index === -1 || index === order.length - 1) return { turn: order[0]!.id, round: index === -1 ? round : round + 1 }
  return { turn: order[index + 1]!.id, round }
}

export function previousTurn<T extends InitiativeEntry>(
  entries: T[],
  current: string | null,
  round: number
): { turn: string | null; round: number } {
  const order = initiativeOrder(entries)
  if (order.length === 0 || current === null) return { turn: null, round }
  const index = order.findIndex((e) => e.id === current)
  if (index <= 0) return round > 1 ? { turn: order[order.length - 1]!.id, round: round - 1 } : { turn: order[0]!.id, round }
  return { turn: order[index - 1]!.id, round }
}

export function bloodied(hp: { current: number; max: number }): boolean {
  return hp.max > 0 && hp.current > 0 && hp.current <= hp.max / 2
}
