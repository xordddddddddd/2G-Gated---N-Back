import { emptyStreamScores } from './history'
import type { SessionStats, Stream, StreamScores, TrialResult } from '../types/game'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function computeStreamScores(results: TrialResult[]): StreamScores {
  const totals: Record<Stream, number> = { position: 0, letter: 0, color: 0, shape: 0 }
  const correct: Record<Stream, number> = { position: 0, letter: 0, color: 0, shape: 0 }

  for (const result of results) {
    for (const stream of result.activeStreams) {
      totals[stream]++
      if (result.streamCorrect?.[stream]) correct[stream]++
    }
  }

  return {
    position: totals.position ? Math.round((correct.position / totals.position) * 100) : 0,
    letter: totals.letter ? Math.round((correct.letter / totals.letter) * 100) : 0,
    color: totals.color ? Math.round((correct.color / totals.color) * 100) : 0,
    shape: totals.shape ? Math.round((correct.shape / totals.shape) * 100) : 0,
  }
}

export function computeStats(results: TrialResult[]): SessionStats {
  const hits = results.filter((r) => r.feedback === 'hit').length
  const misses = results.filter((r) => r.feedback === 'miss').length
  const falseAlarms = results.filter((r) => r.feedback === 'false-alarm').length
  const correctRejects = results.filter((r) => r.feedback === 'correct-reject').length
  const total = results.length

  const hitRate = hits / Math.max(hits + misses, 1)
  const faRate = falseAlarms / Math.max(falseAlarms + correctRejects, 1)

  const zHit = inverseNormalCDF(clamp(hitRate, 0.01, 0.99))
  const zFa = inverseNormalCDF(clamp(faRate, 0.01, 0.99))
  const streamScores = computeStreamScores(results)
  const streamValues = Object.values(streamScores).filter((v) => v > 0)
  const avgStream =
    streamValues.length > 0
      ? streamValues.reduce((a, b) => a + b, 0) / streamValues.length
      : total > 0
        ? Math.round(((hits + correctRejects) / total) * 100)
        : 0

  return {
    hits,
    misses,
    falseAlarms,
    correctRejects,
    accuracy: total > 0 ? (hits + correctRejects) / total : 0,
    dPrime: zHit - zFa,
    streamScores: streamScores.position + streamScores.letter + streamScores.color + streamScores.shape > 0
      ? streamScores
      : { ...emptyStreamScores(), position: avgStream },
  }
}

function inverseNormalCDF(p: number): number {
  const a1 = -39.6968302866538
  const a2 = 220.946098424521
  const a3 = -275.928510446969
  const a4 = 138.357751867269
  const a5 = -30.6647980661472
  const a6 = 2.50662827745924
  const b1 = -54.4760987982241
  const b2 = 161.585836858041
  const b3 = -155.698979859887
  const b4 = 66.8013118877197
  const b5 = -13.2806815528857
  const c1 = -0.00778489400243029
  const c2 = -0.322396458041136
  const c3 = -2.40075827716184
  const c4 = -2.54973253934373
  const c5 = 4.37466414146497
  const c6 = 2.93816398285779
  const d1 = 0.00778469570904146
  const d2 = 0.32246712907004
  const d3 = 2.445134137143
  const d4 = 3.75440866190742
  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q: number
  let r: number

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    )
  }

  if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    )
  }

  q = Math.sqrt(-2 * Math.log(1 - p))
  return (
    -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
    ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  )
}

export function suggestNLevel(stats: SessionStats, current: number): number {
  const avg =
    (stats.streamScores.position +
      stats.streamScores.letter +
      stats.streamScores.color +
      stats.streamScores.shape) /
    4
  if (avg >= 80 && stats.dPrime >= 1.5) {
    return Math.min(current + 1, 9)
  }
  if (avg < 55 || stats.dPrime < 0.5) {
    return Math.max(current - 1, 1)
  }
  return current
}
