import { mapDice, parse, type RollResult, toNotation } from '@taverna/dice'
import { type CheckOptions, type RollOutcome, withBonus } from '@taverna/rules-core'

export function d20(bonus: number, { mode = 'normal', rerollOnes = false }: CheckOptions = {}): string {
  const reroll = rerollOnes ? 'r1' : ''
  const base = mode === 'advantage' ? `2d20${reroll}kh1` : mode === 'disadvantage' ? `2d20${reroll}kl1` : `1d20${reroll}`
  return withBonus(base, bonus)
}

export function criticalDamage(expression: string): string {
  const { ast } = parse(expression)
  return toNotation(mapDice(ast, (dice) => ({ ...dice, count: Math.min(dice.count * 2, 100) })))
}

export function judgeAttack(result: RollResult, armorClass: number): RollOutcome {
  if (result.natural === 20) return { tone: 'critical', text: 'Acerto crítico' }
  if (result.natural === 1) return { tone: 'fumble', text: 'Erro automático' }
  return result.total >= armorClass
    ? { tone: 'success', text: `Acertou a CA ${armorClass}` }
    : { tone: 'failure', text: `Errou a CA ${armorClass}` }
}

export function judgeCheck(result: RollResult, dc: number): RollOutcome {
  return result.total >= dc ? { tone: 'success', text: `Passou na CD ${dc}` } : { tone: 'failure', text: `Falhou na CD ${dc}` }
}

export interface DeathSaves {
  successes: number
  failures: number
}

export type DeathSaveStatus = 'rolling' | 'stable' | 'dead' | 'conscious'

export interface DeathSaveResult extends DeathSaves {
  status: DeathSaveStatus
  hitPoints: number
}

export function deathSave(state: DeathSaves, natural: number): DeathSaveResult {
  if (!Number.isInteger(natural) || natural < 1 || natural > 20) throw new RangeError('O teste contra a morte usa um d20')
  if (natural === 20) return { successes: 0, failures: 0, status: 'conscious', hitPoints: 1 }
  const successes = state.successes + (natural >= 10 ? 1 : 0)
  const failures = state.failures + (natural === 1 ? 2 : natural < 10 ? 1 : 0)
  if (failures >= 3) return { successes, failures: 3, status: 'dead', hitPoints: 0 }
  if (successes >= 3) return { successes: 3, failures, status: 'stable', hitPoints: 0 }
  return { successes, failures, status: 'rolling', hitPoints: 0 }
}

export function damageWhileDying(state: DeathSaves, critical: boolean): DeathSaveResult {
  const failures = Math.min(3, state.failures + (critical ? 2 : 1))
  return { successes: state.successes, failures, status: failures >= 3 ? 'dead' : 'rolling', hitPoints: 0 }
}
