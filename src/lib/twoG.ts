import { STREAM_LABELS, VARIABLE_INTERVAL_MAX_MS, VARIABLE_INTERVAL_MIN_MS } from './constants'
import { getKeyForStream, streamFromKey } from './response'
import type { InputGate, Stream, StreamKeys } from '../types/game'

export function get2GPairStreams(gate: InputGate): [Stream, Stream] | null {
  if (gate.position && gate.letter && !gate.color && !gate.shape) {
    return ['position', 'letter']
  }
  if (gate.color && gate.shape && !gate.position && !gate.letter) {
    return ['color', 'shape']
  }
  return null
}

export function pickVariableIntervalMs(): number {
  const range = VARIABLE_INTERVAL_MAX_MS - VARIABLE_INTERVAL_MIN_MS
  return VARIABLE_INTERVAL_MIN_MS + Math.floor(Math.random() * (range + 1))
}

export function getDisplayKeyForStream(
  stream: Stream,
  keys: StreamKeys,
  gate: InputGate,
  swapped: boolean,
): string {
  const pair = get2GPairStreams(gate)
  if (!pair || !swapped) return getKeyForStream(stream, keys)

  const [first, second] = pair
  if (stream === first) return keys[second].toUpperCase()
  if (stream === second) return keys[first].toUpperCase()
  return getKeyForStream(stream, keys)
}

export function streamFromKeyFor2G(
  key: string,
  keys: StreamKeys,
  gate: InputGate,
  swapped: boolean,
): Stream | null {
  const pair = get2GPairStreams(gate)
  if (!pair || !swapped) return streamFromKey(key, keys)

  const normalized = key.toLowerCase()
  const [first, second] = pair
  const firstKey = keys[first].toLowerCase()
  const secondKey = keys[second].toLowerCase()

  if (normalized === firstKey) return second
  if (normalized === secondKey) return first

  return streamFromKey(key, keys)
}

export function format2GKeyMapping(
  gate: InputGate,
  keys: StreamKeys,
  swapped: boolean,
): string {
  const pair = get2GPairStreams(gate)
  if (!pair) return ''

  const [first, second] = pair
  const firstKey = getDisplayKeyForStream(first, keys, gate, swapped)
  const secondKey = getDisplayKeyForStream(second, keys, gate, swapped)
  return `${firstKey}=${STREAM_LABELS[first]} · ${secondKey}=${STREAM_LABELS[second]}`
}
