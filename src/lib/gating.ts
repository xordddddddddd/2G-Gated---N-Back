import type { InputGate, OutputGate, Stimulus, Stream } from '../types/game'

export function getActiveStreams(gate: InputGate): Stream[] {
  const streams: Stream[] = []
  if (gate.position) streams.push('position')
  if (gate.orangePosition) streams.push('orangePosition')
  if (gate.letter) streams.push('letter')
  if (gate.number) streams.push('number')
  if (gate.color) streams.push('color')
  if (gate.shape) streams.push('shape')
  return streams
}

export function streamMatches(
  stream: Stream,
  current: Stimulus,
  past: Stimulus,
): boolean {
  switch (stream) {
    case 'position':
      return current.position === past.position
    case 'orangePosition':
      return current.orangePosition === past.orangePosition
    case 'letter':
      return current.letter === past.letter
    case 'number':
      return current.number === past.number
    case 'color':
      return current.color === past.color
    case 'shape':
      return current.shape === past.shape
  }
}

export function getStreamMatches(
  current: Stimulus,
  past: Stimulus,
  gate: InputGate,
): Record<Stream, boolean> {
  return {
    position: gate.position && streamMatches('position', current, past),
    orangePosition: gate.orangePosition && streamMatches('orangePosition', current, past),
    letter: gate.letter && streamMatches('letter', current, past),
    number: gate.number && streamMatches('number', current, past),
    color: gate.color && streamMatches('color', current, past),
    shape: gate.shape && streamMatches('shape', current, past),
  }
}

export function shouldRespond(
  current: Stimulus,
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
): boolean {
  const active = getActiveStreams(gate)
  if (active.length === 0 || !past) return false

  const matches = active.map((s) => streamMatches(s, current, past))
  const matchCount = matches.filter(Boolean).length

  switch (outputGate) {
    case 'or':
      return matchCount >= 1
    case 'and':
      return matchCount === active.length
    case 'xor':
      return matchCount === 1
  }
}
