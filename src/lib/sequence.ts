import { COLORS, TWO_G_BLOCK_SCORABLE_TRIALS, TWO_G_INPUT_PAIRS, get2GBlockIndex, get2GBlockLength, getLettersForMode, getShapesForMode } from './constants'
import { randomPosition3D } from './grid3d'
import { pickOutputGate } from './response'
import type { GameSettings, InputGate, OutputGate, Stimulus, Trial } from '../types/game'

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomPosition(gridMode: GameSettings['gridMode']): number {
  return gridMode === '3d' ? randomPosition3D() : Math.floor(Math.random() * 9)
}

function createStimulus(
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode'>,
  overrides: Partial<Stimulus> = {},
): Stimulus {
  const letters = getLettersForMode(settings.audioMode)
  const shapes = getShapesForMode(settings.shapeMode)
  return {
    position: randomPosition(settings.gridMode),
    letter: randomItem(letters),
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
      letter: settings.enabledStreams.letter,
      color: false,
      shape: false,
    }
  }
  if (settings.gameMode === 'quad') {
    return { ...settings.enabledStreams }
  }
  if (settings.gameMode === '2g') {
    const blockIndex = get2GBlockIndex(index, settings.nLevel)
    const pair = TWO_G_INPUT_PAIRS[blockIndex % TWO_G_INPUT_PAIRS.length]
    return {
      position: pair.position && settings.enabledStreams.position,
      letter: pair.letter && settings.enabledStreams.letter,
      color: pair.color && settings.enabledStreams.color,
      shape: pair.shape && settings.enabledStreams.shape,
    }
  }
  return { ...settings.enabledStreams }
}

function copyStreamFrom(target: Stimulus, source: Stimulus, gate: InputGate): Stimulus {
  return {
    position: gate.position ? source.position : target.position,
    letter: gate.letter ? source.letter : target.letter,
    color: gate.color ? source.color : target.color,
    shape: gate.shape ? source.shape : target.shape,
  }
}

function applyInterference(
  stimulus: Stimulus,
  trials: Trial[],
  currentIndex: number,
  nLevel: number,
  gate: InputGate,
  interference: number,
): Stimulus {
  if (Math.random() >= interference || currentIndex < nLevel + 2) return stimulus
  const pastIndex = Math.floor(Math.random() * Math.min(currentIndex - 1, nLevel * 2))
  const past = trials[pastIndex]?.stimulus
  if (!past) return stimulus

  const active = (['position', 'letter', 'color', 'shape'] as const).filter((s) => gate[s])
  if (active.length === 0) return stimulus
  const stream = randomItem(active)
  return { ...stimulus, [stream]: past[stream] }
}

function generateMatchTrial(
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
  settings: Pick<GameSettings, 'audioMode' | 'shapeMode' | 'gridMode'>,
): Stimulus {
  const base = createStimulus(settings)
  const activeStreams = (['position', 'letter', 'color', 'shape'] as const).filter((s) => gate[s])

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
      const letters = getLettersForMode(settings.audioMode)
      const shapes = getShapesForMode(settings.shapeMode)
      for (const stream of activeStreams) {
        if (stream === matchStream) continue
        if (stream === 'position') {
          let value = result.position
          while (value === past.position) value = randomPosition(settings.gridMode)
          result.position = value
        } else if (stream === 'letter') {
          let value = result.letter
          while (value === past.letter) value = randomItem(letters)
          result.letter = value
        } else if (stream === 'color') {
          let value = result.color
          while (value === past.color) value = randomItem(COLORS).id
          result.color = value
        } else {
          let value = result.shape
          while (value === past.shape) value = randomItem(shapes).id
          result.shape = value
        }
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
): Stimulus {
  let stimulus = createStimulus(settings)
  let attempts = 0
  const letters = getLettersForMode(settings.audioMode)
  const shapes = getShapesForMode(settings.shapeMode)

  while (attempts < 50) {
    const wouldMatch = wouldTrialMatch(stimulus, past, gate, outputGate)
    if (!wouldMatch) return stimulus

    const activeStreams = (['position', 'letter', 'color', 'shape'] as const).filter((s) => gate[s])

    for (const stream of activeStreams) {
      if (stimulus[stream] === past[stream]) {
        if (stream === 'position') stimulus = { ...stimulus, position: randomPosition(settings.gridMode) }
        else if (stream === 'letter') stimulus = { ...stimulus, letter: randomItem(letters) }
        else if (stream === 'color') stimulus = { ...stimulus, color: randomItem(COLORS).id }
        else stimulus = { ...stimulus, shape: randomItem(shapes).id }
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
  const active = (['position', 'letter', 'color', 'shape'] as const).filter((s) => gate[s])
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

export function generateTrials(settings: GameSettings): Trial[] {
  const nLevel = settings.nLevel
  const trials: Trial[] = []

  if (settings.gameMode === '2g') {
    const blockLength = get2GBlockLength(nLevel)
    const numBlocks = Math.max(1, Math.ceil(settings.trialCount / TWO_G_BLOCK_SCORABLE_TRIALS))
    const totalTrials = numBlocks * blockLength

    for (let i = 0; i < totalTrials; i++) {
      const posInBlock = i % blockLength
      const inputGate = pickInputGate(i, settings)
      const outputGate = pickOutputGate(i, settings.outputGateMode, settings.gameMode, settings.nLevel)

      if (posInBlock < nLevel) {
        trials.push({ stimulus: createStimulus(settings), inputGate, outputGate })
        continue
      }

      const past = trials[i - nLevel].stimulus
      const shouldMatch = Math.random() < settings.matchProbability
      let stimulus = shouldMatch
        ? generateMatchTrial(past, inputGate, outputGate, settings)
        : generateNonMatchTrial(past, inputGate, outputGate, settings)

      stimulus = applyInterference(stimulus, trials, i, nLevel, inputGate, settings.interference)
      trials.push({ stimulus, inputGate, outputGate })
    }

    return trials
  }

  for (let i = 0; i < nLevel; i++) {
    trials.push({
      stimulus: createStimulus(settings),
      inputGate: pickInputGate(i, settings),
      outputGate: pickOutputGate(i, settings.outputGateMode, settings.gameMode, settings.nLevel),
    })
  }

  for (let i = 0; i < settings.trialCount; i++) {
    const idx = nLevel + i
    const past = trials[idx - nLevel].stimulus
    const inputGate = pickInputGate(idx, settings)
    const outputGate = pickOutputGate(idx, settings.outputGateMode, settings.gameMode, settings.nLevel)
    const shouldMatch = Math.random() < settings.matchProbability

    let stimulus = shouldMatch
      ? generateMatchTrial(past, inputGate, outputGate, settings)
      : generateNonMatchTrial(past, inputGate, outputGate, settings)

    stimulus = applyInterference(stimulus, trials, idx, nLevel, inputGate, settings.interference)

    trials.push({ stimulus, inputGate, outputGate })
  }

  return trials
}

export function createIdleStimulus(): Stimulus {
  return {
    position: 4,
    letter: 'C',
    color: 'blue',
    shape: 'circle',
  }
}

export function createIdleGate(): InputGate {
  return { position: true, letter: true, color: true, shape: true }
}
