import type { GameSettings } from '../types/game'

interface MenuScreenProps {
  settings: GameSettings
  onStart: () => void
  onUpdateSettings: (partial: Partial<GameSettings>) => void
}

export function MenuScreen({ settings, onStart, onUpdateSettings }: MenuScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-6">
      <div className="w-full max-w-lg space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-medium">
            Working Memory Training
          </div>
          <h1 className="text-4xl font-bold tracking-tight">2G Gated N-Back</h1>
          <p className="text-muted text-base leading-relaxed max-w-md mx-auto">
            Train input gating across four information streams and output gating with
            OR, AND, and XOR logic rules.
          </p>
        </header>

        <div className="p-6 rounded-2xl bg-surface-raised border border-border space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Session Settings
          </h2>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">N-Back Level</span>
            <select
              value={settings.nLevel}
              onChange={(e) => onUpdateSettings({ nLevel: Number(e.target.value) })}
              className="bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n}-Back
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Trials per session</span>
            <select
              value={settings.trialCount}
              onChange={(e) => onUpdateSettings({ trialCount: Number(e.target.value) })}
              className="bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {[20, 30, 40, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Stimulus interval</span>
            <select
              value={settings.intervalMs}
              onChange={(e) => onUpdateSettings({ intervalMs: Number(e.target.value) })}
              className="bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={2000}>2.0s</option>
              <option value={2500}>2.5s</option>
              <option value={3000}>3.0s</option>
            </select>
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm">Sound</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
              className="w-5 h-5 rounded accent-accent"
            />
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm">Adaptive difficulty</span>
            <input
              type="checkbox"
              checked={settings.adaptive}
              onChange={(e) => onUpdateSettings({ adaptive: e.target.checked })}
              className="w-5 h-5 rounded accent-accent"
            />
          </label>
        </div>

        <div className="p-5 rounded-2xl bg-surface-raised border border-border space-y-3 text-sm text-muted">
          <h3 className="font-semibold text-text">How to play</h3>
          <ul className="space-y-2 list-disc list-inside leading-relaxed">
            <li>Four streams: position, letter, color, and shape.</li>
            <li>Input gate cues show which streams are active each trial.</li>
            <li>Output gate rules (OR / AND / XOR) define when to respond.</li>
            <li>Press <kbd className="px-1.5 py-0.5 rounded bg-surface-overlay border border-border text-xs text-text">Space</kbd> or tap Match when the rule is satisfied.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="w-full py-4 rounded-xl bg-accent hover:bg-accent-dim text-white font-semibold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
        >
          Start Training
        </button>
      </div>
    </div>
  )
}
