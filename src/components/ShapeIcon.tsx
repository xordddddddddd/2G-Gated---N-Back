import { SHAPES } from '../lib/constants'

interface ShapeIconProps {
  shapeId: string
  color?: string
  size?: number
}

export function ShapeIcon({ shapeId, color = '#f1f5f9', size = 48 }: ShapeIconProps) {
  const shape = SHAPES.find((s) => s.id === shapeId) ?? SHAPES[0]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke={color}
      strokeWidth={shape.id === 'triangle' || shape.id === 'star' ? 0 : 0.5}
      strokeLinejoin="round"
      className="drop-shadow-sm"
      role="img"
      aria-label={shape.label}
    >
      <path d={shape.path} />
    </svg>
  )
}
