import { useCallback, useEffect, useRef, useState } from 'react'
import { playFeedback, resumeAudio, speakLetter, stopSpeech } from '../lib/audio'
import { shouldRespond, getActiveStreams } from '../lib/gating'
import { generateTrials } from '../lib/sequence'
import { computeStats, suggestNLevel } from '../lib/stats'
import { DEFAULT_SETTINGS } from '../lib/constants'
import type {
  GamePhase,
  GameSettings,
  SessionStats,
  Trial,
  TrialFeedback,
  TrialResult,
} from '../types/game'

export function useGame() {
  const [phase, setPhase] = useState<GamePhase>('menu')
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [trials, setTrials] = useState<Trial[]>([])
  const [trialIndex, setTrialIndex] = useState(0)
  const [results, setResults] = useState<TrialResult[]>([])
  const [feedback, setFeedback] = useState<TrialFeedback>(null)
  const [countdown, setCountdown] = useState(3)
  const [respondedThisTrial, setRespondedThisTrial] = useState(false)
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [suggestedN, setSuggestedN] = useState(settings.nLevel)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentTrial = trials[trialIndex] ?? null
  const nLevel = settings.nLevel
  const isScorable = trialIndex >= nLevel

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current)
      speakTimeoutRef.current = null
    }
    stopSpeech()
    setIsSpeaking(false)
  }, [])

  const finishTrial = useCallback(
    (responded: boolean) => {
      if (!currentTrial || respondedThisTrial || !isScorable) return

      const past = trials[trialIndex - nLevel]
      const shouldMatch = shouldRespond(
        currentTrial.stimulus,
        past.stimulus,
        currentTrial.inputGate,
        currentTrial.outputGate,
      )

      let trialFeedback: TrialFeedback
      if (shouldMatch && responded) {
        trialFeedback = 'hit'
        playFeedback('hit')
      } else if (shouldMatch && !responded) {
        trialFeedback = 'miss'
        playFeedback('miss')
      } else if (!shouldMatch && responded) {
        trialFeedback = 'false-alarm'
        playFeedback('false-alarm')
      } else {
        trialFeedback = 'correct-reject'
      }

      setRespondedThisTrial(true)
      setFeedback(trialFeedback)

      const result: TrialResult = {
        trialIndex,
        responded,
        correct: trialFeedback === 'hit' || trialFeedback === 'correct-reject',
        shouldMatch,
        feedback: trialFeedback,
        outputGate: currentTrial.outputGate,
        activeStreams: getActiveStreams(currentTrial.inputGate),
      }

      setResults((prev) => [...prev, result])
    },
    [currentTrial, respondedThisTrial, isScorable, trials, trialIndex, nLevel],
  )

  const handleMatch = useCallback(() => {
    finishTrial(true)
  }, [finishTrial])

  const advanceTrial = useCallback(() => {
    setFeedback(null)
    setRespondedThisTrial(false)

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
  }, [trialIndex, trials.length, clearTimers, results, settings])

  const startSession = useCallback(async () => {
    await resumeAudio()
    clearTimers()
    const generated = generateTrials(settings.nLevel, settings.nLevel + settings.trialCount)
    setTrials(generated)
    setTrialIndex(0)
    setResults([])
    setFeedback(null)
    setRespondedThisTrial(false)
    setStats(null)
    setCountdown(3)
    setPhase('countdown')

    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          setPhase('playing')
          return 0
        }
        return c - 1
      })
    }, 1000)
  }, [settings, clearTimers])

  const pauseSession = useCallback(() => {
    clearTimers()
    setPhase('paused')
  }, [clearTimers])

  const resumeSession = useCallback(() => {
    setPhase('playing')
  }, [])

  const resetToMenu = useCallback(() => {
    clearTimers()
    setPhase('menu')
    setTrialIndex(0)
    setResults([])
    setFeedback(null)
    setStats(null)
  }, [clearTimers])

  const startTutorial = useCallback(() => {
    clearTimers()
    setPhase('tutorial')
    setTrialIndex(0)
    setResults([])
    setFeedback(null)
    setStats(null)
  }, [clearTimers])

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
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
        finishTrial(false)
      }
      setTimeout(advanceTrial, 300)
    }, settings.intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
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
  ])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'playing') {
        e.preventDefault()
        handleMatch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, handleMatch])

  useEffect(() => () => clearTimers(), [clearTimers])

  return {
    phase,
    settings,
    currentTrial,
    trialIndex,
    totalTrials: trials.length,
    nLevel,
    isScorable,
    feedback,
    countdown,
    stats,
    suggestedN,
    results,
    isSpeaking,
    startSession,
    pauseSession,
    resumeSession,
    resetToMenu,
    startTutorial,
    updateSettings,
    handleMatch,
  }
}
