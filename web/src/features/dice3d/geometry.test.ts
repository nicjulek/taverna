import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { assignLabels, dieShape, topIndex } from './geometry'

describe('formas dos dados', () => {
  it.each([
    [4, 4, 4],
    [6, 6, 8],
    [8, 8, 6],
    [10, 10, 12],
    [12, 12, 20],
    [20, 20, 12]
  ])('d%i tem %i faces e %i vértices', (sides, faces, vertices) => {
    const shape = dieShape(sides)
    expect(shape.faces).toHaveLength(faces)
    expect(shape.points).toHaveLength(vertices)
    for (const face of shape.faces) expect(face.normal.dot(face.center)).toBeGreaterThan(0)
  })

  it('acha a face de cima e troca os números para mostrar o resultado', () => {
    const shape = dieShape(6)
    const top = topIndex(shape, new THREE.Quaternion())
    expect(shape.faces[top]!.normal.y).toBeCloseTo(1)
    const labels = assignLabels(6, top, 5)
    expect(labels[top]).toBe(5)
    expect([...labels].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('no d4 vale o vértice de cima', () => {
    const shape = dieShape(4)
    const top = topIndex(shape, new THREE.Quaternion())
    expect(shape.points[top]!.y).toBe(Math.max(...shape.points.map((p) => p.y)))
  })
})
