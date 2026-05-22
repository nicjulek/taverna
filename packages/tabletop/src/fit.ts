import type { Rect } from './geometry'
import { type Grid, snapToLine } from './grid'

export function fitToSquares(item: Rect, cols: number, rows: number, grid: Grid): Rect {
  if (cols <= 0 || rows <= 0) throw new RangeError('Use pelo menos 1 quadrado')
  return {
    x: snapToLine(item.x, grid.size, grid.offsetX),
    y: snapToLine(item.y, grid.size, grid.offsetY),
    width: cols * grid.size,
    height: rows * grid.size
  }
}

export function squaresOf(item: Rect, grid: Grid): { cols: number; rows: number } {
  return { cols: Math.round((item.width / grid.size) * 10) / 10, rows: Math.round((item.height / grid.size) * 10) / 10 }
}

export function calibrate(item: Rect, cell: Rect, grid: Grid): Rect {
  if (cell.width < 4 || cell.height < 4) throw new RangeError('Desenhe o quadrado em cima de uma célula inteira do mapa')
  const sx = grid.size / cell.width
  const sy = grid.size / cell.height
  const targetX = snapToLine(item.x + (cell.x - item.x) * sx, grid.size, grid.offsetX)
  const targetY = snapToLine(item.y + (cell.y - item.y) * sy, grid.size, grid.offsetY)
  return {
    x: targetX - (cell.x - item.x) * sx,
    y: targetY - (cell.y - item.y) * sy,
    width: item.width * sx,
    height: item.height * sy
  }
}
