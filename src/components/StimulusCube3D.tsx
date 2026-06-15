import { useMemo } from 'react'
import { COLORS } from '../lib/constants'
import {
  getRotationStart,
  indexToPositionKey,
  positionKeyToTransform,
  rotationDurationSec,
  toDisplayPosition,
} from '../lib/grid3d'
import { GateCellContent } from './GateOverlay'
import { GridCell3D } from './GridCell3D'
import { GridFrame } from './GridFrame'
import type { GameMode, GridMode, InputGate, OutputGate, Stimulus } from '../types/game'

interface StimulusCube3DProps {
  stimulus: Stimulus
  inputGate: InputGate
  idle?: boolean
  rotationSpeed?: number
  gameMode?: GameMode
  outputGate?: OutputGate
  showGate?: boolean
  gridMode?: GridMode
  flash?: boolean
}

function getCubeAppearance(
  stimulus: Stimulus,
  inputGate: InputGate,
  gameMode: GameMode,
  highlightPosition: boolean,
): { faceColor: string; shapeId?: string; shapeColor: string } {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]

  if (inputGate.shape) {
    const shapeColor =
      gameMode === 'quad'
        ? highlightPosition
          ? '#1a1a1a'
          : '#ffffff'
        : inputGate.color
          ? color.hex
          : '#1a1a1a'
    return { faceColor: '#fdfdfd', shapeId: stimulus.shape, shapeColor }
  }

  if (inputGate.color) {
    return { faceColor: color.hex, shapeColor: '#1a1a1a' }
  }

  return { faceColor: '#fdfdfd', shapeColor: '#1a1a1a' }
}

const FRAME_LAYERS: { transform: string }[] = [
  { transform: 'translateZ(-30.15svmin)' },
  { transform: 'translateZ(-10.05svmin)' },
  { transform: 'translateZ(10.05svmin)' },
  { transform: 'translateZ(30.15svmin)' },
  { transform: 'translateY(-30.15svmin) rotateX(90deg)' },
  { transform: 'translateY(-10.05svmin) rotateX(90deg)' },
  { transform: 'translateY(10.05svmin) rotateX(90deg)' },
  { transform: 'translateY(30.15svmin) rotateX(90deg)' },
  { transform: 'translateX(-30.15svmin) rotateY(90deg)' },
  { transform: 'translateX(-10.05svmin) rotateY(90deg)' },
  { transform: 'translateX(10.05svmin) rotateY(90deg)' },
  { transform: 'translateX(30.15svmin) rotateY(90deg)' },
]

export function StimulusCube3D({
  stimulus,
  inputGate,
  idle = false,
  rotationSpeed = 35,
  gameMode = 'quad',
  outputGate = 'or',
  showGate = false,
  gridMode = '3d',
  flash = false,
}: StimulusCube3DProps) {
  const rotationStart = useMemo(() => getRotationStart(), [])
  const durationSec = rotationDurationSec(rotationSpeed)
  const displayIndex = toDisplayPosition(stimulus.position, gridMode)
  const positionKey = indexToPositionKey(displayIndex)
  const showCell =
    !idle && (inputGate.position || inputGate.color || inputGate.shape)
  const highlightPosition = showCell && inputGate.position
  const appearance = getCubeAppearance(stimulus, inputGate, gameMode, Boolean(highlightPosition))

  return (
    <div className="grid3d-viewport">
      <div className="grid3d-scene-offset">
        <div
          className="grid3d-scene-rotate"
          style={
            {
              animationDuration: `${durationSec}s`,
              '--rotation-start-x': `${rotationStart.x}deg`,
              '--rotation-start-y': `${rotationStart.y}deg`,
              '--rotation-start-z': `${rotationStart.z}deg`,
            } as React.CSSProperties
          }
        >
          {showCell && (
            <GridCell3D
              positionKey={positionKey}
              faceColor={appearance.faceColor}
              flash={flash}
              shapeId={appearance.shapeId}
              shapeColor={appearance.shapeColor}
            />
          )}

          {showGate && (
            <div
              className="grid3d-gate"
              style={{ transform: positionKeyToTransform('1-1-1') }}
            >
              <GateCellContent outputGate={outputGate} visible={showGate} />
            </div>
          )}

          {FRAME_LAYERS.map((layer, i) => (
            <GridFrame key={i} transform={layer.transform} />
          ))}
        </div>
      </div>
    </div>
  )
}
