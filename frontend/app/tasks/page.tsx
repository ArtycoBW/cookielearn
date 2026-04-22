'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ExternalLink, Link2, MessageSquare, SendHorizonal, TextQuote } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { RichText } from '@/components/rich-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useMyTasks, useSubmitTask } from '@/lib/queries'
import { resolveTaskTypeLabel } from '@/lib/task-types'
import type { Task } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type DraftState = {
  response_text: string
  response_url: string
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

function isTaskClosed(task: Task) {
  if (task.status === 'closed') {
    return true
  }

  if (!task.deadline) {
    return false
  }

  return new Date(task.deadline).getTime() < Date.now()
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

  const activeTasks = useMemo(() => (tasks ?? []).filter((task) => !isTaskClosed(task)), [tasks])
  const closedTasks = useMemo(() => (tasks ?? []).filter((task) => isTaskClosed(task)), [tasks])

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
    if (isTaskClosed(task)) {
      toast.error('Срок задания уже истёк, отправка закрыта')
      return
    }

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
    const closed = isTaskClosed(task)

    return (
      <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">{task.title}</CardTitle>
                  <Badge variant={closed ? 'warning' : 'success'}>{closed ? 'Закрыто' : 'Активно'}</Badge>
                  <Badge>{resolveTaskTypeLabel(task.type)}</Badge>
                </div>

                <div className="rounded-3xl border border-border/60 bg-secondary/25 p-4 sm:p-5">
                  {task.description ? (
                    <RichText text={task.description} className="text-base text-muted-foreground" />
                  ) : (
                    <CardDescription>Описание не заполнено.</CardDescription>
                  )}
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-border/50 bg-secondary/45 px-4 py-3 text-right shadow-sm lg:min-w-[148px]">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Максимум</div>
                <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[2rem] font-bold leading-none text-card-foreground">
                  <span>{task.reward}</span>
                  <span>🍪</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
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
              <div className="rounded-3xl border border-border/60 bg-secondary/35 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={submission.reviewed ? 'success' : 'default'}>
                    {submission.reviewed ? 'Проверено' : 'На проверке'}
                  </Badge>
                  {submission.reward_given != null && <Badge variant="warning">Выдано: {submission.reward_given} 🍪</Badge>}
                </div>

                {submission.response_text && (
                  <div className="mt-4 rounded-2xl bg-card/60 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-card-foreground">
                      <TextQuote className="h-4 w-4 text-primary" />
                      Комментарий
                    </div>
                    <RichText text={submission.response_text} className="text-card-foreground" />
                  </div>
                )}

                {submission.response_url && (
                  <a
                    href={submission.response_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Открыть прикреплённую ссылку
                  </a>
                )}
              </div>
            )}

            {!closed ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
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
                    placeholder={'Поддерживаются переносы строк, списки через "- " и выделение через **жирный**.'}
                    className="min-h-[148px] resize-y leading-6"
                    disabled={isReviewed}
                  />
                </div>

                <div className="xl:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Можно приложить только ссылку, только комментарий или оба поля сразу.
                  </p>
                  <Button onClick={() => handleSubmit(task)} isLoading={submitTask.isPending} disabled={isReviewed}>
                    <SendHorizonal className="h-4 w-4" />
                    {submission ? 'Обновить ответ' : 'Отправить ответ'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/70 bg-secondary/25 px-4 py-3 text-sm text-muted-foreground">
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
