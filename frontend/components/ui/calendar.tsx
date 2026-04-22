'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { ru } from 'date-fns/locale'

import { cn } from '@/lib/utils'

export type CalendarProps = DayPickerProps

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ru}
      className={cn('rounded-[1.6rem] bg-popover p-3', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row sm:gap-6',
        month: 'space-y-4',
        caption: 'relative flex items-center justify-center px-8 pt-1',
        caption_label: 'text-sm font-semibold text-foreground',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
        button_next:
          'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
        month_caption: 'flex h-8 items-center justify-center',
        weekdays: 'grid grid-cols-7 gap-1',
        weekday: 'text-center text-[0.8rem] font-medium text-muted-foreground',
        week: 'grid grid-cols-7 gap-1',
        day: 'h-10 w-10 p-0 text-sm',
        day_button:
          'h-10 w-10 rounded-xl border border-transparent font-medium text-foreground transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'border border-primary/35 bg-primary/10 text-foreground',
        outside: 'text-muted-foreground/50 opacity-70',
        disabled: 'text-muted-foreground/35 opacity-40',
        hidden: 'invisible',
        range_middle: 'bg-accent text-accent-foreground',
        range_end: 'bg-primary text-primary-foreground',
        range_start: 'bg-primary text-primary-foreground',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('h-4 w-4', iconClassName)} {...iconProps} />
          ) : (
            <ChevronRight className={cn('h-4 w-4', iconClassName)} {...iconProps} />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
