import sharp from 'sharp'
import { compressImage } from './compress'

const noise = (width: number, height: number) =>
  sharp(Buffer.from(Array.from({ length: width * height * 3 }, (_, i) => (i * 37 + (i % 7) * 11) % 256)), {
    raw: { width, height, channels: 3 }
  })
    .png()
    .toBuffer()

describe('compressImage', () => {
  it('reduz mapa grande para no máximo 4096 px em WebP', async () => {
    const png = await noise(5000, 300)
    const out = await compressImage(png, 'image/png', 'map')
    expect(out.mime).toBe('image/webp')
    const meta = await sharp(out.data).metadata()
    expect(meta.width).toBe(4096)
  })

  it('token vira 512 px', async () => {
    const png = await noise(1200, 1200)
    const out = await compressImage(png, 'image/png', 'token')
    expect((await sharp(out.data).metadata()).width).toBe(512)
  })

  it('não mexe em SVG, GIF e áudio', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')
    expect((await compressImage(svg, 'image/svg+xml', 'map')).data).toBe(svg)
    const wav = Buffer.from('RIFF')
    expect((await compressImage(wav, 'audio/wav', 'audio')).data).toBe(wav)
  })

  it('devolve o original quando não consegue ler', async () => {
    const broken = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01])
    const out = await compressImage(broken, 'image/jpeg', 'map')
    expect(out.data).toBe(broken)
  })
})
