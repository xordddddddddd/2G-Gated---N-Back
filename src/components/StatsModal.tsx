import { useMemo, useState } from 'react'
import {
  formatPlayTime,
  formatRelativeDate,
  getActivityByDay,
  getScoreTrend,
  loadSessions,
  scoreColor,
} from '../lib/history'

interface StatsModalProps {
  open: boolean
  onClose: () => void
}

type Tab = 'recent' | 'chart'

function Heatmap({ activity }: { activity: Map<string, number> }) {
  const days: { date: string; count: number }[] = []
  const today = new Date()
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days.push({ date: key, count: activity.get(key) ?? 0 })
  }

  const max = Math.max(...days.map((d) => d.count), 1)

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/50">Activity</p>
      <div className="grid grid-flow-col gap-[3px] overflow-x-auto pb-2" style={{ gridTemplateRows: 'repeat(7, 12px)' }}>
        {days.map((d) => {
          const intensity = d.count / max
          const bg =
            d.count === 0
              ? '#1a1a1a'
              : intensity > 0.66
                ? '#22c55e'
                : intensity > 0.33
                  ? '#16a34a'
                  : '#14532d'
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} games`}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: bg }}
            />
          )
        })}
      </div>
    </div>
  )
}

function LineChart({ points }: { points: { date: string; score: number }[] }) {
  const width = 480
  const height = 160
  const padding = { top: 10, right: 10, bottom: 24, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const path = useMemo(() => {
    if (points.length === 0) return ''
    const xs = points.map((_, i) => padding.left + (i / Math.max(points.length - 1, 1)) * innerW)
    const ys = points.map((p) => padding.top + innerH - (p.score / 100) * innerH)
    return points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${ys[i]}`).join(' ')
  }, [points, innerW, innerH])

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/50">Average Score</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={width - padding.right}
          y2={padding.top + innerH}
          stroke="#333"
        />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} stroke="#333" />
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padding.top + innerH - (v / 100) * innerH
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#222" strokeDasharray="2 4" />
              <text x={4} y={y + 4} fill="#666" fontSize="9">
                {v}
              </text>
            </g>
          )
        })}
        {path && <path d={path} fill="none" stroke="#2dd4bf" strokeWidth="2" />}
        {points.length === 0 && (
          <text x={width / 2} y={height / 2} fill="#555" fontSize="12" textAnchor="middle">
            Play games to see progress
          </text>
        )}
      </svg>
    </div>
  )
}

export function StatsModal({ open, onClose }: StatsModalProps) {
  const [tab, setTab] = useState<Tab>('recent')
  const [showCancelled, setShowCancelled] = useState(false)

  const sessions = useMemo(() => loadSessions(), [open])
  const filtered = showCancelled ? sessions : sessions.filter((s) => !s.cancelled)
  const activity = useMemo(() => getActivityByDay(sessions), [sessions])
  const trend = useMemo(() => getScoreTrend(sessions.filter((s) => !s.cancelled)), [sessions])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85dvh] overflow-hidden rounded border border-white/20 bg-[#111] text-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 px-4 py-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab('recent')}
            className={[
              'text-sm pb-1 border-b-2',
              tab === 'recent' ? 'border-white text-white' : 'border-transparent text-white/50',
            ].join(' ')}
          >
            Recent Games
          </button>
          <button
            type="button"
            onClick={() => setTab('chart')}
            className={[
              'text-sm pb-1 border-b-2',
              tab === 'chart' ? 'border-white text-white' : 'border-transparent text-white/50',
            ].join(' ')}
          >
            Progress Chart
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === 'recent' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/50 border-b border-white/10">
                  <th className="py-2 pr-3 font-normal">Date</th>
                  <th className="py-2 pr-3 font-normal">Game</th>
                  <th className="py-2 pr-3 font-normal">Total</th>
                  <th className="py-2 pr-3 font-normal">Position</th>
                  <th className="py-2 pr-3 font-normal">Audio</th>
                  <th className="py-2 pr-3 font-normal">Color</th>
                  <th className="py-2 pr-3 font-normal">Shape</th>
                  <th className="py-2 font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-white/40">
                      No games yet — click Play to start
                    </td>
                  </tr>
                )}
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="py-2 pr-3 text-white/70">{formatRelativeDate(s.date)}</td>
                    <td className="py-2 pr-3">{s.gameLabel}</td>
                    <td className="py-2 pr-3 font-medium" style={{ color: scoreColor(s.totalScore) }}>
                      {s.totalScore}%
                    </td>
                    <td className="py-2 pr-3" style={{ color: scoreColor(s.streamScores.position) }}>
                      {s.streamScores.position}%
                    </td>
                    <td className="py-2 pr-3" style={{ color: scoreColor(s.streamScores.letter) }}>
                      {s.streamScores.letter}%
                    </td>
                    <td className="py-2 pr-3" style={{ color: scoreColor(s.streamScores.color) }}>
                      {s.streamScores.color}%
                    </td>
                    <td className="py-2 pr-3" style={{ color: scoreColor(s.streamScores.shape) }}>
                      {s.streamScores.shape}%
                    </td>
                    <td className="py-2 text-white/70">{formatPlayTime(s.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'chart' && (
            <div className="space-y-6">
              <Heatmap activity={activity} />
              <LineChart points={trend} />
              <div className="flex items-center gap-4 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-teal-400 inline-block" /> quad
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          {tab === 'recent' ? (
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
                className="accent-white"
              />
              Show cancelled
            </label>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm border border-white/30 rounded hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
