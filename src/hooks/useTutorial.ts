import { useCallback, useEffect, useRef, useState } from 'react'
import { playFeedback, resumeAudio, speakLetter, stopSpeech } from '../lib/audio'
import { shouldRespond, getActiveStreams } from '../lib/gating'
import { TUTORIAL_STEPS, type TutorialStep } from '../lib/tutorial'
import type { TrialFeedback } from '../types/game'

export type TutorialView = 'info' | 'practice' | 'feedback'

export function useTutorial(soundEnabled: boolean) {
  const [stepIndex, setStepIndex] = useState(0)
  const [view, setView] = useState<TutorialView>('info')
  const [trialIndex, setTrialIndex] = useState(0)
  const [feedback, setFeedback] = useState<TrialFeedback>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [respondedThisTrial, setRespondedThisTrial] = useState(false)
  const [retryTrial, setRetryTrial] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step: TutorialStep = TUTORIAL_STEPS[stepIndex]
  const trials = step.trials ?? []
  const nLevel = step.nLevel ?? 2
  const intervalMs = step.intervalMs ?? 4000
  const currentTrial = trials[trialIndex] ?? null
  const isScorable = trialIndex >= nLevel
  const isLastStep = stepIndex >= TUTORIAL_STEPS.length - 1
  const isPracticeStep = step.kind === 'practice'

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

  const resetTrialState = useCallback(() => {
    setFeedback(null)
    setFeedbackMessage(null)
    setRespondedThisTrial(false)
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

  const finishTrial = useCallback(
    (responded: boolean) => {
      if (!currentTrial || respondedThisTrial || !isScorable || view !== 'practice') return

      const past = trials[trialIndex - nLevel]
      const shouldMatch = shouldRespond(
        currentTrial.stimulus,
        past.stimulus,
        currentTrial.inputGate,
        currentTrial.outputGate,
      )

      let trialFeedback: TrialFeedback
      let message: string
      let needsRetry = false

      if (shouldMatch && responded) {
        trialFeedback = 'hit'
        message = 'Correct! You identified the match.'
        playFeedback('hit')
      } else if (shouldMatch && !responded) {
        trialFeedback = 'miss'
        message = 'That was a match — press Match when the output gate rule is satisfied.'
        playFeedback('miss')
        needsRetry = Boolean(step.waitForCorrect)
      } else if (!shouldMatch && responded) {
        trialFeedback = 'false-alarm'
        message = 'No match this trial. Check the active streams and output gate rule.'
        playFeedback('false-alarm')
        needsRetry = Boolean(step.waitForCorrect)
      } else {
        trialFeedback = 'correct-reject'
        message = 'Correct — no match needed here.'
      }

      setRespondedThisTrial(true)
      setFeedback(trialFeedback)
      setFeedbackMessage(message)
      setRetryTrial(needsRetry)
      setView('feedback')

      void getActiveStreams(currentTrial.inputGate)
    },
    [currentTrial, respondedThisTrial, isScorable, view, trials, trialIndex, nLevel, step.waitForCorrect],
  )

  const handleMatch = useCallback(() => {
    finishTrial(true)
  }, [finishTrial])

  const startPractice = useCallback(async () => {
    await resumeAudio()
    clearTimers()
    setTrialIndex(0)
    resetTrialState()
    setView('practice')
  }, [clearTimers, resetTrialState])

  const nextStep = useCallback(() => {
    if (stepIndex < TUTORIAL_STEPS.length - 1) {
      goToStep(stepIndex + 1)
    }
  }, [stepIndex, goToStep])

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      goToStep(stepIndex - 1)
    }
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
      if (stepIndex < TUTORIAL_STEPS.length - 1) {
        setStepIndex((i) => i + 1)
      }
      return
    }

    setTrialIndex((i) => i + 1)
    setView('practice')
  }, [clearTimers, resetTrialState, retryTrial, trialIndex, trials.length, stepIndex])

  const advanceWarmup = useCallback(() => {
    if (trialIndex + 1 >= trials.length) {
      setView('info')
      return
    }
    setTrialIndex((i) => i + 1)
  }, [trialIndex, trials.length])

  useEffect(() => {
    if (view !== 'practice' || !currentTrial) return

    if (currentTrial.inputGate.letter && soundEnabled) {
      setIsSpeaking(true)
      speakLetter(currentTrial.stimulus.letter, true)
      speakTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 900)
    } else {
      setIsSpeaking(false)
    }

    intervalRef.current = setInterval(() => {
      if (isScorable) {
        if (!respondedThisTrial) finishTrial(false)
      } else {
        advanceWarmup()
      }
    }, intervalMs)

    return clearTimers
  }, [
    view,
    trialIndex,
    currentTrial,
    soundEnabled,
    intervalMs,
    isScorable,
    respondedThisTrial,
    finishTrial,
    advanceWarmup,
    clearTimers,
  ])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (view === 'practice' && isScorable && !respondedThisTrial) {
        handleMatch()
      } else if (view === 'feedback') {
        continueFromFeedback()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, isScorable, respondedThisTrial, handleMatch, continueFromFeedback])

  useEffect(() => () => clearTimers(), [clearTimers])

  return {
    step,
    stepIndex,
    totalSteps: TUTORIAL_STEPS.length,
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
    nextStep,
    prevStep,
    resetTutorial,
    startPractice,
    handleMatch,
    continueFromFeedback,
    isSpeaking,
  }
}
