import { GRID_SIZE } from '../lib/constants'

interface GridProps {
  activePosition: number | null
}

export function Grid({ activePosition }: GridProps) {
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i)

  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] aspect-square">
      {cells.map((i) => (
        <div
          key={i}
          className={[
            'rounded-lg border-2 transition-all duration-150',
            activePosition === i
              ? 'bg-accent border-accent scale-105 shadow-lg shadow-accent/30'
              : 'bg-surface-overlay border-border',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
