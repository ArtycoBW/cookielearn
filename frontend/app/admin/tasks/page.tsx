'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ExternalLink, FileCheck2, PencilLine } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminTaskSubmissions,
  useAdminTasks,
  useCloseTask,
  useCreateTask,
  useRewardTaskSubmission,
  useUpdateTask,
} from '@/lib/queries'
import type { Task, TaskSubmission } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type TaskFormState = {
  title: string
  description: string
  type: string
  reward: number
  deadline?: Date
}

const emptyTaskForm: TaskFormState = {
  title: '',
  description: '',
  type: 'other',
  reward: 3,
  deadline: undefined,
}

function typeLabel(type: string) {
  switch (type) {
    case 'feedback':
      return 'Замечание'
    case 'sql':
      return 'SQL'
    case 'meme':
      return 'Мем'
    default:
      return 'Другое'
  }
}

function deadlineToISOString(date?: Date) {
  if (!date) {
    return undefined
  }

  const normalized = new Date(date)
  normalized.setHours(23, 59, 59, 999)
  return normalized.toISOString()
}

export default function AdminTasksPage() {
  const { data: tasks, isLoading: tasksLoading } = useAdminTasks()
  const { data: submissions, isLoading: submissionsLoading } = useAdminTaskSubmissions()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const closeTask = useCloseTask()
  const rewardTaskSubmission = useRewardTaskSubmission()

  const [form, setForm] = useState<TaskFormState>(emptyTaskForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TaskFormState>(emptyTaskForm)
  const [submissionFilter, setSubmissionFilter] = useState('all')
  const [submissionStatus, setSubmissionStatus] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [rewardDrafts, setRewardDrafts] = useState<Record<string, number>>({})

  const taskList = useMemo(() => tasks ?? [], [tasks])
  const submissionList = useMemo(() => submissions ?? [], [submissions])

  const filteredSubmissions = useMemo(() => {
    return submissionList.filter((submission) => {
      const matchesTask = submissionFilter === 'all' || submission.task_id === submissionFilter
      const matchesStatus =
        submissionStatus === 'all' ||
        (submissionStatus === 'pending' && !submission.reviewed) ||
        (submissionStatus === 'reviewed' && submission.reviewed)

      return matchesTask && matchesStatus
    })
  }, [submissionList, submissionFilter, submissionStatus])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      await createTask.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        reward: form.reward,
        deadline: deadlineToISOString(form.deadline),
      })
      setForm(emptyTaskForm)
      toast.success('Задание создано')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось создать задание')
    }
  }

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditForm({
      title: task.title,
      description: task.description || '',
      type: task.type,
      reward: task.reward,
      deadline: task.deadline ? new Date(task.deadline) : undefined,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyTaskForm)
  }

  const saveEdit = async (task: Task) => {
    try {
      await updateTask.mutateAsync({
        ...task,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        type: editForm.type,
        reward: editForm.reward,
        deadline: deadlineToISOString(editForm.deadline),
      })
      cancelEdit()
      toast.success('Задание обновлено')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось обновить задание')
    }
  }

  const handleClose = async (taskId: string) => {
    try {
      await closeTask.mutateAsync(taskId)
      toast.success('Задание закрыто')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось закрыть задание')
    }
  }

  const handleReward = async (submission: TaskSubmission) => {
    const reward = rewardDrafts[submission.id] ?? submission.task?.reward ?? 0

    try {
      await rewardTaskSubmission.mutateAsync({
        submission_id: submission.id,
        reward,
      })
      toast.success('Ответ проверен')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось проверить ответ')
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-4xl font-bold text-blue-900">Задания</h1>
            <p className="max-w-3xl text-blue-600/80">
              Создавайте задания без голосования: с формулировкой, сроком или без него, максимальной наградой и проверкой ответов по ссылке или комментарию.
            </p>
          </motion.div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Новое задание</CardTitle>
                <CardDescription>Подходит для замечаний по материалам, SQL-отчётов, мемов и любых других ответов по ссылке.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Название</Label>
                    <Input
                      id="task-title"
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Например: Найдите ошибку в лабораторной"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Тип</Label>
                      <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Тип задания" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feedback">Замечание по материалам</SelectItem>
                          <SelectItem value="sql">SQL-задание</SelectItem>
                          <SelectItem value="meme">Мем по SQL</SelectItem>
                          <SelectItem value="other">Другое</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="task-reward">Максимальная награда</Label>
                      <Input
                        id="task-reward"
                        type="number"
                        min={0}
                        value={form.reward}
                        onChange={(event) => setForm((current) => ({ ...current, reward: Number(event.target.value) }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Срок</Label>
                    <DatePicker
                      value={form.deadline}
                      onChange={(date) => setForm((current) => ({ ...current, deadline: date }))}
                      placeholder="Без срока"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task-description">Формулировка</Label>
                    <Textarea
                      id="task-description"
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Опишите, что нужно найти, прислать или объяснить"
                      className="min-h-[140px]"
                    />
                  </div>

                  <Button type="submit" isLoading={createTask.isPending}>
                    Создать задание
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Задания в работе</CardTitle>
                <CardDescription>Список опубликованных заданий с количеством ответов и быстрым редактированием.</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-28 animate-pulse rounded-2xl bg-secondary/70" />
                    ))}
                  </div>
                ) : taskList.length > 0 ? (
                  <div className="space-y-3">
                    {taskList.map((task) => {
                      const isEditing = editingId === task.id

                      return (
                        <div key={task.id} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                          {isEditing ? (
                            <div className="space-y-4">
                              <Input
                                value={editForm.title}
                                onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                              />
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <Select value={editForm.type} onValueChange={(value) => setEditForm((current) => ({ ...current, type: value }))}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="feedback">Замечание</SelectItem>
                                    <SelectItem value="sql">SQL</SelectItem>
                                    <SelectItem value="meme">Мем</SelectItem>
                                    <SelectItem value="other">Другое</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  min={0}
                                  value={editForm.reward}
                                  onChange={(event) => setEditForm((current) => ({ ...current, reward: Number(event.target.value) }))}
                                />
                                <DatePicker
                                  value={editForm.deadline}
                                  onChange={(date) => setEditForm((current) => ({ ...current, deadline: date }))}
                                  placeholder="Без срока"
                                />
                              </div>
                              <Textarea
                                value={editForm.description}
                                onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                                className="min-h-[110px]"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button onClick={() => saveEdit(task)} isLoading={updateTask.isPending}>
                                  Сохранить
                                </Button>
                                <Button variant="outline" onClick={cancelEdit}>
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-lg font-semibold text-card-foreground">{task.title}</span>
                                    <Badge variant={task.status === 'active' ? 'success' : 'warning'}>
                                      {task.status === 'active' ? 'Активно' : 'Закрыто'}
                                    </Badge>
                                    <Badge>{typeLabel(task.type)}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{task.description || 'Описание не заполнено.'}</p>
                                </div>

                                <div className="rounded-2xl bg-secondary/55 px-4 py-3 text-right">
                                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Максимум</div>
                                  <div className="text-2xl font-bold text-card-foreground">{task.reward} 🍪</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                {task.deadline ? (
                                  <span className="inline-flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    До {formatDateTime(task.deadline)}
                                  </span>
                                ) : (
                                  <span>Без срока</span>
                                )}
                                <span>Ответов: {task.submission_count ?? 0}</span>
                                <span>Проверено: {task.reviewed_count ?? 0}</span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => startEdit(task)}>
                                  <PencilLine className="h-4 w-4" />
                                  Редактировать
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleClose(task.id)}
                                  isLoading={closeTask.isPending}
                                  disabled={task.status !== 'active'}
                                >
                                  Закрыть
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-6 py-14 text-center text-muted-foreground">
                    Заданий пока нет.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <CardTitle>Ответы студентов</CardTitle>
                  <CardDescription>Проверяйте ответы и начисляйте печеньки без отдельного голосования.</CardDescription>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Select value={submissionFilter} onValueChange={setSubmissionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все задания" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все задания</SelectItem>
                      {taskList.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={submissionStatus} onValueChange={(value) => setSubmissionStatus(value as typeof submissionStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все ответы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все ответы</SelectItem>
                      <SelectItem value="pending">Только на проверке</SelectItem>
                      <SelectItem value="reviewed">Только проверенные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-36 animate-pulse rounded-2xl bg-secondary/70" />
                  ))}
                </div>
              ) : filteredSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {filteredSubmissions.map((submission) => (
                    <div key={submission.id} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-card-foreground">{submission.user?.full_name}</span>
                            {submission.user?.group_name && <Badge>{submission.user.group_name}</Badge>}
                            <Badge variant={submission.reviewed ? 'success' : 'default'}>
                              {submission.reviewed ? 'Проверено' : 'На проверке'}
                            </Badge>
                            <Badge variant="warning">{submission.task?.reward ?? 0} 🍪 максимум</Badge>
                          </div>

                          <div>
                            <p className="font-medium text-card-foreground">{submission.task?.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>Отправлено: {formatDateTime(submission.submitted_at)}</span>
                              {submission.task?.deadline && (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  До {formatDateTime(submission.task.deadline)}
                                </span>
                              )}
                            </div>
                          </div>

                          {submission.response_text && <p className="text-sm text-card-foreground">{submission.response_text}</p>}

                          {submission.response_url && (
                            <a
                              href={submission.response_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Открыть ссылку
                            </a>
                          )}
                        </div>

                        {submission.reviewed ? (
                          <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
                            Выдано: {submission.reward_given ?? 0} 🍪
                          </div>
                        ) : (
                          <div className="w-full max-w-[280px] space-y-3 rounded-2xl border border-border/60 bg-secondary/35 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                              <FileCheck2 className="h-4 w-4 text-primary" />
                              Проверка ответа
                            </div>
                            <Input
                              type="number"
                              min={0}
                              max={submission.task?.reward ?? undefined}
                              value={rewardDrafts[submission.id] ?? submission.task?.reward ?? 0}
                              onChange={(event) =>
                                setRewardDrafts((current) => ({
                                  ...current,
                                  [submission.id]: Number(event.target.value),
                                }))
                              }
                            />
                            <Button
                              onClick={() => handleReward(submission)}
                              isLoading={rewardTaskSubmission.isPending}
                              className="w-full"
                            >
                              Начислить и отметить
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-6 py-14 text-center text-muted-foreground">
                  Ответов по текущим фильтрам нет.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
