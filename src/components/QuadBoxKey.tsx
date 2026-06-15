import { STREAM_LABELS } from '../lib/constants'
import type { Stream } from '../types/game'

interface QuadBoxKeyProps {
  stream: Stream
  keyLabel: string
  active: boolean
  correct?: boolean
  wrong?: boolean
  onPress: () => void
  disabled?: boolean
}

export function QuadBoxKey({
  stream,
  keyLabel,
  active,
  correct = false,
  wrong = false,
  onPress,
  disabled = false,
}: QuadBoxKeyProps) {
  const label = STREAM_LABELS[stream]

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onPress()
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      disabled={!active || disabled}
      className={[
        'qb-key-btn',
        correct ? 'qb-correct' : '',
        wrong ? 'qb-wrong' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${label} match key ${keyLabel}`}
    >
      <span className="qb-key-label">{label}</span>
      <span />
      <span className="qb-key-letter">{keyLabel}</span>
      <span />
    </button>
  )
}
