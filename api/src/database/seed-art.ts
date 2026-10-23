function rng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function wav(samples: Float32Array, rate: number): Buffer {
  const data = Buffer.alloc(samples.length)
  samples.forEach((v, i) => (data[i] = Math.max(0, Math.min(255, Math.round(128 + v * 127)))))
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'latin1')
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8, 'latin1')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate, 28)
  header.writeUInt16LE(1, 32)
  header.writeUInt16LE(8, 34)
  header.write('data', 36, 'latin1')
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

export function dripsWav(seconds = 8, rate = 11025): Buffer {
  const random = rng(11)
  const out = new Float32Array(seconds * rate)
  let brown = 0
  for (let i = 0; i < out.length; i++) {
    brown = (brown + (random() * 2 - 1) * 0.02) * 0.995
    const swell = 0.55 + 0.45 * Math.sin((i / rate) * Math.PI * 0.25)
    out[i] = brown * 3.2 * swell
  }
  for (let d = 0; d < seconds * 2; d++) {
    const start = Math.floor(random() * (out.length - rate))
    const pitch = 900 + random() * 900
    for (let j = 0; j < rate * 0.25; j++) {
      const t = j / rate
      out[start + j]! += Math.sin(2 * Math.PI * pitch * t * (1 - t)) * Math.exp(-t * 26) * 0.35
    }
  }
  const fade = rate * 0.4
  for (let i = 0; i < fade; i++) {
    out[i]! *= i / fade
    out[out.length - 1 - i]! *= i / fade
  }
  return wav(out, rate)
}

export function creakWav(seconds = 1.4, rate = 11025): Buffer {
  const random = rng(5)
  const out = new Float32Array(Math.floor(seconds * rate))
  let phase = 0
  for (let i = 0; i < out.length; i++) {
    const t = i / rate
    const f = 110 + 60 * Math.sin(t * 7) + 30 * Math.sin(t * 23)
    phase += f / rate
    const saw = (phase % 1) * 2 - 1
    const env = Math.min(1, t * 8) * Math.exp(-Math.max(0, t - 0.9) * 6)
    out[i] = (saw * 0.45 + (random() * 2 - 1) * 0.08) * env
  }
  return wav(out, rate)
}

export function portraitSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600">
<defs>
<radialGradient id="bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#4b5b52"/><stop offset="1" stop-color="#16231e"/></radialGradient>
<linearGradient id="robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a4a"/><stop offset="1" stop-color="#1b1424"/></linearGradient>
</defs>
<rect width="480" height="600" fill="url(#bg)"/>
<path d="M60 600 C80 430 150 380 240 380 C330 380 400 430 420 600 Z" fill="url(#robe)"/>
<path d="M170 300 C150 210 175 120 240 112 C305 120 330 210 310 300 C295 360 275 392 240 396 C205 392 185 360 170 300 Z" fill="#c9a07a"/>
<path d="M140 330 C120 200 160 70 240 64 C320 70 362 200 340 330 C330 260 318 196 300 170 C280 210 214 214 180 170 C162 196 150 260 140 330 Z" fill="#20171c"/>
<path d="M120 600 C130 470 170 430 240 424 C310 430 350 470 360 600" fill="none" stroke="#d6a446" stroke-width="6"/>
<circle cx="240" cy="470" r="20" fill="none" stroke="#d6a446" stroke-width="5"/>
<path d="M240 452 L240 488 M224 470 L256 470" stroke="#d6a446" stroke-width="5"/>
<ellipse cx="212" cy="262" rx="11" ry="6" fill="#1b1414"/><ellipse cx="268" cy="262" rx="11" ry="6" fill="#1b1414"/>
<path d="M196 244 Q212 236 228 244 M252 244 Q268 236 284 244" stroke="#20171c" stroke-width="4" fill="none"/>
<path d="M240 270 L234 312 L248 312" stroke="#8c6a4f" stroke-width="3" fill="none"/>
<path d="M220 340 Q240 350 260 340" stroke="#7a3d33" stroke-width="4" fill="none"/>
</svg>`
}
