'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Crown,
  PlayCircle,
  RefreshCcw,
  ShieldAlert,
  Swords,
  Target,
  TimerReset,
  Trophy,
} from 'lucide-react'
import { CorgiAvatar } from '@/components/corgi-avatar'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useFinishSelfBeliefQuiz,
  useProfile,
  useSelfBeliefQuizOverview,
  useSelfBeliefQuizzes,
  useStartSelfBeliefQuiz,
} from '@/lib/queries'
import { CORGI_NAME } from '@/lib/self-belief-duel'
import {
  formatSelfBeliefNetReward,
  resolveSelfBeliefOutcomeCopy,
  resolveSelfBeliefOutcomeLabel,
  resolveSelfBeliefWagerLabel,
} from '@/lib/self-belief'
import type {
  SelfBeliefQuiz,
  SelfBeliefQuizAnswerSubmission,
  SelfBeliefQuizAttemptResult,
  SelfBeliefQuizPublicQuestion,
  SelfBeliefQuizStartResult,
} from '@/lib/types'
import { cn, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type RoundPreview = {
  questionId: string
  category: string
  prompt: string
  selectedOption?: number | null
  timedOut: boolean
  corgiSelectedOption: number
}

function optionLetter(index: number) {
  return ['A', 'B', 'C', 'D'][index] ?? String(index + 1)
}

function formatOptionSelection(question: SelfBeliefQuizPublicQuestion | undefined, option?: number | null) {
  if (option == null) {
    return 'нет ответа'
  }

  const optionTitle = question?.options[option]
  return optionTitle ? `${optionLetter(option)}. ${optionTitle}` : optionLetter(option)
}

function TimerRing({ timeLeftMs, totalMs }: { timeLeftMs: number; totalMs: number }) {
  const progress = Math.max(0, Math.min(1, timeLeftMs / totalMs))
  const progressDegrees = progress * 360
  const seconds = Math.max(0, Math.ceil(timeLeftMs / 1000))
  const urgent = timeLeftMs <= 3000
  const accent = urgent ? 'rgb(244 63 94)' : 'hsl(var(--primary))'

  return (
    <div
      className="relative flex h-24 w-24 items-center justify-center rounded-full p-2 shadow-[0_22px_48px_-30px_hsl(var(--primary)/0.5)] sm:h-32 sm:w-32 sm:p-[10px]"
      style={{
        background: `conic-gradient(from 270deg, ${accent} 0deg ${progressDegrees}deg, rgba(148,163,184,0.18) ${progressDegrees}deg 360deg)`,
      }}
    >
      <div className="absolute inset-2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] shadow-inner sm:inset-[10px]" />
      <div className="relative flex flex-col items-center justify-center">
        <div className={cn('text-2xl font-bold sm:text-3xl', urgent ? 'text-rose-600 dark:text-rose-300' : 'text-card-foreground')}>{seconds}</div>
        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">секунд</div>
      </div>
    </div>
  )
}

function QuizStartDialog({
  quiz,
  open,
  onOpenChange,
  onConfirm,
  busy,
}: {
  quiz: SelfBeliefQuiz | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  busy: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{quiz ? `Старт теста «${quiz.title}»` : 'Старт теста'}</DialogTitle>
          <DialogDescription>Перед началом спишется взнос, а потом у вас будет один полноценный матч против Корги Дурова.</DialogDescription>
        </DialogHeader>

        {quiz ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_250px]">
            <div className="rounded-[1.6rem] border border-border/70 bg-secondary/15 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">{resolveSelfBeliefWagerLabel(quiz.wager)}</Badge>
                <Badge>{quiz.question_count} вопросов</Badge>
                <Badge>{quiz.time_limit_seconds} сек. на каждый</Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{quiz.description || 'Без дополнительного описания.'}</p>
            </div>

            <div className="rounded-[1.6rem] border border-primary/20 bg-primary/10 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                <Swords className="h-4 w-4 text-primary" />
                Условия матча
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <p>Взнос: {quiz.wager} печенек.</p>
                <p>Задача: пройти тест лучше, чем это сделает {CORGI_NAME}.</p>
                <p>Система отвечает параллельно и показывает свои ходы прямо во время матча.</p>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" onClick={onConfirm} isLoading={busy} disabled={!quiz}>
            Начать матч
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActiveQuizDialog({
  attempt,
  currentQuestion,
  questionNumber,
  selectedOption,
  locked,
  corgiVisible,
  timeLeftMs,
  totalMs,
  liveAnsweredCount,
  corgiAnsweredCount,
  roundsPreview,
  finishPending,
  onSelectOption,
}: {
  attempt: SelfBeliefQuizStartResult
  currentQuestion: SelfBeliefQuizPublicQuestion
  questionNumber: number
  selectedOption: number | null
  locked: boolean
  corgiVisible: boolean
  timeLeftMs: number
  totalMs: number
  liveAnsweredCount: number
  corgiAnsweredCount: number
  roundsPreview: RoundPreview[]
  finishPending: boolean
  onSelectOption: (option: number) => void
}) {
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showClose={false}
        className="h-[100dvh] max-h-[100dvh] max-w-none gap-0 overflow-hidden rounded-none border-border/70 p-0 sm:h-[calc(100dvh-1rem)] sm:max-w-[min(1180px,calc(100vw-1rem))] sm:rounded-[2rem]"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{attempt.quiz.title}</DialogTitle>
          <DialogDescription>Активный матч против Корги Дурова. Закроется автоматически после завершения серии вопросов.</DialogDescription>
        </DialogHeader>

        <div className="grid h-full min-h-0 overflow-y-auto overscroll-contain lg:grid-cols-[minmax(0,1.18fr)_360px] lg:overflow-hidden">
          <div className="min-h-0 bg-[radial-gradient(circle_at_16%_14%,rgba(255,255,255,0.9),rgba(255,255,255,0)_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 sm:p-6 lg:overflow-y-auto lg:p-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4 sm:space-y-6"
              >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">{resolveSelfBeliefWagerLabel(attempt.quiz.wager)}</Badge>
                    <Badge>{questionNumber} / {attempt.quiz.question_count}</Badge>
                    <Badge>{attempt.quiz.title}</Badge>
                  </div>

                  <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-[0_28px_70px_-48px_hsl(var(--primary)/0.34)] sm:rounded-[2rem] sm:p-6">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">{currentQuestion.category}</div>
                    <h2 className="text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl lg:text-[2.55rem]">{currentQuestion.prompt}</h2>
                    <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                      {locked
                        ? corgiVisible
                          ? 'Ход раскрыт. Матч уже фиксирует раунд и готовится к следующему вопросу.'
                          : 'Ответ зафиксирован. Корги раскроет свой ход через секунду…'
                        : 'Выбирайте быстро: как только вариант зафиксирован, матч дождётся хода Корги и перейдёт дальше.'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-start xl:justify-end">
                  <TimerRing timeLeftMs={timeLeftMs} totalMs={totalMs} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 sm:gap-4">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedOption === index
                  const disabled = locked || finishPending

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onSelectOption(index)}
                      disabled={disabled}
                      className={cn(
                        'rounded-[1.3rem] border bg-card/92 p-4 text-left transition-all duration-200 sm:rounded-[1.8rem] sm:p-6',
                        isSelected
                          ? 'border-primary/35 bg-primary/10 shadow-[0_28px_60px_-36px_hsl(var(--primary)/0.55)]'
                          : disabled
                            ? 'cursor-default border-border/70 opacity-60'
                            : 'border-border/70 hover:border-primary/25 hover:bg-secondary/18',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">{optionLetter(index)}</div>
                        {isSelected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                      </div>
                      <p className="mt-3 text-base font-semibold leading-7 text-card-foreground sm:mt-5 sm:text-xl sm:leading-9">{option}</p>
                    </button>
                  )
                })}
              </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="min-h-0 border-t border-border/60 bg-[linear-gradient(180deg,rgba(241,245,249,0.86),rgba(248,250,252,0.98))] p-4 sm:p-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div className="space-y-5">
              <div className="rounded-[1.8rem] border border-border/70 bg-card/88 p-5 shadow-[0_26px_56px_-44px_hsl(var(--primary)/0.34)]">
                <div className="flex items-start gap-4">
                  <CorgiAvatar size="lg" priority className="shrink-0" />
                  <div className="min-w-0 space-y-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Соперник</div>
                      <h3 className="mt-1 text-2xl font-bold text-card-foreground">{CORGI_NAME}</h3>
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {corgiVisible ? 'Ход уже раскрыт и матч может перейти дальше.' : 'Следит за вашим выбором и готовит ответ.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[1.4rem] border border-border/70 bg-card/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Ваши ответы</div>
                      <div className="mt-2 text-3xl font-bold text-card-foreground">{liveAnsweredCount}</div>
                    </div>
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-border/70 bg-card/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Ходы {CORGI_NAME}</div>
                      <div className="mt-2 text-3xl font-bold text-card-foreground">{corgiAnsweredCount}</div>
                    </div>
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>

              <div className={cn('rounded-[1.6rem] border p-5 transition-all', corgiVisible ? 'border-primary/25 bg-primary/10' : 'border-border/70 bg-card/82')}>
                {corgiVisible ? (
                  <>
                    <div className="text-sm text-muted-foreground">Корги выбрал</div>
                    <div className="mt-2 text-lg font-semibold leading-8 text-card-foreground">
                      {formatOptionSelection(currentQuestion, currentQuestion.corgi_selected_option)}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-sm leading-7 text-muted-foreground">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
                    Корги ещё думает. Как только ход будет готов, он появится здесь.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-card-foreground">Последние раунды</div>
                {roundsPreview.length > 0 ? (
                  roundsPreview.slice(-3).reverse().map((round) => (
                    <div key={round.questionId} className="rounded-[1.2rem] border border-border/70 bg-card/78 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{round.category}</div>
                      <p className="mt-2 text-sm leading-7 text-card-foreground">{round.prompt}</p>
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <div>Вы: {round.timedOut ? 'не успели' : formatOptionSelection(undefined, round.selectedOption)}</div>
                        <div>{CORGI_NAME}: {formatOptionSelection(undefined, round.corgiSelectedOption)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-card/75 px-4 py-6 text-sm leading-7 text-muted-foreground">
                    Пока это первый вопрос матча. После ответа здесь появится свежая история дуэли.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function QuizPage() {
  const { data: profile } = useProfile()
  const { data: overview, isLoading: overviewLoading } = useSelfBeliefQuizOverview()
  const { data: quizzes = [], isLoading: quizzesLoading } = useSelfBeliefQuizzes()
  const startQuiz = useStartSelfBeliefQuiz()
  const finishQuiz = useFinishSelfBeliefQuiz()

  const [selectedQuiz, setSelectedQuiz] = useState<SelfBeliefQuiz | null>(null)
  const [activeAttempt, setActiveAttempt] = useState<SelfBeliefQuizStartResult | null>(null)
  const [result, setResult] = useState<SelfBeliefQuizAttemptResult | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [corgiVisible, setCorgiVisible] = useState(false)
  const [timeLeftMs, setTimeLeftMs] = useState(10_000)
  const [roundsPreview, setRoundsPreview] = useState<RoundPreview[]>([])
  const [submissions, setSubmissions] = useState<SelfBeliefQuizAnswerSubmission[]>([])

  const questionStartedAtRef = useRef(0)
  const submissionsRef = useRef<SelfBeliefQuizAnswerSubmission[]>([])
  const activeAttemptRef = useRef<SelfBeliefQuizStartResult | null>(null)
  const currentQuestionRef = useRef<SelfBeliefQuizPublicQuestion | undefined>(undefined)
  const totalMsRef = useRef(10_000)
  const lockedRef = useRef(false)
  const roundFrameRef = useRef<number | null>(null)
  const revealTimeoutRef = useRef<number | null>(null)
  const answerTimeoutRef = useRef<number | null>(null)
  const transitionTimeoutRef = useRef<number | null>(null)

  const safeQuizzes = useMemo(() => (Array.isArray(quizzes) ? quizzes : []), [quizzes])
  const recentAttempts = useMemo(
    () => (Array.isArray(overview?.recent_attempts) ? overview.recent_attempts : []),
    [overview?.recent_attempts],
  )
  const completedQuizIds = useMemo(
    () => new Set(Array.isArray(overview?.completed_quiz_ids) ? overview.completed_quiz_ids : []),
    [overview?.completed_quiz_ids],
  )
  const activeQuestions = useMemo(
    () => (Array.isArray(activeAttempt?.quiz?.questions) ? activeAttempt.quiz.questions : []),
    [activeAttempt?.quiz?.questions],
  )

  const balance = profile?.balance ?? 0
  const stats = overview?.stats
  const currentQuestion = activeQuestions[currentIndex]
  const totalMs = (activeAttempt?.quiz.time_limit_seconds ?? 10) * 1000

  const sortedQuizzes = useMemo(
    () =>
      [...safeQuizzes].sort((left, right) => {
        if (left.wager !== right.wager) return left.wager - right.wager
        return left.title.localeCompare(right.title, 'ru')
      }),
    [safeQuizzes],
  )

  const activeQuestionNumber = currentIndex + 1
  const liveAnsweredCount = submissions.length
  const corgiAnsweredCount = roundsPreview.length

  useEffect(() => {
    submissionsRef.current = submissions
  }, [submissions])

  useEffect(() => {
    activeAttemptRef.current = activeAttempt
    currentQuestionRef.current = currentQuestion
    totalMsRef.current = totalMs
    lockedRef.current = locked
  }, [activeAttempt, currentQuestion, locked, totalMs])

  const stopAnswerTimers = useCallback(() => {
    if (roundFrameRef.current != null) {
      window.cancelAnimationFrame(roundFrameRef.current)
      roundFrameRef.current = null
    }
    if (answerTimeoutRef.current != null) {
      window.clearTimeout(answerTimeoutRef.current)
      answerTimeoutRef.current = null
    }
  }, [])

  const clearRoundTimers = useCallback(() => {
    stopAnswerTimers()
    if (revealTimeoutRef.current != null) {
      window.clearTimeout(revealTimeoutRef.current)
      revealTimeoutRef.current = null
    }
  }, [stopAnswerTimers])

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimeoutRef.current != null) {
      window.clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }
  }, [])

  const startSelectedQuiz = useCallback(async () => {
    if (!selectedQuiz) {
      return
    }

    if (balance < selectedQuiz.wager) {
      toast.error('На балансе не хватает печенек для старта этого теста')
      return
    }

    try {
      const started = await startQuiz.mutateAsync(selectedQuiz.id)
      const normalizedAttempt = {
        ...started,
        quiz: {
          ...started.quiz,
          questions: Array.isArray(started.quiz?.questions) ? started.quiz.questions : [],
        },
      }
      activeAttemptRef.current = normalizedAttempt
      setActiveAttempt(normalizedAttempt)
      setResult(null)
      setCurrentIndex(0)
      setSelectedOption(null)
      lockedRef.current = false
      setLocked(false)
      setCorgiVisible(false)
      setTimeLeftMs(started.quiz.time_limit_seconds * 1000)
      setRoundsPreview([])
      setSubmissions([])
      submissionsRef.current = []
      setSelectedQuiz(null)
      toast.success('Матч начался')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось начать матч')
    }
  }, [balance, selectedQuiz, startQuiz])

  const finishActiveQuiz = useCallback(async () => {
    if (!activeAttempt) {
      return
    }

    try {
      const nextResult = await finishQuiz.mutateAsync({
        attempt_id: activeAttempt.attempt_id,
        answers: submissionsRef.current,
      })
      setResult(nextResult)
      toast.success(resolveSelfBeliefOutcomeLabel(nextResult.outcome))
    } catch (error: any) {
      toast.error(error.message || 'Не удалось завершить матч')
      setActiveAttempt(null)
      activeAttemptRef.current = null
      lockedRef.current = false
      setLocked(false)
      setCorgiVisible(false)
    }
  }, [activeAttempt, finishQuiz])

  const submitCurrentAnswer = useCallback(async (option: number | null, timedOut = false) => {
    const attempt = activeAttemptRef.current
    const question = currentQuestionRef.current
    const currentTotalMs = totalMsRef.current

    if (!attempt || !question || lockedRef.current) {
      return
    }
    if (submissionsRef.current.some((item) => item.question_id === question.id)) {
      return
    }

    const elapsed = Math.min(currentTotalMs, Math.max(0, Math.round(performance.now() - questionStartedAtRef.current)))
    const submission: SelfBeliefQuizAnswerSubmission = {
      question_id: question.id,
      timed_out: timedOut || option == null,
      response_ms: timedOut ? currentTotalMs : elapsed,
    }

    if (option != null && !timedOut) {
      submission.selected_option = option
    }

    const nextSubmissions = [...submissionsRef.current, submission]
    submissionsRef.current = nextSubmissions
    stopAnswerTimers()

    // If user answered before Corgi's reveal, speed it up to 600ms
    if (!timedOut && revealTimeoutRef.current != null) {
      window.clearTimeout(revealTimeoutRef.current)
      revealTimeoutRef.current = window.setTimeout(() => {
        setCorgiVisible(true)
      }, 600)
    }

    setSubmissions(nextSubmissions)
    setSelectedOption(option)
    lockedRef.current = true
    setLocked(true)

    setRoundsPreview((current) => [
      ...current,
      {
        questionId: question.id,
        category: question.category,
        prompt: question.prompt,
        selectedOption: timedOut ? null : option,
        timedOut: timedOut || option == null,
        corgiSelectedOption: question.corgi_selected_option,
      },
    ])
  }, [stopAnswerTimers])

  const resetMatch = useCallback(() => {
    clearRoundTimers()
    clearTransitionTimer()
    setActiveAttempt(null)
    activeAttemptRef.current = null
    setResult(null)
    setCurrentIndex(0)
    setSelectedOption(null)
    lockedRef.current = false
    setLocked(false)
    setCorgiVisible(false)
    setRoundsPreview([])
    setSubmissions([])
    submissionsRef.current = []
  }, [clearRoundTimers, clearTransitionTimer])

  useEffect(() => {
    if (!activeAttempt || !currentQuestion || result) {
      return
    }

    clearRoundTimers()
    setSelectedOption(null)
    lockedRef.current = false
    setLocked(false)
    setCorgiVisible(false)
    setTimeLeftMs(totalMs)
    questionStartedAtRef.current = performance.now()

    const tick = () => {
      const nextTime = Math.max(0, questionStartedAtRef.current + totalMs - performance.now())
      setTimeLeftMs(nextTime)
      if (nextTime > 0) {
        roundFrameRef.current = window.requestAnimationFrame(tick)
      } else {
        roundFrameRef.current = null
      }
    }

    roundFrameRef.current = window.requestAnimationFrame(tick)

    const revealDelay = Math.max(0, Math.min(currentQuestion.corgi_reveal_after_ms, Math.max(totalMs - 250, 0)))

    revealTimeoutRef.current = window.setTimeout(() => {
      setCorgiVisible(true)
    }, revealDelay)

    answerTimeoutRef.current = window.setTimeout(() => {
      void submitCurrentAnswer(null, true)
    }, totalMs)

    return () => {
      clearRoundTimers()
    }
  }, [activeAttempt, clearRoundTimers, currentQuestion, result, submitCurrentAnswer, totalMs])

  useEffect(() => {
    if (!activeAttempt || !currentQuestion || !locked || !corgiVisible || result) {
      return
    }

    clearTransitionTimer()
    transitionTimeoutRef.current = window.setTimeout(() => {
      if (currentIndex >= activeQuestions.length - 1) {
        void finishActiveQuiz()
      } else {
        setCurrentIndex((value) => value + 1)
      }
    }, 1400)

    return () => {
      clearTransitionTimer()
    }
  }, [activeAttempt, activeQuestions.length, clearTransitionTimer, corgiVisible, currentIndex, currentQuestion, finishActiveQuiz, locked, result])

  useEffect(() => () => {
    clearRoundTimers()
    clearTransitionTimer()
  }, [clearRoundTimers, clearTransitionTimer])

  return (
    <>
      <Navigation />
      <QuizStartDialog quiz={selectedQuiz} open={Boolean(selectedQuiz)} onOpenChange={(open) => !open && setSelectedQuiz(null)} onConfirm={startSelectedQuiz} busy={startQuiz.isPending} />
      {activeAttempt && currentQuestion && !result ? (
        <ActiveQuizDialog
          attempt={activeAttempt}
          currentQuestion={currentQuestion}
          questionNumber={activeQuestionNumber}
          selectedOption={selectedOption}
          locked={locked}
          corgiVisible={corgiVisible}
          timeLeftMs={timeLeftMs}
          totalMs={totalMs}
          liveAnsweredCount={liveAnsweredCount}
          corgiAnsweredCount={corgiAnsweredCount}
          roundsPreview={roundsPreview}
          finishPending={finishQuiz.isPending}
          onSelectOption={(option) => void submitCurrentAnswer(option, false)}
        />
      ) : null}

      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <motion.section initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-card-foreground">Режим</Badge>
              <Badge>Верю в себя</Badge>
              <Badge variant={balance > 0 ? 'success' : 'danger'}>Баланс: {balance} печ.</Badge>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_26%),linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary)/0.94)_42%,hsl(172_57%_51%)_100%)] p-0 text-primary-foreground shadow-[0_34px_90px_-44px_hsl(var(--primary)/0.65)]">
                <CardContent className="space-y-7 p-7 sm:p-8 lg:p-9">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-4 py-2 text-sm font-semibold">
                    <BrainCircuit className="h-4 w-4" />
                    Матч из нескольких вопросов
                  </div>
                  <div className="space-y-4">
                    <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">Тест против Корги Дурова</h1>
                    <p className="max-w-4xl text-base leading-8 text-primary-foreground/84 sm:text-lg">
                      Выбираете готовый тест, делаете взнос и проходите весь матч. На каждый вопрос даётся 10 секунд, а Корги отвечает параллельно.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-[1.45rem] border border-white/15 bg-slate-950/16 p-4 backdrop-blur-sm">
                      <div className="text-sm text-primary-foreground/72">Матчей</div>
                      <div className="mt-2 text-3xl font-bold">{overviewLoading ? '...' : stats?.matches_played ?? 0}</div>
                    </div>
                    <div className="rounded-[1.45rem] border border-white/15 bg-slate-950/16 p-4 backdrop-blur-sm">
                      <div className="text-sm text-primary-foreground/72">Побед</div>
                      <div className="mt-2 text-3xl font-bold">{stats?.wins ?? 0}</div>
                    </div>
                    <div className="rounded-[1.45rem] border border-white/15 bg-slate-950/16 p-4 backdrop-blur-sm">
                      <div className="text-sm text-primary-foreground/72">Винрейт</div>
                      <div className="mt-2 text-3xl font-bold">{stats?.win_rate ?? 0}%</div>
                    </div>
                    <div className="rounded-[1.45rem] border border-white/15 bg-slate-950/16 p-4 backdrop-blur-sm">
                      <div className="text-sm text-primary-foreground/72">Итог</div>
                      <div className="mt-2 text-3xl font-bold">{formatSelfBeliefNetReward(stats?.net_reward ?? 0)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card hover={false}>
                <CardHeader>
                  <CardTitle>Как проходит матч</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <PlayCircle className="mt-1 h-4 w-4 text-primary" />
                    <p>Нажимаете «Начать матч», подтверждаете взнос и заходите в тест.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <TimerReset className="mt-1 h-4 w-4 text-primary" />
                    <p>На каждый вопрос есть 10 секунд. Если не успели, раунд считается без ответа.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bot className="mt-1 h-4 w-4 text-primary" />
                    <p>{CORGI_NAME} отвечает параллельно, а его выборы появляются прямо по ходу матча.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {result ? (
            <div className="space-y-6">
              <Card hover={false} className="overflow-hidden border-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,255,255,0.84))]">
                <CardContent className="grid gap-6 p-7 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={result.outcome === 'win' ? 'success' : result.outcome === 'draw' ? 'warning' : 'danger'}>
                        {resolveSelfBeliefOutcomeLabel(result.outcome)}
                      </Badge>
                      <Badge>{result.quiz_title}</Badge>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-card-foreground">Матч завершён</h2>
                    <p className="max-w-3xl text-base leading-8 text-muted-foreground">{resolveSelfBeliefOutcomeCopy(result.outcome)}</p>
                    <div className="flex flex-wrap gap-3">
                      <Button type="button" onClick={resetMatch}>
                        <RefreshCcw className="h-4 w-4" />
                        К списку тестов
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-[1.35rem] border border-border/70 bg-secondary/15 p-4">
                      <div className="text-sm text-muted-foreground">Счёт дуэли</div>
                      <div className="mt-2 text-3xl font-bold text-card-foreground">{result.user_correct_count} : {result.corgi_correct_count}</div>
                    </div>
                    <div className="rounded-[1.35rem] border border-border/70 bg-secondary/15 p-4">
                      <div className="text-sm text-muted-foreground">Итог по печенькам</div>
                      <div className="mt-2 text-3xl font-bold text-card-foreground">{formatSelfBeliefNetReward(result.net_reward)}</div>
                    </div>
                    <div className="rounded-[1.35rem] border border-border/70 bg-secondary/15 p-4">
                      <div className="text-sm text-muted-foreground">Финиш</div>
                      <div className="mt-2 text-sm font-semibold text-card-foreground">{formatDateTime(result.finished_at)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                {result.questions.map((question) => (
                  <Card key={question.question_id} hover={false}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{question.category}</Badge>
                        <Badge variant={question.is_correct ? 'success' : 'danger'}>{question.is_correct ? 'Верно' : 'Мимо'}</Badge>
                        <Badge variant={question.corgi_is_correct ? 'success' : 'warning'}>{CORGI_NAME}: {question.corgi_is_correct ? 'попал' : 'ошибся'}</Badge>
                      </div>
                      <CardTitle className="text-lg leading-8">{question.prompt}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                          <div className="text-sm text-muted-foreground">Ваш ответ</div>
                          <div className="mt-2 text-sm font-semibold text-card-foreground">
                            {question.timed_out ? 'Не успели ответить' : formatOptionSelection(undefined, question.selected_option)}
                          </div>
                        </div>
                        <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                          <div className="text-sm text-muted-foreground">Ответ Корги</div>
                          <div className="mt-2 text-sm font-semibold text-card-foreground">{formatOptionSelection(undefined, question.corgi_selected_option)}</div>
                        </div>
                      </div>

                      <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <div className="text-sm text-muted-foreground">Правильный вариант</div>
                        <div className="mt-2 text-sm font-semibold text-card-foreground">{formatOptionSelection(undefined, question.correct_option)}</div>
                      </div>

                      {question.explanation ? (
                        <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                          <div className="text-sm font-semibold text-card-foreground">Разбор</div>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">{question.explanation}</p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {!activeAttempt && !result ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                {quizzesLoading ? (
                  Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-[1.8rem] border border-border/70 bg-card/70" />)
                ) : sortedQuizzes.length > 0 ? (
                  sortedQuizzes.map((quiz) => {
                    const canAfford = balance >= quiz.wager
                    const isCompleted = completedQuizIds.has(quiz.id)
                    return (
                      <Card key={quiz.id} hover={false} className={cn('overflow-hidden', isCompleted && 'opacity-60')}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="warning">{resolveSelfBeliefWagerLabel(quiz.wager)}</Badge>
                                <Badge>{quiz.question_count} вопросов</Badge>
                                <Badge>{quiz.time_limit_seconds} сек. на вопрос</Badge>
                                {isCompleted && <Badge variant="success">Пройдено</Badge>}
                              </div>
                              <CardTitle>{quiz.title}</CardTitle>
                              <CardDescription>{quiz.description || 'Без дополнительного описания.'}</CardDescription>
                            </div>
                            <Button type="button" onClick={() => setSelectedQuiz(quiz)} disabled={!canAfford || isCompleted}>
                              <PlayCircle className="h-4 w-4" />
                              {isCompleted ? 'Уже сыграно' : 'Начать матч'}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                            <div className="text-sm text-muted-foreground">Взнос</div>
                            <div className="mt-2 text-2xl font-bold text-card-foreground">{quiz.wager}</div>
                          </div>
                          <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                            <div className="text-sm text-muted-foreground">Серия</div>
                            <div className="mt-2 text-2xl font-bold text-card-foreground">{quiz.question_count}</div>
                          </div>
                          <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                            <div className="text-sm text-muted-foreground">Готовность</div>
                            <div className={cn('mt-2 text-sm font-semibold', isCompleted ? 'text-muted-foreground' : canAfford ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
                              {isCompleted ? 'Матч завершён' : canAfford ? 'Можно играть' : 'Не хватает баланса'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                ) : (
                  <Card hover={false}>
                    <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-12 text-center">
                      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
                      <div className="space-y-2">
                        <div className="text-lg font-semibold text-card-foreground">Тесты пока не опубликованы</div>
                        <p className="max-w-xl text-sm leading-7 text-muted-foreground">Администратор ещё не собрал матчи для этого режима. Чуть позже здесь появятся готовые серии вопросов против Корги.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card hover={false}>
                  <CardHeader>
                    <CardTitle>Последние матчи</CardTitle>
                    <CardDescription>Здесь видно, как часто вам удаётся обыгрывать систему на дистанции.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentAttempts.length ? (
                      recentAttempts.map((attempt) => (
                        <div key={attempt.id} className="rounded-[1.3rem] border border-border/70 bg-secondary/15 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={attempt.outcome === 'win' ? 'success' : attempt.outcome === 'draw' ? 'warning' : 'danger'}>
                              {resolveSelfBeliefOutcomeLabel(attempt.outcome)}
                            </Badge>
                            <Badge>{resolveSelfBeliefWagerLabel(attempt.wager)}</Badge>
                          </div>
                          <div className="mt-3 font-semibold text-card-foreground">{attempt.quiz_title}</div>
                          <div className="mt-2 text-sm leading-7 text-muted-foreground">
                            Счёт: {attempt.user_correct_count} : {attempt.corgi_correct_count} • Итог: {formatSelfBeliefNetReward(attempt.net_reward)}
                          </div>
                          <div className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{attempt.finished_at ? formatDateTime(attempt.finished_at) : formatDateTime(attempt.started_at)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.3rem] border border-dashed border-border/70 bg-secondary/15 px-4 py-6 text-sm leading-7 text-muted-foreground">
                        У вас ещё нет завершённых матчей. Начните с самого комфортного теста и посмотрите, как играет Корги.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card hover={false}>
                  <CardHeader>
                    <CardTitle>Система-соперник</CardTitle>
                    <CardDescription>{CORGI_NAME} держится примерно около 50% точности, так что матч действительно можно выиграть.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <Trophy className="mt-1 h-4 w-4 text-primary" />
                      <p>Победа приносит обратно взнос и ещё столько же сверху.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Crown className="mt-1 h-4 w-4 text-primary" />
                      <p>Ничья возвращает ставку без бонуса.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-1 h-4 w-4 text-primary" />
                      <p>Если время вышло, вопрос уходит без вашего ответа, поэтому таймер здесь реально важен.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
