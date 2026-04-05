'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpenText, Eye, FileText, Sparkles } from 'lucide-react'
import { MaterialPreviewDialog } from '@/components/material-preview-dialog'
import { Navigation } from '@/components/navigation'
import { RichText } from '@/components/rich-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { describeMaterialFile, materialFormatOptions, resolveMaterialFormatLabel } from '@/lib/materials'
import { useMaterials } from '@/lib/queries'
import type { Material } from '@/lib/types'

function renderMaterialCard(material: Material, featured = false, onPreview?: (material: Material) => void) {
  return (
    <motion.div key={material.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={featured ? 'border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/30' : ''}>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {material.is_featured ? (
              <Badge className="border-primary/20 bg-primary/10 text-card-foreground">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Рекомендуем
              </Badge>
            ) : null}
            <Badge>{material.category}</Badge>
            <Badge variant="warning">{resolveMaterialFormatLabel(material.format)}</Badge>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl">{material.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {describeMaterialFile(material)}
              </span>
              <span>{material.storage_path ? 'Хранится в библиотеке курса' : 'Внешний ресурс'}</span>
            </div>
            {material.description ? (
              <div className="rounded-3xl border border-border/60 bg-secondary/20 p-4">
                <RichText text={material.description} className="text-[15px] leading-7 text-muted-foreground" />
              </div>
            ) : (
              <CardDescription>Короткое описание пока не добавлено.</CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Предпросмотр откроется в модальном окне, а скачать файл можно уже внутри него.
          </div>

          <Button type="button" onClick={() => onPreview?.(material)} className="sm:min-w-[160px]">
            <Eye className="h-4 w-4" />
            Просмотреть
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function MaterialsPage() {
  const { data: materials, isLoading } = useMaterials()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [format, setFormat] = useState('all')
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)

  const materialList = useMemo(() => materials ?? [], [materials])
  const categories = useMemo(
    () => ['all', ...Array.from(new Set(materialList.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'))],
    [materialList],
  )

  const filteredMaterials = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return materialList.filter((material) => {
      const matchesCategory = category === 'all' || material.category === category
      const matchesFormat = format === 'all' || material.format === format
      const haystack = [material.title, material.description ?? '', material.category, material.format, material.file_name ?? ''].join(' ').toLowerCase()
      const matchesSearch = normalizedSearch === '' || haystack.includes(normalizedSearch)

      return matchesCategory && matchesFormat && matchesSearch
    })
  }, [category, format, materialList, search])

  const featuredMaterials = filteredMaterials.filter((material) => material.is_featured)
  const regularMaterials = filteredMaterials.filter((material) => !material.is_featured)
  const storedCount = materialList.filter((material) => material.storage_path).length

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
                <h1 className="text-4xl font-bold text-foreground">Материалы</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Здесь собраны документы и полезные материалы курса: PDF, Word-файлы, презентации и другие пособия, которые можно
                  открыть в пару кликов.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[420px] lg:grid-cols-3">
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">Всего</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{materialList.length}</div>
                </Card>
                <Card hover={false} className="p-4">
                  <div className="text-sm text-muted-foreground">В библиотеке</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{storedCount}</div>
                </Card>
                <Card hover={false} className="p-4 md:col-span-2 lg:col-span-1">
                  <div className="text-sm text-muted-foreground">Категорий</div>
                  <div className="mt-1 text-3xl font-bold text-card-foreground">{Math.max(categories.length - 1, 0)}</div>
                </Card>
              </div>
            </div>
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle>Фильтры</CardTitle>
              <CardDescription>Можно быстро отобрать материалы по теме, формату или ключевому слову.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по названию, теме, описанию или имени файла" />

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === 'all' ? 'Все категории' : value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Формат" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все форматы</SelectItem>
                  {materialFormatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-[2rem] bg-secondary/70" />
              ))}
            </div>
          ) : filteredMaterials.length > 0 ? (
            <div className="space-y-6">
              {featuredMaterials.length > 0 ? (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Начать отсюда
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {featuredMaterials.map((material) => renderMaterialCard(material, true, setPreviewMaterial))}
                  </div>
                </section>
              ) : null}

              {regularMaterials.length > 0 ? (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                    <BookOpenText className="h-5 w-5 text-primary" />
                    Все материалы
                  </div>
                  <div className="grid gap-4">{regularMaterials.map((material) => renderMaterialCard(material, false, setPreviewMaterial))}</div>
                </section>
              ) : null}
            </div>
          ) : (
            <Card hover={false}>
              <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
                <BookOpenText className="h-10 w-10 text-primary/70" />
                <div className="text-xl font-semibold text-card-foreground">Материалы не найдены</div>
                <p className="max-w-md text-sm text-muted-foreground">
                  Попробуйте сбросить фильтры или изменить поисковый запрос. Когда преподаватель добавит новые материалы, они появятся здесь.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <MaterialPreviewDialog material={previewMaterial} open={Boolean(previewMaterial)} onOpenChange={(open) => (!open ? setPreviewMaterial(null) : null)} />
    </>
  )
}
