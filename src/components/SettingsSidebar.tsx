import { useEffect, useState } from 'react'
import {
  GAME_MODE_LABELS,
  STREAM_LABELS,
  TWO_G_INTERVAL_PRESETS,
  TWO_G_PLUS_DEFAULT_SETTINGS,
  TWO_G_DEFAULT_SETTINGS,
} from '../lib/constants'
import { getEnglishVoices, resumeAudio } from '../lib/audio'
import { getKeyForStream } from '../lib/response'
import { isGatedTrainingMode } from '../lib/twoGPlus'
import type { GameMode, GameSettings, Stream } from '../types/game'

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

function MonoSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-white/85 font-mono tracking-tight">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="progression-slider w-full"
      />
    </label>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-sm text-white/85 font-mono">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative w-11 h-6 rounded-sm border transition-colors shrink-0',
          checked ? 'bg-white/25 border-white/40' : 'bg-black border-white/25',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-5 h-[calc(100%-4px)] bg-white/70 border border-white/30 transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
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

const QUAD_KEY_STREAMS: Stream[] = ['position', 'color', 'shape', 'letter']
const GATED_KEY_STREAMS: Stream[] = ['position', 'letter', 'number', 'color', 'shape']

function KeybindingsPanel({
  settings,
  onUpdate,
}: {
  settings: GameSettings
  onUpdate: (partial: Partial<GameSettings>) => void
}) {
  const [capturing, setCapturing] = useState<Stream | null>(null)
  const streams = isGatedTrainingMode(settings.gameMode) ? GATED_KEY_STREAMS : QUAD_KEY_STREAMS

  useEffect(() => {
    if (!capturing) return
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key.length === 1) {
        onUpdate({ keys: { ...settings.keys, [capturing]: e.key.toLowerCase() } })
        setCapturing(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [capturing, onUpdate, settings.keys])

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-2 font-mono">
      {streams.map((stream) => (
        <div key={stream} className="flex items-center justify-between gap-2 text-sm">
          <span className="text-white/70">{STREAM_LABELS[stream]}</span>
          <button
            type="button"
            onClick={() => setCapturing(stream)}
            className={[
              'min-w-[2.5rem] px-2 py-1 border text-center uppercase',
              capturing === stream
                ? 'border-white bg-white/10 animate-pulse'
                : 'border-white/25 hover:border-white/50',
            ].join(' ')}
          >
            {capturing === stream ? '…' : getKeyForStream(stream, settings.keys)}
          </button>
        </div>
      ))}
      {isGatedTrainingMode(settings.gameMode) && (
        <p className="text-[10px] text-white/40 pt-1">
          In 2G / 2G+ play, F = spatial and L = secondary stream for the active block.
        </p>
      )}
    </div>
  )
}

const GAME_MODES: GameMode[] = ['quad', 'dual', '2g', '2g+']

export function SettingsSidebar({ settings, onUpdate, onReset, collapsed, onToggle }: SettingsSidebarProps) {
  const modeIndex = GAME_MODES.indexOf(settings.gameMode)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [keybindingsOpen, setKeybindingsOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      await resumeAudio()
      setVoices(getEnglishVoices())
    }
    load()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => setVoices(getEnglishVoices())
    }
  }, [])

  const cycleMode = (dir: -1 | 1) => {
    const next = GAME_MODES[(modeIndex + dir + GAME_MODES.length) % GAME_MODES.length]
    onUpdate({
      gameMode: next,
      ...(next === '2g'
        ? TWO_G_DEFAULT_SETTINGS
        : next === '2g+'
          ? TWO_G_PLUS_DEFAULT_SETTINGS
          : {
              enableInputGating: false,
              responseMode: 'per-stream' as const,
              outputGateMode: 'or' as const,
            }),
    })
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
    <aside className="w-[300px] shrink-0 border-r border-white/10 bg-black overflow-y-auto max-h-dvh">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-medium text-white/90">Settings</h2>
        {onToggle && (
          <button type="button" onClick={onToggle} className="text-white/50 hover:text-white text-lg leading-none">
            ×
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 text-sm">
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

        {settings.gameMode === '2g' || settings.gameMode === '2g+' ? (
          <>
            <SelectRow
              label="Stimulus interval"
              value={settings.variableTiming ? 'variable' : String(settings.intervalMs)}
              options={[...TWO_G_INTERVAL_PRESETS.map((ms) => String(ms)), 'variable']}
              labels={{
                '3000': '3000ms (default)',
                '2500': '2500ms',
                '2000': '2000ms (speed)',
                variable: 'Variable (1500–3500ms)',
              }}
              onChange={(value) => {
                if (value === 'variable') {
                  onUpdate({ variableTiming: true })
                } else {
                  onUpdate({ variableTiming: false, intervalMs: Number(value) })
                }
              }}
            />

            <label className="flex items-center justify-between gap-2">
              <span className="text-xs text-white/70">Response switching</span>
              <input
                type="checkbox"
                checked={settings.responseSwitching}
                onChange={(e) => onUpdate({ responseSwitching: e.target.checked })}
                className="accent-pink-500"
              />
            </label>
            <p className="text-[10px] text-white/40 -mt-2">
              Randomly swap active-pair key labels each block
            </p>
          </>
        ) : (
          <SliderRow
            label="Trial time"
            value={settings.intervalMs}
            min={1500}
            max={5000}
            step={100}
            format={(v) => `${v}ms`}
            onChange={(intervalMs) => onUpdate({ intervalMs })}
          />
        )}

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
          options={['2d', '3d']}
          labels={{ '2d': '2D', '3d': '3D Cube' }}
          onChange={(gridMode) => onUpdate({ gridMode })}
        />

        {settings.gridMode === '3d' && (
          <SliderRow
            label="Rotation speed"
            value={settings.rotationSpeed}
            min={1}
            max={140}
            step={1}
            format={(v) => String(v)}
            onChange={(rotationSpeed) => onUpdate({ rotationSpeed })}
          />
        )}

        <SelectRow
          label="Voice"
          value={settings.voiceUri || '__default__'}
          options={['__default__', ...voices.map((v) => v.voiceURI)]}
          labels={{
            __default__: 'Default (Male)',
            ...Object.fromEntries(voices.map((v) => [v.voiceURI, v.name])),
          }}
          onChange={(voiceUri) =>
            onUpdate({ voiceUri: voiceUri === '__default__' ? '' : voiceUri })
          }
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

        <section className="rounded border border-white/15 bg-[#0a0a0a] p-3 space-y-4 font-mono">
          <ToggleSwitch
            label="Auto progression:"
            checked={settings.autoProgression}
            onChange={(autoProgression) => onUpdate({ autoProgression })}
          />

          {settings.autoProgression && (
            <>
              <MonoSlider
                label={`When ≥ ${Math.round(settings.autoProgressionThreshold * 100)}%`}
                value={settings.autoProgressionThreshold}
                min={0.5}
                max={0.95}
                step={0.05}
                onChange={(autoProgressionThreshold) => onUpdate({ autoProgressionThreshold })}
              />
              <MonoSlider
                label={`Win after: ${settings.winAfter} in a row`}
                value={settings.winAfter}
                min={1}
                max={5}
                step={1}
                onChange={(winAfter) => onUpdate({ winAfter })}
              />
              <MonoSlider
                label={`When < ${Math.round(settings.autoProgressionLoseThreshold * 100)}%`}
                value={settings.autoProgressionLoseThreshold}
                min={0.3}
                max={0.85}
                step={0.05}
                onChange={(autoProgressionLoseThreshold) => onUpdate({ autoProgressionLoseThreshold })}
              />
              <MonoSlider
                label={`Lose after: ${settings.loseAfter} in a row`}
                value={settings.loseAfter}
                min={1}
                max={5}
                step={1}
                onChange={(loseAfter) => onUpdate({ loseAfter })}
              />
            </>
          )}

          <button
            type="button"
            onClick={() => setKeybindingsOpen((v) => !v)}
            className="w-full py-2.5 border border-white/20 text-sm text-white/80 hover:bg-white/5 flex items-center justify-center gap-2"
          >
            <span>Keybindings</span>
            <span aria-hidden className="text-white/50">
              ⌨
            </span>
          </button>

          {keybindingsOpen && <KeybindingsPanel settings={settings} onUpdate={onUpdate} />}
        </section>

        <label className="flex items-center justify-between gap-2">
          <span className="text-xs text-white/70">Tutorial mode</span>
          <input
            type="checkbox"
            checked={settings.tutorialMode}
            onChange={(e) => onUpdate({ tutorialMode: e.target.checked })}
            className="accent-pink-500"
          />
        </label>
        <p className="text-[10px] text-white/40 -mt-2">
          Play runs a tutorial for the current mode (2G, Dual, or Quad)
        </p>

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
