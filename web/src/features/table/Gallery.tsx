import { type AssetDto, isVisual } from '@taverna/shared'
import { Film, Upload } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { Button, Dialog, DialogContent, EmptyState, Skeleton } from '@/components/ui'
import { useAssets } from './hooks'
import { useUploadFiles, VISUAL_ACCEPT } from './upload'

interface GalleryProps {
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (asset: AssetDto) => void
}

export function Gallery({ campaignId, open, onOpenChange, onPick }: GalleryProps) {
  const assets = useAssets(campaignId)
  const upload = useUploadFiles(campaignId)
  const input = useRef<HTMLInputElement>(null)
  const visual = (assets.data ?? []).filter((asset) => isVisual(asset.mime) && asset.kind !== 'token')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Galeria de mapas"
        description="JPG, PNG, WebP, GIF, SVG, WebM ou MP4 até 25 MB. Escolha um para colocar no centro da tela."
        className="max-w-3xl"
      >
        <input
          ref={input}
          type="file"
          accept={VISUAL_ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ''
            const sent = await upload.run(files)
            if (sent.length) toast(sent.length === 1 ? 'Mapa enviado.' : `${sent.length} mapas enviados.`)
          }}
        />
        <Button variant="secondary" onClick={() => input.current?.click()} disabled={upload.pending} className="mb-4">
          <Upload /> {upload.pending ? 'Enviando…' : 'Enviar arquivos'}
        </Button>
        {assets.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-[4/3]" />
            ))}
          </div>
        ) : !visual.length ? (
          <EmptyState title="A galeria está vazia">Envie um mapa ou arraste o arquivo direto para a mesa.</EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visual.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => onPick(asset)}
                  className="group flex w-full flex-col overflow-hidden rounded-control border border-line text-left hover:border-brass"
                >
                  <span className="grid aspect-[4/3] place-items-center overflow-hidden bg-felt-deep">
                    {asset.mime.startsWith('video/') ? (
                      <Film className="size-8 text-moss" aria-hidden />
                    ) : (
                      <img src={asset.url} alt="" loading="lazy" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="truncate px-2 py-1.5 text-sm">
                    {asset.name}
                    <span className="sr-only">, colocar na cena</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
