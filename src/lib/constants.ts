import type { GameSettings, InputGate, OutputGate, Stream, StreamKeys } from '../types/game'

export const LETTERS_5 = ['C', 'H', 'K', 'L', 'Q'] as const
export const LETTERS_8 = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'] as const
export const LETTERS = LETTERS_8

export const COLORS = [
  { id: 'red', hex: '#ef4444', label: 'Red' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue' },
  { id: 'green', hex: '#22c55e', label: 'Green' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
  { id: 'purple', hex: '#a855f7', label: 'Purple' },
  { id: 'orange', hex: '#f97316', label: 'Orange' },
] as const

export const SHAPES_BASIC = [
  { id: 'circle', label: 'Circle', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
  { id: 'square', label: 'Square', path: 'M4 4h16v16H4V4z' },
  { id: 'triangle', label: 'Triangle', path: 'M12 3L22 21H2L12 3z' },
] as const

export const SHAPES = [
  ...SHAPES_BASIC,
  { id: 'diamond', label: 'Diamond', path: 'M12 2l10 10-10 10L2 12l10-10z' },
  { id: 'star', label: 'Star', path: 'M12 2l2.4 5.8L21 9l-4.8 4.2L17.6 21 12 17.3 6.4 21l1.4-7.8L3 9l6.6-1.2L12 2z' },
  { id: 'hexagon', label: 'Hexagon', path: 'M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z' },
] as const

export const GRID_SIZE = 3
export const GRID_PX = 560
export const CELL_PX = GRID_PX / GRID_SIZE

export const STREAM_LABELS: Record<Stream, string> = {
  position: 'Position',
  letter: 'Audio',
  color: 'Color',
  shape: 'Shape',
}

export const STREAM_DISPLAY_ORDER: Stream[] = ['color', 'position', 'shape', 'letter']

export const OUTPUT_GATE_LABELS: Record<OutputGate, { label: string; symbol: string; description: string }> = {
  or: {
    label: 'OR',
    symbol: '∨',
    description: 'Respond when any active stream matches n-back',
  },
  and: {
    label: 'AND',
    symbol: '∧',
    description: 'Respond only when all active streams match n-back together',
  },
  xor: {
    label: 'XOR',
    symbol: '⊕',
    description: 'Respond when exactly one active stream matches (not both)',
  },
}

export const GAME_MODE_LABELS = {
  quad: 'QUAD',
  dual: 'DUAL',
  '2g': '2G',
} as const

export const DEFAULT_STREAM_KEYS: StreamKeys = {
  position: 'a',
  color: 'f',
  shape: 'j',
  letter: 'l',
}

export const DEFAULT_ENABLED_STREAMS: InputGate = {
  position: true,
  letter: true,
  color: true,
  shape: true,
}

export const DEFAULT_SETTINGS: GameSettings = {
  gameMode: 'quad',
  nLevel: 3,
  trialCount: 29,
  intervalMs: 3000,
  matchProbability: 0.25,
  interference: 0.2,
  gridMode: '2d',
  audioMode: '5-syllables',
  colorMode: 'generative',
  shapeMode: 'all',
  feedbackMode: 'show',
  rotationSpeed: 35,
  autoProgression: true,
  autoProgressionThreshold: 0.8,
  winAfter: 1,
  loseAfter: 2,
  tutorialMode: false,
  soundEnabled: true,
  adaptive: true,
  feedbackSounds: false,
  keys: DEFAULT_STREAM_KEYS,
  responseMode: 'per-stream',
  outputGateMode: 'random',
  enableInputGating: true,
  enabledStreams: DEFAULT_ENABLED_STREAMS,
  showTrialCounter: true,
  voiceUri: '',
}

export const INPUT_GATE_PATTERNS: InputGatePattern[] = [
  { position: true, letter: true, color: false, shape: false },
  { position: true, letter: false, color: true, shape: false },
  { position: false, letter: true, color: false, shape: true },
  { position: false, letter: false, color: true, shape: true },
  { position: true, letter: true, color: true, shape: false },
  { position: true, letter: false, color: true, shape: true },
  { position: false, letter: true, color: true, shape: true },
  { position: true, letter: true, color: true, shape: true },
]

interface InputGatePattern {
  position: boolean
  letter: boolean
  color: boolean
  shape: boolean
}

export function getLettersForMode(mode: GameSettings['audioMode']): readonly string[] {
  return mode === '5-syllables' ? LETTERS_5 : LETTERS_8
}

export function getShapesForMode(mode: GameSettings['shapeMode']) {
  return mode === 'basic' ? SHAPES_BASIC : SHAPES
}

export const INTERVAL_OPTIONS = [1500, 2000, 2500, 3000, 3500, 4000, 5000]

export const TRIAL_COUNT_OPTIONS = [10, 20, 29, 30, 40, 50, 75, 100]

export const N_LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function getGameLabel(settings: Pick<GameSettings, 'gameMode' | 'nLevel'>): string {
  const prefix = settings.gameMode === 'quad' ? 'Q' : settings.gameMode === 'dual' ? 'D' : '2G'
  return `${prefix}${settings.nLevel}B`
}
