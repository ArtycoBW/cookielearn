'use client'

import { type FormEvent, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  PencilLine,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminSelfBeliefQuestions,
  useAdminSelfBeliefQuizzes,
  useCreateSelfBeliefQuestion,
  useCreateSelfBeliefQuiz,
  useDeleteSelfBeliefQuestion,
  useDeleteSelfBeliefQuiz,
  useUpdateSelfBeliefQuestion,
  useUpdateSelfBeliefQuiz,
} from '@/lib/queries'
import { resolveSelfBeliefWagerLabel, selfBeliefWagerOptions } from '@/lib/self-belief'
import type { SelfBeliefQuestion, SelfBeliefQuestionInput, SelfBeliefQuiz, SelfBeliefQuizInput } from '@/lib/types'
import { cn, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type QuestionFormState = {
  category: string
  wager: string
  prompt: string
  options: string[]
  correctOption: string
  explanation: string
  isActive: boolean
}

type QuizFormState = {
  title: string
  description: string
  wager: string
  isActive: boolean
  questionIds: string[]
}

const emptyQuestionForm: QuestionFormState = {
  category: '',
  wager: '1',
  prompt: '',
  options: ['', '', '', ''],
  correctOption: '0',
  explanation: '',
  isActive: true,
}

const emptyQuizForm: QuizFormState = {
  title: '',
  description: '',
  wager: '1',
  isActive: true,
  questionIds: [],
}

function optionLetter(index: number) {
  return ['A', 'B', 'C', 'D'][index] ?? String(index + 1)
}

function buildQuestionForm(question?: SelfBeliefQuestion): QuestionFormState {
  if (!question) {
    return emptyQuestionForm
  }

  return {
    category: question.category,
    wager: String(question.wager),
    prompt: question.prompt,
    options: [...question.options],
    correctOption: String(question.correct_option),
    explanation: question.explanation ?? '',
    isActive: question.is_active,
  }
}

function buildQuizForm(quiz?: SelfBeliefQuiz): QuizFormState {
  if (!quiz) {
    return emptyQuizForm
  }

  return {
    title: quiz.title,
    description: quiz.description ?? '',
    wager: String(quiz.wager),
    isActive: quiz.is_active,
    questionIds: quiz.questions
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((item) => item.question_id),
  }
}

function buildQuestionPayload(form: QuestionFormState): SelfBeliefQuestionInput {
  return {
    category: form.category.trim(),
    wager: Number(form.wager),
    prompt: form.prompt.trim(),
    options: form.options.map((item) => item.trim()),
    correct_option: Number(form.correctOption),
    explanation: form.explanation.trim() || undefined,
    is_active: form.isActive,
  }
}

function buildQuizPayload(form: QuizFormState): SelfBeliefQuizInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    wager: Number(form.wager),
    time_limit_seconds: 10,
    is_active: form.isActive,
    questions: form.questionIds.map((questionId, index) => ({
      question_id: questionId,
      position: index + 1,
    })),
  }
}

function QuestionEditor({
  form,
  onChange,
  onOptionChange,
}: {
  form: QuestionFormState
  onChange: (patch: Partial<QuestionFormState>) => void
  onOptionChange: (index: number, value: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-2">
          <Label htmlFor="question-category">Категория</Label>
          <Input id="question-category" value={form.category} onChange={(event) => onChange({ category: event.target.value })} placeholder="HTML, CSS, SQL, PHP..." required />
        </div>
        <div className="space-y-2">
          <Label>Ставка</Label>
          <Select value={form.wager} onValueChange={(value) => onChange({ wager: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите ставку" />
            </SelectTrigger>
            <SelectContent>
              {selfBeliefWagerOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="question-prompt">Вопрос</Label>
        <Textarea id="question-prompt" value={form.prompt} onChange={(event) => onChange({ prompt: event.target.value })} className="min-h-[132px]" placeholder="Сформулируйте вопрос так, чтобы студенту было понятно, что именно нужно выбрать." required />
      </div>

      <div className="space-y-3">
        <Label>Варианты ответа</Label>
        <div className="grid gap-3 md:grid-cols-2">
          {form.options.map((option, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`question-option-${index}`}>Вариант {optionLetter(index)}</Label>
              <Input id={`question-option-${index}`} value={option} onChange={(event) => onOptionChange(index, event.target.value)} placeholder={`Ответ ${optionLetter(index)}`} required />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label>Правильный ответ</Label>
          <Select value={form.correctOption} onValueChange={(value) => onChange({ correctOption: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите вариант" />
            </SelectTrigger>
            <SelectContent>
              {form.options.map((_, index) => (
                <SelectItem key={index} value={String(index)}>
                  {optionLetter(index)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="question-explanation">Пояснение после ответа</Label>
          <Textarea id="question-explanation" value={form.explanation} onChange={(event) => onChange({ explanation: event.target.value })} className="min-h-[112px]" placeholder="Коротко объясните, почему правильный вариант именно такой." />
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-border/70 bg-secondary/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-card-foreground">Статус вопроса</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Скрытые вопросы остаются в банке и доступны для редактирования, но не попадают в новые тесты.</p>
          </div>
          <Button type="button" variant={form.isActive ? 'primary' : 'outline'} onClick={() => onChange({ isActive: !form.isActive })}>
            {form.isActive ? 'Активен' : 'Скрыт'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuizEditor({
  form,
  questions,
  onChange,
  onAddQuestion,
  onRemoveQuestion,
  onMoveQuestion,
}: {
  form: QuizFormState
  questions: SelfBeliefQuestion[]
  onChange: (patch: Partial<QuizFormState>) => void
  onAddQuestion: (questionId: string) => void
  onRemoveQuestion: (questionId: string) => void
  onMoveQuestion: (questionId: string, direction: 'up' | 'down') => void
}) {
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const wager = Number(form.wager)
  const bank = questions.filter((question) => question.wager === wager)
  const selectedQuestions = form.questionIds
    .map((questionId) => bank.find((question) => question.id === questionId) ?? questions.find((question) => question.id === questionId))
    .filter((question): question is SelfBeliefQuestion => Boolean(question))
  const availableQuestions = bank.filter((question) => !form.questionIds.includes(question.id))
  const availableCategories = useMemo(
    () => Array.from(new Set(availableQuestions.map((q) => q.category))).sort((a, b) => a.localeCompare(b, 'ru')),
    [availableQuestions],
  )
  const filteredAvailable = filterCategory ? availableQuestions.filter((q) => q.category === filterCategory) : availableQuestions

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-2">
          <Label htmlFor="quiz-title">Название теста</Label>
          <Input id="quiz-title" value={form.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Например: SQL-дуэль на 5 печенек" required />
        </div>
        <div className="space-y-2">
          <Label>Ставка</Label>
          <Select value={form.wager} onValueChange={(value) => onChange({ wager: value, questionIds: [] })}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите ставку" />
            </SelectTrigger>
            <SelectContent>
              {selfBeliefWagerOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quiz-description">Короткое описание</Label>
        <Textarea id="quiz-description" value={form.description} onChange={(event) => onChange({ description: event.target.value })} className="min-h-[108px]" placeholder="Подскажите студенту, какой темп, тема и настроение ждут его в этом матче против Корги." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[1.7rem] border border-border/70 bg-card/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-card-foreground">Порядок вопросов</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Соберите последовательность, в которой студент будет проходить тест против Корги Дурова.</p>
            </div>
            <Badge variant={selectedQuestions.length >= 3 ? 'success' : 'warning'}>{selectedQuestions.length} вопроса</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {selectedQuestions.length > 0 ? (
              selectedQuestions.map((question, index) => (
                <div key={question.id} className="rounded-[1.35rem] border border-border/70 bg-secondary/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{question.category}</Badge>
                        <Badge variant="warning">{resolveSelfBeliefWagerLabel(question.wager)}</Badge>
                        <Badge variant={question.is_active ? 'success' : 'danger'}>{question.is_active ? 'Активен' : 'Скрыт'}</Badge>
                        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Шаг {index + 1}</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-card-foreground">{question.prompt}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => onMoveQuestion(question.id, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                        Выше
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => onMoveQuestion(question.id, 'down')} disabled={index === selectedQuestions.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                        Ниже
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => onRemoveQuestion(question.id)}>
                        <XCircle className="h-4 w-4" />
                        Убрать
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.45rem] border border-dashed border-border/70 bg-secondary/15 px-5 py-8 text-sm leading-7 text-muted-foreground">
                Пока пусто. Добавьте минимум три вопроса для ставки {resolveSelfBeliefWagerLabel(wager)}.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.7rem] border border-border/70 bg-card/80 p-5">
            <div className="font-semibold text-card-foreground">Доступный банк</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Показываются вопросы только для выбранной ставки, чтобы тест был честным по уровню риска.</p>

            {availableCategories.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilterCategory(null)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${!filterCategory ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-primary'}`}
                >
                  Все
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filterCategory === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-primary'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {filteredAvailable.length > 0 ? (
                filteredAvailable.map((question) => (
                  <button key={question.id} type="button" onClick={() => onAddQuestion(question.id)} className="w-full rounded-[1.35rem] border border-border/70 bg-secondary/15 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{question.category}</Badge>
                      <Badge variant={question.is_active ? 'success' : 'danger'}>{question.is_active ? 'Активен' : 'Скрыт'}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-card-foreground">{question.prompt}</p>
                  </button>
                ))
              ) : availableQuestions.length === 0 ? (
                <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-secondary/15 px-4 py-6 text-sm leading-7 text-muted-foreground">
                  Для этой ставки пока нет свободных вопросов. Сначала наполните банк или смените ставку.
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-secondary/15 px-4 py-6 text-sm leading-7 text-muted-foreground">
                  В этой категории нет доступных вопросов.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-border/70 bg-secondary/20 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-card-foreground">Статус теста</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Активные тесты сразу появляются у студентов в режиме дуэли.</p>
              </div>
              <Button type="button" variant={form.isActive ? 'primary' : 'outline'} onClick={() => onChange({ isActive: !form.isActive })}>
                {form.isActive ? 'Активен' : 'Скрыт'}
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-border/70 bg-card/80 p-4">
                <div className="text-sm text-muted-foreground">Формат</div>
                <div className="mt-2 text-lg font-semibold text-card-foreground">Тест из нескольких вопросов</div>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-card/80 p-4">
                <div className="text-sm text-muted-foreground">Таймер</div>
                <div className="mt-2 text-lg font-semibold text-card-foreground">10 секунд на каждый вопрос</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminSelfBeliefPage() {
  const { data: questions = [], isLoading: questionsLoading } = useAdminSelfBeliefQuestions()
  const { data: quizzes = [], isLoading: quizzesLoading } = useAdminSelfBeliefQuizzes()
  const createQuestion = useCreateSelfBeliefQuestion()
  const updateQuestion = useUpdateSelfBeliefQuestion()
  const deleteQuestion = useDeleteSelfBeliefQuestion()
  const createQuiz = useCreateSelfBeliefQuiz()
  const updateQuiz = useUpdateSelfBeliefQuiz()
  const deleteQuiz = useDeleteSelfBeliefQuiz()

  const [questionForm, setQuestionForm] = useState<QuestionFormState>(emptyQuestionForm)
  const [quizForm, setQuizForm] = useState<QuizFormState>(emptyQuizForm)
  const [editingQuestion, setEditingQuestion] = useState<SelfBeliefQuestion | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<SelfBeliefQuiz | null>(null)

  const sortedQuestions = useMemo(
    () =>
      [...questions].sort((left, right) => {
        if (left.wager !== right.wager) return left.wager - right.wager
        if (left.category !== right.category) return left.category.localeCompare(right.category, 'ru')
        return right.updated_at.localeCompare(left.updated_at)
      }),
    [questions],
  )

  const sortedQuizzes = useMemo(
    () =>
      [...quizzes].sort((left, right) => {
        if (left.is_active !== right.is_active) return left.is_active ? -1 : 1
        if (left.wager !== right.wager) return left.wager - right.wager
        return right.updated_at.localeCompare(left.updated_at)
      }),
    [quizzes],
  )

  const bankStats = useMemo(
    () =>
      selfBeliefWagerOptions.map((option) => ({
        value: option.value,
        total: questions.filter((question) => question.wager === option.value).length,
        active: questions.filter((question) => question.wager === option.value && question.is_active).length,
      })),
    [questions],
  )

  const handleQuestionOptionChange = (index: number, value: string) => {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    }))
  }

  const handleAddQuizQuestion = (questionId: string) => {
    setQuizForm((current) => ({
      ...current,
      questionIds: current.questionIds.includes(questionId) ? current.questionIds : [...current.questionIds, questionId],
    }))
  }

  const handleRemoveQuizQuestion = (questionId: string) => {
    setQuizForm((current) => ({
      ...current,
      questionIds: current.questionIds.filter((id) => id !== questionId),
    }))
  }

  const handleMoveQuizQuestion = (questionId: string, direction: 'up' | 'down') => {
    setQuizForm((current) => {
      const index = current.questionIds.findIndex((id) => id === questionId)
      if (index === -1) return current

      const nextIndex = direction === 'up' ? index - 1 : index + 1
      if (nextIndex < 0 || nextIndex >= current.questionIds.length) return current

      const nextQuestionIds = [...current.questionIds]
      ;[nextQuestionIds[index], nextQuestionIds[nextIndex]] = [nextQuestionIds[nextIndex], nextQuestionIds[index]]

      return { ...current, questionIds: nextQuestionIds }
    })
  }

  const resetQuestionForm = () => {
    setEditingQuestion(null)
    setQuestionForm(emptyQuestionForm)
  }

  const resetQuizForm = () => {
    setEditingQuiz(null)
    setQuizForm(emptyQuizForm)
  }

  const handleSubmitQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = buildQuestionPayload(questionForm)
    if (payload.options.some((item) => item.length === 0)) {
      toast.error('Заполните все варианты ответа')
      return
    }

    try {
      if (editingQuestion) {
        await updateQuestion.mutateAsync({ ...editingQuestion, ...payload })
        toast.success('Вопрос обновлён')
      } else {
        await createQuestion.mutateAsync(payload)
        toast.success('Вопрос добавлен в банк')
      }
      resetQuestionForm()
    } catch (error: any) {
      toast.error(error.message || 'Не удалось сохранить вопрос')
    }
  }

  const handleSubmitQuiz = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = buildQuizPayload(quizForm)
    if (payload.questions.length < 3) {
      toast.error('Добавьте минимум три вопроса в тест')
      return
    }

    try {
      if (editingQuiz) {
        await updateQuiz.mutateAsync({ ...editingQuiz, ...payload, question_count: payload.questions.length })
        toast.success('Тест обновлён')
      } else {
        await createQuiz.mutateAsync(payload)
        toast.success('Тест опубликован')
      }
      resetQuizForm()
    } catch (error: any) {
      toast.error(error.message || 'Не удалось сохранить тест')
    }
  }

  const handleDeleteQuestion = async (question: SelfBeliefQuestion) => {
    if (!window.confirm(`Удалить вопрос «${question.prompt.slice(0, 80)}»?`)) {
      return
    }

    try {
      await deleteQuestion.mutateAsync(question.id)
      toast.success('Вопрос удалён')
      if (editingQuestion?.id === question.id) {
        resetQuestionForm()
      }
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить вопрос')
    }
  }

  const handleDeleteQuiz = async (quiz: SelfBeliefQuiz) => {
    if (!window.confirm(`Удалить тест «${quiz.title}»?`)) {
      return
    }

    try {
      await deleteQuiz.mutateAsync(quiz.id)
      toast.success('Тест удалён')
      if (editingQuiz?.id === quiz.id) {
        resetQuizForm()
      }
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить тест')
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.section initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-card-foreground">Режим</Badge>
              <Badge>Викторина «Верю в себя»</Badge>
              <Badge variant="warning">Тесты против Корги Дурова</Badge>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_26%),linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary)/0.94)_42%,hsl(172_57%_51%)_100%)] p-0 text-primary-foreground shadow-[0_34px_90px_-44px_hsl(var(--primary)/0.65)]">
                <CardContent className="space-y-6 p-7 sm:p-8 lg:p-9">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-4 py-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4" />
                    Конструктор тестов
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Викторина против Корги</h1>
                    <p className="max-w-3xl text-base leading-8 text-primary-foreground/84 sm:text-lg">
                      Здесь вы собираете полноценные тесты из нескольких вопросов. Студент делает взнос, проходит весь матч и
                      сравнивает результат с системой.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card hover={false} className="bg-card/88">
                <CardHeader>
                  <CardTitle>Сводка банка</CardTitle>
                  <CardDescription>Сразу видно, на какие ставки уже хватает вопросов для новых матчей.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bankStats.map((item) => (
                    <div key={item.value} className="rounded-[1.3rem] border border-border/70 bg-secondary/15 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-muted-foreground">{resolveSelfBeliefWagerLabel(item.value)}</div>
                          <div className="mt-2 text-3xl font-bold text-card-foreground">{item.total}</div>
                        </div>
                        <Badge variant={item.active >= 3 ? 'success' : 'warning'}>{item.active} активных</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </motion.section>

          <Tabs defaultValue="quizzes" className="space-y-6">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.75rem] p-2">
              <TabsTrigger value="quizzes">Тесты</TabsTrigger>
              <TabsTrigger value="questions">Банк вопросов</TabsTrigger>
            </TabsList>

            <TabsContent value="quizzes" className="space-y-6">
              <Card hover={false}>
                <CardHeader>
                  <CardTitle>{editingQuiz ? 'Редактирование теста' : 'Новый тест'}</CardTitle>
                  <CardDescription>Соберите матч из нескольких вопросов для одной ставки. На каждый вопрос у студента будет 10 секунд.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6" onSubmit={handleSubmitQuiz}>
                    <QuizEditor form={quizForm} questions={sortedQuestions} onChange={(patch) => setQuizForm((current) => ({ ...current, ...patch }))} onAddQuestion={handleAddQuizQuestion} onRemoveQuestion={handleRemoveQuizQuestion} onMoveQuestion={handleMoveQuizQuestion} />
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" isLoading={createQuiz.isPending || updateQuiz.isPending}>
                        {editingQuiz ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {editingQuiz ? 'Сохранить тест' : 'Создать тест'}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetQuizForm}>
                        Сбросить
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                {quizzesLoading ? (
                  Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-[1.8rem] border border-border/70 bg-card/70" />)
                ) : sortedQuizzes.length > 0 ? (
                  sortedQuizzes.map((quiz) => (
                    <Card key={quiz.id} hover={false} className="overflow-hidden">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={quiz.is_active ? 'success' : 'danger'}>{quiz.is_active ? 'Активен' : 'Скрыт'}</Badge>
                              <Badge variant="warning">{resolveSelfBeliefWagerLabel(quiz.wager)}</Badge>
                              <Badge>{quiz.question_count} вопросов</Badge>
                            </div>
                            <CardTitle>{quiz.title}</CardTitle>
                            <CardDescription>{quiz.description || 'Без дополнительного описания.'}</CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingQuiz(quiz); setQuizForm(buildQuizForm(quiz)) }}>
                              <PencilLine className="h-4 w-4" />
                              Редактировать
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteQuiz(quiz)}>
                              <Trash2 className="h-4 w-4" />
                              Удалить
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                          <div className="text-sm text-muted-foreground">Таймер</div>
                          <div className="mt-2 text-2xl font-bold text-card-foreground">{quiz.time_limit_seconds} сек.</div>
                        </div>
                        <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                          <div className="text-sm text-muted-foreground">Обновлён</div>
                          <div className="mt-2 text-sm font-semibold text-card-foreground">{formatDateTime(quiz.updated_at)}</div>
                        </div>
                        <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 p-4">
                          <div className="text-sm text-muted-foreground">Режим</div>
                          <div className="mt-2 text-sm font-semibold text-card-foreground">Матч против Корги</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card hover={false} className="xl:col-span-2">
                    <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 py-12 text-center">
                      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
                      <div className="space-y-2">
                        <div className="text-lg font-semibold text-card-foreground">Тестов пока нет</div>
                        <p className="max-w-xl text-sm leading-7 text-muted-foreground">Сначала соберите матч из нескольких вопросов. После публикации он появится у студентов в режиме дуэли.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              <Card hover={false}>
                <CardHeader>
                  <CardTitle>{editingQuestion ? 'Редактирование вопроса' : 'Новый вопрос'}</CardTitle>
                  <CardDescription>Из этих вопросов потом собираются полноценные тесты для ставок 1, 3 и 5 печенек.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6" onSubmit={handleSubmitQuestion}>
                    <QuestionEditor form={questionForm} onChange={(patch) => setQuestionForm((current) => ({ ...current, ...patch }))} onOptionChange={handleQuestionOptionChange} />
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" isLoading={createQuestion.isPending || updateQuestion.isPending}>
                        {editingQuestion ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {editingQuestion ? 'Сохранить вопрос' : 'Добавить вопрос'}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetQuestionForm}>
                        Сбросить
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                {questionsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-60 animate-pulse rounded-[1.8rem] border border-border/70 bg-card/70" />)
                ) : sortedQuestions.length > 0 ? (
                  sortedQuestions.map((question) => (
                    <Card key={question.id} hover={false} className="overflow-hidden">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge>{question.category}</Badge>
                              <Badge variant="warning">{resolveSelfBeliefWagerLabel(question.wager)}</Badge>
                              <Badge variant={question.is_active ? 'success' : 'danger'}>{question.is_active ? 'Активен' : 'Скрыт'}</Badge>
                            </div>
                            <CardTitle className="text-lg leading-8">{question.prompt}</CardTitle>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingQuestion(question); setQuestionForm(buildQuestionForm(question)) }}>
                              <PencilLine className="h-4 w-4" />
                              Редактировать
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteQuestion(question)}>
                              <Trash2 className="h-4 w-4" />
                              Удалить
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {question.options.map((option, index) => (
                            <div key={index} className={cn('rounded-[1.15rem] border p-4 text-sm leading-6', index === question.correct_option ? 'border-emerald-500/30 bg-emerald-500/10 text-card-foreground' : 'border-border/70 bg-secondary/15 text-muted-foreground')}>
                              <div className="mb-1 font-semibold">{optionLetter(index)}</div>
                              <div>{option}</div>
                              {index === question.correct_option ? (
                                <div className="mt-2 inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Правильный ответ
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        {question.explanation ? (
                          <div className="rounded-[1.15rem] border border-border/70 bg-secondary/15 p-4">
                            <div className="text-sm font-semibold text-card-foreground">Пояснение</div>
                            <p className="mt-2 text-sm leading-7 text-muted-foreground">{question.explanation}</p>
                          </div>
                        ) : null}

                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Обновлён: {formatDateTime(question.updated_at)}</div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card hover={false} className="xl:col-span-2">
                    <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 py-12 text-center">
                      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
                      <div className="space-y-2">
                        <div className="text-lg font-semibold text-card-foreground">Банк вопросов пуст</div>
                        <p className="max-w-xl text-sm leading-7 text-muted-foreground">Добавьте несколько вопросов, чтобы потом собирать из них матчи для разных ставок.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
