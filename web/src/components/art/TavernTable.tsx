import { useId } from 'react'

export function TavernTable({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 640 560" className={className} role="img" aria-label="Mesa de taverna com mapa, vela, dados e caneca">
      <defs>
        <radialGradient id={`tt-glow-${uid}`} cx="0.24" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffcf6b" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#d6a446" stopOpacity="0.08" />
          <stop offset="1" stopColor="#16231e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`tt-wood-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7b5534" />
          <stop offset="1" stopColor="#4a3020" />
        </linearGradient>
        <linearGradient id={`tt-paper-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efe3c6" />
          <stop offset="1" stopColor="#d9c69c" />
        </linearGradient>
        <linearGradient id={`tt-wax-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#efe6d2" />
          <stop offset="1" stopColor="#c9bb9c" />
        </linearGradient>
        <radialGradient id={`tt-halo-${uid}`}>
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`tt-flame-${uid}`} cx="0.5" cy="0.7" r="0.6">
          <stop offset="0" stopColor="#fff4cf" />
          <stop offset="0.5" stopColor="#ffc95e" />
          <stop offset="1" stopColor="#f08a2c" />
        </radialGradient>
        <clipPath id={`tt-table-${uid}`}>
          <path d="M40 150 Q320 112 600 150 L640 560 L0 560 Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#tt-table-${uid})`}>
        <path d="M40 150 Q320 112 600 150 L640 560 L0 560 Z" fill={`url(#tt-wood-${uid})`} />
        <g stroke="#3a2618" strokeWidth="2.5" fill="none" opacity="0.7">
          <path d="M20 232 Q320 196 620 232" />
          <path d="M8 330 Q320 292 632 330" />
          <path d="M0 440 Q320 400 640 440" />
        </g>
        <g stroke="#8f6a45" strokeWidth="1.5" fill="none" opacity="0.5">
          <path d="M90 190 q40 -6 80 2" />
          <path d="M420 280 q50 -8 96 0" />
          <path d="M160 380 q60 -8 120 2" />
          <path d="M470 486 q40 -6 90 4" />
          <ellipse cx="520" cy="372" rx="14" ry="6" />
        </g>
      </g>
      <rect width="640" height="560" fill={`url(#tt-glow-${uid})`} />

      <g transform="rotate(-6 330 330)">
        <path d="M150 230 L470 214 L486 430 L168 452 Z" fill="#0d1512" opacity="0.35" transform="translate(8 10)" />
        <path
          d="M150 230 L470 214 L486 430 L168 452 Z"
          fill={`url(#tt-paper-${uid})`}
          stroke="#2b1d12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M470 214 L486 430 L462 416 Z" fill="#c8b285" stroke="#2b1d12" strokeWidth="2" strokeLinejoin="round" />
        <path d="M188 296 q30 -40 74 -22 q34 14 30 46 q-4 40 -54 40 q-60 0 -50 -64 Z" fill="#c7d3b0" stroke="#7a5c3a" strokeWidth="2" />
        <path
          d="M330 268 q40 -24 80 -4 q30 18 18 56 q-14 44 -66 36 q-50 -8 -50 -44 q0 -30 18 -44 Z"
          fill="#c7d3b0"
          stroke="#7a5c3a"
          strokeWidth="2"
        />
        <g fill="none" stroke="#7a5c3a" strokeWidth="2" strokeLinejoin="round">
          <path d="M352 300 l12 -20 l12 20 M372 302 l10 -16 l10 16 M388 290 l9 -14 l9 14" />
          <path d="M210 318 l8 -9 l8 9 M224 312 l7 -8 l7 8" />
        </g>
        <path
          d="M246 330 C 280 360, 300 300, 340 330 S 390 370, 404 330"
          fill="none"
          stroke="#b5453a"
          strokeWidth="3"
          strokeDasharray="7 7"
          strokeLinecap="round"
        />
        <path d="M396 322 l14 14 M410 322 l-14 14" stroke="#b5453a" strokeWidth="4" strokeLinecap="round" />
        <g transform="translate(220 404)" stroke="#7a5c3a" strokeWidth="2" fill="none">
          <circle r="20" />
          <path d="M0 -28 L5 0 L0 28 L-5 0 Z" fill="#7a5c3a" />
          <path d="M-28 0 L0 -4 L28 0 L0 4 Z" fill="#a98b62" stroke="none" />
        </g>
        <path d="M300 410 h120 M300 422 h90" stroke="#a98b62" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g>
        <path d="M478 418 L604 404 L616 548 L486 560 Z" fill="#0d1512" opacity="0.3" transform="translate(6 8)" />
        <path d="M478 418 L604 404 L616 548 L486 560 Z" fill="#e6dbc2" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <g stroke="#b9a785" strokeWidth="3" strokeLinecap="round">
          <path d="M496 440 l56 -6" />
          <path d="M498 462 l90 -10 M500 480 l90 -10 M502 498 l60 -6 M504 516 l84 -9" />
        </g>
        <circle cx="574" cy="436" r="11" fill="none" stroke="#b5453a" strokeWidth="3" />
      </g>

      <g>
        <ellipse cx="148" cy="246" rx="54" ry="18" fill="#0d1512" opacity="0.35" />
        <ellipse cx="146" cy="236" rx="52" ry="17" fill="#b3863a" stroke="#2b1d12" strokeWidth="3" />
        <ellipse cx="146" cy="232" rx="40" ry="12" fill="#d6a446" />
        <path d="M188 236 q26 -4 26 12 q0 12 -18 8" fill="none" stroke="#2b1d12" strokeWidth="5" strokeLinecap="round" />
        <path d="M188 236 q26 -4 26 12 q0 12 -18 8" fill="none" stroke="#b3863a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M124 228 V120 q0 -8 22 -8 q22 0 22 8 V228 q-22 8 -44 0 Z" fill={`url(#tt-wax-${uid})`} stroke="#2b1d12" strokeWidth="3" />
        <path d="M150 114 q4 14 -2 30 q-4 10 2 20" fill="none" stroke="#e8dcbf" strokeWidth="4" strokeLinecap="round" />
        <path d="M146 112 v-10" stroke="#2b1d12" strokeWidth="3" strokeLinecap="round" />
        <circle cx="146" cy="76" r="70" fill={`url(#tt-halo-${uid})`} />
        <path
          d="M146 104 C 128 92, 132 70, 146 50 C 160 70, 164 92, 146 104 Z"
          fill={`url(#tt-flame-${uid})`}
          stroke="#2b1d12"
          strokeWidth="2.5"
        />
        <path d="M146 98 C 139 90, 141 80, 146 72 C 151 80, 153 90, 146 98 Z" fill="#fff8e1" />
      </g>

      <g>
        <ellipse cx="530" cy="232" rx="56" ry="18" fill="#0d1512" opacity="0.35" />
        <path d="M486 120 h88 v104 q-44 16 -88 0 Z" fill="#6b4a2e" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <g stroke="#2b1d12" strokeWidth="2.5" opacity="0.8">
          <path d="M508 126 v100 M530 126 v104 M552 126 v100" />
        </g>
        <path d="M484 150 h92 M484 198 h92" stroke="#d6a446" strokeWidth="7" />
        <path d="M484 150 h92 M484 198 h92" stroke="#2b1d12" strokeWidth="2" opacity="0.4" transform="translate(0 4)" />
        <path d="M576 140 q44 4 40 40 q-4 30 -40 26" fill="none" stroke="#2b1d12" strokeWidth="13" strokeLinecap="round" />
        <path d="M576 140 q44 4 40 40 q-4 30 -40 26" fill="none" stroke="#6b4a2e" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="530" cy="120" rx="46" ry="13" fill="#f3ead6" stroke="#2b1d12" strokeWidth="3" />
        <path
          d="M486 118 q-6 -22 18 -22 q6 -18 28 -12 q20 -12 32 6 q22 -2 20 22"
          fill="#f3ead6"
          stroke="#2b1d12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M576 124 q8 18 -4 30" fill="none" stroke="#f3ead6" strokeWidth="9" strokeLinecap="round" />
      </g>

      <g transform="translate(372 470) rotate(-8)">
        <ellipse cx="4" cy="54" rx="58" ry="14" fill="#0d1512" opacity="0.4" />
        <path d="M0 -60 L52 -30 L52 30 L0 60 L-52 30 L-52 -30 Z" fill="#9c6d22" stroke="#2b1d12" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M0 -60 L-30 14 L30 14 Z" fill="#e8bb5f" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M-52 -30 L-30 14 L0 -60 Z" fill="#c99434" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M52 -30 L30 14 L0 -60 Z" fill="#d6a446" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M-30 14 L0 60 L30 14 Z" fill="#b8862f" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M-52 30 L-30 14 L0 60 Z M52 30 L30 14 L0 60 Z" fill="#8a5d1c" stroke="#2b1d12" strokeWidth="2.5" strokeLinejoin="round" />
        <path
          d="M-52 -30 L-30 14 L-52 30 Z M52 -30 L30 14 L52 30 Z"
          fill="#a9772a"
          stroke="#2b1d12"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <text x="0" y="1" textAnchor="middle" fontFamily="Alegreya, Georgia, serif" fontWeight="700" fontSize="26" fill="#2b1d12">
          20
        </text>
      </g>

      <g transform="translate(252 492) rotate(14)">
        <rect x="-22" y="-22" width="44" height="44" rx="8" fill="#ece4d4" stroke="#2b1d12" strokeWidth="3" />
        <g fill="#b5453a">
          <circle cx="-10" cy="-10" r="4.5" />
          <circle cx="10" cy="10" r="4.5" />
          <circle cx="0" cy="0" r="4.5" />
        </g>
      </g>
      <g transform="translate(196 520) rotate(-20)">
        <rect x="-19" y="-19" width="38" height="38" rx="7" fill="#b5453a" stroke="#2b1d12" strokeWidth="3" />
        <g fill="#f6e3cf">
          <circle cx="-8" cy="-8" r="4" />
          <circle cx="8" cy="8" r="4" />
          <circle cx="8" cy="-8" r="4" />
          <circle cx="-8" cy="8" r="4" />
        </g>
      </g>
    </svg>
  )
}
