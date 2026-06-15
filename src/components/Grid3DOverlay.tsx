import { StimulusCube3D } from './StimulusCube3D'
import type { ComponentProps } from 'react'

type Grid3DOverlayProps = ComponentProps<typeof StimulusCube3D>

/** Full-area 3D backdrop — Quad Box renders Grid as an absolute overlay, not inside the key column. */
export function Grid3DOverlay(props: Grid3DOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      <StimulusCube3D {...props} />
    </div>
  )
}
