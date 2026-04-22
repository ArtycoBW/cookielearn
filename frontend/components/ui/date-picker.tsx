'use client'

import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  value?: Date
  onChange: (date?: Date) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({ value, onChange, placeholder = 'Выберите дату', disabled, className }: DatePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-11 w-full justify-between rounded-xl border-border bg-card px-3 text-left font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground',
              !value && 'text-muted-foreground',
            )}
          >
            <span>{value ? format(value, 'dd MMMM yyyy', { locale: ru }) : placeholder}</span>
            <CalendarIcon className="h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-[1.8rem] border border-border/70 p-2 shadow-[0_28px_70px_-36px_rgba(15,23,42,0.42)]">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
        </PopoverContent>
      </Popover>

      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(undefined)}
          className="h-11 w-11 shrink-0 rounded-xl border border-border bg-card px-0 text-muted-foreground hover:text-foreground"
          aria-label="Очистить дату"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
