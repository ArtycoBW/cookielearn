"use client"

import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useProfile, useTransactions, useClaimDailyBonus } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/navigation'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: transactions, isLoading: transactionsLoading } = useTransactions()
  const claimBonus = useClaimDailyBonus()

  const handleClaimBonus = async () => {
    try {
      await claimBonus.mutateAsync()
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd']
      })
      
      toast.success('🍪 Вы получили ежедневный бонус!')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (profileLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
          <div className="text-4xl">🍪</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="max-w-7xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-blue-900 mb-2">
              Привет, {profile?.full_name}! 👋
            </h1>
            <p className="text-blue-600/70">
              Добро пожаловать в CookieLearn
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm mb-1">Ваш баланс</p>
                      <p className="text-4xl font-bold">{profile?.balance}</p>
                    </div>
                    <div className="text-6xl">🍪</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-blue-600/70 text-sm mb-3">Ежедневный бонус</p>
                  <Button
                    onClick={handleClaimBonus}
                    isLoading={claimBonus.isPending}
                    className="w-full"
                  >
                    Получить +1 🍪
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-blue-600/70 text-sm mb-2">Группа</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {profile?.group_name || 'Не указана'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Последние транзакции</CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-blue-50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.slice(0, 10).map((tx, i) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-smooth"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl ${tx.amount > 0 ? 'scale-110' : 'opacity-50'}`}>
                            🍪
                          </div>
                          <div>
                            <p className="font-medium text-blue-900">{tx.reason}</p>
                            <p className="text-sm text-blue-600/60">
                              {formatDateTime(tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className={`text-xl font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-blue-600/50">
                    <div className="text-6xl mb-4">🍪</div>
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
