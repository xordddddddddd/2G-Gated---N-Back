import { COLORS } from '../lib/constants'
import { ShapeIcon } from './ShapeIcon'
import type { InputGate, Stimulus } from '../types/game'

interface StimulusGridProps {
  stimulus: Stimulus
  inputGate: InputGate
}

export function StimulusGrid({ stimulus, inputGate }: StimulusGridProps) {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]
  const cells = Array.from({ length: 9 }, (_, i) => i)
  const activePosition = stimulus.position
  const showShape = inputGate.shape || inputGate.color
  const shapeColor = inputGate.color ? color.hex : '#111111'

  return (
    <div
      className="grid grid-cols-3 border border-white/90 w-[min(72vw,340px)] aspect-square shrink-0"
      style={{ background: '#000' }}
    >
      {cells.map((i) => {
        const isActive = i === activePosition
        const highlightPosition = isActive && inputGate.position

        return (
          <div
            key={i}
            className={[
              'border border-white/70 flex items-center justify-center transition-colors duration-150',
              highlightPosition ? 'bg-white' : 'bg-black',
            ].join(' ')}
          >
            {isActive && showShape && (
              <div className="relative flex items-center justify-center w-[70%] h-[70%]">
                <ShapeIcon shapeId={stimulus.shape} color={shapeColor} size={56} />
                {inputGate.color && inputGate.shape && (
                  <div
                    className="absolute w-[35%] h-[35%] rounded-full opacity-90"
                    style={{ backgroundColor: color.hex }}
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
