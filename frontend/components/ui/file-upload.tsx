'use client'

import { useRef } from 'react'
import { FileUp, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FileUploadProps = {
  id: string
  accept?: string
  required?: boolean
  disabled?: boolean
  selectedFile?: File | null
  placeholder?: string
  helperText?: string
  summary?: React.ReactNode
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function FileUpload({
  id,
  accept,
  required,
  disabled,
  selectedFile,
  placeholder = 'Файл не выбран',
  helperText,
  summary,
  onChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />

      <div
        className={cn(
          'flex min-h-[84px] items-center justify-between gap-4 rounded-[1.2rem] border border-border/70 bg-card px-4 py-4 shadow-sm transition-colors',
          disabled && 'cursor-not-allowed opacity-70',
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <Paperclip className="h-4 w-4 text-primary" />
            <span className="truncate">{selectedFile?.name || placeholder}</span>
          </div>
          {selectedFile ? (
            <p className="text-sm text-muted-foreground">Файл выбран и готов к загрузке.</p>
          ) : helperText ? (
            <p className="text-sm text-muted-foreground">{helperText}</p>
          ) : null}
        </div>

        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled} className="shrink-0">
          <FileUp className="h-4 w-4" />
          Выбрать файл
        </Button>
      </div>

      {summary ? <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-card-foreground">{summary}</div> : null}
    </div>
  )
}
