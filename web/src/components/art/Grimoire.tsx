import { useId } from 'react'

export function Grimoire({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 300 200" className={className} aria-hidden>
      <defs>
        <linearGradient id={`gr-cover-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6a2f24" />
          <stop offset="1" stopColor="#3e1a14" />
        </linearGradient>
        <radialGradient id={`gr-glass-${uid}`} cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#e8f1ea" stopOpacity="0.55" />
          <stop offset="1" stopColor="#9aab9f" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="184" rx="128" ry="11" fill="#0d1512" opacity="0.45" />
      <g transform="rotate(-6 120 110)">
        <rect x="46" y="44" width="150" height="128" rx="8" fill={`url(#gr-cover-${uid})`} stroke="#2b1d12" strokeWidth="3" />
        <rect x="52" y="50" width="12" height="116" rx="3" fill="#2a120d" opacity="0.6" />
        <rect x="76" y="62" width="104" height="92" rx="6" fill="none" stroke="#d6a446" strokeWidth="2.5" />
        <path d="M128 78 l14 22 -14 22 -14 -22 Z" fill="#d6a446" stroke="#2b1d12" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="128" cy="100" r="5" fill="#2b1d12" />
        <path
          d="M86 70 l8 0 M86 70 l0 8 M170 70 l-8 0 M170 70 l0 8 M86 146 l8 0 M86 146 l0 -8 M170 146 l-8 0 M170 146 l0 -8"
          stroke="#e8bb5f"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M196 56 h6 q4 0 4 4 v104 q0 4 -4 4 h-6" fill="#efe3c6" stroke="#2b1d12" strokeWidth="2.5" />
        <path d="M200 64 v96" stroke="#c9b385" strokeWidth="1.5" />
      </g>
      <g transform="translate(222 120) rotate(-28)">
        <rect x="-6" y="34" width="12" height="46" rx="5" fill="#7b4a2c" stroke="#2b1d12" strokeWidth="3" />
        <circle r="38" fill={`url(#gr-glass-${uid})`} stroke="#d6a446" strokeWidth="7" />
        <circle r="38" fill="none" stroke="#2b1d12" strokeWidth="2.5" />
        <circle r="31" fill="none" stroke="#2b1d12" strokeWidth="2" />
        <path d="M-16 -16 q10 -10 24 -8" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  )
}
