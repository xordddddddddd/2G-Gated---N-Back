import { useEffect, useState } from 'react'
import { STREAM_LABELS, TWO_G_STREAMS, TWO_G_STREAM_LABELS } from '../lib/constants'
import { isGatedTrainingMode, is2GPlus } from '../lib/twoGPlus'
import { formatPlayTime } from '../lib/history'
import { averageStreamScores } from '../lib/stats'
import { getKeyForStream } from '../lib/response'
import { createIdleGate, createIdleStimulus } from '../lib/sequence'
import {
  format2GKeyMapping,
  get2GActivePair,
  get2GAudioLabel,
  get2GSpatialLabel,
  getDisplayKeyForStream,
} from '../lib/twoG'
import { BlockCueOverlay } from './BlockCueOverlay'
import { GateBar } from './GateBar'
import { Grid3DOverlay } from './Grid3DOverlay'
import { QuadBoxKey } from './QuadBoxKey'
import { SettingsSidebar } from './SettingsSidebar'
import { StimulusGrid } from './StimulusGrid'
import { StatsModal } from './StatsModal'
import type { useGame } from '../hooks/useGame'
import type { Stream, TrialFeedback } from '../types/game'

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
  playedIndex,
  totalTrials,
  trialsRemaining,
  nLevel,
  feedback,
  stats,
  suggestedN,
  todayPlayMs,
  isPlaying,
  pressedStreams: _pressedStreams,
  wrongStreams,
  correctStreams,
  blockCue,
  awaitingBlockCue,
  stimulusVisible,
  blockNumber,
  totalBlocks,
  generativeShapeCatalog,
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
  const gate = showIdle ? createIdleGate() : (trial?.inputGate ?? createIdleGate())
  const displayStimulus = showIdle
    ? createIdleStimulus()
    : (trial?.stimulus ?? createIdleStimulus())

  const gatedMode = isGatedTrainingMode(settings.gameMode)
  const modeLabel =
    settings.gameMode === 'quad'
      ? 'QUAD'
      : settings.gameMode === 'dual'
        ? 'DUAL'
        : settings.gameMode === '2g+'
          ? '2G+'
          : '2G'

  const keys = settings.keys
  const interactive = isPlaying
  const keysSwapped = trial?.keysSwapped ?? false
  const horizontalTask = trial?.horizontalTask
  const active2GPair = gatedMode ? get2GActivePair(gate) : null
  const streamKeyLabel = (stream: Stream) =>
    gatedMode ? getDisplayKeyForStream(stream, keys, gate, keysSwapped) : getKeyForStream(stream, keys)
  const keyMapping = gatedMode && isPlaying ? format2GKeyMapping(gate, keys, keysSwapped) : ''
  const resultStreams: Stream[] = gatedMode
    ? TWO_G_STREAMS
    : (['position', 'letter', 'color', 'shape'] as Stream[])
  const streamLabelForResults = (stream: Stream) =>
    gatedMode ? TWO_G_STREAM_LABELS[stream] : STREAM_LABELS[stream]

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
    <div className="relative flex flex-col h-svh overflow-hidden bg-[#232323] text-white">
      {settingsOpen && (
        <SettingsSidebar
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          onToggle={() => setSettingsOpen(false)}
        />
      )}

      <header className="qb-header shrink-0 z-20">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="justify-self-start ml-2 text-white/50 hover:text-white px-2"
          aria-label="Toggle settings"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M3 6h18v2H3V6zm0 5h12v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>

        <div className="qb-header-title">
          <span>N = {nLevel}</span>
          <span>{modeLabel}</span>
        </div>

        <div className="qb-header-right">
          <span className="hidden sm:inline tabular-nums">Today: {formatPlayTime(todayPlayMs)}</span>
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
        <div className="px-6 py-2 text-xs text-white/50 border-b border-white/10 text-center shrink-0 z-20">
          {gatedMode ? (
            <>
              {is2GPlus(settings.gameMode) ? (
                <>
                  2G+ adds Stroop, generative shapes, and emotional streams across blocks. Press{' '}
                  <b>F</b> spatial · <b>L</b> secondary when the output gate rule is satisfied.
                </>
              ) : (
                <>
                  Attend to the active pair each block. Press <b>F</b> for spatial and <b>L</b> for
                  audio when the output gate rule is satisfied (OR / AND / XOR).
                </>
              )}
              {' '}
              Stimuli show for 500ms, then blank until the next trial.
              {' · '}
              <b>Space</b> Play · <b>Esc</b> Stop
            </>
          ) : (
            <>
              Press <b>A</b> Position · <b>F</b> Color · <b>J</b> Shape · <b>L</b> Audio when they match
              n-back.
              {' · '}
              <b>Space</b> Play · <b>Esc</b> Stop
            </>
          )}
          <button type="button" onClick={() => setHelpOpen(false)} className="ml-3 underline">
            dismiss
          </button>
        </div>
      )}

      {gatedMode && isPlaying && !showIdle && (
        <GateBar
          gameMode={settings.gameMode}
          inputGate={gate}
          outputGate={trial?.outputGate ?? 'or'}
          visible
        />
      )}

      <div className="flex-auto flex relative overflow-hidden min-h-0">
        <div className="relative flex-1 w-full">
          {settings.gridMode === '3d' && (
            <Grid3DOverlay
              stimulus={displayStimulus}
              inputGate={gate}
              idle={showIdle}
              rotationSpeed={settings.rotationSpeed}
              gameMode={settings.gameMode}
              gridMode={settings.gridMode}
              outputGate={trial?.outputGate ?? 'or'}
              showGate={gatedMode && !showIdle}
              trialIndex={isPlaying ? trialIndex : 0}
              stimulusVisible={stimulusVisible}
            />
          )}

          {awaitingBlockCue && blockCue && (
            <BlockCueOverlay
              inputGate={blockCue.inputGate}
              outputGate={blockCue.outputGate}
              nLevel={nLevel}
              blockNumber={blockCue.blockNumber}
              keys={keys}
              keysSwapped={blockCue.keysSwapped}
              responseSwitching={settings.responseSwitching}
              horizontalTask={blockCue.horizontalTask}
              is2GPlus={is2GPlus(settings.gameMode)}
            />
          )}

          <div className="qb-stretch qb-game-grid z-10">
            <div className="qb-top-row">
              <button
                type="button"
                onClick={isPlaying ? stopSession : handlePlay}
                className="qb-play-btn"
              >
                {isPlaying ? 'Stop' : 'Play'}
              </button>
            </div>

            <div className="qb-keys-left">
              {gatedMode && active2GPair ? (
                <QuadBoxKey
                  stream={active2GPair.spatial}
                  keyLabel={streamKeyLabel(active2GPair.spatial)}
                  active
                  correct={correctStreams.has(active2GPair.spatial)}
                  wrong={wrongStreams.has(active2GPair.spatial)}
                  onPress={() => handleStreamPress(active2GPair.spatial)}
                  disabled={!interactive}
                  labelOverride={get2GSpatialLabel(gate)}
                />
              ) : (
                <>
                  <QuadBoxKey
                    stream="color"
                    keyLabel={streamKeyLabel('color')}
                    active={gate.color}
                    correct={correctStreams.has('color')}
                    wrong={wrongStreams.has('color')}
                    onPress={() => handleStreamPress('color')}
                    disabled={!interactive}
                  />
                  <QuadBoxKey
                    stream="position"
                    keyLabel={streamKeyLabel('position')}
                    active={gate.position}
                    correct={correctStreams.has('position')}
                    wrong={wrongStreams.has('position')}
                    onPress={() => handleStreamPress('position')}
                    disabled={!interactive}
                  />
                </>
              )}
            </div>

            <div className="qb-keys-right">
              {gatedMode && active2GPair ? (
                <QuadBoxKey
                  stream={active2GPair.audio}
                  keyLabel={streamKeyLabel(active2GPair.audio)}
                  active
                  correct={correctStreams.has(active2GPair.audio)}
                  wrong={wrongStreams.has(active2GPair.audio)}
                  onPress={() => handleStreamPress(active2GPair.audio)}
                  disabled={!interactive}
                  labelOverride={get2GAudioLabel(gate, horizontalTask)}
                />
              ) : (
                <>
                  <QuadBoxKey
                    stream="shape"
                    keyLabel={streamKeyLabel('shape')}
                    active={gate.shape}
                    correct={correctStreams.has('shape')}
                    wrong={wrongStreams.has('shape')}
                    onPress={() => handleStreamPress('shape')}
                    disabled={!interactive}
                  />
                  <QuadBoxKey
                    stream="letter"
                    keyLabel={streamKeyLabel('letter')}
                    active={gate.letter}
                    correct={correctStreams.has('letter')}
                    wrong={wrongStreams.has('letter')}
                    onPress={() => handleStreamPress('letter')}
                    disabled={!interactive}
                  />
                </>
              )}
            </div>

            {settings.gridMode === '2d' && (
              <div className="qb-center-2d">
                <StimulusGrid
                  stimulus={displayStimulus}
                  inputGate={gate}
                  idle={showIdle}
                  gameMode={settings.gameMode}
                  outputGate={trial?.outputGate ?? 'or'}
                  showGate={gatedMode && !showIdle}
                  trialIndex={isPlaying ? trialIndex : 0}
                  stimulusVisible={stimulusVisible}
                  gridMode={settings.gridMode}
                  horizontalTask={horizontalTask}
                  generativeShapeCatalog={generativeShapeCatalog}
                />
              </div>
            )}

            {settings.showTrialCounter && (
              <div className="qb-trial-counter" aria-hidden>
                {isPlaying ? trialsRemaining : settings.trialCount}
              </div>
            )}
          </div>

          {feedback && settings.feedbackMode === 'show' && (
            <p
              className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-sm font-medium ${FEEDBACK_STYLES[feedback]}`}
            >
              {feedback === 'hit' && 'Correct!'}
              {feedback === 'miss' && 'Missed a match'}
              {feedback === 'false-alarm' && 'False alarm'}
              {feedback === 'correct-reject' && 'Correct reject'}
            </p>
          )}
        </div>
      </div>

      {isPlaying && (
        <footer className="px-4 py-1 text-center text-[10px] text-white/20 shrink-0 z-20 space-y-0.5">
          <div>
            Trial {playedIndex + 1} / {totalTrials}
            {gatedMode && blockNumber && totalBlocks && (
              <span className="text-white/30">
                {' '}
                · Block {blockNumber}/{totalBlocks}
              </span>
            )}
            {gatedMode && settings.variableTiming && trial?.intervalMs && (
              <span className="text-white/30"> · {trial.intervalMs}ms</span>
            )}
          </div>
          {gatedMode && settings.responseSwitching && keyMapping && (
            <div className="text-white/35 tracking-wide">{keyMapping}</div>
          )}
        </footer>
      )}

      {phase === 'results' && stats && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded border border-white/20 bg-[#111] p-6 space-y-5">
            <h2 className="text-xl font-serif text-center">Session Complete</h2>
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="p-3 rounded bg-white/5">
                <p className="text-white/50 text-xs">Total</p>
                <p className="text-2xl font-bold">
                  {averageStreamScores(stats.streamScores, stats.usedStreams)}%
                </p>
              </div>
              <div className="p-3 rounded bg-white/5">
                <p className="text-white/50 text-xs">Accuracy</p>
                <p className="text-2xl font-bold">{Math.round(stats.accuracy * 100)}%</p>
              </div>
              {resultStreams.map((stream) => {
                const used = stats.usedStreams.includes(stream)
                return (
                  <div key={stream} className="p-3 rounded bg-white/5">
                    <p className="text-white/50 text-xs">{streamLabelForResults(stream)}</p>
                    <p>{used ? `${stats.streamScores[stream]}%` : '—'}</p>
                  </div>
                )
              })}
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
