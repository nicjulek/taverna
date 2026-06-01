import { sniffMime } from './sniff'

const pad = (bytes: number[] | string) =>
  Buffer.concat([typeof bytes === 'string' ? Buffer.from(bytes, 'latin1') : Buffer.from(bytes), Buffer.alloc(32)])

describe('sniffMime', () => {
  it.each([
    [[0xff, 0xd8, 0xff, 0xe0], 'image/jpeg'],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'],
    ['GIF89a', 'image/gif'],
    ['RIFF\u0000\u0000\u0000\u0000WEBPVP8 ', 'image/webp'],
    [[0x1a, 0x45, 0xdf, 0xa3], 'video/webm'],
    ['\u0000\u0000\u0000\u0018ftypmp42', 'video/mp4'],
    ['<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>', 'image/svg+xml'],
    ['  <svg viewBox="0 0 10 10"></svg>', 'image/svg+xml']
  ])('reconhece pelo conteúdo, não pela extensão', (bytes, mime) => {
    expect(sniffMime(pad(bytes as number[] | string))).toBe(mime)
  })

  it.each([['MZ executável qualquer'], ['<html><script>alert(1)</script></html>'], ['%PDF-1.7 documento']])('recusa %s', (text) => {
    expect(sniffMime(pad(text))).toBeNull()
  })

  it('recusa arquivo curto demais', () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8]))).toBeNull()
  })
})
