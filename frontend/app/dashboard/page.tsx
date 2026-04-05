'use client'

import Link from 'next/link'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Cookie, Flame, GraduationCap, Trophy } from 'lucide-react'
import { CorgiGuide } from '@/components/corgi-guide'
import { LevelProgressBar } from '@/components/level-progress-bar'
import { Navigation } from '@/components/navigation'
import { SeasonJourney } from '@/components/season-journey'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useClaimDailyBonus, useProfileSummary, useTransactions } from '@/lib/queries'
import { getLevelTone } from '@/lib/player-progress'
import { buildCorgiMood } from '@/lib/season'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

function throwConfetti() {
  void confetti({
    particleCount: 84,
    spread: 74,
    origin: { y: 0.68 },
    colors: ['#3b82f6', '#60a5fa', '#f59e0b', '#fde68a'],
  })
}

export default function DashboardPage() {
  const { data: summary, isLoading } = useProfileSummary()
  const { data: transactions, isLoading: transactionsLoading } = useTransactions()
  const claimDailyBonus = useClaimDailyBonus()

  if (isLoading || !summary) {
    return (
      <>
        <Navigation />
        <div className="flex min-h-screen items-center justify-center page-theme-gradient">
          <div className="text-4xl">🍪</div>
        </div>
      </>
    )
  }

  const levelTone = getLevelTone(summary.profile.level_name)
  const mood = buildCorgiMood({
    totalEarned: summary.profile.total_earned,
    streak: summary.streak.current,
    rank: summary.rank,
    badgeCount: summary.profile.badge_count,
  })

  const handleClaimDailyBonus = async () => {
    try {
      const result = await claimDailyBonus.mutateAsync()
      throwConfetti()
      toast.success(`+${result.claim.total_reward} печ. добавлено в баланс`)
    } catch (error: any) {
      toast.error(error.message || 'Не удалось получить ежедневный бонус')
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-card-foreground">Добро пожаловать обратно</Badge>
              {summary.rank > 0 ? <Badge>Позиция в рейтинге: #{summary.rank}</Badge> : null}
            </div>
            <h1 className="text-4xl font-bold text-blue-900">Привет, {summary.profile.full_name}!</h1>
            <p className="max-w-3xl text-blue-600/75">
              Здесь удобно забрать бонус дня, посмотреть прогресс сезона и быстро оценить, как движется твоя игровая траектория.
            </p>
          </motion.div>

          <CorgiGuide
            eyebrow={mood.eyebrow}
            message={mood.message}
            hint="Полный профиль, тепловая карта и история достижений теперь собраны на отдельной странице профиля."
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm text-blue-100">Баланс</p>
                      <p className="text-4xl font-bold">{summary.profile.balance}</p>
                    </div>
                    <div className="text-5xl">🍪</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.04 }}>
              <Card hover={false}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Всего заработано</p>
                      <p className="mt-2 text-4xl font-bold text-card-foreground">{summary.profile.total_earned}</p>
                    </div>
                    <BarChart3 className="mt-1 h-7 w-7 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }}>
              <Card hover={false}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Уровень</p>
                      <p className="mt-2 text-2xl font-bold text-card-foreground">{summary.profile.level_name}</p>
                    </div>
                    <GraduationCap className="mt-1 h-7 w-7 text-primary" />
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Прогресс</span>
                      <span>{summary.profile.next_level_name ? `До "${summary.profile.next_level_name}"` : 'Максимум'}</span>
                    </div>
                    <LevelProgressBar
                      totalEarned={summary.profile.total_earned}
                      levelName={summary.profile.level_name}
                      progress={summary.profile.level_progress}
                      trackClassName={levelTone.track}
                      fillClassName={levelTone.fill}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}>
              <Card hover={false}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Серия входов</p>
                      <p className="mt-2 text-4xl font-bold text-card-foreground">{summary.streak.current}</p>
                    </div>
                    <Flame className="mt-1 h-7 w-7 text-primary" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    До следующего рубежа: {summary.streak.days_to_next_milestone} дн.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <Card hover={false}>
                <CardHeader>
                  <CardTitle>Сезон и активность</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-secondary/35 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Активных дней</div>
                      <div className="mt-2 text-2xl font-bold text-card-foreground">{summary.active_days_count}</div>
                    </div>
                    <div className="rounded-2xl bg-secondary/35 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Любимая категория</div>
                      <div className="mt-2 text-lg font-semibold text-card-foreground">
                        {summary.favorite_task_category?.label ?? 'Формируется'}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-secondary/35 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Бейджей</div>
                      <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-card-foreground">
                        {summary.profile.badge_count}
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>

                  <SeasonJourney totalEarned={summary.profile.total_earned} />

                  <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                    Открыть полный профиль
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <Card hover={false}>
                <CardHeader>
                  <CardTitle>Бонус дня</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[1.7rem] border border-border/60 bg-gradient-to-br from-primary/12 via-card to-secondary/40 p-5">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Текущий ритм</div>
                    <div className="mt-2 text-3xl font-bold text-card-foreground">{summary.streak.current} дней подряд</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      На 3-й день подряд серия даёт +1 печеньку, на 7-й — +2 и памятный бейдж.
                    </p>
                  </div>

                  <Button
                    onClick={handleClaimDailyBonus}
                    isLoading={claimDailyBonus.isPending}
                    disabled={!summary.streak.can_claim_today}
                    className="w-full"
                  >
                    <Cookie className="h-4 w-4" />
                    {summary.streak.can_claim_today ? 'Забрать ежедневный бонус' : 'Бонус на сегодня уже получен'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="mt-6" hover={false}>
                <CardHeader>
                  <CardTitle>Последние транзакции</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-16 animate-pulse rounded-2xl bg-secondary/50" />
                      ))}
                    </div>
                  ) : transactions && transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 6).map((transaction) => (
                        <div key={transaction.id} className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-card-foreground">{transaction.reason}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(transaction.created_at)}</p>
                            </div>
                            <div className={`text-lg font-bold ${transaction.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {transaction.amount > 0 ? '+' : ''}
                              {transaction.amount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-6 py-12 text-center text-muted-foreground">
                      Транзакции появятся после первых действий в системе.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}
