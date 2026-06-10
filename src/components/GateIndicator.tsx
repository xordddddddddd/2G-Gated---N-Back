import { OUTPUT_GATE_LABELS } from '../lib/constants'
import type { InputGate, OutputGate } from '../types/game'

interface GateIndicatorProps {
  inputGate: InputGate
  outputGate: OutputGate
}

export function GateIndicator({ outputGate }: GateIndicatorProps) {
  const output = OUTPUT_GATE_LABELS[outputGate]

  return (
    <div className="w-full p-3 rounded-xl bg-surface-overlay border border-border flex items-center justify-between gap-3">
      <div>
        <span className="text-xs uppercase tracking-wider text-muted font-medium">
          Output Gate
        </span>
        <p className="text-sm text-muted mt-0.5">{output.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-2xl font-bold text-warning">{output.symbol}</span>
        <span className="px-2.5 py-1 rounded-lg bg-warning/15 text-warning text-sm font-bold border border-warning/30">
          {output.label}
        </span>
      </div>
    </div>
  )
}
