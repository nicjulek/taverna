import { CLASSES, type SheetClass } from '@taverna/rules-5e'
import type { CasterProgression } from '@taverna/rules-5e'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { useSheet } from './sheet-context'
import { NumberInput } from './controls'

const CASTER_LABEL: Record<CasterProgression, string> = {
  full: 'Conjurador completo',
  half: 'Meio-conjurador',
  third: 'Um terço (Cavaleiro Arcano, Trapaceiro Arcano)',
  pact: 'Magia de pacto',
  none: 'Não conjura'
}

export function DetailsTab() {
  const { sheet, derived, editable, change } = useSheet()
  const editClass = (index: number, patch: Partial<SheetClass>) =>
    change((s) => ({ ...s, classes: s.classes.map((c, i) => (i === index ? { ...c, ...patch } : c)) }))
  const levelsLeft = 20 - derived.level

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['race', 'Raça', 'Halfling'],
            ['background', 'Antecedente', 'Criminoso'],
            ['alignment', 'Tendência', 'Caótico e bom']
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm text-moss">
            {label}
            <Input
              value={sheet[key]}
              disabled={!editable}
              placeholder={placeholder}
              maxLength={key === 'alignment' ? 40 : 60}
              onChange={(event) => change((s) => ({ ...s, [key]: event.target.value }))}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-moss">
          Deslocamento (m)
          <NumberInput
            label="Deslocamento"
            value={sheet.speed}
            max={60}
            disabled={!editable}
            onCommit={(speed) => change((s) => ({ ...s, speed }))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-moss">
          Bônus de iniciativa
          <NumberInput
            label="Bônus de iniciativa"
            value={sheet.initiativeBonus}
            min={-10}
            max={20}
            disabled={!editable}
            onCommit={(initiativeBonus) => change((s) => ({ ...s, initiativeBonus }))}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-moss">Classes</p>
        <ul className="flex flex-col gap-2">
          {sheet.classes.map((c, index) => (
            <li key={index} className="grid gap-2 rounded-control border border-line p-2 sm:grid-cols-[10rem_5rem_1fr_auto]">
              <Select
                label={`Classe ${index + 1}`}
                value={c.key}
                disabled={!editable}
                onChange={(key) => editClass(index, { key, caster: CLASSES.find((def) => def.key === key)!.caster })}
                options={CLASSES.map((def) => ({ value: def.key, label: def.label }))}
              />
              <NumberInput
                label={`Nível na classe ${index + 1}`}
                value={c.level}
                min={1}
                max={c.level + levelsLeft}
                disabled={!editable}
                className="h-10 w-full"
                onCommit={(level) => editClass(index, { level })}
              />
              <Input
                aria-label={`Subclasse ${index + 1}`}
                placeholder="Subclasse"
                value={c.subclass}
                disabled={!editable}
                maxLength={60}
                onChange={(e) => editClass(index, { subclass: e.target.value })}
              />
              {editable && sheet.classes.length > 1 && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover classe ${index + 1}`}
                  onClick={() => change((s) => ({ ...s, classes: s.classes.filter((_, i) => i !== index) }))}
                >
                  <Trash2 />
                </Button>
              )}
              <div className="sm:col-span-4">
                <Select<CasterProgression>
                  label={`Magia da classe ${index + 1}`}
                  value={c.caster}
                  disabled={!editable}
                  size="sm"
                  onChange={(caster) => editClass(index, { caster })}
                  options={(Object.keys(CASTER_LABEL) as CasterProgression[]).map((value) => ({ value, label: CASTER_LABEL[value] }))}
                />
              </div>
            </li>
          ))}
        </ul>
        {editable && levelsLeft > 0 && (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => change((s) => ({ ...s, classes: [...s.classes, { key: 'fighter', level: 1, caster: 'none', subclass: '' }] }))}
          >
            <Plus /> Multiclasse
          </Button>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-moss">
        Anotações
        <Textarea
          rows={8}
          value={sheet.notes}
          disabled={!editable}
          maxLength={20_000}
          placeholder="Traços de personalidade, equipamento, aliados…"
          onChange={(event) => change((s) => ({ ...s, notes: event.target.value }))}
        />
      </label>
    </div>
  )
}
