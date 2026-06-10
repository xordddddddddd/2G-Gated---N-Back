interface CountdownScreenProps {
  count: number
  nLevel: number
}

export function CountdownScreen({ count, nLevel }: CountdownScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
      <p className="text-muted text-lg">Get ready</p>
      <p className="text-8xl font-bold text-accent tabular-nums">{count || 'Go!'}</p>
      <p className="text-sm text-muted">{nLevel}-Back · 2G Gated</p>
    </div>
  )
}
