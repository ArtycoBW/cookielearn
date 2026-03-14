"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Gift } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAdminSurveys, useRewardSurvey } from '@/lib/queries'
import { toast } from 'sonner'

const QUESTION_MAP: Record<number, string> = {
  1: 'Выбери свою расу (специализация)',
  2: 'Твой главный мотиватор на этот семестр',
  3: 'Жанр сериала про твою студенческую жизнь',
  5: 'Кого бы позвал на пару?',
  6: 'Кем видишь себя через 2 года?',
  7: 'Какой технологии не хватает?',
  8: 'Рецепт перезагрузки после учебного дня',
  9: 'Любимая книга',
  10: 'Фильм/сериал, который готов советовать',
  11: 'Пожелания для платформы',
}

export default function AdminSurveysPage() {
  const { data: surveys, isLoading } = useAdminSurveys()
  const rewardSurvey = useRewardSurvey()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rewardAmounts, setRewardAmounts] = useState<Record<string, number>>({})

  const handleReward = async (submissionId: string) => {
    const reward = rewardAmounts[submissionId] ?? 10

    try {
      await rewardSurvey.mutateAsync({
        submission_id: submissionId,
        reward,
      })
      toast.success(`Начислено ${reward} 🍪 за анкету`)
    } catch (error: any) {
      toast.error(error.message || 'Ошибка начисления')
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Анкеты студентов</h1>
            <p className="text-blue-600/70">
              Просмотр ответов и начисление печенек за заполнение
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader>
                <CardTitle>Заполненные анкеты ({surveys?.length ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 animate-pulse rounded-lg bg-blue-50" />
                    ))}
                  </div>
                ) : surveys && surveys.length > 0 ? (
                  <div className="space-y-3">
                    {surveys.map((submission, index) => {
                      const isExpanded = expandedId === submission.id
                      const rewardAmount = rewardAmounts[submission.id] ?? 10

                      return (
                        <motion.div
                          key={submission.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="rounded-lg bg-blue-50"
                        >
                          <div
                            className="flex cursor-pointer items-center justify-between p-4"
                            onClick={() => toggleExpand(submission.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-semibold text-blue-900">
                                  {submission.user?.full_name ?? 'Студент'}
                                </p>
                                <p className="text-sm text-blue-600/70">
                                  {submission.user?.group_name ?? 'Без группы'} |{' '}
                                  {new Date(submission.submitted_at).toLocaleDateString('ru-RU')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {submission.reviewed ? (
                                <Badge className="border-green-500/30 bg-green-500/20 text-green-700">
                                  +{submission.reward_given} 🍪
                                </Badge>
                              ) : (
                                <Badge className="border-yellow-500/30 bg-yellow-500/20 text-yellow-700">
                                  Ожидает
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-blue-500" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="border-t border-blue-100 px-4 pb-4"
                            >
                              <div className="mt-4 space-y-3">
                                {submission.answers.map((answer) => (
                                  <div key={answer.question_id} className="rounded-lg bg-white p-3">
                                    <p className="mb-1 text-xs font-medium text-blue-500">
                                      {QUESTION_MAP[answer.question_id] ?? `Вопрос ${answer.question_id}`}
                                    </p>
                                    <p className="text-sm text-blue-900">{answer.answer}</p>
                                  </div>
                                ))}
                              </div>

                              {!submission.reviewed && (
                                <div className="mt-4 flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-blue-700">Начислить:</span>
                                    <Input
                                      type="number"
                                      value={rewardAmount}
                                      onChange={(e) =>
                                        setRewardAmounts((prev) => ({
                                          ...prev,
                                          [submission.id]: Number(e.target.value),
                                        }))
                                      }
                                      className="w-20"
                                      min={0}
                                    />
                                    <span className="text-sm text-blue-600/70">🍪</span>
                                  </div>
                                  <Button
                                    onClick={() => handleReward(submission.id)}
                                    isLoading={rewardSurvey.isPending}
                                    className="gap-2"
                                  >
                                    <Gift className="h-4 w-4" />
                                    Начислить
                                  </Button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-blue-600/70">
                    <div className="mb-4 text-6xl">📋</div>
                    <p className="text-xl">Пока никто не заполнил анкету</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}
