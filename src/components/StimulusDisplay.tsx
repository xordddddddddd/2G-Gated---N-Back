import { Grid } from './Grid'
import type { InputGate, Stimulus } from '../types/game'

interface StimulusDisplayProps {
  stimulus: Stimulus
  inputGate?: InputGate
  isSpeaking?: boolean
}

const ALL_ACTIVE: InputGate = {
  position: true,
  letter: true,
  color: true,
  shape: true,
}

export function StimulusDisplay({
  stimulus,
  inputGate = ALL_ACTIVE,
  isSpeaking = false,
}: StimulusDisplayProps) {
  return (
    <div className="w-full flex justify-center">
      <Grid stimulus={stimulus} inputGate={inputGate} isSpeaking={isSpeaking} />
    </div>
  )
}
