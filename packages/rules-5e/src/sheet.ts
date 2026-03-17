import { type Ability, ABILITIES, abilityModifier, type Skill, SKILLS } from './abilities'
import { classDef, classResources, type ResourceReset } from './classes'
import { deathSave, type DeathSaves } from './combat'
import { applyHealing, type HitDie, hitDiceRecoveredOnLongRest } from './hit-points'
import { abilityCheckBonus, passiveScore, proficiencyBonus, savingThrowBonus } from './proficiency'
import {
  type CasterProgression,
  multiclassCasterLevel,
  pactSlots,
  slotsForCasterLevel,
  spellAttackBonus,
  spellSaveDc
} from './spellcasting'

export type SkillProficiency = 'none' | 'proficient' | 'expertise'

export interface SheetClass {
  key: string
  level: number
  caster: CasterProgression
  subclass: string
}

export interface SheetAttack {
  id: string
  name: string
  ability: Ability
  proficient: boolean
  bonus: number
  damage: string
  damageType: string
}

export interface SheetSpell {
  id: string
  name: string
  level: number
  prepared: boolean
  notes: string
}

export interface SheetResource {
  id: string
  name: string
  max: number
  used: number
  reset: ResourceReset
}

export interface Sheet5e {
  race: string
  background: string
  alignment: string
  classes: SheetClass[]
  abilities: Record<Ability, number>
  saves: Ability[]
  skills: Partial<Record<Skill, SkillProficiency>>
  jackOfAllTrades: boolean
  halflingLucky: boolean
  armorClass: number
  speed: number
  initiativeBonus: number
  hp: { current: number; max: number; temporary: number }
  hitDiceUsed: Partial<Record<`d${HitDie}`, number>>
  deathSaves: DeathSaves
  inspiration: boolean
  spellAbility: Ability | null
  slotsUsed: number[]
  pactUsed: number
  concentration: string
  spells: SheetSpell[]
  attacks: SheetAttack[]
  resources: SheetResource[]
  notes: string
}

export function newSheet({ classKey, level = 1, race = '' }: { classKey: string; level?: number; race?: string }): Sheet5e {
  const def = classDef(classKey)
  const abilities: Record<Ability, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  const max = def.hitDie + Math.max(0, level - 1) * (def.hitDie / 2 + 1)
  return {
    race,
    background: '',
    alignment: '',
    classes: [{ key: def.key, level, caster: def.caster, subclass: '' }],
    abilities,
    saves: [...def.saves],
    skills: {},
    jackOfAllTrades: false,
    halflingLucky: false,
    armorClass: 10,
    speed: 9,
    initiativeBonus: 0,
    hp: { current: max, max, temporary: 0 },
    hitDiceUsed: {},
    deathSaves: { successes: 0, failures: 0 },
    inspiration: false,
    spellAbility: def.spellAbility,
    slotsUsed: Array(9).fill(0),
    pactUsed: 0,
    concentration: '',
    spells: [],
    attacks: [],
    resources: classResources(def.key, level, abilities).map((r) => ({ id: r.key, name: r.name, max: r.max, used: 0, reset: r.reset })),
    notes: ''
  }
}

export function totalLevel(sheet: Sheet5e): number {
  return Math.min(
    20,
    Math.max(
      1,
      sheet.classes.reduce((sum, c) => sum + c.level, 0)
    )
  )
}

export interface DerivedSheet {
  level: number
  proficiency: number
  modifiers: Record<Ability, number>
  saves: Record<Ability, number>
  skills: Record<Skill, number>
  passivePerception: number
  initiative: number
  spellDc: number | null
  spellAttack: number | null
  slots: number[]
  pact: { count: number; level: number } | null
  hitDice: { die: `d${HitDie}`; total: number; used: number }[]
  attacks: Record<string, number>
}

export function derive(sheet: Sheet5e): DerivedSheet {
  const level = totalLevel(sheet)
  const proficiency = proficiencyBonus(level)
  const modifiers = Object.fromEntries(ABILITIES.map((a) => [a.key, abilityModifier(sheet.abilities[a.key])])) as Record<Ability, number>
  const saves = Object.fromEntries(
    ABILITIES.map((a) => [a.key, savingThrowBonus(modifiers[a.key], level, sheet.saves.includes(a.key))])
  ) as Record<Ability, number>
  const skills = Object.fromEntries(
    SKILLS.map((s) => [
      s.key,
      abilityCheckBonus({
        modifier: modifiers[s.ability],
        level,
        proficiency: sheet.skills[s.key] ?? 'none',
        jackOfAllTrades: sheet.jackOfAllTrades
      })
    ])
  ) as Record<Skill, number>
  const casterLevel = multiclassCasterLevel(sheet.classes.map((c) => ({ progression: c.caster, level: Math.max(1, c.level) })))
  const warlock = sheet.classes.find((c) => c.caster === 'pact')
  const spellMod = sheet.spellAbility ? modifiers[sheet.spellAbility] : null

  const dice = new Map<`d${HitDie}`, number>()
  for (const c of sheet.classes) {
    const die = `d${classDef(c.key).hitDie}` as const
    dice.set(die, (dice.get(die) ?? 0) + c.level)
  }

  return {
    level,
    proficiency,
    modifiers,
    saves,
    skills,
    passivePerception: passiveScore(skills.perception),
    initiative: modifiers.dex + sheet.initiativeBonus + (sheet.jackOfAllTrades ? Math.floor(proficiency / 2) : 0),
    spellDc: spellMod === null ? null : spellSaveDc(spellMod, level),
    spellAttack: spellMod === null ? null : spellAttackBonus(spellMod, level),
    slots: slotsForCasterLevel(casterLevel),
    pact: warlock ? pactSlots(Math.min(20, Math.max(1, warlock.level))) : null,
    hitDice: [...dice.entries()]
      .sort(([a], [b]) => Number(b.slice(1)) - Number(a.slice(1)))
      .map(([die, total]) => ({ die, total, used: Math.min(total, sheet.hitDiceUsed[die] ?? 0) })),
    attacks: Object.fromEntries(
      sheet.attacks.map((attack) => [attack.id, modifiers[attack.ability] + (attack.proficient ? proficiency : 0) + attack.bonus])
    )
  }
}

export function attackDamage(sheet: Sheet5e, attack: SheetAttack): string {
  const mod = abilityModifier(sheet.abilities[attack.ability])
  if (!attack.damage.trim()) return ''
  return mod === 0 ? attack.damage : `${attack.damage}${mod > 0 ? '+' : ''}${mod}`
}

export function shortRest(sheet: Sheet5e): Sheet5e {
  return {
    ...sheet,
    pactUsed: 0,
    resources: sheet.resources.map((r) => (r.reset === 'short' ? { ...r, used: 0 } : r))
  }
}

export function longRest(sheet: Sheet5e): Sheet5e {
  const derived = derive(sheet)
  let budget = hitDiceRecoveredOnLongRest(derived.level)
  const hitDiceUsed: Sheet5e['hitDiceUsed'] = {}
  for (const { die, used } of derived.hitDice) {
    const back = Math.min(used, budget)
    budget -= back
    if (used - back > 0) hitDiceUsed[die] = used - back
  }
  return {
    ...sheet,
    hp: { ...sheet.hp, current: sheet.hp.max, temporary: 0 },
    hitDiceUsed,
    deathSaves: { successes: 0, failures: 0 },
    slotsUsed: Array(9).fill(0),
    pactUsed: 0,
    concentration: '',
    resources: sheet.resources.map((r) => (r.reset === 'none' ? r : { ...r, used: 0 }))
  }
}

export function spendHitDie(sheet: Sheet5e, die: `d${HitDie}`, rolled: number): Sheet5e {
  const entry = derive(sheet).hitDice.find((d) => d.die === die)
  if (!entry || entry.used >= entry.total) throw new Error('Não sobrou nenhum dado de vida desse tipo')
  const hp = applyHealing(sheet.hp, Math.max(0, rolled))
  return { ...sheet, hp, hitDiceUsed: { ...sheet.hitDiceUsed, [die]: entry.used + 1 } }
}

export function rollDeathSave(sheet: Sheet5e, natural: number): Sheet5e {
  const result = deathSave(sheet.deathSaves, natural)
  if (result.status === 'conscious') return { ...sheet, deathSaves: { successes: 0, failures: 0 }, hp: { ...sheet.hp, current: 1 } }
  return { ...sheet, deathSaves: { successes: result.successes, failures: result.failures } }
}
