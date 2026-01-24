import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserDto } from '@taverna/shared'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Dialog, DialogContent, ErrorNote, Field, Input, Token } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { queryKeys } from '@/lib/queryKeys'

const COLORS = ['#c58b3a', '#4f8a8b', '#a3516b', '#6b7f3a', '#5b6ab0', '#b0663a', '#7d5ba6', '#3f8f6a']

export function ProfileDialog({ open, onOpenChange, user }: { open: boolean; onOpenChange: (open: boolean) => void; user: UserDto }) {
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [color, setColor] = useState(user.color)

  useEffect(() => {
    if (open) {
      setDisplayName(user.displayName)
      setColor(user.color)
    }
  }, [open, user])

  const save = useMutation({
    mutationFn: () => api.patch<UserDto>('/auth/me', { displayName, color }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns })
      toast.success('Perfil salvo')
      onOpenChange(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Seu perfil" description="Seu nome e sua cor aparecem para todos nas mesas em que você joga.">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate()
          }}
        >
          {save.error && <ErrorNote>{save.error.message}</ErrorNote>}
          <Field label="Nome na mesa">
            {(props) => <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} {...props} />}
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-moss">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  className={cn(
                    'grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-surface',
                    color === option && 'ring-2 ring-bone'
                  )}
                  style={{ background: option }}
                  aria-label={`Cor ${option}`}
                  aria-pressed={color === option}
                >
                  {color === option && <Check className="size-4 text-felt-deep" />}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-3 rounded-control bg-felt-deep px-3 py-2">
            <Token name={displayName || '?'} color={color} />
            <span className="text-moss">Assim você aparece para o grupo</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending} disabled={displayName.trim().length < 2}>
              Salvar perfil
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
