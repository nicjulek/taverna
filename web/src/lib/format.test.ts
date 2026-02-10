import { initials, plural, timeAgo } from './format'

describe('format', () => {
  it('pega as iniciais ignorando artigos', () => {
    expect(initials('A Mina Perdida')).toBe('MP')
    expect(initials('Curse of Strahd')).toBe('CS')
    expect(initials('As Minas de Pedraluz')).toBe('MP')
    expect(initials('Ruínas')).toBe('R')
    expect(initials('O A')).toBe('OA')
    expect(initials('   ')).toBe('?')
  })

  it('escreve tempo relativo em português', () => {
    const now = new Date('2026-03-10T12:00:00Z').getTime()
    expect(timeAgo('2026-03-10T11:59:40Z', now)).toBe('agora mesmo')
    expect(timeAgo('2026-03-10T10:00:00Z', now)).toBe('há 2 horas')
    expect(timeAgo('2026-03-09T12:00:00Z', now)).toBe('ontem')
  })

  it('flexiona o plural', () => {
    expect(plural(1, 'jogador', 'jogadores')).toBe('1 jogador')
    expect(plural(3, 'jogador', 'jogadores')).toBe('3 jogadores')
  })
})
