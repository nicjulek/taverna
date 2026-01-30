import { MAX_MEMBERS, type CampaignDto } from '@taverna/shared'
import { Check, Copy, Link2Off, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { inviteUrl } from '@/lib/invite'
import { useCopy } from '@/lib/useCopy'
import { useMemberActions } from '../campaigns/hooks'

export function InviteCard({ campaign }: { campaign: CampaignDto }) {
  const { regenerateInvite, disableInvite } = useMemberActions(campaign.id)
  const { copied, copy } = useCopy()
  const link = campaign.inviteCode ? inviteUrl(campaign.inviteCode) : null
  const full = campaign.members >= MAX_MEMBERS

  return (
    <aside className="h-fit rounded-panel border border-line bg-surface p-5 shadow-raised" aria-labelledby="invite-title">
      <h2 id="invite-title" className="text-2xl">
        Convite
      </h2>
      {link ? (
        <>
          <p className="mt-1 mb-4 text-moss">Mande este link para o grupo. Quem abrir entra como jogador.</p>
          <div className="flex items-center gap-2 rounded-control border border-line bg-felt-deep p-1 pl-3">
            <span className="min-w-0 flex-1 truncate text-sm" title={link}>
              {link}
            </span>
            <Button
              size="sm"
              onClick={async () => {
                if (!(await copy(link))) toast.error('Não deu para copiar. Selecione o link e copie à mão.')
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          {full && <p className="mt-3 text-sm text-seal-soft">A mesa chegou ao limite de {MAX_MEMBERS} participantes.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={regenerateInvite.isPending}
              onClick={() =>
                regenerateInvite.mutate(undefined, { onSuccess: () => toast.success('Link novo gerado. O antigo parou de funcionar.') })
              }
            >
              <RefreshCw /> Gerar outro link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={disableInvite.isPending}
              onClick={() => disableInvite.mutate(undefined, { onSuccess: () => toast('Convite desativado') })}
            >
              <Link2Off /> Desativar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 mb-4 text-moss">O convite está desativado. Ninguém novo consegue entrar.</p>
          <Button loading={regenerateInvite.isPending} onClick={() => regenerateInvite.mutate()}>
            Criar link de convite
          </Button>
        </>
      )}
    </aside>
  )
}
