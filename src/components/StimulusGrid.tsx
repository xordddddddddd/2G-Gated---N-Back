import { CELL_PX, COLORS, GRID_PX, LIME_MARKER_HEX, ORANGE_MARKER_HEX } from '../lib/constants'
import { toDisplayPosition } from '../lib/grid3d'
import { GateCellContent, GateLabel } from './GateOverlay'
import { ShapeIcon } from './ShapeIcon'
import type { GameMode, GridMode, InputGate, OutputGate, Stimulus } from '../types/game'

const CENTER_CELL = 4

interface StimulusGridProps {
  stimulus: Stimulus
  inputGate: InputGate
  idle?: boolean
  gameMode?: GameMode
  outputGate?: OutputGate
  showGate?: boolean
  trialIndex?: number
  stimulusVisible?: boolean
  gridMode?: GridMode
}

function shapeFillColor(
  gameMode: GameMode,
  inputGate: InputGate,
  colorHex: string,
  onWhiteCell: boolean,
): string {
  if (gameMode === 'quad') {
    return onWhiteCell ? '#1a1a1a' : '#ffffff'
  }
  if (inputGate.color) return colorHex
  return '#ffffff'
}

export function StimulusGrid({
  stimulus,
  inputGate,
  idle = false,
  gameMode = 'quad',
  outputGate = 'or',
  showGate = false,
  trialIndex = 0,
  stimulusVisible = true,
  gridMode = '2d',
}: StimulusGridProps) {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]
  const cells = Array.from({ length: 9 }, (_, i) => i)
  const showStimulus = !idle && stimulusVisible
  const is2G = gameMode === '2g'

  const limeIndex = toDisplayPosition(stimulus.position, gridMode)
  const orangeIndex = toDisplayPosition(stimulus.orangePosition, gridMode)

  const showShape = showStimulus && inputGate.shape
  const showColorDot = showStimulus && inputGate.color && !inputGate.shape
  const showColorShape = showStimulus && inputGate.color && inputGate.shape
  const shapeSize = Math.round(CELL_PX * 0.72)
  const markerSize = Math.round(CELL_PX * 0.62)

  return (
    <div className="gate-2d-layout shrink-0">
      {showGate && (
        <div className="gate-2d-side gate-2d-side-left" aria-hidden>
          <GateLabel outputGate={outputGate} size="side" />
        </div>
      )}

      <div
        className="shrink-0 grid grid-cols-3 border border-white"
        style={{
          width: GRID_PX,
          height: GRID_PX,
          minWidth: GRID_PX,
          minHeight: GRID_PX,
          maxWidth: GRID_PX,
          maxHeight: GRID_PX,
          background: '#000',
        }}
      >
        {cells.map((i) => {
          const isLime = showStimulus && is2G && i === limeIndex
          const isOrange = showStimulus && is2G && i === orangeIndex
          const isActive = showStimulus && !is2G && i === stimulus.position
          const highlightPosition = isActive && inputGate.position
          const onWhiteCell = Boolean(highlightPosition)
          const shapeColor = shapeFillColor(gameMode, inputGate, color.hex, onWhiteCell)

          return (
            <div
              key={i}
              className="relative border border-white/80 overflow-hidden"
              style={{ width: CELL_PX, height: CELL_PX }}
            >
              {i === CENTER_CELL && (
                <GateCellContent outputGate={outputGate} visible={showGate} />
              )}
              {highlightPosition && (
                <div
                  key={`hl-${trialIndex}`}
                  className="absolute inset-0 bg-white z-[1] stimulus-cell-pulse"
                  aria-hidden
                />
              )}
              {isLime && (
                <div
                  key={`lime-${trialIndex}`}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2] stimulus-cell-pulse"
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: markerSize,
                      height: markerSize,
                      backgroundColor: LIME_MARKER_HEX,
                    }}
                  />
                </div>
              )}
              {isOrange && (
                <div
                  key={`orange-${trialIndex}`}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2] stimulus-cell-pulse"
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: markerSize,
                      height: markerSize,
                      backgroundColor: ORANGE_MARKER_HEX,
                    }}
                  />
                </div>
              )}
              {isActive && showColorDot && (
                <div
                  key={`color-${trialIndex}`}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2] stimulus-cell-pulse"
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: shapeSize * 0.55,
                      height: shapeSize * 0.55,
                      backgroundColor: color.hex,
                    }}
                  />
                </div>
              )}
              {isActive && showShape && (
                <div
                  key={`shape-${trialIndex}`}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2] stimulus-cell-pulse"
                >
                  <ShapeIcon shapeId={stimulus.shape} color={shapeColor} size={shapeSize} />
                  {showColorShape && (
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: shapeSize * 0.32,
                        height: shapeSize * 0.32,
                        backgroundColor: color.hex,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showGate && (
        <div className="gate-2d-side gate-2d-side-right" aria-hidden>
          <GateLabel outputGate={outputGate} size="side" />
        </div>
      )}
    </div>
  )
}
