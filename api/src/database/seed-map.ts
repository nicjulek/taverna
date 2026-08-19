const CELL = 70
const COLS = 20
const ROWS = 14

function rng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export function mineMapSvg(): string {
  const width = COLS * CELL
  const height = ROWS * CELL
  const random = rng(7)
  const rubble = Array.from({ length: 90 }, () => {
    const x = Math.round(random() * width)
    const y = Math.round(random() * height)
    const r = (2 + random() * 7).toFixed(1)
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a221c" opacity="${(0.35 + random() * 0.4).toFixed(2)}"/>`
  }).join('')
  const tunnel = 'M 70 840 L 385 840 L 385 455 L 805 455 L 805 245 L 1225 245 M 805 455 L 1085 455 L 1085 805 L 1295 805'
  const ties = Array.from({ length: 26 }, (_, i) => {
    const x = 105 + i * 11.6
    return `<rect x="${x.toFixed(1)}" y="828" width="5" height="24" fill="#5b4632"/>`
  }).join('')
  const grid = [
    ...Array.from({ length: COLS + 1 }, (_, i) => `<line x1="${i * CELL}" y1="0" x2="${i * CELL}" y2="${height}"/>`),
    ...Array.from({ length: ROWS + 1 }, (_, i) => `<line x1="0" y1="${i * CELL}" x2="${width}" y2="${i * CELL}"/>`)
  ].join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#9fd6c4" stop-opacity=".55"/><stop offset="1" stop-color="#9fd6c4" stop-opacity="0"/></radialGradient>
<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="18"/></filter>
</defs>
<rect width="${width}" height="${height}" fill="#1c1713"/>
<g filter="url(#rough)" fill="#7b6a55" stroke="#7b6a55" stroke-linejoin="round" stroke-linecap="round">
<path d="${tunnel}" fill="none" stroke-width="150"/>
<rect x="595" y="315" width="420" height="300" rx="60"/>
<rect x="1015" y="105" width="315" height="280" rx="70"/>
<rect x="1015" y="665" width="350" height="250" rx="60"/>
<rect x="35" y="735" width="250" height="210" rx="40"/>
</g>
<g filter="url(#rough)" fill="#8f7d66" opacity=".55"><circle cx="805" cy="465" r="120"/><circle cx="1170" cy="245" r="90"/></g>
${rubble}
<path d="M 105 840 L 385 840 L 385 470" fill="none" stroke="#3b2f24" stroke-width="4"/>
<path d="M 125 840 L 365 840 L 365 470" fill="none" stroke="#3b2f24" stroke-width="4"/>
${ties}
<circle cx="1170" cy="245" r="140" fill="url(#glow)"/>
<g fill="#b7e6d6" stroke="#e8fff6" stroke-width="2"><path d="M1150 260 l14 -42 l12 38 z"/><path d="M1178 268 l10 -30 l12 30 z"/><path d="M1138 270 l8 -22 l9 22 z"/></g>
<g fill="#6b4f33" stroke="#3b2a1b" stroke-width="3"><rect x="660" y="360" width="52" height="52"/><rect x="718" y="368" width="44" height="44"/><rect x="1240" y="720" width="56" height="56"/></g>
<g stroke="#000" stroke-opacity=".28" stroke-width="2">${grid}</g>
</svg>`
}

export const MINE_MAP = { cols: COLS, rows: ROWS, cell: CELL }

const ROOMS = [
  [595, 315, 420, 300],
  [1015, 105, 315, 280],
  [1015, 665, 350, 250],
  [35, 735, 250, 210]
] as const

const TUNNELS = [
  [70, 840, 385, 840],
  [385, 840, 385, 455],
  [385, 455, 805, 455],
  [805, 455, 805, 245],
  [805, 245, 1225, 245],
  [805, 455, 1085, 455],
  [1085, 455, 1085, 805],
  [1085, 805, 1295, 805]
] as const

function nearSegment(x: number, y: number, [ax, ay, bx, by]: readonly number[]): number {
  const dx = bx! - ax!
  const dy = by! - ay!
  const t = Math.max(0, Math.min(1, ((x - ax!) * dx + (y - ay!) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (ax! + dx * t), y - (ay! + dy * t))
}

export function mineWalls(step = 35): number[][] {
  const cols = (COLS * CELL) / step
  const rows = (ROWS * CELL) / step
  const floor = (c: number, r: number) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return false
    const x = (c + 0.5) * step
    const y = (r + 0.5) * step
    return (
      ROOMS.some(([rx, ry, w, h]) => x >= rx && x <= rx + w && y >= ry && y <= ry + h) || TUNNELS.some((s) => nearSegment(x, y, s) <= 75)
    )
  }
  const edges: [number, number, number, number][] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!floor(c, r)) continue
      if (!floor(c, r - 1)) edges.push([c, r, c + 1, r])
      if (!floor(c, r + 1)) edges.push([c, r + 1, c + 1, r + 1])
      if (!floor(c - 1, r)) edges.push([c, r, c, r + 1])
      if (!floor(c + 1, r)) edges.push([c + 1, r, c + 1, r + 1])
    }
  }
  const key = (x: number, y: number) => `${x},${y}`
  const at = new Map<string, number[]>()
  edges.forEach(([ax, ay, bx, by], i) => {
    for (const k of [key(ax, ay), key(bx, by)]) at.set(k, [...(at.get(k) ?? []), i])
  })
  const used = new Set<number>()
  const lines: number[][] = []
  for (let i = 0; i < edges.length; i++) {
    if (used.has(i)) continue
    used.add(i)
    const [ax, ay, bx, by] = edges[i]!
    const path = [ax, ay, bx, by]
    let [x, y] = [bx, by]
    for (;;) {
      const next = (at.get(key(x, y)) ?? []).find((j) => !used.has(j))
      if (next === undefined) break
      used.add(next)
      const [cx, cy, dx, dy] = edges[next]!
      ;[x, y] = cx === x && cy === y ? [dx, dy] : [cx, cy]
      path.push(x, y)
    }
    const simple: number[] = [path[0]!, path[1]!]
    for (let p = 2; p < path.length; p += 2) {
      const n = simple.length
      if (p + 2 < path.length) {
        const [px, py] = [simple[n - 2]!, simple[n - 1]!]
        const [qx, qy] = [path[p]!, path[p + 1]!]
        const [rx, ry] = [path[p + 2]!, path[p + 3]!]
        if ((qx - px) * (ry - qy) === (qy - py) * (rx - qx)) continue
      }
      simple.push(path[p]!, path[p + 1]!)
    }
    lines.push(simple.map((v) => v * step))
  }
  return lines
}
