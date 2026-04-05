'use client'

import { motion } from 'framer-motion'
import { ActivityHeatmapDay } from '@/lib/types'
import { cn } from '@/lib/utils'

type ActivityHeatmapProps = {
  days: ActivityHeatmapDay[]
  className?: string
}

const intensityStyles = {
  0: 'bg-secondary/60 border-border/40',
  1: 'bg-primary/15 border-primary/12',
  2: 'bg-primary/30 border-primary/18',
  3: 'bg-primary/55 border-primary/28',
  4: 'bg-primary border-primary/50 shadow-[0_0_18px_hsl(var(--primary)/0.32)]',
} satisfies Record<number, string>

function getIntensityStyle(level: number) {
  const normalized = Math.min(Math.max(level, 0), 4) as keyof typeof intensityStyles
  return intensityStyles[normalized]
}

function buildMonthMarkers(days: ActivityHeatmapDay[]) {
  return days.reduce<Array<{ label: string; index: number }>>((markers, day, index) => {
    const date = new Date(`${day.date}T00:00:00`)
    const label = new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date).replace('.', '')

    if (index === 0 || date.getDate() === 1) {
      markers.push({ label, index })
    }

    return markers
  }, [])
}

export function ActivityHeatmap({ days, className }: ActivityHeatmapProps) {
  const monthMarkers = buildMonthMarkers(days)

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:justify-start sm:gap-x-6">
        {monthMarkers.slice(-6).map((marker) => (
          <span key={`${marker.label}-${marker.index}`} className="capitalize">
            {marker.label}
          </span>
        ))}
      </div>

      <div className="rounded-[1.75rem] border border-border/60 bg-secondary/10 p-3 shadow-inner sm:p-4">
        <div className="flex justify-center">
          <div className="grid grid-flow-col grid-rows-7 gap-1 sm:gap-1.5">
            {days.map((day, index) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.003, 0.22) }}
                title={`${new Intl.DateTimeFormat('ru-RU', {
                  day: '2-digit',
                  month: 'long',
                }).format(new Date(`${day.date}T00:00:00`))}: ${day.count} активн.`}
                className={cn(
                  'h-3.5 w-3.5 rounded-[0.45rem] border transition-transform hover:-translate-y-0.5 sm:h-4 sm:w-4 lg:h-[18px] lg:w-[18px]',
                  getIntensityStyle(day.intensity),
                  day.is_today && 'ring-2 ring-primary/35 ring-offset-2 ring-offset-background',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>Меньше</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={cn('h-4 w-4 rounded-[0.35rem] border', getIntensityStyle(level))} />
          ))}
          <span>Больше</span>
        </div>

        <span>Сегодня выделено обводкой</span>
      </div>
    </div>
  )
}
