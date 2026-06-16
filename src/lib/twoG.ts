import { TWO_G_STREAM_LABELS, VARIABLE_INTERVAL_MAX_MS, VARIABLE_INTERVAL_MIN_MS } from './constants'
import { getKeyForStream, streamFromKey } from './response'
import type { InputGate, Stream, StreamKeys } from '../types/game'

export function get2GPairStreams(gate: InputGate): [Stream, Stream] | null {
  if (gate.position && gate.letter && !gate.orangePosition && !gate.number) {
    return ['position', 'letter']
  }
  if (gate.orangePosition && gate.number && !gate.position && !gate.letter) {
    return ['orangePosition', 'number']
  }
  return null
}

export function get2GActivePair(gate: InputGate): { spatial: Stream; audio: Stream } | null {
  const pair = get2GPairStreams(gate)
  if (!pair) return null
  return { spatial: pair[0], audio: pair[1] }
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
  if (!pair || !swapped) {
    const active = get2GActivePair(gate)
    if (!active) return streamFromKey(key, keys)
    const normalized = key.toLowerCase()
    if (keys[active.spatial].toLowerCase() === normalized) return active.spatial
    if (keys[active.audio].toLowerCase() === normalized) return active.audio
    return null
  }

  const normalized = key.toLowerCase()
  const [first, second] = pair
  const firstKey = keys[first].toLowerCase()
  const secondKey = keys[second].toLowerCase()

  if (normalized === firstKey) return second
  if (normalized === secondKey) return first

  return null
}

export function format2GKeyMapping(
  gate: InputGate,
  keys: StreamKeys,
  swapped: boolean,
): string {
  const pair = get2GActivePair(gate)
  if (!pair) return ''

  const spatialKey = getDisplayKeyForStream(pair.spatial, keys, gate, swapped)
  const audioKey = getDisplayKeyForStream(pair.audio, keys, gate, swapped)
  return `${spatialKey}=Spatial · ${audioKey}=Audio`
}

export function get2GSpatialLabel(gate: InputGate): string {
  const pair = get2GActivePair(gate)
  if (!pair) return 'Spatial'
  return TWO_G_STREAM_LABELS[pair.spatial]
}

export function get2GAudioLabel(gate: InputGate): string {
  const pair = get2GActivePair(gate)
  if (!pair) return 'Audio'
  return TWO_G_STREAM_LABELS[pair.audio]
}
