'use client'

import { type ChangeEvent, type FormEvent, type MutableRefObject, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpenText,
  Eye,
  EyeOff,
  FileText,
  PencilLine,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { MarkdownToolbar } from '@/components/markdown-toolbar'
import { MaterialPreviewDialog } from '@/components/material-preview-dialog'
import { Navigation } from '@/components/navigation'
import { RichText } from '@/components/rich-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { deleteMaterialFile, type MaterialUploadResult, uploadMaterialFile } from '@/lib/material-storage'
import {
  describeMaterialFile,
  detectMaterialFormat,
  formatFileSize,
  materialFileAccept,
  materialFormatOptions,
  resolveMaterialFormatLabel,
} from '@/lib/materials'
import { useAdminMaterials, useCreateMaterial, useDeleteMaterial, useUpdateMaterial } from '@/lib/queries'
import type { Material, MaterialInput } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type MaterialFormState = {
  title: string
  description: string
  category: string
  format: string
  is_published: boolean
  is_featured: boolean
}

const emptyMaterialForm: MaterialFormState = {
  title: '',
  description: '',
  category: '',
  format: 'document',
  is_published: true,
  is_featured: false,
}

function buildMaterialForm(material?: Material): MaterialFormState {
  if (!material) {
    return emptyMaterialForm
  }

  return {
    title: material.title,
    description: material.description ?? '',
    category: material.category,
    format: material.format || 'document',
    is_published: material.is_published,
    is_featured: material.is_featured,
  }
}

function buildMaterialPayload(
  form: MaterialFormState,
  currentMaterial?: Material,
  uploadedFile?: MaterialUploadResult,
): MaterialInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    category: form.category.trim() || 'Общее',
    format: form.format.trim() || uploadedFile?.suggested_format || 'document',
    url: uploadedFile?.url ?? currentMaterial?.url ?? '',
    storage_bucket: uploadedFile?.storage_bucket ?? currentMaterial?.storage_bucket ?? undefined,
    storage_path: uploadedFile?.storage_path ?? currentMaterial?.storage_path ?? undefined,
    file_name: uploadedFile?.file_name ?? currentMaterial?.file_name ?? undefined,
    mime_type: uploadedFile?.mime_type ?? currentMaterial?.mime_type ?? undefined,
    file_size: uploadedFile?.file_size ?? currentMaterial?.file_size ?? undefined,
    is_published: form.is_published,
    is_featured: form.is_featured,
  }
}

type MaterialFormFieldsProps = {
  form: MaterialFormState
  onChange: (patch: Partial<MaterialFormState>) => void
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  idPrefix: string
  selectedFile: File | null
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  fileInputKey: number
  currentMaterial?: Material
  fileRequired?: boolean
  busy?: boolean
  onPreviewCurrent?: (material: Material) => void
}

function MaterialFormFields({
  form,
  onChange,
  textareaRef,
  idPrefix,
  selectedFile,
  onFileChange,
  fileInputKey,
  currentMaterial,
  fileRequired = false,
  busy = false,
  onPreviewCurrent,
}: MaterialFormFieldsProps) {
  const existingFileLabel = currentMaterial ? describeMaterialFile(currentMaterial) : null
  const selectedFileLabel = selectedFile ? `${selectedFile.name} / ${formatFileSize(selectedFile.size) ?? '0 Б'}` : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] xl:items-stretch">
        <div className="rounded-[1.6rem] border border-border/60 bg-secondary/15 p-5">
          <div className="space-y-3">
          <Label htmlFor={`${idPrefix}-title`}>Название</Label>
          <Input
            id={`${idPrefix}-title`}
            value={form.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Например: Шпаргалка по SQL join и подзапросам"
            required
          />
            <p className="text-sm text-muted-foreground">Короткое и понятное название поможет быстрее находить материал в каталоге.</p>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-border/60 bg-secondary/15 p-5">
          <div className="space-y-3">
            <Label htmlFor={`${idPrefix}-file`}>Файл</Label>
            <FileUpload
              key={`${idPrefix}-file-${fileInputKey}`}
              id={`${idPrefix}-file`}
              accept={materialFileAccept}
              onChange={onFileChange}
              required={fileRequired}
              disabled={busy}
              selectedFile={selectedFile}
              helperText="Поддерживаем PDF, Word, PowerPoint, Excel, TXT, RTF и ZIP до 25 МБ."
              summary={
                selectedFileLabel ? (
                  <>
                    Выбран новый файл: <span className="font-semibold">{selectedFileLabel}</span>
                  </>
                ) : existingFileLabel ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      Текущий файл: <span className="font-semibold">{existingFileLabel}</span>
                    </span>
                    {currentMaterial && onPreviewCurrent ? (
                      <Button type="button" variant="ghost" className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary/80" onClick={() => onPreviewCurrent(currentMaterial)}>
                        Предпросмотр
                      </Button>
                    ) : null}
                  </div>
                ) : null
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-category`}>Категория</Label>
          <Input
            id={`${idPrefix}-category`}
            value={form.category}
            onChange={(event) => onChange({ category: event.target.value })}
            placeholder="HTML, CSS, SQL, PHP..."
          />
        </div>

        <div className="space-y-2">
          <Label>Формат</Label>
          <Select value={form.format} onValueChange={(value) => onChange({ format: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите формат" />
            </SelectTrigger>
            <SelectContent>
              {materialFormatOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Статус и акцент</Label>
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            type="button"
            variant={form.is_published ? 'primary' : 'outline'}
            className="justify-center"
            onClick={() => onChange({ is_published: !form.is_published })}
          >
            {form.is_published ? 'Опубликован' : 'Скрыт'}
          </Button>
          <Button
            type="button"
            variant={form.is_featured ? 'primary' : 'outline'}
            className="justify-center"
            onClick={() => onChange({ is_featured: !form.is_featured })}
          >
            {form.is_featured ? 'Важный' : 'Обычный'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Публикация отвечает за видимость у студентов, а акцент поднимает материал в рекомендуемые.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-description`}>Описание</Label>
          <p className="text-sm text-muted-foreground">
            Можно оформить краткое резюме, чек-лист или список тем с markdown-разметкой.
          </p>
        </div>

        <MarkdownToolbar value={form.description} onChange={(value) => onChange({ description: value })} textareaRef={textareaRef} />

        <Textarea
          ref={textareaRef}
          id={`${idPrefix}-description`}
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={'Например: **Что внутри**, - join-ы и подзапросы, - фильтрация, - пара полезных примеров.'}
          className="min-h-[190px] resize-y leading-6"
        />
      </div>
    </div>
  )
}

async function rollbackUploadedFile(file?: Pick<MaterialUploadResult, 'storage_bucket' | 'storage_path'> | null) {
  if (!file?.storage_path) {
    return
  }

  try {
    await deleteMaterialFile(file.storage_path, file.storage_bucket)
  } catch {
    // ignore cleanup error, main error will be shown to the user
  }
}

export default function AdminMaterialsPage() {
  const { data: materials, isLoading } = useAdminMaterials()
  const createMaterial = useCreateMaterial()
  const updateMaterial = useUpdateMaterial()
  const deleteMaterial = useDeleteMaterial()

  const [form, setForm] = useState<MaterialFormState>(emptyMaterialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<MaterialFormState>(emptyMaterialForm)
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [createFileInputKey, setCreateFileInputKey] = useState(0)
  const [editFileInputKey, setEditFileInputKey] = useState(0)
  const [isUploadingCreate, setIsUploadingCreate] = useState(false)
  const [isUploadingEdit, setIsUploadingEdit] = useState(false)
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)

  const createTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  const materialList = useMemo(() => materials ?? [], [materials])
  const publishedCount = materialList.filter((item) => item.is_published).length
  const featuredCount = materialList.filter((item) => item.is_featured).length
  const storedCount = materialList.filter((item) => item.storage_path).length

  const patchCreateForm = (patch: Partial<MaterialFormState>) => setForm((current) => ({ ...current, ...patch }))
  const patchEditForm = (patch: Partial<MaterialFormState>) => setEditForm((current) => ({ ...current, ...patch }))

  const currentEditingMaterial = materialList.find((item) => item.id === editingId)
  const createBusy = isUploadingCreate || createMaterial.isPending
  const editBusy = isUploadingEdit || updateMaterial.isPending

  const handleCreateFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    setCreateFile(nextFile)
    if (nextFile) {
      patchCreateForm({ format: detectMaterialFormat(nextFile.name, form.format || 'document') })
    }
  }

  const handleEditFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    setEditFile(nextFile)
    if (nextFile) {
      patchEditForm({ format: detectMaterialFormat(nextFile.name, editForm.format || currentEditingMaterial?.format || 'document') })
    }
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()

    if (!createFile) {
      toast.error('Сначала выберите файл для загрузки.')
      return
    }

    let uploadedFile: MaterialUploadResult | null = null
    setIsUploadingCreate(true)

    try {
      uploadedFile = await uploadMaterialFile(createFile)
      await createMaterial.mutateAsync(buildMaterialPayload(form, undefined, uploadedFile))

      setForm(emptyMaterialForm)
      setCreateFile(null)
      setCreateFileInputKey((value) => value + 1)
      toast.success('Материал загружен в библиотеку')
    } catch (error: any) {
      await rollbackUploadedFile(uploadedFile)
      toast.error(error.message || 'Не удалось создать материал')
    } finally {
      setIsUploadingCreate(false)
    }
  }

  const startEdit = (material: Material) => {
    setEditingId(material.id)
    setEditForm(buildMaterialForm(material))
    setEditFile(null)
    setEditFileInputKey((value) => value + 1)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyMaterialForm)
    setEditFile(null)
    setEditFileInputKey((value) => value + 1)
  }

  const saveEdit = async (material: Material) => {
    let uploadedFile: MaterialUploadResult | null = null
    setIsUploadingEdit(true)

    try {
      if (editFile) {
        uploadedFile = await uploadMaterialFile(editFile)
      }

      await updateMaterial.mutateAsync({
        ...material,
        ...buildMaterialPayload(editForm, material, uploadedFile ?? undefined),
      })

      if (uploadedFile && material.storage_path && material.storage_path !== uploadedFile.storage_path) {
        try {
          await deleteMaterialFile(material.storage_path, material.storage_bucket ?? undefined)
        } catch {
          toast.error('Материал обновлён, но старый файл не удалось удалить из Storage.')
        }
      }

      cancelEdit()
      toast.success('Материал обновлён')
    } catch (error: any) {
      await rollbackUploadedFile(uploadedFile)
      toast.error(error.message || 'Не удалось сохранить материал')
    } finally {
      setIsUploadingEdit(false)
    }
  }

  const togglePublished = async (material: Material) => {
    try {
      await updateMaterial.mutateAsync({ ...material, is_published: !material.is_published })
      toast.success(material.is_published ? 'Материал скрыт' : 'Материал опубликован')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось обновить публикацию')
    }
  }

  const toggleFeatured = async (material: Material) => {
    try {
      await updateMaterial.mutateAsync({ ...material, is_featured: !material.is_featured })
      toast.success(material.is_featured ? 'Материал снят с рекомендаций' : 'Материал выделен как важный')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось обновить выделение')
    }
  }

  const handleDelete = async (material: Material) => {
    const confirmed = window.confirm(`Удалить материал "${material.title}"?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteMaterial.mutateAsync(material.id)
      if (editingId === material.id) {
        cancelEdit()
      }

      if (material.storage_path) {
        try {
          await deleteMaterialFile(material.storage_path, material.storage_bucket ?? undefined)
        } catch {
          toast.error('Материал удалён, но файл не удалось удалить из Storage.')
          return
        }
      }

      toast.success('Материал удалён')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить материал')
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <Badge variant="default" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Библиотека
            </Badge>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-bold text-foreground">Материалы курса</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Загружайте PDF, Word и другие учебные файлы прямо в Supabase Storage, чтобы библиотека курса жила в одном месте
                  и не зависела от внешних ссылок.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:min-w-[520px] lg:grid-cols-4">
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">Всего</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{materialList.length}</div>
                </Card>
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">В Storage</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{storedCount}</div>
                </Card>
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">Опубликовано</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{publishedCount}</div>
                </Card>
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">Важных</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{featuredCount}</div>
                </Card>
              </div>
            </div>
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle>Новый материал</CardTitle>
              <CardDescription>Загрузите файл, задайте категорию и короткое описание, чтобы студентам было проще ориентироваться в базе.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <MaterialFormFields
                  form={form}
                  onChange={patchCreateForm}
                  textareaRef={createTextareaRef}
                  idPrefix="create-material"
                  selectedFile={createFile}
                  onFileChange={handleCreateFileChange}
                  fileInputKey={createFileInputKey}
                  fileRequired
                  busy={createBusy}
                  onPreviewCurrent={setPreviewMaterial}
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Файл сначала попадёт в Supabase Storage, а потом появится в каталоге для студентов.
                  </p>
                  <Button type="submit" isLoading={createBusy}>
                    <Upload className="h-4 w-4" />
                    Загрузить материал
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Текущая библиотека</CardTitle>
              <CardDescription>Здесь можно заменить файл, поправить карточку материала, скрыть его или выделить как важный.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-64 animate-pulse rounded-[2rem] bg-secondary/70" />
                  ))}
                </div>
              ) : materialList.length > 0 ? (
                <div className="space-y-4">
                  {materialList.map((material) => {
                    const isEditing = editingId === material.id

                    return (
                      <motion.div key={material.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className={material.is_featured ? 'border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/20' : ''}>
                          <CardContent className="pt-6">
                            {isEditing ? (
                              <div className="space-y-5">
                                <MaterialFormFields
                                  form={editForm}
                                  onChange={patchEditForm}
                                  textareaRef={editTextareaRef}
                                  idPrefix={`edit-${material.id}`}
                                  selectedFile={editFile}
                                  onFileChange={handleEditFileChange}
                                  fileInputKey={editFileInputKey}
                                  currentMaterial={material}
                                  busy={editBusy}
                                  onPreviewCurrent={setPreviewMaterial}
                                />

                                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                  <Button type="button" variant="outline" onClick={cancelEdit}>
                                    Отмена
                                  </Button>
                                  <Button type="button" onClick={() => saveEdit(material)} isLoading={editBusy}>
                                    Сохранить
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-5">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                  <div className="min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-2xl font-semibold text-card-foreground">{material.title}</h3>
                                      <Badge variant={material.is_published ? 'success' : 'warning'}>
                                        {material.is_published ? 'Опубликован' : 'Скрыт'}
                                      </Badge>
                                      <Badge>{material.category}</Badge>
                                      <Badge variant="warning">{resolveMaterialFormatLabel(material.format)}</Badge>
                                      {material.is_featured ? (
                                        <Badge className="border-primary/20 bg-primary/10 text-card-foreground">
                                          <Sparkles className="mr-1 h-3.5 w-3.5" />
                                          Важный
                                        </Badge>
                                      ) : null}
                                    </div>

                                    {material.description ? (
                                      <div className="rounded-3xl border border-border/60 bg-secondary/20 p-4">
                                        <RichText text={material.description} className="text-[15px] leading-7 text-muted-foreground" />
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">Описание пока не добавлено.</p>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 xl:min-w-[320px]">
                                    <div className="rounded-2xl bg-secondary/35 p-4">
                                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Файл</div>
                                      <div className="mt-2 text-sm font-semibold leading-6 text-card-foreground">{describeMaterialFile(material)}</div>
                                    </div>
                                    <div className="rounded-2xl bg-secondary/35 p-4">
                                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Обновлён</div>
                                      <div className="mt-2 text-sm font-semibold leading-6 text-card-foreground">{formatDateTime(material.updated_at)}</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      {material.storage_path ? 'Файл хранится в Supabase Storage' : 'Материал ведёт на внешний ресурс'}
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                      <BookOpenText className="h-4 w-4" />
                                      Формат: {resolveMaterialFormatLabel(material.format)}
                                    </span>
                                  </div>

                                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    <Button type="button" variant="outline" onClick={() => setPreviewMaterial(material)}>
                                      <Eye className="h-4 w-4" />
                                      Предпросмотр
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => togglePublished(material)} isLoading={updateMaterial.isPending}>
                                      {material.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      {material.is_published ? 'Скрыть' : 'Опубликовать'}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => toggleFeatured(material)} isLoading={updateMaterial.isPending}>
                                      <Sparkles className="h-4 w-4" />
                                      {material.is_featured ? 'Убрать акцент' : 'Сделать важным'}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => startEdit(material)}>
                                      <PencilLine className="h-4 w-4" />
                                      Редактировать
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => handleDelete(material)}
                                      isLoading={deleteMaterial.isPending}
                                      className="border-rose-500/20 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/15"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Удалить
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-6 py-16 text-center text-muted-foreground">
                  Материалов пока нет.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <MaterialPreviewDialog material={previewMaterial} open={Boolean(previewMaterial)} onOpenChange={(open) => (!open ? setPreviewMaterial(null) : null)} />
    </>
  )
}
