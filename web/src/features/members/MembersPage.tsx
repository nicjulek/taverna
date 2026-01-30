import { isGameMaster, ROLE_LABELS, type MemberDto } from '@taverna/shared'
import { UserMinus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge, Button, Select, Token } from '@/components/ui'
import { timeAgo } from '@/lib/format'
import { useSession } from '@/lib/session'
import { useCampaignContext } from '../campaigns/context'
import { useMemberActions } from '../campaigns/hooks'
import { InviteCard } from './InviteCard'

export function MembersPage() {
  const { campaign, online } = useCampaignContext()
  const { data: me } = useSession()
  const { changeRole, remove } = useMemberActions(campaign.id)
  const [removing, setRemoving] = useState<MemberDto | null>(null)
  const onlineIds = new Set(online.map((user) => user.userId))
  const isOwner = campaign.role === 'gm'

  const canRemove = (member: MemberDto) => {
    if (member.role === 'gm' || member.userId === me?.id) return false
    return isOwner || (campaign.role === 'cogm' && member.role === 'player')
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="members-title">
        <h2 id="members-title" className="mb-1 text-2xl">
          Participantes
        </h2>
        <p className="mb-4 text-moss">
          {isOwner ? 'Co-mestres podem convidar, organizar o diário e ver tudo o que você vê.' : 'Quem joga nesta campanha.'}
        </p>
        <ul className="divide-y divide-line rounded-panel border border-line bg-surface/60">
          {campaign.memberList.map((member) => (
            <li key={member.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Token name={member.displayName} color={member.color} online={onlineIds.has(member.userId)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {member.displayName}
                  {member.userId === me?.id && <span className="text-moss"> (você)</span>}
                </p>
                <p className="text-sm text-moss-dim">
                  {onlineIds.has(member.userId) ? 'Na mesa agora' : `Entrou ${timeAgo(member.joinedAt)}`}
                </p>
              </div>
              {isOwner && member.role !== 'gm' ? (
                <Select
                  size="sm"
                  label={`Papel de ${member.displayName}`}
                  value={member.role}
                  options={[
                    { value: 'player', label: ROLE_LABELS.player },
                    { value: 'cogm', label: ROLE_LABELS.cogm }
                  ]}
                  onChange={(role) =>
                    changeRole.mutate(
                      { userId: member.userId, role },
                      { onSuccess: () => toast.success(`${member.displayName} agora é ${ROLE_LABELS[role].toLowerCase()}`) }
                    )
                  }
                  className="w-36"
                />
              ) : (
                <Badge tone={isGameMaster(member.role) ? 'brass' : 'neutral'}>{ROLE_LABELS[member.role]}</Badge>
              )}
              {canRemove(member) && (
                <Button variant="ghost" size="icon" aria-label={`Remover ${member.displayName}`} onClick={() => setRemoving(member)}>
                  <UserMinus />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isGameMaster(campaign.role) && <InviteCard campaign={campaign} />}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remover ${removing?.displayName ?? ''}?`}
        description="A pessoa sai da campanha na hora. Ela pode voltar se receber o convite de novo."
        confirmLabel="Remover da campanha"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.userId, {
            onSuccess: () => {
              toast.success(`${removing.displayName} saiu da campanha`)
              setRemoving(null)
            }
          })
        }
      />
    </div>
  )
}
