import type { CreateMessageInput, CreateRollInput, RollVisibility } from '@taverna/shared'

export type ChatCommand =
  { kind: 'roll'; roll: CreateRollInput } | { kind: 'message'; message: CreateMessageInput } | { kind: 'error'; message: string }

interface Member {
  userId: string
  displayName: string
}

const ROLL_COMMANDS: Record<string, RollVisibility> = {
  r: 'public',
  roll: 'public',
  rolar: 'public',
  gr: 'gm',
  br: 'blind',
  sr: 'self'
}

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function splitLabel(rest: string): { expression: string; label?: string } {
  const index = rest.indexOf('#')
  if (index === -1) return { expression: rest.trim() }
  return { expression: rest.slice(0, index).trim(), label: rest.slice(index + 1).trim() || undefined }
}

export function parseChat(input: string, members: Member[], me: string): ChatCommand {
  const text = input.trim()
  if (!text) return { kind: 'error', message: 'Escreva alguma coisa' }
  if (!text.startsWith('/')) return { kind: 'message', message: { text } }

  const match = /^\/(\S+)\s*([\s\S]*)$/.exec(text)!
  const command = fold(match[1]!)
  const rest = match[2]!.trim()

  if (command in ROLL_COMMANDS) {
    const { expression, label } = splitLabel(rest)
    if (!expression) return { kind: 'error', message: 'Diga o que rolar, como /r 1d20+5' }
    return { kind: 'roll', roll: { expression, label, visibility: ROLL_COMMANDS[command]! } }
  }

  if (command === 'm' || command === 'mestre' || command === 'gm') {
    if (!rest) return { kind: 'error', message: 'Escreva a mensagem para os mestres' }
    return { kind: 'message', message: { text: rest, audience: 'gm' } }
  }

  if (command === 'w' || command === 'c' || command === 'cochichar') {
    const folded = fold(rest)
    const target = [...members]
      .filter((m) => m.userId !== me)
      .sort((a, b) => b.displayName.length - a.displayName.length)
      .find((m) => {
        const name = fold(m.displayName)
        return folded === name || folded.startsWith(`${name} `)
      })
    if (!target) return { kind: 'error', message: 'Não achei essa pessoa. Use /w Nome e a mensagem' }
    const body = rest.slice(target.displayName.length).trim()
    if (!body) return { kind: 'error', message: `Escreva o que cochichar para ${target.displayName}` }
    return { kind: 'message', message: { text: body, audience: 'whisper', recipients: [target.userId] } }
  }

  return { kind: 'error', message: `Não conheço o comando /${match[1]}. Use /r, /gr, /br, /w ou /m` }
}

export const CHAT_HELP = [
  ['/r 1d20+5 # Furtividade', 'rola para todos'],
  ['/gr 2d6', 'rola só para você e os mestres'],
  ['/br 1d20', 'rola às cegas: só os mestres veem'],
  ['/w Nome mensagem', 'cochicha com alguém'],
  ['/m mensagem', 'fala só com os mestres']
] as const
