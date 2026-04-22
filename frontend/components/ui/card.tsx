import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[1.35rem] border border-border/80 bg-card/95 p-6 text-card-foreground shadow-[0_24px_60px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm transition-all duration-200',
          hover && 'hover:-translate-y-1 hover:shadow-[0_34px_80px_-36px_hsl(var(--primary)/0.45)]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mb-5 space-y-1.5', className)} {...props} />
))

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-xl font-bold text-card-foreground', className)} {...props} />
))

CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm leading-6 text-muted-foreground', className)} {...props} />
))

CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))

CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mt-5 border-t border-border/70 pt-5', className)} {...props} />
))

CardFooter.displayName = 'CardFooter'
