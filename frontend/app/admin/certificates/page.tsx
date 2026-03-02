"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminCertificates,
  useCreateCertificate,
  useDeleteCertificate,
  useUpdateCertificate,
} from '@/lib/queries'
import type { Certificate } from '@/lib/types'
import { toast } from 'sonner'

export default function AdminCertificatesPage() {
  const { data: certificates, isLoading } = useAdminCertificates()
  const createCertificate = useCreateCertificate()
  const updateCertificate = useUpdateCertificate()
  const deleteCertificate = useDeleteCertificate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    base_price: 5,
    current_price: 5,
    inflation_step: 0,
    total_quantity: '',
    validity_days: '',
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Certificate | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createCertificate.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        base_price: Number(form.base_price),
        current_price: Number(form.current_price),
        inflation_step: Number(form.inflation_step),
        total_quantity: form.total_quantity ? Number(form.total_quantity) : undefined,
        remaining_quantity: form.total_quantity ? Number(form.total_quantity) : undefined,
        validity_days: form.validity_days ? Number(form.validity_days) : undefined,
        is_active: true,
      })

      toast.success('Сертификат добавлен')
      setForm({
        title: '',
        description: '',
        base_price: 5,
        current_price: 5,
        inflation_step: 0,
        total_quantity: '',
        validity_days: '',
      })
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const startEdit = (cert: Certificate) => {
    setEditingId(cert.id)
    setEditForm({ ...cert })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    if (!editForm) {
      return
    }

    try {
      await updateCertificate.mutateAsync(editForm)
      toast.success('Сертификат обновлен')
      cancelEdit()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const toggleActive = async (cert: Certificate) => {
    try {
      await updateCertificate.mutateAsync({ ...cert, is_active: !cert.is_active })
      toast.success('Статус сертификата обновлен')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCertificate.mutateAsync(id)
      toast.success('Сертификат удален')
      if (editingId === id) {
        cancelEdit()
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
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Каталог сертификатов</h1>
            <p className="text-blue-600/70">Создание и управление товарами магазина</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader>
                <CardTitle>Новый сертификат</CardTitle>
                <CardDescription>
                  Заполните параметры: базовая цена нужна для формулы роста, текущая цена используется прямо сейчас, шаг инфляции прибавляется после каждой покупки.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="title">Название</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                      placeholder="Отсрочка сдачи"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                      placeholder="Краткое описание того, что получает студент"
                      className="min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base-price">Базовая цена</Label>
                    <Input
                      id="base-price"
                      type="number"
                      value={form.base_price}
                      onChange={(e) => setForm((s) => ({ ...s, base_price: Number(e.target.value) }))}
                      required
                    />
                    <p className="text-xs text-blue-600/70">Исходная цена для расчета инфляции.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current-price">Текущая цена</Label>
                    <Input
                      id="current-price"
                      type="number"
                      value={form.current_price}
                      onChange={(e) => setForm((s) => ({ ...s, current_price: Number(e.target.value) }))}
                      required
                    />
                    <p className="text-xs text-blue-600/70">Цена, по которой продается сейчас.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inflation-step">Шаг инфляции</Label>
                    <Input
                      id="inflation-step"
                      type="number"
                      value={form.inflation_step}
                      onChange={(e) => setForm((s) => ({ ...s, inflation_step: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-blue-600/70">На сколько увеличивается цена после покупки.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total-quantity">Лимит количества</Label>
                    <Input
                      id="total-quantity"
                      type="number"
                      value={form.total_quantity}
                      onChange={(e) => setForm((s) => ({ ...s, total_quantity: e.target.value }))}
                      placeholder="Пусто = безлимит"
                    />
                    <p className="text-xs text-blue-600/70">Общий доступный тираж.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validity-days">Срок действия (дней)</Label>
                    <Input
                      id="validity-days"
                      type="number"
                      value={form.validity_days}
                      onChange={(e) => setForm((s) => ({ ...s, validity_days: e.target.value }))}
                      placeholder="Например: 7"
                    />
                    <p className="text-xs text-blue-600/70">Через сколько дней сертификат истечет.</p>
                  </div>

                  <div className="flex items-end">
                    <Button type="submit" isLoading={createCertificate.isPending} className="w-full">
                      Добавить
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card>
              <CardHeader>
                <CardTitle>Существующие сертификаты</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-blue-50" />
                    ))}
                  </div>
                ) : certificates && certificates.length > 0 ? (
                  <div className="space-y-3">
                    {certificates.map((cert, index) => {
                      const isEditing = editingId === cert.id && editForm

                      return (
                        <motion.div
                          key={cert.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="rounded-lg bg-blue-50 p-4"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <Input
                                  value={editForm.title}
                                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                                  placeholder="Название"
                                />
                                <Input
                                  type="number"
                                  value={editForm.current_price}
                                  onChange={(e) =>
                                    setEditForm((prev) => (prev ? { ...prev, current_price: Number(e.target.value) } : prev))
                                  }
                                  placeholder="Текущая цена"
                                />
                                <Input
                                  type="number"
                                  value={editForm.inflation_step}
                                  onChange={(e) =>
                                    setEditForm((prev) => (prev ? { ...prev, inflation_step: Number(e.target.value) } : prev))
                                  }
                                  placeholder="Шаг инфляции"
                                />
                                <Input
                                  type="number"
                                  value={editForm.base_price}
                                  onChange={(e) =>
                                    setEditForm((prev) => (prev ? { ...prev, base_price: Number(e.target.value) } : prev))
                                  }
                                  placeholder="Базовая цена"
                                />
                                <Input
                                  type="number"
                                  value={editForm.total_quantity ?? ''}
                                  onChange={(e) =>
                                    setEditForm((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            total_quantity: e.target.value ? Number(e.target.value) : undefined,
                                          }
                                        : prev,
                                    )
                                  }
                                  placeholder="Лимит"
                                />
                                <Input
                                  type="number"
                                  value={editForm.validity_days ?? ''}
                                  onChange={(e) =>
                                    setEditForm((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            validity_days: e.target.value ? Number(e.target.value) : undefined,
                                          }
                                        : prev,
                                    )
                                  }
                                  placeholder="Срок действия"
                                />
                              </div>

                              <Textarea
                                value={editForm.description || ''}
                                onChange={(e) =>
                                  setEditForm((prev) => (prev ? { ...prev, description: e.target.value || undefined } : prev))
                                }
                                placeholder="Описание"
                                className="min-h-[44px]"
                              />

                              <div className="flex flex-wrap gap-2">
                                <Button onClick={saveEdit} isLoading={updateCertificate.isPending}>
                                  Сохранить
                                </Button>
                                <Button variant="outline" onClick={cancelEdit}>
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="font-semibold text-blue-900">{cert.title}</div>
                                <div className="text-sm text-blue-700/80">{cert.description || 'Без описания'}</div>
                                <div className="text-sm text-blue-600/80">
                                  Цена: {cert.current_price} 🍪 • Остаток:{' '}
                                  {cert.remaining_quantity == null ? '∞' : cert.remaining_quantity} • Статус:{' '}
                                  {cert.is_active ? 'активен' : 'неактивен'}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => startEdit(cert)}>
                                  Редактировать
                                </Button>
                                <Button variant="outline" onClick={() => toggleActive(cert)} isLoading={updateCertificate.isPending}>
                                  {cert.is_active ? 'Деактивировать' : 'Активировать'}
                                </Button>
                                <Button variant="outline" onClick={() => handleDelete(cert.id)} disabled={deleteCertificate.isPending}>
                                  Удалить
                                </Button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-blue-600/70">Сертификаты не найдены</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  )
}
