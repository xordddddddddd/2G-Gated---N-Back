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
  disabled = false,
}: StreamKeyPanelProps) {
  const label = STREAM_LABELS[stream]

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!active || disabled}
      className={[
        'flex flex-col items-center justify-center gap-3 select-none transition-opacity duration-150',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40',
        'w-[90px]',
        active && !disabled ? 'opacity-100' : 'opacity-25 cursor-default',
        pressed ? 'opacity-100' : '',
      ].join(' ')}
      aria-label={`${label} match key ${keyLabel}`}
    >
      <span className="text-[11px] font-normal text-white/50 uppercase tracking-[0.15em]">
        {label}
      </span>
      <span
        className={[
          'font-serif text-[5.5rem] leading-none',
          active && !disabled ? 'text-white' : 'text-white/30',
          pressed ? 'scale-95' : '',
        ].join(' ')}
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {keyLabel}
      </span>
    </button>
  )
}
