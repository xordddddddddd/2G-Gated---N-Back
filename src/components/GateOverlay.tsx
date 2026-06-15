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
        className="font-serif leading-none select-none text-white"
        style={{
          fontSize: '7.5rem',
          textShadow: '0 0 12px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9), 0 0 1px #000',
        }}
      >
        {output.symbol}
      </span>
      <span
        className="text-xs tracking-[0.35em] uppercase text-white font-medium mt-1"
        style={{ textShadow: '0 0 8px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {output.label}
      </span>
    </div>
  )
}
