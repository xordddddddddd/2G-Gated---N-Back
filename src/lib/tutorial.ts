import type { InputGate, OutputGate, Stimulus, Trial } from '../types/game'

export type TutorialStepKind = 'info' | 'practice'

export interface TutorialStep {
  id: string
  title: string
  body: string
  hint?: string
  kind: TutorialStepKind
  demoStimulus?: Stimulus
  demoInputGate?: InputGate
  demoOutputGate?: OutputGate
  trials?: Trial[]
  nLevel?: number
  intervalMs?: number
  waitForCorrect?: boolean
}

const gate = (
  position: boolean,
  letter: boolean,
  color: boolean,
  shape: boolean,
): InputGate => ({ position, letter, color, shape })

const stim = (
  position: number,
  letter: string,
  color: string,
  shape: string,
): Stimulus => ({ position, letter, color, shape })

const trial = (
  stimulus: Stimulus,
  inputGate: InputGate,
  outputGate: OutputGate,
): Trial => ({ stimulus, inputGate, outputGate })

export const TUTORIAL_N_LEVEL = 2
export const TUTORIAL_INTERVAL_MS = 4000

/** Hand-crafted 2-back sequences with predictable match / no-match outcomes. */
const OR_PRACTICE_TRIALS: Trial[] = [
  trial(stim(0, 'C', 'red', 'circle'), gate(true, true, false, false), 'or'),
  trial(stim(4, 'H', 'blue', 'square'), gate(true, true, false, false), 'or'),
  trial(stim(1, 'K', 'green', 'triangle'), gate(true, true, false, false), 'or'),
  trial(stim(5, 'L', 'yellow', 'diamond'), gate(true, true, false, false), 'or'),
  // vs trial 2: position 1 matches, letter L ≠ K → OR → match
  trial(stim(1, 'L', 'purple', 'star'), gate(true, true, false, false), 'or'),
  trial(stim(8, 'Q', 'orange', 'hexagon'), gate(true, true, false, false), 'or'),
]

const INPUT_GATE_TRIALS: Trial[] = [
  trial(stim(2, 'R', 'red', 'circle'), gate(true, true, false, false), 'or'),
  trial(stim(6, 'S', 'blue', 'square'), gate(true, true, false, false), 'or'),
  trial(stim(2, 'T', 'green', 'triangle'), gate(true, true, false, false), 'or'),
  trial(stim(7, 'C', 'yellow', 'diamond'), gate(true, true, false, false), 'or'),
  // vs trial 2: only color+shape active; color green matches, shape triangle matches → AND → match
  trial(stim(3, 'H', 'green', 'triangle'), gate(false, false, true, true), 'and'),
]

const AND_PRACTICE_TRIALS: Trial[] = [
  trial(stim(0, 'K', 'red', 'circle'), gate(true, true, false, false), 'and'),
  trial(stim(4, 'L', 'blue', 'square'), gate(true, true, false, false), 'and'),
  trial(stim(1, 'Q', 'green', 'triangle'), gate(true, true, false, false), 'and'),
  trial(stim(5, 'R', 'yellow', 'diamond'), gate(true, true, false, false), 'and'),
  // vs trial 2: position 1 matches AND letter Q matches → AND → match
  trial(stim(1, 'Q', 'purple', 'star'), gate(true, true, false, false), 'and'),
]

const XOR_PRACTICE_TRIALS: Trial[] = [
  trial(stim(3, 'S', 'red', 'circle'), gate(true, true, false, false), 'xor'),
  trial(stim(7, 'T', 'blue', 'square'), gate(true, true, false, false), 'xor'),
  trial(stim(4, 'C', 'green', 'triangle'), gate(true, true, false, false), 'xor'),
  trial(stim(8, 'H', 'yellow', 'diamond'), gate(true, true, false, false), 'xor'),
  // vs trial 2: position 4 matches, letter H ≠ C → exactly one → XOR → match
  trial(stim(4, 'H', 'orange', 'hexagon'), gate(true, true, false, false), 'xor'),
]

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to 2G Gated N-Back',
    kind: 'info',
    body: 'This tutorial walks you through the core ideas before a full training session. You will learn the four stimulus streams, how n-back matching works, input gating, and output gating with OR, AND, and XOR rules.',
  },
  {
    id: 'streams',
    title: 'Four Information Streams',
    kind: 'info',
    body: 'Each trial presents four simultaneous streams of information. Your working memory must track all of them, but input gating (covered later) tells you which streams matter on a given trial.',
    demoStimulus: stim(4, 'K', 'blue', 'diamond'),
    demoInputGate: gate(true, true, true, true),
    demoOutputGate: 'or',
    hint: 'All stimuli appear inside the highlighted grid cell. Letters are spoken aloud. Only streams shown without a strikethrough count each trial.',
  },
  {
    id: 'nback',
    title: 'What Is N-Back?',
    kind: 'info',
    body: 'In 2-back, compare each new trial to the one from two steps earlier. If an active stream matches its value from 2 trials back, that stream is a match. The first two trials are warm-up — no responses yet.',
    demoStimulus: stim(1, 'R', 'green', 'triangle'),
    hint: 'Example: if the letter was "R" two trials ago and it is "R" again now, the letter stream matches.',
  },
  {
    id: 'or-practice',
    title: 'Practice: OR Output Gate',
    kind: 'practice',
    body: 'With the OR rule, press Match when any active stream matches 2-back. On the next trial, position will match but the letter will not — that is still a match for OR.',
    hint: 'Watch trials 1–4 to build memory. Trial 5 is your first scorable OR match (position only).',
    trials: OR_PRACTICE_TRIALS,
    nLevel: TUTORIAL_N_LEVEL,
    intervalMs: TUTORIAL_INTERVAL_MS,
    waitForCorrect: true,
  },
  {
    id: 'input-gate',
    title: 'Input Gating',
    kind: 'info',
    body: 'The input gate shows which streams are active on each trial. Only compare streams that are highlighted — ignore the rest. This trains flexible attention switching between information channels.',
    demoStimulus: stim(6, 'S', 'purple', 'star'),
    demoInputGate: gate(false, false, true, true),
    demoOutputGate: 'and',
    hint: 'In this example, only Color and Shape are active. Position and Letter are ignored.',
  },
  {
    id: 'input-practice',
    title: 'Practice: Input + AND Gate',
    kind: 'practice',
    body: 'Color and Shape are active with an AND rule. Press Match only when both color and shape match 2-back at the same time.',
    hint: 'Trial 5: both green color and triangle shape match 2-back together.',
    trials: INPUT_GATE_TRIALS,
    nLevel: TUTORIAL_N_LEVEL,
    intervalMs: TUTORIAL_INTERVAL_MS,
    waitForCorrect: true,
  },
  {
    id: 'and-explained',
    title: 'AND Output Gate',
    kind: 'info',
    body: 'AND requires every active stream to match 2-back simultaneously. If only position matches but letter does not, do not respond.',
    demoStimulus: stim(2, 'L', 'red', 'circle'),
    demoInputGate: gate(true, true, false, false),
    demoOutputGate: 'and',
    hint: 'Both Position AND Letter must match together for an AND response.',
  },
  {
    id: 'and-practice',
    title: 'Practice: AND Output Gate',
    kind: 'practice',
    body: 'Position and letter are active. Wait for the trial where both match 2-back at once, then press Match.',
    hint: 'Trial 5: position 1 and letter Q both match trial 2.',
    trials: AND_PRACTICE_TRIALS,
    nLevel: TUTORIAL_N_LEVEL,
    intervalMs: TUTORIAL_INTERVAL_MS,
    waitForCorrect: true,
  },
  {
    id: 'xor-explained',
    title: 'XOR Output Gate',
    kind: 'info',
    body: 'XOR (exclusive or) means respond when exactly one active stream matches — not zero, and not more than one. If both position and letter match, do not respond.',
    demoStimulus: stim(5, 'T', 'blue', 'square'),
    demoInputGate: gate(true, true, false, false),
    demoOutputGate: 'xor',
    hint: 'One match = respond. Two matches = do not respond.',
  },
  {
    id: 'xor-practice',
    title: 'Practice: XOR Output Gate',
    kind: 'practice',
    body: 'Position and letter are active with XOR. Press Match when exactly one of them matches 2-back.',
    hint: 'Trial 5: position matches but letter does not — exactly one match.',
    trials: XOR_PRACTICE_TRIALS,
    nLevel: TUTORIAL_N_LEVEL,
    intervalMs: TUTORIAL_INTERVAL_MS,
    waitForCorrect: true,
  },
  {
    id: 'complete',
    title: 'Tutorial Complete',
    kind: 'info',
    body: 'You are ready for a full session. Remember: check the input gate for active streams, apply the output gate rule, and compare to n trials back. Good luck!',
  },
]

export function getTutorialStep(index: number): TutorialStep | null {
  return TUTORIAL_STEPS[index] ?? null
}

export function getTutorialProgress(index: number): number {
  return ((index + 1) / TUTORIAL_STEPS.length) * 100
}
