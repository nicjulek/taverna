import { useId } from 'react'

export function EmptyTable({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 320 210" className={className} aria-hidden>
      <defs>
        <radialGradient id={`et-halo-${uid}`}>
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="190" rx="140" ry="16" fill="#0d1512" opacity="0.45" />
      <g>
        <path d="M44 150 h40 l-4 40 h-6 l-3 -28 h-14 l-3 28 h-6 Z" fill="#4a3020" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="64" cy="148" rx="26" ry="8" fill="#7b5534" stroke="#2b1d12" strokeWidth="3" />
      </g>
      <g>
        <path
          d="M236 150 h40 l-4 40 h-6 l-3 -28 h-14 l-3 28 h-6 Z"
          fill="#4a3020"
          stroke="#2b1d12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse cx="256" cy="148" rx="26" ry="8" fill="#7b5534" stroke="#2b1d12" strokeWidth="3" />
      </g>
      <path d="M150 128 h20 l10 62 h-40 Z" fill="#4a3020" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="160" cy="124" rx="96" ry="24" fill="#5a3b25" stroke="#2b1d12" strokeWidth="3" />
      <ellipse cx="160" cy="118" rx="96" ry="24" fill="#8a6239" stroke="#2b1d12" strokeWidth="3" />
      <path d="M90 116 q70 -18 140 0" fill="none" stroke="#6b4a2e" strokeWidth="2" />
      <circle cx="160" cy="64" r="44" fill={`url(#et-halo-${uid})`} />
      <ellipse cx="160" cy="112" rx="16" ry="5" fill="#b3863a" stroke="#2b1d12" strokeWidth="2.5" />
      <path d="M152 110 V82 q8 -4 16 0 V110 q-8 3 -16 0 Z" fill="#efe6d2" stroke="#2b1d12" strokeWidth="2.5" />
      <path d="M160 80 v-6" stroke="#2b1d12" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M160 74 C 152 66, 154 56, 160 46 C 166 56, 168 66, 160 74 Z" fill="#ffc95e" stroke="#2b1d12" strokeWidth="2" />
      <g transform="translate(120 112) rotate(-12)">
        <rect x="-9" y="-9" width="18" height="18" rx="3.5" fill="#ece4d4" stroke="#2b1d12" strokeWidth="2.5" />
        <circle r="2.6" fill="#b5453a" />
      </g>
      <g transform="translate(204 110)">
        <path d="M0 -14 L12 -7 L12 7 L0 14 L-12 7 L-12 -7 Z" fill="#d6a446" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M0 -14 L-7 3 L7 3 Z" fill="#e8bb5f" stroke="#2b1d12" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
