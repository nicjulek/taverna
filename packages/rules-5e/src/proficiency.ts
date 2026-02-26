import type { RollMode } from '@taverna/rules-core'

export type Proficiency = 'none' | 'half' | 'proficient' | 'expertise'

export function assertLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError('O nível vai de 1 a 20')
}

export function proficiencyBonus(level: number): number {
  assertLevel(level)
  return 2 + Math.floor((level - 1) / 4)
}

export function proficiencyPart(proficiency: Proficiency, bonus: number): number {
  switch (proficiency) {
    case 'none':
      return 0
    case 'half':
      return Math.floor(bonus / 2)
    case 'proficient':
      return bonus
    case 'expertise':
      return bonus * 2
  }
}

export interface AbilityCheckInput {
  modifier: number
  level: number
  proficiency?: Proficiency
  jackOfAllTrades?: boolean
  extra?: number
}

export function abilityCheckBonus({
  modifier,
  level,
  proficiency = 'none',
  jackOfAllTrades = false,
  extra = 0
}: AbilityCheckInput): number {
  const effective = proficiency === 'none' && jackOfAllTrades ? 'half' : proficiency
  return modifier + proficiencyPart(effective, proficiencyBonus(level)) + extra
}

export function savingThrowBonus(modifier: number, level: number, proficient: boolean, extra = 0): number {
  return modifier + (proficient ? proficiencyBonus(level) : 0) + extra
}

export function passiveScore(checkBonus: number, mode: RollMode = 'normal'): number {
  return 10 + checkBonus + (mode === 'advantage' ? 5 : mode === 'disadvantage' ? -5 : 0)
}

export function combineModes(sources: readonly RollMode[]): RollMode {
  const advantage = sources.includes('advantage')
  const disadvantage = sources.includes('disadvantage')
  if (advantage && !disadvantage) return 'advantage'
  if (disadvantage && !advantage) return 'disadvantage'
  return 'normal'
}
