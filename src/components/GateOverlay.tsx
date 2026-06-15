import { OUTPUT_GATE_LABELS } from '../lib/constants'
import type { OutputGate } from '../types/game'

interface GateCellContentProps {
  outputGate: OutputGate
  visible: boolean
}

export function GateCellContent({ outputGate, visible }: GateCellContentProps) {
  if (!visible) return null

  const output = OUTPUT_GATE_LABELS[outputGate]

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0"
      aria-hidden
    >
      <span
        className="font-serif leading-none select-none text-white"
        style={{
          fontSize: 'clamp(2.5rem, 18vw, 4.25rem)',
          textShadow: '0 0 10px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9)',
        }}
      >
        {output.symbol}
      </span>
      <span
        className="text-[9px] tracking-[0.3em] uppercase text-white font-medium mt-0.5"
        style={{ textShadow: '0 0 6px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.9)' }}
      >
        {output.label}
      </span>
    </div>
  )
}

/** @deprecated Use GateCellContent inside the center grid cell */
export function GateOverlay({ outputGate, visible }: GateCellContentProps) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <GateCellContent outputGate={outputGate} visible />
    </div>
  )
}
