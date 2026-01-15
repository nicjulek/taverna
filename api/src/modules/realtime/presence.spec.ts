import { PresenceRegistry } from './presence'

const ana = { userId: 'a', displayName: 'Ana', color: '#fff' }
const bia = { userId: 'b', displayName: 'Bia', color: '#000' }

describe('PresenceRegistry', () => {
  it('lista quem está na sala em ordem alfabética', () => {
    const registry = new PresenceRegistry()
    registry.join('c1', 's1', bia)
    expect(registry.join('c1', 's2', ana).map((user) => user.displayName)).toEqual(['Ana', 'Bia'])
  })

  it('mantém a pessoa online enquanto ela tiver alguma aba aberta', () => {
    const registry = new PresenceRegistry()
    registry.join('c1', 's1', ana)
    registry.join('c1', 's2', ana)
    expect(registry.leave('c1', 's1')).toEqual([ana])
    expect(registry.leave('c1', 's2')).toEqual([])
  })

  it('separa as campanhas', () => {
    const registry = new PresenceRegistry()
    registry.join('c1', 's1', ana)
    registry.join('c2', 's2', bia)
    expect(registry.list('c1')).toEqual([ana])
    expect(registry.list('c2')).toEqual([bia])
  })
})
