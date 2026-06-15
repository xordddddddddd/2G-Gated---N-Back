/** Web Worker timer — not throttled while a touch is held on stream buttons. */

export type TrialClockMessage =
  | { type: 'start'; clockId: number; ms: number }
  | { type: 'cancel' }

export type TrialClockTick = { type: 'tick'; clockId: number }

const WORKER_SOURCE = `
let timeoutId = null;
self.onmessage = (event) => {
  const data = event.data;
  if (data.type === 'cancel') {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = null;
    return;
  }
  if (data.type === 'start') {
    if (timeoutId !== null) clearTimeout(timeoutId);
    const { clockId, ms } = data;
    timeoutId = setTimeout(() => {
      timeoutId = null;
      self.postMessage({ type: 'tick', clockId });
    }, ms);
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
  ms: number,
  onTick: (clockId: number) => void,
): () => void {
  const w = getWorker()
  const handler = (event: MessageEvent<TrialClockTick>) => {
    if (event.data.type === 'tick') onTick(event.data.clockId)
  }
  w.addEventListener('message', handler)
  w.postMessage({ type: 'start', clockId, ms } satisfies TrialClockMessage)

  return () => {
    w.removeEventListener('message', handler)
    w.postMessage({ type: 'cancel' } satisfies TrialClockMessage)
  }
}

export function cancelTrialClock(): void {
  worker?.postMessage({ type: 'cancel' } satisfies TrialClockMessage)
}
