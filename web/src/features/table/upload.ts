import { ASSET_MAX_BYTES, ASSET_TYPES, type AssetDto } from '@taverna/shared'
import { toast } from 'sonner'
import { useUploadAsset } from './hooks'

export const ACCEPT = Object.keys(ASSET_TYPES).join(',')

export function readNatural(asset: Pick<AssetDto, 'url' | 'mime'>): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const fallback = { width: 1050, height: 700 }
    if (asset.mime.startsWith('video/')) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => resolve(video.videoWidth ? { width: video.videoWidth, height: video.videoHeight } : fallback)
      video.onerror = () => resolve(fallback)
      video.src = asset.url
      return
    }
    const image = new Image()
    image.onload = () => resolve(image.naturalWidth ? { width: image.naturalWidth, height: image.naturalHeight } : fallback)
    image.onerror = () => resolve(fallback)
    image.src = asset.url
  })
}

export function useUploadFiles(campaignId: string) {
  const upload = useUploadAsset(campaignId)
  const run = async (files: File[]): Promise<AssetDto[]> => {
    const done: AssetDto[] = []
    for (const file of files) {
      if (file.size > ASSET_MAX_BYTES) {
        toast.error(`${file.name} passa de 25 MB.`)
        continue
      }
      try {
        done.push(await upload.mutateAsync(file))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Não deu para enviar ${file.name}.`)
      }
    }
    return done
  }
  return { run, pending: upload.isPending }
}
