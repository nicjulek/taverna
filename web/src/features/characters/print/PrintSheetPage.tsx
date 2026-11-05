import { ABILITIES, attackDamage, derive, type Sheet5e, SKILLS } from '@taverna/rules-5e'
import { Printer } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { Button, ErrorNote, Skeleton } from '@/components/ui'
import { useCampaign } from '../../campaigns/hooks'
import { classLine, signed } from '../format'
import { useCharacter } from '../hooks'
import './print.css'

const SPELL_LEVELS = [
  'Truques',
  '1º círculo',
  '2º círculo',
  '3º círculo',
  '4º círculo',
  '5º círculo',
  '6º círculo',
  '7º círculo',
  '8º círculo',
  '9º círculo'
]

function Mark({ level }: { level: 'none' | 'proficient' | 'expertise' }) {
  const label = level === 'expertise' ? 'especialista' : level === 'proficient' ? 'proficiente' : 'sem proficiência'
  return <span className={`mark mark-${level}`} role="img" aria-label={label} />
}

function Box({ label, value, small }: { label: string; value: string | number; small?: string }) {
  return (
    <div className="box">
      <span className="box-value">{value}</span>
      <span className="box-label">{label}</span>
      {small && <span className="box-small">{small}</span>}
    </div>
  )
}

function Sheet({ name, sheet, campaign }: { name: string; sheet: Sheet5e; campaign?: string }) {
  const d = derive(sheet)
  const spells = SPELL_LEVELS.map((label, level) => ({ label, level, list: sheet.spells.filter((s) => s.level === level) })).filter(
    (group) => group.list.length > 0 || (group.level > 0 && (d.slots[group.level - 1] ?? 0) > 0)
  )
  return (
    <article className="sheet" aria-label={`Ficha de ${name}`}>
      <header className="sheet-head">
        <div>
          <h1>{name}</h1>
          <p>
            {classLine(sheet.race, sheet.classes)}, nível {d.level}
          </p>
          <p className="muted">{[sheet.background, sheet.alignment].filter(Boolean).join(', ')}</p>
        </div>
        {campaign && <p className="campaign">{campaign}</p>}
      </header>

      <section className="vitals" aria-label="Combate">
        <Box label="Classe de armadura" value={sheet.armorClass} />
        <Box label="Iniciativa" value={signed(d.initiative)} />
        <Box label="Deslocamento" value={`${sheet.speed} m`} />
        <Box
          label="Pontos de vida"
          value={`${sheet.hp.current} / ${sheet.hp.max}`}
          small={sheet.hp.temporary ? `+${sheet.hp.temporary} temporários` : undefined}
        />
        <Box label="Proficiência" value={signed(d.proficiency)} />
        <Box label="Percepção passiva" value={d.passivePerception} />
        <Box label="Dados de vida" value={d.hitDice.map((h) => `${h.total - h.used}${h.die}`).join(' + ') || '—'} />
      </section>

      <div className="columns">
        <section aria-label="Atributos e salvaguardas">
          <h2>Atributos</h2>
          <ul className="abilities">
            {ABILITIES.map((ability) => (
              <li key={ability.key}>
                <span className="ability-name">{ability.label}</span>
                <span className="ability-mod">{signed(d.modifiers[ability.key])}</span>
                <span className="ability-score">{sheet.abilities[ability.key]}</span>
              </li>
            ))}
          </ul>
          <h2>Salvaguardas</h2>
          <ul className="lines">
            {ABILITIES.map((ability) => (
              <li key={ability.key}>
                <Mark level={sheet.saves.includes(ability.key) ? 'proficient' : 'none'} />
                <span className="grow">{ability.label}</span>
                <span>{signed(d.saves[ability.key])}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Perícias">
          <h2>Perícias</h2>
          <ul className="lines">
            {SKILLS.map((skill) => (
              <li key={skill.key}>
                <Mark level={sheet.skills[skill.key] ?? 'none'} />
                <span className="grow">
                  {skill.label} <span className="muted">({ABILITIES.find((a) => a.key === skill.ability)!.short})</span>
                </span>
                <span>{signed(d.skills[skill.key])}</span>
              </li>
            ))}
          </ul>
          <p className="legend">
            <Mark level="proficient" /> proficiente <Mark level="expertise" /> especialista
          </p>
        </section>

        <section aria-label="Ataques e recursos">
          <h2>Ataques</h2>
          {sheet.attacks.length === 0 ? (
            <p className="muted">Nenhum ataque anotado.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Acerto</th>
                  <th scope="col">Dano</th>
                </tr>
              </thead>
              <tbody>
                {sheet.attacks.map((attack) => (
                  <tr key={attack.id}>
                    <td>{attack.name}</td>
                    <td>{signed(d.attacks[attack.id] ?? 0)}</td>
                    <td>
                      {attackDamage(sheet, attack)} {attack.damageType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {sheet.resources.length > 0 && (
            <>
              <h2>Recursos</h2>
              <ul className="lines">
                {sheet.resources.map((resource) => (
                  <li key={resource.id}>
                    <span className="grow">{resource.name}</span>
                    <span className="pips" aria-label={`${resource.max - resource.used} de ${resource.max}`}>
                      {Array.from({ length: Math.min(resource.max, 20) }, (_, i) => (
                        <span key={i} className={i < resource.max - resource.used ? 'pip on' : 'pip'} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {(d.spellDc !== null || sheet.spells.length > 0) && (
        <section className="spells" aria-label="Magias">
          <h2>
            Magias
            {d.spellDc !== null && (
              <span className="muted">
                {' '}
                CD {d.spellDc}, ataque {signed(d.spellAttack ?? 0)}
                {d.pact && `, pacto: ${d.pact.count} espaços de ${d.pact.level}º círculo`}
              </span>
            )}
          </h2>
          <div className="spell-grid">
            {spells.map((group) => (
              <div key={group.level}>
                <h3>
                  {group.label}
                  {group.level > 0 && (d.slots[group.level - 1] ?? 0) > 0 && (
                    <span className="muted"> ({d.slots[group.level - 1]} espaços)</span>
                  )}
                </h3>
                <ul>
                  {group.list.map((spell) => (
                    <li key={spell.id}>
                      {group.level > 0 && <Mark level={spell.prepared ? 'proficient' : 'none'} />} {spell.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {sheet.notes.trim() && (
        <section className="notes" aria-label="Anotações">
          <h2>Anotações</h2>
          <p>{sheet.notes}</p>
        </section>
      )}
      <footer className="muted">Feita na Taverna</footer>
    </article>
  )
}

export function PrintSheetPage() {
  const { campaignId = '', characterId = '' } = useParams()
  const character = useCharacter(campaignId, characterId)
  const campaign = useCampaign(campaignId)
  const ready = Boolean(character.data)

  useEffect(() => {
    if (!character.data) return
    document.title = `${character.data.name}, ficha`
    if (new URLSearchParams(window.location.search).has('imprimir'))
      void document.fonts.ready.then(() => window.setTimeout(() => window.print(), 300))
  }, [ready, character.data])

  return (
    <div className="print-page">
      <div className="print-bar">
        <Link to={`/campanhas/${campaignId}/fichas/${characterId}`} className="text-brass-bright underline-offset-4 hover:underline">
          Voltar para a ficha
        </Link>
        <Button onClick={() => window.print()} disabled={!ready}>
          <Printer /> Imprimir ou salvar em PDF
        </Button>
      </div>
      {character.error && <ErrorNote>{character.error.message}</ErrorNote>}
      {character.isPending && <Skeleton className="mx-auto h-[60rem] w-[210mm]" />}
      {character.data && <Sheet name={character.data.name} sheet={character.data.sheet} campaign={campaign.data?.name} />}
    </div>
  )
}
