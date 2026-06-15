import { GateIndicator } from './GateIndicator'
import { StimulusDisplay } from './StimulusDisplay'
import { getTutorialProgress } from '../lib/tutorial'
import type { useTutorial } from '../hooks/useTutorial'

type TutorialController = ReturnType<typeof useTutorial>

interface TutorialScreenProps extends TutorialController {
  onExit: () => void
  onStartTraining: () => void
}

const FEEDBACK_STYLES = {
  hit: 'text-success border-success/50 bg-success/10',
  miss: 'text-danger border-danger/50 bg-danger/10',
  'false-alarm': 'text-warning border-warning/50 bg-warning/10',
  'correct-reject': 'text-muted border-border bg-surface-overlay',
} as const

export function TutorialScreen({
  step,
  stepIndex,
  totalSteps,
  view,
  trialIndex,
  totalTrials,
  nLevel,
  currentTrial,
  isScorable,
  feedback,
  feedbackMessage,
  isLastStep,
  isPracticeStep,
  prevStep,
  nextStep,
  onExit,
  onStartTraining,
  startPractice,
  handleMatch,
  continueFromFeedback,
}: TutorialScreenProps) {
  const progress = getTutorialProgress(stepIndex, totalSteps)

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-between p-4 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-accent">Tutorial</span>
          <span className="text-sm text-muted">
            Step {stepIndex + 1} / {totalSteps}
          </span>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="px-3 py-1.5 rounded-lg text-sm text-muted hover:text-text hover:bg-surface-overlay transition-colors"
        >
          Exit
        </button>
      </header>

      <div className="h-1 bg-surface-overlay">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col p-4 sm:p-6 gap-6 max-w-xl mx-auto w-full">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{step.title}</h2>
          <p className="text-muted leading-relaxed">{step.body}</p>
          {step.hint && view !== 'feedback' && (
            <p className="text-sm text-accent/90 bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
              {step.hint}
            </p>
          )}
        </div>

        {view === 'info' && (
          <>
            {step.demoStimulus && (
              <div className="space-y-4">
                {step.demoInputGate && step.demoOutputGate && (
                  <GateIndicator
                    inputGate={step.demoInputGate}
                    outputGate={step.demoOutputGate}
                  />
                )}
                <StimulusDisplay
                  stimulus={step.demoStimulus}
                  inputGate={step.demoInputGate}
                />
              </div>
            )}

            <div className="mt-auto flex flex-col gap-3">
              {isLastStep ? (
                <>
                  <button
                    type="button"
                    onClick={onStartTraining}
                    className="w-full py-4 rounded-xl bg-accent hover:bg-accent-dim text-white font-semibold transition-colors"
                  >
                    Start Training
                  </button>
                  <button
                    type="button"
                    onClick={onExit}
                    className="w-full py-3 rounded-xl border border-border text-muted hover:text-text transition-colors"
                  >
                    Back to Menu
                  </button>
                </>
              ) : isPracticeStep ? (
                <button
                  type="button"
                  onClick={startPractice}
                  className="w-full py-4 rounded-xl bg-accent hover:bg-accent-dim text-white font-semibold transition-colors"
                >
                  Start Practice
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full py-4 rounded-xl bg-accent hover:bg-accent-dim text-white font-semibold transition-colors"
                >
                  Continue
                </button>
              )}

              {stepIndex > 0 && !isLastStep && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-full py-3 rounded-xl border border-border text-muted hover:text-text transition-colors"
                >
                  Previous
                </button>
              )}
            </div>
          </>
        )}

        {view === 'practice' && currentTrial && (
          <div className="flex flex-col gap-6 flex-1">
            <GateIndicator
              inputGate={currentTrial.inputGate}
              outputGate={currentTrial.outputGate}
            />
            <StimulusDisplay
              stimulus={currentTrial.stimulus}
              inputGate={currentTrial.inputGate}
            />

            <p className="text-sm text-muted text-center">
              {isScorable
                ? `Trial ${trialIndex + 1} / ${totalTrials} · Press Match when the rule applies`
                : `Warm-up ${trialIndex + 1} / ${nLevel} · Memorize the sequence`}
            </p>

            <button
              type="button"
              onClick={handleMatch}
              disabled={!isScorable}
              className="w-full py-5 rounded-2xl bg-accent hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xl transition-all active:scale-[0.98]"
            >
              Match
            </button>
          </div>
        )}

        {view === 'feedback' && feedback && (
          <div className="flex flex-col gap-6 flex-1 justify-center">
            {currentTrial && (
              <StimulusDisplay
                stimulus={currentTrial.stimulus}
                inputGate={currentTrial.inputGate}
              />
            )}
            <div
              className={`text-center py-4 px-4 rounded-xl border text-sm font-medium ${FEEDBACK_STYLES[feedback]}`}
            >
              {feedbackMessage}
            </div>
            <button
              type="button"
              onClick={continueFromFeedback}
              className="w-full py-4 rounded-xl bg-accent hover:bg-accent-dim text-white font-semibold transition-colors"
            >
              {feedback === 'miss' || feedback === 'false-alarm' ? 'Try Again' : 'Continue'}
            </button>
            <p className="text-xs text-muted text-center">Press Space to continue</p>
          </div>
        )}
      </main>
    </div>
  )
}
