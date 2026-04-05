"use client"

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTransactions } from '@/lib/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
      case 'streak_bonus':
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
      case 'streak_bonus':
        return 'Бонус за серию'
      case 'manual':
        return 'Начисление'
      case 'task_reward':
        return 'Награда за задание'
      case 'survey_reward':
        return 'Награда за анкету'
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
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-4xl font-bold text-blue-900">История транзакций 📊</h1>
            <p className="text-blue-600/70">Все операции с вашими печеньками</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader>
                <CardTitle>Фильтры</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по причине" />

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Категория" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      <SelectItem value="daily_bonus">Ежедневный бонус</SelectItem>
                      <SelectItem value="purchase">Покупки</SelectItem>
                      <SelectItem value="random_bonus">Случайный бонус</SelectItem>
                      <SelectItem value="streak_bonus">Бонус за серию</SelectItem>
                      <SelectItem value="manual">Начисления</SelectItem>
                      <SelectItem value="task_reward">Награды за задания</SelectItem>
                      <SelectItem value="survey_reward">Награды за анкету</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={amountFilter} onValueChange={setAmountFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Тип операции" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все операции</SelectItem>
                      <SelectItem value="income">Только начисления</SelectItem>
                      <SelectItem value="expense">Только списания</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card>
              <CardHeader>
                <CardTitle>Транзакции ({filteredTransactions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-20 animate-pulse rounded-lg bg-blue-50" />
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
                        className="flex items-center justify-between rounded-lg bg-blue-50 p-4 transition-all hover:bg-blue-100"
                      >
                        <div className="flex flex-1 items-center gap-4">
                          <div className={`text-3xl ${tx.amount > 0 ? 'scale-110' : 'opacity-50'}`}>🍪</div>
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
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
                  <div className="py-20 text-center text-blue-600/60">
                    <div className="mb-4 text-6xl">📭</div>
                    <p className="text-xl">По выбранным фильтрам ничего не найдено</p>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setCategoryFilter('all')
                          setAmountFilter('all')
                          setSearch('')
                        }}
                        className="mt-4"
                      >
                        Сбросить фильтры
                      </Button>
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

