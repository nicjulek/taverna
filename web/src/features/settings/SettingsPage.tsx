import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isGameMaster, updateCampaignSchema, type UpdateCampaignInput } from '@taverna/shared'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button, ErrorNote, Field, Input, Textarea } from '@/components/ui'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useSession } from '@/lib/session'
import { useCampaignContext } from '../campaigns/context'
import { useDeleteCampaign, useUpdateCampaign } from '../campaigns/hooks'

export function SettingsPage() {
  const { campaign } = useCampaignContext()
  const canEdit = isGameMaster(campaign.role)
  return (
    <div className="flex max-w-2xl flex-col gap-10">
      {canEdit ? <DetailsForm /> : <ReadOnlyDetails />}
      {campaign.role === 'gm' ? <DeleteSection /> : <LeaveSection />}
    </div>
  )
}

function ReadOnlyDetails() {
  const { campaign } = useCampaignContext()
  return (
    <section>
      <h2 className="text-2xl">Sobre a campanha</h2>
      <p className="mt-2 text-moss">{campaign.description || 'O mestre ainda não escreveu uma descrição.'}</p>
    </section>
  )
}

function DetailsForm() {
  const { campaign } = useCampaignContext()
  const update = useUpdateCampaign(campaign.id)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<UpdateCampaignInput>({
    resolver: zodResolver(updateCampaignSchema),
    values: { name: campaign.name, description: campaign.description }
  })

  return (
    <section>
      <h2 className="text-2xl">Detalhes</h2>
      <form
        className="mt-4 flex flex-col gap-4"
        noValidate
        onSubmit={handleSubmit((values) =>
          update.mutate(values, {
            onSuccess: (saved) => (reset({ name: saved.name, description: saved.description }), toast.success('Alterações salvas'))
          })
        )}
      >
        {update.error && <ErrorNote>{update.error.message}</ErrorNote>}
        <Field label="Nome" error={errors.name?.message}>
          {(props) => <Input {...props} {...register('name')} />}
        </Field>
        <Field label="Sobre a campanha" error={errors.description?.message}>
          {(props) => <Textarea rows={4} {...props} {...register('description')} />}
        </Field>
        <div>
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </section>
  )
}

function DeleteSection() {
  const { campaign } = useCampaignContext()
  const navigate = useNavigate()
  const remove = useDeleteCampaign(campaign.id)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')

  return (
    <section className="rounded-panel border border-seal/40 p-5">
      <h2 className="text-2xl">Apagar campanha</h2>
      <p className="mt-1 mb-4 text-moss">Apaga o diário e tira todos os jogadores da mesa. Não dá para desfazer.</p>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Apagar campanha
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          setTyped('')
        }}
        title="Apagar de vez?"
        description={`Digite o nome da campanha para confirmar: ${campaign.name}`}
        confirmLabel="Apagar campanha"
        danger
        loading={remove.isPending}
        disabled={typed.trim() !== campaign.name}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              toast.success('Campanha apagada')
              void navigate('/campanhas', { replace: true })
            }
          })
        }
      >
        <Field label="Nome da campanha">
          {(props) => <Input value={typed} onChange={(event) => setTyped(event.target.value)} {...props} />}
        </Field>
      </ConfirmDialog>
    </section>
  )
}

function LeaveSection() {
  const { campaign } = useCampaignContext()
  const { data: me } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const leave = useMutation({
    mutationFn: () => api.delete(`/campaigns/${campaign.id}/members/${me?.id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.campaign(campaign.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns })
      toast(`Você saiu de ${campaign.name}`)
      void navigate('/campanhas', { replace: true })
    }
  })

  return (
    <section className="rounded-panel border border-line p-5">
      <h2 className="text-2xl">Sair da campanha</h2>
      <p className="mt-1 mb-4 text-moss">Você deixa de ver a mesa e o diário. Para voltar, vai precisar de um convite novo.</p>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Sair da campanha
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Sair de ${campaign.name}?`}
        description="Suas páginas do diário continuam lá para o mestre."
        confirmLabel="Sair da campanha"
        danger
        loading={leave.isPending}
        onConfirm={() => leave.mutate()}
      />
    </section>
  )
}
