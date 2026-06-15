import type { CSSProperties } from 'react'

export interface Layer3DStyle {
  translate: string
  rotate?: string
}

export const FRAME_LAYERS: Layer3DStyle[] = [
  { translate: '0 0 -30.15svmin' },
  { translate: '0 0 -10.05svmin' },
  { translate: '0 0 10.05svmin' },
  { translate: '0 0 30.15svmin' },
  { translate: '0 -30.15svmin 0', rotate: 'x 90deg' },
  { translate: '0 -10.05svmin 0', rotate: 'x 90deg' },
  { translate: '0 10.05svmin 0', rotate: 'x 90deg' },
  { translate: '0 30.15svmin 0', rotate: 'x 90deg' },
  { translate: '-30.15svmin 0 0', rotate: 'y 90deg' },
  { translate: '-10.05svmin 0 0', rotate: 'y 90deg' },
  { translate: '10.05svmin 0 0', rotate: 'y 90deg' },
  { translate: '30.15svmin 0 0', rotate: 'y 90deg' },
]

export function layerToStyle(layer: Layer3DStyle): CSSProperties {
  return {
    translate: layer.translate,
    ...(layer.rotate ? { rotate: layer.rotate } : {}),
  }
}

export function positionKeyToStyle(key: string): CSSProperties {
  const [xs, ys, zs] = key.split('-').map(Number)
  const u = 20.1
  return {
    translate: `${(xs - 1) * u}svmin ${(ys - 1) * u}svmin ${(zs - 1) * u}svmin`,
  }
}
