'use client'

import { useMemo } from 'react'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import {
  Activity,
  Award,
  BadgeCheck,
  Cookie,
  Flame,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { ActivityHeatmap } from '@/components/activity-heatmap'
import { CorgiGuide } from '@/components/corgi-guide'
import { LevelProgressBar } from '@/components/level-progress-bar'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useBuyRandomBonus, useClaimDailyBonus, useProfileSummary } from '@/lib/queries'
import { getLevelTone } from '@/lib/player-progress'
import { buildCorgiMood } from '@/lib/season'
import { resolveTaskTypeLabel } from '@/lib/task-types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

function getInitials(name?: string | null) {
  if (!name) {
    return 'CL'
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function fireCookies() {
  void confetti({
    particleCount: 90,
    spread: 80,
    origin: { y: 0.65 },
    colors: ['#3b82f6', '#60a5fa', '#f59e0b', '#fbbf24'],
  })
}

function resolveActivitySubtitle(value?: string | null) {
  switch (value) {
    case 'daily_bonus':
      return 'Ежедневный бонус'
    case 'streak_bonus':
      return 'Бонус за серию'
    case 'manual':
      return 'Начисление'
    case 'purchase':
      return 'Покупка'
    case 'random_bonus':
      return 'Сундук удачи'
    case 'task_reward':
      return 'Награда за задание'
    case 'survey_reward':
      return 'Награда за анкету'
    default:
      return resolveTaskTypeLabel(value)
  }
}

export default function ProfilePage() {
  const { data: summary, isLoading } = useProfileSummary()
  const claimDailyBonus = useClaimDailyBonus()
  const buyRandomBonus = useBuyRandomBonus()

  const mood = useMemo(() => {
    if (!summary?.profile) {
      return null
    }

    return buildCorgiMood({
      totalEarned: summary.profile.total_earned,
      streak: summary.streak.current,
      rank: summary.rank,
      badgeCount: summary.profile.badge_count,
    })
  }, [summary])

  const handleClaimDailyBonus = async () => {
    try {
      const result = await claimDailyBonus.mutateAsync()
      fireCookies()

      const badgeTitle = result.claim.badge?.title
      const total = result.claim.total_reward
      toast.success(
        badgeTitle
          ? `+${total} печ. и новый бейдж: ${badgeTitle}`
          : `Ежедневный бонус получен: +${total} печ.`,
      )
    } catch (error: any) {
      toast.error(error.message || 'Не удалось получить ежедневный бонус')
    }
  }

  const handleLuckyBonus = async () => {
    try {
      const result = await buyRandomBonus.mutateAsync({ cost: 3 })
      fireCookies()
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.message || 'Не удалось открыть сундук')
    }
  }

  if (isLoading || !summary) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen page-theme-gradient">
          <div className="mx-auto max-w-7xl space-y-6 p-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-[2rem] bg-secondary/70" />
            ))}
          </div>
        </div>
      </>
    )
  }

  const levelTone = getLevelTone(summary.profile.level_name)
  const initials = getInitials(summary.profile.full_name)
  const activityDays = summary.activity_days ?? []
  const recentActivities = summary.recent_activities ?? []
  const recentCertificates = summary.recent_certificates ?? []
  const profileBadges = summary.profile.badges ?? []

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <motion.section initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 text-white">
              <CardContent className="p-6 sm:p-8">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:items-center">
                  <div className="flex min-w-0 items-start gap-5">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.8rem] border border-white/25 bg-white/12 text-3xl font-bold shadow-inner backdrop-blur-sm">
                      {initials}
                    </div>

                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${levelTone.badge} border-white/20 bg-white/15 text-white`}>{summary.profile.level_name}</Badge>
                        {summary.rank > 0 ? <Badge className="border-white/20 bg-white/12 text-white">Топ #{summary.rank}</Badge> : null}
                        {summary.profile.group_name ? <Badge className="border-white/20 bg-white/12 text-white">{summary.profile.group_name}</Badge> : null}
                      </div>

                      <div>
                        <h1 className="text-4xl font-bold leading-tight">{summary.profile.full_name}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50/85">
                          Игровой профиль показывает темп семестра: уровень, серию входов, любимые активности и свежие следы на карте прогресса.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.3rem] border border-white/18 bg-white/12 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.14em] text-blue-50/70">Баланс</div>
                          <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
                            <span>{summary.profile.balance}</span>
                            <span>🍪</span>
                          </div>
                        </div>

                        <div className="rounded-[1.3rem] border border-white/18 bg-white/12 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.14em] text-blue-50/70">Серия</div>
                          <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
                            <span>{summary.streak.current}</span>
                            <Flame className="h-6 w-6" />
                          </div>
                        </div>

                        <div className="rounded-[1.3rem] border border-white/18 bg-white/12 px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.14em] text-blue-50/70">Бейджи</div>
                          <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
                            <span>{summary.profile.badge_count}</span>
                            <BadgeCheck className="h-6 w-6" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.7rem] border border-white/18 bg-blue-950/18 p-5 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-blue-50/75">Прогресс уровня</div>
                        <div className="mt-2 text-xl font-semibold text-white">{summary.profile.total_earned} печенек заработано</div>
                      </div>
                      <Trophy className="h-7 w-7 text-blue-50/90" />
                    </div>

                    <div className="mt-5">
                      <LevelProgressBar
                        totalEarned={summary.profile.total_earned}
                        levelName={summary.profile.level_name}
                        progress={summary.profile.level_progress}
                        trackClassName="bg-white/20"
                        fillClassName="bg-white shadow-[0_0_20px_rgba(255,255,255,0.35)]"
                        tooltipClassName="border-white/20 bg-blue-950/90 text-white"
                      />
                    </div>

                    {summary.profile.next_level_name ? (
                      <p className="mt-3 text-sm text-blue-50/80">Следующая цель: {summary.profile.next_level_name}</p>
                    ) : (
                      <p className="mt-3 text-sm text-blue-50/80">Максимальный уровень уже открыт.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {mood ? (
            <CorgiGuide
              eyebrow={mood.eyebrow}
              message={mood.message}
              hint={
                summary.favorite_task_category
                  ? `Любимая категория сейчас: ${summary.favorite_task_category.label}. Именно туда логично подкинуть ещё одну сильную задачу.`
                  : 'Как только появятся первые ответы по заданиям, я соберу любимую категорию и покажу её прямо здесь.'
              }
            />
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <Card hover={false}>
              <CardHeader>
                <CardTitle>Тепловая карта активности</CardTitle>
                <CardDescription>
                  Последние {activityDays.length} дней. Чем насыщеннее ячейка, тем больше действий за день.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-secondary/35 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Активных дней</div>
                    <div className="mt-2 text-2xl font-bold text-card-foreground">{summary.active_days_count}</div>
                  </div>
                  <div className="rounded-2xl bg-secondary/35 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Лучшая серия</div>
                    <div className="mt-2 text-2xl font-bold text-card-foreground">{summary.streak.longest} дней</div>
                  </div>
                  <div className="rounded-2xl bg-secondary/35 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Любимый режим</div>
                    <div className="mt-2 text-lg font-semibold text-card-foreground">
                      {summary.favorite_task_category?.label ?? 'Появится после первых ответов'}
                    </div>
                  </div>
                </div>

                <ActivityHeatmap days={activityDays} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ежедневная серия</CardTitle>
                  <CardDescription>
                    На 3-й день подряд даём +1 печеньку, на 7-й и дальше по недельным рубежам — усиленный бонус и памятный бейдж.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Сейчас подряд</div>
                      <div className="mt-2 flex items-center gap-2 text-3xl font-bold text-card-foreground">
                        {summary.streak.current}
                        <Flame className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Следующий рубеж</div>
                      <div className="mt-2 text-3xl font-bold text-card-foreground">{summary.streak.next_milestone}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Осталось {summary.streak.days_to_next_milestone} дн.
                      </div>
                    </div>
                  </div>

                  {summary.streak.last_claimed_at ? (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                      Последний бонус: {formatDate(summary.streak.last_claimed_at)}
                    </div>
                  ) : null}

                  <Button
                    onClick={handleClaimDailyBonus}
                    isLoading={claimDailyBonus.isPending}
                    disabled={!summary.streak.can_claim_today}
                    className="w-full"
                  >
                    <Cookie className="h-4 w-4" />
                    {summary.streak.can_claim_today ? 'Забрать ежедневный бонус' : 'Сегодня бонус уже получен'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Сундук Корги Дурова</CardTitle>
                  <CardDescription>
                    Лёгкий режим неожиданности: открываешь сундук за 3 печеньки и получаешь случайный бонус от 1 до 5.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[1.6rem] border border-border/60 bg-gradient-to-br from-primary/12 via-card to-secondary/35 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Риск и награда</div>
                        <div className="mt-2 text-2xl font-bold text-card-foreground">1–5 печенек</div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Если хочется добавить игре чуть больше азарта, сундук как раз для этого.
                        </p>
                      </div>
                      <div className="text-5xl">🎁</div>
                    </div>
                  </div>

                  <Button
                    onClick={handleLuckyBonus}
                    isLoading={buyRandomBonus.isPending}
                    disabled={summary.profile.balance < 3}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4" />
                    {summary.profile.balance < 3 ? 'Нужно минимум 3 печеньки' : 'Открыть сундук за 3 печеньки'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <Card hover={false}>
              <CardHeader>
                <CardTitle>Последние активности</CardTitle>
                <CardDescription>Награды, ответы и другие действия, которые двигают тебя по сезону.</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivities.map((activity) => (
                      <div key={`${activity.type}-${activity.id}`} className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-card-foreground">{activity.title}</div>
                              {activity.subtitle ? <Badge>{resolveActivitySubtitle(activity.subtitle)}</Badge> : null}
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">{formatDateTime(activity.created_at)}</div>
                          </div>

                          {activity.amount != null ? (
                            <div className={`text-lg font-bold ${activity.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {activity.amount > 0 ? '+' : ''}
                              {activity.amount}
                            </div>
                          ) : (
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Activity className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-6 py-14 text-center text-muted-foreground">
                    История появится после первых действий в системе.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card hover={false}>
              <CardHeader>
                <CardTitle>Сертификаты и достижения</CardTitle>
                <CardDescription>Недавние покупки и уже собранные бейджи в одном месте.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                    <Award className="h-4 w-4 text-primary" />
                    Бейджи
                  </div>

                  {profileBadges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profileBadges.map((badge) => (
                        <div key={badge.id} className="rounded-full border border-border/60 bg-secondary/25 px-3 py-1.5 text-sm text-card-foreground">
                          <span className="mr-2">{badge.icon}</span>
                          {badge.title}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-4 text-sm text-muted-foreground">
                      Бейджей пока нет, но серия входов и сильные ответы уже близко.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                    <Award className="h-4 w-4 text-primary" />
                    Последние сертификаты
                  </div>

                  {recentCertificates.length > 0 ? (
                    <div className="space-y-3">
                      {recentCertificates.map((purchase) => (
                        <div key={purchase.id} className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                          <div className="font-semibold text-card-foreground">{purchase.certificate?.title ?? 'Сертификат'}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Куплен {formatDate(purchase.purchased_at)} за {purchase.price_paid} печенек
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-4 text-sm text-muted-foreground">
                      После первой покупки сертификаты будут собираться здесь.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
