'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ImagePlus, PencilLine, Trash2 } from 'lucide-react'
import NextImage from 'next/image'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
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

type CertificateFormState = {
  title: string
  description: string
  base_price: number
  current_price: number
  inflation_step: number
  total_quantity: string
  remaining_quantity: string
  validity_days: string
  expires_at?: Date
  background_image: string
  is_active: boolean
}

const emptyForm: CertificateFormState = {
  title: '',
  description: '',
  base_price: 5,
  current_price: 5,
  inflation_step: 0,
  total_quantity: '',
  remaining_quantity: '',
  validity_days: '',
  expires_at: undefined,
  background_image: '',
  is_active: true,
}

function readNumber(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined
}

async function optimizeImageFile(file: File): Promise<string> {
  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'))
      img.src = imageUrl
    })

    const maxWidth = 1400
    const maxHeight = 900
    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1)

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * ratio)
    canvas.height = Math.round(image.height * ratio)

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Не удалось подготовить изображение')
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

function serializeDateToLocalEnd(date?: Date): string | undefined {
  if (!date) {
    return undefined
  }

  const localDate = new Date(date)
  localDate.setHours(23, 59, 59, 999)
  return localDate.toISOString()
}

function toFormState(cert: Certificate): CertificateFormState {
  return {
    title: cert.title,
    description: cert.description || '',
    base_price: cert.base_price,
    current_price: cert.current_price,
    inflation_step: cert.inflation_step,
    total_quantity: cert.total_quantity != null ? String(cert.total_quantity) : '',
    remaining_quantity: cert.remaining_quantity != null ? String(cert.remaining_quantity) : '',
    validity_days: cert.validity_days != null ? String(cert.validity_days) : '',
    expires_at: cert.expires_at ? new Date(cert.expires_at) : undefined,
    background_image: cert.background_image || '',
    is_active: cert.is_active,
  }
}

function buildCertificatePayload(form: CertificateFormState) {
  const totalQuantity = readNumber(form.total_quantity)
  const remainingQuantityRaw = readNumber(form.remaining_quantity)
  const remainingQuantity = totalQuantity == null ? undefined : remainingQuantityRaw ?? totalQuantity

  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    base_price: Number(form.base_price),
    current_price: Number(form.current_price),
    inflation_step: Number(form.inflation_step),
    total_quantity: totalQuantity,
    remaining_quantity: remainingQuantity,
    validity_days: readNumber(form.validity_days),
    expires_at: serializeDateToLocalEnd(form.expires_at),
    background_image: form.background_image || undefined,
    is_active: form.is_active,
  }
}

export default function AdminCertificatesPage() {
  const { data: certificates, isLoading } = useAdminCertificates()
  const createCertificate = useCreateCertificate()
  const updateCertificate = useUpdateCertificate()
  const deleteCertificate = useDeleteCertificate()

  const [form, setForm] = useState<CertificateFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CertificateFormState>(emptyForm)

  const activeCount = useMemo(() => certificates?.filter((item) => item.is_active).length ?? 0, [certificates])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'edit') => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    optimizeImageFile(file)
      .then((base64) => {
        if (target === 'create') {
          setForm((current) => ({ ...current, background_image: base64 }))
        } else {
          setEditForm((current) => ({ ...current, background_image: base64 }))
        }
        toast.success('Фон подготовлен в облегчённом размере')
      })
      .catch((error: any) => {
        toast.error(error.message || 'Не удалось обработать изображение')
      })
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const payload = buildCertificatePayload(form)

      await createCertificate.mutateAsync(payload)
      setForm(emptyForm)
      toast.success('Сертификат добавлен')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось создать сертификат')
    }
  }

  const startEdit = (certificate: Certificate) => {
    setEditingId(certificate.id)
    setEditForm(toFormState(certificate))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  const saveEdit = async (certificate: Certificate) => {
    try {
      await updateCertificate.mutateAsync({
        ...certificate,
        ...buildCertificatePayload(editForm),
      })
      cancelEdit()
      toast.success('Сертификат обновлён')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось сохранить изменения')
    }
  }

  const toggleActive = async (certificate: Certificate) => {
    try {
      await updateCertificate.mutateAsync({
        ...certificate,
        is_active: !certificate.is_active,
      })
      toast.success(certificate.is_active ? 'Сертификат снят с продажи' : 'Сертификат снова активен')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось обновить статус')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCertificate.mutateAsync(id)
      if (editingId === id) {
        cancelEdit()
      }
      toast.success('Сертификат удалён')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить сертификат')
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <Badge variant="default" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Certificates
            </Badge>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-bold text-blue-900">Каталог сертификатов</h1>
                <p className="mt-2 max-w-3xl text-blue-600/80">
                  Управляйте карточками магазина: датой окончания продажи, фоном, сроком действия после покупки и остатком.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:min-w-[340px]">
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">Всего позиций</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{certificates?.length ?? 0}</div>
                </Card>
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">Активно</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{activeCount}</div>
                </Card>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <Card>
              <CardHeader>
                <CardTitle>Новый сертификат</CardTitle>
                <CardDescription>
                  Фон загружается сразу в карточку товара, а дата окончания снимает его с продажи после выбранного дня.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                  <div className="space-y-2 xl:col-span-4">
                    <Label htmlFor="create-title">Название</Label>
                    <Input
                      id="create-title"
                      value={form.title}
                      onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                      placeholder="Освобождение от ответа"
                      required
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-8">
                    <Label htmlFor="create-description">Описание</Label>
                    <Textarea
                      id="create-description"
                      value={form.description}
                      onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                      placeholder="Коротко опишите привилегию"
                      className="min-h-[90px]"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-2">
                    <Label htmlFor="create-base-price">Базовая цена</Label>
                    <Input
                      id="create-base-price"
                      type="number"
                      min={1}
                      value={form.base_price}
                      onChange={(e) => setForm((current) => ({ ...current, base_price: Number(e.target.value) }))}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-2">
                    <Label htmlFor="create-current-price">Текущая цена</Label>
                    <Input
                      id="create-current-price"
                      type="number"
                      min={1}
                      value={form.current_price}
                      onChange={(e) => setForm((current) => ({ ...current, current_price: Number(e.target.value) }))}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-2">
                    <Label htmlFor="create-inflation-step">Рост цены</Label>
                    <Input
                      id="create-inflation-step"
                      type="number"
                      min={0}
                      value={form.inflation_step}
                      onChange={(e) => setForm((current) => ({ ...current, inflation_step: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-2">
                    <Label htmlFor="create-total-quantity">Общий лимит</Label>
                    <Input
                      id="create-total-quantity"
                      type="number"
                      min={0}
                      value={form.total_quantity}
                      onChange={(e) => setForm((current) => ({ ...current, total_quantity: e.target.value }))}
                      placeholder="Пусто = без лимита"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-2">
                    <Label htmlFor="create-remaining-quantity">Остаток</Label>
                    <Input
                      id="create-remaining-quantity"
                      type="number"
                      min={0}
                      value={form.remaining_quantity}
                      onChange={(e) => setForm((current) => ({ ...current, remaining_quantity: e.target.value }))}
                      placeholder="По умолчанию = лимит"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-2">
                    <Label htmlFor="create-validity-days">Срок действия, дней</Label>
                    <Input
                      id="create-validity-days"
                      type="number"
                      min={0}
                      value={form.validity_days}
                      onChange={(e) => setForm((current) => ({ ...current, validity_days: e.target.value }))}
                      placeholder="Например, 7"
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-4">
                    <Label>Дата окончания продажи</Label>
                    <DatePicker
                      value={form.expires_at}
                      onChange={(date) => setForm((current) => ({ ...current, expires_at: date }))}
                      placeholder="Выберите дату"
                    />
                  </div>

                  <div className="space-y-2 xl:col-span-5">
                    <Label>Фон карточки</Label>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 text-sm font-semibold text-card-foreground transition-colors hover:bg-accent">
                        <ImagePlus className="h-4 w-4" />
                        {form.background_image ? 'Заменить фон' : 'Загрузить фон'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'create')} />
                      </label>
                      {form.background_image && (
                        <Button type="button" variant="ghost" onClick={() => setForm((current) => ({ ...current, background_image: '' }))}>
                          Убрать фон
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="xl:col-span-3">
                    {form.background_image ? (
                      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                        <NextImage
                          src={form.background_image}
                          alt="Предпросмотр фона"
                          width={800}
                          height={224}
                          unoptimized
                          className="h-28 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-secondary/40 text-sm text-muted-foreground">
                        Фон пока не выбран
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-12 flex flex-wrap items-center gap-3">
                    <Button type="submit" isLoading={createCertificate.isPending}>
                      Создать сертификат
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card>
              <CardHeader>
                <CardTitle>Существующие сертификаты</CardTitle>
                <CardDescription>Редактирование отражается и в админке, и в студенческом магазине.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="h-32 animate-pulse rounded-2xl bg-secondary/80" />
                    ))}
                  </div>
                ) : certificates && certificates.length > 0 ? (
                  <div className="space-y-4">
                    {certificates.map((certificate, index) => {
                      const isEditing = editingId === certificate.id
                      const currentForm = isEditing ? editForm : toFormState(certificate)

                      return (
                        <motion.div
                          key={certificate.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-secondary/45"
                        >
                          <div className="grid grid-cols-1 gap-0 xl:grid-cols-[280px_minmax(0,1fr)]">
                            <div className="relative min-h-[220px] border-b border-border/70 xl:min-h-full xl:border-b-0 xl:border-r">
                              {currentForm.background_image ? (
                                <NextImage
                                  src={currentForm.background_image}
                                  alt="Фон сертификата"
                                  fill
                                  unoptimized
                                  className="object-cover"
                                  sizes="280px"
                                />
                              ) : (
                                <div className="flex h-full min-h-[220px] items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.28),transparent),radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_42%)] text-sm text-muted-foreground">
                                  Фон не задан
                                </div>
                              )}
                              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.16))]" />
                            </div>

                            <div className="p-5">
                              {isEditing ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label>Название</Label>
                                      <Input value={editForm.title} onChange={(e) => setEditForm((current) => ({ ...current, title: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Дата окончания продажи</Label>
                                      <DatePicker
                                        value={editForm.expires_at}
                                        onChange={(date) => setEditForm((current) => ({ ...current, expires_at: date }))}
                                        placeholder="Без даты"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Описание</Label>
                                    <Textarea
                                      value={editForm.description}
                                      onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))}
                                      className="min-h-[96px]"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                                    <div className="space-y-2">
                                      <Label>База</Label>
                                      <Input type="number" min={1} value={editForm.base_price} onChange={(e) => setEditForm((current) => ({ ...current, base_price: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Цена</Label>
                                      <Input type="number" min={1} value={editForm.current_price} onChange={(e) => setEditForm((current) => ({ ...current, current_price: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Рост</Label>
                                      <Input type="number" min={0} value={editForm.inflation_step} onChange={(e) => setEditForm((current) => ({ ...current, inflation_step: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Лимит</Label>
                                      <Input type="number" min={0} value={editForm.total_quantity} onChange={(e) => setEditForm((current) => ({ ...current, total_quantity: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Остаток</Label>
                                      <Input type="number" min={0} value={editForm.remaining_quantity} onChange={(e) => setEditForm((current) => ({ ...current, remaining_quantity: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Дни действия</Label>
                                      <Input type="number" min={0} value={editForm.validity_days} onChange={(e) => setEditForm((current) => ({ ...current, validity_days: e.target.value }))} />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
                                    <div className="space-y-2">
                                      <Label>Фон карточки</Label>
                                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 text-sm font-semibold text-card-foreground transition-colors hover:bg-accent">
                                          <ImagePlus className="h-4 w-4" />
                                          {editForm.background_image ? 'Заменить фон' : 'Загрузить фон'}
                                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'edit')} />
                                        </label>
                                        {editForm.background_image && (
                                          <Button type="button" variant="ghost" onClick={() => setEditForm((current) => ({ ...current, background_image: '' }))}>
                                            Убрать фон
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Button onClick={() => saveEdit(certificate)} isLoading={updateCertificate.isPending}>
                                        Сохранить
                                      </Button>
                                      <Button variant="outline" onClick={cancelEdit}>
                                        Отмена
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex h-full flex-col justify-between gap-4">
                                  <div className="space-y-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                      <div>
                                        <h3 className="text-2xl font-bold text-card-foreground">{certificate.title}</h3>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{certificate.description || 'Описание не заполнено'}</p>
                                      </div>
                                      <Badge variant={certificate.is_active ? 'success' : 'warning'}>
                                        {certificate.is_active ? 'Активен' : 'Снят с продажи'}
                                      </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                                      <div className="rounded-2xl bg-card px-4 py-3 shadow-sm">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Цена</div>
                                        <div className="mt-1 text-2xl font-bold text-card-foreground">{certificate.current_price} 🍪</div>
                                      </div>
                                      <div className="rounded-2xl bg-card px-4 py-3 shadow-sm">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Инфляция</div>
                                        <div className="mt-1 text-2xl font-bold text-card-foreground">+{certificate.inflation_step}</div>
                                      </div>
                                      <div className="rounded-2xl bg-card px-4 py-3 shadow-sm">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Всего</div>
                                        <div className="mt-1 text-2xl font-bold text-card-foreground">
                                          {certificate.total_quantity == null ? '∞' : certificate.total_quantity}
                                        </div>
                                      </div>
                                      <div className="rounded-2xl bg-card px-4 py-3 shadow-sm">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Остаток</div>
                                        <div className="mt-1 text-2xl font-bold text-card-foreground">
                                          {certificate.remaining_quantity == null ? '∞' : certificate.remaining_quantity}
                                        </div>
                                      </div>
                                      <div className="rounded-2xl bg-card px-4 py-3 shadow-sm">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Действует</div>
                                        <div className="mt-1 text-lg font-bold text-card-foreground">
                                          {certificate.validity_days ? `${certificate.validity_days} дн.` : 'Без срока'}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                      {certificate.expires_at && (
                                        <span className="inline-flex items-center gap-2">
                                          <CalendarDays className="h-4 w-4" />
                                          До {new Date(certificate.expires_at).toLocaleDateString('ru-RU')}
                                        </span>
                                      )}
                                      {certificate.background_image && <span>Фон отображается в магазине</span>}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" onClick={() => startEdit(certificate)}>
                                      <PencilLine className="h-4 w-4" />
                                      Редактировать
                                    </Button>
                                    <Button variant="outline" onClick={() => toggleActive(certificate)} isLoading={updateCertificate.isPending}>
                                      {certificate.is_active ? 'Снять с продажи' : 'Активировать'}
                                    </Button>
                                    <Button variant="ghost" onClick={() => handleDelete(certificate.id)} disabled={deleteCertificate.isPending}>
                                      <Trash2 className="h-4 w-4" />
                                      Удалить
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/35 px-6 py-14 text-center text-muted-foreground">
                    Сертификаты пока не созданы.
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
