import { applyDamage, applyHealing, grantTemporary, hitDieRoll, longRest, rollDeathSave, shortRest, spendHitDie } from '@taverna/rules-5e'
import { Heart, Moon, Sunrise } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { hpTone } from '../format'
import { useSheet } from './sheet-context'
import { NumberInput, Panel } from './controls'

export function VitalsPanel() {
  const { sheet, derived, editable, change, roll, rolling } = useSheet()
  const [amount, setAmount] = useState('')
  const { hp } = sheet
  const tone = hpTone(hp.current, hp.max)
  const value = Number.parseInt(amount, 10)
  const valid = Number.isInteger(value) && value > 0

  const apply = (kind: 'damage' | 'heal' | 'temp') => {
    if (!valid) return
    change((s) => {
      if (kind === 'temp') return { ...s, hp: grantTemporary(s.hp, value) }
      if (kind === 'heal') return { ...s, hp: applyHealing(s.hp, value), deathSaves: { successes: 0, failures: 0 } }
      const result = applyDamage(s.hp, value)
      if (result.instantDeath) toast.error('Dano maciço: morte instantânea pelas regras.')
      else if (result.droppedToZero) toast('Caiu a 0 PV. Hora dos testes contra a morte.')
      return { ...s, hp: { current: result.current, max: result.max, temporary: result.temporary } }
    })
    setAmount('')
  }

  const conMod = derived.modifiers.con

  return (
    <Panel title="Vida">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-baseline gap-1" aria-label={`Pontos de vida ${hp.current} de ${hp.max}`}>
          <Heart
            className={cn('size-6 self-center', tone === 'ok' ? 'text-leaf' : tone === 'hurt' ? 'text-brass' : 'text-seal-soft')}
            aria-hidden
          />
          <span className="font-display text-5xl font-bold tabular-nums lining-nums">{hp.current}</span>
          <span className="font-display text-xl text-moss lining-nums">/</span>
          {editable ? (
            <NumberInput
              label="PV máximo"
              value={hp.max}
              min={1}
              max={9999}
              onCommit={(max) => change((s) => ({ ...s, hp: { ...s.hp, max, current: Math.min(s.hp.current, max) } }))}
            />
          ) : (
            <span className="font-display text-xl text-moss lining-nums">{hp.max}</span>
          )}
        </div>
        {hp.temporary > 0 && <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-sm text-leaf">+{hp.temporary} temporários</span>}
      </div>

      {editable && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            apply('damage')
          }}
        >
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Quanto?"
            aria-label="Quantidade de dano ou cura"
            className="h-10 w-24 rounded-control border border-line-strong bg-felt-deep px-3 font-display text-lg lining-nums focus-visible:border-brass focus-visible:outline-none"
          />
          <Button type="submit" variant="danger" disabled={!valid}>
            Dano
          </Button>
          <Button type="button" variant="secondary" disabled={!valid} onClick={() => apply('heal')}>
            Curar
          </Button>
          <Button type="button" variant="ghost" disabled={!valid} onClick={() => apply('temp')}>
            PV temporário
          </Button>
        </form>
      )}

      {hp.current === 0 && (
        <div className="mt-4 rounded-control border border-seal/50 bg-seal/10 p-3">
          <p className="font-medium">Testes contra a morte</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <SaveMarks label="Sucessos" count={sheet.deathSaves.successes} className="bg-leaf border-leaf" />
            <SaveMarks label="Falhas" count={sheet.deathSaves.failures} className="bg-seal border-seal" />
            {editable && (
              <Button
                size="sm"
                variant="secondary"
                disabled={rolling || sheet.deathSaves.failures >= 3 || sheet.deathSaves.successes >= 3}
                onClick={() =>
                  roll('1d20', 'Teste contra a morte', {
                    onResult: (result) => {
                      const natural = result.result.natural ?? result.result.total
                      change((s) => rollDeathSave(s, natural))
                    }
                  })
                }
              >
                Rolar teste
              </Button>
            )}
          </div>
          {sheet.deathSaves.failures >= 3 && <p className="mt-2 text-seal-soft">O personagem morreu.</p>}
          {sheet.deathSaves.successes >= 3 && <p className="mt-2 text-leaf">Estável, mas inconsciente.</p>}
        </div>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-sm text-moss">Dados de vida</p>
        <ul className="flex flex-wrap gap-2">
          {derived.hitDice.map(({ die, total, used }) => (
            <li key={die} className="flex items-center gap-2 rounded-control border border-line px-2 py-1">
              <span className="font-display lining-nums">
                {total - used}/{total} {die}
              </span>
              {editable && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={rolling || used >= total || hp.current >= hp.max}
                  onClick={() =>
                    roll(hitDieRoll(Number(die.slice(1)) as 6 | 8 | 10 | 12, conMod), `Dado de vida (${die})`, {
                      onResult: (result) => change((s) => spendHitDie(s, die, result.result.total))
                    })
                  }
                >
                  Gastar
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {editable && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              change(shortRest)
              toast.success('Descanso curto feito. Recursos de descanso curto voltaram.')
            }}
          >
            <Sunrise /> Descanso curto
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              change(longRest)
              toast.success('Descanso longo feito. PV, magias e recursos voltaram.')
            }}
          >
            <Moon /> Descanso longo
          </Button>
        </div>
      )}
    </Panel>
  )
}

function SaveMarks({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-moss" aria-label={`${label}: ${count} de 3`}>
      {label}
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn('size-3.5 rounded-full border-2 border-line-strong', i < count && className)} aria-hidden />
      ))}
    </span>
  )
}
