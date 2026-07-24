import type { SceneDto } from '@taverna/shared'
import { Copy, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Dialog, DialogContent, Field, Input } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useSceneMutations } from './hooks'

interface ScenesPanelProps {
  campaignId: string
  scenes: SceneDto[]
  currentId: string | null
  onPick: (id: string) => void
}

export function ScenesPanel({ campaignId, scenes, currentId, onPick }: ScenesPanelProps) {
  const mutations = useSceneMutations(campaignId)
  const [naming, setNaming] = useState<{ id: string | null; name: string } | null>(null)
  const [confirm, setConfirm] = useState<SceneDto | null>(null)
  const fail = (error: Error) => toast.error(error.message)

  const save = () => {
    if (!naming) return
    const name = naming.name.trim()
    if (!name) return
    if (naming.id) mutations.update.mutate({ id: naming.id, name }, { onError: fail })
    else mutations.create.mutate({ name }, { onSuccess: (scene) => onPick(scene.id), onError: fail })
    setNaming(null)
  }

  return (
    <nav aria-label="Cenas" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Cenas</h2>
        <Button size="sm" variant="secondary" onClick={() => setNaming({ id: null, name: `Cena ${scenes.length + 1}` })}>
          <Plus /> Nova cena
        </Button>
      </div>
      <ul className="flex flex-col gap-1">
        {scenes.map((scene) => (
          <li
            key={scene.id}
            className={cn(
              'group flex items-center gap-1 rounded-control border border-transparent pr-1',
              scene.id === currentId && 'border-line-strong bg-surface-raised'
            )}
          >
            <button
              type="button"
              onClick={() => onPick(scene.id)}
              aria-current={scene.id === currentId ? 'true' : undefined}
              className="flex min-w-0 flex-1 flex-col px-2 py-1.5 text-left"
            >
              <span className="truncate">{scene.name}</span>
              {scene.active && <span className="text-xs text-brass-bright">Os jogadores veem esta</span>}
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label={`Renomear ${scene.name}`}
              onClick={() => setNaming({ id: scene.id, name: scene.name })}
            >
              <Pencil />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label={`Duplicar ${scene.name}`}
              onClick={() => mutations.duplicate.mutate(scene.id, { onError: fail })}
            >
              <Copy />
            </Button>
            <Button size="icon" variant="ghost" className="size-8" aria-label={`Apagar ${scene.name}`} onClick={() => setConfirm(scene)}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      {currentId && !scenes.find((s) => s.id === currentId)?.active && (
        <Button
          onClick={() =>
            mutations.activate.mutate(currentId, { onSuccess: () => toast('Os jogadores agora veem esta cena.'), onError: fail })
          }
        >
          <Eye /> Mostrar aos jogadores
        </Button>
      )}

      <Dialog open={naming !== null} onOpenChange={(open) => !open && setNaming(null)}>
        <DialogContent
          title={naming?.id ? 'Renomear cena' : 'Nova cena'}
          description={naming?.id ? undefined : 'Começa em branco: 30 × 20 quadrados, grade de 1,5 m.'}
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
          >
            <Field label="Nome da cena">
              {(props) => (
                <Input
                  {...props}
                  value={naming?.name ?? ''}
                  maxLength={80}
                  autoFocus
                  onChange={(e) => setNaming((n) => n && { ...n, name: e.target.value })}
                />
              )}
            </Field>
            <Button type="submit" className="self-end">
              {naming?.id ? 'Salvar nome' : 'Criar cena'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent
          title={`Apagar ${confirm?.name ?? 'cena'}?`}
          description="Tudo o que está nela some junto. Os mapas continuam na galeria."
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Manter
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm) mutations.remove.mutate(confirm.id, { onError: fail })
                setConfirm(null)
              }}
            >
              Apagar cena
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  )
}
