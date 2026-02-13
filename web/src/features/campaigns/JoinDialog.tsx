import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Dialog, DialogContent, Field, Input } from '@/components/ui'
import { extractInviteCode } from '@/lib/invite'

export function JoinDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setValue('')
          setError(undefined)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent title="Entrar com convite" description="Cole o link que o mestre te mandou.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            const code = extractInviteCode(value)
            if (!code) {
              setError('Esse link não parece um convite da Taverna.')
              return
            }
            onOpenChange(false)
            void navigate(`/convite/${code}`)
          }}
        >
          <Field label="Link ou código do convite" error={error}>
            {(props) => (
              <Input
                placeholder="https://…/convite/aB3dE9xYz1Qw"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value)
                  setError(undefined)
                }}
                {...props}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              Ver convite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
