import { getKeyForStream } from '../lib/response'
import { StimulusGrid } from './StimulusGrid'
import { StreamKeyPanel } from './StreamKeyPanel'
import type { GameSettings, InputGate, Stimulus, Stream } from '../types/game'

interface QuadBoardProps {
  stimulus: Stimulus
  inputGate: InputGate
  settings: GameSettings
  pressedStreams: Set<Stream>
  onStreamPress: (stream: Stream) => void
}

export function QuadBoard({
  stimulus,
  inputGate,
  settings,
  pressedStreams,
  onStreamPress,
}: QuadBoardProps) {
  const keys = settings.keys

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:gap-5 w-full">
      <StreamKeyPanel
        stream="color"
        keyLabel={getKeyForStream('color', keys)}
        active={inputGate.color}
        pressed={pressedStreams.has('color')}
        onPress={() => onStreamPress('color')}
        layout="top"
      />

      <div className="flex items-center justify-center gap-3 sm:gap-8">
        <StreamKeyPanel
          stream="position"
          keyLabel={getKeyForStream('position', keys)}
          active={inputGate.position}
          pressed={pressedStreams.has('position')}
          onPress={() => onStreamPress('position')}
          layout="left"
        />

        <StimulusGrid stimulus={stimulus} inputGate={inputGate} />

        <StreamKeyPanel
          stream="shape"
          keyLabel={getKeyForStream('shape', keys)}
          active={inputGate.shape}
          pressed={pressedStreams.has('shape')}
          onPress={() => onStreamPress('shape')}
          layout="right"
        />
      </div>

      <StreamKeyPanel
        stream="letter"
        keyLabel={getKeyForStream('letter', keys)}
        active={inputGate.letter}
        pressed={pressedStreams.has('letter')}
        onPress={() => onStreamPress('letter')}
        layout="bottom"
      />
    </div>
  )
}
