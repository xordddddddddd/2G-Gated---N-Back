export type Stream = 'position' | 'letter' | 'color' | 'shape'

export type OutputGate = 'or' | 'and' | 'xor'

export type OutputGateMode = 'random' | OutputGate

export type ResponseMode = 'per-stream' | 'gated'

export type GameMode = 'quad' | 'dual' | '2g'

export type GamePhase = 'ready' | 'playing' | 'paused' | 'results'

export type TrialFeedback = 'hit' | 'miss' | 'false-alarm' | 'correct-reject' | null

export type FeedbackMode = 'show' | 'hide'

export type AudioMode = '5-syllables' | '8-syllables'

export type ColorMode = 'generative' | 'standard'

export type ShapeMode = 'all' | 'basic'

export type GridMode = '2d'

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

export interface StreamScores {
  position: number
  letter: number
  color: number
  shape: number
}

export interface GameSettings {
  gameMode: GameMode
  nLevel: number
  trialCount: number
  intervalMs: number
  matchProbability: number
  interference: number
  gridMode: GridMode
  audioMode: AudioMode
  colorMode: ColorMode
  shapeMode: ShapeMode
  feedbackMode: FeedbackMode
  rotationSpeed: number
  autoProgression: boolean
  autoProgressionThreshold: number
  winAfter: number
  soundEnabled: boolean
  adaptive: boolean
  feedbackSounds: boolean
  keys: StreamKeys
  responseMode: ResponseMode
  outputGateMode: OutputGateMode
  enableInputGating: boolean
  enabledStreams: InputGate
  showTrialCounter: boolean
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
  streamCorrect: Partial<Record<Stream, boolean>>
}

export interface SessionStats {
  hits: number
  misses: number
  falseAlarms: number
  correctRejects: number
  accuracy: number
  dPrime: number
  streamScores: StreamScores
}

export interface GameSession {
  id: string
  date: string
  gameLabel: string
  nLevel: number
  totalScore: number
  streamScores: StreamScores
  durationMs: number
  cancelled: boolean
}

export interface DailyPlayTime {
  date: string
  ms: number
}
