import type { DailyPlayTime, GameSession, StreamScores } from '../types/game'

const SESSIONS_KEY = '2g-nback-sessions'
const PLAYTIME_KEY = '2g-nback-playtime'

export function loadSessions(): GameSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? (JSON.parse(raw) as GameSession[]) : []
  } catch {
    return []
  }
}

export function saveSession(session: GameSession): void {
  const sessions = loadSessions()
  sessions.unshift(session)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 200)))
}

export function getTodayPlayTimeMs(): number {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(PLAYTIME_KEY)
    const entries: DailyPlayTime[] = raw ? JSON.parse(raw) : []
    return entries.find((e) => e.date === today)?.ms ?? 0
  } catch {
    return 0
  }
}

export function addPlayTime(ms: number): void {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(PLAYTIME_KEY)
    const entries: DailyPlayTime[] = raw ? JSON.parse(raw) : []
    const idx = entries.findIndex((e) => e.date === today)
    if (idx >= 0) entries[idx].ms += ms
    else entries.push({ date: today, ms })
    localStorage.setItem(PLAYTIME_KEY, JSON.stringify(entries.slice(-400)))
  } catch {
    // ignore
  }
}

export function formatPlayTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString()
}

export function scoreColor(pct: number): string {
  if (pct >= 70) return '#22c55e'
  if (pct >= 50) return '#eab308'
  return '#ef4444'
}

export function emptyStreamScores(): StreamScores {
  return { position: 0, orangePosition: 0, letter: 0, number: 0, color: 0, shape: 0 }
}

export function getActivityByDay(sessions: GameSession[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    const day = s.date.slice(0, 10)
    map.set(day, (map.get(day) ?? 0) + 1)
  }
  return map
}

export function getScoreTrend(sessions: GameSession[]): { date: string; score: number }[] {
  return [...sessions]
    .reverse()
    .slice(-30)
    .map((s) => ({ date: s.date.slice(0, 10), score: s.totalScore }))
}
