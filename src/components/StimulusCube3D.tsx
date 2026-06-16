import { useMemo } from 'react'
import { COLORS } from '../lib/constants'
import {
  getRotationStart,
  indexToPositionKey,
  rotationDurationSec,
  toDisplayPosition,
} from '../lib/grid3d'
import { FRAME_LAYER_CLASSES } from '../lib/grid3dLayers'
import { GateLabel } from './GateOverlay'
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
  trialIndex?: number
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
  trialIndex = 0,
}: StimulusCube3DProps) {
  const rotationStart = useMemo(() => getRotationStart(), [])
  const durationSec = rotationDurationSec(rotationSpeed)
  const displayIndex = toDisplayPosition(stimulus.position, gridMode)
  const positionKey = indexToPositionKey(displayIndex)
  const showCell =
    !idle && (inputGate.position || inputGate.color || inputGate.shape)
  const highlightPosition = showCell && inputGate.position
  const appearance = getCubeAppearance(stimulus, inputGate, gameMode, Boolean(highlightPosition))

  const viewport = (
    <div className={showGate ? 'grid3d-viewport grid3d-viewport--gated' : 'grid3d-viewport'}>
      {showGate && (
        <div className="grid3d-gate-center" aria-hidden>
          <GateLabel outputGate={outputGate} size="center" />
        </div>
      )}
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
            key={trialIndex}
            positionKey={positionKey}
            faceColor={appearance.faceColor}
            shapeId={appearance.shapeId}
            shapeColor={appearance.shapeColor}
            className="grid3d-stimulus-pulse"
          />
        )}

        {FRAME_LAYER_CLASSES.map((layerClass) => (
          <GridFrame key={layerClass} layerClass={layerClass} />
        ))}
      </div>
    </div>
  )

  if (!showGate) return viewport

  return (
    <div className="grid3d-gate-layout">
      <div className="grid3d-gate-side grid3d-gate-side-left" aria-hidden>
        <GateLabel outputGate={outputGate} size="side" />
      </div>
      {viewport}
      <div className="grid3d-gate-side grid3d-gate-side-right" aria-hidden>
        <GateLabel outputGate={outputGate} size="side" />
      </div>
    </div>
  )
}
