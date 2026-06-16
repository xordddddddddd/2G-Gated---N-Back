import type { GenerativeShape } from '../lib/generativeShapes'

interface GenerativeShapeIconProps {
  shapeId: string
  catalog: GenerativeShape[]
  color?: string
  size?: number
}

export function GenerativeShapeIcon({
  shapeId,
  catalog,
  color = '#f8fafc',
  size = 48,
}: GenerativeShapeIconProps) {
  const shape = catalog.find((s) => s.id === shapeId) ?? catalog[0]
  if (!shape) return null

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke={color}
      strokeWidth={0.5}
      className="drop-shadow-sm"
      role="img"
      aria-label="Novel shape"
    >
      <path d={shape.path} />
    </svg>
  )
}
