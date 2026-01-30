import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InvitePreviewDto } from '@taverna/shared'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { Button, EmptyState, ErrorNote, Seal, Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { plural } from '@/lib/format'
import { queryKeys } from '@/lib/queryKeys'

export function InvitePage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    data: invite,
    error,
    isPending
  } = useQuery({ queryKey: queryKeys.invite(code), queryFn: () => api.get<InvitePreviewDto>(`/invites/${code}`) })
  const accept = useMutation({
    mutationFn: () => api.post<{ campaignId: string }>(`/invites/${code}/accept`),
    onSuccess: ({ campaignId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns })
      void navigate(`/campanhas/${campaignId}`, { replace: true })
    }
  })

  if (invite?.alreadyMember) return <Navigate to={`/campanhas/${invite.campaignId}`} replace />

  return (
    <main className="mx-auto grid w-full max-w-xl flex-1 place-items-center px-4 py-12">
      {isPending && <Skeleton className="h-72 w-full" />}
      {error && (
        <EmptyState
          title="Este convite não funciona mais"
          action={
            <Button asChild variant="secondary">
              <Link to="/campanhas">Ir para suas mesas</Link>
            </Button>
          }
        >
          O mestre pode ter gerado um link novo ou desativado o convite. Peça o link atualizado para ele.
        </EmptyState>
      )}
      {invite && (
        <section className="w-full rounded-panel border border-line bg-surface p-8 text-center shadow-raised">
          <Seal name={invite.name} seed={invite.campaignId} size={88} className="mx-auto" />
          <p className="mt-5 text-moss">{invite.gmName} te chamou para jogar</p>
          <h1 className="mt-1 text-4xl">{invite.name}</h1>
          {invite.description && <p className="mx-auto mt-3 max-w-md text-moss">{invite.description}</p>}
          <p className="mt-4 text-sm text-moss-dim">D&D 5ª edição, {plural(invite.members, 'participante', 'participantes')}</p>
          {accept.error && <ErrorNote className="mt-5 text-left">{accept.error.message}</ErrorNote>}
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <Button size="lg" loading={accept.isPending} onClick={() => accept.mutate()}>
              Entrar na campanha
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link to="/campanhas">Agora não</Link>
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}
