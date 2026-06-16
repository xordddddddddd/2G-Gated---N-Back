import {
  COLORS,
  NUMBERS_8,
  TWO_G_INPUT_PAIRS,
  TWO_G_SESSION_BLOCKS,
  get2GBlockIndex,
  get2GBlockLength,
  getLettersForMode,
  getShapesForMode,
  getStreamsForMode,
} from './constants'
import { randomPosition3D } from './grid3d'
import { pickVariableIntervalMs } from './twoG'
import type { GameSettings, InputGate, OutputGate, Stimulus, Stream, Trial } from '../types/game'

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomPosition(gridMode: GameSettings['gridMode']): number {
  return gridMode === '3d' ? randomPosition3D() : Math.floor(Math.random() * 9)
}

function createStimulus(
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode' | 'gameMode'>,
  overrides: Partial<Stimulus> = {},
): Stimulus {
  const letters = getLettersForMode(settings.audioMode)
  const shapes = getShapesForMode(settings.shapeMode)
  return {
    position: randomPosition(settings.gridMode),
    orangePosition: randomPosition(settings.gridMode),
    letter: randomItem(letters),
    number: randomItem(NUMBERS_8),
    color: randomItem(COLORS).id,
    shape: randomItem(shapes).id,
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

function build2GTrialMeta(
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

function copyStreamFrom(target: Stimulus, source: Stimulus, gate: InputGate): Stimulus {
  return {
    position: gate.position ? source.position : target.position,
    orangePosition: gate.orangePosition ? source.orangePosition : target.orangePosition,
    letter: gate.letter ? source.letter : target.letter,
    number: gate.number ? source.number : target.number,
    color: gate.color ? source.color : target.color,
    shape: gate.shape ? source.shape : target.shape,
  }
}

function randomStreamValue(
  stream: Stream,
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode'>,
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
      let value = randomItem(COLORS).id
      while (value === avoid) value = randomItem(COLORS).id
      return value
    }
    case 'shape': {
      let value = randomItem(shapes).id
      while (value === avoid) value = randomItem(shapes).id
      return value
    }
  }
}

function applyInterference(
  stimulus: Stimulus,
  trials: Trial[],
  currentIndex: number,
  nLevel: number,
  gate: InputGate,
  interference: number,
  gameMode: GameSettings['gameMode'],
): Stimulus {
  if (Math.random() >= interference || currentIndex < nLevel + 2) return stimulus
  const pastIndex = Math.floor(Math.random() * Math.min(currentIndex - 1, nLevel * 2))
  const past = trials[pastIndex]?.stimulus
  if (!past) return stimulus

  const active = getStreamsForMode(gameMode).filter((s) => gate[s])
  if (active.length === 0) return stimulus
  const stream = randomItem(active)
  return { ...stimulus, [stream]: past[stream] }
}

function generateMatchTrial(
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode' | 'gameMode'>,
): Stimulus {
  const base = createStimulus(settings)
  const activeStreams = getStreamsForMode(settings.gameMode).filter((s) => gate[s])

  if (activeStreams.length === 0) return base

  switch (outputGate) {
    case 'or': {
      const matchStream = randomItem(activeStreams)
      return { ...base, [matchStream]: past[matchStream] }
    }
    case 'and':
      return copyStreamFrom(base, past, gate)
    case 'xor': {
      if (activeStreams.length < 2) {
        const matchStream = activeStreams[0]
        return { ...base, [matchStream]: past[matchStream] }
      }
      const matchStream = randomItem(activeStreams)
      const result = copyStreamFrom(base, past, { ...gate, [matchStream]: true })
      for (const stream of activeStreams) {
        if (stream === matchStream) continue
        result[stream] = randomStreamValue(stream, settings, past[stream]) as never
      }
      return result
    }
  }
}

function generateNonMatchTrial(
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode' | 'gameMode'>,
): Stimulus {
  let stimulus = createStimulus(settings)
  let attempts = 0

  while (attempts < 50) {
    const wouldMatch = wouldTrialMatch(stimulus, past, gate, outputGate)
    if (!wouldMatch) return stimulus

    const activeStreams = getStreamsForMode(settings.gameMode).filter((s) => gate[s])

    for (const stream of activeStreams) {
      if (stimulus[stream] === past[stream]) {
        stimulus = {
          ...stimulus,
          [stream]: randomStreamValue(stream, settings, past[stream]),
        }
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
): boolean {
  const active = getActiveStreamsFromGate(gate)
  const matches = active.map((s) => current[s] === past[s])
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

function getActiveStreamsFromGate(gate: InputGate): Stream[] {
  const streams: Stream[] = []
  if (gate.position) streams.push('position')
  if (gate.orangePosition) streams.push('orangePosition')
  if (gate.letter) streams.push('letter')
  if (gate.number) streams.push('number')
  if (gate.color) streams.push('color')
  if (gate.shape) streams.push('shape')
  return streams
}

export function generateTrials(settings: GameSettings): Trial[] {
  const nLevel = settings.nLevel
  const trials: Trial[] = []

  if (settings.gameMode === '2g') {
    const blockLength = get2GBlockLength(nLevel)
    const totalTrials = TWO_G_SESSION_BLOCKS * blockLength

    const blockKeySwaps = new Map<number, boolean>()
    const blockOutputGates = new Map<number, OutputGate>()

    for (let i = 0; i < totalTrials; i++) {
      const posInBlock = i % blockLength
      const blockIndex = get2GBlockIndex(i, nLevel)
      const inputGate = pickInputGate(i, settings)
      const outputGate = pickBlockOutputGate(blockIndex, settings.outputGateMode, blockOutputGates)
      const meta = build2GTrialMeta(i, settings, blockKeySwaps)

      if (posInBlock < nLevel) {
        trials.push({ stimulus: createStimulus(settings), inputGate, outputGate, ...meta })
        continue
      }

      const past = trials[i - nLevel].stimulus
      const shouldMatch = Math.random() < settings.matchProbability
      let stimulus = shouldMatch
        ? generateMatchTrial(past, inputGate, outputGate, settings)
        : generateNonMatchTrial(past, inputGate, outputGate, settings)

      stimulus = applyInterference(
        stimulus,
        trials,
        i,
        nLevel,
        inputGate,
        settings.interference,
        settings.gameMode,
      )
      trials.push({ stimulus, inputGate, outputGate, ...meta })
    }

    return trials
  }

  for (let i = 0; i < nLevel; i++) {
    trials.push({
      stimulus: createStimulus(settings),
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
      ? generateMatchTrial(past, inputGate, outputGate, settings)
      : generateNonMatchTrial(past, inputGate, outputGate, settings)

    stimulus = applyInterference(
      stimulus,
      trials,
      idx,
      nLevel,
      inputGate,
      settings.interference,
      settings.gameMode,
    )

    trials.push({ stimulus, inputGate, outputGate })
  }

  return trials
}

export function createIdleStimulus(): Stimulus {
  return {
    position: 4,
    orangePosition: 0,
    letter: 'C',
    number: '1',
    color: 'blue',
    shape: 'circle',
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
