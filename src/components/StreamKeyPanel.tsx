import { STREAM_LABELS } from '../lib/constants'
import type { Stream } from '../types/game'

interface StreamKeyPanelProps {
  stream: Stream
  keyLabel: string
  active: boolean
  pressed: boolean
  correct?: boolean
  wrong?: boolean
  onPress: () => void
  layout: 'top' | 'bottom' | 'left' | 'right'
  disabled?: boolean
}

export function StreamKeyPanel({
  stream,
  keyLabel,
  active,
  pressed,
  correct = false,
  wrong = false,
  onPress,
  disabled = false,
}: StreamKeyPanelProps) {
  const label = STREAM_LABELS[stream]

  return (
    <button
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault()
        onPress()
      }}
      disabled={!active || disabled}
      className={[
        'flex flex-col items-center justify-center gap-3 select-none rounded-lg px-2 py-1',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40',
        'w-[90px] transition-all duration-200',
        active && !disabled ? 'opacity-100' : 'opacity-25 cursor-default',
        correct
          ? 'ring-2 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.75)] bg-green-500/10'
          : '',
        wrong
          ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.75)] bg-red-500/10'
          : '',
      ].join(' ')}
      aria-label={`${label} match key ${keyLabel}`}
    >
      <span
        className={[
          'text-[11px] font-normal uppercase tracking-[0.15em]',
          correct ? 'text-green-400' : wrong ? 'text-red-400' : 'text-white/50',
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'font-serif text-[5.5rem] leading-none transition-colors duration-200',
          correct
            ? 'text-green-400'
            : wrong
              ? 'text-red-400'
              : active && !disabled
                ? 'text-white'
                : 'text-white/30',
          pressed ? 'scale-95' : '',
        ].join(' ')}
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {keyLabel}
      </span>
    </button>
  )
}
