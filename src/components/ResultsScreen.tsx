import type { SessionStats } from '../types/game'

interface ResultsScreenProps {
  stats: SessionStats
  nLevel: number
  suggestedN: number
  adaptive: boolean
  onPlayAgain: () => void
  onMenu: () => void
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-4 rounded-xl bg-surface-overlay border border-border text-center">
      <p className="text-xs uppercase tracking-wider text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}

export function ResultsScreen({
  stats,
  nLevel,
  suggestedN,
  adaptive,
  onPlayAgain,
  onMenu,
}: ResultsScreenProps) {
  const accuracyPct = Math.round(stats.accuracy * 100)

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-6">
      <div className="w-full max-w-lg space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Session Complete</h1>
          <p className="text-muted">{nLevel}-Back training results</p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Accuracy" value={`${accuracyPct}%`} />
          <StatCard label="d′" value={stats.dPrime.toFixed(2)} sub="sensitivity" />
          <StatCard label="Hits" value={String(stats.hits)} />
          <StatCard label="Misses" value={String(stats.misses)} />
          <StatCard label="False Alarms" value={String(stats.falseAlarms)} />
          <StatCard label="Correct Rejects" value={String(stats.correctRejects)} />
        </div>

        {adaptive && suggestedN !== nLevel && (
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 text-center">
            <p className="text-sm text-accent font-medium">
              {suggestedN > nLevel
                ? `Great work! Try ${suggestedN}-Back next session.`
                : `Consider ${suggestedN}-Back to build consistency.`}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full py-4 rounded-xl bg-accent hover:bg-accent-dim text-white font-semibold transition-colors"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onMenu}
            className="w-full py-3 rounded-xl border border-border text-muted hover:text-text hover:bg-surface-raised transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}
