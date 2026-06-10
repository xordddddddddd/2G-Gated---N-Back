import type { ReactNode } from 'react'
import { COLORS, SHAPES, STREAM_LABELS } from '../lib/constants'
import { Grid } from './Grid'
import { ShapeIcon } from './ShapeIcon'
import type { InputGate, Stimulus, Stream } from '../types/game'

interface StimulusDisplayProps {
  stimulus: Stimulus
  inputGate?: InputGate
  isSpeaking?: boolean
}

const ALL_ACTIVE: InputGate = {
  position: true,
  letter: true,
  color: true,
  shape: true,
}

function StreamCard({
  stream,
  active,
  label,
  children,
}: {
  stream: Stream
  active: boolean
  label: string
  children: ReactNode
}) {
  return (
    <div
      className={[
        'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200',
        active
          ? 'bg-surface-raised border-accent shadow-md shadow-accent/20 ring-1 ring-accent/30'
          : 'bg-surface-overlay/40 border-border/40 opacity-35',
      ].join(' ')}
      aria-label={`${label} stream${active ? ' (active)' : ' (inactive)'}`}
    >
      <span
        className={[
          'text-xs uppercase tracking-wider font-medium',
          active ? 'text-accent' : 'text-muted',
        ].join(' ')}
      >
        {STREAM_LABELS[stream]}
      </span>
      <div className={active ? '' : 'grayscale'}>{children}</div>
      {!active && (
        <span className="text-[10px] text-muted uppercase tracking-wide">Gated out</span>
      )}
    </div>
  )
}

export function StimulusDisplay({
  stimulus,
  inputGate = ALL_ACTIVE,
  isSpeaking = false,
}: StimulusDisplayProps) {
  const color = COLORS.find((c) => c.id === stimulus.color) ?? COLORS[0]
  const shape = SHAPES.find((s) => s.id === stimulus.shape) ?? SHAPES[0]

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div
        className={[
          'w-full flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
          inputGate.position
            ? 'border-accent/40 bg-accent/5'
            : 'border-border/40 opacity-40',
        ].join(' ')}
      >
        <span
          className={[
            'text-xs uppercase tracking-wider font-medium',
            inputGate.position ? 'text-accent' : 'text-muted',
          ].join(' ')}
        >
          {STREAM_LABELS.position}
        </span>
        <Grid activePosition={inputGate.position ? stimulus.position : null} />
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        <StreamCard stream="letter" active={inputGate.letter} label="Letter">
          <div className="flex flex-col items-center gap-1 min-h-[52px] justify-center">
            {inputGate.letter ? (
              <>
                <span
                  className={[
                    'text-4xl font-bold tracking-tight text-text',
                    isSpeaking ? 'animate-pulse text-accent' : '',
                  ].join(' ')}
                >
                  {stimulus.letter}
                </span>
                <span className="text-[10px] text-muted flex items-center gap-1">
                  {isSpeaking ? '🔊 Speaking…' : '🔊 Audio letter'}
                </span>
              </>
            ) : (
              <span className="text-2xl text-muted">—</span>
            )}
          </div>
        </StreamCard>

        <StreamCard stream="color" active={inputGate.color} label="Color">
          <div className="min-h-[52px] flex items-center justify-center">
            {inputGate.color ? (
              <div
                className="w-12 h-12 rounded-full border-2 border-white/30 shadow-lg"
                style={{ backgroundColor: color.hex }}
                title={color.label}
              />
            ) : (
              <span className="text-2xl text-muted">—</span>
            )}
          </div>
        </StreamCard>

        <StreamCard stream="shape" active={inputGate.shape} label="Shape">
          <div className="min-h-[52px] flex flex-col items-center justify-center gap-1">
            {inputGate.shape ? (
              <>
                <ShapeIcon
                  shapeId={stimulus.shape}
                  color={inputGate.color ? color.hex : '#f1f5f9'}
                  size={44}
                />
                <span className="text-[10px] text-muted">{shape.label}</span>
              </>
            ) : (
              <span className="text-2xl text-muted">—</span>
            )}
          </div>
        </StreamCard>
      </div>
    </div>
  )
}
