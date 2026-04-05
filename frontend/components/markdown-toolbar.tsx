'use client'

import { type MutableRefObject, useCallback } from 'react'
import { Bold, Italic, Link2, List, ListOrdered } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MarkdownToolbarProps = {
  value: string
  onChange: (value: string) => void
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  className?: string
}

type TransformResult = {
  text: string
  selectionStart: number
  selectionEnd: number
}

function buildPrefixedList(selected: string, fallback: string, formatter: (line: string, index: number) => string): TransformResult {
  if (!selected.trim()) {
    return {
      text: fallback,
      selectionStart: 0,
      selectionEnd: fallback.length,
    }
  }

  const formatted = selected
    .split('\n')
    .map((line, index) => {
      if (!line.trim()) {
        return line
      }

      return formatter(line.replace(/^\s*([-*]\s+|\d+\.\s+)/, '').trim(), index)
    })
    .join('\n')

  return {
    text: formatted,
    selectionStart: 0,
    selectionEnd: formatted.length,
  }
}

export function MarkdownToolbar({ value, onChange, textareaRef, className }: MarkdownToolbarProps) {
  const applyTransform = useCallback(
    (transform: (selected: string) => TransformResult) => {
      const textarea = textareaRef.current
      const start = textarea?.selectionStart ?? value.length
      const end = textarea?.selectionEnd ?? value.length
      const selected = value.slice(start, end)

      const result = transform(selected)
      const nextValue = `${value.slice(0, start)}${result.text}${value.slice(end)}`
      onChange(nextValue)

      requestAnimationFrame(() => {
        const nextTextarea = textareaRef.current
        if (!nextTextarea) {
          return
        }

        nextTextarea.focus()
        nextTextarea.setSelectionRange(start + result.selectionStart, start + result.selectionEnd)
      })
    },
    [onChange, textareaRef, value],
  )

  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-secondary/20 p-2', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          applyTransform((selected) => {
            const content = selected || 'жирный текст'
            return {
              text: `**${content}**`,
              selectionStart: 2,
              selectionEnd: 2 + content.length,
            }
          })
        }
      >
        <Bold className="h-4 w-4" />
        Жирный
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          applyTransform((selected) => {
            const content = selected || 'курсив'
            return {
              text: `*${content}*`,
              selectionStart: 1,
              selectionEnd: 1 + content.length,
            }
          })
        }
      >
        <Italic className="h-4 w-4" />
        Курсив
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => applyTransform((selected) => buildPrefixedList(selected, '- Первый пункт\n- Второй пункт', (line) => `- ${line}`))}
      >
        <List className="h-4 w-4" />
        Список
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          applyTransform((selected) => buildPrefixedList(selected, '1. Первый шаг\n2. Второй шаг', (line, index) => `${index + 1}. ${line}`))
        }
      >
        <ListOrdered className="h-4 w-4" />
        Шаги
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          applyTransform((selected) => {
            const content = selected || 'текст ссылки'
            return {
              text: `[${content}](https://example.com)`,
              selectionStart: 1,
              selectionEnd: 1 + content.length,
            }
          })
        }
      >
        <Link2 className="h-4 w-4" />
        Ссылка
      </Button>
    </div>
  )
}
