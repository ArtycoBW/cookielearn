"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminTasks, useCloseTask, useCreateTask, useUpdateTask } from '@/lib/queries'
import type { Task } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

export default function AdminTasksPage() {
  const { data: tasks, isLoading } = useAdminTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const closeTask = useCloseTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'vote' | 'quiz' | 'activity'>('vote')
  const [reward, setReward] = useState(1)
  const [deadline, setDeadline] = useState('')

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createTask.mutateAsync({
        title,
        description: description || undefined,
        type,
        reward,
        deadline: deadline || undefined,
      })
      toast.success('Задание создано')
      setTitle('')
      setDescription('')
      setType('vote')
      setReward(1)
      setDeadline('')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id)
    setEditingTask({ ...task })
  }

  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setEditingTask(null)
  }

  const handleSaveEdit = async () => {
    if (!editingTask) {
      return
    }

    try {
      await updateTask.mutateAsync(editingTask)
      toast.success('Задание обновлено')
      handleCancelEdit()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleClose = async (taskId: string) => {
    try {
      const result = (await closeTask.mutateAsync(taskId)) as { winner_id?: string }
      if (result?.winner_id) {
        toast.success(`Задание закрыто. Победитель: ${result.winner_id}`)
      } else {
        toast.success('Задание закрыто. Голосов не было')
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Задания и голосования</h1>
            <p className="text-blue-600/70">Создавайте задания и закрывайте активные раунды</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader>
                <CardTitle>Новое задание</CardTitle>
                <CardDescription>Укажите параметры задания и награду победителю.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-task-title">Название</Label>
                    <Input
                      id="new-task-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Лучший ответ недели"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-task-type">Тип</Label>
                    <Select value={type} onValueChange={(value: 'vote' | 'quiz' | 'activity') => setType(value)}>
                      <SelectTrigger id="new-task-type">
                        <SelectValue placeholder="Тип задания" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vote">Голосование</SelectItem>
                        <SelectItem value="quiz">Квиз</SelectItem>
                        <SelectItem value="activity">Активность</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-task-reward">Награда (🍪)</Label>
                    <Input
                      id="new-task-reward"
                      type="number"
                      min={1}
                      value={reward}
                      onChange={(e) => setReward(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-task-deadline">Дедлайн</Label>
                    <Input
                      id="new-task-deadline"
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="new-task-description">Описание</Label>
                    <Textarea
                      id="new-task-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Что нужно сделать студентам"
                      className="min-h-[44px]"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button type="submit" isLoading={createTask.isPending} className="w-full">
                      Создать
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card>
              <CardHeader>
                <CardTitle>Список заданий</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-blue-50" />
                    ))}
                  </div>
                ) : tasks && tasks.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.map((task, index) => {
                      const isEditing = editingTaskId === task.id && editingTask

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="rounded-lg bg-blue-50 p-4"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                <Input
                                  value={editingTask.title}
                                  onChange={(e) =>
                                    setEditingTask((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                                  }
                                  placeholder="Название"
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  value={editingTask.reward}
                                  onChange={(e) =>
                                    setEditingTask((prev) => (prev ? { ...prev, reward: Number(e.target.value) } : prev))
                                  }
                                />
                                <Select
                                  value={editingTask.type}
                                  onValueChange={(value: 'vote' | 'quiz' | 'activity') =>
                                    setEditingTask((prev) => (prev ? { ...prev, type: value } : prev))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="vote">Голосование</SelectItem>
                                    <SelectItem value="quiz">Квиз</SelectItem>
                                    <SelectItem value="activity">Активность</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={editingTask.status}
                                  onValueChange={(value: 'active' | 'closed') =>
                                    setEditingTask((prev) => (prev ? { ...prev, status: value } : prev))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Активна</SelectItem>
                                    <SelectItem value="closed">Закрыта</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <Input
                                type="datetime-local"
                                value={editingTask.deadline ? editingTask.deadline.slice(0, 16) : ''}
                                onChange={(e) =>
                                  setEditingTask((prev) => (prev ? { ...prev, deadline: e.target.value || undefined } : prev))
                                }
                              />

                              <Textarea
                                value={editingTask.description || ''}
                                onChange={(e) =>
                                  setEditingTask((prev) =>
                                    prev ? { ...prev, description: e.target.value || undefined } : prev,
                                  )
                                }
                                placeholder="Описание"
                                className="min-h-[44px]"
                              />

                              <div className="flex flex-wrap gap-2">
                                <Button onClick={handleSaveEdit} isLoading={updateTask.isPending}>
                                  Сохранить
                                </Button>
                                <Button variant="outline" onClick={handleCancelEdit}>
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="font-semibold text-blue-900">{task.title}</div>
                                <div className="text-sm text-blue-700/80">{task.description || 'Без описания'}</div>
                                <div className="mt-1 text-sm text-blue-700">
                                  Тип: {task.type} • Награда: {task.reward} 🍪 • Статус: {task.status}
                                  {task.deadline && ` • Дедлайн: ${formatDateTime(task.deadline)}`}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => handleStartEdit(task)}>
                                  Редактировать
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleClose(task.id)}
                                  disabled={task.status !== 'active' || closeTask.isPending}
                                >
                                  Закрыть
                                </Button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-blue-600/70">Задания отсутствуют</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}
