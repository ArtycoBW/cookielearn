'use client'

import { Download, ExternalLink, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { describeMaterialFile, resolveMaterialFormatLabel, resolveMaterialPreview } from '@/lib/materials'
import type { Material } from '@/lib/types'

type MaterialPreviewDialogProps = {
  material: Material | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MaterialPreviewDialog({ material, open, onOpenChange }: MaterialPreviewDialogProps) {
  if (!material) {
    return null
  }

  const preview = resolveMaterialPreview(material)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,960px)] w-[min(96vw,1180px)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="pr-10 text-2xl">{material.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 break-all sm:break-normal">
            <span>{resolveMaterialFormatLabel(material.format)}</span>
            <span className="text-border">/</span>
            <span>{describeMaterialFile(material)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 bg-secondary/20 p-3 sm:p-4">
          {preview.mode === 'iframe' ? (
            <iframe
              src={preview.url}
              title={material.title}
              className="h-full min-h-[320px] w-full rounded-[1.2rem] border border-border/70 bg-background"
            />
          ) : preview.mode === 'office' ? (
            <iframe
              src={preview.url}
              title={material.title}
              className="h-full min-h-[320px] w-full rounded-[1.2rem] border border-border/70 bg-background"
            />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 rounded-[1.2rem] border border-dashed border-border/70 bg-card px-6 text-center sm:px-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-card-foreground">Предпросмотр для этого формата недоступен</h3>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Для этого файла браузер не умеет показывать встроенный preview. Его всё равно можно открыть в новой вкладке или скачать из окна ниже.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-3 border-t border-border/70 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground">{material.description || 'Документ из библиотеки курса.'}</div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <a href={material.url} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline">
                <ExternalLink className="h-4 w-4" />
                Открыть отдельно
              </Button>
            </a>
            <a href={material.url} download={material.file_name ?? true}>
              <Button type="button">
                <Download className="h-4 w-4" />
                Скачать
              </Button>
            </a>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
