import { STREAM_LABELS } from '../lib/constants'
import type { Stream } from '../types/game'

interface QuadBoxKeyProps {
  stream: Stream
  keyLabel: string
  active: boolean
  wrong?: boolean
  onPress: () => void
  disabled?: boolean
}

export function QuadBoxKey({
  stream,
  keyLabel,
  active,
  wrong = false,
  onPress,
  disabled = false,
}: QuadBoxKeyProps) {
  const label = STREAM_LABELS[stream]

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!active || disabled}
      className={`qb-key-btn${wrong ? ' qb-wrong' : ''}`}
      aria-label={`${label} match key ${keyLabel}`}
    >
      <span className="qb-key-label">{label}</span>
      <span />
      <span className="qb-key-letter">{keyLabel}</span>
      <span />
    </button>
  )
}
