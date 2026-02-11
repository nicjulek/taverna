import { useMemo } from 'react'

function rng(seed: string) {
  let h = 2166136261
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function ridge(random: () => number, base: number, height: number, roughness: number, width: number): string {
  const steps = 18
  const points: string[] = []
  let y = base - random() * height
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width
    y += (random() - 0.5) * roughness
    y = Math.min(base, Math.max(base - height, y))
    const peak = i % 3 === 1 ? -random() * height * 0.6 : 0
    points.push(`${x.toFixed(1)},${(y + peak).toFixed(1)}`)
  }
  return `M0,200 L${points.join(' L')} L${width},200 Z`
}

function trees(random: () => number, base: number, width: number): string {
  let d = ''
  let x = random() * 40
  while (x < width) {
    const h = 10 + random() * 16
    const w = h * 0.45
    d += `M${x.toFixed(1)},${base} l${w.toFixed(1)},-${h.toFixed(1)} l${w.toFixed(1)},${h.toFixed(1)} Z `
    x += 6 + random() * (random() > 0.7 ? 60 : 14)
  }
  return d
}

export function Landscape({ seed, className }: { seed: string; className?: string }) {
  const art = useMemo(() => {
    const random = rng(seed)
    const width = 1200
    return {
      far: ridge(random, 150, 90, 40, width),
      mid: ridge(random, 170, 70, 30, width),
      near: ridge(random, 190, 40, 18, width),
      trees: trees(random, 196, width),
      moonX: 760 + random() * 260,
      moonY: 34 + random() * 24,
      towerX: 260 + random() * 680,
      stars: Array.from({ length: 26 }, () => [random() * width, random() * 90, random() * 1.3 + 0.4] as const)
    }
  }, [seed])

  return (
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`sky-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#101a16" stopOpacity="0" />
          <stop offset="1" stopColor="#1f2f29" />
        </linearGradient>
      </defs>
      <rect width="1200" height="200" fill={`url(#sky-${seed})`} />
      {art.stars.map(([x, y, r], index) => (
        <circle key={index} cx={x} cy={y} r={r} fill="#ece4d4" opacity={0.25 + (index % 3) * 0.12} />
      ))}
      <circle cx={art.moonX} cy={art.moonY} r="16" fill="#ece4d4" opacity="0.85" />
      <circle cx={art.moonX + 7} cy={art.moonY - 4} r="14" fill="#16231e" opacity="0.85" />
      <path d={art.far} fill="#22362f" />
      <path d={art.mid} fill="#1b2c26" />
      <g transform={`translate(${art.towerX} 0)`} fill="#152420">
        <path d="M0 176 V128 h4 v-6 h4 v6 h4 v-6 h4 v6 h4 V176 Z" />
        <path d="M6 146 h8 v10 h-8 Z" fill="#d6a446" opacity="0.8" />
        <path d="M20 176 V150 h18 V176 Z" />
      </g>
      <path d={art.near} fill="#16231e" />
      <path d={art.trees} fill="#101a16" />
    </svg>
  )
}
