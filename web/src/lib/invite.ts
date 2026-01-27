export function inviteUrl(code: string, origin = window.location.origin): string {
  return `${origin}/convite/${code}`
}

export function extractInviteCode(value: string): string | null {
  const trimmed = value.trim()
  const fromLink = trimmed.match(/\/convite\/([A-Za-z0-9_-]{6,})/)
  if (fromLink) return fromLink[1]!
  return /^[A-Za-z0-9_-]{6,}$/.test(trimmed) ? trimmed : null
}
