import type { DieSides } from '@/features/dice/pool'

const SHAPES: Record<DieSides, string[]> = {
  4: ['M16 4 L28 26 H4 Z', 'M16 4 L16 26'],
  6: ['M7 7 H25 V25 H7 Z', 'M7 7 L11 4 H28 V21 L25 25', 'M25 7 L28 4'],
  8: ['M16 3 L28 16 L16 29 L4 16 Z', 'M4 16 H28', 'M16 3 L12 16 L16 29'],
  10: ['M16 3 L28 14 L16 29 L4 14 Z', 'M4 14 L16 18 L28 14', 'M16 18 V29'],
  12: ['M16 3 L28 11.5 L23.5 27 H8.5 L4 11.5 Z', 'M16 8 L22 12.5 L19.5 20 H12.5 L10 12.5 Z'],
  20: [
    'M16 3 L27.5 9.5 V22.5 L16 29 L4.5 22.5 V9.5 Z',
    'M16 9 L23 21 H9 Z',
    'M16 3 V9 M4.5 9.5 L9 21 M27.5 9.5 L23 21 M16 29 L9 21 M16 29 L23 21'
  ],
  100: ['M11 4 L19 12 L11 27 L3 12 Z', 'M21 4 L29 12 L21 27 L13 12', 'M3 12 L11 15 L19 12']
}

export function DieShape({ sides, className }: { sides: DieSides; className?: string }) {
  const [outline, ...lines] = SHAPES[sides]
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d={outline} strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
      {lines.map((d) => (
        <path key={d} d={d} strokeWidth="1.25" opacity="0.7" />
      ))}
    </svg>
  )
}
