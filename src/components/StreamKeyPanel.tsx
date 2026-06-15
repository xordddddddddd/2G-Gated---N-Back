import { STREAM_LABELS } from '../lib/constants'
import type { Stream } from '../types/game'

interface StreamKeyPanelProps {
  stream: Stream
  keyLabel: string
  active: boolean
  pressed: boolean
  onPress: () => void
  layout: 'top' | 'bottom' | 'left' | 'right'
}

export function StreamKeyPanel({
  stream,
  keyLabel,
  active,
  pressed,
  onPress,
  layout,
}: StreamKeyPanelProps) {
  const label = STREAM_LABELS[stream]

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!active}
      className={[
        'flex flex-col items-center justify-center gap-2 select-none transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        layout === 'left' || layout === 'right' ? 'min-w-[72px]' : 'min-h-[72px]',
        active ? 'opacity-100' : 'opacity-25 cursor-not-allowed',
        pressed ? 'scale-95' : 'hover:scale-105',
      ].join(' ')}
      aria-label={`${label} match key ${keyLabel}`}
    >
      <span className="text-xs sm:text-sm font-medium text-white/80 uppercase tracking-widest">
        {label}
      </span>
      <span
        className={[
          'text-4xl sm:text-5xl font-bold leading-none tabular-nums',
          pressed ? 'text-accent' : 'text-white',
          active ? '' : 'text-white/40',
        ].join(' ')}
      >
        {keyLabel}
      </span>
    </button>
  )
}
