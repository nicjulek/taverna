import { CLASSES } from '@taverna/rules-5e'

export function classLine(race: string, classes: { key: string; level: number }[]): string {
  const parts = classes.map((c) => `${CLASSES.find((def) => def.key === c.key)?.label ?? c.key} ${c.level}`)
  return [race, parts.join(' / ')].filter(Boolean).join(' · ')
}

export function signed(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : `+${value}`
}

export function hpTone(current: number, max: number): 'ok' | 'hurt' | 'down' {
  if (current <= 0) return 'down'
  return current / max <= 0.5 ? 'hurt' : 'ok'
}
