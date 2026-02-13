import { ACCESS_LABELS, ACCESS_LEVELS, isGameMaster, maxAccess, type AccessLevel, type JournalDto, type MemberDto } from '@taverna/shared'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Dialog, DialogContent, ErrorNote, Select, Token } from '@/components/ui'
import { useJournalMutations } from './hooks'

const LEVELS: { value: AccessLevel; label: string }[] = (['none', 'view', 'edit'] as const).map((value) => ({
  value,
  label: ACCESS_LABELS[value]
}))

interface ShareDialogProps {
  campaignId: string
  page: JournalDto
  members: MemberDto[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ campaignId, page, members, open, onOpenChange }: ShareDialogProps) {
  const { update } = useJournalMutations(campaignId)
  const [defaultAccess, setDefaultAccess] = useState<AccessLevel>(page.defaultAccess)
  const [grants, setGrants] = useState<Record<string, AccessLevel>>(page.grants)

  useEffect(() => {
    if (open) {
      setDefaultAccess(page.defaultAccess)
      setGrants(page.grants)
    }
  }, [open, page])

  const players = members.filter((member) => !isGameMaster(member.role) && member.userId !== page.authorId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Quem vê esta página" description="O autor e os mestres sempre podem ver e editar.">
        <div className="flex flex-col gap-5">
          {update.error && <ErrorNote>{update.error.message}</ErrorNote>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-moss">
            <dt className="font-medium text-bone">Sem acesso</dt>
            <dd>a página nem aparece na lista</dd>
            <dt className="font-medium text-bone">Pode ver</dt>
            <dd>lê, mas não muda nada</dd>
            <dt className="font-medium text-bone">Pode editar</dt>
            <dd>escreve junto com você</dd>
          </dl>
          <div className="flex items-center justify-between gap-4 rounded-control bg-felt-deep px-3 py-2.5">
            <span className="font-medium">Todos os jogadores</span>
            <Select
              label="Acesso de todos os jogadores"
              value={defaultAccess}
              onChange={setDefaultAccess}
              options={LEVELS}
              size="sm"
              className="w-36"
            />
          </div>
          {players.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-moss">Dar mais acesso a alguém</p>
              <ul className="flex flex-col gap-2">
                {players.map((member) => {
                  const effective = maxAccess(defaultAccess, grants[member.userId] ?? 'none')
                  const options = LEVELS.slice(ACCESS_LEVELS.indexOf(defaultAccess))
                  return (
                    <li key={member.userId} className="flex items-center gap-3">
                      <Token name={member.displayName} color={member.color} size="sm" />
                      <span className="min-w-0 flex-1 truncate">{member.displayName}</span>
                      <Select
                        label={`Acesso de ${member.displayName}`}
                        value={effective}
                        onChange={(next) => setGrants((current) => ({ ...current, [member.userId]: next }))}
                        options={options}
                        disabled={options.length === 1}
                        size="sm"
                        className="w-36"
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              loading={update.isPending}
              onClick={() =>
                update.mutate(
                  {
                    id: page.id,
                    access: {
                      defaultAccess,
                      grants: Object.fromEntries(
                        Object.entries(grants).filter(([, level]) => maxAccess(level, defaultAccess) !== defaultAccess)
                      )
                    }
                  },
                  {
                    onSuccess: () => {
                      toast.success('Permissões salvas')
                      onOpenChange(false)
                    }
                  }
                )
              }
            >
              Salvar permissões
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
