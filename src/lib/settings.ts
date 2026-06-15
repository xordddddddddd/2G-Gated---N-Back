import { DEFAULT_SETTINGS } from './constants'
import type { GameSettings } from '../types/game'

const STORAGE_KEY = '2g-gated-nback-settings'

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_SETTINGS.keys }, enabledStreams: { ...DEFAULT_SETTINGS.enabledStreams } }
    const parsed = JSON.parse(raw) as Partial<GameSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keys: { ...DEFAULT_SETTINGS.keys, ...parsed.keys },
      enabledStreams: { ...DEFAULT_SETTINGS.enabledStreams, ...parsed.enabledStreams },
    }
  } catch {
    return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_SETTINGS.keys }, enabledStreams: { ...DEFAULT_SETTINGS.enabledStreams } }
  }
}

export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function resetSettings(): GameSettings {
  const defaults = {
    ...DEFAULT_SETTINGS,
    keys: { ...DEFAULT_SETTINGS.keys },
    enabledStreams: { ...DEFAULT_SETTINGS.enabledStreams },
  }
  saveSettings(defaults)
  return defaults
}
