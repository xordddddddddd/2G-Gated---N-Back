import { COLORS, SHAPES, STREAM_LABELS } from '../lib/constants'
import { ShapeIcon } from './ShapeIcon'
import type { InputGate, Stimulus } from '../types/game'

interface GridProps {
  stimulus: Stimulus
  inputGate: InputGate
  isSpeaking?: boolean
}

export function Grid({ stimulus, inputGate, isSpeaking = false }: GridProps) {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]
  const shape = SHAPES.find((s) => s.id === stimulus.shape) ?? SHAPES[0]
  const cells = Array.from({ length: 9 }, (_, i) => i)
  const activePosition = stimulus.position

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-wrap justify-center gap-1.5">
        {(['position', 'letter', 'color', 'shape'] as const).map((stream) => (
          <span
            key={stream}
            className={[
              'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
              inputGate[stream]
                ? 'bg-accent/20 text-accent border-accent/40'
                : 'bg-surface-overlay/60 text-muted border-border/50 line-through opacity-50',
            ].join(' ')}
          >
            {STREAM_LABELS[stream]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[min(92vw,480px)] mx-auto aspect-square">
        {cells.map((i) => {
          const isStimulusCell = i === activePosition
          const positionHighlighted = isStimulusCell && inputGate.position

          return (
            <div
              key={i}
              className={[
                'relative rounded-xl border-2 transition-all duration-200 overflow-hidden',
                'flex flex-col items-center justify-center',
                isStimulusCell
                  ? positionHighlighted
                    ? 'border-accent bg-accent/10 scale-[1.03] shadow-xl shadow-accent/25 ring-2 ring-accent/30 z-10'
                    : 'border-border bg-surface-raised scale-[1.02] shadow-md'
                  : 'border-border/60 bg-surface-overlay/80',
              ].join(' ')}
              style={
                isStimulusCell && inputGate.color
                  ? { backgroundColor: `${color.hex}22` }
                  : undefined
              }
            >
              {isStimulusCell ? (
                <div className="flex flex-col items-center justify-center gap-1 p-2 w-full h-full">
                  {inputGate.shape && (
                    <ShapeIcon
                      shapeId={stimulus.shape}
                      color={inputGate.color ? color.hex : '#f1f5f9'}
                      size={36}
                    />
                  )}

                  {inputGate.letter ? (
                    <span
                      className={[
                        'text-4xl sm:text-5xl font-bold leading-none text-text',
                        isSpeaking ? 'animate-pulse text-accent' : '',
                      ].join(' ')}
                    >
                      {stimulus.letter}
                    </span>
                  ) : !inputGate.shape && !inputGate.color ? (
                    <span className="text-3xl font-bold text-muted">·</span>
                  ) : null}

                  {inputGate.color && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div
                        className="w-5 h-5 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-[10px] text-muted font-medium">{color.label}</span>
                    </div>
                  )}

                  {inputGate.shape && (
                    <span className="text-[10px] text-muted font-medium">{shape.label}</span>
                  )}

                  {inputGate.letter && (
                    <span className="text-[9px] text-muted mt-auto">
                      {isSpeaking ? '🔊' : '🔊'}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
