import { useState } from 'react'
import { SettingsPanel } from './SettingsPanel'
import type { GameSettings } from '../types/game'

interface MenuScreenProps {
  settings: GameSettings
  onStart: () => void
  onStartTutorial: () => void
  onUpdateSettings: (partial: Partial<GameSettings>) => void
  onResetSettings: () => void
}

type MenuTab = 'home' | 'settings'

export function MenuScreen({
  settings,
  onStart,
  onStartTutorial,
  onUpdateSettings,
  onResetSettings,
}: MenuScreenProps) {
  const [tab, setTab] = useState<MenuTab>('home')

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-center gap-1 p-4 border-b border-border bg-surface-raised">
        {(['home', 'settings'] as MenuTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-colors',
              tab === t
                ? 'bg-accent text-white'
                : 'text-muted hover:text-text hover:bg-surface-overlay',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </header>

      <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
        <div className="w-full max-w-lg space-y-6">
          {tab === 'home' && (
            <>
              <header className="text-center space-y-3 pt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-medium">
                  2G Gated N-Back
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Quad Training</h1>
                <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
                  Stimuli appear on the grid. Press the matching stream key — Position (A), Color (F),
                  Shape (J), Audio (L).
                </p>
              </header>

              <div className="p-4 rounded-xl bg-surface-raised border border-border text-sm text-muted space-y-2">
                <p>
                  <span className="text-text font-medium">{settings.nLevel}-Back</span>
                  {' · '}
                  {settings.trialCount} trials
                  {' · '}
                  {settings.intervalMs / 1000}s interval
                </p>
                <p>Customize everything in the Settings tab.</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={onStart}
                  className="w-full py-4 rounded-xl bg-accent hover:bg-accent-dim text-white font-semibold text-lg transition-colors"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={onStartTutorial}
                  className="w-full py-3 rounded-xl border border-border text-muted hover:text-text hover:bg-surface-raised transition-colors"
                >
                  Tutorial
                </button>
              </div>
            </>
          )}

          {tab === 'settings' && (
            <SettingsPanel
              settings={settings}
              onUpdate={onUpdateSettings}
              onReset={onResetSettings}
            />
          )}
        </div>
      </div>
    </div>
  )
}
