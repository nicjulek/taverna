export function Letter({ className, broken = false }: { className?: string; broken?: boolean }) {
  return (
    <svg viewBox="0 0 320 230" className={className} aria-hidden>
      <ellipse cx="160" cy="212" rx="128" ry="12" fill="#0d1512" opacity="0.45" />
      <g transform={broken ? 'rotate(-4 160 120)' : undefined}>
        <path d="M36 50 L284 42 L292 196 L44 206 Z" fill="#d9c69c" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path d="M36 50 L160 132 L284 42" fill="#e9dcc0" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <path d="M44 206 L140 120 M292 196 L184 118" stroke="#2b1d12" strokeWidth="2.5" opacity="0.6" />
        {broken ? (
          <>
            <path
              d="M160 92 L154 104 L164 116 L156 128 L162 140 L160 148 A28 28 0 0 1 160 92 Z"
              fill="#a8443a"
              stroke="#2b1d12"
              strokeWidth="3"
              strokeLinejoin="round"
              transform="translate(-6 2) rotate(-8 160 120)"
            />
            <path
              d="M160 92 L154 104 L164 116 L156 128 L162 140 L160 148 A28 28 0 0 0 160 92 Z"
              fill="#b5453a"
              stroke="#2b1d12"
              strokeWidth="3"
              strokeLinejoin="round"
              transform="translate(10 -4) rotate(12 160 120)"
            />
            <path
              d="M144 108 a18 18 0 0 0 0 26"
              fill="none"
              stroke="#7d2f28"
              strokeWidth="2.5"
              transform="translate(-6 2) rotate(-8 160 120)"
            />
            <path
              d="M176 108 a18 18 0 0 1 0 26"
              fill="none"
              stroke="#7d2f28"
              strokeWidth="2.5"
              transform="translate(10 -4) rotate(12 160 120)"
            />
            <path d="M120 166 l10 -6 M196 160 l12 4" stroke="#b5453a" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : null}
      </g>
    </svg>
  )
}
