import type { HorizontalTask, InputGate, OutputGate, Stimulus, Stream } from '../types/game'
import { getStreamMatchValue } from './twoGPlus'

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
  horizontalTask?: HorizontalTask,
): boolean {
  return (
    getStreamMatchValue(current, stream, horizontalTask) ===
    getStreamMatchValue(past, stream, horizontalTask)
  )
}

export function getStreamMatches(
  current: Stimulus,
  past: Stimulus,
  gate: InputGate,
  horizontalTask?: HorizontalTask,
): Record<Stream, boolean> {
  return {
    position: gate.position && streamMatches('position', current, past, horizontalTask),
    orangePosition:
      gate.orangePosition && streamMatches('orangePosition', current, past, horizontalTask),
    letter: gate.letter && streamMatches('letter', current, past, horizontalTask),
    number: gate.number && streamMatches('number', current, past, horizontalTask),
    color: gate.color && streamMatches('color', current, past, horizontalTask),
    shape: gate.shape && streamMatches('shape', current, past, horizontalTask),
  }
}

export function shouldRespond(
  current: Stimulus,
  past: Stimulus,
  gate: InputGate,
  outputGate: OutputGate,
  horizontalTask?: HorizontalTask,
): boolean {
  const active = getActiveStreams(gate)
  if (active.length === 0 || !past) return false

  const matches = active.map((s) => streamMatches(s, current, past, horizontalTask))
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
