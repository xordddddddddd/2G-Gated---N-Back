import { COLORS } from './constants'
import { createGenerativeShapeSet, type GenerativeShape } from './generativeShapes'
import { loadSessions } from './history'
import type { GameMode, HorizontalTask, InputGate, Stimulus, Stream } from '../types/game'
import { getActiveStreams } from './gating'

export const STROOP_WORDS = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE'] as const

export const EMOTIONS = [
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😠', label: 'Angry' },
  { id: 'fear', emoji: '😨', label: 'Fear' },
  { id: 'disgust', emoji: '🤢', label: 'Disgust' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
] as const

const EMPTY_GATE: InputGate = {
  position: false,
  orangePosition: false,
  letter: false,
  number: false,
  color: false,
  shape: false,
}

/** Ten-block horizontal integration schedule (i3 2G+ spec). */
export const TWO_G_PLUS_BLOCK_SCHEDULE: { task: HorizontalTask; gate: InputGate }[] = [
  { task: 'standard', gate: { ...EMPTY_GATE, position: true, letter: true } },
  { task: 'standard', gate: { ...EMPTY_GATE, orangePosition: true, number: true } },
  { task: 'stroop', gate: { ...EMPTY_GATE, position: true, color: true } },
  { task: 'stroop', gate: { ...EMPTY_GATE, orangePosition: true, color: true } },
  { task: 'generative', gate: { ...EMPTY_GATE, position: true, shape: true } },
  { task: 'generative', gate: { ...EMPTY_GATE, orangePosition: true, shape: true } },
  { task: 'emotional', gate: { ...EMPTY_GATE, position: true, letter: true } },
  { task: 'emotional', gate: { ...EMPTY_GATE, orangePosition: true, letter: true } },
  { task: 'standard', gate: { ...EMPTY_GATE, position: true, letter: true } },
  { task: 'standard', gate: { ...EMPTY_GATE, orangePosition: true, number: true } },
]

export function isGatedTrainingMode(mode: GameMode): boolean {
  return mode === '2g' || mode === '2g+'
}

export function is2GPlus(mode: GameMode): boolean {
  return mode === '2g+'
}

export function get2GPlusBlockConfig(blockIndex: number): { task: HorizontalTask; gate: InputGate } {
  return TWO_G_PLUS_BLOCK_SCHEDULE[blockIndex % TWO_G_PLUS_BLOCK_SCHEDULE.length]
}

export function getHorizontalTaskLabel(task: HorizontalTask): string {
  switch (task) {
    case 'standard':
      return 'Standard 2G'
    case 'stroop':
      return 'Stroop — match ink color, ignore word'
    case 'generative':
      return 'Generative — novel shapes (new categories)'
    case 'emotional':
      return 'Emotional — affect stream'
  }
}

export function getGatedActivePair(
  gate: InputGate,
): { spatial: Stream; secondary: Stream } | null {
  const active = getActiveStreams(gate)
  if (active.length !== 2) return null
  const spatial = active.find((s) => s === 'position' || s === 'orangePosition')
  const secondary = active.find((s) => s !== spatial)
  if (!spatial || !secondary) return null
  return { spatial, secondary }
}

export function getStreamMatchValue(
  stimulus: Stimulus,
  stream: Stream,
  horizontalTask?: HorizontalTask,
): string | number {
  if (horizontalTask === 'stroop' && stream === 'color') return stimulus.stroopInk
  if (horizontalTask === 'generative' && stream === 'shape') return stimulus.generativeShape
  if (horizontalTask === 'emotional' && stream === 'letter') return stimulus.emotion
  return stimulus[stream]
}

export function getGatedPairLabel(gate: InputGate, horizontalTask?: HorizontalTask): string {
  const pair = getGatedActivePair(gate)
  if (!pair) return '—'

  const spatial =
    pair.spatial === 'position' ? 'Lime Position' : pair.spatial === 'orangePosition' ? 'Orange Position' : 'Spatial'

  if (horizontalTask === 'stroop' && pair.secondary === 'color') return `${spatial} + Ink Color`
  if (horizontalTask === 'generative' && pair.secondary === 'shape') return `${spatial} + Novel Shape`
  if (horizontalTask === 'emotional' && pair.secondary === 'letter') return `${spatial} + Emotion`
  if (pair.secondary === 'letter') return `${spatial} + Letters`
  if (pair.secondary === 'number') return `${spatial} + Numbers`
  return `${spatial} + ${pair.secondary}`
}

export function getGatedSecondaryLabel(gate: InputGate, horizontalTask?: HorizontalTask): string {
  const pair = getGatedActivePair(gate)
  if (!pair) return 'Secondary'
  if (horizontalTask === 'stroop' && pair.secondary === 'color') return 'Ink Color'
  if (horizontalTask === 'generative' && pair.secondary === 'shape') return 'Novel Shape'
  if (horizontalTask === 'emotional' && pair.secondary === 'letter') return 'Emotion'
  if (pair.secondary === 'letter') return 'Letters'
  if (pair.secondary === 'number') return 'Numbers'
  if (pair.secondary === 'color') return 'Color'
  if (pair.secondary === 'shape') return 'Shape'
  return 'Secondary'
}

export function getGatedSpatialLabel(gate: InputGate): string {
  const pair = getGatedActivePair(gate)
  if (!pair) return 'Spatial'
  if (pair.spatial === 'position') return 'Lime'
  if (pair.spatial === 'orangePosition') return 'Orange'
  return 'Spatial'
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function createStroopFields(): Pick<Stimulus, 'stroopWord' | 'stroopInk'> {
  const word = randomItem(STROOP_WORDS)
  const ink = randomItem(COLORS)
  let inkColor = ink.id
  const wordColor = COLORS.find((c) => c.id === word.toLowerCase())?.id
  if (wordColor === inkColor) {
    const alternatives = COLORS.filter((c) => c.id !== inkColor)
    inkColor = randomItem(alternatives).id
  }
  return { stroopWord: word, stroopInk: inkColor }
}

export function createEmotionField(): string {
  return randomItem(EMOTIONS).id
}

export function createGenerativeShapeField(catalog: GenerativeShape[]): string {
  return randomItem(catalog).id
}

/** i3 regenerates generative categories every two completed sessions. */
export function resolveGenerativeShapeCatalog(): GenerativeShape[] {
  const sessionCount = loadSessions().length
  const seed = Math.floor(sessionCount / 2)
  return createGenerativeShapeSet(6, 1000 + seed * 997)
}

export function getEmotionById(id: string) {
  return EMOTIONS.find((e) => e.id === id) ?? EMOTIONS[0]
}

export function getInkHex(inkId: string): string {
  return COLORS.find((c) => c.id === inkId)?.hex ?? '#ffffff'
}
