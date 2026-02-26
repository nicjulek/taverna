import type { AbilityDef, SkillDef } from '@taverna/rules-core'

export const ABILITIES = [
  { key: 'str', label: 'Força', short: 'FOR' },
  { key: 'dex', label: 'Destreza', short: 'DES' },
  { key: 'con', label: 'Constituição', short: 'CON' },
  { key: 'int', label: 'Inteligência', short: 'INT' },
  { key: 'wis', label: 'Sabedoria', short: 'SAB' },
  { key: 'cha', label: 'Carisma', short: 'CAR' }
] as const satisfies readonly AbilityDef[]

export type Ability = (typeof ABILITIES)[number]['key']

export const SKILLS = [
  { key: 'acrobatics', label: 'Acrobacia', ability: 'dex' },
  { key: 'animal-handling', label: 'Adestrar Animais', ability: 'wis' },
  { key: 'arcana', label: 'Arcanismo', ability: 'int' },
  { key: 'athletics', label: 'Atletismo', ability: 'str' },
  { key: 'performance', label: 'Atuação', ability: 'cha' },
  { key: 'deception', label: 'Enganação', ability: 'cha' },
  { key: 'stealth', label: 'Furtividade', ability: 'dex' },
  { key: 'history', label: 'História', ability: 'int' },
  { key: 'intimidation', label: 'Intimidação', ability: 'cha' },
  { key: 'insight', label: 'Intuição', ability: 'wis' },
  { key: 'investigation', label: 'Investigação', ability: 'int' },
  { key: 'medicine', label: 'Medicina', ability: 'wis' },
  { key: 'nature', label: 'Natureza', ability: 'int' },
  { key: 'perception', label: 'Percepção', ability: 'wis' },
  { key: 'persuasion', label: 'Persuasão', ability: 'cha' },
  { key: 'sleight-of-hand', label: 'Prestidigitação', ability: 'dex' },
  { key: 'religion', label: 'Religião', ability: 'int' },
  { key: 'survival', label: 'Sobrevivência', ability: 'wis' }
] as const satisfies readonly SkillDef[]

export type Skill = (typeof SKILLS)[number]['key']

export function abilityModifier(score: number): number {
  if (!Number.isInteger(score) || score < 1 || score > 30) throw new RangeError('O valor de atributo vai de 1 a 30')
  return Math.floor((score - 10) / 2)
}

export function carryingCapacity(strength: number, sizeMultiplier = 1): number {
  return strength * 15 * sizeMultiplier
}
