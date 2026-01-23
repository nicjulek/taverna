export function Die({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" aria-hidden>
      <path d="M32 6 55 19.5v25L32 58 9 44.5v-25Z" />
      <path d="M32 6 20 39h24Z M9 19.5 20 39M55 19.5 44 39M20 39l12 19 12-19M9 44.5 20 39M55 44.5 44 39" strokeWidth="2.5" />
    </svg>
  )
}
