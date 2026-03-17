import type { Ability } from './abilities'
import { abilityModifier } from './abilities'
import type { HitDie } from './hit-points'
import type { CasterProgression } from './spellcasting'

export type ResourceReset = 'short' | 'long' | 'none'

export interface ClassDef {
  key: string
  label: string
  hitDie: HitDie
  caster: CasterProgression
  spellAbility: Ability | null
  saves: [Ability, Ability]
}

export const CLASSES = [
  { key: 'barbarian', label: 'Bárbaro', hitDie: 12, caster: 'none', spellAbility: null, saves: ['str', 'con'] },
  { key: 'bard', label: 'Bardo', hitDie: 8, caster: 'full', spellAbility: 'cha', saves: ['dex', 'cha'] },
  { key: 'warlock', label: 'Bruxo', hitDie: 8, caster: 'pact', spellAbility: 'cha', saves: ['wis', 'cha'] },
  { key: 'cleric', label: 'Clérigo', hitDie: 8, caster: 'full', spellAbility: 'wis', saves: ['wis', 'cha'] },
  { key: 'druid', label: 'Druida', hitDie: 8, caster: 'full', spellAbility: 'wis', saves: ['int', 'wis'] },
  { key: 'sorcerer', label: 'Feiticeiro', hitDie: 6, caster: 'full', spellAbility: 'cha', saves: ['con', 'cha'] },
  { key: 'fighter', label: 'Guerreiro', hitDie: 10, caster: 'none', spellAbility: null, saves: ['str', 'con'] },
  { key: 'rogue', label: 'Ladino', hitDie: 8, caster: 'none', spellAbility: null, saves: ['dex', 'int'] },
  { key: 'wizard', label: 'Mago', hitDie: 6, caster: 'full', spellAbility: 'int', saves: ['int', 'wis'] },
  { key: 'monk', label: 'Monge', hitDie: 8, caster: 'none', spellAbility: null, saves: ['str', 'dex'] },
  { key: 'paladin', label: 'Paladino', hitDie: 10, caster: 'half', spellAbility: 'cha', saves: ['wis', 'cha'] },
  { key: 'ranger', label: 'Patrulheiro', hitDie: 10, caster: 'half', spellAbility: 'wis', saves: ['str', 'dex'] }
] as const satisfies readonly ClassDef[]

export type ClassKey = (typeof CLASSES)[number]['key']

export function classDef(key: string): ClassDef {
  const found = CLASSES.find((c) => c.key === key)
  if (!found) throw new Error(`Classe desconhecida: ${key}`)
  return found
}

export interface ResourcePreset {
  key: string
  name: string
  max: number
  reset: ResourceReset
}

function step(level: number, table: [number, number][]): number {
  let value = 0
  for (const [from, amount] of table) if (level >= from) value = amount
  return value
}

export function classResources(key: string, level: number, scores: Record<Ability, number>): ResourcePreset[] {
  switch (key) {
    case 'barbarian':
      return [
        {
          key: 'rage',
          name: 'Fúria',
          max:
            level >= 20
              ? 99
              : step(level, [
                  [1, 2],
                  [3, 3],
                  [6, 4],
                  [12, 5],
                  [17, 6]
                ]),
          reset: 'long'
        }
      ]
    case 'monk':
      return level >= 2 ? [{ key: 'ki', name: 'Ki', max: level, reset: 'short' }] : []
    case 'sorcerer':
      return level >= 2 ? [{ key: 'sorcery', name: 'Pontos de Feitiçaria', max: level, reset: 'long' }] : []
    case 'bard':
      return [
        {
          key: 'inspiration',
          name: 'Inspiração Bárdica',
          max: Math.max(1, abilityModifier(scores.cha)),
          reset: level >= 5 ? 'short' : 'long'
        }
      ]
    case 'fighter':
      return [
        { key: 'second-wind', name: 'Retomar o Fôlego', max: 1, reset: 'short' },
        ...(level >= 2 ? [{ key: 'action-surge', name: 'Surto de Ação', max: level >= 17 ? 2 : 1, reset: 'short' as const }] : []),
        ...(level >= 3
          ? [
              {
                key: 'superiority',
                name: 'Dados de Superioridade',
                max: step(level, [
                  [3, 4],
                  [7, 5],
                  [15, 6]
                ]),
                reset: 'short' as const
              }
            ]
          : [])
      ]
    case 'cleric':
      return level >= 2
        ? [
            {
              key: 'channel',
              name: 'Canalizar Divindade',
              max: step(level, [
                [2, 1],
                [6, 2],
                [18, 3]
              ]),
              reset: 'short'
            }
          ]
        : []
    case 'paladin':
      return [
        { key: 'lay-on-hands', name: 'Cura pelas Mãos', max: level * 5, reset: 'long' },
        ...(level >= 3 ? [{ key: 'channel', name: 'Canalizar Divindade', max: 1, reset: 'short' as const }] : [])
      ]
    case 'druid':
      return level >= 2 ? [{ key: 'wild-shape', name: 'Forma Selvagem', max: level >= 20 ? 99 : 2, reset: 'short' }] : []
    default:
      return []
  }
}
