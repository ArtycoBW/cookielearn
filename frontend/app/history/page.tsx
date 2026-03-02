"use client"

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTransactions } from '@/lib/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Navigation } from '@/components/navigation'
import { formatDateTime } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger'

export default function HistoryPage() {
  const { data: transactions, isLoading } = useTransactions()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [amountFilter, setAmountFilter] = useState('all')
  const [search, setSearch] = useState('')

  const getCategoryColor = (category?: string): BadgeVariant => {
    switch (category) {
      case 'daily_bonus':
        return 'success'
      case 'purchase':
        return 'danger'
      case 'random_bonus':
        return 'warning'
      case 'manual':
      case 'task_reward':
      default:
        return 'default'
    }
  }

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'daily_bonus':
        return 'Ежедневный бонус'
      case 'purchase':
        return 'Покупка'
      case 'random_bonus':
        return 'Случайный бонус'
      case 'manual':
        return 'Начисление'
      case 'task_reward':
        return 'Награда за задание'
      default:
        return 'Другое'
    }
  }

  const filteredTransactions = useMemo(() => {
    if (!transactions) {
      return []
    }

    return transactions.filter((tx) => {
      const byCategory = categoryFilter === 'all' || tx.category === categoryFilter
      const byAmount =
        amountFilter === 'all' ||
        (amountFilter === 'income' && tx.amount > 0) ||
        (amountFilter === 'expense' && tx.amount < 0)
      const bySearch = tx.reason.toLowerCase().includes(search.toLowerCase())

      return byCategory && byAmount && bySearch
    })
  }, [transactions, categoryFilter, amountFilter, search])

  const hasActiveFilters = categoryFilter !== 'all' || amountFilter !== 'all' || search.trim().length > 0

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-blue-900 mb-2">История транзакций 📊</h1>
            <p className="text-blue-600/70">Все операции с вашими печеньками</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Фильтры</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по причине"
                    className="w-full px-3 py-2 rounded-lg border-2 border-blue-100 focus:border-blue-500 focus:outline-none transition-smooth"
                  />

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-blue-100 focus:border-blue-500 focus:outline-none bg-white transition-smooth"
                  >
                    <option value="all">Все категории</option>
                    <option value="daily_bonus">Ежедневный бонус</option>
                    <option value="purchase">Покупки</option>
                    <option value="random_bonus">Случайный бонус</option>
                    <option value="manual">Начисления</option>
                    <option value="task_reward">Награды за задания</option>
                  </select>

                  <select
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-blue-100 focus:border-blue-500 focus:outline-none bg-white transition-smooth"
                  >
                    <option value="all">Все операции</option>
                    <option value="income">Только начисления</option>
                    <option value="expense">Только списания</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Транзакции ({filteredTransactions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-20 bg-blue-50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filteredTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTransactions.map((tx, i) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`text-3xl ${tx.amount > 0 ? 'scale-110' : 'opacity-50'}`}>
                            🍪
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-blue-900">{tx.reason}</p>
                              {tx.category && (
                                <Badge variant={getCategoryColor(tx.category)} className="text-xs">
                                  {getCategoryLabel(tx.category)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-blue-600/60">{formatDateTime(tx.created_at)}</p>
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}
                          {tx.amount}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-blue-600/60">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-xl">По выбранным фильтрам ничего не найдено</p>
                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          setCategoryFilter('all')
                          setAmountFilter('all')
                          setSearch('')
                        }}
                        className="mt-4 text-blue-700 hover:text-blue-900 font-medium"
                      >
                        Сбросить фильтры
                      </button>
                    )}
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
