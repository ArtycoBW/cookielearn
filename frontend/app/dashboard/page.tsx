'use client'

import { motion } from 'framer-motion'
import { Award, BarChart3, GraduationCap } from 'lucide-react'
import { LevelProgressBar } from '@/components/level-progress-bar'
import { useProfile, useTransactions } from '@/lib/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/navigation'
import { getLevelTone } from '@/lib/player-progress'
import { formatDateTime } from '@/lib/utils'

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: transactions, isLoading: transactionsLoading } = useTransactions()

  if (profileLoading) {
    return (
      <>
        <Navigation />
        <div className="flex min-h-screen items-center justify-center page-theme-gradient">
          <div className="text-4xl">🍪</div>
        </div>
      </>
    )
  }

  const levelTone = getLevelTone(profile?.level_name)

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl space-y-8 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-4xl font-bold text-blue-900">Привет, {profile?.full_name}!</h1>
            <p className="text-blue-600/70">Здесь видно текущий баланс, общий заработок, уровень и последние движения по печенькам.</p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.06 }}>
              <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm text-blue-100">Текущий баланс</p>
                      <p className="text-4xl font-bold">{profile?.balance ?? 0}</p>
                    </div>
                    <div className="text-6xl">🍪</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}>
              <Card hover={false}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Всего заработано</p>
                      <p className="mt-2 text-4xl font-bold text-card-foreground">{profile?.total_earned ?? 0}</p>
                    </div>
                    <BarChart3 className="mt-1 h-7 w-7 text-primary" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Сюда попадают все начисления, даже если часть печенек потом была потрачена.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.18 }}>
              <Card hover={false}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Уровень</p>
                      <p className="mt-2 text-2xl font-bold text-card-foreground">{profile?.level_name || 'Новичок'}</p>
                    </div>
                    <GraduationCap className="mt-1 h-7 w-7 text-primary" />
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Прогресс</span>
                      <span>{profile?.next_level_name ? `До "${profile.next_level_name}"` : 'Максимальный уровень'}</span>
                    </div>
                    <LevelProgressBar
                      totalEarned={profile?.total_earned ?? 0}
                      levelName={profile?.level_name}
                      progress={profile?.level_progress ?? 0}
                      trackClassName={levelTone.track}
                      fillClassName={levelTone.fill}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
              <Card hover={false}>
                <CardHeader>
                  <CardTitle>Профиль активности</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-secondary/45 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ответов отправлено</div>
                      <div className="mt-2 text-2xl font-bold text-card-foreground">{profile?.submitted_tasks ?? 0}</div>
                    </div>
                    <div className="rounded-2xl bg-secondary/45 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Проверено</div>
                      <div className="mt-2 text-2xl font-bold text-card-foreground">{profile?.reviewed_tasks ?? 0}</div>
                    </div>
                    <div className="rounded-2xl bg-secondary/45 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Покупок</div>
                      <div className="mt-2 text-2xl font-bold text-card-foreground">{profile?.purchase_count ?? 0}</div>
                    </div>
                    <div className="rounded-2xl bg-secondary/45 p-4">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Бейджей</div>
                      <div className="mt-2 text-2xl font-bold text-card-foreground">{profile?.badge_count ?? 0}</div>
                    </div>
                  </div>

                  {profile?.badges && profile.badges.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <Award className="h-4 w-4 text-primary" />
                        Последние бейджи
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.badges.map((badge) => (
                          <div key={badge.id} className="rounded-full border border-border/60 bg-card/75 px-3 py-1.5 text-sm text-card-foreground">
                            <span className="mr-1.5">{badge.icon}</span>
                            <span className="font-medium">{badge.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-5 text-sm text-muted-foreground">
                      Пока бейджей нет. Их может выдать преподаватель вместе с печеньками.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Последние транзакции</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="h-16 animate-pulse rounded-2xl bg-blue-50" />
                      ))}
                    </div>
                  ) : transactions && transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 10).map((transaction, index) => (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="rounded-2xl bg-blue-50 p-4 transition-colors hover:bg-blue-100"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                              <div className={`text-2xl ${transaction.amount > 0 ? 'scale-110' : 'opacity-50'}`}>🍪</div>
                              <div className="min-w-0">
                                <p className="font-medium text-blue-900">{transaction.reason}</p>
                                <p className="text-sm text-blue-600/60">{formatDateTime(transaction.created_at)}</p>
                                {transaction.badge_icon && transaction.badge_title && (
                                  <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-white/80 px-2.5 py-1 text-xs text-card-foreground">
                                    <span>{transaction.badge_icon}</span>
                                    <span>{transaction.badge_title}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className={`text-xl font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount > 0 ? '+' : ''}
                              {transaction.amount}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-blue-600/50">
                      <div className="mb-4 text-6xl">🍪</div>
                      <p>Пока нет транзакций</p>
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
