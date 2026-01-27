import { extractInviteCode, inviteUrl } from './invite'

describe('extractInviteCode', () => {
  it('aceita o link completo', () => {
    expect(extractInviteCode('https://taverna.onrender.com/convite/aB3dE9xYz1Qw')).toBe('aB3dE9xYz1Qw')
    expect(extractInviteCode('  http://localhost:5173/convite/Zz-_09abcd \n')).toBe('Zz-_09abcd')
  })

  it('aceita só o código', () => {
    expect(extractInviteCode('aB3dE9xYz1Qw')).toBe('aB3dE9xYz1Qw')
  })

  it('recusa texto que não é convite', () => {
    expect(extractInviteCode('oi mestre')).toBeNull()
    expect(extractInviteCode('https://outro.site/x')).toBeNull()
  })

  it('monta o link do convite com a origem do site', () => {
    expect(inviteUrl('abc123', 'https://taverna.app')).toBe('https://taverna.app/convite/abc123')
  })
})
