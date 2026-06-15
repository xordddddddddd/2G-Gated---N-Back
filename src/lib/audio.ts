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

const LETTER_SPOKEN: Record<string, string> = {
  C: 'C',
  H: 'H',
  K: 'K',
  L: 'L',
  Q: 'Q',
  R: 'R',
  S: 'S',
  T: 'T',
}

const MALE_VOICE_PRIORITY = [
  'Daniel',
  'Google UK English Male',
  'Microsoft David',
  'Microsoft Guy',
  'Google US English Male',
  'Alex',
  'Fred',
  'Tom',
  'Mark',
  'James',
  'Aaron',
  'Arthur',
  'Rishi',
]

let audioContext: AudioContext | null = null
let activeVoice: SpeechSynthesisVoice | null = null
let voicesLoaded = false
let voicePreference = ''

function getContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
}

function pickDefaultMaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of MALE_VOICE_PRIORITY) {
    const match = voices.find((v) => v.name.includes(name))
    if (match) return match
  }
  const maleHint = voices.find(
    (v) =>
      /male|david|daniel|guy|alex|fred|james|tom|mark/i.test(v.name) &&
      !/female|zira|samantha|aria|karen|susan|victoria/i.test(v.name),
  )
  if (maleHint) return maleHint
  return voices[0] ?? null
}

function resolveVoice(): SpeechSynthesisVoice | null {
  const voices = getEnglishVoices()
  if (voices.length === 0) return null
  if (voicePreference) {
    const preferred =
      voices.find((v) => v.voiceURI === voicePreference) ??
      voices.find((v) => v.name === voicePreference)
    if (preferred) return preferred
  }
  return pickDefaultMaleVoice(voices)
}

function ensureVoices(): void {
  if (!('speechSynthesis' in window)) return
  activeVoice = resolveVoice()
  if (window.speechSynthesis.getVoices().length > 0) {
    voicesLoaded = true
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      activeVoice = resolveVoice()
      voicesLoaded = true
    }
  }
}

export function setVoicePreference(uri: string): void {
  voicePreference = uri
  activeVoice = resolveVoice()
}

export async function resumeAudio(): Promise<void> {
  const ctx = getContext()
  if (ctx.state === 'suspended') await ctx.resume()
  if ('speechSynthesis' in window) {
    window.speechSynthesis.resume()
    ensureVoices()
    if (!voicesLoaded) {
      await new Promise<void>((resolve) => {
        const check = () => {
          ensureVoices()
          if (window.speechSynthesis.getVoices().length > 0 || voicesLoaded) resolve()
          else setTimeout(check, 50)
        }
        check()
      })
    }
  }
}

function playLetterTone(letter: string): void {
  const frequency = LETTER_FREQUENCIES[letter]
  if (!frequency) return
  const ctx = getContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.45)
}

export function speakLetter(letter: string, enabled = true): void {
  if (!enabled || !letter) return
  const spoken = LETTER_SPOKEN[letter] ?? letter

  if ('speechSynthesis' in window) {
    ensureVoices()
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(spoken)
    u.rate = 0.78
    u.pitch = 0.95
    u.volume = 1
    if (activeVoice) u.voice = activeVoice
    u.onerror = () => playLetterTone(letter)
    window.speechSynthesis.speak(u)
    return
  }
  playLetterTone(letter)
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

export function playFeedback(type: 'hit' | 'miss' | 'false-alarm' | 'level-up'): void {
  const ctx = getContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const frequencies = { hit: 880, miss: 220, 'false-alarm': 165, 'level-up': 660 }
  osc.type = type === 'hit' || type === 'level-up' ? 'sine' : 'triangle'
  osc.frequency.value = frequencies[type]
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.25)
}
