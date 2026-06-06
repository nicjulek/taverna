import type { Grid } from '@taverna/tabletop'
import { describe, expect, it } from 'vitest'
import { drawingItem, initials, mediaItem, shapeItem, templateItem, tokenItem } from './items'

const style = { stroke: '#ff0000', fill: '#00000000', strokeWidth: 4 }
const grid: Grid = { type: 'square', size: 70, offsetX: 0, offsetY: 0 }

describe('itens da mesa', () => {
  it('desenho guarda os pontos relativos ao canto', () => {
    const item = drawingItem(
      [
        { x: 100, y: 50 },
        { x: 130, y: 80 },
        { x: 90, y: 60 }
      ],
      'objects',
      style
    )
    expect(item).toMatchObject({ kind: 'drawing', x: 90, y: 50, width: 40, height: 30 })
    expect(item?.data?.points).toEqual([10, 0, 40, 30, 0, 10])
  })

  it('um clique solto não vira desenho nem forma', () => {
    expect(drawingItem([{ x: 1, y: 1 }], 'objects', style)).toBeNull()
    expect(shapeItem('rect', { x: 10, y: 10 }, { x: 12, y: 11 }, 'objects', style)).toBeNull()
  })

  it('retângulo desenhado de baixo para cima fica certo', () => {
    expect(shapeItem('rect', { x: 200, y: 200 }, { x: 100, y: 150 }, 'objects', style)).toMatchObject({
      x: 100,
      y: 150,
      width: 100,
      height: 50
    })
  })

  it('linha guarda a direção', () => {
    expect(shapeItem('line', { x: 0, y: 0 }, { x: -30, y: 40 }, 'objects', style)?.data).toMatchObject({ dx: -30, dy: 40 })
  })

  it('molde aponta para onde o mouse foi', () => {
    const item = templateItem('cone', { x: 0, y: 0 }, { x: 0, y: 100 }, 15, 'objects', '#d6a446')
    expect(item.data?.angle).toBeCloseTo(Math.PI / 2)
    expect(item.data).toMatchObject({ template: 'cone', size: 15 })
  })

  it('token encaixa na célula e ocupa o tamanho em quadrados', () => {
    expect(tokenItem({ x: 100, y: 100 }, grid, { name: 'Ogro', color: '#c00', span: 2 })).toMatchObject({
      x: 0,
      y: 0,
      width: 140,
      height: 140
    })
    expect(tokenItem({ x: 100, y: 100 }, grid, { name: 'Pip', color: '#0c0', span: 1 })).toMatchObject({
      x: 70,
      y: 70,
      width: 70,
      height: 70
    })
  })

  it('mapa solto fica centralizado onde caiu', () => {
    expect(mediaItem('image', 'a1', { x: 500, y: 400 }, { width: 1000, height: 600 }, 'mapa.png')).toMatchObject({
      layer: 'map',
      x: 0,
      y: 100
    })
  })

  it('iniciais do token', () => {
    expect(initials('Doran Martelo-de-Brasa')).toBe('DM')
    expect(initials('pip')).toBe('P')
  })
})
