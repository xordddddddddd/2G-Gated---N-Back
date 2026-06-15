import { STREAM_LABELS } from '../lib/constants'
import type { Stream } from '../types/game'

interface StreamKeyPanelProps {
  stream: Stream
  keyLabel: string
  active: boolean
  pressed: boolean
  onPress: () => void
  layout: 'top' | 'bottom' | 'left' | 'right'
  disabled?: boolean
}

export function StreamKeyPanel({
  stream,
  keyLabel,
  active,
  pressed,
  onPress,
  layout,
  disabled = false,
}: StreamKeyPanelProps) {
  const label = STREAM_LABELS[stream]

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!active || disabled}
      className={[
        'flex flex-col items-center justify-center gap-2 select-none transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        layout === 'left' || layout === 'right' ? 'w-[100px]' : 'h-[80px]',
        active && !disabled ? 'opacity-100' : 'opacity-30 cursor-default',
        pressed ? 'scale-95' : active && !disabled ? 'hover:scale-105' : '',
      ].join(' ')}
      aria-label={`${label} match key ${keyLabel}`}
    >
      <span className="text-xs font-medium text-white/70 uppercase tracking-[0.2em]">
        {label}
      </span>
      <span
        className={[
          'font-serif text-6xl leading-none',
          pressed ? 'text-white' : 'text-white/90',
        ].join(' ')}
      >
        {keyLabel}
      </span>
    </button>
  )
}
