'use client'

import { motion } from 'framer-motion'
import { LevelProgressBar } from '@/components/level-progress-bar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getLevelTone } from '@/lib/player-progress'
import { useLeaderboard, useProfile } from '@/lib/queries'

type LeaderboardViewProps = {
  title: string
  description: string
}

export function LeaderboardView({ title, description }: LeaderboardViewProps) {
  const { data: leaderboard, isLoading } = useLeaderboard()
  const { data: profile } = useProfile()

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

  return (
    <div className="min-h-screen page-theme-gradient">
      <div className="mx-auto max-w-6xl p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-2">
          <h1 className="text-4xl font-bold text-blue-900">{title} 🏆</h1>
          <p className="text-blue-600/75">{description}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card>
            <CardHeader>
              <CardTitle>Все студенты</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="h-18 animate-pulse rounded-[1.5rem] bg-secondary/70" />
                  ))}
                </div>
              ) : leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => {
                    const isCurrentUser = profile?.id === entry.id
                    const isTopThree = entry.rank <= 3
                    const levelTone = getLevelTone(entry.level_name)

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.22) }}
                        className={`rounded-[1.5rem] border px-4 py-3.5 transition-all ${
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
                              {getMedal(entry.rank)}
                            </div>

                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[1.15rem] font-semibold leading-none text-card-foreground sm:text-[1.28rem]">
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
                                  tooltipClassName={isCurrentUser ? 'border-primary/20 bg-card/95 text-card-foreground' : ''}
                                />
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
                            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Всего заработано</div>
                            <div className="mt-1 flex items-center justify-end gap-1.5 text-[1.65rem] font-bold text-card-foreground">
                              <span>{entry.total_earned}</span>
                              <span>🍪</span>
                            </div>
                            <div className="mt-1 text-[12px] text-muted-foreground">Текущий баланс: {entry.balance} 🍪</div>
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
