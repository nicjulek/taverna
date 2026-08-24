export const DAMAGE_TYPES = {
  acid: 'Ácido',
  bludgeoning: 'Concussão',
  cold: 'Frio',
  fire: 'Fogo',
  force: 'Energia',
  lightning: 'Elétrico',
  necrotic: 'Necrótico',
  piercing: 'Perfurante',
  poison: 'Veneno',
  psychic: 'Psíquico',
  radiant: 'Radiante',
  slashing: 'Cortante',
  thunder: 'Trovão'
} as const

export type DamageType = keyof typeof DAMAGE_TYPES

const ALIASES: Record<string, DamageType> = {
  acido: 'acid',
  acid: 'acid',
  concussao: 'bludgeoning',
  contundente: 'bludgeoning',
  impacto: 'bludgeoning',
  bludgeoning: 'bludgeoning',
  frio: 'cold',
  cold: 'cold',
  fogo: 'fire',
  fire: 'fire',
  energia: 'force',
  forca: 'force',
  force: 'force',
  eletrico: 'lightning',
  relampago: 'lightning',
  raio: 'lightning',
  lightning: 'lightning',
  necrotico: 'necrotic',
  necrotic: 'necrotic',
  perfurante: 'piercing',
  piercing: 'piercing',
  veneno: 'poison',
  venenoso: 'poison',
  poison: 'poison',
  psiquico: 'psychic',
  psychic: 'psychic',
  radiante: 'radiant',
  radiant: 'radiant',
  cortante: 'slashing',
  slashing: 'slashing',
  trovao: 'thunder',
  trovejante: 'thunder',
  sonico: 'thunder',
  thunder: 'thunder'
}

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function damageTypeOf(text: string | null | undefined): DamageType | null {
  if (!text) return null
  for (const word of fold(text).split(/[^a-z]+/)) {
    const type = ALIASES[word]
    if (type) return type
  }
  return null
}

export function damageTypesIn(entries: readonly string[] | null | undefined): DamageType[] {
  const found = new Set<DamageType>()
  for (const entry of entries ?? []) {
    for (const word of fold(entry).split(/[^a-z]+/)) {
      const type = ALIASES[word]
      if (type) found.add(type)
    }
  }
  return [...found]
}

export interface Defenses {
  resistances: DamageType[]
  immunities: DamageType[]
  vulnerabilities: DamageType[]
}

export type DamageAdjustment = 'normal' | 'resistant' | 'vulnerable' | 'immune'

export function adjustDamage(
  amount: number,
  type: DamageType | null,
  defenses: Partial<Defenses>
): { amount: number; adjustment: DamageAdjustment } {
  const base = Math.max(0, Math.floor(amount))
  if (!type) return { amount: base, adjustment: 'normal' }
  if (defenses.immunities?.includes(type)) return { amount: 0, adjustment: 'immune' }
  const resistant = defenses.resistances?.includes(type) ?? false
  const vulnerable = defenses.vulnerabilities?.includes(type) ?? false
  if (resistant && !vulnerable) return { amount: Math.floor(base / 2), adjustment: 'resistant' }
  if (vulnerable && !resistant) return { amount: base * 2, adjustment: 'vulnerable' }
  return { amount: base, adjustment: 'normal' }
}

export const ADJUSTMENT_LABELS: Record<DamageAdjustment, string> = {
  normal: '',
  resistant: 'resistente, metade do dano',
  vulnerable: 'vulnerável, dano dobrado',
  immune: 'imune, nenhum dano'
}
