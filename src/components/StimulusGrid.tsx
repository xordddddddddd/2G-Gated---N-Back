import { CELL_PX, COLORS, GRID_PX } from '../lib/constants'
import { ShapeIcon } from './ShapeIcon'
import type { GameMode, InputGate, Stimulus } from '../types/game'

interface StimulusGridProps {
  stimulus: Stimulus
  inputGate: InputGate
  idle?: boolean
  gameMode?: GameMode
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
}: StimulusGridProps) {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]
  const cells = Array.from({ length: 9 }, (_, i) => i)
  const activePosition = stimulus.position
  const showShape = !idle && inputGate.shape
  const showColorDot = !idle && inputGate.color && !inputGate.shape
  const showColorShape = !idle && inputGate.color && inputGate.shape
  const shapeSize = Math.round(CELL_PX * 0.72)

  return (
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
        const isActive = !idle && i === activePosition
        const highlightPosition = isActive && inputGate.position
        const onWhiteCell = Boolean(highlightPosition)
        const shapeColor = shapeFillColor(gameMode, inputGate, color.hex, onWhiteCell)

        return (
          <div
            key={i}
            className="relative border border-white/80 overflow-hidden"
            style={{ width: CELL_PX, height: CELL_PX }}
          >
            {highlightPosition && (
              <div className="absolute inset-0 bg-white" aria-hidden />
            )}
            {isActive && showColorDot && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
  )
}
