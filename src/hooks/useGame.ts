import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeAudio, setVoicePreference, speakLetter, stopSpeech } from '../lib/audio'
import {
  get2GBlockLength,
  get2GPlayedIndex,
  is2GBlockStart,
  is2GTrialScorable,
} from '../lib/constants'
import { getGameLabel } from '../lib/constants'
import { shouldRespond, getActiveStreams } from '../lib/gating'
import { addPlayTime, getTodayPlayTimeMs, saveSession } from '../lib/history'
import { generateTrials } from '../lib/sequence'
import { loadSettings, saveSettings, resetSettings } from '../lib/settings'
import {
  evaluate2GResponse,
  evaluatePerStreamResponse,
  getExpectedPressedStreams,
  getStreamMatchesForTrial,
  streamFromKey,
} from '../lib/response'
import { streamFromKeyFor2G } from '../lib/twoG'
import { computeStats, suggestNLevel, averageStreamScores } from '../lib/stats'
import { cancelTrialClock, startTrialClock } from '../lib/trialClockWorker'
import type {
  GamePhase,
  GameSession,
  GameSettings,
  InputGate,
  OutputGate,
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
  streamMatchesMap: Record<Stream, boolean>,
  pressed: Set<Stream>,
  activeStreams: Stream[],
): Set<Stream> {
  const wrong = new Set<Stream>()
  for (const stream of activeStreams) {
    const shouldMatch = streamMatchesMap[stream]
    const didPress = pressed.has(stream)
    if ((shouldMatch && !didPress) || (!shouldMatch && didPress)) {
      wrong.add(stream)
    }
  }
  return wrong
}

function getCorrectStreams(
  streamMatchesMap: Record<Stream, boolean>,
  pressed: Set<Stream>,
  activeStreams: Stream[],
): Set<Stream> {
  const correct = new Set<Stream>()
  for (const stream of activeStreams) {
    if (streamMatchesMap[stream] && pressed.has(stream)) {
      correct.add(stream)
    }
  }
  return correct
}

function get2GGlowStreams(
  pressed: Set<Stream>,
  streamMatchesMap: Record<Stream, boolean>,
  gate: { position: boolean; letter: boolean; color: boolean; shape: boolean },
  outputGate: OutputGate,
): { correct: Set<Stream>; wrong: Set<Stream> } {
  const expected = getExpectedPressedStreams(streamMatchesMap, gate, outputGate)
  const active = getActiveStreams(gate)
  const correct = new Set<Stream>()
  const wrong = new Set<Stream>()
  for (const stream of active) {
    if (expected.has(stream) && pressed.has(stream)) correct.add(stream)
    else if (expected.has(stream) !== pressed.has(stream)) wrong.add(stream)
  }
  return { correct, wrong }
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
  const [blockCue, setBlockCue] = useState<{
    inputGate: InputGate
    outputGate: OutputGate
    blockNumber: number
    keysSwapped: boolean
  } | null>(null)
  const [awaitingBlockCue, setAwaitingBlockCue] = useState(false)
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [suggestedN, setSuggestedN] = useState(settings.nLevel)
  const [todayPlayMs, setTodayPlayMs] = useState(() => getTodayPlayTimeMs())
  const [, setConsecutiveWins] = useState(0)
  const [, setConsecutiveLosses] = useState(0)

  const stopTrialClockRef = useRef<(() => void) | null>(null)
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
  const isScorable =
    settings.gameMode === '2g'
      ? is2GTrialScorable(trialIndex, nLevel)
      : trialIndex >= nLevel
  const playedTrials = settings.trialCount
  const playedIndex =
    settings.gameMode === '2g'
      ? get2GPlayedIndex(trialIndex, nLevel)
      : Math.max(trialIndex - nLevel, 0)
  const trialsRemaining = Math.max(playedTrials - playedIndex - 1, 0)
  const isPlaying = phase === 'playing'

  const clearTimers = useCallback(() => {
    trialClockIdRef.current += 1
    stopTrialClockRef.current?.()
    stopTrialClockRef.current = null
    cancelTrialClock()
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
      const streamAvg = averageStreamScores(sessionStats.streamScores, sessionStats.usedStreams)

      const session: GameSession = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        gameLabel: getGameLabel(settings),
        nLevel: settings.nLevel,
        totalScore: streamAvg,
        streamScores: sessionStats.streamScores,
        usedStreams: sessionStats.usedStreams,
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

    if (settings.gameMode === '2g') {
      const streamMatchesMap = getStreamMatchesForTrial(
        currentTrial.stimulus,
        past.stimulus,
        currentTrial.inputGate,
      )
      const result = evaluate2GResponse(
        pressed,
        streamMatchesMap,
        currentTrial.inputGate,
        currentTrial.outputGate,
      )
      trialFeedback = result.feedback
      correct = result.correct
      shouldMatch = getExpectedPressedStreams(
        streamMatchesMap,
        currentTrial.inputGate,
        currentTrial.outputGate,
      ).size > 0
      streamCorrect = buildStreamCorrect(pressed, streamMatchesMap, currentTrial.inputGate)
      const glow = get2GGlowStreams(
        pressed,
        streamMatchesMap,
        currentTrial.inputGate,
        currentTrial.outputGate,
      )
      setCorrectStreams(glow.correct)
      setWrongStreams(glow.wrong)
    } else if (settings.responseMode === 'gated') {
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
      setCorrectStreams(getCorrectStreams(streamMatchesMap, pressed, activeStreams))
      setWrongStreams(getWrongStreams(streamMatchesMap, pressed, activeStreams))
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
      setCorrectStreams(getCorrectStreams(streamMatchesMap, pressed, activeStreams))
      setWrongStreams(getWrongStreams(streamMatchesMap, pressed, activeStreams))
    }

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
      if (
        !currentTrial ||
        respondedThisTrialRef.current ||
        !isScorable ||
        phase !== 'playing' ||
        awaitingBlockCue
      ) {
        return
      }
      if (!currentTrial.inputGate[stream]) return
      setPressedStreams((prev) => {
        const next = new Set(prev).add(stream)
        pressedStreamsRef.current = next
        return next
      })
    },
    [currentTrial, isScorable, phase, awaitingBlockCue],
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

            const streamAvg = averageStreamScores(
              sessionStats.streamScores,
              sessionStats.usedStreams,
            )

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
      setBlockCue(null)
      setAwaitingBlockCue(false)
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

    const nextIndex = trialIndex + 1
    if (nextIndex >= trials.length) {
      endSession(false)
      return
    }

    if (
      settings.gameMode === '2g' &&
      is2GBlockStart(nextIndex, settings.nLevel) &&
      nextIndex > 0
    ) {
      const nextTrial = trials[nextIndex]
      setBlockCue({
        inputGate: nextTrial.inputGate,
        outputGate: nextTrial.outputGate,
        blockNumber: Math.floor(nextIndex / get2GBlockLength(settings.nLevel)) + 1,
        keysSwapped: nextTrial.keysSwapped ?? false,
      })
      setAwaitingBlockCue(true)
      setTrialIndex(nextIndex)
      return
    }

    setTrialIndex(nextIndex)
  }, [trialIndex, trials, endSession, settings.gameMode, settings.nLevel])

  finishTrialRef.current = finishTrial
  advanceTrialRef.current = advanceTrial

  const startSession = useCallback(async () => {
    await resumeAudio()
    clearTimers()
    cancelledRef.current = false
    const generated = generateTrials(settings)
    setTrials(generated)
    const startAt = settings.gameMode === '2g' ? 0 : nLevel
    setTrialIndex(startAt)
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

    if (settings.gameMode === '2g' && generated[0]) {
      setBlockCue({
        inputGate: generated[0].inputGate,
        outputGate: generated[0].outputGate,
        blockNumber: 1,
        keysSwapped: generated[0].keysSwapped ?? false,
      })
      setAwaitingBlockCue(true)
    } else {
      setBlockCue(null)
      setAwaitingBlockCue(false)
    }

    setPhase('playing')
  }, [settings, clearTimers, nLevel])

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
  }, [])

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
    if (!awaitingBlockCue) return
    const timer = setTimeout(() => setAwaitingBlockCue(false), 2500)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setAwaitingBlockCue(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [awaitingBlockCue])

  useEffect(() => {
    if (phase !== 'playing' || awaitingBlockCue) return

    const trial = trials[trialIndex]
    if (!trial) return

    const clockId = ++trialClockIdRef.current
    const scorable =
      settings.gameMode === '2g'
        ? is2GTrialScorable(trialIndex, settings.nLevel)
        : trialIndex >= settings.nLevel
    const trialMs = trial.intervalMs ?? settings.intervalMs

    if (trial.inputGate.letter && settings.soundEnabled) {
      speakLetter(trial.stimulus.letter, true)
      speakTimeoutRef.current = setTimeout(() => {}, 900)
    }

    stopTrialClockRef.current?.()
    stopTrialClockRef.current = startTrialClock(
      clockId,
      trialMs,
      200,
      (event) => {
        if (trialClockIdRef.current !== event.clockId) return
        if (event.type === 'finish') {
          if (!respondedThisTrialRef.current && scorable) {
            finishTrialRef.current()
          }
        } else if (event.type === 'advance') {
          advanceTrialRef.current()
        }
      },
    )

    return () => {
      trialClockIdRef.current += 1
      stopTrialClockRef.current?.()
      stopTrialClockRef.current = null
      cancelTrialClock()
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current)
        speakTimeoutRef.current = null
      }
      stopSpeech()
    }
  }, [
    phase,
    trialIndex,
    trials,
    settings.intervalMs,
    settings.gameMode,
    settings.soundEnabled,
    settings.nLevel,
    awaitingBlockCue,
  ])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing' || respondedThisTrialRef.current || !isScorable || awaitingBlockCue) return

      const stream =
        settings.gameMode === '2g' && currentTrial
          ? streamFromKeyFor2G(
              e.key,
              settings.keys,
              currentTrial.inputGate,
              currentTrial.keysSwapped ?? false,
            )
          : streamFromKey(e.key, settings.keys)
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
    settings.gameMode,
    settings.responseMode,
    handleStreamPress,
    currentTrial,
    awaitingBlockCue,
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
    blockCue,
    awaitingBlockCue,
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
