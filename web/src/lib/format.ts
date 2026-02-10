const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60]
]

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'agora mesmo'
}

const SMALL_WORDS = new Set(['a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos', 'e', 'em', 'na', 'no', 'the', 'of', 'and'])

export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const meaningful = words.filter((word) => !SMALL_WORDS.has(word.toLowerCase()))
  const pool = meaningful.length > 0 ? meaningful : words
  const picked = pool.length >= 2 ? [pool[0], pool[pool.length - 1]] : pool
  return (
    picked
      .map((word) => word?.[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
