import type { GameMode, GameSettings, InputGate, OutputGate, Stream, StreamKeys } from '../types/game'

export const LETTERS_5 = ['C', 'H', 'K', 'L', 'Q'] as const
export const LETTERS_8 = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'] as const
export const LETTERS = LETTERS_8

export const NUMBERS_8 = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

export const COLORS = [
  { id: 'red', hex: '#ef4444', label: 'Red' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue' },
  { id: 'green', hex: '#22c55e', label: 'Green' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
  { id: 'purple', hex: '#a855f7', label: 'Purple' },
  { id: 'orange', hex: '#f97316', label: 'Orange' },
] as const

export const LIME_MARKER_HEX = '#a3e635'
export const ORANGE_MARKER_HEX = '#f97316'

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
  orangePosition: 'Orange',
  letter: 'Audio',
  number: 'Numbers',
  color: 'Color',
  shape: 'Shape',
}

export const TWO_G_STREAM_LABELS: Record<Stream, string> = {
  position: 'Lime',
  orangePosition: 'Orange',
  letter: 'Letters',
  number: 'Numbers',
  color: 'Color',
  shape: 'Shape',
}

export const QUAD_STREAMS: Stream[] = ['color', 'position', 'shape', 'letter']
export const TWO_G_STREAMS: Stream[] = ['position', 'orangePosition', 'letter', 'number']
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
  '2g+': '2G+',
} as const

export const DEFAULT_STREAM_KEYS: StreamKeys = {
  position: 'f',
  orangePosition: 'f',
  letter: 'l',
  number: 'l',
  color: 'f',
  shape: 'j',
}

export const DEFAULT_ENABLED_STREAMS: InputGate = {
  position: true,
  orangePosition: true,
  letter: true,
  number: true,
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
  gridMode: '3d',
  audioMode: '5-syllables',
  colorMode: 'generative',
  shapeMode: 'all',
  feedbackMode: 'show',
  rotationSpeed: 35,
  autoProgression: true,
  autoProgressionThreshold: 0.8,
  autoProgressionLoseThreshold: 0.5,
  winAfter: 1,
  loseAfter: 3,
  tutorialMode: false,
  soundEnabled: true,
  adaptive: true,
  feedbackSounds: false,
  keys: DEFAULT_STREAM_KEYS,
  responseMode: 'per-stream',
  outputGateMode: 'or',
  enableInputGating: false,
  enabledStreams: DEFAULT_ENABLED_STREAMS,
  showTrialCounter: true,
  voiceUri: '',
  responseSwitching: false,
  variableTiming: false,
}

export const INPUT_GATE_PATTERNS: InputGate[] = [
  { position: true, letter: true, orangePosition: false, number: false, color: false, shape: false },
  { position: true, letter: false, orangePosition: false, number: false, color: true, shape: false },
  { position: false, letter: true, orangePosition: false, number: false, color: false, shape: true },
  { position: false, letter: false, orangePosition: false, number: false, color: true, shape: true },
  { position: true, letter: true, orangePosition: false, number: false, color: true, shape: false },
  { position: true, letter: false, orangePosition: false, number: false, color: true, shape: true },
  { position: false, letter: true, orangePosition: false, number: false, color: true, shape: true },
  { position: true, letter: true, orangePosition: false, number: false, color: true, shape: true },
]

/** 2G block-level input pairs — Lime+Letters / Orange+Numbers (i3 / PDF spec). */
export const TWO_G_INPUT_PAIRS: InputGate[] = [
  { position: true, letter: true, orangePosition: false, number: false, color: false, shape: false },
  { position: false, letter: false, orangePosition: true, number: true, color: false, shape: false },
]

export const TWO_G_BLOCK_SCORABLE_TRIALS = 20
export const TWO_G_SESSION_BLOCKS = 10
export const TWO_G_STIMULUS_VISIBLE_MS = 500

export function getStreamsForMode(gameMode: GameMode): Stream[] {
  return gameMode === '2g' || gameMode === '2g+' ? TWO_G_STREAMS : QUAD_STREAMS
}

export function get2GBlockLength(nLevel: number): number {
  return TWO_G_BLOCK_SCORABLE_TRIALS + nLevel
}

export function get2GBlockIndex(trialIndex: number, nLevel: number): number {
  return Math.floor(trialIndex / get2GBlockLength(nLevel))
}

export function is2GBlockStart(trialIndex: number, nLevel: number): boolean {
  return trialIndex % get2GBlockLength(nLevel) === 0
}

export function get2GActivePairLabel(gate: InputGate): string {
  if (gate.position && gate.letter) return 'Lime Position + Letters'
  if (gate.orangePosition && gate.number) return 'Orange Position + Numbers'
  const parts: string[] = []
  if (gate.position) parts.push('Lime')
  if (gate.orangePosition) parts.push('Orange')
  if (gate.letter) parts.push('Letters')
  if (gate.number) parts.push('Numbers')
  if (gate.color) parts.push('Color')
  if (gate.shape) parts.push('Shape')
  return parts.join(' + ') || '—'
}

export function get2GSessionScorableTrials(): number {
  return TWO_G_SESSION_BLOCKS * TWO_G_BLOCK_SCORABLE_TRIALS
}

export function get2GTotalTrials(nLevel: number): number {
  return TWO_G_SESSION_BLOCKS * get2GBlockLength(nLevel)
}

export function is2GTrialScorable(trialIndex: number, nLevel: number): boolean {
  const posInBlock = trialIndex % get2GBlockLength(nLevel)
  return posInBlock >= nLevel
}

export function get2GPlayedIndex(trialIndex: number, nLevel: number): number {
  const blockLength = get2GBlockLength(nLevel)
  const blockIndex = Math.floor(trialIndex / blockLength)
  const posInBlock = trialIndex % blockLength
  return blockIndex * TWO_G_BLOCK_SCORABLE_TRIALS + Math.max(posInBlock - nLevel, 0)
}

export function getLettersForMode(mode: GameSettings['audioMode']): readonly string[] {
  return mode === '5-syllables' ? LETTERS_5 : LETTERS_8
}

export function getShapesForMode(mode: GameSettings['shapeMode']) {
  return mode === 'basic' ? SHAPES_BASIC : SHAPES
}

export const INTERVAL_OPTIONS = [1500, 2000, 2500, 3000, 3500, 4000, 5000]

export const TWO_G_INTERVAL_PRESETS = [3000, 2500, 2000] as const

export const VARIABLE_INTERVAL_MIN_MS = 1500
export const VARIABLE_INTERVAL_MAX_MS = 3500

export const TRIAL_COUNT_OPTIONS = [10, 20, 29, 30, 40, 50, 75, 100]

export const N_LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function getGameLabel(settings: Pick<GameSettings, 'gameMode' | 'nLevel'>): string {
  const prefix =
    settings.gameMode === 'quad'
      ? 'Q'
      : settings.gameMode === 'dual'
        ? 'D'
        : settings.gameMode === '2g+'
          ? '2G+'
          : '2G'
  return `${prefix}${settings.nLevel}B`
}

export const TWO_G_DEFAULT_SETTINGS: Partial<GameSettings> = {
  enableInputGating: true,
  responseMode: 'per-stream',
  outputGateMode: 'random',
  trialCount: get2GSessionScorableTrials(),
  intervalMs: 3000,
  interference: 0.2,
  responseSwitching: true,
  variableTiming: true,
  adaptive: true,
  keys: {
    position: 'f',
    orangePosition: 'f',
    letter: 'l',
    number: 'l',
    color: 'f',
    shape: 'j',
  },
}

export const TWO_G_PLUS_DEFAULT_SETTINGS: Partial<GameSettings> = {
  ...TWO_G_DEFAULT_SETTINGS,
  gameMode: '2g+',
  interference: 0.25,
}
