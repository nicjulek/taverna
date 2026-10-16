import { describe, expect, it } from 'vitest'
import { parseChat } from './command'

const members = [
  { userId: 'a', displayName: 'Ana' },
  { userId: 'b', displayName: 'Ana Clara' },
  { userId: 'c', displayName: 'Bruno' },
  { userId: 'me', displayName: 'Mestra' }
]

describe('comandos do chat', () => {
  it('texto comum vira mensagem para todos', () => {
    expect(parseChat('  Abro a porta  ', members, 'me')).toEqual({ kind: 'message', message: { text: 'Abro a porta' } })
  })

  it('rolagens com visibilidade e rótulo', () => {
    expect(parseChat('/r 1d20+5 # Furtividade', members, 'me')).toEqual({
      kind: 'roll',
      roll: { expression: '1d20+5', label: 'Furtividade', visibility: 'public' }
    })
    expect(parseChat('/br 1d20', members, 'me')).toMatchObject({ roll: { visibility: 'blind' } })
    expect(parseChat('/GR 2d6', members, 'me')).toMatchObject({ roll: { visibility: 'gm' } })
    expect(parseChat('/r', members, 'me')).toMatchObject({ kind: 'error' })
  })

  it('cochicho acha o nome mais longo, sem acento nem caixa', () => {
    expect(parseChat('/w ana clara vem cá', members, 'me')).toEqual({
      kind: 'message',
      message: { text: 'vem cá', audience: 'whisper', recipients: ['b'] }
    })
    expect(parseChat('/w Ana oi', members, 'me')).toMatchObject({ message: { recipients: ['a'] } })
    expect(parseChat('/w Mestra oi', members, 'me')).toMatchObject({ kind: 'error' })
    expect(parseChat('/w Bruno', members, 'me')).toMatchObject({ kind: 'error' })
  })

  it('mensagem para os mestres e comando desconhecido', () => {
    expect(parseChat('/m roubo a bolsa', members, 'c')).toEqual({ kind: 'message', message: { text: 'roubo a bolsa', audience: 'gm' } })
    expect(parseChat('/dance', members, 'c')).toEqual({
      kind: 'error',
      message: 'Não conheço o comando /dance. Use /r, /gr, /br, /w ou /m'
    })
  })
})
