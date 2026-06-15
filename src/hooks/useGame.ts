import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeAudio, setVoicePreference, speakLetter, stopSpeech } from '../lib/audio'
import { getGameLabel } from '../lib/constants'
import { shouldRespond, getActiveStreams } from '../lib/gating'
import { addPlayTime, getTodayPlayTimeMs, saveSession } from '../lib/history'
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
  GameSession,
  GameSettings,
  SessionStats,
  Stream,
  TrialFeedback,
  TrialResult,
} from '../types/game'

function buildStreamCorrect(
  pressed: Set<Stream>,
  streamMatchesMap: Record<Stream, boolean>,
  gate: { position: boolean; letter: boolean; color: boolean; shape: boolean },
): Partial<Record<Stream, boolean>> {
  const result: Partial<Record<Stream, boolean>> = {}
  for (const stream of getActiveStreams(gate)) {
    result[stream] = streamMatchesMap[stream] === pressed.has(stream)
  }
  return result
}

function getWrongStreams(
  streamCorrect: Partial<Record<Stream, boolean>>,
  activeStreams: Stream[],
): Set<Stream> {
  const wrong = new Set<Stream>()
  for (const stream of activeStreams) {
    if (streamCorrect[stream] === false) wrong.add(stream)
  }
  return wrong
}

function getCorrectStreams(
  streamCorrect: Partial<Record<Stream, boolean>>,
  activeStreams: Stream[],
): Set<Stream> {
  const correct = new Set<Stream>()
  for (const stream of activeStreams) {
    if (streamCorrect[stream] === true) correct.add(stream)
  }
  return correct
}

export function useGame() {
  const [phase, setPhase] = useState<GamePhase>('ready')
  const [settings, setSettings] = useState<GameSettings>(() => {
    const loaded = loadSettings()
    setVoicePreference(loaded.voiceUri)
    return loaded
  })
  const [trials, setTrials] = useState<ReturnType<typeof generateTrials>>([])
  const [trialIndex, setTrialIndex] = useState(0)
  const [results, setResults] = useState<TrialResult[]>([])
  const [feedback, setFeedback] = useState<TrialFeedback>(null)
  const [respondedThisTrial, setRespondedThisTrial] = useState(false)
  const [pressedStreams, setPressedStreams] = useState<Set<Stream>>(new Set())
  const [wrongStreams, setWrongStreams] = useState<Set<Stream>>(new Set())
  const [correctStreams, setCorrectStreams] = useState<Set<Stream>>(new Set())
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [suggestedN, setSuggestedN] = useState(settings.nLevel)
  const [todayPlayMs, setTodayPlayMs] = useState(() => getTodayPlayTimeMs())
  const [, setConsecutiveWins] = useState(0)
  const [, setConsecutiveLosses] = useState(0)

  const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trialClockIdRef = useRef(0)
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const pressedStreamsRef = useRef(pressedStreams)
  const respondedThisTrialRef = useRef(respondedThisTrial)
  const finishTrialRef = useRef<() => void>(() => {})
  const advanceTrialRef = useRef<() => void>(() => {})

  pressedStreamsRef.current = pressedStreams
  respondedThisTrialRef.current = respondedThisTrial

  const currentTrial = trials[trialIndex] ?? null
  const nLevel = settings.nLevel
  const isScorable = trialIndex >= nLevel
  const playedTrials = settings.trialCount
  const playedIndex = Math.max(trialIndex - nLevel, 0)
  const trialsRemaining = Math.max(playedTrials - playedIndex - 1, 0)
  const isPlaying = phase === 'playing'

  const clearTimers = useCallback(() => {
    trialClockIdRef.current += 1
    if (trialTimeoutRef.current) {
      clearTimeout(trialTimeoutRef.current)
      trialTimeoutRef.current = null
    }
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current)
      advanceTimeoutRef.current = null
    }
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current)
      speakTimeoutRef.current = null
    }
    stopSpeech()
  }, [])

  const recordPlayTime = useCallback(() => {
    if (sessionStartRef.current) {
      const elapsed = Date.now() - sessionStartRef.current
      addPlayTime(elapsed)
      setTodayPlayMs(getTodayPlayTimeMs())
      sessionStartRef.current = null
      return elapsed
    }
    return 0
  }, [])

  const saveSessionResult = useCallback(
    (sessionResults: TrialResult[], durationMs: number, cancelled: boolean) => {
      if (sessionResults.length === 0) return
      const sessionStats = computeStats(sessionResults)
      const streamAvg =
        (sessionStats.streamScores.position +
          sessionStats.streamScores.letter +
          sessionStats.streamScores.color +
          sessionStats.streamScores.shape) /
        4

      const session: GameSession = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        gameLabel: getGameLabel(settings),
        nLevel: settings.nLevel,
        totalScore: Math.round(streamAvg),
        streamScores: sessionStats.streamScores,
        durationMs,
        cancelled,
      }
      saveSession(session)
    },
    [settings],
  )

  const finishTrial = useCallback(() => {
    if (!currentTrial || respondedThisTrialRef.current || !isScorable) return

    const pressed = pressedStreamsRef.current
    const past = trials[trialIndex - nLevel]
    let trialFeedback: TrialFeedback
    let correct: boolean
    let shouldMatch: boolean
    let streamCorrect: Partial<Record<Stream, boolean>> = {}
    const activeStreams = getActiveStreams(currentTrial.inputGate)

    if (settings.responseMode === 'gated') {
      shouldMatch = shouldRespond(
        currentTrial.stimulus,
        past.stimulus,
        currentTrial.inputGate,
        currentTrial.outputGate,
      )
      const responded = pressed.size > 0
      if (shouldMatch && responded) {
        trialFeedback = 'hit'
        correct = true
      } else if (shouldMatch && !responded) {
        trialFeedback = 'miss'
        correct = false
      } else if (!shouldMatch && responded) {
        trialFeedback = 'false-alarm'
        correct = false
      } else {
        trialFeedback = 'correct-reject'
        correct = true
      }
      const streamMatchesMap = getStreamMatchesForTrial(
        currentTrial.stimulus,
        past.stimulus,
        currentTrial.inputGate,
      )
      streamCorrect = buildStreamCorrect(pressed, streamMatchesMap, currentTrial.inputGate)
    } else {
      const streamMatchesMap = getStreamMatchesForTrial(
        currentTrial.stimulus,
        past.stimulus,
        currentTrial.inputGate,
      )
      const result = evaluatePerStreamResponse(
        pressed,
        streamMatchesMap,
        currentTrial.inputGate,
      )
      trialFeedback = result.feedback
      correct = result.correct
      shouldMatch = Object.values(streamMatchesMap).some(Boolean)
      streamCorrect = buildStreamCorrect(pressed, streamMatchesMap, currentTrial.inputGate)
    }

    setCorrectStreams(getCorrectStreams(streamCorrect, activeStreams))
    setWrongStreams(getWrongStreams(streamCorrect, activeStreams))

    if (settings.feedbackMode === 'hide') {
      setFeedback(null)
    } else {
      setFeedback(trialFeedback)
    }

    setRespondedThisTrial(true)
    respondedThisTrialRef.current = true

    const trialResult: TrialResult = {
      trialIndex,
      responded: pressed.size > 0,
      correct,
      shouldMatch,
      feedback: trialFeedback,
      outputGate: currentTrial.outputGate,
      activeStreams,
      pressedStreams: [...pressed],
      streamCorrect,
    }

    setResults((prev) => [...prev, trialResult])
  }, [currentTrial, isScorable, trials, trialIndex, nLevel, settings])

  const handleStreamPress = useCallback(
    (stream: Stream) => {
      if (!currentTrial || respondedThisTrialRef.current || !isScorable || phase !== 'playing') return
      if (!currentTrial.inputGate[stream]) return
      setPressedStreams((prev) => {
        const next = new Set(prev).add(stream)
        pressedStreamsRef.current = next
        return next
      })
    },
    [currentTrial, isScorable, phase],
  )

  const endSession = useCallback(
    (cancelled: boolean) => {
      clearTimers()
      const durationMs = recordPlayTime()

      setResults((prev) => {
        if (prev.length > 0) {
          saveSessionResult(prev, durationMs, cancelled)

          if (!cancelled) {
            const sessionStats = computeStats(prev)
            setStats(sessionStats)

            const streamAvg =
              (sessionStats.streamScores.position +
                sessionStats.streamScores.letter +
                sessionStats.streamScores.color +
                sessionStats.streamScores.shape) /
              4

            if (streamAvg / 100 >= settings.autoProgressionThreshold) {
              setConsecutiveWins((w) => {
                const nextWins = w + 1
                if (
                  settings.autoProgression &&
                  nextWins >= settings.winAfter &&
                  streamAvg / 100 >= settings.autoProgressionThreshold
                ) {
                  const nextN = Math.min(settings.nLevel + 1, 9)
                  if (nextN > settings.nLevel) {
                    setSettings((s) => {
                      const updated = { ...s, nLevel: nextN }
                      saveSettings(updated)
                      return updated
                    })
                    return 0
                  }
                }
                return nextWins
              })
              setConsecutiveLosses(0)
            } else if (settings.autoProgression) {
              setConsecutiveWins(0)
              setConsecutiveLosses((l) => {
                const nextLosses = l + 1
                if (
                  nextLosses >= settings.loseAfter &&
                  streamAvg / 100 < settings.autoProgressionThreshold
                ) {
                  const nextN = Math.max(settings.nLevel - 1, 1)
                  if (nextN < settings.nLevel) {
                    setSettings((s) => {
                      const updated = { ...s, nLevel: nextN }
                      saveSettings(updated)
                      return updated
                    })
                    return 0
                  }
                }
                return nextLosses
              })
            } else {
              setConsecutiveWins(0)
            }

            if (settings.adaptive) {
              setSuggestedN(suggestNLevel(sessionStats, settings.nLevel))
            }
          }
        }
        return prev
      })

      setPhase(cancelled ? 'ready' : 'results')
      setTrialIndex(0)
      setFeedback(null)
      pressedStreamsRef.current = new Set()
      setPressedStreams(new Set())
      setWrongStreams(new Set())
      setCorrectStreams(new Set())
      if (cancelled) {
        setTrials([])
        setStats(null)
      }
    },
    [clearTimers, recordPlayTime, saveSessionResult, settings],
  )

  const advanceTrial = useCallback(() => {
    setFeedback(null)
    setRespondedThisTrial(false)
    respondedThisTrialRef.current = false
    pressedStreamsRef.current = new Set()
    setPressedStreams(new Set())
    setWrongStreams(new Set())
    setCorrectStreams(new Set())

    if (trialIndex + 1 >= trials.length) {
      endSession(false)
      return
    }

    setTrialIndex((i) => i + 1)
  }, [trialIndex, trials.length, endSession])

  finishTrialRef.current = finishTrial
  advanceTrialRef.current = advanceTrial

  const startSession = useCallback(async () => {
    await resumeAudio()
    clearTimers()
    cancelledRef.current = false
    const generated = generateTrials(settings)
    setTrials(generated)
    setTrialIndex(nLevel)
    setResults([])
    setFeedback(null)
    setRespondedThisTrial(false)
    respondedThisTrialRef.current = false
    pressedStreamsRef.current = new Set()
    setPressedStreams(new Set())
    setWrongStreams(new Set())
    setCorrectStreams(new Set())
    setStats(null)
    sessionStartRef.current = Date.now()
    setPhase('playing')
  }, [settings, clearTimers])

  const handlePlay = useCallback(() => {
    if (settings.tutorialMode) {
      setPhase('tutorial')
    } else {
      void startSession()
    }
  }, [settings.tutorialMode, startSession])

  const exitTutorial = useCallback(() => {
    setPhase('ready')
  }, [])

  const stopSession = useCallback(() => {
    cancelledRef.current = true
    endSession(true)
  }, [endSession])

  const dismissResults = useCallback(() => {
    setPhase('ready')
    setStats(null)
    setTrials([])
    if (settings.adaptive && suggestedN !== settings.nLevel) {
      setSettings((prev) => {
        const next = { ...prev, nLevel: suggestedN }
        saveSettings(next)
        return next
      })
    }
  }, [settings.adaptive, settings.nLevel, suggestedN])

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
      setVoicePreference(next.voiceUri)
      return next
    })
  }, [])

  const resetSettingsToDefaults = useCallback(() => {
    const defaults = resetSettings()
    setSettings(defaults)
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return

    const trial = trials[trialIndex]
    if (!trial) return

    const clockId = ++trialClockIdRef.current
    const scorable = trialIndex >= settings.nLevel

    if (trial.inputGate.letter && settings.soundEnabled) {
      speakLetter(trial.stimulus.letter, true)
      speakTimeoutRef.current = setTimeout(() => {}, 900)
    }

    trialTimeoutRef.current = setTimeout(() => {
      if (trialClockIdRef.current !== clockId) return
      if (!respondedThisTrialRef.current && scorable) {
        finishTrialRef.current()
      }
      advanceTimeoutRef.current = setTimeout(() => {
        if (trialClockIdRef.current === clockId) {
          advanceTrialRef.current()
        }
      }, 200)
    }, settings.intervalMs)

    return () => {
      trialClockIdRef.current += 1
      if (trialTimeoutRef.current) {
        clearTimeout(trialTimeoutRef.current)
        trialTimeoutRef.current = null
      }
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current)
        advanceTimeoutRef.current = null
      }
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current)
        speakTimeoutRef.current = null
      }
      stopSpeech()
    }
  }, [phase, trialIndex, trials, settings.intervalMs, settings.soundEnabled, settings.nLevel])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing' || respondedThisTrialRef.current || !isScorable) return

      const stream = streamFromKey(e.key, settings.keys)
      if (stream) {
        e.preventDefault()
        handleStreamPress(stream)
        return
      }

      if (settings.responseMode === 'gated' && e.code === 'Space') {
        e.preventDefault()
        const active = new Set(getActiveStreams(currentTrial!.inputGate))
        pressedStreamsRef.current = active
        setPressedStreams(active)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    phase,
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
    totalTrials: playedTrials,
    playedIndex,
    trialsRemaining,
    nLevel,
    isScorable,
    feedback,
    stats,
    suggestedN,
    results,
    todayPlayMs,
    isPlaying,
    pressedStreams,
    wrongStreams,
    correctStreams,
    handlePlay,
    startSession,
    stopSession,
    exitTutorial,
    dismissResults,
    updateSettings,
    resetSettings: resetSettingsToDefaults,
    handleStreamPress,
  }
}
