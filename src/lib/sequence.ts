import {
  COLORS,
  NUMBERS_8,
  TWO_G_INPUT_PAIRS,
  TWO_G_SESSION_BLOCKS,
  get2GBlockIndex,
  get2GBlockLength,
  getLettersForMode,
  getShapesForMode,
} from './constants'
import type { GenerativeShape } from './generativeShapes'
import { randomPosition3D } from './grid3d'
import { getActiveStreams } from './gating'
import { getStreamMatchValue } from './twoGPlus'
import {
  createEmotionField,
  createGenerativeShapeField,
  createStroopFields,
  get2GPlusBlockConfig,
  is2GPlus,
  resolveGenerativeShapeCatalog,
} from './twoGPlus'
import { pickVariableIntervalMs } from './twoG'
import type {
  GameSettings,
  HorizontalTask,
  InputGate,
  OutputGate,
  Stimulus,
  Stream,
  Trial,
} from '../types/game'

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomPosition(gridMode: GameSettings['gridMode']): number {
  return gridMode === '3d' ? randomPosition3D() : Math.floor(Math.random() * 9)
}

function createStimulus(
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode'>,
  generativeCatalog: GenerativeShape[],
  overrides: Partial<Stimulus> = {},
): Stimulus {
  const letters = getLettersForMode(settings.audioMode)
  const shapes = getShapesForMode(settings.shapeMode)
  const stroop = createStroopFields()
  return {
    position: randomPosition(settings.gridMode),
    orangePosition: randomPosition(settings.gridMode),
    letter: randomItem(letters),
    number: randomItem(NUMBERS_8),
    color: randomItem(COLORS).id,
    shape: randomItem(shapes).id,
    stroopWord: stroop.stroopWord,
    stroopInk: stroop.stroopInk,
    generativeShape: createGenerativeShapeField(generativeCatalog),
    emotion: createEmotionField(),
    ...overrides,
  }
}

function pickInputGate(
  index: number,
  settings: Pick<GameSettings, 'enableInputGating' | 'enabledStreams' | 'gameMode' | 'nLevel'>,
): InputGate {
  if (settings.gameMode === 'dual') {
    return {
      position: settings.enabledStreams.position,
      orangePosition: false,
      letter: settings.enabledStreams.letter,
      number: false,
      color: false,
      shape: false,
    }
  }
  if (settings.gameMode === 'quad') {
    return {
      position: settings.enabledStreams.position,
      orangePosition: false,
      letter: settings.enabledStreams.letter,
      number: false,
      color: settings.enabledStreams.color,
      shape: settings.enabledStreams.shape,
    }
  }
  if (settings.gameMode === '2g') {
    const blockIndex = get2GBlockIndex(index, settings.nLevel)
    const pair = TWO_G_INPUT_PAIRS[blockIndex % TWO_G_INPUT_PAIRS.length]
    return { ...pair }
  }
  return { ...settings.enabledStreams }
}

function pickGatedBlockMeta(
  blockIndex: number,
  gameMode: GameSettings['gameMode'],
): { inputGate: InputGate; horizontalTask: HorizontalTask } {
  if (gameMode === '2g+') {
    const config = get2GPlusBlockConfig(blockIndex)
    return { inputGate: config.gate, horizontalTask: config.task }
  }
  const pair = TWO_G_INPUT_PAIRS[blockIndex % TWO_G_INPUT_PAIRS.length]
  return { inputGate: pair, horizontalTask: 'standard' }
}

function pickBlockOutputGate(
  blockIndex: number,
  mode: GameSettings['outputGateMode'],
  blockGates: Map<number, OutputGate>,
): OutputGate {
  if (mode !== 'random') return mode
  if (!blockGates.has(blockIndex)) {
    const gates: OutputGate[] = ['or', 'and', 'xor']
    blockGates.set(blockIndex, randomItem(gates))
  }
  return blockGates.get(blockIndex)!
}

function buildGatedTrialMeta(
  trialIndex: number,
  settings: Pick<GameSettings, 'nLevel' | 'intervalMs' | 'responseSwitching' | 'variableTiming'>,
  blockKeySwaps: Map<number, boolean>,
): Pick<Trial, 'intervalMs' | 'keysSwapped'> {
  const blockIndex = get2GBlockIndex(trialIndex, settings.nLevel)
  let keysSwapped = false
  if (settings.responseSwitching) {
    if (!blockKeySwaps.has(blockIndex)) {
      blockKeySwaps.set(blockIndex, Math.random() < 0.5)
    }
    keysSwapped = blockKeySwaps.get(blockIndex)!
  }
  return {
    intervalMs: settings.variableTiming ? pickVariableIntervalMs() : settings.intervalMs,
    keysSwapped,
  }
}

function copyStreamFrom(
  target: Stimulus,
  source: Stimulus,
  gate: InputGate,
  horizontalTask?: HorizontalTask,
): Stimulus {
  const result = { ...target }
  for (const stream of getActiveStreams(gate)) {
    if (horizontalTask === 'stroop' && stream === 'color') {
      result.stroopInk = source.stroopInk
      result.stroopWord = source.stroopWord
    } else if (horizontalTask === 'generative' && stream === 'shape') {
      result.generativeShape = source.generativeShape
    } else if (horizontalTask === 'emotional' && stream === 'letter') {
      result.emotion = source.emotion
    } else {
      result[stream] = source[stream] as never
    }
  }
  return result
}

function randomStreamValue(
  stream: Stream,
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode'>,
  generativeCatalog: GenerativeShape[],
  horizontalTask?: HorizontalTask,
  avoid?: string | number,
): string | number {
  const letters = getLettersForMode(settings.audioMode)
  const shapes = getShapesForMode(settings.shapeMode)
  switch (stream) {
    case 'position':
    case 'orangePosition': {
      let value = randomPosition(settings.gridMode)
      while (value === avoid) value = randomPosition(settings.gridMode)
      return value
    }
    case 'letter': {
      if (horizontalTask === 'emotional') {
        let value = createEmotionField()
        while (value === avoid) value = createEmotionField()
        return value
      }
      let value = randomItem(letters)
      while (value === avoid) value = randomItem(letters)
      return value
    }
    case 'number': {
      let value = randomItem(NUMBERS_8)
      while (value === avoid) value = randomItem(NUMBERS_8)
      return value
    }
    case 'color': {
      if (horizontalTask === 'stroop') {
        const stroop = createStroopFields()
        let ink = stroop.stroopInk
        while (ink === avoid) {
          const next = createStroopFields()
          ink = next.stroopInk
        }
        return ink
      }
      let value = randomItem(COLORS).id
      while (value === avoid) value = randomItem(COLORS).id
      return value
    }
    case 'shape': {
      if (horizontalTask === 'generative') {
        let value = createGenerativeShapeField(generativeCatalog)
        while (value === avoid) value = createGenerativeShapeField(generativeCatalog)
        return value
      }
      let value = randomItem(shapes).id
      while (value === avoid) value = randomItem(shapes).id
      return value
    }
  }
}

function applyStreamValue(
  stimulus: Stimulus,
  stream: Stream,
  value: string | number,
  horizontalTask?: HorizontalTask,
): Stimulus {
  if (horizontalTask === 'stroop' && stream === 'color') {
    const stroop = createStroopFields()
    return { ...stimulus, stroopInk: String(value), stroopWord: stroop.stroopWord }
  }
  if (horizontalTask === 'generative' && stream === 'shape') {
    return { ...stimulus, generativeShape: String(value) }
  }
  if (horizontalTask === 'emotional' && stream === 'letter') {
    return { ...stimulus, emotion: String(value) }
  }
  return { ...stimulus, [stream]: value }
}

function applyInterference(
  stimulus: Stimulus,
  trials: Trial[],
  currentIndex: number,
  nLevel: number,
  gate: InputGate,
  interference: number,
  horizontalTask?: HorizontalTask,
): Stimulus {
  if (Math.random() >= interference || currentIndex < nLevel + 2) return stimulus
  const pastIndex = Math.floor(Math.random() * Math.min(currentIndex - 1, nLevel * 2))
  const past = trials[pastIndex]?.stimulus
  if (!past) return stimulus

  const active = getActiveStreams(gate)
  if (active.length === 0) return stimulus
  const stream = randomItem(active)
  const pastValue = getStreamMatchValue(past, stream, horizontalTask)
  return applyStreamValue(stimulus, stream, pastValue, horizontalTask)
}

function generateMatchTrial(
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode'>,
  generativeCatalog: GenerativeShape[],
  horizontalTask?: HorizontalTask,
): Stimulus {
  const base = createStimulus(settings, generativeCatalog)
  const activeStreams = getActiveStreams(gate)

  if (activeStreams.length === 0) return base

  switch (outputGate) {
    case 'or': {
      const matchStream = randomItem(activeStreams)
      return copyStreamFrom(base, past, { ...gate, [matchStream]: true }, horizontalTask)
    }
    case 'and':
      return copyStreamFrom(base, past, gate, horizontalTask)
    case 'xor': {
      if (activeStreams.length < 2) {
        const matchStream = activeStreams[0]
        return copyStreamFrom(base, past, { ...gate, [matchStream]: true }, horizontalTask)
      }
      const matchStream = randomItem(activeStreams)
      const result = copyStreamFrom(base, past, { ...gate, [matchStream]: true }, horizontalTask)
      for (const stream of activeStreams) {
        if (stream === matchStream) continue
        const pastVal = getStreamMatchValue(past, stream, horizontalTask)
        const newVal = randomStreamValue(
          stream,
          settings,
          generativeCatalog,
          horizontalTask,
          pastVal,
        )
        Object.assign(result, applyStreamValue(result, stream, newVal, horizontalTask))
      }
      return result
    }
  }
}

function generateNonMatchTrial(
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode'>,
  generativeCatalog: GenerativeShape[],
  horizontalTask?: HorizontalTask,
): Stimulus {
  let stimulus = createStimulus(settings, generativeCatalog)
  let attempts = 0

  while (attempts < 50) {
    const wouldMatch = wouldTrialMatch(stimulus, past, gate, outputGate, horizontalTask)
    if (!wouldMatch) return stimulus

    const activeStreams = getActiveStreams(gate)

    for (const stream of activeStreams) {
      const pastVal = getStreamMatchValue(past, stream, horizontalTask)
      const currentVal = getStreamMatchValue(stimulus, stream, horizontalTask)
      if (currentVal === pastVal) {
        const newVal = randomStreamValue(
          stream,
          settings,
          generativeCatalog,
          horizontalTask,
          pastVal,
        )
        stimulus = applyStreamValue(stimulus, stream, newVal, horizontalTask)
      }
    }
    attempts++
  }

  return stimulus
}

function wouldTrialMatch(
  current: Stimulus,
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
  horizontalTask?: HorizontalTask,
): boolean {
  const active = getActiveStreams(gate)
  const matches = active.map(
    (s) =>
      getStreamMatchValue(current, s, horizontalTask) ===
      getStreamMatchValue(past, s, horizontalTask),
  )
  const matchCount = matches.filter(Boolean).length

  switch (outputGate) {
    case 'or':
      return matchCount >= 1
    case 'and':
      return matchCount === active.length && active.length > 0
    case 'xor':
      return matchCount === 1
  }
}

function generateGatedTrials(
  settings: GameSettings,
  generativeCatalog: GenerativeShape[],
): Trial[] {
  const nLevel = settings.nLevel
  const blockLength = get2GBlockLength(nLevel)
  const totalTrials = TWO_G_SESSION_BLOCKS * blockLength
  const trials: Trial[] = []
  const blockKeySwaps = new Map<number, boolean>()
  const blockOutputGates = new Map<number, OutputGate>()

  for (let i = 0; i < totalTrials; i++) {
    const posInBlock = i % blockLength
    const blockIndex = get2GBlockIndex(i, nLevel)
    const { inputGate, horizontalTask } = pickGatedBlockMeta(blockIndex, settings.gameMode)
    const outputGate = pickBlockOutputGate(blockIndex, settings.outputGateMode, blockOutputGates)
    const meta = buildGatedTrialMeta(i, settings, blockKeySwaps)

    if (posInBlock < nLevel) {
      trials.push({
        stimulus: createStimulus(settings, generativeCatalog),
        inputGate,
        outputGate,
        horizontalTask,
        ...meta,
      })
      continue
    }

    const past = trials[i - nLevel].stimulus
    const shouldMatch = Math.random() < settings.matchProbability
    let stimulus = shouldMatch
      ? generateMatchTrial(past, inputGate, outputGate, settings, generativeCatalog, horizontalTask)
      : generateNonMatchTrial(
          past,
          inputGate,
          outputGate,
          settings,
          generativeCatalog,
          horizontalTask,
        )

    stimulus = applyInterference(
      stimulus,
      trials,
      i,
      nLevel,
      inputGate,
      settings.interference,
      horizontalTask,
    )
    trials.push({ stimulus, inputGate, outputGate, horizontalTask, ...meta })
  }

  return trials
}

export interface GeneratedSession {
  trials: Trial[]
  generativeShapeCatalog: GenerativeShape[]
}

export function generateSession(settings: GameSettings): GeneratedSession {
  const generativeCatalog = is2GPlus(settings.gameMode)
    ? resolveGenerativeShapeCatalog()
    : []

  if (settings.gameMode === '2g' || settings.gameMode === '2g+') {
    return {
      trials: generateGatedTrials(settings, generativeCatalog),
      generativeShapeCatalog: generativeCatalog,
    }
  }

  const nLevel = settings.nLevel
  const trials: Trial[] = []

  for (let i = 0; i < nLevel; i++) {
    trials.push({
      stimulus: createStimulus(settings, []),
      inputGate: pickInputGate(i, settings),
      outputGate: settings.outputGateMode === 'random' ? 'or' : settings.outputGateMode,
    })
  }

  for (let i = 0; i < settings.trialCount; i++) {
    const idx = nLevel + i
    const past = trials[idx - nLevel].stimulus
    const inputGate = pickInputGate(idx, settings)
    const outputGate = settings.outputGateMode === 'random' ? 'or' : settings.outputGateMode
    const shouldMatch = Math.random() < settings.matchProbability

    let stimulus = shouldMatch
      ? generateMatchTrial(past, inputGate, outputGate, settings, [], undefined)
      : generateNonMatchTrial(past, inputGate, outputGate, settings, [], undefined)

    stimulus = applyInterference(
      stimulus,
      trials,
      idx,
      nLevel,
      inputGate,
      settings.interference,
      undefined,
    )

    trials.push({ stimulus, inputGate, outputGate })
  }

  return { trials, generativeShapeCatalog: [] }
}

export function generateTrials(settings: GameSettings): Trial[] {
  return generateSession(settings).trials
}

export function createIdleStimulus(): Stimulus {
  return {
    position: 4,
    orangePosition: 0,
    letter: 'C',
    number: '1',
    color: 'blue',
    shape: 'circle',
    stroopWord: 'RED',
    stroopInk: 'blue',
    generativeShape: 'gen-0',
    emotion: 'neutral',
  }
}

export function createIdleGate(): InputGate {
  return {
    position: true,
    orangePosition: true,
    letter: true,
    number: true,
    color: true,
    shape: true,
  }
}
