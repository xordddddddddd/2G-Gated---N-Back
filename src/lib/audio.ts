const LETTER_FREQUENCIES: Record<string, number> = {
  C: 261.63,
  H: 293.66,
  K: 329.63,
  L: 349.23,
  Q: 392.0,
  R: 440.0,
  S: 493.88,
  T: 523.25,
}

let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export async function resumeAudio(): Promise<void> {
  const ctx = getContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.resume()
  }
}

function playLetterTone(letter: string): void {
  const frequency = LETTER_FREQUENCIES[letter]
  if (!frequency) return

  const ctx = getContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.4)
}

/** Speak the letter aloud (classic dual n-back style), with tone fallback. */
export function speakLetter(letter: string, enabled = true): void {
  if (!enabled || !letter) return

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(letter)
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1
    utterance.onerror = () => playLetterTone(letter)
    window.speechSynthesis.speak(utterance)
    return
  }

  playLetterTone(letter)
}

/** @deprecated Use speakLetter */
export function playLetter(letter: string, enabled = true): void {
  speakLetter(letter, enabled)
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export function playFeedback(type: 'hit' | 'miss' | 'false-alarm' | 'level-up'): void {
  const ctx = getContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  const frequencies: Record<typeof type, number> = {
    hit: 880,
    miss: 220,
    'false-alarm': 165,
    'level-up': 660,
  }

  oscillator.type = type === 'hit' || type === 'level-up' ? 'sine' : 'triangle'
  oscillator.frequency.value = frequencies[type]
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.25)
}
