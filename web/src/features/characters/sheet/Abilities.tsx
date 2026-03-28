import { ABILITIES, type Ability, SKILLS, type SkillProficiency } from '@taverna/rules-5e'
import { cn } from '@/lib/cn'
import { signed } from '../format'
import { useSheet } from './sheet-context'
import { CheckButton, NumberInput, Panel, Toggle } from './controls'

export function AbilitiesPanel() {
  const { sheet, derived, editable, change } = useSheet()
  const toggleSave = (key: Ability) =>
    change((s) => ({ ...s, saves: s.saves.includes(key) ? s.saves.filter((a) => a !== key) : [...s.saves, key] }))

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Atributos">
        <ul className="grid grid-cols-3 gap-2 lg:grid-cols-2">
          {ABILITIES.map((ability) => (
            <li key={ability.key} className="flex flex-col items-center gap-1 rounded-control border border-line bg-felt-deep/60 p-2">
              <abbr title={ability.label} className="text-xs font-medium tracking-wide text-moss no-underline">
                {ability.short}
              </abbr>
              <CheckButton bonus={derived.modifiers[ability.key]} label={`Teste de ${ability.label}`} size="lg" />
              {editable ? (
                <NumberInput
                  label={`Valor de ${ability.label}`}
                  value={sheet.abilities[ability.key]}
                  min={1}
                  max={30}
                  className="h-7 w-12 text-base"
                  onCommit={(value) => change((s) => ({ ...s, abilities: { ...s.abilities, [ability.key]: value } }))}
                />
              ) : (
                <span className="font-display text-moss lining-nums">{sheet.abilities[ability.key]}</span>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Salvaguardas">
        <ul className="flex flex-col gap-1">
          {ABILITIES.map((ability) => {
            const proficient = sheet.saves.includes(ability.key)
            return (
              <li key={ability.key} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!editable}
                  aria-pressed={proficient}
                  aria-label={`Proficiente em salvaguarda de ${ability.label}`}
                  onClick={() => toggleSave(ability.key)}
                  className={cn('size-4 shrink-0 rounded-full border-2', proficient ? 'border-brass bg-brass' : 'border-line-strong')}
                />
                <span className="flex-1">{ability.label}</span>
                <CheckButton bonus={derived.saves[ability.key]} label={`Salvaguarda de ${ability.label}`} />
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}

const NEXT: Record<SkillProficiency, SkillProficiency> = { none: 'proficient', proficient: 'expertise', expertise: 'none' }
const PROFICIENCY_LABEL: Record<SkillProficiency, string> = {
  none: 'sem proficiência',
  proficient: 'proficiente',
  expertise: 'especialista'
}

export function SkillsPanel() {
  const { sheet, derived, editable, change } = useSheet()
  return (
    <Panel title="Perícias">
      <ul className="flex flex-col gap-0.5">
        {SKILLS.map((skill) => {
          const level = sheet.skills[skill.key] ?? 'none'
          const short = ABILITIES.find((a) => a.key === skill.ability)!.short
          return (
            <li key={skill.key} className="flex items-center gap-2 py-0.5">
              <button
                type="button"
                disabled={!editable}
                onClick={() => change((s) => ({ ...s, skills: { ...s.skills, [skill.key]: NEXT[level] } }))}
                aria-label={`${skill.label}: ${PROFICIENCY_LABEL[level]}. Trocar`}
                title={PROFICIENCY_LABEL[level]}
                className="grid size-6 shrink-0 place-items-center pointer-coarse:size-9"
              >
                <span
                  className={cn(
                    'size-4 rounded-full border-2',
                    level === 'none' && 'border-line-strong',
                    level === 'proficient' && 'border-brass bg-brass',
                    level === 'expertise' && 'border-brass-bright bg-brass ring-2 ring-brass/40 ring-offset-2 ring-offset-surface'
                  )}
                />
              </button>
              <span className={cn('flex-1', level === 'none' ? 'text-moss' : 'text-bone')}>
                {skill.label} <span className="text-xs text-moss-dim">{short}</span>
              </span>
              <CheckButton bonus={derived.skills[skill.key]} label={skill.label} />
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-sm text-moss">Percepção passiva {derived.passivePerception}</p>
        <Toggle
          label={`Pau para toda obra (${signed(Math.floor(derived.proficiency / 2))} onde não há proficiência)`}
          checked={sheet.jackOfAllTrades}
          disabled={!editable}
          onChange={(jackOfAllTrades) => change((s) => ({ ...s, jackOfAllTrades }))}
        />
        <Toggle
          label="Sortudo (rerrola 1 natural no d20)"
          checked={sheet.halflingLucky}
          disabled={!editable}
          onChange={(halflingLucky) => change((s) => ({ ...s, halflingLucky }))}
        />
      </div>
    </Panel>
  )
}
