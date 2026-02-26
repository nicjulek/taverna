import type { RollResult } from '@taverna/dice'

export type RollMode = 'normal' | 'advantage' | 'disadvantage'

export interface AbilityDef {
  key: string
  label: string
  short: string
}

export interface SkillDef {
  key: string
  label: string
  ability: string
}

export interface CheckOptions {
  mode?: RollMode
  rerollOnes?: boolean
}

export interface Target {
  dc?: number
  ac?: number
}

export type OutcomeTone = 'critical' | 'fumble' | 'success' | 'failure' | 'neutral'

export interface RollOutcome {
  tone: OutcomeTone
  text: string
}

export interface RulesSystem {
  id: string
  name: string
  abilities: readonly AbilityDef[]
  skills: readonly SkillDef[]
  check(bonus: number, options?: CheckOptions): string
  damage(expression: string, options: { critical: boolean }): string
  judge(result: RollResult, target?: Target): RollOutcome
}

const registry = new Map<string, RulesSystem>()

export function registerSystem(system: RulesSystem): RulesSystem {
  registry.set(system.id, system)
  return system
}

export function getSystem(id: string): RulesSystem {
  const system = registry.get(id)
  if (!system) throw new Error(`Sistema de regras desconhecido: ${id}`)
  return system
}

export function listSystems(): RulesSystem[] {
  return [...registry.values()]
}

export function formatBonus(value: number): string {
  return value < 0 ? `-${Math.abs(value)}` : `+${value}`
}

export function withBonus(expression: string, bonus: number): string {
  return bonus === 0 ? expression : `${expression}${formatBonus(bonus)}`
}
