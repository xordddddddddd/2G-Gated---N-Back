import { SHAPES } from './constants'
import type { CSSProperties } from 'react'

export function getShapeBackgroundStyle(
  shapeId?: string,
  shapeColor = '#1a1a1a',
): CSSProperties {
  if (!shapeId) return {}

  const shape = SHAPES.find((s) => s.id === shapeId) ?? SHAPES[0]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${shapeColor}" d="${shape.path}"/></svg>`

  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundSize: '82%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}
