'use client'

import { useEffect, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getLevelProgressMeta } from '@/lib/player-progress'
import { cn } from '@/lib/utils'

type LevelProgressBarProps = {
  totalEarned: number
  levelName?: string | null
  progress: number
  trackClassName: string
  fillClassName: string
  className?: string
  tooltipClassName?: string
}

export function LevelProgressBar({
  totalEarned,
  levelName,
  progress,
  trackClassName,
  fillClassName,
  className,
  tooltipClassName,
}: LevelProgressBarProps) {
  const [open, setOpen] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  const meta = getLevelProgressMeta(totalEarned, levelName)
  const resolvedProgress =
    meta.nextThreshold && meta.nextThreshold > meta.currentThreshold
      ? Math.max(
          0,
          Math.min(
            100,
            ((totalEarned - meta.currentThreshold) * 100) / (meta.nextThreshold - meta.currentThreshold),
          ),
        )
      : progress
  const displayProgress = Math.round(resolvedProgress)

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearCloseTimeout()
    }
  }, [])

  const handleOpen = () => {
    clearCloseTimeout()
    if (meta.nextLevelName) {
      setOpen(true)
    }
  }

  const handleClose = () => {
    clearCloseTimeout()
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimeoutRef.current = null
    }, 120)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        clearCloseTimeout()
        setOpen(nextOpen)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('block w-full focus:outline-none', meta.nextLevelName ? 'cursor-help' : 'cursor-default', className)}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          onFocus={handleOpen}
          onBlur={handleClose}
          aria-label={
            meta.nextLevelName
              ? `До уровня ${meta.nextLevelName} осталось ${meta.remainingCookies} печенек`
              : 'Максимальный уровень достигнут'
          }
        >
          <div
            className={cn('relative h-3.5 overflow-hidden rounded-full border border-border/60 bg-secondary/80 shadow-inner', trackClassName)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={displayProgress}
          >
            <div
              className={cn('h-full rounded-full transition-[width,box-shadow] duration-300', fillClassName)}
              style={{
                width: `${resolvedProgress}%`,
                minWidth: resolvedProgress > 0 ? '1rem' : '0rem',
                background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, rgb(var(--brand-400-rgb)) 100%)',
                boxShadow: '0 0 0 1px rgb(255 255 255 / 0.08) inset, 0 8px 18px -10px hsl(var(--primary) / 0.95)',
              }}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_55%)]" />
          </div>
        </button>
      </PopoverTrigger>

      {meta.nextLevelName ? (
        <PopoverContent
          side="top"
          align="start"
          sideOffset={4}
          className={cn('w-auto max-w-[280px]', tooltipClassName)}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          <p className="text-sm font-semibold">До «{meta.nextLevelName}» осталось {meta.remainingCookies} 🍪</p>
        </PopoverContent>
      ) : null}
    </Popover>
  )
}
