import { OUTPUT_GATE_LABELS, STREAM_LABELS } from '../lib/constants'
import type { InputGate, OutputGate } from '../types/game'

interface GateIndicatorProps {
  inputGate: InputGate
  outputGate: OutputGate
}

export function GateIndicator({ inputGate, outputGate }: GateIndicatorProps) {
  const output = OUTPUT_GATE_LABELS[outputGate]
  const streams = (Object.keys(STREAM_LABELS) as (keyof InputGate)[]).filter(
    (k) => inputGate[k],
  )

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-muted font-medium">
          Input Gate
        </span>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {streams.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent border border-accent/30"
            >
              {STREAM_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-overlay border border-border">
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
    </div>
  )
}
