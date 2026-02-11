export function OpenBook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden>
      <ellipse cx="160" cy="196" rx="132" ry="14" fill="#0d1512" opacity="0.45" />
      <path
        d="M28 64 Q90 44 158 66 L158 190 Q90 170 28 188 Z"
        fill="#6b4a2e"
        stroke="#2b1d12"
        strokeWidth="3"
        strokeLinejoin="round"
        transform="translate(-6 6)"
      />
      <path
        d="M292 64 Q230 44 162 66 L162 190 Q230 170 292 188 Z"
        fill="#6b4a2e"
        stroke="#2b1d12"
        strokeWidth="3"
        strokeLinejoin="round"
        transform="translate(6 6)"
      />
      <path d="M30 58 Q92 38 160 62 L160 186 Q92 164 30 182 Z" fill="#efe3c6" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
      <path d="M290 58 Q228 38 160 62 L160 186 Q228 164 290 182 Z" fill="#e4d5b2" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
      <g stroke="#c2ad83" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M52 82 Q92 70 140 82" />
        <path d="M52 100 Q92 88 140 100" />
        <path d="M52 118 Q86 108 120 116" />
        <path d="M180 82 Q226 70 268 80" />
        <path d="M180 100 Q214 92 244 96" />
      </g>
      <path d="M58 140 l10 -14 l10 14 M74 142 l8 -11 l8 11" fill="none" stroke="#7a5c3a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M96 148 q14 -10 30 0" fill="none" stroke="#b5453a" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
      <path d="M160 62 V186" stroke="#2b1d12" strokeWidth="3" />
      <path
        d="M200 150 C 230 110, 268 70, 300 22 C 288 64, 262 112, 214 152 Z"
        fill="#ece4d4"
        stroke="#2b1d12"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M214 140 C 240 108, 268 72, 296 30" fill="none" stroke="#b9a785" strokeWidth="2" />
      <path d="M200 150 l-12 22" stroke="#2b1d12" strokeWidth="4" strokeLinecap="round" />
      <g transform="translate(250 168)">
        <path d="M-18 -8 h36 l4 26 h-44 Z" fill="#1f2f29" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <rect x="-12" y="-16" width="24" height="9" rx="2" fill="#d6a446" stroke="#2b1d12" strokeWidth="2.5" />
      </g>
    </svg>
  )
}
