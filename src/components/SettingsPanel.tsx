import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  INTERVAL_OPTIONS,
  N_LEVEL_OPTIONS,
  OUTPUT_GATE_LABELS,
  STREAM_LABELS,
  TRIAL_COUNT_OPTIONS,
} from '../lib/constants'
import { getKeyForStream } from '../lib/response'
import type { GameSettings, InputGate, OutputGateMode, ResponseMode, Stream } from '../types/game'

interface SettingsPanelProps {
  settings: GameSettings
  onUpdate: (partial: Partial<GameSettings>) => void
  onReset: () => void
}

type SettingsTab = 'game' | 'keys' | 'streams' | 'gating' | 'audio' | 'display'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'game', label: 'Game' },
  { id: 'keys', label: 'Keys' },
  { id: 'streams', label: 'Streams' },
  { id: 'gating', label: 'Gating' },
  { id: 'audio', label: 'Audio' },
  { id: 'display', label: 'Display' },
]

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      {children}
    </label>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-1">
      <div>
        <span className="text-sm">{label}</span>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-accent shrink-0"
      />
    </label>
  )
}

function Select<T extends string | number>({
  value,
  options,
  onChange,
  format,
}: {
  value: T
  options: T[]
  onChange: (v: T) => void
  format?: (v: T) => string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {options.map((opt) => (
        <option key={String(opt)} value={opt}>
          {format ? format(opt) : String(opt)}
        </option>
      ))}
    </select>
  )
}

export function SettingsPanel({ settings, onUpdate, onReset }: SettingsPanelProps) {
  const [tab, setTab] = useState<SettingsTab>('game')
  const [capturingStream, setCapturingStream] = useState<Stream | null>(null)

  const captureKey = (stream: Stream) => {
    setCapturingStream(stream)
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key.length === 1) {
        onUpdate({ keys: { ...settings.keys, [stream]: e.key.toLowerCase() } })
      }
      setCapturingStream(null)
      window.removeEventListener('keydown', handler)
    }
    window.addEventListener('keydown', handler)
  }

  const toggleStream = (stream: keyof InputGate) => {
    onUpdate({
      enabledStreams: {
        ...settings.enabledStreams,
        [stream]: !settings.enabledStreams[stream],
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors',
              tab === t.id
                ? 'bg-accent text-white'
                : 'bg-surface-overlay text-muted hover:text-text',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 rounded-2xl bg-surface-raised border border-border space-y-4 min-h-[320px]">
        {tab === 'game' && (
          <>
            <Field label="N-Back Level" hint="How many trials back to compare">
              <Select
                value={settings.nLevel}
                options={N_LEVEL_OPTIONS}
                onChange={(nLevel) => onUpdate({ nLevel })}
                format={(n) => `${n}-Back`}
              />
            </Field>
            <Field label="Trials per session">
              <Select
                value={settings.trialCount}
                options={TRIAL_COUNT_OPTIONS}
                onChange={(trialCount) => onUpdate({ trialCount })}
              />
            </Field>
            <Field label="Stimulus interval" hint="Milliseconds each trial is shown">
              <Select
                value={settings.intervalMs}
                options={INTERVAL_OPTIONS}
                onChange={(intervalMs) => onUpdate({ intervalMs })}
                format={(ms) => `${ms / 1000}s`}
              />
            </Field>
            <Field label="Match probability" hint="Chance a trial is a match (0–100%)">
              <input
                type="range"
                min={0.1}
                max={0.6}
                step={0.05}
                value={settings.matchProbability}
                onChange={(e) => onUpdate({ matchProbability: Number(e.target.value) })}
                className="w-full accent-accent"
              />
              <span className="text-xs text-muted">{Math.round(settings.matchProbability * 100)}%</span>
            </Field>
            <Toggle
              label="Adaptive difficulty"
              hint="Suggest n-level changes after each session"
              checked={settings.adaptive}
              onChange={(adaptive) => onUpdate({ adaptive })}
            />
            <Field label="Response mode">
              <Select<ResponseMode>
                value={settings.responseMode}
                options={['per-stream', 'gated']}
                onChange={(responseMode) => onUpdate({ responseMode })}
                format={(m) => (m === 'per-stream' ? 'Per-stream keys (Quad)' : 'Gated (single match)')}
              />
            </Field>
          </>
        )}

        {tab === 'keys' && (
          <>
            <p className="text-sm text-muted">
              Press a stream button then tap the key you want to assign.
            </p>
            {(['position', 'color', 'shape', 'letter'] as Stream[]).map((stream) => (
              <div key={stream} className="flex items-center justify-between gap-4">
                <span className="text-sm">{STREAM_LABELS[stream]}</span>
                <button
                  type="button"
                  onClick={() => captureKey(stream)}
                  className={[
                    'min-w-[56px] px-4 py-2 rounded-lg border font-bold text-lg',
                    capturingStream === stream
                      ? 'border-accent bg-accent/20 text-accent animate-pulse'
                      : 'border-border bg-surface-overlay text-text hover:border-accent',
                  ].join(' ')}
                >
                  {capturingStream === stream ? '…' : getKeyForStream(stream, settings.keys)}
                </button>
              </div>
            ))}
          </>
        )}

        {tab === 'streams' && (
          <>
            <p className="text-sm text-muted">Choose which streams appear in sessions.</p>
            {(['position', 'letter', 'color', 'shape'] as (keyof InputGate)[]).map((stream) => (
              <Toggle
                key={stream}
                label={STREAM_LABELS[stream]}
                checked={settings.enabledStreams[stream]}
                onChange={() => toggleStream(stream)}
              />
            ))}
            <Toggle
              label="Input gating"
              hint="Switch active streams each trial (2G training)"
              checked={settings.enableInputGating}
              onChange={(enableInputGating) => onUpdate({ enableInputGating })}
            />
          </>
        )}

        {tab === 'gating' && (
          <>
            <Field label="Output gate mode" hint="How OR / AND / XOR rules are chosen">
              <Select<OutputGateMode>
                value={settings.outputGateMode}
                options={['random', 'or', 'and', 'xor']}
                onChange={(outputGateMode) => onUpdate({ outputGateMode })}
                format={(m) => (m === 'random' ? 'Random rotation' : m.toUpperCase())}
              />
            </Field>
            {(['or', 'and', 'xor'] as const).map((gate) => (
              <div key={gate} className="p-3 rounded-xl bg-surface-overlay border border-border text-sm">
                <span className="font-semibold text-warning">{OUTPUT_GATE_LABELS[gate].label}</span>
                <p className="text-muted mt-1">{OUTPUT_GATE_LABELS[gate].description}</p>
              </div>
            ))}
          </>
        )}

        {tab === 'audio' && (
          <>
            <Toggle
              label="Spoken letters"
              hint="Speak the audio letter each trial"
              checked={settings.soundEnabled}
              onChange={(soundEnabled) => onUpdate({ soundEnabled })}
            />
            <Toggle
              label="Feedback sounds"
              hint="Play sounds on hit / miss"
              checked={settings.feedbackSounds}
              onChange={(feedbackSounds) => onUpdate({ feedbackSounds })}
            />
          </>
        )}

        {tab === 'display' && (
          <>
            <Toggle
              label="Trial counter"
              hint="Show remaining trials in corner"
              checked={settings.showTrialCounter}
              onChange={(showTrialCounter) => onUpdate({ showTrialCounter })}
            />
            <Select
              value={settings.feedbackMode}
              options={['show', 'hide'] as const}
              onChange={(feedbackMode) => onUpdate({ feedbackMode })}
              format={(m) => (m === 'show' ? 'Show feedback' : 'Hide feedback')}
            />
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full py-2.5 rounded-xl border border-border text-sm text-muted hover:text-text hover:bg-surface-raised transition-colors"
      >
        Reset all settings to defaults
      </button>
    </div>
  )
}
