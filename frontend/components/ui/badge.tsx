import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'border border-border/70 bg-secondary text-secondary-foreground',
      success: 'border border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
      warning: 'border border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300',
      danger: 'border border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-300',
    }

    return (
      <span
        ref={ref}
        className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', variants[variant], className)}
        {...props}
      />
    )
  },
)

Badge.displayName = 'Badge'
