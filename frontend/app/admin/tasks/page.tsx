'use client'

import { type FormEvent, type MutableRefObject, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ExternalLink, FileCheck2, PencilLine, Plus, Trash2 } from 'lucide-react'
import { MarkdownToolbar } from '@/components/markdown-toolbar'
import { Navigation } from '@/components/navigation'
import { RichText } from '@/components/rich-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminTaskSubmissions,
  useAdminTasks,
  useCloseTask,
  useCreateTask,
  useDeleteTask,
  useRewardTaskSubmission,
  useUpdateTask,
} from '@/lib/queries'
import { isPredefinedTaskType, predefinedTaskTypeOptions, resolveTaskTypeLabel } from '@/lib/task-types'
import type { Task, TaskSubmission } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type TaskFormState = {
  title: string
  description: string
  selectedType: string
  customType: string
  reward: number
  deadline?: Date
}

const emptyTaskForm: TaskFormState = {
  title: '',
  description: '',
  selectedType: 'other',
  customType: '',
  reward: 3,
  deadline: undefined,
}

function buildTaskForm(task?: Task): TaskFormState {
  if (!task) {
    return emptyTaskForm
  }

  const normalizedType = task.type?.trim() || 'other'
  const isKnownType = isPredefinedTaskType(normalizedType)

  return {
    title: task.title,
    description: task.description || '',
    selectedType: isKnownType ? normalizedType : 'other',
    customType: !isKnownType && normalizedType !== 'other' ? normalizedType : '',
    reward: task.reward,
    deadline: task.deadline ? new Date(task.deadline) : undefined,
  }
}

function resolveTaskTypeValue(form: TaskFormState) {
  if (form.selectedType === 'other') {
    return form.customType.trim() || 'other'
  }

  return form.selectedType
}

function deadlineToISOString(date?: Date) {
  if (!date) {
    return undefined
  }

  const normalized = new Date(date)
  normalized.setHours(23, 59, 59, 999)
  return normalized.toISOString()
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

type TaskFormFieldsProps = {
  form: TaskFormState
  onChange: (patch: Partial<TaskFormState>) => void
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  idPrefix: string
}

function TaskFormFields({ form, onChange, textareaRef, idPrefix }: TaskFormFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>Название</Label>
        <Input
          id={`${idPrefix}-title`}
          value={form.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Например: Разберите pull request и найдите баг"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_220px]">
        <div className="space-y-2">
          <Label>Тип</Label>
          <Select value={form.selectedType} onValueChange={(value) => onChange({ selectedType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Тип задания" />
            </SelectTrigger>
            <SelectContent>
              {predefinedTaskTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value="other">Другое</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-reward`}>Максимум</Label>
          <Input
            id={`${idPrefix}-reward`}
            type="number"
            min={1}
            value={form.reward}
            onChange={(event) => onChange({ reward: Number(event.target.value) || 0 })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Срок</Label>
          <DatePicker value={form.deadline} onChange={(date) => onChange({ deadline: date })} placeholder="Без срока" />
        </div>
      </div>

      {form.selectedType === 'other' && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-custom-type`}>Свой тип задания</Label>
          <Input
            id={`${idPrefix}-custom-type`}
            value={form.customType}
            onChange={(event) => onChange({ customType: event.target.value })}
            placeholder="Например: PHP, Laravel, UX, DevOps"
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-description`}>Формулировка</Label>
          <p className="text-sm text-muted-foreground">
            Поддерживаются жирный текст, курсив, списки и ссылки. Кнопки ниже вставляют markdown автоматически.
          </p>
        </div>

        <MarkdownToolbar value={form.description} onChange={(value) => onChange({ description: value })} textareaRef={textareaRef} />

        <Textarea
          ref={textareaRef}
          id={`${idPrefix}-description`}
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={'Опишите задачу, критерии, ссылки и требования. Например: **что сделать**, - список шагов, [ссылка](https://...).'}
          className="min-h-[220px] resize-y leading-6"
        />
      </div>
    </div>
  )
}

export default function AdminTasksPage() {
  const { data: tasks, isLoading: tasksLoading } = useAdminTasks()
  const { data: submissions, isLoading: submissionsLoading } = useAdminTaskSubmissions()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const closeTask = useCloseTask()
  const deleteTask = useDeleteTask()
  const rewardTaskSubmission = useRewardTaskSubmission()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TaskFormState>(emptyTaskForm)
  const [submissionFilter, setSubmissionFilter] = useState('all')
  const [submissionStatus, setSubmissionStatus] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [rewardDrafts, setRewardDrafts] = useState<Record<string, number>>({})

  const createTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

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
  }, [submissionFilter, submissionList, submissionStatus])

  const patchCreateForm = (patch: Partial<TaskFormState>) => setForm((current) => ({ ...current, ...patch }))
  const patchEditForm = (patch: Partial<TaskFormState>) => setEditForm((current) => ({ ...current, ...patch }))

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()

    try {
      await createTask.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: resolveTaskTypeValue(form),
        reward: form.reward,
        deadline: deadlineToISOString(form.deadline),
      })
      setForm(emptyTaskForm)
      setIsCreateOpen(false)
      toast.success('Задание создано')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось создать задание')
    }
  }

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditForm(buildTaskForm(task))
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
        type: resolveTaskTypeValue(editForm),
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

  const handleDelete = async (task: Task) => {
    const confirmed = window.confirm(`Удалить задание "${task.title}" и все ответы студентов?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteTask.mutateAsync(task.id)
      if (editingId === task.id) {
        cancelEdit()
      }
      toast.success('Задание удалено')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить задание')
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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
          >
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-blue-900">Задания</h1>
              <p className="max-w-3xl text-blue-600/80">
                Создавайте задания с аккуратным описанием, сроком, максимальной наградой и быстрым просмотром ответов студентов.
              </p>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="xl:self-start">
                  <Plus className="h-4 w-4" />
                  Новое задание
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-4xl overflow-hidden p-0">
                <div className="max-h-[88vh] overflow-y-auto p-6 sm:p-7">
                  <DialogHeader className="space-y-2">
                    <DialogTitle className="text-2xl">Новое задание</DialogTitle>
                    <DialogDescription>
                      Оформите понятное описание, выберите тип, срок и максимальную награду. Ниже можно сразу сделать текст жирным,
                      курсивным, добавить список и ссылки.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreate} className="mt-6 space-y-6">
                    <TaskFormFields form={form} onChange={patchCreateForm} textareaRef={createTextareaRef} idPrefix="create-task" />

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Отмена
                        </Button>
                      </DialogClose>
                      <Button type="submit" isLoading={createTask.isPending}>
                        Создать задание
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle>Задания в работе</CardTitle>
              <CardDescription>Список опубликованных заданий с быстрым редактированием, закрытием и удалением.</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-28 animate-pulse rounded-[2rem] bg-secondary/70" />
                  ))}
                </div>
              ) : taskList.length > 0 ? (
                <div className="space-y-4">
                  {taskList.map((task) => {
                    const closed = isTaskClosed(task)
                    const isEditing = editingId === task.id

                    return (
                      <div key={task.id} className="rounded-[2rem] border border-border/60 bg-card/75 p-5 lg:p-6">
                        {isEditing ? (
                          <div className="space-y-5">
                            <TaskFormFields form={editForm} onChange={patchEditForm} textareaRef={editTextareaRef} idPrefix={`edit-${task.id}`} />

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                              <Button type="button" variant="outline" onClick={cancelEdit}>
                                Отмена
                              </Button>
                              <Button type="button" onClick={() => saveEdit(task)} isLoading={updateTask.isPending}>
                                Сохранить
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_148px] xl:items-start">
                              <div className="min-w-0 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-2xl font-semibold text-card-foreground">{task.title}</span>
                                  <Badge variant={closed ? 'warning' : 'success'}>{closed ? 'Закрыто' : 'Активно'}</Badge>
                                  <Badge>{resolveTaskTypeLabel(task.type)}</Badge>
                                </div>

                                <div className="rounded-[1.6rem] border border-border/50 bg-secondary/15 p-5">
                                  {task.description ? (
                                    <RichText text={task.description} className="text-[15px] leading-7 text-muted-foreground" />
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Описание не заполнено.</p>
                                  )}
                                </div>
                              </div>

                              <div className="xl:justify-self-end">
                                <div className="rounded-[1.35rem] border border-border/50 bg-secondary/45 px-4 py-3 text-right">
                                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Максимум</div>
                                  <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[2rem] font-bold leading-none text-card-foreground">
                                    <span>{task.reward}</span>
                                    <span>🍪</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
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
                                <Button type="button" variant="outline" onClick={() => startEdit(task)}>
                                  <PencilLine className="h-4 w-4" />
                                  Редактировать
                                </Button>
                                <Button type="button" variant="outline" onClick={() => handleClose(task.id)} isLoading={closeTask.isPending} disabled={closed}>
                                  Закрыть
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleDelete(task)}
                                  isLoading={deleteTask.isPending}
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Удалить
                                </Button>
                              </div>
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

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <CardTitle>Ответы студентов</CardTitle>
                  <CardDescription>Проверяйте ответы и начисляйте печеньки без переходов по разным страницам.</CardDescription>
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
                    <div key={submission.id} className="rounded-[2rem] border border-border/60 bg-card/75 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-3">
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

                          {submission.response_text && (
                            <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4">
                              <RichText text={submission.response_text} className="text-card-foreground" />
                            </div>
                          )}

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
                          <div className="w-full max-w-[310px] space-y-3 rounded-2xl border border-border/60 bg-secondary/35 p-4">
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
                            <Button onClick={() => handleReward(submission)} isLoading={rewardTaskSubmission.isPending} className="w-full">
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
