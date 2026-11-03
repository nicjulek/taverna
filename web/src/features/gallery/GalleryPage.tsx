import { ASSET_KIND_LABELS, ASSET_KINDS, type AssetDto, type AssetKind, isAudio, isGameMaster } from '@taverna/shared'
import { Film, Images, Music, Pencil, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button, Dialog, DialogContent, EmptyState, Field, Input, Select, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { fileSize, plural } from '@/lib/format'
import { useSession } from '@/lib/session'
import { useCampaignContext } from '../campaigns/context'
import { useAssetMutations, useAssets } from '../table/hooks'
import { ACCEPT, AUDIO_ACCEPT, useUploadFiles, VISUAL_ACCEPT } from '../table/upload'

type Filter = 'all' | AssetKind

const HINTS: Record<AssetKind, string> = {
  map: 'Imagens grandes viram WebP com até 4096 px de lado.',
  token: 'Retratos redondos para os tokens, reduzidos para 512 px.',
  image: 'Retratos e ilustrações para as revelações, com até 2048 px.',
  audio: 'Músicas e efeitos em MP3, OGG, WAV, FLAC ou M4A.'
}

function Preview({ asset }: { asset: AssetDto }) {
  if (isAudio(asset.mime))
    return (
      <div className="flex size-full flex-col items-center justify-center gap-3 p-3">
        <Music className="size-8 text-brass" aria-hidden />
        <audio controls preload="none" src={asset.url} className="w-full" aria-label={`Ouvir ${asset.name}`} />
      </div>
    )
  if (asset.mime.startsWith('video/')) return <Film className="size-8 text-moss" aria-hidden />
  return (
    <img
      src={asset.url}
      alt=""
      loading="lazy"
      className={cn('size-full', asset.kind === 'token' ? 'm-auto size-28 rounded-full object-cover' : 'object-cover')}
    />
  )
}

export function GalleryPage() {
  const { campaign } = useCampaignContext()
  const session = useSession()
  const gm = isGameMaster(campaign.role)
  const assets = useAssets(campaign.id)
  const mutations = useAssetMutations(campaign.id)
  const [filter, setFilter] = useState<Filter>('all')
  const [target, setTarget] = useState<AssetKind>('map')
  const [editing, setEditing] = useState<AssetDto | null>(null)
  const [confirm, setConfirm] = useState<AssetDto | null>(null)
  const [dragging, setDragging] = useState(false)
  const upload = useUploadFiles(campaign.id, target)
  const input = useRef<HTMLInputElement>(null)
  const list = assets.data ?? []
  const shown = filter === 'all' ? list : list.filter((asset) => asset.kind === filter)
  const saved = list.reduce((sum, asset) => sum + Math.max(0, asset.originalSize - asset.size), 0)
  const canEdit = (asset: AssetDto) => gm || asset.uploaderId === session.data?.id

  const send = async (files: File[]) => {
    const sent = await upload.run(files)
    if (sent.length) toast(sent.length === 1 ? `${sent[0]!.name} entrou na galeria.` : `${sent.length} arquivos entraram na galeria.`)
  }

  return (
    <div
      className={cn('flex flex-col gap-5 rounded-panel', dragging && 'outline-2 outline-offset-8 outline-brass outline-dashed')}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        void send(Array.from(event.dataTransfer.files))
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Galeria</h2>
          <p className="text-moss">
            Mapas, tokens, imagens e áudios da campanha.
            {saved > 1024 * 1024 && ` A compressão já economizou ${fileSize(saved)}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="Enviar como"
            value={target}
            onChange={setTarget}
            options={ASSET_KINDS.map((kind) => ({ value: kind, label: ASSET_KIND_LABELS[kind].one }))}
            className="min-w-36"
          />
          <Button onClick={() => input.current?.click()} loading={upload.pending}>
            <Upload /> Enviar arquivos
          </Button>
          <input
            ref={input}
            type="file"
            accept={target === 'audio' ? AUDIO_ACCEPT : target === 'map' ? VISUAL_ACCEPT : ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              void send(files)
            }}
          />
        </div>
      </div>
      <p className="-mt-3 text-sm text-moss-dim">{HINTS[target]} Também dá para arrastar os arquivos para cá.</p>

      <div role="group" aria-label="Filtrar a galeria" className="flex flex-wrap gap-1.5">
        {(['all', ...ASSET_KINDS] as const).map((kind) => {
          const count = kind === 'all' ? list.length : list.filter((asset) => asset.kind === kind).length
          return (
            <Button
              key={kind}
              size="sm"
              variant={filter === kind ? 'secondary' : 'ghost'}
              aria-pressed={filter === kind}
              onClick={() => setFilter(kind)}
            >
              {kind === 'all' ? 'Tudo' : ASSET_KIND_LABELS[kind].many} <span className="text-moss-dim">{count}</span>
            </Button>
          )
        })}
      </div>

      {assets.isPending ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[4/3]" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState art={<Images className="mx-auto size-12 text-brass" aria-hidden />} title="Nada aqui ainda">
          Envie um arquivo ou arraste para esta página.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {shown.map((asset) => (
            <li key={asset.id} className="flex flex-col overflow-hidden rounded-panel border border-line bg-surface/60">
              <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-felt-deep">
                <Preview asset={asset} />
              </div>
              <div className="flex items-start gap-1 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="text-sm text-moss-dim">
                    {ASSET_KIND_LABELS[asset.kind].one}, {fileSize(asset.size)}
                    {asset.originalSize > asset.size && <> (era {fileSize(asset.originalSize)})</>}
                  </p>
                </div>
                {canEdit(asset) && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={`Editar ${asset.name}`}
                      onClick={() => setEditing(asset)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={`Apagar ${asset.name}`}
                      onClick={() => setConfirm(asset)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-moss-dim" role="status">
        {plural(list.length, 'arquivo', 'arquivos')} na campanha, {fileSize(list.reduce((sum, asset) => sum + asset.size, 0))} no total.
      </p>

      <EditAsset
        asset={editing}
        pending={mutations.update.isPending}
        onClose={() => setEditing(null)}
        onSave={(values) =>
          mutations.update.mutate(
            { id: editing!.id, ...values },
            { onSuccess: () => setEditing(null), onError: (error) => toast.error(error.message) }
          )
        }
      />
      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent
          title={`Apagar ${confirm?.name ?? ''}?`}
          description="Some também das cenas, tokens e revelações que usam o arquivo."
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={mutations.remove.isPending}
              onClick={() => mutations.remove.mutate(confirm!.id, { onSuccess: () => setConfirm(null) })}
            >
              <Trash2 /> Apagar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditAsset({
  asset,
  pending,
  onClose,
  onSave
}: {
  asset: AssetDto | null
  pending: boolean
  onClose: () => void
  onSave: (values: { name: string; kind: AssetKind }) => void
}) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AssetKind>('map')
  const [current, setCurrent] = useState<string | null>(null)
  if (asset && asset.id !== current) {
    setCurrent(asset.id)
    setName(asset.name)
    setKind(asset.kind)
  }
  const audio = asset ? isAudio(asset.mime) : false
  return (
    <Dialog open={asset !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Editar arquivo">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim()) onSave({ name: name.trim(), kind })
          }}
        >
          <Field label="Nome">
            {(props) => <Input {...props} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />}
          </Field>
          {!audio && (
            <Select
              label="Tipo"
              value={kind}
              onChange={setKind}
              options={ASSET_KINDS.filter((k) => k !== 'audio').map((k) => ({ value: k, label: ASSET_KIND_LABELS[k].one }))}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} disabled={!name.trim()}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
