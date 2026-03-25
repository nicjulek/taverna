import { zodResolver } from '@hookform/resolvers/zod'
import { CLASSES } from '@taverna/rules-5e'
import { createCharacterSchema, type CreateCharacterInput } from '@taverna/shared'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button, Dialog, DialogContent, ErrorNote, Field, Input, Select } from '@/components/ui'
import { useCharacterMutations } from './hooks'

type ClassKey = CreateCharacterInput['classKey']

export function CreateCharacterDialog({
  campaignId,
  open,
  onOpenChange
}: {
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { create } = useCharacterMutations(campaignId)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateCharacterInput>({
    resolver: zodResolver(createCharacterSchema),
    defaultValues: { name: '', classKey: 'fighter', level: 1, race: '' }
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
      <DialogContent title="Nova ficha" description="Comece pelo básico. Atributos, perícias e magias você preenche na ficha.">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) =>
            create.mutate(values, {
              onSuccess: (character) => {
                close(false)
                void navigate(character.id)
              }
            })
          )}
        >
          {create.error && <ErrorNote>{create.error.message}</ErrorNote>}
          <Field label="Nome do personagem" error={errors.name?.message}>
            {(props) => <Input placeholder="Pip Pés-Leves" {...props} {...register('name')} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-moss">Classe</span>
              <Controller
                control={control}
                name="classKey"
                render={({ field }) => (
                  <Select<ClassKey>
                    label="Classe"
                    value={field.value}
                    onChange={field.onChange}
                    options={CLASSES.map((c) => ({ value: c.key, label: c.label }))}
                  />
                )}
              />
            </div>
            <Field label="Nível" error={errors.level?.message}>
              {(props) => <Input type="number" min={1} max={20} {...props} {...register('level', { valueAsNumber: true })} />}
            </Field>
          </div>
          <Field label="Raça" hint="Opcional">
            {(props) => <Input placeholder="Halfling" {...props} {...register('race')} />}
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={create.isPending}>
              Criar ficha
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
