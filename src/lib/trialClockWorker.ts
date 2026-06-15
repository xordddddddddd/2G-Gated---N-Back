/** Web Worker timer — not throttled while a touch is held on stream buttons. */

export type TrialClockMessage =
  | { type: 'start'; clockId: number; trialMs: number; advanceMs: number }
  | { type: 'cancel' }

export type TrialClockEvent =
  | { type: 'finish'; clockId: number }
  | { type: 'advance'; clockId: number }

const WORKER_SOURCE = `
let finishTimeout = null;
let advanceTimeout = null;

function clearAll() {
  if (finishTimeout !== null) clearTimeout(finishTimeout);
  if (advanceTimeout !== null) clearTimeout(advanceTimeout);
  finishTimeout = null;
  advanceTimeout = null;
}

self.onmessage = (event) => {
  const data = event.data;
  if (data.type === 'cancel') {
    clearAll();
    return;
  }
  if (data.type === 'start') {
    clearAll();
    const { clockId, trialMs, advanceMs } = data;
    finishTimeout = setTimeout(() => {
      finishTimeout = null;
      self.postMessage({ type: 'finish', clockId });
      advanceTimeout = setTimeout(() => {
        advanceTimeout = null;
        self.postMessage({ type: 'advance', clockId });
      }, advanceMs);
    }, trialMs);
  }
};
`

let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) {
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' })
    worker = new Worker(URL.createObjectURL(blob))
  }
  return worker
}

export function startTrialClock(
  clockId: number,
  trialMs: number,
  advanceMs: number,
  onEvent: (event: TrialClockEvent) => void,
): () => void {
  const w = getWorker()
  const handler = (event: MessageEvent<TrialClockEvent>) => onEvent(event.data)
  w.addEventListener('message', handler)
  w.postMessage({ type: 'start', clockId, trialMs, advanceMs } satisfies TrialClockMessage)

  return () => {
    w.removeEventListener('message', handler)
    w.postMessage({ type: 'cancel' } satisfies TrialClockMessage)
  }
}

export function cancelTrialClock(): void {
  worker?.postMessage({ type: 'cancel' } satisfies TrialClockMessage)
}
