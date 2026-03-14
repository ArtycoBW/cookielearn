'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ExternalLink, Link2, MessageSquare, SendHorizonal } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useMyTasks, useSubmitTask } from '@/lib/queries'
import type { Task } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type DraftState = {
  response_text: string
  response_url: string
}

function typeLabel(type: string) {
  switch (type) {
    case 'feedback':
      return 'Замечание по материалам'
    case 'sql':
      return 'SQL-задание'
    case 'meme':
      return 'Мем по SQL'
    default:
      return 'Другое'
  }
}

function buildDrafts(tasks: Task[]) {
  return tasks.reduce<Record<string, DraftState>>((accumulator, task) => {
    accumulator[task.id] = {
      response_text: task.my_submission?.response_text || '',
      response_url: task.my_submission?.response_url || '',
    }
    return accumulator
  }, {})
}

export default function TasksPage() {
  const { data: tasks, isLoading } = useMyTasks()
  const submitTask = useSubmitTask()
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})

  useEffect(() => {
    if (tasks) {
      setDrafts(buildDrafts(tasks))
    }
  }, [tasks])

  const activeTasks = useMemo(() => (tasks ?? []).filter((task) => task.status === 'active'), [tasks])
  const closedTasks = useMemo(() => (tasks ?? []).filter((task) => task.status === 'closed'), [tasks])

  const handleChange = (taskID: string, field: keyof DraftState, value: string) => {
    setDrafts((current) => ({
      ...current,
      [taskID]: {
        response_text: current[taskID]?.response_text || '',
        response_url: current[taskID]?.response_url || '',
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (task: Task) => {
    const draft = drafts[task.id] || { response_text: '', response_url: '' }

    try {
      await submitTask.mutateAsync({
        task_id: task.id,
        response_text: draft.response_text.trim() || undefined,
        response_url: draft.response_url.trim() || undefined,
      })
      toast.success(task.my_submission ? 'Ответ обновлён' : 'Ответ отправлен')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось отправить ответ')
    }
  }

  const renderTaskCard = (task: Task) => {
    const draft = drafts[task.id] || { response_text: '', response_url: '' }
    const submission = task.my_submission
    const isReviewed = Boolean(submission?.reviewed)

    return (
      <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{task.title}</CardTitle>
                  <Badge variant={task.status === 'active' ? 'success' : 'warning'}>
                    {task.status === 'active' ? 'Активно' : 'Закрыто'}
                  </Badge>
                  <Badge>{typeLabel(task.type)}</Badge>
                </div>
                <CardDescription>{task.description || 'Описание не заполнено.'}</CardDescription>
              </div>

              <div className="rounded-2xl bg-secondary/55 px-4 py-3 text-right">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Максимум</div>
                <div className="text-2xl font-bold text-card-foreground">{task.reward} 🍪</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {task.deadline ? (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Дедлайн: {formatDateTime(task.deadline)}
                </span>
              ) : (
                <span>Без срока</span>
              )}

              {submission && <span>Отправлено: {formatDateTime(submission.submitted_at)}</span>}
            </div>

            {submission && (
              <div className="rounded-2xl border border-border/60 bg-secondary/35 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={submission.reviewed ? 'success' : 'default'}>
                    {submission.reviewed ? 'Проверено' : 'На проверке'}
                  </Badge>
                  {submission.reward_given != null && <Badge variant="warning">Выдано: {submission.reward_given} 🍪</Badge>}
                </div>

                {submission.response_text && <p className="mt-3 text-sm text-card-foreground">{submission.response_text}</p>}

                {submission.response_url && (
                  <a
                    href={submission.response_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Открыть прикреплённую ссылку
                  </a>
                )}
              </div>
            )}

            {task.status === 'active' ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Link2 className="h-4 w-4 text-primary" />
                    Ссылка на документ, отчёт или мем
                  </div>
                  <Input
                    value={draft.response_url}
                    onChange={(event) => handleChange(task.id, 'response_url', event.target.value)}
                    placeholder="https://docs.google.com/..."
                    disabled={isReviewed}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Комментарий
                  </div>
                  <Textarea
                    value={draft.response_text}
                    onChange={(event) => handleChange(task.id, 'response_text', event.target.value)}
                    placeholder="Коротко опишите, что вы исправили, нашли или приложили"
                    className="min-h-[112px]"
                    disabled={isReviewed}
                  />
                </div>

                <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
                  <Button onClick={() => handleSubmit(task)} isLoading={submitTask.isPending} disabled={isReviewed}>
                    <SendHorizonal className="h-4 w-4" />
                    {submission ? 'Обновить ответ' : 'Отправить ответ'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Можно приложить только ссылку, только комментарий или оба поля сразу.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-4 py-3 text-sm text-muted-foreground">
                Задание закрыто. Если ответ был отправлен раньше, он останется в истории выше.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-4xl font-bold text-blue-900">Задания</h1>
            <p className="max-w-3xl text-blue-600/80">
              Здесь преподаватель публикует задания. Ответ можно отправить ссылкой на документ, мем, отчёт или кратким комментарием.
            </p>
          </motion.div>

          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Активные</TabsTrigger>
              <TabsTrigger value="closed">Завершённые</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-64 animate-pulse rounded-3xl bg-secondary/70" />
                  ))}
                </div>
              ) : activeTasks.length > 0 ? (
                <div className="space-y-4">{activeTasks.map(renderTaskCard)}</div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-6 py-16 text-center text-muted-foreground">
                  Активных заданий сейчас нет.
                </div>
              )}
            </TabsContent>

            <TabsContent value="closed">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-56 animate-pulse rounded-3xl bg-secondary/70" />
                  ))}
                </div>
              ) : closedTasks.length > 0 ? (
                <div className="space-y-4">{closedTasks.map(renderTaskCard)}</div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-6 py-16 text-center text-muted-foreground">
                  Завершённых заданий пока нет.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
