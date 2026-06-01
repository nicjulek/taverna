import type { AssetMime } from '@taverna/shared'

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) => bytes.every((byte, i) => buffer[offset + i] === byte)
const ascii = (buffer: Buffer, start: number, end: number) => buffer.subarray(start, end).toString('latin1')

export function sniffMime(buffer: Buffer): AssetMime | null {
  if (buffer.length < 12) return null
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (ascii(buffer, 0, 6) === 'GIF87a' || ascii(buffer, 0, 6) === 'GIF89a') return 'image/gif'
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') return 'image/webp'
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm'
  if (ascii(buffer, 4, 8) === 'ftyp') return 'video/mp4'
  const head = buffer
    .subarray(0, 1024)
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart()
  if (
    (head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!--')) &&
    /<svg[\s>]/i.test(buffer.subarray(0, 4096).toString('utf8'))
  )
    return 'image/svg+xml'
  return null
}
