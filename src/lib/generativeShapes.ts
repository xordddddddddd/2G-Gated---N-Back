export interface GenerativeShape {
  id: string
  path: string
}

function blobPath(seed: number): string {
  const points = 8
  const cx = 12
  const cy = 12
  const baseR = 7 + (seed % 3)
  const coords: string[] = []

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2
    const wobble = 0.65 + (((seed * 17 + i * 11) % 10) / 10) * 0.55
    const r = baseR * wobble
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    coords.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }

  return `${coords.join(' ')} Z`
}

export function createGenerativeShapeSet(count = 6, seed = Date.now()): GenerativeShape[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `gen-${i}`,
    path: blobPath(seed + i * 31),
  }))
}
