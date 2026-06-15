import { GRID_PX } from '../lib/constants'
import { getKeyForStream } from '../lib/response'
import { createIdleGate, createIdleStimulus } from '../lib/sequence'
import { StimulusCube3D } from './StimulusCube3D'
import { StimulusGrid } from './StimulusGrid'
import { StreamKeyPanel } from './StreamKeyPanel'
import type { GameSettings, InputGate, Stimulus, Stream, Trial } from '../types/game'

interface QuadBoardProps {
  stimulus: Stimulus
  inputGate: InputGate
  outputGate?: Trial['outputGate']
  settings: GameSettings
  pressedStreams: Set<Stream>
  wrongStreams?: Set<Stream>
  onStreamPress: (stream: Stream) => void
  idle?: boolean
  interactive?: boolean
  isPlaying?: boolean
  onPlay?: () => void
  onStop?: () => void
  showGateOverlay?: boolean
}

export function QuadBoard({
  stimulus,
  inputGate,
  outputGate = 'or',
  settings,
  pressedStreams,
  wrongStreams = new Set(),
  onStreamPress,
  idle = false,
  interactive = true,
  isPlaying = false,
  onPlay,
  onStop,
  showGateOverlay = true,
}: QuadBoardProps) {
  const keys = settings.keys
  const gate = idle ? createIdleGate() : inputGate
  const displayStimulus = idle ? createIdleStimulus() : stimulus
  const showGates =
    showGateOverlay &&
    (settings.gameMode === '2g' || settings.enableInputGating || settings.gameMode === 'quad') &&
    !idle

  const stimulusDisplay =
    settings.gridMode === '3d' ? (
      <StimulusCube3D
        stimulus={displayStimulus}
        inputGate={gate}
        idle={idle}
        rotationSpeed={settings.rotationSpeed}
        gameMode={settings.gameMode}
        outputGate={outputGate}
        showGate={showGates}
        gridMode={settings.gridMode}
      />
    ) : (
      <StimulusGrid
        stimulus={displayStimulus}
        inputGate={gate}
        idle={idle}
        gameMode={settings.gameMode}
        outputGate={outputGate}
        showGate={showGates}
      />
    )

  return (
    <div className="flex items-center justify-center gap-10">
      <div className="flex flex-col justify-between shrink-0" style={{ height: GRID_PX }}>
        <StreamKeyPanel
          stream="color"
          keyLabel={getKeyForStream('color', keys)}
          active={gate.color}
          pressed={pressedStreams.has('color')}
          wrong={wrongStreams.has('color')}
          onPress={() => onStreamPress('color')}
          layout="left"
          disabled={!interactive}
        />
        <StreamKeyPanel
          stream="position"
          keyLabel={getKeyForStream('position', keys)}
          active={gate.position}
          pressed={pressedStreams.has('position')}
          wrong={wrongStreams.has('position')}
          onPress={() => onStreamPress('position')}
          layout="left"
          disabled={!interactive}
        />
      </div>

      <div className="relative shrink-0">
        {stimulusDisplay}
      </div>

      <div
        className="flex flex-col justify-between items-center shrink-0"
        style={{ height: GRID_PX }}
      >
        {isPlaying ? (
          <button
            type="button"
            onClick={onStop}
            className="px-6 py-2 font-serif text-2xl border border-white bg-white text-black hover:bg-white/90 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            className="px-6 py-2 font-serif text-2xl border border-white/60 text-white hover:bg-white/10 transition-colors"
          >
            Play
          </button>
        )}

        <div className="flex flex-col items-center gap-16">
          <StreamKeyPanel
            stream="shape"
            keyLabel={getKeyForStream('shape', keys)}
            active={gate.shape}
            pressed={pressedStreams.has('shape')}
            wrong={wrongStreams.has('shape')}
            onPress={() => onStreamPress('shape')}
            layout="right"
            disabled={!interactive}
          />
          <StreamKeyPanel
            stream="letter"
            keyLabel={getKeyForStream('letter', keys)}
            active={gate.letter}
            pressed={pressedStreams.has('letter')}
            wrong={wrongStreams.has('letter')}
            onPress={() => onStreamPress('letter')}
            layout="right"
            disabled={!interactive}
          />
        </div>
      </div>
    </div>
  )
}

export function QuadBoardFromTrial({
  trial,
  settings,
  pressedStreams,
  wrongStreams = new Set(),
  onStreamPress,
  idle,
  interactive,
  isPlaying,
  onPlay,
  onStop,
  showGateOverlay,
}: {
  trial: Trial | null
  settings: GameSettings
  pressedStreams: Set<Stream>
  wrongStreams?: Set<Stream>
  onStreamPress: (stream: Stream) => void
  idle?: boolean
  interactive?: boolean
  isPlaying?: boolean
  onPlay?: () => void
  onStop?: () => void
  showGateOverlay?: boolean
}) {
  const stimulus = trial?.stimulus ?? createIdleStimulus()
  const inputGate = trial?.inputGate ?? createIdleGate()
  const outputGate = trial?.outputGate ?? 'or'

  return (
    <QuadBoard
      stimulus={stimulus}
      inputGate={inputGate}
      outputGate={outputGate}
      settings={settings}
      pressedStreams={pressedStreams}
      wrongStreams={wrongStreams}
      onStreamPress={onStreamPress}
      idle={idle ?? !trial}
      interactive={interactive}
      isPlaying={isPlaying}
      onPlay={onPlay}
      onStop={onStop}
      showGateOverlay={showGateOverlay}
    />
  )
}
