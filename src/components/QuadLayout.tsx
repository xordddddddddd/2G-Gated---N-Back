import { useState } from 'react'
import { formatPlayTime } from '../lib/history'
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
  trialIndex,
  totalTrials,
  trialsRemaining,
  nLevel,
  isScorable,
  feedback,
  stats,
  suggestedN,
  todayPlayMs,
  isPlaying,
  pressedStreams,
  startSession,
  stopSession,
  dismissResults,
  updateSettings,
  resetSettings,
  handleStreamPress,
}: QuadLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [statsOpen, setStatsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const showIdle = phase === 'ready' || (phase === 'results' && !isPlaying)
  const trial = isPlaying ? currentTrial : null

  return (
    <div className="flex min-h-dvh bg-black text-white">
      {settingsOpen ? (
        <SettingsSidebar
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          onToggle={() => setSettingsOpen(false)}
        />
      ) : (
        <SettingsSidebar
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          collapsed
          onToggle={() => setSettingsOpen(true)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="text-white/50 hover:text-white text-sm w-24 text-left"
          >
            {settingsOpen ? '' : '⚙'}
          </button>
          <h1 className="text-sm font-mono tracking-[0.25em] uppercase text-center">
            N ≤ {nLevel} {settings.gameMode === 'quad' ? 'QUAD' : settings.gameMode === 'dual' ? 'DUAL' : '2G'}
          </h1>
          <div className="flex items-center gap-3 w-48 justify-end text-sm">
            <span className="text-white/70 tabular-nums hidden sm:inline">
              Today: {formatPlayTime(todayPlayMs)}
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10"
              aria-label="Help"
            >
              ?
            </button>
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"
              aria-label="Statistics"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <rect x="4" y="14" width="4" height="6" />
                <rect x="10" y="8" width="4" height="12" />
                <rect x="16" y="4" width="4" height="16" />
              </svg>
            </button>
          </div>
        </header>

        {helpOpen && (
          <div className="px-4 py-2 text-xs text-white/60 border-b border-white/10 bg-white/5">
            Press the key for each stream when it matches n-back: Position <b>A</b>, Color <b>F</b>, Shape{' '}
            <b>J</b>, Audio <b>L</b>. Click Play to start.
            <button type="button" onClick={() => setHelpOpen(false)} className="ml-3 underline">
              dismiss
            </button>
          </div>
        )}

        <main className="flex-1 flex items-stretch min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
            <QuadBoardFromTrial
              trial={trial}
              settings={settings}
              pressedStreams={pressedStreams}
              onStreamPress={handleStreamPress}
              idle={showIdle}
              interactive={isPlaying}
            />

            {feedback && settings.feedbackMode === 'show' && (
              <p className={`mt-4 text-sm font-medium ${FEEDBACK_STYLES[feedback]}`}>
                {feedback === 'hit' && 'Correct!'}
                {feedback === 'miss' && 'Missed a match'}
                {feedback === 'false-alarm' && 'False alarm'}
                {feedback === 'correct-reject' && 'Correct reject'}
              </p>
            )}

            {isPlaying && !isScorable && (
              <p className="mt-2 text-xs text-white/40">
                Warm-up {trialIndex + 1} / {nLevel}
              </p>
            )}

            {settings.showTrialCounter && isPlaying && (
              <div
                className="absolute bottom-6 right-6 text-7xl font-bold text-white/15 tabular-nums pointer-events-none select-none font-serif"
                aria-label={`${trialsRemaining} trials remaining`}
              >
                {trialsRemaining}
              </div>
            )}
          </div>

          <aside className="w-[140px] shrink-0 flex flex-col items-center pt-6 pr-4 gap-6 border-l border-white/5">
            {isPlaying ? (
              <button
                type="button"
                onClick={stopSession}
                className="w-full py-4 px-2 font-serif text-2xl border border-white/30 rounded hover:bg-white/10 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={startSession}
                className="w-full py-4 px-2 font-serif text-3xl border border-white/40 rounded bg-white/5 hover:bg-white/15 transition-colors"
              >
                Play
              </button>
            )}

            {!isPlaying && settings.showTrialCounter && (
              <div className="text-7xl font-serif text-white/15 tabular-nums mt-auto mb-8">
                {settings.trialCount}
              </div>
            )}
          </aside>
        </main>

        {isPlaying && (
          <footer className="px-4 py-1.5 text-center text-[10px] text-white/30 border-t border-white/5 shrink-0">
            Trial {trialIndex + 1} / {totalTrials}
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
                <p className="text-2xl font-bold" style={{ color: stats.streamScores.position >= 50 ? '#22c55e' : '#ef4444' }}>
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
                onClick={startSession}
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
