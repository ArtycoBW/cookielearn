'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import {
  Activity,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Cookie,
  Flame,
  GraduationCap,
  Sparkles,
  Ticket,
  Trophy,
  XCircle,
} from 'lucide-react'
import { ActivityHeatmap } from '@/components/activity-heatmap'
import { CorgiGuide } from '@/components/corgi-guide'
import { LevelProgressBar } from '@/components/level-progress-bar'
import { Navigation } from '@/components/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBuyRandomBonus, useClaimDailyBonus, useMyCertificates, useProfileSummary, useTransactions, useUseCertificate } from '@/lib/queries'
import { getLevelProgressMeta, getLevelTone } from '@/lib/player-progress'
import { buildCorgiMood } from '@/lib/season'
import { studentHubTabRoutes, type StudentHubTab } from '@/lib/student-hub'
import type { Purchase } from '@/lib/types'
import { resolveTaskTypeLabel } from '@/lib/task-types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type HistoryFilters = {
  category: string
  amount: string
  search: string
}

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

function launchConfetti(colors: string[]) {
  void confetti({
    particleCount: 84,
    spread: 78,
    origin: { y: 0.66 },
    colors,
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
      return 'Случайный бонус'
    case 'task_reward':
      return 'Награда за задание'
    case 'survey_reward':
      return 'Награда за анкету'
    case 'self_belief_quiz':
      return 'Верю в себя'
    default:
      return resolveTaskTypeLabel(value)
  }
}

function getCertificateStatusBadge(status: Purchase['status']) {
  switch (status) {
    case 'active':
      return <Badge variant="success">Активен</Badge>
    case 'used':
      return <Badge>Использован</Badge>
    case 'expired':
      return <Badge variant="danger">Истек</Badge>
    default:
      return null
  }
}

function getCertificateStatusIcon(status: Purchase['status']) {
  switch (status) {
    case 'active':
      return <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
    case 'used':
      return <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
    case 'expired':
      return <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-300" />
    default:
      return null
  }
}

function getTransactionCategoryLabel(category?: string | null) {
  switch (category) {
    case 'daily_bonus':
      return 'Ежедневный бонус'
    case 'purchase':
      return 'Покупка'
    case 'random_bonus':
      return 'Случайный бонус'
    case 'streak_bonus':
      return 'Бонус за серию'
    case 'manual':
      return 'Начисление'
    case 'task_reward':
      return 'Награда за задание'
    case 'survey_reward':
      return 'Награда за анкету'
    case 'self_belief_quiz':
      return 'Верю в себя'
    default:
      return 'Другое'
  }
}

function getTransactionBadgeVariant(category?: string | null): 'default' | 'success' | 'warning' | 'danger' {
  switch (category) {
    case 'daily_bonus':
      return 'success'
    case 'purchase':
      return 'danger'
    case 'random_bonus':
    case 'streak_bonus':
    case 'self_belief_quiz':
      return 'warning'
    default:
      return 'default'
  }
}

function StudentHubSkeleton() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <div className="h-16 animate-pulse rounded-[2rem] bg-secondary/70" />
          <div className="grid gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-[2rem] bg-secondary/70" />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export function StudentWorkspace({ activeTab }: { activeTab: StudentHubTab }) {
  const router = useRouter()
  const { data: summary, isLoading: summaryLoading } = useProfileSummary()
  const { data: transactions, isLoading: transactionsLoading } = useTransactions()
  const { data: certificates, isLoading: certificatesLoading } = useMyCertificates()
  const claimDailyBonus = useClaimDailyBonus()
  const buyRandomBonus = useBuyRandomBonus()
  const useCertificate = useUseCertificate()

  const [usingId, setUsingId] = useState<string | null>(null)
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({
    category: 'all',
    amount: 'all',
    search: '',
  })

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

  const filteredTransactions = useMemo(() => {
    const list = transactions ?? []
    const normalizedSearch = historyFilters.search.trim().toLowerCase()

    return list.filter((tx) => {
      const matchesCategory = historyFilters.category === 'all' || tx.category === historyFilters.category
      const matchesAmount =
        historyFilters.amount === 'all' ||
        (historyFilters.amount === 'income' && tx.amount > 0) ||
        (historyFilters.amount === 'expense' && tx.amount < 0)
      const matchesSearch = normalizedSearch === '' || tx.reason.toLowerCase().includes(normalizedSearch)

      return matchesCategory && matchesAmount && matchesSearch
    })
  }, [historyFilters, transactions])

  if (summaryLoading || !summary) {
    return <StudentHubSkeleton />
  }

  const levelTone = getLevelTone(summary.profile.level_name)
  const levelProgressMeta = getLevelProgressMeta(summary.profile.total_earned, summary.profile.level_name)
  const initials = getInitials(summary.profile.full_name)
  const recentTransactions = (transactions ?? []).slice(0, 6)
  const recentActivities = summary.recent_activities ?? []
  const recentCertificates = summary.recent_certificates ?? []
  const profileBadges = summary.profile.badges ?? []
  const certificateList = certificates ?? []
  const activeCertificatesCount = certificateList.filter((item) => item.status === 'active').length
  const usedCertificatesCount = certificateList.filter((item) => item.status === 'used').length
  const expiredCertificatesCount = certificateList.filter((item) => item.status === 'expired').length
  const hasActiveHistoryFilters =
    historyFilters.category !== 'all' || historyFilters.amount !== 'all' || historyFilters.search.trim().length > 0

  const handleTabChange = (nextTab: string) => {
    router.push(studentHubTabRoutes[nextTab as StudentHubTab])
  }

  const handleClaimDailyBonus = async () => {
    try {
      const result = await claimDailyBonus.mutateAsync()
      launchConfetti(['#0ea5e9', '#14b8a6', '#f59e0b', '#fde68a'])
      const badgeTitle = result.claim.badge?.title
      toast.success(
        badgeTitle
          ? `+${result.claim.total_reward} печ. и новый бейдж: ${badgeTitle}`
          : `Ежедневный бонус получен: +${result.claim.total_reward} печ.`,
      )
    } catch (error: any) {
      toast.error(error.message || 'Не удалось получить ежедневный бонус')
    }
  }

  const handleLuckyBonus = async () => {
    try {
      const result = await buyRandomBonus.mutateAsync({ cost: 3 })
      launchConfetti(['#3b82f6', '#60a5fa', '#f59e0b', '#fbbf24'])
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.message || 'Не удалось открыть сундук')
    }
  }

  const handleUseCertificate = async (purchaseId: string) => {
    setUsingId(purchaseId)

    try {
      await useCertificate.mutateAsync(purchaseId)
      launchConfetti(['#2563eb', '#3b82f6', '#60a5fa'])
      toast.success('Сертификат отмечен как использованный')
    } catch (error: any) {
      toast.error(error.message || 'Не удалось использовать сертификат')
    } finally {
      setUsingId(null)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <motion.section initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-card-foreground">Личный кабинет</Badge>
              {summary.rank > 0 ? <Badge>Позиция в рейтинге: #{summary.rank}</Badge> : null}
              {summary.profile.group_name ? <Badge>{summary.profile.group_name}</Badge> : null}
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">{summary.profile.full_name}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm font-semibold text-card-foreground shadow-sm">
                  <Cookie className="h-4 w-4 text-primary" />
                  Баланс: {summary.profile.balance}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm font-semibold text-card-foreground shadow-sm">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {summary.profile.level_name}
                </div>
              </div>
            </div>
          </motion.section>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.75rem] p-2">
              <TabsTrigger value="overview">Дашборд</TabsTrigger>
              <TabsTrigger value="profile">Профиль</TabsTrigger>
              <TabsTrigger value="certificates">Сертификаты</TabsTrigger>
              <TabsTrigger value="history">История</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {mood ? (
                <CorgiGuide
                  eyebrow={mood.eyebrow}
                  message={mood.message}
                  hint="Полный профиль, история и сертификаты теперь живут в соседних вкладках этого кабинета."
                />
              ) : null}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
                <Card className="h-full border-0 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="mb-1 text-sm text-primary-foreground/75">Баланс</p>
                        <p className="text-4xl font-bold">{summary.profile.balance}</p>
                      </div>
                      <div className="text-5xl">🍪</div>
                    </div>
                  </CardContent>
                </Card>

                <Card hover={false} className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Всего заработано</p>
                        <p className="mt-2 text-4xl font-bold text-card-foreground">{summary.profile.total_earned}</p>
                      </div>
                      <Activity className="mt-1 h-7 w-7 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card hover={false} className="h-full">
                  <CardContent className="flex h-full flex-col pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">Уровень</p>
                        <div className="mt-3 inline-flex max-w-full rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-card-foreground sm:text-base">
                          <span className="truncate">{summary.profile.level_name}</span>
                        </div>
                      </div>
                      <GraduationCap className="mt-1 h-7 w-7 shrink-0 text-primary" />
                    </div>

                    <div className="mt-auto space-y-2 pt-5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{levelProgressMeta.nextLevelName ? 'До следующего рубежа' : 'Статус'}</span>
                        <span>{levelProgressMeta.nextLevelName ? `${levelProgressMeta.remainingCookies} печ.` : 'Максимум'}</span>
                      </div>
                      <LevelProgressBar
                        totalEarned={summary.profile.total_earned}
                        levelName={summary.profile.level_name}
                        progress={summary.profile.level_progress}
                        trackClassName={levelTone.track}
                        fillClassName={levelTone.fill}
                      />
                      <p className="text-sm text-muted-foreground">
                        {levelProgressMeta.nextLevelName
                          ? `Сейчас уже ${summary.profile.total_earned} из ${levelProgressMeta.nextThreshold} печенек.`
                          : 'Открыт максимальный уровень.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card hover={false} className="h-full">
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
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)]">
                <Card hover={false}>
                  <CardHeader>
                    <CardTitle>Быстрый обзор</CardTitle>
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

                    <div className="rounded-[1.7rem] border border-border/60 bg-gradient-to-br from-primary/12 via-card to-secondary/35 p-5">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ритм семестра</div>
                      <div className="mt-2 text-3xl font-bold text-card-foreground">{summary.streak.current} дней подряд</div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        На 3-й день серия даёт +1 печеньку, на 7-й и дальше по недельным рубежам включаются усиленные бонусы и бейджи.
                      </p>
                    </div>

                    <Button
                      onClick={handleClaimDailyBonus}
                      isLoading={claimDailyBonus.isPending}
                      disabled={!summary.streak.can_claim_today}
                      className="!h-auto min-h-11 w-full whitespace-normal py-3 leading-5 sm:w-auto"
                    >
                      <Cookie className="h-4 w-4" />
                      {summary.streak.can_claim_today ? 'Забрать ежедневный бонус' : 'Бонус на сегодня уже получен'}
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card hover={false}>
                    <CardHeader>
                      <CardTitle>Сундук удачи</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-[1.6rem] border border-border/60 bg-gradient-to-br from-primary/12 via-card to-secondary/35 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Риск и награда</div>
                            <div className="mt-2 text-2xl font-bold text-card-foreground">1-5 печенек</div>
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
                        className="!h-auto min-h-11 w-full whitespace-normal py-3 leading-5"
                      >
                        <Sparkles className="h-4 w-4" />
                        {summary.profile.balance < 3 ? 'Нужно минимум 3 печеньки' : 'Открыть сундук за 3 печеньки'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card hover={false}>
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
                      ) : recentTransactions.length > 0 ? (
                        <div className="space-y-3">
                          {recentTransactions.map((transaction) => (
                            <div key={transaction.id} className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-card-foreground">{transaction.reason}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(transaction.created_at)}</p>
                                </div>
                                <div className={`text-lg font-bold ${transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
                <CardContent className="p-6 sm:p-8">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:items-center">
                    <div className="flex min-w-0 items-start gap-5">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.8rem] border border-white/20 bg-white/12 text-3xl font-bold shadow-inner backdrop-blur-sm">
                        {initials}
                      </div>

                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${levelTone.badge} border-white/20 bg-white/15 text-white`}>{summary.profile.level_name}</Badge>
                          {summary.rank > 0 ? <Badge className="border-white/20 bg-white/12 text-white">Топ #{summary.rank}</Badge> : null}
                        </div>

                        <div>
                          <h2 className="text-4xl font-bold leading-tight">{summary.profile.full_name}</h2>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-primary-foreground/80">
                            Игровой профиль показывает темп семестра: уровень, серию входов, любимые активности и свежие следы на карте прогресса.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[1.3rem] border border-white/18 bg-white/12 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-primary-foreground/65">Баланс</div>
                            <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
                              <span>{summary.profile.balance}</span>
                              <span>🍪</span>
                            </div>
                          </div>

                          <div className="rounded-[1.3rem] border border-white/18 bg-white/12 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-primary-foreground/65">Серия</div>
                            <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
                              <span>{summary.streak.current}</span>
                              <Flame className="h-6 w-6" />
                            </div>
                          </div>

                          <div className="rounded-[1.3rem] border border-white/18 bg-white/12 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-primary-foreground/65">Бейджи</div>
                            <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
                              <span>{summary.profile.badge_count}</span>
                              <BadgeCheck className="h-6 w-6" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.7rem] border border-white/18 bg-black/10 p-5 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.14em] text-primary-foreground/70">Прогресс уровня</div>
                          <div className="mt-2 text-xl font-semibold">{summary.profile.total_earned} печенек заработано</div>
                        </div>
                        <Trophy className="h-7 w-7 text-primary-foreground/90" />
                      </div>

                      <div className="mt-5">
                        <LevelProgressBar
                          totalEarned={summary.profile.total_earned}
                          levelName={summary.profile.level_name}
                          progress={summary.profile.level_progress}
                          trackClassName="bg-white/20"
                          fillClassName="bg-white shadow-[0_0_20px_rgba(255,255,255,0.35)]"
                          tooltipClassName="border-white/20 bg-slate-950/90 text-white"
                        />
                      </div>

                      <p className="mt-3 text-sm text-primary-foreground/80">
                        {summary.profile.next_level_name ? `Следующая цель: ${summary.profile.next_level_name}` : 'Максимальный уровень уже открыт.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                      Последние {summary.activity_days.length} дней. Чем насыщеннее ячейка, тем больше действий за день.
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

                    <ActivityHeatmap days={summary.activity_days} />
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Ежедневная серия</CardTitle>
                      <CardDescription>
                        На 3-й день подряд даём +1 печеньку, на 7-й и дальше по недельным рубежам включаются усиленные бонусы и памятные бейджи.
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
                          <div className="mt-1 text-sm text-muted-foreground">Осталось {summary.streak.days_to_next_milestone} дн.</div>
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="certificates" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Card hover={false}>
                  <CardHeader>
                    <CardTitle>Мои сертификаты</CardTitle>
                    <CardDescription>Покупки, сроки действия и статусы использования.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {certificatesLoading ? (
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="h-56 animate-pulse rounded-[1.8rem] bg-secondary/50" />
                        ))}
                      </div>
                    ) : certificateList.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {certificateList.map((cert, index) => {
                          const hasBackground = Boolean(cert.certificate?.background_image)

                          return (
                            <motion.div
                              key={cert.id}
                              initial={{ opacity: 0, y: 14 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Card className="relative h-full overflow-hidden p-0">
                                {hasBackground ? (
                                  <div className="absolute inset-0">
                                    <Image
                                      src={cert.certificate?.background_image ?? ''}
                                      alt=""
                                      fill
                                      className="object-cover"
                                      sizes="(min-width: 1280px) 33vw, 100vw"
                                    />
                                    <div className="absolute inset-0 bg-card/85 backdrop-blur-[2px]" />
                                  </div>
                                ) : null}

                                <div className="relative z-10 flex h-full flex-col p-6">
                                  <div className="mb-4 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        {getCertificateStatusIcon(cert.status)}
                                        <h3 className="truncate text-xl font-bold text-card-foreground">{cert.certificate?.title}</h3>
                                      </div>
                                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{cert.certificate?.description}</p>
                                    </div>
                                    {getCertificateStatusBadge(cert.status)}
                                  </div>

                                  <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      Куплен: {formatDate(cert.purchased_at)}
                                    </div>
                                    {cert.expires_at ? (
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Действителен до: {formatDate(cert.expires_at)}
                                      </div>
                                    ) : null}
                                    {cert.used_at ? (
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Использован: {formatDate(cert.used_at)}
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="mt-auto border-t border-border/70 pt-4">
                                    <div className="mb-3 text-sm text-muted-foreground">
                                      Стоимость: <span className="font-semibold text-card-foreground">{cert.price_paid} 🍪</span>
                                    </div>

                                    {cert.status === 'active' ? (
                                      <Button onClick={() => handleUseCertificate(cert.id)} disabled={usingId === cert.id} className="w-full">
                                        {usingId === cert.id ? 'Использование...' : 'Использовать'}
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-[2rem] border border-dashed border-border/70 bg-secondary/20 px-6 py-16 text-center">
                        <Ticket className="mx-auto h-10 w-10 text-primary/70" />
                        <h3 className="mt-4 text-2xl font-semibold text-card-foreground">У вас пока нет сертификатов</h3>
                        <p className="mt-2 text-muted-foreground">Посетите магазин, чтобы приобрести сертификаты.</p>
                        <Link href="/shop" className="mt-6 inline-flex">
                          <Button>Перейти в магазин</Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card hover={false}>
                    <CardHeader>
                      <CardTitle>Сводка по сертификатам</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                        <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Активных</div>
                        <div className="mt-2 text-3xl font-bold text-card-foreground">{activeCertificatesCount}</div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-secondary/35 p-5">
                        <div className="text-sm font-medium text-muted-foreground">Использовано</div>
                        <div className="mt-2 text-3xl font-bold text-card-foreground">{usedCertificatesCount}</div>
                      </div>
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
                        <div className="text-sm font-medium text-rose-700 dark:text-rose-300">Истекло</div>
                        <div className="mt-2 text-3xl font-bold text-card-foreground">{expiredCertificatesCount}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card hover={false}>
                    <CardHeader>
                      <CardTitle>Недавние покупки</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                        <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-12 text-center text-muted-foreground">
                          Здесь появятся свежие покупки.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card hover={false}>
                <CardHeader>
                  <CardTitle>Фильтры истории</CardTitle>
                  <CardDescription>Можно быстро отобрать операции по причине, типу и ключевому слову.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input
                    value={historyFilters.search}
                    onChange={(event) => setHistoryFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Поиск по причине"
                  />

                  <Select value={historyFilters.category} onValueChange={(value) => setHistoryFilters((current) => ({ ...current, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Категория" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      <SelectItem value="daily_bonus">Ежедневный бонус</SelectItem>
                      <SelectItem value="purchase">Покупки</SelectItem>
                      <SelectItem value="random_bonus">Случайный бонус</SelectItem>
                      <SelectItem value="streak_bonus">Бонус за серию</SelectItem>
                      <SelectItem value="self_belief_quiz">Верю в себя</SelectItem>
                      <SelectItem value="manual">Начисления</SelectItem>
                      <SelectItem value="task_reward">Награды за задания</SelectItem>
                      <SelectItem value="survey_reward">Награды за анкету</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={historyFilters.amount} onValueChange={(value) => setHistoryFilters((current) => ({ ...current, amount: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Тип операции" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все операции</SelectItem>
                      <SelectItem value="income">Только начисления</SelectItem>
                      <SelectItem value="expense">Только списания</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)]">
                <Card hover={false}>
                  <CardHeader>
                    <CardTitle>История транзакций</CardTitle>
                    <CardDescription>Все операции с вашими печеньками.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div key={index} className="h-20 animate-pulse rounded-2xl bg-secondary/50" />
                        ))}
                      </div>
                    ) : filteredTransactions.length > 0 ? (
                      <div className="space-y-3">
                        {filteredTransactions.map((tx, index) => (
                          <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, x: -18 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="rounded-2xl border border-border/60 bg-secondary/20 p-4 transition-colors hover:bg-secondary/30"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex min-w-0 flex-1 items-center gap-4">
                                <div className={`text-3xl ${tx.amount > 0 ? 'scale-110' : 'opacity-55'}`}>🍪</div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <p className="truncate font-medium text-card-foreground">{tx.reason}</p>
                                    {tx.category ? (
                                      <Badge variant={getTransactionBadgeVariant(tx.category)} className="text-xs">
                                        {getTransactionCategoryLabel(tx.category)}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                                </div>
                              </div>
                              <div className={`text-2xl font-bold ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                                {tx.amount > 0 ? '+' : ''}
                                {tx.amount}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center text-muted-foreground">
                        <div className="mb-4 text-6xl">📭</div>
                        <p className="text-xl text-card-foreground">По выбранным фильтрам ничего не найдено</p>
                        {hasActiveHistoryFilters ? (
                          <Button
                            variant="ghost"
                            onClick={() => setHistoryFilters({ category: 'all', amount: 'all', search: '' })}
                            className="mt-4"
                          >
                            Сбросить фильтры
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card hover={false}>
                  <CardHeader>
                    <CardTitle>Последние активности</CardTitle>
                    <CardDescription>Награды, ответы и действия, которые двигают вас по сезону.</CardDescription>
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
                                <div className={`text-lg font-bold ${activity.amount >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
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
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
