import { OUTPUT_GATE_LABELS, get2GActivePairLabel } from '../lib/constants'
import type { InputGate, OutputGate } from '../types/game'

interface BlockCueOverlayProps {
  inputGate: InputGate
  outputGate: OutputGate
  nLevel: number
  blockNumber: number
}

export function BlockCueOverlay({ inputGate, outputGate, nLevel, blockNumber }: BlockCueOverlayProps) {
  const output = OUTPUT_GATE_LABELS[outputGate]
  const pairLabel = get2GActivePairLabel(inputGate)

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-md rounded border border-white/25 bg-[#111] p-6 space-y-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Block {blockNumber}</p>
        <h2 className="text-xl font-serif">2G Block Start</h2>
        <div className="space-y-2 text-sm text-white/70">
          <p>
            Attend to: <span className="text-white font-semibold">{pairLabel}</span>
          </p>
          <p>
            Response gate:{' '}
            <span className="text-white font-semibold">
              {output.symbol} {output.label}
            </span>
          </p>
          <p>
            N-back level: <span className="text-white font-semibold">{nLevel}</span>
          </p>
        </div>
        <p className="text-xs text-white/40">Press Space or wait to begin</p>
      </div>
    </div>
  )
}
