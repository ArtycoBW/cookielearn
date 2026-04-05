export const badgeIconOptions = [
  { value: '🌟', label: 'Звезда' },
  { value: '🔥', label: 'Огонь' },
  { value: '🧠', label: 'Идея' },
  { value: '🚀', label: 'Прорыв' },
  { value: '🎯', label: 'Точность' },
  { value: '🏅', label: 'Награда' },
  { value: '👏', label: 'Аплодисменты' },
  { value: '💡', label: 'Инсайт' },
  { value: '📚', label: 'Учёба' },
  { value: '🤝', label: 'Команда' },
] as const

export type PlayerLevelMeta = {
  name: string
  threshold: number
  nextThreshold?: number
  badge: string
  track: string
  fill: string
}

export const playerLevels: PlayerLevelMeta[] = [
  {
    name: 'Заклинатель запросов',
    threshold: 0,
    nextThreshold: 36,
    badge: 'border-slate-400/25 bg-slate-400/12 text-card-foreground',
    track: 'bg-secondary/85',
    fill: 'bg-slate-400 shadow-[0_0_18px_rgba(148,163,184,0.3)]',
  },
  {
    name: 'Исследователь кода',
    threshold: 36,
    nextThreshold: 46,
    badge: 'border-emerald-400/25 bg-emerald-400/12 text-card-foreground',
    track: 'bg-secondary/85',
    fill: 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.32)]',
  },
  {
    name: 'Разработчик фич',
    threshold: 46,
    nextThreshold: 77,
    badge: 'border-sky-400/25 bg-sky-400/12 text-card-foreground',
    track: 'bg-secondary/85',
    fill: 'bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.34)]',
  },
  {
    name: 'Легенда бэкенда',
    threshold: 77,
    nextThreshold: 91,
    badge: 'border-violet-400/25 bg-violet-400/12 text-card-foreground',
    track: 'bg-secondary/85',
    fill: 'bg-violet-400 shadow-[0_0_18px_rgba(167,139,250,0.34)]',
  },
  {
    name: 'Божество продакшена',
    threshold: 91,
    badge: 'border-amber-400/25 bg-amber-400/12 text-card-foreground',
    track: 'bg-secondary/85',
    fill: 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.34)]',
  },
]

export function getLevelTone(levelName?: string | null) {
  const level = playerLevels.find((item) => item.name === levelName)

  if (level) {
    return {
      badge: level.badge,
      track: level.track,
      fill: level.fill,
    }
  }

  return {
    badge: 'border-border/70 bg-secondary text-secondary-foreground',
    track: 'bg-secondary/80',
    fill: 'bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.3)]',
  }
}

export function getLevelProgressMeta(totalEarned: number, levelName?: string | null) {
  const resolvedLevel =
    playerLevels.find((item) => item.name === levelName) ??
    [...playerLevels].reverse().find((item) => totalEarned >= item.threshold) ??
    playerLevels[0]

  if (!resolvedLevel.nextThreshold) {
    return {
      currentLevelName: resolvedLevel.name,
      nextLevelName: null,
      remainingCookies: 0,
      currentThreshold: resolvedLevel.threshold,
      nextThreshold: null,
      rangeLabel: `От ${resolvedLevel.threshold} печенек`,
      tooltip: `Максимальный уровень достигнут: ${resolvedLevel.name}`,
    }
  }

  const nextLevel = playerLevels.find((item) => item.threshold === resolvedLevel.nextThreshold) ?? null
  const currentMax = resolvedLevel.nextThreshold - 1
  const remainingCookies = Math.max(resolvedLevel.nextThreshold - totalEarned, 0)

  return {
    currentLevelName: resolvedLevel.name,
    nextLevelName: nextLevel?.name ?? null,
    remainingCookies,
    currentThreshold: resolvedLevel.threshold,
    nextThreshold: resolvedLevel.nextThreshold,
    rangeLabel: `${resolvedLevel.threshold}–${currentMax} печенек`,
    tooltip: `До уровня "${nextLevel?.name ?? 'следующего'}" осталось ${remainingCookies} печенек.`,
  }
}
