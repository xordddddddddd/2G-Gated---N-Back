export type Stream = 'position' | 'letter' | 'color' | 'shape'

export type OutputGate = 'or' | 'and' | 'xor'

export type OutputGateMode = 'random' | OutputGate

export type ResponseMode = 'per-stream' | 'gated'

export type GamePhase = 'menu' | 'tutorial' | 'playing' | 'paused' | 'results'

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

export interface StreamKeys {
  position: string
  color: string
  shape: string
  letter: string
}

export interface GameSettings {
  nLevel: number
  trialCount: number
  intervalMs: number
  soundEnabled: boolean
  adaptive: boolean
  feedbackSounds: boolean
  keys: StreamKeys
  responseMode: ResponseMode
  outputGateMode: OutputGateMode
  enableInputGating: boolean
  enabledStreams: InputGate
  showTrialCounter: boolean
  showOutputGate: boolean
  showWarmupHint: boolean
  matchProbability: number
}

export interface TrialResult {
  trialIndex: number
  responded: boolean
  correct: boolean
  shouldMatch: boolean
  feedback: TrialFeedback
  outputGate: OutputGate
  activeStreams: Stream[]
  pressedStreams: Stream[]
}

export interface SessionStats {
  hits: number
  misses: number
  falseAlarms: number
  correctRejects: number
  accuracy: number
  dPrime: number
}
