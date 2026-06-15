import { useEffect, useRef } from 'react'
import { COLORS, GRID_PX } from '../lib/constants'
import { GateCellContent } from './GateOverlay'
import { ShapeIcon } from './ShapeIcon'
import type { GameMode, InputGate, OutputGate, Stimulus } from '../types/game'

const CENTER_CELL = 4

interface StimulusCube3DProps {
  stimulus: Stimulus
  inputGate: InputGate
  idle?: boolean
  rotationSpeed?: number
  gameMode?: GameMode
  outputGate?: OutputGate
  showGate?: boolean
}

const CUBE_SIZE = GRID_PX * 0.78
const HALF = CUBE_SIZE / 2

function GridFace({
  stimulus,
  inputGate,
  idle,
  transform,
  gameMode,
  outputGate,
  showGate,
  isFrontFace,
}: {
  stimulus: Stimulus
  inputGate: InputGate
  idle: boolean
  transform: string
  gameMode: GameMode
  outputGate: OutputGate
  showGate: boolean
  isFrontFace: boolean
}) {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]
  const cellSize = CUBE_SIZE / 3
  const shapeSize = Math.round(cellSize * 0.68)
  const cells = Array.from({ length: 9 }, (_, i) => i)

  return (
    <div
      className="absolute grid grid-cols-3 bg-black"
      style={{
        width: CUBE_SIZE,
        height: CUBE_SIZE,
        transform,
        backfaceVisibility: 'hidden',
      }}
    >
      {cells.map((i) => {
        const isActive = !idle && i === stimulus.position
        const onWhite = isActive && inputGate.position
        const shapeColor =
          gameMode === 'quad'
            ? onWhite
              ? '#1a1a1a'
              : '#ffffff'
            : inputGate.color
              ? color.hex
              : '#ffffff'
        return (
          <div
            key={i}
            className="relative border border-white/90"
            style={{ width: cellSize, height: cellSize }}
          >
            {isFrontFace && i === CENTER_CELL && (
              <GateCellContent outputGate={outputGate} visible={showGate} />
            )}
            {onWhite && <div className="absolute inset-0 bg-white z-[1]" />}
            {isActive && inputGate.shape && (
              <div className="absolute inset-0 flex items-center justify-center z-[2]">
                <ShapeIcon shapeId={stimulus.shape} color={shapeColor} size={shapeSize} />
              </div>
            )}
            {isActive && inputGate.color && !inputGate.shape && (
              <div className="absolute inset-0 flex items-center justify-center z-[2]">
                <div
                  className="rounded-full"
                  style={{
                    width: shapeSize * 0.5,
                    height: shapeSize * 0.5,
                    backgroundColor: color.hex,
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
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
}: StimulusCube3DProps) {
  const cubeRef = useRef<HTMLDivElement>(null)
  const angleRef = useRef(28)

  useEffect(() => {
    let frame = 0
    const speed = rotationSpeed / 180
    const tick = () => {
      angleRef.current = (angleRef.current + speed) % 360
      if (cubeRef.current) {
        cubeRef.current.style.transform = `rotateX(-22deg) rotateY(${angleRef.current}deg)`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [rotationSpeed])

  const d = HALF

  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{
        width: GRID_PX,
        height: GRID_PX,
        minWidth: GRID_PX,
        minHeight: GRID_PX,
        perspective: '1000px',
      }}
    >
      <div
        ref={cubeRef}
        className="relative"
        style={{
          width: CUBE_SIZE,
          height: CUBE_SIZE,
          transformStyle: 'preserve-3d',
          transform: 'rotateX(-22deg) rotateY(28deg)',
        }}
      >
        <GridFace
          stimulus={stimulus}
          inputGate={inputGate}
          idle={idle}
          gameMode={gameMode}
          outputGate={outputGate}
          showGate={showGate}
          isFrontFace
          transform={`translateZ(${d}px)`}
        />
        <GridFace
          stimulus={stimulus}
          inputGate={inputGate}
          idle={idle}
          gameMode={gameMode}
          outputGate={outputGate}
          showGate={false}
          isFrontFace={false}
          transform={`rotateY(180deg) translateZ(${d}px)`}
        />
        <GridFace
          stimulus={stimulus}
          inputGate={inputGate}
          idle={idle}
          gameMode={gameMode}
          outputGate={outputGate}
          showGate={false}
          isFrontFace={false}
          transform={`rotateY(90deg) translateZ(${d}px)`}
        />
        <GridFace
          stimulus={stimulus}
          inputGate={inputGate}
          idle={idle}
          gameMode={gameMode}
          outputGate={outputGate}
          showGate={false}
          isFrontFace={false}
          transform={`rotateY(-90deg) translateZ(${d}px)`}
        />
        <GridFace
          stimulus={stimulus}
          inputGate={inputGate}
          idle={idle}
          gameMode={gameMode}
          outputGate={outputGate}
          showGate={false}
          isFrontFace={false}
          transform={`rotateX(90deg) translateZ(${d}px)`}
        />
        <GridFace
          stimulus={stimulus}
          inputGate={inputGate}
          idle={idle}
          gameMode={gameMode}
          outputGate={outputGate}
          showGate={false}
          isFrontFace={false}
          transform={`rotateX(-90deg) translateZ(${d}px)`}
        />
      </div>
    </div>
  )
}
