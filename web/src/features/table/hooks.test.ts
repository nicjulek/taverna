import type { SceneItemDto, SceneWithItemsDto } from '@taverna/shared'
import { describe, expect, it } from 'vitest'
import { removeItem, upsertItem } from './hooks'

const item = (id: string, z: number, sceneId = 's1') => ({ id, z, sceneId }) as SceneItemDto
const scene = { id: 's1', items: [item('a', 1), item('b', 3)] } as SceneWithItemsDto

describe('cache da cena', () => {
  it('insere na ordem de profundidade', () => {
    expect(upsertItem(scene, item('c', 2))?.items.map((i) => i.id)).toEqual(['a', 'c', 'b'])
  })

  it('atualiza sem duplicar', () => {
    expect(upsertItem(scene, item('a', 5))?.items.map((i) => i.id)).toEqual(['b', 'a'])
  })

  it('ignora item de outra cena', () => {
    expect(upsertItem(scene, item('z', 1, 's2'))).toBe(scene)
    expect(removeItem(scene, 's2', 'a')).toBe(scene)
  })

  it('remove', () => {
    expect(removeItem(scene, 's1', 'a')?.items.map((i) => i.id)).toEqual(['b'])
  })
})
