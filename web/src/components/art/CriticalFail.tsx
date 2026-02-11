export function CriticalFail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 220" className={className} aria-hidden>
      <ellipse cx="124" cy="196" rx="84" ry="14" fill="#0d1512" opacity="0.5" />
      <g transform="translate(120 112) rotate(14)">
        <path d="M0 -80 L70 -40 L70 40 L0 80 L-70 40 L-70 -40 Z" fill="#7d2f28" stroke="#2b1d12" strokeWidth="4" strokeLinejoin="round" />
        <path d="M0 -80 L-40 18 L40 18 Z" fill="#c5523f" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path d="M-70 -40 L-40 18 L0 -80 Z" fill="#a8443a" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path d="M70 -40 L40 18 L0 -80 Z" fill="#b5453a" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path d="M-40 18 L0 80 L40 18 Z" fill="#963c33" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path d="M-70 40 L-40 18 L0 80 Z M70 40 L40 18 L0 80 Z" fill="#6e2a24" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path
          d="M-70 -40 L-40 18 L-70 40 Z M70 -40 L40 18 L70 40 Z"
          fill="#8a352d"
          stroke="#2b1d12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text
          x="0"
          y="-6"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Alegreya, Georgia, serif"
          fontWeight="700"
          fontSize="38"
          fill="#f6e3cf"
        >
          1
        </text>
        <path d="M-62 -18 l12 12 l-6 12 l10 14" fill="none" stroke="#2b1d12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g stroke="#e8bb5f" strokeWidth="4" strokeLinecap="round">
        <path d="M30 40 l14 10" />
        <path d="M24 74 l18 2" />
        <path d="M200 30 l-12 14" />
      </g>
    </svg>
  )
}
