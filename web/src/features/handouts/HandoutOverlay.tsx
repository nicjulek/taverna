import type { HandoutDto } from '@taverna/shared'
import { useState } from 'react'
import { Button, Dialog, DialogContent } from '@/components/ui'
import { useHandoutFeed } from './hooks'
import { HandoutView } from './HandoutView'

export function HandoutOverlay({ campaignId, gm }: { campaignId: string; gm: boolean }) {
  const [queue, setQueue] = useState<HandoutDto[]>([])
  useHandoutFeed(campaignId, (handout) => {
    if (gm) return
    setQueue((current) => [...current.filter((h) => h.id !== handout.id), handout])
  })
  const current = queue[0] ?? null
  const close = () => setQueue((q) => q.slice(1))
  return (
    <Dialog open={current !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent title={current ? 'O mestre mostrou' : ''} className="max-w-2xl">
        {current && (
          <div className="flex flex-col gap-5">
            <HandoutView handout={current} large />
            <Button className="self-end" onClick={close}>
              {queue.length > 1 ? 'Ver a próxima' : 'Guardar'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
