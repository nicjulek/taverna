import { useId } from 'react'

export function BlankSheet({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 300 210" className={className} aria-hidden>
      <defs>
        <linearGradient id={`bs-paper-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1e6cc" />
          <stop offset="1" stopColor="#d9c79f" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="194" rx="130" ry="12" fill="#0d1512" opacity="0.45" />
      <g transform="rotate(-4 130 104)">
        <path
          d="M58 26 H196 Q204 26 204 34 V176 Q204 184 196 184 H66 Q58 184 58 176 Z"
          fill={`url(#bs-paper-${uid})`}
          stroke="#2b1d12"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M196 184 q8 -6 8 -14" fill="none" stroke="#2b1d12" strokeWidth="2" opacity="0.5" />
        <rect x="72" y="40" width="38" height="46" rx="4" fill="#e6d6b0" stroke="#7b5534" strokeWidth="2.5" />
        <circle cx="91" cy="56" r="8" fill="#c9b385" />
        <path d="M78 82 q13 -18 26 0" fill="#c9b385" />
        <path d="M120 46 h66 M120 58 h50 M120 70 h60" stroke="#7b5534" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        {[0, 1, 2].map((row) =>
          [0, 1].map((col) => (
            <g key={`${row}-${col}`} transform={`translate(${74 + col * 30} ${100 + row * 26})`}>
              <rect width="24" height="20" rx="4" fill="#efe3c6" stroke="#7b5534" strokeWidth="2" />
              <path d="M7 10 h10" stroke="#b5453a" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          ))
        )}
        <path
          d="M140 106 h46 M140 118 h40 M140 130 h46 M140 142 h34 M140 154 h44 M140 166 h28"
          stroke="#7b5534"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="136" cy="106" r="2.5" fill="#7b5534" />
        <circle cx="136" cy="118" r="2.5" fill="#d6a446" stroke="#7b5534" strokeWidth="1" />
        <circle cx="136" cy="130" r="2.5" fill="#7b5534" />
      </g>
      <g transform="translate(236 150)">
        <path d="M-20 0 h40 l-4 26 h-32 Z" fill="#2a3a33" stroke="#2b1d12" strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="0" cy="0" rx="20" ry="6" fill="#16231e" stroke="#2b1d12" strokeWidth="3" />
      </g>
      <g transform="translate(232 148) rotate(28)">
        <path d="M0 0 L2 -96" stroke="#2b1d12" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M2 -96 C 26 -78, 22 -40, 1 -18 C 8 -44, 4 -70, 2 -96 Z"
          fill="#ece4d4"
          stroke="#2b1d12"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M2 -88 C -14 -70, -12 -44, 0 -28" fill="none" stroke="#2b1d12" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 -80 l9 -4 M5 -66 l11 -3 M4 -52 l9 -2" stroke="#9aab9f" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}
