import { getShapeBackgroundStyle } from '../lib/grid3dShape'
import type { CSSProperties } from 'react'

interface GridCell3DProps {
  positionKey: string
  faceColor: string
  shapeId?: string
  shapeColor?: string
}

const FACE_CLASSES = [
  'grid3d-face-front',
  'grid3d-face-back',
  'grid3d-face-right',
  'grid3d-face-left',
  'grid3d-face-top',
  'grid3d-face-bottom',
] as const

export function GridCell3D({
  positionKey,
  faceColor,
  shapeId,
  shapeColor = '#1a1a1a',
}: GridCell3DProps) {
  const faceStyle: CSSProperties = {
    backgroundColor: faceColor,
    ...getShapeBackgroundStyle(shapeId, shapeColor),
  }

  return (
    <div className={`grid3d-cell p${positionKey}`}>
      {FACE_CLASSES.map((faceClass) => (
        <div key={faceClass} className={`grid3d-face ${faceClass}`} style={faceStyle} />
      ))}
    </div>
  )
}
