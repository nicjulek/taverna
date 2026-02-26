import { assertLevel, proficiencyBonus } from './proficiency'

export type CasterProgression = 'full' | 'half' | 'third' | 'pact' | 'none'

const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1]
]

export function slotsForCasterLevel(casterLevel: number): number[] {
  if (casterLevel <= 0) return Array(9).fill(0)
  const row = FULL_CASTER_SLOTS[Math.min(casterLevel, 20) - 1]!
  return Array.from({ length: 9 }, (_, i) => row[i] ?? 0)
}

export function singleClassCasterLevel(progression: CasterProgression, level: number): number {
  assertLevel(level)
  switch (progression) {
    case 'full':
      return level
    case 'half':
      return level < 2 ? 0 : Math.ceil(level / 2)
    case 'third':
      return level < 3 ? 0 : Math.ceil(level / 3)
    case 'pact':
    case 'none':
      return 0
  }
}

export interface ClassLevel {
  progression: CasterProgression
  level: number
}

export function multiclassCasterLevel(classes: readonly ClassLevel[]): number {
  const casters = classes.filter((c) => c.progression !== 'none' && c.progression !== 'pact')
  if (casters.length === 1) return singleClassCasterLevel(casters[0]!.progression, casters[0]!.level)
  return casters.reduce((sum, c) => {
    assertLevel(c.level)
    if (c.progression === 'full') return sum + c.level
    if (c.progression === 'half') return sum + Math.floor(c.level / 2)
    return sum + Math.floor(c.level / 3)
  }, 0)
}

export function spellSlots(classes: readonly ClassLevel[]): number[] {
  return slotsForCasterLevel(multiclassCasterLevel(classes))
}

export interface PactSlots {
  count: number
  level: number
}

export function pactSlots(warlockLevel: number): PactSlots {
  assertLevel(warlockLevel)
  const count = warlockLevel === 1 ? 1 : warlockLevel < 11 ? 2 : warlockLevel < 17 ? 3 : 4
  const level = Math.min(5, Math.ceil(warlockLevel / 2))
  return { count, level }
}

export function spellSaveDc(abilityModifier: number, level: number): number {
  return 8 + proficiencyBonus(level) + abilityModifier
}

export function spellAttackBonus(abilityModifier: number, level: number): number {
  return proficiencyBonus(level) + abilityModifier
}

export function concentrationDc(damage: number): number {
  return Math.max(10, Math.floor(damage / 2))
}

export function cantripDice(characterLevel: number): number {
  assertLevel(characterLevel)
  return characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1
}
