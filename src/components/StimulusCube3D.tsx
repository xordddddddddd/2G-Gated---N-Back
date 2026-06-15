import { useEffect, useRef } from 'react'
import { COLORS, GRID_PX } from '../lib/constants'
import { GRID_3D_CENTER, GRID_3D_CELL_COUNT, indexTo3D, toDisplayPosition } from '../lib/grid3d'
import { GateCellContent } from './GateOverlay'
import { ShapeIcon } from './ShapeIcon'
import type { GameMode, GridMode, InputGate, OutputGate, Stimulus } from '../types/game'

const LATTICE_SIZE = GRID_PX * 0.72
const CELL_SIZE = LATTICE_SIZE / 3
const TILT_X = -20
const INITIAL_Y = 32

interface StimulusCube3DProps {
  stimulus: Stimulus
  inputGate: InputGate
  idle?: boolean
  rotationSpeed?: number
  gameMode?: GameMode
  outputGate?: OutputGate
  showGate?: boolean
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

const FACE_TRANSFORMS = (half: number) => [
  `translateZ(${half}px)`,
  `rotateY(180deg) translateZ(${half}px)`,
  `rotateY(90deg) translateZ(${half}px)`,
  `rotateY(-90deg) translateZ(${half}px)`,
  `rotateX(90deg) translateZ(${half}px)`,
  `rotateX(-90deg) translateZ(${half}px)`,
]

function WireframeCell({
  index,
  active,
  highlightPosition,
  idle,
  inputGate,
  gameMode,
  stimulus,
  showGate,
  outputGate,
}: {
  index: number
  active: boolean
  highlightPosition: boolean
  idle: boolean
  inputGate: InputGate
  gameMode: GameMode
  stimulus: Stimulus
  showGate: boolean
  outputGate: OutputGate
}) {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]
  const { x, y, z } = indexTo3D(index)
  const tx = (x - 1) * CELL_SIZE
  const ty = (y - 1) * CELL_SIZE
  const tz = (z - 1) * CELL_SIZE
  const half = CELL_SIZE / 2
  const shapeSize = Math.round(CELL_SIZE * 0.55)
  const onWhiteCell = Boolean(highlightPosition)
  const shapeColor = shapeFillColor(gameMode, inputGate, color.hex, onWhiteCell)
  const showShape = active && inputGate.shape
  const showColorDot = active && inputGate.color && !inputGate.shape
  const showColorShape = active && inputGate.color && inputGate.shape
  const fill = highlightPosition ? '#ffffff' : 'transparent'

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        left: '50%',
        top: '50%',
        marginLeft: -CELL_SIZE / 2,
        marginTop: -CELL_SIZE / 2,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${tx}px, ${ty}px, ${tz}px)`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d', width: CELL_SIZE, height: CELL_SIZE }}
      >
        {FACE_TRANSFORMS(half).map((transform, faceIndex) => (
          <div
            key={faceIndex}
            className="absolute box-border border border-white/80"
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              left: 0,
              top: 0,
              transform,
              backfaceVisibility: 'hidden',
              background: faceIndex === 0 ? fill : 'transparent',
            }}
          />
        ))}

        {index === GRID_3D_CENTER && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translateZ(${half}px)`, backfaceVisibility: 'hidden' }}
          >
            <GateCellContent outputGate={outputGate} visible={showGate} />
          </div>
        )}

        {!idle && active && (
          <div
            className="absolute inset-0 flex items-center justify-center z-[2]"
            style={{ transform: `translateZ(${half + 1}px)`, backfaceVisibility: 'hidden' }}
          >
            {showColorDot && (
              <div
                className="rounded-full"
                style={{
                  width: shapeSize * 0.5,
                  height: shapeSize * 0.5,
                  backgroundColor: color.hex,
                }}
              />
            )}
            {showShape && (
              <div className="relative flex items-center justify-center">
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
        )}
      </div>
    </div>
  )
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
}: StimulusCube3DProps) {
  const cubeRef = useRef<HTMLDivElement>(null)
  const angleRef = useRef(INITIAL_Y)
  const displayPosition = toDisplayPosition(stimulus.position, gridMode)

  useEffect(() => {
    let frame = 0
    const speed = rotationSpeed / 180
    const tick = () => {
      angleRef.current = (angleRef.current + speed) % 360
      if (cubeRef.current) {
        cubeRef.current.style.transform = `rotateX(${TILT_X}deg) rotateY(${angleRef.current}deg)`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [rotationSpeed])

  const cells = Array.from({ length: GRID_3D_CELL_COUNT }, (_, index) => index)

  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{
        width: GRID_PX,
        height: GRID_PX,
        minWidth: GRID_PX,
        minHeight: GRID_PX,
        perspective: '1100px',
        perspectiveOrigin: '50% 45%',
      }}
    >
      <div
        ref={cubeRef}
        className="relative"
        style={{
          width: LATTICE_SIZE,
          height: LATTICE_SIZE,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${TILT_X}deg) rotateY(${INITIAL_Y}deg)`,
        }}
      >
        {cells.map((index) => {
          const isActive = !idle && index === displayPosition
          const highlightPosition = isActive && inputGate.position
          return (
            <WireframeCell
              key={index}
              index={index}
              active={isActive}
              highlightPosition={highlightPosition}
              idle={idle}
              inputGate={inputGate}
              gameMode={gameMode}
              stimulus={stimulus}
              showGate={showGate}
              outputGate={outputGate}
            />
          )
        })}
      </div>
    </div>
  )
}
