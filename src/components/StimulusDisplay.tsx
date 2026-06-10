import { COLORS } from '../lib/constants'
import { Grid } from './Grid'
import { ShapeIcon } from './ShapeIcon'
import type { Stimulus } from '../types/game'

interface StimulusDisplayProps {
  stimulus: Stimulus
}

export function StimulusDisplay({ stimulus }: StimulusDisplayProps) {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <Grid activePosition={stimulus.position} />

      <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-raised border border-border">
          <span className="text-xs uppercase tracking-wider text-muted">Letter</span>
          <span className="text-4xl font-bold tracking-tight">{stimulus.letter}</span>
        </div>

        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-raised border border-border">
          <span className="text-xs uppercase tracking-wider text-muted">Color</span>
          <div
            className="w-10 h-10 rounded-full border-2 border-white/20 shadow-inner"
            style={{ backgroundColor: color.hex }}
            title={color.label}
          />
        </div>

        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-raised border border-border">
          <span className="text-xs uppercase tracking-wider text-muted">Shape</span>
          <ShapeIcon shapeId={stimulus.shape} color={color.hex} size={40} />
        </div>
      </div>
    </div>
  )
}
