import { VARIABLE_INTERVAL_MAX_MS, VARIABLE_INTERVAL_MIN_MS } from './constants'
import { getActiveStreams } from './gating'
import { getGatedActivePair, getGatedSecondaryLabel, getGatedSpatialLabel } from './twoGPlus'
import { getKeyForStream, streamFromKey } from './response'
import type { HorizontalTask, InputGate, Stream, StreamKeys } from '../types/game'

export function get2GPairStreams(gate: InputGate): [Stream, Stream] | null {
  const pair = getGatedActivePair(gate)
  if (!pair) return null
  return [pair.spatial, pair.secondary]
}

export function get2GActivePair(gate: InputGate): { spatial: Stream; audio: Stream } | null {
  const pair = getGatedActivePair(gate)
  if (!pair) return null
  return { spatial: pair.spatial, audio: pair.secondary }
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
    const active = getGatedActivePair(gate)
    if (!active) return streamFromKey(key, keys)
    const normalized = key.toLowerCase()
    if (keys[active.spatial].toLowerCase() === normalized) return active.spatial
    if (keys[active.secondary].toLowerCase() === normalized) return active.secondary
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
  const pair = getGatedActivePair(gate)
  if (!pair) return ''

  const spatialKey = getDisplayKeyForStream(pair.spatial, keys, gate, swapped)
  const secondaryKey = getDisplayKeyForStream(pair.secondary, keys, gate, swapped)
  return `${spatialKey}=Spatial · ${secondaryKey}=Secondary`
}

export function get2GSpatialLabel(gate: InputGate): string {
  return getGatedSpatialLabel(gate)
}

export function get2GAudioLabel(gate: InputGate, horizontalTask?: HorizontalTask): string {
  return getGatedSecondaryLabel(gate, horizontalTask)
}

export function getActiveStreamLabels(gate: InputGate, horizontalTask?: HorizontalTask): string {
  const active = getActiveStreams(gate)
  if (active.length === 0) return '—'
  return active
    .map((stream) => {
      if (stream === getGatedActivePair(gate)?.spatial) return getGatedSpatialLabel(gate)
      return getGatedSecondaryLabel(gate, horizontalTask)
    })
    .join(' + ')
}
