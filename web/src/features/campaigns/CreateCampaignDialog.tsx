import { zodResolver } from '@hookform/resolvers/zod'
import { createCampaignSchema, type CreateCampaignInput } from '@taverna/shared'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button, Dialog, DialogContent, ErrorNote, Field, Input, Textarea } from '@/components/ui'
import { useCreateCampaign } from './hooks'

export function CreateCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const create = useCreateCampaign()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateCampaignInput>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: { name: '', description: '', system: 'dnd5e' }
  })

  const close = (next: boolean) => {
    if (!next) {
      reset()
      create.reset()
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title="Nova campanha" description="Você será o mestre. Depois é só chamar o grupo com o link de convite.">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) =>
            create.mutate(values, {
              onSuccess: (campaign) => {
                close(false)
                void navigate(`/campanhas/${campaign.id}`)
              }
            })
          )}
        >
          {create.error && <ErrorNote>{create.error.message}</ErrorNote>}
          <Field label="Nome" error={errors.name?.message}>
            {(props) => <Input placeholder="As Minas de Pedraluz" {...props} {...register('name')} />}
          </Field>
          <Field label="Sobre a campanha" error={errors.description?.message} hint="Opcional. Aparece no convite.">
            {(props) => (
              <Textarea rows={3} placeholder="Um grupo de aventureiros chega a Vau-do-Corvo…" {...props} {...register('description')} />
            )}
          </Field>
          <div className="rounded-control border border-line bg-felt-deep px-3 py-2.5">
            <p className="text-sm text-moss">Sistema</p>
            <p className="font-medium">D&D 5ª edição</p>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={create.isPending}>
              Criar campanha
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
