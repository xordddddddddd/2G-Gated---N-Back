import { GRID_PX } from '../lib/constants'
import { getKeyForStream } from '../lib/response'
import { createIdleGate, createIdleStimulus } from '../lib/sequence'
import { GateBar } from './GateBar'
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
  onStreamPress: (stream: Stream) => void
  idle?: boolean
  interactive?: boolean
  isPlaying?: boolean
  onPlay?: () => void
  onStop?: () => void
}

export function QuadBoard({
  stimulus,
  inputGate,
  outputGate = 'or',
  settings,
  pressedStreams,
  onStreamPress,
  idle = false,
  interactive = true,
  isPlaying = false,
  onPlay,
  onStop,
}: QuadBoardProps) {
  const keys = settings.keys
  const gate = idle ? createIdleGate() : inputGate
  const displayStimulus = idle ? createIdleStimulus() : stimulus
  const showGates =
    settings.gameMode === '2g' || (settings.enableInputGating && !idle)

  const stimulusDisplay =
    settings.gridMode === '3d' ? (
      <StimulusCube3D
        stimulus={displayStimulus}
        inputGate={gate}
        idle={idle}
        rotationSpeed={settings.rotationSpeed}
      />
    ) : (
      <StimulusGrid stimulus={displayStimulus} inputGate={gate} idle={idle} />
    )

  return (
    <div className="flex items-center justify-center gap-10">
      {/* Left column: Color + Position */}
      <div
        className="flex flex-col justify-between shrink-0"
        style={{ height: GRID_PX }}
      >
        <StreamKeyPanel
          stream="color"
          keyLabel={getKeyForStream('color', keys)}
          active={gate.color}
          pressed={pressedStreams.has('color')}
          onPress={() => onStreamPress('color')}
          layout="left"
          disabled={!interactive}
        />
        <StreamKeyPanel
          stream="position"
          keyLabel={getKeyForStream('position', keys)}
          active={gate.position}
          pressed={pressedStreams.has('position')}
          onPress={() => onStreamPress('position')}
          layout="left"
          disabled={!interactive}
        />
      </div>

      {/* Center: gate bar + grid */}
      <div className="flex flex-col items-center shrink-0">
        <GateBar
          gameMode={settings.gameMode}
          inputGate={gate}
          outputGate={outputGate}
          visible={showGates && !idle}
        />
        {stimulusDisplay}
      </div>

      {/* Right column: Play/Stop + Shape + Audio */}
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
            onPress={() => onStreamPress('shape')}
            layout="right"
            disabled={!interactive}
          />
          <StreamKeyPanel
            stream="letter"
            keyLabel={getKeyForStream('letter', keys)}
            active={gate.letter}
            pressed={pressedStreams.has('letter')}
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
  onStreamPress,
  idle,
  interactive,
  isPlaying,
  onPlay,
  onStop,
}: {
  trial: Trial | null
  settings: GameSettings
  pressedStreams: Set<Stream>
  onStreamPress: (stream: Stream) => void
  idle?: boolean
  interactive?: boolean
  isPlaying?: boolean
  onPlay?: () => void
  onStop?: () => void
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
      onStreamPress={onStreamPress}
      idle={idle ?? !trial}
      interactive={interactive}
      isPlaying={isPlaying}
      onPlay={onPlay}
      onStop={onStop}
    />
  )
}
