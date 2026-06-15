import type { GridMode } from '../types/game'

export const GRID_3D_CELL_COUNT = 27
export const GRID_3D_CENTER = 13

export function indexTo3D(index: number): { x: number; y: number; z: number } {
  return {
    x: index % 3,
    y: Math.floor(index / 3) % 3,
    z: Math.floor(index / 9),
  }
}

/** Map legacy 2D indices (0–8) to the front face of the 3D lattice. */
export function toDisplayPosition(position: number, gridMode: GridMode): number {
  if (gridMode !== '3d' || position >= 9) return position
  const x = position % 3
  const y = Math.floor(position / 3)
  return x + y * 3 + 9
}

export function randomPosition3D(): number {
  return Math.floor(Math.random() * GRID_3D_CELL_COUNT)
}
