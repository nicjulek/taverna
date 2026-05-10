import {
  type CompendiumEntryDto,
  HOMEBREW_KINDS,
  type HomebrewInput,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  type MonsterAction,
  MONSTER_TYPES,
  SPELL_SCHOOLS
} from '@taverna/shared'

export type Kind = (typeof HOMEBREW_KINDS)[number]

export interface Draft {
  kind: Kind
  name: string
  summary: string
  body: string
  published: boolean
  level: string
  school: string
  castingTime: string
  range: string
  duration: string
  components: string
  concentration: boolean
  ritual: boolean
  damage: string
  damageType: string
  category: string
  rarity: string
  cost: string
  size: string
  type: string
  cr: string
  ac: string
  hp: string
  hitDice: string
  speed: string
  abilities: Record<string, string>
  actions: { name: string; attackBonus: string; dice: string; desc: string }[]
}

export const empty = (): Draft => ({
  kind: 'item',
  name: '',
  summary: '',
  body: '',
  published: false,
  level: '1',
  school: 'evocation',
  castingTime: '1 ação',
  range: '',
  duration: 'Instantânea',
  components: 'V, S',
  concentration: false,
  ritual: false,
  damage: '',
  damageType: '',
  category: 'magic',
  rarity: 'uncommon',
  cost: '',
  size: 'Medium',
  type: 'monstrosity',
  cr: '1',
  ac: '12',
  hp: '20',
  hitDice: '3d8+6',
  speed: '9 m',
  abilities: { str: '10', dex: '10', con: '10', int: '10', wis: '10', cha: '10' },
  actions: []
})

const str = (value: unknown, fallback = '') => (value === null || value === undefined ? fallback : String(value))

export function draftFromEntry(entry: CompendiumEntryDto): Draft {
  const base = empty()
  const m = entry.meta
  const d = entry.data as Record<string, unknown>
  const kind = (HOMEBREW_KINDS as readonly string[]).includes(entry.kind) ? (entry.kind as Kind) : 'item'
  const slots = (d.damageBySlot ?? {}) as Record<string, string>
  return {
    ...base,
    kind,
    name: entry.name,
    summary: entry.summary,
    body: entry.body,
    published: entry.source === 'homebrew' ? entry.published : false,
    level: str(m.level, base.level),
    school: str(m.school, base.school),
    castingTime: str(m.castingTime, base.castingTime),
    range: str(m.range),
    duration: str(m.duration, base.duration),
    components: str(m.components, base.components),
    concentration: Boolean(m.concentration),
    ritual: Boolean(m.ritual),
    damage: str(d.damage ?? slots[str(m.level)] ?? Object.values(slots)[0]),
    damageType: str(d.damageType),
    category: str(m.category, base.category),
    rarity: str(m.rarity, base.rarity),
    cost: str(m.cost),
    size: str(m.size, base.size),
    type: str(m.type, base.type),
    cr: str(m.cr, base.cr),
    ac: str(m.ac, base.ac),
    hp: str(m.hp, base.hp),
    hitDice: str(d.hitDice, base.hitDice),
    speed: d.speed ? Object.values(d.speed as Record<string, string>).join(', ') : base.speed,
    abilities: d.abilities
      ? Object.fromEntries(Object.entries(d.abilities as Record<string, number>).map(([k, v]) => [k, String(v)]))
      : base.abilities,
    actions: ((d.actions ?? []) as MonsterAction[]).map((a) => ({
      name: a.name,
      attackBonus: a.attackBonus === null ? '' : String(a.attackBonus),
      dice: a.damage[0]?.dice ?? '',
      desc: a.desc
    }))
  }
}

const num = (value: string, fallback = 0) => {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toHomebrew(draft: Draft): HomebrewInput {
  const common = { kind: draft.kind, name: draft.name.trim(), summary: draft.summary.trim(), body: draft.body, published: draft.published }
  switch (draft.kind) {
    case 'spell': {
      const level = num(draft.level)
      return {
        ...common,
        summary:
          common.summary || `${level === 0 ? 'Truque' : `${level}º círculo`} de ${(SPELL_SCHOOLS[draft.school] ?? '').toLowerCase()}`,
        meta: {
          level,
          school: draft.school,
          castingTime: draft.castingTime,
          range: draft.range,
          duration: draft.duration,
          components: draft.components,
          concentration: draft.concentration,
          ritual: draft.ritual,
          classes: []
        },
        data: draft.damage ? { damageBySlot: { [String(level)]: draft.damage }, damageType: draft.damageType } : {}
      }
    }
    case 'item':
      return {
        ...common,
        summary:
          common.summary ||
          `${ITEM_CATEGORIES[draft.category] ?? ''}${draft.category === 'magic' ? `, ${(ITEM_RARITIES[draft.rarity] ?? '').toLowerCase()}` : ''}`,
        meta: { category: draft.category, rarity: draft.category === 'magic' ? draft.rarity : null, cost: draft.cost, weight: null },
        data: draft.damage ? { damage: draft.damage, damageType: draft.damageType, properties: [] } : {}
      }
    case 'monster': {
      const cr = num(draft.cr)
      return {
        ...common,
        summary: common.summary || `${MONSTER_TYPES[draft.type] ?? draft.type}, ND ${draft.cr}`,
        meta: { cr, crLabel: draft.cr, type: draft.type, size: draft.size, ac: num(draft.ac, 10), hp: num(draft.hp, 1), xp: 0 },
        data: {
          armorClass: [{ value: num(draft.ac, 10), type: '' }],
          hitPoints: num(draft.hp, 1),
          hitDice: draft.hitDice,
          speed: { walk: draft.speed },
          abilities: Object.fromEntries(Object.entries(draft.abilities).map(([k, v]) => [k, Math.min(30, Math.max(1, num(v, 10)))])),
          actions: draft.actions
            .filter((a) => a.name.trim())
            .map((a) => ({
              name: a.name.trim(),
              desc: a.desc,
              attackBonus: a.attackBonus.trim() ? num(a.attackBonus) : null,
              damage: a.dice.trim() ? [{ dice: a.dice.replace(/\s+/g, ''), type: '' }] : [],
              dc: null
            }))
        }
      }
    }
    default:
      return { ...common, meta: {}, data: {} }
  }
}
