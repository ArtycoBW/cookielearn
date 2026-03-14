"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMySurvey, useSubmitSurvey } from '@/lib/queries'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

const SURVEY_QUESTIONS = [
  {
    id: 1,
    text: 'Выбери свою расу (специализация)',
    type: 'radio' as const,
    options: [
      'Frontend-эльф (Люблю красоту и React)',
      'Backend-гном (Тяжелая артиллерия, базы данных и Java/C#)',
      'Mobile-варвар (Пилю под iOS/Android)',
      'Data Science-маг (Python, нейросети, математика)',
      'DevOps-инженер (Docker, CI/CD, все горит, но работает)',
      'Универсал (Fullstack) / Пока не определился',
    ],
  },
  {
    id: 2,
    text: 'Твой главный мотиватор на этот семестр',
    type: 'radio' as const,
    options: [
      'Хочу сделать реальный проект, который потом можно положить в портфолио',
      'Хочу фрилансить, чтобы хватало на кофе и подписку на нейросети',
      'Хочу наконец-то начать зарабатывать и не просить у родителей',
      'Хочу закрыть сессию и просто выжить',
      'Мне интересен сам процесс обучения',
    ],
  },
  {
    id: 3,
    text: 'Если бы про твою студенческую жизнь сняли сериал, в каком жанре он был бы?',
    type: 'radio' as const,
    options: [
      'Комедия (ясно, тут без вариантов)',
      'Трагикомедия (смешно до слез, больно до смеха)',
      'Хоррор (когда препод говорит «а теперь открываем конспекты»)',
      'Ситком (общага, одногруппники и закадровый смех)',
      'Реалити-шоу (12 злых людей в одной лекционной аудитории)',
      'Мыльная опера (кто кому должен лабу, тот того и любит)',
      'Киберпанк (компьютеры 2007 года, задачи 2030 года)',
      'Триллер (код работает — я в панике)',
      'Фантастика (я выспался и все сдал вовремя)',
      'Черная комедия (шутим про дедлайны, чтобы не рыдать)',
      'Драмеди (половина серии я страдаю, половина — туплю в мемы)',
      'Постапокалипсис (вид после сессии)',
      'Роуд-муви (путь от дома до универа длиной в 4 года)',
      'Экшен (успеть нажать «отправить» за секунду до полуночи)',
      'Детектив (кто слил ответы и почему я не в чате)',
      'Мокьюментари (все серьезно, но мы-то знаем)',
      'Документальное кино (никакой фантастики, только боль)',
      'Боевик (пробиваюсь к автомату через тернии)',
    ],
  },
  {
    id: 5,
    text: 'Если бы у тебя была возможность позвать любого человека (реального или вымышленного) на свой курс, чтобы он провел с тобой пару, кто бы это был?',
    type: 'text' as const,
  },
  {
    id: 6,
    text: 'Кем ты себя видишь через 2 года?',
    type: 'text' as const,
  },
  {
    id: 7,
    text: 'Какой технологии тебе не хватает в учебной программе, которую ты бы хотел изучать глубже?',
    type: 'text' as const,
  },
  {
    id: 8,
    text: 'Твой личный рецепт перезагрузки после учебного дня',
    type: 'text' as const,
  },
  {
    id: 9,
    text: 'Любимая книга (та, что в сердце)',
    type: 'text' as const,
  },
  {
    id: 10,
    text: 'Фильм/сериал, который ты готов советовать всем',
    type: 'text' as const,
  },
  {
    id: 11,
    text: 'Пожелания, что хотели бы видеть на платформе',
    type: 'textarea' as const,
  },
]

export default function SurveyPage() {
  const { data: existingSurvey, isLoading } = useMySurvey()
  const submitSurvey = useSubmitSurvey()

  const [answers, setAnswers] = useState<Record<number, string>>({})

  const setAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const allAnswered = SURVEY_QUESTIONS.every((q) => (answers[q.id] || '').trim().length > 0)

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast.error('Пожалуйста, ответьте на все вопросы')
      return
    }

    try {
      await submitSurvey.mutateAsync({
        answers: SURVEY_QUESTIONS.map((q) => ({
          question_id: q.id,
          answer: answers[q.id],
        })),
      })

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd'],
      })

      toast.success('Анкета отправлена! Спасибо!')
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при отправке')
    }
  }

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="flex min-h-screen items-center justify-center page-theme-gradient">
          <div className="text-4xl">🍪</div>
        </div>
      </>
    )
  }

  if (existingSurvey) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen page-theme-gradient">
          <div className="mx-auto max-w-3xl p-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="mb-2 text-4xl font-bold text-blue-900">Анкета</h1>
              <p className="text-blue-600/70">Ваши ответы сохранены</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
                    <h2 className="mb-2 text-2xl font-bold text-blue-900">Анкета уже заполнена</h2>
                    <p className="text-blue-600/70">
                      Спасибо за ваши ответы! Администратор рассмотрит анкету и начислит печеньки.
                    </p>
                    {existingSurvey.reward_given != null && (
                      <div className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-green-700">
                        Начислено: +{existingSurvey.reward_given} 🍪
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Анкета</h1>
            <p className="text-blue-600/70">Заполните анкету и получите печеньки за участие!</p>
          </motion.div>

          {SURVEY_QUESTIONS.map((question, qIndex) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qIndex * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <span className="mr-2 text-blue-500">{qIndex + 1}.</span>
                    {question.text}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {question.type === 'radio' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                            answers[question.id] === option
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-blue-100 hover:border-blue-200 hover:bg-blue-50/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={() => setAnswer(question.id, option)}
                            className="mt-0.5 accent-blue-600"
                          />
                          <span className="text-sm text-blue-900">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'text' && (
                    <Input
                      value={answers[question.id] || ''}
                      onChange={(e) => setAnswer(question.id, e.target.value)}
                      placeholder="Ваш ответ..."
                    />
                  )}

                  {question.type === 'textarea' && (
                    <Textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => setAnswer(question.id, e.target.value)}
                      placeholder="Ваш ответ..."
                      className="min-h-[100px]"
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: SURVEY_QUESTIONS.length * 0.05 }}
          >
            <Button
              onClick={handleSubmit}
              isLoading={submitSurvey.isPending}
              disabled={!allAnswered}
              className="w-full"
              size="lg"
            >
              Отправить анкету
            </Button>
            {!allAnswered && (
              <p className="mt-2 text-center text-sm text-blue-600/60">
                Ответьте на все вопросы для отправки
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </>
  )
}
