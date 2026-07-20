import type { BackgroundTexture } from '@taverna/shared'

const cache = new Map<string, HTMLCanvasElement>()

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

export function texture(kind: BackgroundTexture, base: string): HTMLCanvasElement | null {
  if (kind === 'none' || typeof document === 'undefined') return null
  const key = `${kind}:${base}`
  const cached = cache.get(key)
  if (cached) return cached
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const rand = seeded(kind.length * 7919)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  if (kind === 'parchment') {
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,240,210' : '60,40,20'},${rand() * 0.06})`
      ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 6, 2 + rand() * 6)
    }
  } else if (kind === 'stone') {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 2
    for (let row = 0; row < 4; row++) {
      const y = row * 32
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
      for (let x = (row % 2) * 32; x < size; x += 64) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + 32)
        ctx.stroke()
      }
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rand() * 0.05})`
      ctx.fillRect(rand() * size, rand() * size, 2, 2)
    }
  } else if (kind === 'wood') {
    for (let x = 0; x < size; x += 32) {
      ctx.fillStyle = `rgba(0,0,0,${0.1 + rand() * 0.15})`
      ctx.fillRect(x, 0, 2, size)
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.08 + rand() * 0.08})`
        ctx.beginPath()
        const gx = x + 4 + rand() * 24
        ctx.moveTo(gx, 0)
        ctx.bezierCurveTo(gx + 4, size / 3, gx - 4, (2 * size) / 3, gx, size)
        ctx.stroke()
      }
    }
  } else if (kind === 'grass') {
    for (let i = 0; i < 700; i++) {
      ctx.strokeStyle = `rgba(${rand() > 0.5 ? '150,200,120' : '20,50,20'},${0.15 + rand() * 0.2})`
      const x = rand() * size
      const y = rand() * size
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rand() - 0.5) * 4, y - 3 - rand() * 5)
      ctx.stroke()
    }
  }
  cache.set(key, canvas)
  return canvas
}
