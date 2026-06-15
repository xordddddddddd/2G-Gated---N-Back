import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playFeedback, resumeAudio, speakLetter, stopSpeech } from '../lib/audio'
import { shouldRespond, getActiveStreams } from '../lib/gating'
import {
  evaluatePerStreamResponse,
  getStreamMatchesForTrial,
  streamFromKey,
} from '../lib/response'
import { getTutorialSteps, type TutorialStep } from '../lib/tutorial'
import type { GameSettings, Stream, TrialFeedback } from '../types/game'

export type TutorialView = 'info' | 'practice' | 'feedback'

export function useTutorial(settings: Pick<GameSettings, 'gameMode' | 'soundEnabled' | 'keys' | 'gridMode' | 'rotationSpeed'>) {
  const steps = useMemo(() => getTutorialSteps(settings.gameMode), [settings.gameMode])

  const [stepIndex, setStepIndex] = useState(0)
  const [view, setView] = useState<TutorialView>('info')
  const [trialIndex, setTrialIndex] = useState(0)
  const [feedback, setFeedback] = useState<TrialFeedback>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [respondedThisTrial, setRespondedThisTrial] = useState(false)
  const [pressedStreams, setPressedStreams] = useState<Set<Stream>>(new Set())
  const [retryTrial, setRetryTrial] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step: TutorialStep = steps[stepIndex]
  const trials = step.trials ?? []
  const nLevel = step.nLevel ?? 2
  const intervalMs = step.intervalMs ?? 4000
  const currentTrial = trials[trialIndex] ?? null
  const isScorable = trialIndex >= nLevel
  const isLastStep = stepIndex >= steps.length - 1
  const isPracticeStep = step.kind === 'practice'
  const usePerStream = step.responseMode === 'per-stream'

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
  }, [])

  const resetTrialState = useCallback(() => {
    setFeedback(null)
    setFeedbackMessage(null)
    setRespondedThisTrial(false)
    setPressedStreams(new Set())
    setRetryTrial(false)
  }, [])

  const goToStep = useCallback(
    (index: number) => {
      clearTimers()
      setStepIndex(index)
      setView('info')
      setTrialIndex(0)
      resetTrialState()
    },
    [clearTimers, resetTrialState],
  )

  const evaluateTrial = useCallback(
    (pressed: Set<Stream>) => {
      if (!currentTrial || !isScorable) return null

      const past = trials[trialIndex - nLevel]
      let trialFeedback: TrialFeedback
      let message: string
      let correct: boolean

      if (usePerStream) {
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
        if (result.feedback === 'hit') message = 'Correct! You caught the match.'
        else if (result.feedback === 'miss') message = 'A stream matched n-back — press its key.'
        else if (result.feedback === 'false-alarm') message = 'No match needed for the keys you pressed.'
        else message = 'Correct — no match this trial.'
      } else {
        const shouldMatch = shouldRespond(
          currentTrial.stimulus,
          past.stimulus,
          currentTrial.inputGate,
          currentTrial.outputGate,
        )
        const responded = pressed.size > 0
        if (shouldMatch && responded) {
          trialFeedback = 'hit'
          correct = true
          message = 'Correct! You identified the match.'
        } else if (shouldMatch && !responded) {
          trialFeedback = 'miss'
          correct = false
          message = 'That was a match — press Match when the output gate rule is satisfied.'
        } else if (!shouldMatch && responded) {
          trialFeedback = 'false-alarm'
          correct = false
          message = 'No match this trial. Check the active streams and output gate rule.'
        } else {
          trialFeedback = 'correct-reject'
          correct = true
          message = 'Correct — no match needed here.'
        }
      }

      return { trialFeedback, message, correct }
    },
    [currentTrial, isScorable, trials, trialIndex, nLevel, usePerStream],
  )

  const finishTrial = useCallback(
    (pressed: Set<Stream>) => {
      if (!currentTrial || respondedThisTrial || !isScorable || view !== 'practice') return

      const result = evaluateTrial(pressed)
      if (!result) return

      const { trialFeedback, message, correct } = result
      const needsRetry = !correct && Boolean(step.waitForCorrect)

      if (trialFeedback === 'hit' || trialFeedback === 'correct-reject') playFeedback('hit')
      else if (trialFeedback === 'miss') playFeedback('miss')
      else playFeedback('false-alarm')

      setRespondedThisTrial(true)
      setFeedback(trialFeedback)
      setFeedbackMessage(message)
      setRetryTrial(needsRetry)
      setView('feedback')
    },
    [currentTrial, respondedThisTrial, isScorable, view, evaluateTrial, step.waitForCorrect],
  )

  const handleStreamPress = useCallback(
    (stream: Stream) => {
      if (!currentTrial || respondedThisTrial || !isScorable || view !== 'practice') return
      if (!currentTrial.inputGate[stream]) return
      setPressedStreams((prev) => new Set(prev).add(stream))
    },
    [currentTrial, respondedThisTrial, isScorable, view],
  )

  const handleMatch = useCallback(() => {
    finishTrial(new Set(getActiveStreams(currentTrial!.inputGate)))
  }, [finishTrial, currentTrial])

  const startPractice = useCallback(async () => {
    await resumeAudio()
    clearTimers()
    setTrialIndex(0)
    resetTrialState()
    setView('practice')
  }, [clearTimers, resetTrialState])

  const nextStep = useCallback(() => {
    if (stepIndex < steps.length - 1) goToStep(stepIndex + 1)
  }, [stepIndex, steps.length, goToStep])

  const prevStep = useCallback(() => {
    if (stepIndex > 0) goToStep(stepIndex - 1)
  }, [stepIndex, goToStep])

  const resetTutorial = useCallback(() => {
    goToStep(0)
  }, [goToStep])

  const continueFromFeedback = useCallback(() => {
    clearTimers()
    resetTrialState()

    if (retryTrial) {
      setView('practice')
      return
    }

    if (trialIndex + 1 >= trials.length) {
      setView('info')
      setTrialIndex(0)
      if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1)
      return
    }

    setTrialIndex((i) => i + 1)
    setView('practice')
  }, [clearTimers, resetTrialState, retryTrial, trialIndex, trials.length, stepIndex, steps.length])

  const advanceWarmup = useCallback(() => {
    if (trialIndex + 1 >= trials.length) {
      setView('info')
      return
    }
    setTrialIndex((i) => i + 1)
  }, [trialIndex, trials.length])

  useEffect(() => {
    setStepIndex(0)
    setView('info')
    setTrialIndex(0)
    setFeedback(null)
    setFeedbackMessage(null)
    setRespondedThisTrial(false)
    setPressedStreams(new Set())
    setRetryTrial(false)
  }, [settings.gameMode])

  useEffect(() => {
    if (view !== 'practice' || !currentTrial) return

    if (currentTrial.inputGate.letter && settings.soundEnabled) {
      speakLetter(currentTrial.stimulus.letter, true)
      speakTimeoutRef.current = setTimeout(() => {}, 900)
    }

    intervalRef.current = setInterval(() => {
      if (isScorable) {
        if (!respondedThisTrial) finishTrial(pressedStreams)
      } else {
        advanceWarmup()
      }
    }, intervalMs)

    return clearTimers
  }, [
    view,
    trialIndex,
    currentTrial,
    settings.soundEnabled,
    intervalMs,
    isScorable,
    respondedThisTrial,
    pressedStreams,
    finishTrial,
    advanceWarmup,
    clearTimers,
  ])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (view === 'practice' && isScorable && !respondedThisTrial) {
        const stream = streamFromKey(e.key, settings.keys)
        if (stream) {
          e.preventDefault()
          handleStreamPress(stream)
          return
        }
        if (!usePerStream && e.code === 'Space') {
          e.preventDefault()
          handleMatch()
        }
      } else if (view === 'feedback' && e.code === 'Space') {
        e.preventDefault()
        continueFromFeedback()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    view,
    isScorable,
    respondedThisTrial,
    settings.keys,
    usePerStream,
    handleStreamPress,
    handleMatch,
    continueFromFeedback,
  ])

  useEffect(() => () => clearTimers(), [clearTimers])

  return {
    step,
    stepIndex,
    totalSteps: steps.length,
    view,
    trialIndex,
    totalTrials: trials.length,
    nLevel,
    currentTrial,
    isScorable,
    feedback,
    feedbackMessage,
    isLastStep,
    isPracticeStep,
    pressedStreams,
    usePerStream,
    nextStep,
    prevStep,
    resetTutorial,
    startPractice,
    handleMatch,
    handleStreamPress,
    continueFromFeedback,
  }
}
