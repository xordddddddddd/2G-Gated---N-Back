import { useMemo, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

/** Register press on pointer down so touch holds work without waiting for click. */
export function usePointerPress(onPress: () => void, disabled = false) {
  const pointerPressedRef = useRef(false)
  const onPressRef = useRef(onPress)
  onPressRef.current = onPress

  return useMemo(
    () => ({
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        if (disabled || e.button !== 0) return
        e.preventDefault()
        pointerPressedRef.current = true
        onPressRef.current()
      },
      onPointerUp: () => {
        pointerPressedRef.current = false
      },
      onPointerCancel: () => {
        pointerPressedRef.current = false
      },
      onClick: (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (pointerPressedRef.current) {
          pointerPressedRef.current = false
          return
        }
        onPressRef.current()
      },
    }),
    [disabled],
  )
}
