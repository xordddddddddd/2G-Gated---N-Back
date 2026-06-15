import { ShapeIcon } from './ShapeIcon'

interface GridCell3DProps {
  positionKey: string
  faceColor: string
  flash?: boolean
  correctFlash?: boolean
  shapeId?: string
  shapeColor?: string
}

export function GridCell3D({
  positionKey,
  faceColor,
  flash = false,
  correctFlash = false,
  shapeId,
  shapeColor = '#1a1a1a',
}: GridCell3DProps) {
  const showShape = Boolean(shapeId)
  const faceStyle = { backgroundColor: faceColor }

  return (
    <div
      className={`grid3d-cell p${positionKey}${flash ? ' grid3d-flash-wrong' : ''}${correctFlash ? ' grid3d-flash-correct' : ''}`}
    >
      <div className="grid3d-face grid3d-face-front" style={faceStyle}>
        {showShape && (
          <div className="grid3d-shape">
            <ShapeIcon shapeId={shapeId!} color={shapeColor} size={64} />
          </div>
        )}
      </div>
      <div className="grid3d-face grid3d-face-back" style={faceStyle} />
      <div className="grid3d-face grid3d-face-right" style={faceStyle} />
      <div className="grid3d-face grid3d-face-left" style={faceStyle} />
      <div className="grid3d-face grid3d-face-top" style={faceStyle} />
      <div className="grid3d-face grid3d-face-bottom" style={faceStyle} />
    </div>
  )
}
