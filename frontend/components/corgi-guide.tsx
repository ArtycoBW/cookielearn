'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { CorgiAvatar } from '@/components/corgi-avatar'
import { cn } from '@/lib/utils'

type CorgiGuideProps = {
  eyebrow: string
  message: string
  hint?: string
  className?: string
}

export function CorgiGuide({ eyebrow, message, hint, className }: CorgiGuideProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-[1.9rem] border border-border/60 bg-card/90 p-5 shadow-[0_28px_80px_-50px_hsl(var(--primary)/0.48)]',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary/70 to-primary/0" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <motion.div
          animate={{ rotate: [0, -6, 6, 0], y: [0, -2, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          className="shrink-0"
        >
          <CorgiAvatar size="md" priority />
        </motion.div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Корги Дуров на связи</span>
          </div>

          <p className="max-w-3xl text-[15px] leading-7 text-card-foreground">{message}</p>

          {hint ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">{hint}</div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
