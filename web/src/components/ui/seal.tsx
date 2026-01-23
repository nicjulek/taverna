import { initials } from '@/lib/format'
import { cn } from '@/lib/cn'

const PALETTE = ['#b5453a', '#8d3b5c', '#3e6f8a', '#6d7b33', '#a0612d', '#5a4f9a', '#2f7d6b', '#9a7a2b']

function sealColor(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]!
}

const EDGE = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2
  const radius = i % 2 === 0 ? 47 : 44.5 + ((i * 7) % 3) * 0.6
  return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`
}).join(' ')

export function Seal({ name, seed, size = 56, className }: { name: string; seed: string; size?: number; className?: string }) {
  const color = sealColor(seed)
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('shrink-0 drop-shadow-[0_3px_4px_rgb(0_0_0/0.45)]', className)}
      aria-hidden
    >
      <polygon points={EDGE} fill={color} />
      <circle cx="50" cy="50" r="35" fill="none" stroke="rgb(0 0 0 / 0.28)" strokeWidth="3" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="1" transform="translate(-0.8 -0.8)" />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Alegreya, serif"
        fontWeight="700"
        fontSize={initials(name).length > 1 ? 30 : 38}
        fill="rgb(0 0 0 / 0.35)"
        transform="translate(0.8 1.2)"
      >
        {initials(name)}
      </text>
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Alegreya, serif"
        fontWeight="700"
        fontSize={initials(name).length > 1 ? 30 : 38}
        fill="#f6e3cf"
      >
        {initials(name)}
      </text>
    </svg>
  )
}
