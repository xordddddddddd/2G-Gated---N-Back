export type Stream = 'position' | 'letter' | 'color' | 'shape'

export type OutputGate = 'or' | 'and' | 'xor'

export type GamePhase = 'menu' | 'countdown' | 'playing' | 'paused' | 'results'

export type TrialFeedback = 'hit' | 'miss' | 'false-alarm' | 'correct-reject' | null

export interface Stimulus {
  position: number
  letter: string
  color: string
  shape: string
}

export interface InputGate {
  position: boolean
  letter: boolean
  color: boolean
  shape: boolean
}

export interface Trial {
  stimulus: Stimulus
  inputGate: InputGate
  outputGate: OutputGate
}

export interface GameSettings {
  nLevel: number
  trialCount: number
  intervalMs: number
  soundEnabled: boolean
  adaptive: boolean
}

export interface TrialResult {
  trialIndex: number
  responded: boolean
  correct: boolean
  shouldMatch: boolean
  feedback: TrialFeedback
  outputGate: OutputGate
  activeStreams: Stream[]
}

export interface SessionStats {
  hits: number
  misses: number
  falseAlarms: number
  correctRejects: number
  accuracy: number
  dPrime: number
}
