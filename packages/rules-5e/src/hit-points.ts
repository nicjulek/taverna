import { withBonus } from '@taverna/rules-core'
import { assertLevel } from './proficiency'

export const HIT_DICE = [6, 8, 10, 12] as const
export type HitDie = (typeof HIT_DICE)[number]

export interface HitPoints {
  current: number
  max: number
  temporary: number
}

export interface DamageResult extends HitPoints {
  droppedToZero: boolean
  instantDeath: boolean
}

export function applyDamage(hp: HitPoints, amount: number): DamageResult {
  if (amount < 0) throw new RangeError('Dano não pode ser negativo')
  const absorbed = Math.min(hp.temporary, amount)
  const remaining = amount - absorbed
  const overflow = remaining - hp.current
  const current = Math.max(0, hp.current - remaining)
  return {
    max: hp.max,
    temporary: hp.temporary - absorbed,
    current,
    droppedToZero: hp.current > 0 && current === 0,
    instantDeath: current === 0 && overflow >= hp.max
  }
}

export function applyHealing(hp: HitPoints, amount: number): HitPoints {
  if (amount < 0) throw new RangeError('Cura não pode ser negativa')
  return { ...hp, current: Math.min(hp.max, hp.current + amount) }
}

export function grantTemporary(hp: HitPoints, amount: number): HitPoints {
  return { ...hp, temporary: Math.max(hp.temporary, amount) }
}

export function firstLevelHitPoints(die: HitDie, conModifier: number): number {
  return Math.max(1, die + conModifier)
}

export function averageHitPointsPerLevel(die: HitDie, conModifier: number): number {
  return Math.max(1, die / 2 + 1 + conModifier)
}

export function hitDieRoll(die: HitDie, conModifier: number): string {
  return withBonus(`1d${die}`, conModifier)
}

export function hitDiceRecoveredOnLongRest(level: number): number {
  assertLevel(level)
  return Math.max(1, Math.floor(level / 2))
}
