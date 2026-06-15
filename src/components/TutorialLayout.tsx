import { GAME_MODE_LABELS } from '../lib/constants'
import { getTutorialProgress } from '../lib/tutorial'
import { createIdleGate, createIdleStimulus } from '../lib/sequence'
import { Grid3DOverlay } from './Grid3DOverlay'
import { QuadBoardFromTrial } from './QuadBoard'
import type { useGame } from '../hooks/useGame'
import type { useTutorial } from '../hooks/useTutorial'

type GameApi = ReturnType<typeof useGame>
type TutorialApi = ReturnType<typeof useTutorial>

interface TutorialLayoutProps {
  game: GameApi
  tutorial: TutorialApi
  onExit: () => void
  onStartTraining: () => void
}

export function TutorialLayout({ game, tutorial, onExit, onStartTraining }: TutorialLayoutProps) {
  const { settings } = game
  const {
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
    pressedStreams,
    usePerStream,
    nextStep,
    startPractice,
    handleMatch,
    handleStreamPress,
    continueFromFeedback,
  } = tutorial

  const progress = getTutorialProgress(stepIndex, totalSteps)
  const modeLabel = GAME_MODE_LABELS[settings.gameMode]

  const demoTrial =
    view === 'info' && step.demoStimulus
      ? {
          stimulus: step.demoStimulus,
          inputGate: step.demoInputGate ?? {
            position: true,
            letter: true,
            color: true,
            shape: true,
          },
          outputGate: step.demoOutputGate ?? ('or' as const),
        }
      : view === 'practice'
        ? currentTrial
        : view === 'feedback'
          ? currentTrial
          : null

  return (
    <div className="flex min-h-dvh bg-[#1a1a1a] text-white flex-col">
      <header className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/10">
        <button
          type="button"
          onClick={onExit}
          className="text-sm text-white/50 hover:text-white"
        >
          Exit
        </button>
        <h1 className="text-sm tracking-[0.25em] uppercase font-serif">
          {modeLabel} Tutorial · {stepIndex + 1}/{totalSteps}
        </h1>
        <div className="w-12" />
      </header>

      <div className="h-0.5 bg-white/10">
        <div className="h-full bg-white/40 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative overflow-hidden">
        {settings.gridMode === '3d' && (
          <Grid3DOverlay
            stimulus={demoTrial?.stimulus ?? createIdleStimulus()}
            inputGate={demoTrial?.inputGate ?? createIdleGate()}
            idle={!demoTrial}
            rotationSpeed={settings.rotationSpeed}
            gameMode={settings.gameMode}
            gridMode={settings.gridMode}
          />
        )}

        <div className="relative z-10 w-full flex justify-center">
          <QuadBoardFromTrial
          trial={demoTrial}
          settings={settings}
          pressedStreams={pressedStreams}
          onStreamPress={handleStreamPress}
          idle={!demoTrial}
          interactive={view === 'practice'}
          showGateOverlay={Boolean(demoTrial)}
          />
        </div>

        <div className="relative z-10 w-full max-w-lg text-center space-y-3 px-4">
          <h2 className="text-lg font-serif">{step.title}</h2>
          <p className="text-sm text-white/60 leading-relaxed">{step.body}</p>
          {step.hint && view !== 'feedback' && (
            <p className="text-xs text-white/40 border border-white/10 rounded px-3 py-2">
              {step.hint}
            </p>
          )}

          {view === 'practice' && (
            <p className="text-xs text-white/40">
              {isScorable
                ? `Trial ${trialIndex + 1} / ${totalTrials} · ${usePerStream ? 'Press stream keys' : 'Space = match'}`
                : `Warm-up ${trialIndex + 1} / ${nLevel}`}
            </p>
          )}

          {view === 'feedback' && feedback && (
            <p className="text-sm text-white/80 py-2">{feedbackMessage}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          {view === 'info' && (
            <>
              {isLastStep ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onExit()
                      onStartTraining()
                    }}
                    className="w-full py-3 font-serif text-xl border border-white bg-white text-black"
                  >
                    Start {modeLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onExit}
                    className="w-full py-2 text-sm text-white/50 hover:text-white"
                  >
                    Back to game
                  </button>
                </>
              ) : isPracticeStep ? (
                <button
                  type="button"
                  onClick={startPractice}
                  className="w-full py-3 font-serif text-xl border border-white/60 hover:bg-white/10"
                >
                  Start Practice
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full py-3 font-serif text-xl border border-white/60 hover:bg-white/10"
                >
                  Continue
                </button>
              )}
            </>
          )}

          {view === 'practice' && !usePerStream && (
            <button
              type="button"
              onClick={handleMatch}
              disabled={!isScorable}
              className="w-full py-3 font-serif text-xl border border-white bg-white text-black disabled:opacity-30"
            >
              Match
            </button>
          )}

          {view === 'feedback' && (
            <button
              type="button"
              onClick={continueFromFeedback}
              className="w-full py-3 font-serif text-xl border border-white/60 hover:bg-white/10"
            >
              {feedback === 'miss' || feedback === 'false-alarm' ? 'Try Again' : 'Continue'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
