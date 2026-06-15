import { getKeyForStream } from '../lib/response'
import { createIdleGate, createIdleStimulus } from '../lib/sequence'
import { StimulusGrid } from './StimulusGrid'
import { StreamKeyPanel } from './StreamKeyPanel'
import type { GameSettings, InputGate, Stimulus, Stream, Trial } from '../types/game'

interface QuadBoardProps {
  stimulus: Stimulus
  inputGate: InputGate
  settings: GameSettings
  pressedStreams: Set<Stream>
  onStreamPress: (stream: Stream) => void
  idle?: boolean
  interactive?: boolean
}

export function QuadBoard({
  stimulus,
  inputGate,
  settings,
  pressedStreams,
  onStreamPress,
  idle = false,
  interactive = true,
}: QuadBoardProps) {
  const keys = settings.keys
  const gate = idle ? createIdleGate() : inputGate
  const displayStimulus = idle ? createIdleStimulus() : stimulus

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <StreamKeyPanel
        stream="color"
        keyLabel={getKeyForStream('color', keys)}
        active={gate.color}
        pressed={pressedStreams.has('color')}
        onPress={() => onStreamPress('color')}
        layout="top"
        disabled={!interactive}
      />

      <div className="flex items-center justify-center gap-2">
        <StreamKeyPanel
          stream="position"
          keyLabel={getKeyForStream('position', keys)}
          active={gate.position}
          pressed={pressedStreams.has('position')}
          onPress={() => onStreamPress('position')}
          layout="left"
          disabled={!interactive}
        />

        <StimulusGrid stimulus={displayStimulus} inputGate={gate} idle={idle} />

        <StreamKeyPanel
          stream="shape"
          keyLabel={getKeyForStream('shape', keys)}
          active={gate.shape}
          pressed={pressedStreams.has('shape')}
          onPress={() => onStreamPress('shape')}
          layout="right"
          disabled={!interactive}
        />
      </div>

      <StreamKeyPanel
        stream="letter"
        keyLabel={getKeyForStream('letter', keys)}
        active={gate.letter}
        pressed={pressedStreams.has('letter')}
        onPress={() => onStreamPress('letter')}
        layout="bottom"
        disabled={!interactive}
      />
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
}: {
  trial: Trial | null
  settings: GameSettings
  pressedStreams: Set<Stream>
  onStreamPress: (stream: Stream) => void
  idle?: boolean
  interactive?: boolean
}) {
  const stimulus = trial?.stimulus ?? createIdleStimulus()
  const inputGate = trial?.inputGate ?? createIdleGate()

  return (
    <QuadBoard
      stimulus={stimulus}
      inputGate={inputGate}
      settings={settings}
      pressedStreams={pressedStreams}
      onStreamPress={onStreamPress}
      idle={idle ?? !trial}
      interactive={interactive}
    />
  )
}
