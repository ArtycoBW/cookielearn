'use client'

import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useProfile, useTransactions } from '@/lib/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/navigation'
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

  return (
    <>
      <Navigation />
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-7xl p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-2">
            <h1 className="text-4xl font-bold text-blue-900">Привет, {profile?.full_name}!</h1>
            <p className="text-blue-600/70">Здесь видно баланс, группу и последние движения по печенькам.</p>
          </motion.div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }}>
              <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm text-blue-100">Ваш баланс</p>
                      <p className="text-4xl font-bold">{profile?.balance ?? 0}</p>
                    </div>
                    <div className="text-6xl">🍪</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.14 }}>
              <Card hover={false}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-blue-500/50" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Ежедневный бонус</p>
                      <p className="text-xs text-blue-600/60">Скоро будет доступен</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-center text-sm text-blue-600/70">
                    Функция в разработке
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Card hover={false}>
                <CardContent className="pt-6">
                  <p className="mb-2 text-sm text-blue-600/70">Группа</p>
                  <p className="text-2xl font-bold text-blue-900">{profile?.group_name || 'Не указана'}</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card>
              <CardHeader>
                <CardTitle>Последние транзакции</CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="h-16 animate-pulse rounded-lg bg-blue-50" />
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
                        className="flex items-center justify-between rounded-lg bg-blue-50 p-4 transition-colors hover:bg-blue-100"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl ${transaction.amount > 0 ? 'scale-110' : 'opacity-50'}`}>🍪</div>
                          <div>
                            <p className="font-medium text-blue-900">{transaction.reason}</p>
                            <p className="text-sm text-blue-600/60">{formatDateTime(transaction.created_at)}</p>
                          </div>
                        </div>
                        <div className={`text-xl font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}
                          {transaction.amount}
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
    </>
  )
}
