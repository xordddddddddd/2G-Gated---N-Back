import type { InputGate, OutputGate, OutputGateMode, Stream, StreamKeys } from '../types/game'
import { streamMatches, getActiveStreams } from './gating'

export function pickOutputGate(index: number, mode: OutputGateMode): OutputGate {
  if (mode !== 'random') return mode
  const gates: OutputGate[] = ['or', 'and', 'xor']
  return gates[index % gates.length]
}

export function getStreamMatchesForTrial(
  current: { position: number; letter: string; color: string; shape: string },
  past: { position: number; letter: string; color: string; shape: string },
  gate: InputGate,
): Record<Stream, boolean> {
  return {
    position: gate.position && streamMatches('position', current, past),
    letter: gate.letter && streamMatches('letter', current, past),
    color: gate.color && streamMatches('color', current, past),
    shape: gate.shape && streamMatches('shape', current, past),
  }
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

export function streamFromKey(key: string, keys: StreamKeys): Stream | null {
  const normalized = key.toLowerCase()
  for (const stream of ['position', 'color', 'shape', 'letter'] as Stream[]) {
    if (keys[stream].toLowerCase() === normalized) return stream
  }
  return null
}

export function getKeyForStream(stream: Stream, keys: StreamKeys): string {
  return keys[stream].toUpperCase()
}
