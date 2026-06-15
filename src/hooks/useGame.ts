import { useCallback, useEffect, useRef, useState } from 'react'
import { playFeedback, resumeAudio, speakLetter, stopSpeech } from '../lib/audio'
import { shouldRespond, getActiveStreams } from '../lib/gating'
import { generateTrials } from '../lib/sequence'
import { loadSettings, saveSettings, resetSettings } from '../lib/settings'
import {
  evaluatePerStreamResponse,
  getStreamMatchesForTrial,
  streamFromKey,
} from '../lib/response'
import { computeStats, suggestNLevel } from '../lib/stats'
import type {
  GamePhase,
  GameSettings,
  SessionStats,
  Stream,
  TrialFeedback,
  TrialResult,
} from '../types/game'

export function useGame() {
  const [phase, setPhase] = useState<GamePhase>('menu')
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings())
  const [trials, setTrials] = useState<ReturnType<typeof generateTrials>>([])
  const [trialIndex, setTrialIndex] = useState(0)
  const [results, setResults] = useState<TrialResult[]>([])
  const [feedback, setFeedback] = useState<TrialFeedback>(null)
  const [respondedThisTrial, setRespondedThisTrial] = useState(false)
  const [pressedStreams, setPressedStreams] = useState<Set<Stream>>(new Set())
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [suggestedN, setSuggestedN] = useState(settings.nLevel)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentTrial = trials[trialIndex] ?? null
  const nLevel = settings.nLevel
  const isScorable = trialIndex >= nLevel
  const trialsRemaining = Math.max(trials.length - trialIndex - 1, 0)

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current)
      speakTimeoutRef.current = null
    }
    stopSpeech()
    setIsSpeaking(false)
  }, [])

  const finishTrial = useCallback(() => {
    if (!currentTrial || respondedThisTrial || !isScorable) return

    const past = trials[trialIndex - nLevel]
    let trialFeedback: TrialFeedback
    let correct: boolean
    let shouldMatch: boolean

    if (settings.responseMode === 'gated') {
      shouldMatch = shouldRespond(
        currentTrial.stimulus,
        past.stimulus,
        currentTrial.inputGate,
        currentTrial.outputGate,
      )
      const responded = pressedStreams.size > 0
      if (shouldMatch && responded) {
        trialFeedback = 'hit'
        correct = true
        if (settings.feedbackSounds) playFeedback('hit')
      } else if (shouldMatch && !responded) {
        trialFeedback = 'miss'
        correct = false
        if (settings.feedbackSounds) playFeedback('miss')
      } else if (!shouldMatch && responded) {
        trialFeedback = 'false-alarm'
        correct = false
        if (settings.feedbackSounds) playFeedback('false-alarm')
      } else {
        trialFeedback = 'correct-reject'
        correct = true
      }
    } else {
      const streamMatchesMap = getStreamMatchesForTrial(
        currentTrial.stimulus,
        past.stimulus,
        currentTrial.inputGate,
      )
      const result = evaluatePerStreamResponse(
        pressedStreams,
        streamMatchesMap,
        currentTrial.inputGate,
      )
      trialFeedback = result.feedback
      correct = result.correct
      shouldMatch = Object.values(streamMatchesMap).some(Boolean)
      if (settings.feedbackSounds) {
        if (result.feedback === 'hit' || result.feedback === 'correct-reject') playFeedback('hit')
        else if (result.feedback === 'miss') playFeedback('miss')
        else playFeedback('false-alarm')
      }
    }

    setRespondedThisTrial(true)
    setFeedback(trialFeedback)

    const trialResult: TrialResult = {
      trialIndex,
      responded: pressedStreams.size > 0,
      correct,
      shouldMatch,
      feedback: trialFeedback,
      outputGate: currentTrial.outputGate,
      activeStreams: getActiveStreams(currentTrial.inputGate),
      pressedStreams: [...pressedStreams],
    }

    setResults((prev) => [...prev, trialResult])
  }, [
    currentTrial,
    respondedThisTrial,
    isScorable,
    trials,
    trialIndex,
    nLevel,
    pressedStreams,
    settings,
  ])

  const handleStreamPress = useCallback(
    (stream: Stream) => {
      if (!currentTrial || respondedThisTrial || !isScorable) return
      if (!currentTrial.inputGate[stream]) return
      setPressedStreams((prev) => new Set(prev).add(stream))
    },
    [currentTrial, respondedThisTrial, isScorable],
  )

  const advanceTrial = useCallback(() => {
    setFeedback(null)
    setRespondedThisTrial(false)
    setPressedStreams(new Set())

    if (trialIndex + 1 >= trials.length) {
      clearTimers()
      setResults((prev) => {
        const sessionStats = computeStats(prev)
        setStats(sessionStats)
        if (settings.adaptive) {
          setSuggestedN(suggestNLevel(sessionStats, settings.nLevel))
        }
        return prev
      })
      setPhase('results')
      return
    }

    setTrialIndex((i) => i + 1)
  }, [trialIndex, trials.length, clearTimers, settings])

  const startSession = useCallback(async () => {
    await resumeAudio()
    clearTimers()
    const generated = generateTrials(settings)
    setTrials(generated)
    setTrialIndex(0)
    setResults([])
    setFeedback(null)
    setRespondedThisTrial(false)
    setPressedStreams(new Set())
    setStats(null)
    setPhase('playing')
  }, [settings, clearTimers])

  const stopSession = useCallback(() => {
    clearTimers()
    setPhase('menu')
    setTrialIndex(0)
    setResults([])
    setFeedback(null)
    setPressedStreams(new Set())
    setStats(null)
  }, [clearTimers])

  const resetToMenu = stopSession

  const startTutorial = useCallback(() => {
    clearTimers()
    setPhase('tutorial')
    setTrialIndex(0)
    setResults([])
    setFeedback(null)
    setPressedStreams(new Set())
    setStats(null)
  }, [clearTimers])

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        ...partial,
        keys: partial.keys ? { ...prev.keys, ...partial.keys } : prev.keys,
        enabledStreams: partial.enabledStreams
          ? { ...prev.enabledStreams, ...partial.enabledStreams }
          : prev.enabledStreams,
      }
      saveSettings(next)
      return next
    })
  }, [])

  const resetSettingsToDefaults = useCallback(() => {
    const defaults = resetSettings()
    setSettings(defaults)
  }, [])

  useEffect(() => {
    if (phase !== 'playing' || !currentTrial) return

    if (currentTrial.inputGate.letter && settings.soundEnabled) {
      setIsSpeaking(true)
      speakLetter(currentTrial.stimulus.letter, true)
      speakTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 900)
    } else {
      setIsSpeaking(false)
    }

    intervalRef.current = setInterval(() => {
      if (!respondedThisTrial && isScorable) {
        finishTrial()
      }
      setTimeout(advanceTrial, 200)
    }, settings.intervalMs)

    return clearTimers
  }, [
    phase,
    trialIndex,
    currentTrial,
    settings.soundEnabled,
    settings.intervalMs,
    respondedThisTrial,
    isScorable,
    finishTrial,
    advanceTrial,
    clearTimers,
  ])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing' || respondedThisTrial || !isScorable) return

      const stream = streamFromKey(e.key, settings.keys)
      if (stream) {
        e.preventDefault()
        handleStreamPress(stream)
        return
      }

      if (settings.responseMode === 'gated' && e.code === 'Space') {
        e.preventDefault()
        setPressedStreams(new Set(getActiveStreams(currentTrial!.inputGate)))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    phase,
    respondedThisTrial,
    isScorable,
    settings.keys,
    settings.responseMode,
    handleStreamPress,
    currentTrial,
  ])

  useEffect(() => () => clearTimers(), [clearTimers])

  return {
    phase,
    settings,
    currentTrial,
    trialIndex,
    totalTrials: trials.length,
    trialsRemaining,
    nLevel,
    isScorable,
    feedback,
    stats,
    suggestedN,
    results,
    isSpeaking,
    pressedStreams,
    startSession,
    stopSession,
    resetToMenu,
    startTutorial,
    updateSettings,
    resetSettings: resetSettingsToDefaults,
    handleStreamPress,
  }
}
