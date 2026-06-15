import { useMemo } from 'react'
import { COLORS } from '../lib/constants'
import {
  getRotationStart,
  indexToPositionKey,
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
    <div className="grid3d-viewport flex items-center justify-center w-full min-w-[60svmin] min-h-[60svmin]">
      <div
        className="grid3d-scene"
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
            shapeSize={64}
          />
        )}

        {showGate && (
          <div className="grid3d-gate">
            <GateCellContent outputGate={outputGate} visible={showGate} />
          </div>
        )}

        <GridFrame className="grid3d-layer-z grid3d-layer-z-back-2" />
        <GridFrame className="grid3d-layer-z grid3d-layer-z-back-1" />
        <GridFrame className="grid3d-layer-z grid3d-layer-z-front-1" />
        <GridFrame className="grid3d-layer-z grid3d-layer-z-front-2" />

        <GridFrame className="grid3d-layer-y grid3d-layer-y-back-2" />
        <GridFrame className="grid3d-layer-y grid3d-layer-y-back-1" />
        <GridFrame className="grid3d-layer-y grid3d-layer-y-front-1" />
        <GridFrame className="grid3d-layer-y grid3d-layer-y-front-2" />

        <GridFrame className="grid3d-layer-x grid3d-layer-x-back-2" />
        <GridFrame className="grid3d-layer-x grid3d-layer-x-back-1" />
        <GridFrame className="grid3d-layer-x grid3d-layer-x-front-1" />
        <GridFrame className="grid3d-layer-x grid3d-layer-x-front-2" />
      </div>
    </div>
  )
}
