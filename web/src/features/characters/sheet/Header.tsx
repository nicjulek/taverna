import type { RollMode } from '@taverna/rules-core'
import { isGameMaster } from '@taverna/shared'
import { Check, Cloud, LoaderCircle, MoreHorizontal, Star, TriangleAlert } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  AccessDialog,
  Button,
  Dialog,
  DialogContent,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
  Seal
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { useSession } from '@/lib/session'
import { useCampaignContext } from '../../campaigns/context'
import { classLine, signed } from '../format'
import { useCharacterMutations } from '../hooks'
import { useSheet } from './sheet-context'
import { CheckButton, NumberInput } from './controls'

const MODES: { value: RollMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'advantage', label: 'Vantagem' },
  { value: 'disadvantage', label: 'Desvantagem' }
]

const STATUS = {
  saved: { icon: Check, text: 'Tudo salvo' },
  pending: { icon: Cloud, text: 'Alterações não salvas' },
  saving: { icon: LoaderCircle, text: 'Salvando…' },
  error: { icon: TriangleAlert, text: 'Não salvou. Tentando de novo na próxima mudança.' }
}

export function SheetHeader() {
  const { campaign } = useCampaignContext()
  const { campaignId, character, name, sheet, derived, editable, status, mode, setMode, rename, change } = useSheet()
  const { update, remove } = useCharacterMutations(campaignId)
  const navigate = useNavigate()
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { data: me } = useSession()
  const canManage = isGameMaster(campaign.role) || character.ownerId === me?.id
  const owner = character.ownerId
  const Status = STATUS[status]

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <Seal name={name || character.name} seed={character.id} size={64} />
        <div className="min-w-0 flex-1">
          {editable ? (
            <input
              value={name}
              onChange={(event) => rename(event.target.value)}
              aria-label="Nome do personagem"
              maxLength={60}
              className="w-full rounded-control border border-transparent bg-transparent px-1 font-display text-3xl hover:border-line focus-visible:border-brass focus-visible:outline-none sm:text-4xl"
            />
          ) : (
            <h2 className="px-1 text-3xl sm:text-4xl">{name}</h2>
          )}
          <p className="px-1 text-moss">
            {classLine(sheet.race, sheet.classes)} · nível {derived.level}
          </p>
        </div>
        <div className="flex items-center gap-2 max-sm:order-last max-sm:w-full max-sm:justify-between">
          {editable && (
            <span className="flex items-center gap-1.5 text-sm text-moss-dim" role="status">
              <Status.icon
                className={cn('size-4', status === 'saving' && 'animate-spin', status === 'error' && 'text-seal-soft')}
                aria-hidden
              />
              {Status.text}
            </span>
          )}
          {canManage && (
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mais opções da ficha">
                  <MoreHorizontal />
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem onSelect={() => setSharing(true)}>Quem vê esta ficha</DropdownItem>
                <DropdownSeparator />
                <DropdownItem danger onSelect={() => setDeleting(true)}>
                  Apagar ficha
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        <Stat label="Classe de armadura">
          {editable ? (
            <NumberInput
              label="Classe de armadura"
              value={sheet.armorClass}
              max={40}
              onCommit={(armorClass) => change((s) => ({ ...s, armorClass }))}
            />
          ) : (
            <span className="font-display text-xl lining-nums">{sheet.armorClass}</span>
          )}
        </Stat>
        <Stat label="Iniciativa">
          <CheckButton bonus={derived.initiative} label="Iniciativa" />
        </Stat>
        <Stat label="Deslocamento">
          <span className="font-display text-xl lining-nums">{sheet.speed} m</span>
        </Stat>
        <Stat label="Proficiência">
          <span className="font-display text-xl lining-nums">{signed(derived.proficiency)}</span>
        </Stat>
        <Stat label="Percepção passiva">
          <span className="font-display text-xl lining-nums">{derived.passivePerception}</span>
        </Stat>
        <button
          type="button"
          disabled={!editable}
          aria-pressed={sheet.inspiration}
          onClick={() => change((s) => ({ ...s, inspiration: !s.inspiration }))}
          className={cn(
            'flex flex-col items-center justify-center gap-1 rounded-control border px-3 py-1.5 text-xs',
            sheet.inspiration ? 'border-brass bg-brass/15 text-brass-bright' : 'border-line text-moss'
          )}
        >
          <Star className={cn('size-5', sheet.inspiration && 'fill-current')} aria-hidden />
          Inspiração
        </button>
        {editable && (
          <div className="ml-auto flex flex-col justify-center gap-1">
            <span className="text-xs text-moss" id="modo-ficha">
              Próximo teste
            </span>
            <div className="flex rounded-control border border-line-strong p-0.5" role="group" aria-labelledby="modo-ficha">
              {MODES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    'rounded-[0.35rem] px-2.5 py-1 text-sm pointer-coarse:py-2',
                    mode === value
                      ? value === 'advantage'
                        ? 'bg-leaf/20 text-bone'
                        : value === 'disadvantage'
                          ? 'bg-seal/25 text-bone'
                          : 'bg-surface-raised text-bone'
                      : 'text-moss hover:text-bone'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AccessDialog
        title="Quem vê esta ficha"
        description="O dono e os mestres sempre podem ver e editar."
        hidden="a ficha nem aparece na lista"
        ownerId={owner}
        value={{ defaultAccess: character.defaultAccess, grants: character.grants }}
        members={campaign.memberList}
        open={sharing}
        onOpenChange={setSharing}
        pending={update.isPending}
        error={update.error}
        onSave={(access, done) => update.mutate({ id: character.id, version: character.version, access }, { onSuccess: done })}
      />
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent title={`Apagar ${name}?`} description="A ficha some para todo mundo. Não dá para desfazer.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => remove.mutate(character.id, { onSuccess: () => void navigate(`/campanhas/${campaignId}/fichas`) })}
            >
              Apagar ficha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-24 flex-col items-center justify-center gap-0.5 rounded-control border border-line bg-felt-deep/60 px-3 py-1.5">
      {children}
      <span className="text-xs text-moss">{label}</span>
    </div>
  )
}
