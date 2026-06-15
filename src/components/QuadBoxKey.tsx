import { usePointerPress } from '../hooks/usePointerPress'
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
  const isDisabled = !active || disabled
  const pointerPress = usePointerPress(onPress, isDisabled)

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      {...pointerPress}
      className={[
        'qb-key-btn',
        correct ? 'qb-correct' : '',
        wrong ? 'qb-wrong' : '',
        isDisabled ? 'qb-key-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${label} match key ${keyLabel}`}
    >
      <span className="qb-key-label">{label}</span>
      <span />
      <span className="qb-key-letter">{keyLabel}</span>
      <span />
    </div>
  )
}
