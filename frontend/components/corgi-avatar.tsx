import Image from 'next/image'
import { cn } from '@/lib/utils'

type CorgiAvatarProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  imageClassName?: string
  priority?: boolean
}

const sizeClassNames: Record<NonNullable<CorgiAvatarProps['size']>, string> = {
  sm: 'h-14 w-14 rounded-2xl',
  md: 'h-20 w-20 rounded-[1.6rem]',
  lg: 'h-24 w-24 rounded-[1.9rem]',
}

export function CorgiAvatar({ size = 'md', className, imageClassName, priority = false }: CorgiAvatarProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border border-primary/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,255,255,0.84))] shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.5)]',
        sizeClassNames[size],
        className,
      )}
    >
      <Image
        src="/icons/corgi.png"
        alt="Корги Дуров"
        fill
        priority={priority}
        sizes={size === 'lg' ? '96px' : size === 'md' ? '80px' : '56px'}
        className={cn('object-cover', imageClassName)}
      />
    </div>
  )
}
