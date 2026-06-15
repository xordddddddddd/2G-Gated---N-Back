import { useEffect, useState } from 'react'
import { formatPlayTime } from '../lib/history'
import { createIdleGate, createIdleStimulus } from '../lib/sequence'
import { Grid3DOverlay } from './Grid3DOverlay'
import { QuadBoardFromTrial } from './QuadBoard'
import { SettingsSidebar } from './SettingsSidebar'
import { StatsModal } from './StatsModal'
import type { useGame } from '../hooks/useGame'
import type { TrialFeedback } from '../types/game'

type GameApi = ReturnType<typeof useGame>

interface QuadLayoutProps extends GameApi {}

const FEEDBACK_STYLES: Record<NonNullable<TrialFeedback>, string> = {
  hit: 'text-green-400',
  miss: 'text-red-400',
  'false-alarm': 'text-yellow-400',
  'correct-reject': 'text-white/40',
}

export function QuadLayout({
  phase,
  settings,
  currentTrial,
  playedIndex,
  totalTrials,
  trialsRemaining,
  nLevel,
  feedback,
  stats,
  suggestedN,
  todayPlayMs,
  isPlaying,
  pressedStreams,
  wrongStreams,
  handlePlay,
  stopSession,
  dismissResults,
  updateSettings,
  resetSettings,
  handleStreamPress,
}: QuadLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const showIdle = phase === 'ready' || (phase === 'results' && !isPlaying)
  const trial = isPlaying ? currentTrial : null

  const modeLabel =
    settings.gameMode === 'quad' ? 'QUAD' : settings.gameMode === 'dual' ? 'DUAL' : '2G'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        return
      }

      if (e.code === 'Escape') {
        if (statsOpen) {
          e.preventDefault()
          setStatsOpen(false)
          return
        }
        if (settingsOpen) {
          e.preventDefault()
          setSettingsOpen(false)
          return
        }
        if (isPlaying) {
          e.preventDefault()
          stopSession()
        }
        return
      }

      if (e.code === 'Space' && !isPlaying) {
        e.preventDefault()
        handlePlay()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [statsOpen, settingsOpen, isPlaying, handlePlay, stopSession])

  return (
    <div className="flex min-h-dvh bg-[#1a1a1a] text-white">
      {settingsOpen && (
        <SettingsSidebar
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          onToggle={() => setSettingsOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center justify-between px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="text-white/40 hover:text-white w-8"
            aria-label="Toggle settings"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M3 6h18v2H3V6zm0 5h12v2H3v-2zm0 5h18v2H3v-2z" />
            </svg>
          </button>

          <h1
            className="text-base tracking-[0.3em] uppercase text-center font-serif"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            N = {nLevel}&nbsp;&nbsp;{modeLabel}
          </h1>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/60 tabular-nums hidden sm:inline text-xs tracking-wide">
              Today: {formatPlayTime(todayPlayMs)}
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="w-6 h-6 rounded-full border border-white/40 flex items-center justify-center text-xs hover:bg-white/10"
              aria-label="Help"
            >
              ?
            </button>
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="hover:opacity-80"
              aria-label="Statistics"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white/70">
                <rect x="4" y="14" width="4" height="6" />
                <rect x="10" y="8" width="4" height="12" />
                <rect x="16" y="4" width="4" height="16" />
              </svg>
            </button>
          </div>
        </header>

        {helpOpen && (
          <div className="px-6 py-2 text-xs text-white/50 border-b border-white/10 text-center">
            Press <b>A</b> Position · <b>F</b> Color · <b>J</b> Shape · <b>L</b> Audio when they match n-back.
            {' · '}
            <b>Space</b> Play · <b>Esc</b> Stop
            <button type="button" onClick={() => setHelpOpen(false)} className="ml-3 underline">
              dismiss
            </button>
          </div>
        )}

        <main className="flex-1 flex items-center justify-center p-6 relative min-h-0 overflow-hidden">
          {settings.gridMode === '3d' && (
            <Grid3DOverlay
              stimulus={
                showIdle ? createIdleStimulus() : (trial?.stimulus ?? createIdleStimulus())
              }
              inputGate={showIdle ? createIdleGate() : (trial?.inputGate ?? createIdleGate())}
              idle={showIdle}
              rotationSpeed={settings.rotationSpeed}
              gameMode={settings.gameMode}
              gridMode={settings.gridMode}
              flash={
                wrongStreams.has('position') ||
                wrongStreams.has('color') ||
                wrongStreams.has('shape')
              }
            />
          )}

          <div className="relative z-10 w-full flex justify-center">
            <QuadBoardFromTrial
            trial={trial}
            settings={settings}
            pressedStreams={pressedStreams}
            wrongStreams={wrongStreams}
            onStreamPress={handleStreamPress}
            idle={showIdle}
            interactive={isPlaying}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onStop={stopSession}
            />
          </div>

          {feedback && settings.feedbackMode === 'show' && (
            <p className={`absolute bottom-20 text-sm font-medium ${FEEDBACK_STYLES[feedback]}`}>
              {feedback === 'hit' && 'Correct!'}
              {feedback === 'miss' && 'Missed a match'}
              {feedback === 'false-alarm' && 'False alarm'}
              {feedback === 'correct-reject' && 'Correct reject'}
            </p>
          )}


          {settings.showTrialCounter && (
            <div
              className="absolute bottom-8 right-10 text-[7rem] font-serif text-white/12 tabular-nums pointer-events-none select-none leading-none"
              aria-label={isPlaying ? `${trialsRemaining} trials remaining` : `${settings.trialCount} trials`}
            >
              {isPlaying ? trialsRemaining : settings.trialCount}
            </div>
          )}
        </main>

        {isPlaying && (
          <footer className="px-4 py-1 text-center text-[10px] text-white/20 shrink-0">
            Trial {playedIndex + 1} / {totalTrials}
          </footer>
        )}
      </div>

      {phase === 'results' && stats && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded border border-white/20 bg-[#111] p-6 space-y-5">
            <h2 className="text-xl font-serif text-center">Session Complete</h2>
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="p-3 rounded bg-white/5">
                <p className="text-white/50 text-xs">Total</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    (stats.streamScores.position +
                      stats.streamScores.letter +
                      stats.streamScores.color +
                      stats.streamScores.shape) /
                      4,
                  )}
                  %
                </p>
              </div>
              <div className="p-3 rounded bg-white/5">
                <p className="text-white/50 text-xs">Accuracy</p>
                <p className="text-2xl font-bold">{Math.round(stats.accuracy * 100)}%</p>
              </div>
              <div className="p-3 rounded bg-white/5">
                <p className="text-white/50 text-xs">Position</p>
                <p>{stats.streamScores.position}%</p>
              </div>
              <div className="p-3 rounded bg-white/5">
                <p className="text-white/50 text-xs">Audio</p>
                <p>{stats.streamScores.letter}%</p>
              </div>
              <div className="p-3 rounded bg-white/5">
                <p className="text-white/50 text-xs">Color</p>
                <p>{stats.streamScores.color}%</p>
              </div>
              <div className="p-3 rounded bg-white/5">
                <p className="text-white/50 text-xs">Shape</p>
                <p>{stats.streamScores.shape}%</p>
              </div>
            </div>
            {settings.adaptive && suggestedN !== nLevel && (
              <p className="text-sm text-center text-teal-400">
                {suggestedN > nLevel
                  ? `Try ${suggestedN}-back next time`
                  : `Consider ${suggestedN}-back for consistency`}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePlay}
                className="flex-1 py-3 rounded border border-white/30 font-serif hover:bg-white/10"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={dismissResults}
                className="flex-1 py-3 rounded bg-white/10 hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
    </div>
  )
}
