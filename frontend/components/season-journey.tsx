'use client'

import { motion } from 'framer-motion'
import { Flag, LockKeyhole, Map } from 'lucide-react'
import { getCurrentSeasonChapter, seasonChapters } from '@/lib/season'
import { cn } from '@/lib/utils'

type SeasonJourneyProps = {
  totalEarned: number
  className?: string
}

export function SeasonJourney({ totalEarned, className }: SeasonJourneyProps) {
  const season = getCurrentSeasonChapter(totalEarned)

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/18 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <Map className="h-3.5 w-3.5" />
            Сюжет сезона
          </div>
          <h3 className="mt-3 text-2xl font-bold text-card-foreground">{season.current.subtitle}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{season.current.description}</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
          <div className="font-semibold text-card-foreground">{Math.round(season.progress)}% до следующей главы</div>
          <div className="mt-1">{season.next ? `Следом: ${season.next.subtitle}` : 'Финальная глава уже открыта'}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {seasonChapters.map((chapter, index) => {
          const isCompleted = index < season.currentIndex
          const isCurrent = index === season.currentIndex
          const isLocked = index > season.currentIndex

          return (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * index }}
              className={cn(
                'relative overflow-hidden rounded-[1.45rem] border p-4 shadow-sm',
                isCurrent && 'border-primary/28 bg-gradient-to-br from-primary/12 via-card to-secondary/40',
                isCompleted && 'border-emerald-300/30 bg-emerald-500/8',
                isLocked && 'border-border/50 bg-secondary/22',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{chapter.title}</div>
                  <div className="mt-2 text-lg font-semibold text-card-foreground">{chapter.subtitle}</div>
                </div>
                <div
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-full border text-card-foreground',
                    isCompleted && 'border-emerald-300/40 bg-emerald-400/18',
                    isCurrent && 'border-primary/30 bg-primary/14',
                    isLocked && 'border-border/60 bg-card/55 text-muted-foreground',
                  )}
                >
                  {isLocked ? <LockKeyhole className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">{chapter.description}</p>

              <div className="mt-4 text-xs font-medium text-muted-foreground">
                {isCompleted && 'Пройдено'}
                {isCurrent && `Сейчас открыто от ${chapter.threshold} печенек`}
                {isLocked && `Откроется от ${chapter.threshold} печенек`}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
