import { OUTPUT_GATE_LABELS, STREAM_LABELS } from '../lib/constants'
import type { GameMode, InputGate, OutputGate } from '../types/game'

interface GateBarProps {
  gameMode: GameMode
  inputGate: InputGate
  outputGate: OutputGate
  visible: boolean
}

function activeStreamLabels(gate: InputGate): string {
  const parts: string[] = []
  if (gate.position) parts.push(STREAM_LABELS.position)
  if (gate.orangePosition) parts.push(STREAM_LABELS.orangePosition)
  if (gate.letter) parts.push(STREAM_LABELS.letter)
  if (gate.number) parts.push(STREAM_LABELS.number)
  if (gate.color) parts.push(STREAM_LABELS.color)
  if (gate.shape) parts.push(STREAM_LABELS.shape)
  return parts.join(' + ') || '—'
}

export function GateBar({ gameMode, inputGate, outputGate, visible }: GateBarProps) {
  if (!visible) return null

  const output = OUTPUT_GATE_LABELS[outputGate]

  return (
    <div className="flex items-center justify-center gap-6 text-[11px] tracking-[0.2em] uppercase text-white/45 mb-3 select-none pointer-events-none">
      <span>
        ATTEND{' '}
        <span className="text-white/70">{activeStreamLabels(inputGate)}</span>
      </span>
      <span className="text-white/25">|</span>
      <span>
        GATE{' '}
        <span className="text-white/80 font-semibold">
          {output.symbol} {output.label}
        </span>
      </span>
      {gameMode === '2g' && (
        <>
          <span className="text-white/25">|</span>
          <span className="text-white/50">2G</span>
        </>
      )}
    </div>
  )
}
