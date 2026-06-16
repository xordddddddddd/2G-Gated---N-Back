import { OUTPUT_GATE_LABELS } from '../lib/constants'
import { isGatedTrainingMode } from '../lib/twoGPlus'
import { Grid3DOverlay } from './Grid3DOverlay'
import { QuadBoard } from './QuadBoard'
import type { GameSettings, Trial, TrialFeedback } from '../types/game'
import type { Stream } from '../types/game'

interface GameScreenProps {
  trial: Trial
  trialIndex: number
  totalTrials: number
  trialsRemaining: number
  nLevel: number
  isScorable: boolean
  feedback: TrialFeedback
  settings: GameSettings
  pressedStreams: Set<Stream>
  onStreamPress: (stream: Stream) => void
  onStop: () => void
}

const FEEDBACK_STYLES: Record<NonNullable<TrialFeedback>, string> = {
  hit: 'text-success',
  miss: 'text-danger',
  'false-alarm': 'text-warning',
  'correct-reject': 'text-muted',
}

export function GameScreen({
  trial,
  trialIndex,
  totalTrials,
  trialsRemaining,
  nLevel,
  feedback,
  settings,
  pressedStreams,
  onStreamPress,
  onStop,
}: GameScreenProps) {
  const output = OUTPUT_GATE_LABELS[trial.outputGate]

  return (
    <div className="flex flex-col min-h-dvh bg-black text-white relative">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="w-20" />
        <h1 className="text-sm sm:text-base font-semibold tracking-widest uppercase text-center">
          N ≤ {nLevel} Quad
        </h1>
        <div className="flex items-center gap-2 w-20 justify-end">
          <button
            type="button"
            onClick={onStop}
            className="px-3 py-1.5 text-sm font-semibold border border-white/40 rounded hover:bg-white/10 transition-colors"
          >
            Stop
          </button>
        </div>
      </header>

      <div className="px-4 py-2 text-center text-xs text-white/50 border-b border-white/5">
        Output: <span className="text-warning font-semibold">{output.label}</span>
        <span className="hidden sm:inline"> — {output.description}</span>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 gap-4 relative overflow-hidden">
        {settings.gridMode === '3d' && (
          <Grid3DOverlay
            stimulus={trial.stimulus}
            inputGate={trial.inputGate}
            rotationSpeed={settings.rotationSpeed}
            gameMode={settings.gameMode}
            gridMode={settings.gridMode}
            outputGate={trial.outputGate}
            showGate={isGatedTrainingMode(settings.gameMode)}
          />
        )}

        <div className="relative z-10 w-full flex justify-center">
          <QuadBoard
            stimulus={trial.stimulus}
            inputGate={trial.inputGate}
            settings={settings}
            pressedStreams={pressedStreams}
            onStreamPress={onStreamPress}
          />
        </div>

        {feedback && (
          <p className={`relative z-10 text-sm font-medium ${FEEDBACK_STYLES[feedback]}`}>
            {feedback === 'hit' && 'Correct!'}
            {feedback === 'miss' && 'Missed a match'}
            {feedback === 'false-alarm' && 'False alarm'}
            {feedback === 'correct-reject' && 'Correct reject'}
          </p>
        )}

      </main>

      {settings.showTrialCounter && (
        <div
          className="absolute bottom-4 right-4 text-5xl sm:text-6xl font-bold text-white/20 tabular-nums pointer-events-none select-none"
          aria-label={`${trialsRemaining} trials remaining`}
        >
          {trialsRemaining}
        </div>
      )}

      <footer className="px-4 py-2 text-center text-[10px] text-white/30 border-t border-white/5">
        Trial {trialIndex + 1} / {totalTrials}
        {settings.responseMode === 'gated' && ' · Space = match'}
      </footer>
    </div>
  )
}
