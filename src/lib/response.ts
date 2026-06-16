import type {
  HorizontalTask,
  InputGate,
  OutputGate,
  OutputGateMode,
  Stimulus,
  Stream,
  StreamKeys,
  GameMode,
} from '../types/game'
import { getStreamMatches, getActiveStreams } from './gating'

export function pickOutputGate(
  index: number,
  mode: OutputGateMode,
  gameMode?: GameMode,
): OutputGate {
  if (mode !== 'random') return mode
  const gates: OutputGate[] = ['or', 'and', 'xor']
  if (gameMode === '2g') {
    return gates[index % gates.length]
  }
  return gates[index % gates.length]
}

export function getExpectedPressedStreams(
  streamMatchesMap: Record<Stream, boolean>,
  gate: InputGate,
  outputGate: OutputGate,
): Set<Stream> {
  const active = getActiveStreams(gate)
  const expected = new Set<Stream>()

  if (active.length === 0) return expected

  if (outputGate === 'or') {
    for (const stream of active) {
      if (streamMatchesMap[stream]) expected.add(stream)
    }
    return expected
  }

  if (active.length === 1) {
    if (streamMatchesMap[active[0]]) expected.add(active[0])
    return expected
  }

  const [s1, s2] = active
  const m1 = streamMatchesMap[s1]
  const m2 = streamMatchesMap[s2]

  switch (outputGate) {
    case 'xor':
      if (m1 && !m2) expected.add(s1)
      else if (!m1 && m2) expected.add(s2)
      break
    case 'and':
      if (m1 && m2) {
        expected.add(s1)
        expected.add(s2)
      }
      break
  }

  return expected
}

export function evaluate2GResponse(
  pressed: Set<Stream>,
  streamMatchesMap: Record<Stream, boolean>,
  gate: InputGate,
  outputGate: OutputGate,
): { correct: boolean; feedback: 'hit' | 'miss' | 'false-alarm' | 'correct-reject' } {
  const expected = getExpectedPressedStreams(streamMatchesMap, gate, outputGate)
  const active = getActiveStreams(gate)

  for (const stream of pressed) {
    if (!gate[stream]) {
      return { correct: false, feedback: 'false-alarm' }
    }
  }

  for (const stream of active) {
    const shouldPress = expected.has(stream)
    const didPress = pressed.has(stream)
    if (shouldPress !== didPress) {
      return {
        correct: false,
        feedback: shouldPress && !didPress ? 'miss' : 'false-alarm',
      }
    }
  }

  if (expected.size > 0) return { correct: true, feedback: 'hit' }
  return { correct: true, feedback: 'correct-reject' }
}

export function getStreamMatchesForTrial(
  current: Stimulus,
  past: Stimulus,
  gate: InputGate,
  horizontalTask?: HorizontalTask,
): Record<Stream, boolean> {
  return getStreamMatches(current, past, gate, horizontalTask)
}

export function evaluatePerStreamResponse(
  pressed: Set<Stream>,
  streamMatchesMap: Record<Stream, boolean>,
  gate: InputGate,
): { correct: boolean; feedback: 'hit' | 'miss' | 'false-alarm' | 'correct-reject' } {
  const active = getActiveStreams(gate)
  let anyShould = false
  let anyError = false
  let anyHit = false

  for (const stream of active) {
    const should = streamMatchesMap[stream]
    const did = pressed.has(stream)
    if (should) anyShould = true
    if (should && did) anyHit = true
    if (should && !did) anyError = true
    if (!should && did) anyError = true
  }

  if (!anyError && anyShould) return { correct: true, feedback: 'hit' }
  if (!anyError && !anyShould) return { correct: true, feedback: 'correct-reject' }
  if (anyShould && !anyHit && anyError) return { correct: false, feedback: 'miss' }
  if (!anyShould && pressed.size > 0) return { correct: false, feedback: 'false-alarm' }
  if (anyHit && anyError) return { correct: false, feedback: 'false-alarm' }
  return { correct: false, feedback: 'miss' }
}

const ALL_KEY_STREAMS: Stream[] = [
  'position',
  'orangePosition',
  'letter',
  'number',
  'color',
  'shape',
]

export function streamFromKey(key: string, keys: StreamKeys): Stream | null {
  const normalized = key.toLowerCase()
  for (const stream of ALL_KEY_STREAMS) {
    if (keys[stream].toLowerCase() === normalized) return stream
  }
  return null
}

export function getKeyForStream(stream: Stream, keys: StreamKeys): string {
  return keys[stream].toUpperCase()
}
