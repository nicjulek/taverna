import { registerSystem, type RulesSystem } from '@taverna/rules-core'
import { ABILITIES, SKILLS } from './abilities'
import { criticalDamage, d20, judgeAttack, judgeCheck } from './combat'

export * from './abilities'
export * from './combat'
export * from './hit-points'
export * from './proficiency'
export * from './spellcasting'

export const dnd5e: RulesSystem = registerSystem({
  id: 'dnd5e',
  name: 'D&D 5ª edição',
  abilities: ABILITIES,
  skills: SKILLS,
  check: d20,
  damage: (expression, { critical }) => (critical ? criticalDamage(expression) : expression),
  judge(result, target = {}) {
    if (target.ac !== undefined) return judgeAttack(result, target.ac)
    if (target.dc !== undefined) return judgeCheck(result, target.dc)
    if (result.critical === 'success') return { tone: 'critical', text: '20 natural' }
    if (result.critical === 'failure') return { tone: 'fumble', text: '1 natural' }
    return { tone: 'neutral', text: '' }
  }
})
export * from './classes'
export * from './sheet'
