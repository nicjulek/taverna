import { useId } from 'react'

export function DiceCup({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 320 200" className={className} aria-hidden>
      <defs>
        <linearGradient id={`dc-leather-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5733" />
          <stop offset="1" stopColor="#5a3520" />
        </linearGradient>
        <radialGradient id={`dc-glow-${uid}`}>
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="176" rx="146" ry="14" fill="#0d1512" opacity="0.45" />
      <circle cx="214" cy="132" r="56" fill={`url(#dc-glow-${uid})`} />
      <g transform="rotate(-14 104 120)">
        <path
          d="M46 92 L132 76 Q140 120 132 164 L46 148 Q38 120 46 92 Z"
          fill={`url(#dc-leather-${uid})`}
          stroke="#2b1d12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse cx="132" cy="120" rx="12" ry="44" fill="#2a1a10" stroke="#2b1d12" strokeWidth="3" />
        <path d="M58 92 Q52 120 58 150" fill="none" stroke="#b3863a" strokeWidth="3" strokeLinecap="round" />
        <path d="M74 89 Q68 120 74 154" fill="none" stroke="#3d2415" strokeWidth="2" strokeDasharray="4 5" />
        <path d="M112 81 Q106 120 112 160" fill="none" stroke="#3d2415" strokeWidth="2" strokeDasharray="4 5" />
        <path d="M120 80 Q114 120 120 162" fill="none" stroke="#b3863a" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g transform="translate(214 128) rotate(8)">
        <path d="M0 -30 L26 -15 V15 L0 30 L-26 15 V-15 Z" fill="#d6a446" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path d="M0 -16 L15 10 H-15 Z" fill="#e8bb5f" stroke="#2b1d12" strokeWidth="2" strokeLinejoin="round" />
        <path
          d="M0 -30 V-16 M-26 -15 L-15 10 M26 -15 L15 10 M0 30 L-15 10 M0 30 L15 10"
          stroke="#2b1d12"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text x="0" y="5" textAnchor="middle" fontFamily="Alegreya, serif" fontWeight="700" fontSize="13" fill="#2b1d12">
          20
        </text>
      </g>
      <g transform="translate(166 158) rotate(-18)">
        <rect x="-13" y="-13" width="26" height="26" rx="5" fill="#ece4d4" stroke="#2b1d12" strokeWidth="3" />
        <circle cx="-6" cy="-6" r="2.6" fill="#2b1d12" />
        <circle r="2.6" fill="#2b1d12" />
        <circle cx="6" cy="6" r="2.6" fill="#2b1d12" />
      </g>
      <g transform="translate(270 160) rotate(12)">
        <path d="M0 -15 L14 11 H-14 Z" fill="#c5523f" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path d="M0 -15 V11" stroke="#2b1d12" strokeWidth="1.5" opacity="0.6" />
      </g>
      <path
        d="M246 92 q8 -6 16 -2 M252 104 q10 -4 18 2"
        fill="none"
        stroke="#9aab9f"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}
