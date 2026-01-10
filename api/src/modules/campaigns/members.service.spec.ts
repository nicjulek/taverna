import { canRemoveMember } from './members.service'

describe('canRemoveMember', () => {
  it('ninguém remove o mestre dono, nem ele mesmo', () => {
    expect(canRemoveMember('gm', 'gm', true)).toBe(false)
    expect(canRemoveMember('cogm', 'gm', false)).toBe(false)
  })

  it('qualquer participante pode sair', () => {
    expect(canRemoveMember('player', 'player', true)).toBe(true)
    expect(canRemoveMember('cogm', 'cogm', true)).toBe(true)
  })

  it('co-mestre remove jogadores mas não outro co-mestre', () => {
    expect(canRemoveMember('cogm', 'player', false)).toBe(true)
    expect(canRemoveMember('cogm', 'cogm', false)).toBe(false)
  })

  it('jogador não remove ninguém', () => {
    expect(canRemoveMember('player', 'player', false)).toBe(false)
  })

  it('mestre remove qualquer um que não seja ele', () => {
    expect(canRemoveMember('gm', 'cogm', false)).toBe(true)
    expect(canRemoveMember('gm', 'player', false)).toBe(true)
  })
})
