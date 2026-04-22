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
  tooltipMode?: 'hover' | 'none'
}

export function LevelProgressBar({
  totalEarned,
  levelName,
  progress,
  trackClassName,
  fillClassName,
  className,
  tooltipClassName,
  tooltipMode = 'hover',
}: LevelProgressBarProps) {
  const [open, setOpen] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  const lastClosedAtRef = useRef(0)
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
  const shouldUseTooltip = tooltipMode === 'hover' && Boolean(meta.nextLevelName)
  const ariaLabel =
    meta.nextLevelName
      ? `До уровня ${meta.nextLevelName} осталось ${meta.remainingCookies} печенек`
      : 'Максимальный уровень достигнут'

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
    // Ignore mouseenter that fires immediately after the popover closes (browser re-entry artifact)
    if (Date.now() - lastClosedAtRef.current < 80) return
    clearCloseTimeout()
    if (shouldUseTooltip) {
      setOpen(true)
    }
  }

  const handleClose = () => {
    clearCloseTimeout()
    closeTimeoutRef.current = window.setTimeout(() => {
      lastClosedAtRef.current = Date.now()
      setOpen(false)
      closeTimeoutRef.current = null
    }, 200)
  }

  const progressBar = (
    <div
      className={cn('relative h-3.5 overflow-hidden rounded-full border border-border/60 bg-secondary/80 shadow-inner', trackClassName)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={displayProgress}
      aria-label={ariaLabel}
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
  )

  if (!shouldUseTooltip) {
    return <div className={cn('block w-full', className)}>{progressBar}</div>
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
          className={cn('block w-full cursor-help focus:outline-none', className)}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          onFocus={handleOpen}
          onBlur={handleClose}
          aria-label={ariaLabel}
        >
          {progressBar}
        </button>
      </PopoverTrigger>
    </Popover>
  )
}
