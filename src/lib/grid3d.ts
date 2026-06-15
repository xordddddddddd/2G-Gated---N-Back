import type { GridMode } from '../types/game'

export const GRID_3D_CELL_COUNT = 27
export const GRID_3D_CENTER = 13 // 1-1-1

/** Quad Box order: index = x×9 + y×3 + z */
export function indexTo3D(index: number): { x: number; y: number; z: number } {
  const z = index % 3
  const y = Math.floor(index / 3) % 3
  const x = Math.floor(index / 9)
  return { x, y, z }
}

export function indexToPositionKey(index: number): string {
  const { x, y, z } = indexTo3D(index)
  return `${x}-${y}-${z}`
}

export function positionKeyToIndex(key: string): number {
  const [xs, ys, zs] = key.split('-').map(Number)
  return xs * 9 + ys * 3 + zs
}

/** Map legacy 2D indices (0–8) to the front face (z = 1). */
export function toDisplayPosition(position: number, gridMode: GridMode): number {
  if (gridMode !== '3d' || position >= 9) return position
  const x = position % 3
  const y = Math.floor(position / 3)
  return x * 9 + y * 3 + 1
}

export function randomPosition3D(): number {
  return Math.floor(Math.random() * GRID_3D_CELL_COUNT)
}

/** Seeded rotation start angles (matches Quad Box: new offset every 2 hours). */
export function getRotationStart(): { x: number; y: number; z: number } {
  const seed = Math.floor(Date.now() / 7_200_000) * 7_200_000
  let s = seed
  const rand = () => {
    s = (s * 1_103_515_245 + 12_345) & 0x7fffffff
    return s / 0x7fffffff
  }
  return {
    x: rand() * 360,
    y: rand() * 360,
    z: rand() * 360,
  }
}

export function rotationDurationSec(rotationSpeed: number): number {
  const speed = Math.max(rotationSpeed, 1)
  return 3400 / speed
}
