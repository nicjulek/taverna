import type { JournalDto, MemberDto } from '@taverna/shared'
import { AccessDialog } from '@/components/ui'
import { useJournalMutations } from './hooks'

interface ShareDialogProps {
  campaignId: string
  page: JournalDto
  members: MemberDto[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ campaignId, page, members, open, onOpenChange }: ShareDialogProps) {
  const { update } = useJournalMutations(campaignId)
  return (
    <AccessDialog
      title="Quem vê esta página"
      description="O autor e os mestres sempre podem ver e editar."
      hidden="a página nem aparece na lista"
      ownerId={page.authorId}
      value={{ defaultAccess: page.defaultAccess, grants: page.grants }}
      members={members}
      open={open}
      onOpenChange={onOpenChange}
      pending={update.isPending}
      error={update.error}
      onSave={(access, done) => update.mutate({ id: page.id, access }, { onSuccess: done })}
    />
  )
}
