import type { AssetKind, AssetMime } from '@taverna/shared'
import sharp from 'sharp'

const MAX_SIDE: Record<Exclude<AssetKind, 'audio'>, number> = { map: 4096, token: 512, image: 2048 }
const RASTER = new Set<AssetMime>(['image/jpeg', 'image/png', 'image/webp'])

export interface Compressed {
  data: Buffer
  mime: AssetMime
}

export async function compressImage(data: Buffer, mime: AssetMime, kind: AssetKind): Promise<Compressed> {
  if (kind === 'audio' || !RASTER.has(mime)) return { data, mime }
  const max = MAX_SIDE[kind]
  try {
    const image = sharp(data, { limitInputPixels: 16384 * 16384 })
    const meta = await image.metadata()
    if ((meta.pages ?? 1) > 1 || !meta.width || !meta.height) return { data, mime }
    const oversized = meta.width > max || meta.height > max
    const out = await image
      .rotate()
      .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: kind === 'map' ? 82 : 86, alphaQuality: 90, effort: 4 })
      .toBuffer()
    if (oversized || out.length < data.length * 0.9) return { data: out, mime: 'image/webp' }
  } catch {
    return { data, mime }
  }
  return { data, mime }
}
