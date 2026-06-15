import { GAME_MODE_LABELS } from '../lib/constants'
import type { GameMode, GameSettings } from '../types/game'

interface SettingsSidebarProps {
  settings: GameSettings
  onUpdate: (partial: Partial<GameSettings>) => void
  onReset: () => void
  collapsed?: boolean
  onToggle?: () => void
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="tabular-nums text-white/90">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white/80 h-1"
      />
    </label>
  )
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: T
  options: T[]
  labels: Record<T, string>
  onChange: (v: T) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-white/70">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-[#1a1a1a] border border-white/20 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt]}
          </option>
        ))}
      </select>
    </label>
  )
}

const GAME_MODES: GameMode[] = ['quad', 'dual', '2g']

export function SettingsSidebar({ settings, onUpdate, onReset, collapsed, onToggle }: SettingsSidebarProps) {
  const modeIndex = GAME_MODES.indexOf(settings.gameMode)

  const cycleMode = (dir: -1 | 1) => {
    const next = GAME_MODES[(modeIndex + dir + GAME_MODES.length) % GAME_MODES.length]
    onUpdate({ gameMode: next })
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="fixed left-3 top-14 z-20 px-2 py-1 text-xs border border-white/20 rounded hover:bg-white/10"
        aria-label="Open settings"
      >
        Settings
      </button>
    )
  }

  return (
    <aside className="w-[220px] shrink-0 border-r border-white/10 bg-black overflow-y-auto max-h-dvh">
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
        <h2 className="text-sm font-medium text-white/90">Settings</h2>
        {onToggle && (
          <button type="button" onClick={onToggle} className="text-white/50 hover:text-white text-lg leading-none">
            ×
          </button>
        )}
      </div>

      <div className="p-3 space-y-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => cycleMode(-1)}
            className="px-2 py-1 border border-white/20 rounded hover:bg-white/10"
          >
            ‹
          </button>
          <span className="px-3 py-1 rounded bg-pink-600/80 text-white text-xs font-bold tracking-widest">
            {GAME_MODE_LABELS[settings.gameMode]}
          </span>
          <button
            type="button"
            onClick={() => cycleMode(1)}
            className="px-2 py-1 border border-white/20 rounded hover:bg-white/10"
          >
            ›
          </button>
        </div>

        <SliderRow
          label="N-back"
          value={settings.nLevel}
          min={1}
          max={9}
          step={1}
          format={(v) => String(v)}
          onChange={(nLevel) => onUpdate({ nLevel })}
        />

        <SliderRow
          label="Trial time"
          value={settings.intervalMs}
          min={1500}
          max={5000}
          step={100}
          format={(v) => `${v}ms`}
          onChange={(intervalMs) => onUpdate({ intervalMs })}
        />

        <label className="flex flex-col gap-1">
          <span className="text-xs text-white/70">Num trials</span>
          <input
            type="number"
            min={10}
            max={100}
            value={settings.trialCount}
            onChange={(e) => onUpdate({ trialCount: Number(e.target.value) })}
            className="w-full bg-[#1a1a1a] border border-white/20 rounded px-2 py-1.5 text-sm"
          />
        </label>

        <SliderRow
          label="Match chance"
          value={settings.matchProbability}
          min={0.1}
          max={0.5}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(matchProbability) => onUpdate({ matchProbability })}
        />

        <SliderRow
          label="Interference"
          value={settings.interference}
          min={0}
          max={0.5}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(interference) => onUpdate({ interference })}
        />

        <SelectRow
          label="Grid"
          value={settings.gridMode}
          options={['2d']}
          labels={{ '2d': '2D' }}
          onChange={(gridMode) => onUpdate({ gridMode })}
        />

        <SelectRow
          label="Audio"
          value={settings.audioMode}
          options={['5-syllables', '8-syllables']}
          labels={{ '5-syllables': '5 syllables', '8-syllables': '8 syllables' }}
          onChange={(audioMode) => onUpdate({ audioMode })}
        />

        <SelectRow
          label="Color"
          value={settings.colorMode}
          options={['generative', 'standard']}
          labels={{ generative: 'Generative …', standard: 'Standard' }}
          onChange={(colorMode) => onUpdate({ colorMode })}
        />

        <SelectRow
          label="Shape"
          value={settings.shapeMode}
          options={['all', 'basic']}
          labels={{ all: 'All Shapes', basic: 'Basic' }}
          onChange={(shapeMode) => onUpdate({ shapeMode })}
        />

        <SelectRow
          label="Feedback"
          value={settings.feedbackMode}
          options={['show', 'hide']}
          labels={{ show: 'Show', hide: 'Hide' }}
          onChange={(feedbackMode) => onUpdate({ feedbackMode })}
        />

        <SliderRow
          label="Rotation speed"
          value={settings.rotationSpeed}
          min={10}
          max={80}
          step={5}
          format={(v) => String(v)}
          onChange={(rotationSpeed) => onUpdate({ rotationSpeed })}
        />

        <label className="flex items-center justify-between gap-2">
          <span className="text-xs text-white/70">Auto progression</span>
          <input
            type="checkbox"
            checked={settings.autoProgression}
            onChange={(e) => onUpdate({ autoProgression: e.target.checked })}
            className="accent-pink-500"
          />
        </label>

        {settings.autoProgression && (
          <SliderRow
            label="When ≥"
            value={settings.autoProgressionThreshold}
            min={0.5}
            max={0.95}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(autoProgressionThreshold) => onUpdate({ autoProgressionThreshold })}
          />
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-white/70">Win after</span>
          <input
            type="number"
            min={1}
            max={5}
            value={settings.winAfter}
            onChange={(e) => onUpdate({ winAfter: Number(e.target.value) })}
            className="w-full bg-[#1a1a1a] border border-white/20 rounded px-2 py-1.5 text-sm"
          />
          <span className="text-[10px] text-white/40">sessions in a row</span>
        </label>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 text-xs border border-white/20 rounded hover:bg-white/5 text-white/60"
        >
          Reset defaults
        </button>
      </div>
    </aside>
  )
}
