import { OUTPUT_GATE_LABELS } from '../lib/constants'
import type { OutputGate } from '../types/game'

interface GateOverlayProps {
  outputGate: OutputGate
  visible: boolean
}

export function GateOverlay({ outputGate, visible }: GateOverlayProps) {
  if (!visible) return null

  const output = OUTPUT_GATE_LABELS[outputGate]

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
      aria-label={`Output gate ${output.label}`}
    >
      <span
        className="font-serif leading-none select-none text-white/20"
        style={{ fontSize: '7.5rem' }}
      >
        {output.symbol}
      </span>
      <span className="text-[10px] tracking-[0.35em] uppercase text-white/30 mt-1">
        {output.label}
      </span>
    </div>
  )
}
