import type { OutputGate, Stream } from '../types/game'

export const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'] as const

export const COLORS = [
  { id: 'red', hex: '#ef4444', label: 'Red' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue' },
  { id: 'green', hex: '#22c55e', label: 'Green' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
  { id: 'purple', hex: '#a855f7', label: 'Purple' },
  { id: 'orange', hex: '#f97316', label: 'Orange' },
] as const

export const SHAPES = [
  { id: 'circle', label: 'Circle', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
  { id: 'square', label: 'Square', path: 'M4 4h16v16H4z' },
  { id: 'triangle', label: 'Triangle', path: 'M12 3l9 17H3z' },
  { id: 'diamond', label: 'Diamond', path: 'M12 2l10 10-10 10L2 12z' },
  { id: 'star', label: 'Star', path: 'M12 2l2.9 6.9L22 9.8l-5.5 4.8L18.2 22 12 18.1 5.8 22l1.7-7.4L2 9.8l7.1-.9z' },
  { id: 'hexagon', label: 'Hexagon', path: 'M12 2l8.5 5v10L12 22l-8.5-5V7z' },
] as const

export const GRID_SIZE = 3

export const STREAM_LABELS: Record<Stream, string> = {
  position: 'Position',
  letter: 'Letter',
  color: 'Color',
  shape: 'Shape',
}

export const OUTPUT_GATE_LABELS: Record<OutputGate, { label: string; symbol: string; description: string }> = {
  or: {
    label: 'OR',
    symbol: '∨',
    description: 'Respond when any active stream matches n-back',
  },
  and: {
    label: 'AND',
    symbol: '∧',
    description: 'Respond only when all active streams match n-back together',
  },
  xor: {
    label: 'XOR',
    symbol: '⊕',
    description: 'Respond when exactly one active stream matches (not both)',
  },
}

export const DEFAULT_SETTINGS = {
  nLevel: 2,
  trialCount: 30,
  intervalMs: 2500,
  soundEnabled: true,
  adaptive: true,
}

export const INPUT_GATE_PATTERNS: InputGatePattern[] = [
  { position: true, letter: true, color: false, shape: false },
  { position: true, letter: false, color: true, shape: false },
  { position: false, letter: true, color: false, shape: true },
  { position: false, letter: false, color: true, shape: true },
  { position: true, letter: true, color: true, shape: false },
  { position: true, letter: false, color: true, shape: true },
  { position: false, letter: true, color: true, shape: true },
  { position: true, letter: true, color: true, shape: true },
]

interface InputGatePattern {
  position: boolean
  letter: boolean
  color: boolean
  shape: boolean
}
