import { DEFAULT_SCENE_SETTINGS, type SceneItemDto, type SceneWithItemsDto } from '@taverna/shared'
import { describe, expect, it } from 'vitest'
import { computeVision } from './vision'

const item = (patch: Partial<SceneItemDto>): SceneItemDto => ({
  id: crypto.randomUUID(),
  sceneId: 's',
  layer: 'tokens',
  kind: 'token',
  x: 0,
  y: 0,
  width: 70,
  height: 70,
  rotation: 0,
  flipX: false,
  flipY: false,
  locked: false,
  z: 0,
  ownerId: null,
  createdBy: null,
  data: {},
  updatedAt: '',
  ...patch
})

const scene = (items: SceneItemDto[], ambient: 'bright' | 'dark' = 'bright'): SceneWithItemsDto => ({
  id: 's',
  campaignId: 'c',
  name: 'Cena',
  sortOrder: 0,
  active: true,
  settings: { ...DEFAULT_SCENE_SETTINGS, width: 10, height: 4, lighting: { vision: true, ambient, explore: true } },
  explored: null,
  updatedAt: '',
  items
})

describe('visão na mesa', () => {
  const hero = item({ id: 'hero', ownerId: 'me', x: 70, y: 70 })
  const ghost = item({ id: 'ghost', x: 560, y: 70 })
  const wall = item({
    id: 'wall',
    kind: 'wall',
    layer: 'objects',
    x: 350,
    y: 0,
    width: 1,
    height: 280,
    data: { type: 'door', state: 'closed', points: [0, 0, 0, 280] }
  })

  it('o mestre vê tudo sem névoa', () => {
    expect(computeVision(scene([hero, ghost, wall]), true, 'gm', false).active).toBe(false)
  })

  it('porta fechada esconde o token do outro lado', () => {
    const closed = computeVision(scene([hero, ghost, wall]), false, 'me', false)
    expect([...closed.visibleTokens]).toEqual(['hero'])
    expect(closed.seen.length).toBeGreaterThan(0)
    const open = computeVision(scene([hero, ghost, { ...wall, data: { ...wall.data, state: 'open' } }]), false, 'me', false)
    expect(open.visibleTokens.has('ghost')).toBe(true)
  })

  it('no escuro precisa de luz ou visão no escuro', () => {
    expect(computeVision(scene([hero, ghost], 'dark'), false, 'me', false).visibleTokens.has('ghost')).toBe(false)
    const torch = { ...hero, data: { light: { bright: 4, dim: 8 } } }
    expect(computeVision(scene([torch, ghost], 'dark'), false, 'me', false).visibleTokens.has('ghost')).toBe(true)
    const dwarf = { ...hero, data: { darkvision: 12 } }
    expect(computeVision(scene([dwarf, ghost], 'dark'), false, 'me', false).visibleTokens.has('ghost')).toBe(true)
  })

  it('a prévia do mestre usa os tokens dos jogadores', () => {
    const preview = computeVision(scene([hero, ghost, wall]), true, 'gm', true)
    expect(preview.active).toBe(true)
    expect(preview.viewers).toHaveLength(1)
    expect(preview.seen).toEqual([])
  })
})
