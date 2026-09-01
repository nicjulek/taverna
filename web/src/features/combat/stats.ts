import { damageTypesIn, derive, attackDamage, abilityModifier, readEffects, type Effect, type Sheet5e, bloodied } from '@taverna/rules-5e'
import type { CompendiumEntryDto, MonsterAction, SceneItemDto, TokenHp } from '@taverna/shared'

export interface CombatAttack {
  key: string
  name: string
  bonus: number
  damage: { dice: string; type: string }[]
}

export function tokenHp(item: SceneItemDto): TokenHp | null {
  const raw = item.data.hp as Partial<TokenHp> | undefined
  const max = Number(raw?.max)
  if (!raw || !Number.isFinite(max) || max <= 0) return null
  const current = Number(raw.current)
  return {
    max,
    current: Number.isFinite(current) ? Math.max(0, Math.min(max, current)) : max,
    temporary: Math.max(0, Number(raw.temporary) || 0)
  }
}

export function tokenAc(item: SceneItemDto): number | null {
  const ac = Number(item.data.ac)
  return Number.isFinite(ac) && ac > 0 ? ac : null
}

export function tokenEffects(item: SceneItemDto): Effect[] {
  return readEffects(item.data.effects)
}

export function isBloodied(item: SceneItemDto): boolean {
  const hp = tokenHp(item)
  return hp ? bloodied(hp) : false
}

export function tokenAura(item: SceneItemDto): { radius: number; color: string } | null {
  const aura = item.data.aura as { radius?: unknown; color?: unknown } | undefined
  const radius = Number(aura?.radius)
  if (!aura || !Number.isFinite(radius) || radius <= 0) return null
  return { radius, color: typeof aura.color === 'string' ? aura.color : '#d6a446' }
}

export function sheetAttacks(sheet: Sheet5e): CombatAttack[] {
  const derived = derive(sheet)
  return sheet.attacks.map((attack) => ({
    key: attack.id,
    name: attack.name || 'Ataque',
    bonus: derived.attacks[attack.id] ?? 0,
    damage: attackDamage(sheet, attack) ? [{ dice: attackDamage(sheet, attack), type: attack.damageType }] : []
  }))
}

export function monsterAttacks(actions: unknown): CombatAttack[] {
  if (!Array.isArray(actions)) return []
  return (actions as MonsterAction[])
    .filter((action) => typeof action.attackBonus === 'number')
    .map((action, index) => ({
      key: `${index}-${action.name}`,
      name: action.name,
      bonus: action.attackBonus!,
      damage: (action.damage ?? []).filter((d) => d.dice).map((d) => ({ dice: d.dice.replace(/\s+/g, ''), type: d.type }))
    }))
}

const SIZE_SPAN: Record<string, number> = { Tiny: 1, Small: 1, Medium: 1, Large: 2, Huge: 3, Gargantuan: 4 }

export function monsterToken(entry: CompendiumEntryDto): { span: number; data: Record<string, unknown> } {
  const data = entry.data as {
    armorClass?: { value: number }[]
    hitPoints?: number
    abilities?: Record<string, number>
    resistances?: string[]
    immunities?: string[]
    vulnerabilities?: string[]
  }
  const hp = Math.max(1, Number(data.hitPoints ?? entry.meta.hp ?? 1))
  return {
    span: SIZE_SPAN[String(entry.meta.size ?? 'Medium')] ?? 1,
    data: {
      compendiumId: entry.id,
      hp: { current: hp, max: hp, temporary: 0 },
      ac: data.armorClass?.[0]?.value ?? Number(entry.meta.ac ?? 10),
      initiative: abilityModifier(Math.min(30, Math.max(1, data.abilities?.dex ?? 10))),
      defenses: {
        resistances: damageTypesIn(data.resistances),
        immunities: damageTypesIn(data.immunities),
        vulnerabilities: damageTypesIn(data.vulnerabilities)
      }
    }
  }
}
