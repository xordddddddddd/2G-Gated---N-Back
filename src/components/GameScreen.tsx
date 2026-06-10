import { GateIndicator } from './GateIndicator'
import { StimulusDisplay } from './StimulusDisplay'
import type { Trial, TrialFeedback } from '../types/game'

interface GameScreenProps {
  trial: Trial
  trialIndex: number
  totalTrials: number
  nLevel: number
  isScorable: boolean
  feedback: TrialFeedback
  onMatch: () => void
  onPause: () => void
}

const FEEDBACK_STYLES: Record<NonNullable<TrialFeedback>, string> = {
  hit: 'text-success border-success/50 bg-success/10',
  miss: 'text-danger border-danger/50 bg-danger/10',
  'false-alarm': 'text-warning border-warning/50 bg-warning/10',
  'correct-reject': 'text-muted border-border bg-surface-overlay',
}

const FEEDBACK_LABELS: Record<NonNullable<TrialFeedback>, string> = {
  hit: 'Hit!',
  miss: 'Miss — should have matched',
  'false-alarm': 'False alarm',
  'correct-reject': 'Correct reject',
}

export function GameScreen({
  trial,
  trialIndex,
  totalTrials,
  nLevel,
  isScorable,
  feedback,
  onMatch,
  onPause,
}: GameScreenProps) {
  const progress = ((trialIndex + 1) / totalTrials) * 100

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-between p-4 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold">{nLevel}-Back</span>
          <span className="text-sm text-muted">
            Trial {trialIndex + 1} / {totalTrials}
          </span>
        </div>
        <button
          type="button"
          onClick={onPause}
          className="px-3 py-1.5 rounded-lg text-sm text-muted hover:text-text hover:bg-surface-overlay transition-colors"
        >
          Pause
        </button>
      </header>

      <div className="h-1 bg-surface-overlay">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 max-w-lg mx-auto w-full">
        <GateIndicator inputGate={trial.inputGate} outputGate={trial.outputGate} />

        <StimulusDisplay stimulus={trial.stimulus} />

        {feedback && (
          <div
            className={`w-full text-center py-3 px-4 rounded-xl border text-sm font-medium ${FEEDBACK_STYLES[feedback]}`}
          >
            {FEEDBACK_LABELS[feedback]}
          </div>
        )}

        {!isScorable && (
          <p className="text-sm text-muted text-center">
            Warm-up trial — memorizing sequence…
          </p>
        )}

        <button
          type="button"
          onClick={onMatch}
          disabled={!isScorable}
          className="w-full max-w-sm py-5 rounded-2xl bg-accent hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Match
        </button>

        <p className="text-xs text-muted text-center">
          Press Space or tap Match when the output gate rule is satisfied
        </p>
      </main>
    </div>
  )
}
