'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { LevelProgressBar } from '@/components/level-progress-bar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getLevelProgressMeta, getLevelTone } from '@/lib/player-progress'
import { useLeaderboard, useProfile } from '@/lib/queries'

type LeaderboardViewProps = {
  title: string
  description: string
}

export function LeaderboardView({ title, description }: LeaderboardViewProps) {
  const { data: leaderboard, isLoading } = useLeaderboard()
  const { data: profile } = useProfile()
  const [sortMode, setSortMode] = useState<'total' | 'balance'>('total')

  const getMedal = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `${rank}.`
    }
  }

  const sortedLeaderboard = useMemo(() => {
    const list = Array.isArray(leaderboard) ? [...leaderboard] : []

    list.sort((left, right) => {
      if (sortMode === 'balance') {
        return (
          right.balance - left.balance ||
          right.total_earned - left.total_earned ||
          right.activity_score - left.activity_score ||
          left.full_name.localeCompare(right.full_name, 'ru')
        )
      }

      return (
        right.total_earned - left.total_earned ||
        right.activity_score - left.activity_score ||
        right.balance - left.balance ||
        left.full_name.localeCompare(right.full_name, 'ru')
      )
    })

    return list
  }, [leaderboard, sortMode])

  return (
    <div className="min-h-screen page-theme-gradient">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-blue-900 sm:text-4xl">{title} 🏆</h1>
          <p className="text-blue-600/75">{description}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Все студенты</CardTitle>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSortMode('total')}
                  className={`min-w-0 flex-1 rounded-full border px-3 py-1.5 text-center text-sm font-semibold leading-5 transition-colors sm:flex-none ${
                    sortMode === 'total'
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/70 bg-card/75 text-muted-foreground hover:bg-secondary/40'
                  }`}
                >
                  По общему заработку
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('balance')}
                  className={`min-w-0 flex-1 rounded-full border px-3 py-1.5 text-center text-sm font-semibold leading-5 transition-colors sm:flex-none ${
                    sortMode === 'balance'
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/70 bg-card/75 text-muted-foreground hover:bg-secondary/40'
                  }`}
                >
                  По текущему балансу
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="h-18 animate-pulse rounded-[1.5rem] bg-secondary/70" />
                  ))}
                </div>
              ) : sortedLeaderboard.length > 0 ? (
                <div className="space-y-3">
                  {sortedLeaderboard.map((entry, index) => {
                    const isCurrentUser = profile?.id === entry.id
                    const displayRank = index + 1
                    const isTopThree = displayRank <= 3
                    const levelTone = getLevelTone(entry.level_name)
                    const levelProgressMeta = getLevelProgressMeta(entry.total_earned, entry.level_name)
                    const primaryValue = sortMode === 'total' ? entry.total_earned : entry.balance
                    const secondaryLabel =
                      sortMode === 'total'
                        ? `Текущий баланс: ${entry.balance} 🍪`
                        : `Всего заработано: ${entry.total_earned} 🍪`

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.22) }}
                        className={`rounded-[1.5rem] border px-3 py-3.5 transition-all sm:px-4 ${
                          isCurrentUser
                            ? 'border-primary/35 bg-card/95 shadow-[0_24px_60px_-42px_hsl(var(--primary)/0.42)] ring-1 ring-primary/15'
                            : isTopThree
                              ? 'border-border/70 bg-card/90 shadow-[0_20px_44px_-36px_hsl(var(--primary)/0.22)]'
                              : 'border-border/60 bg-card/72 hover:bg-card/90'
                        }`}
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px] lg:items-center">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className={`min-w-[2.2rem] pt-0.5 text-center text-[1.15rem] font-bold ${isCurrentUser || isTopThree ? 'text-primary' : 'text-card-foreground'}`}>
                              {getMedal(displayRank)}
                            </div>

                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[1.15rem] font-semibold text-card-foreground sm:text-[1.28rem]">
                                  {entry.full_name}
                                </p>
                                {isCurrentUser && <span className="text-[11px] font-medium text-primary/80">(Вы)</span>}
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                    isCurrentUser ? `${levelTone.badge} ring-1 ring-primary/15` : levelTone.badge
                                  }`}
                                >
                                  {entry.level_name}
                                </span>
                                {entry.group_name && (
                                  <Badge
                                    variant="default"
                                    className={isCurrentUser ? 'border-primary/20 bg-primary/10 text-card-foreground' : 'text-[11px]'}
                                  >
                                    {entry.group_name}
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="text-[12px] font-medium text-muted-foreground">Прогресс уровня</div>
                                <LevelProgressBar
                                  totalEarned={entry.total_earned}
                                  levelName={entry.level_name}
                                  progress={entry.level_progress}
                                  trackClassName={isCurrentUser ? `${levelTone.track} ring-1 ring-primary/15` : levelTone.track}
                                  fillClassName={levelTone.fill}
                                  tooltipMode="none"
                                  tooltipClassName={isCurrentUser ? 'border-primary/20 bg-card/95 text-card-foreground' : ''}
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                  <span>{levelProgressMeta.rangeLabel}</span>
                                  <span>
                                    {levelProgressMeta.nextLevelName
                                      ? `До «${levelProgressMeta.nextLevelName}»: ${levelProgressMeta.remainingCookies} 🍪`
                                      : 'Максимальный уровень'}
                                  </span>
                                </div>
                              </div>

                              {entry.badges && entry.badges.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {entry.badges.slice(0, 3).map((badge) => (
                                    <span
                                      key={badge.id}
                                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                                        isCurrentUser ? 'border-primary/20 bg-primary/10 text-card-foreground' : 'border-border/60 bg-card/75 text-card-foreground'
                                      }`}
                                      title={badge.reason}
                                    >
                                      <span>{badge.icon}</span>
                                      <span>{badge.title}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            className={`shrink-0 rounded-[1rem] border px-3 py-2.5 text-right backdrop-blur-sm ${
                              isCurrentUser ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-secondary/30'
                            }`}
                          >
                            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {sortMode === 'total' ? 'Всего заработано' : 'Текущий баланс'}
                            </div>
                            <div className="mt-1 flex items-center justify-end gap-1.5 text-[1.65rem] font-bold text-card-foreground">
                              <span>{primaryValue}</span>
                              <span>🍪</span>
                            </div>
                            <div className="mt-1 text-[12px] text-muted-foreground">{secondaryLabel}</div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-20 text-center text-muted-foreground">
                  <div className="mb-4 text-6xl">🏆</div>
                  <p className="text-xl">Рейтинг пока пуст</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
