import { OUTPUT_GATE_LABELS } from '../lib/constants'
import type { OutputGate } from '../types/game'

interface GateCellContentProps {
  outputGate: OutputGate
  visible: boolean
}

const GATE_TEXT_SHADOW = '0 0 10px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9)'
const GATE_LABEL_SHADOW = '0 0 6px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.9)'

interface GateLabelProps {
  outputGate: OutputGate
  size?: 'center' | 'side'
}

export function GateLabel({ outputGate, size = 'center' }: GateLabelProps) {
  const output = OUTPUT_GATE_LABELS[outputGate]
  const isCenter = size === 'center'

  return (
    <div
      className="flex flex-col items-center justify-center pointer-events-none select-none"
      aria-hidden
    >
      <span
        className="font-serif leading-none text-white"
        style={{
          fontSize: isCenter
            ? 'clamp(2.5rem, 18vw, 4.25rem)'
            : 'clamp(1.75rem, 10vw, 3rem)',
          textShadow: GATE_TEXT_SHADOW,
        }}
      >
        {output.symbol}
      </span>
      <span
        className={`uppercase text-white font-medium mt-0.5 ${
          isCenter ? 'text-[9px] tracking-[0.3em]' : 'text-[8px] tracking-[0.25em]'
        }`}
        style={{ textShadow: GATE_LABEL_SHADOW }}
      >
        {output.label}
      </span>
    </div>
  )
}

export function GateCellContent({ outputGate, visible }: GateCellContentProps) {
  if (!visible) return null

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
      <GateLabel outputGate={outputGate} size="center" />
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
