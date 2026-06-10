import { COLORS, INPUT_GATE_PATTERNS, LETTERS, SHAPES } from './constants'
import { pickOutputGate } from './gating'
import type { InputGate, OutputGate, Stimulus, Trial } from '../types/game'

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomPosition(): number {
  return Math.floor(Math.random() * 9)
}

function createStimulus(overrides: Partial<Stimulus> = {}): Stimulus {
  return {
    position: randomPosition(),
    letter: randomItem(LETTERS),
    color: randomItem(COLORS).id,
    shape: randomItem(SHAPES).id,
    ...overrides,
  }
}

function pickInputGate(index: number): InputGate {
  return INPUT_GATE_PATTERNS[index % INPUT_GATE_PATTERNS.length]
}

function copyStreamFrom(
  target: Stimulus,
  source: Stimulus,
  gate: InputGate,
): Stimulus {
  return {
    position: gate.position ? source.position : target.position,
    letter: gate.letter ? source.letter : target.letter,
    color: gate.color ? source.color : target.color,
    shape: gate.shape ? source.shape : target.shape,
  }
}

function generateMatchTrial(
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
): Stimulus {
  const base = createStimulus()
  const activeStreams = (['position', 'letter', 'color', 'shape'] as const).filter(
    (s) => gate[s],
  )

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
        if (stream === 'position') {
          let value = result.position
          while (value === past.position) value = randomPosition()
          result.position = value
        } else if (stream === 'letter') {
          let value = result.letter
          while (value === past.letter) value = randomItem(LETTERS)
          result.letter = value
        } else if (stream === 'color') {
          let value = result.color
          while (value === past.color) value = randomItem(COLORS).id
          result.color = value
        } else {
          let value = result.shape
          while (value === past.shape) value = randomItem(SHAPES).id
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
): Stimulus {
  let stimulus = createStimulus()
  let attempts = 0

  while (attempts < 50) {
    const wouldMatch = wouldTrialMatch(stimulus, past, gate, outputGate)
    if (!wouldMatch) return stimulus

    const activeStreams = (['position', 'letter', 'color', 'shape'] as const).filter(
      (s) => gate[s],
    )

    for (const stream of activeStreams) {
      if (stimulus[stream] === past[stream]) {
        if (stream === 'position') stimulus = { ...stimulus, position: randomPosition() }
        else if (stream === 'letter') stimulus = { ...stimulus, letter: randomItem(LETTERS) }
        else if (stream === 'color') stimulus = { ...stimulus, color: randomItem(COLORS).id }
        else stimulus = { ...stimulus, shape: randomItem(SHAPES).id }
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

export function generateTrials(nLevel: number, count: number): Trial[] {
  const trials: Trial[] = []
  const warmup = Math.max(nLevel, 2)

  for (let i = 0; i < warmup; i++) {
    trials.push({
      stimulus: createStimulus(),
      inputGate: pickInputGate(i),
      outputGate: pickOutputGate(i),
    })
  }

  for (let i = warmup; i < count; i++) {
    const past = trials[i - nLevel].stimulus
    const inputGate = pickInputGate(i)
    const outputGate = pickOutputGate(i)
    const shouldMatch = Math.random() < 0.3

    const stimulus = shouldMatch
      ? generateMatchTrial(past, inputGate, outputGate)
      : generateNonMatchTrial(past, inputGate, outputGate)

    trials.push({ stimulus, inputGate, outputGate })
  }

  return trials
}
