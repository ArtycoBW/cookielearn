"use client"

import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminStats } from '@/lib/queries'

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useAdminStats()

  const chartData = stats
    ? [
        { name: 'Студенты', value: stats.total_students },
        { name: 'Транзакции', value: stats.total_transactions },
        { name: 'Покупки', value: stats.total_purchases },
        { name: 'Активные задачи', value: stats.active_tasks },
      ]
    : []

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1400px] flex-col gap-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-4xl font-bold text-blue-900">Админ-статистика</h1>
            <p className="text-blue-600/70">Ключевые метрики системы в реальном времени</p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border border-blue-100 bg-white" />
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-blue-600/70">Всего пользователей</div>
                    <div className="text-3xl font-bold text-blue-900">{stats.total_users}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-blue-600/70">Всего студентов</div>
                    <div className="text-3xl font-bold text-blue-900">{stats.total_students}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-blue-600/70">Суммарно печенек</div>
                    <div className="text-3xl font-bold text-blue-900">{stats.total_cookies}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-blue-600/70">Средний баланс</div>
                    <div className="text-3xl font-bold text-blue-900">{stats.avg_balance.toFixed(1)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Операционная активность</CardTitle>
                </CardHeader>
                <CardContent className="h-[420px] md:h-[480px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                      <XAxis dataKey="name" tick={{ fill: '#1e3a8a' }} />
                      <YAxis tick={{ fill: '#1e3a8a' }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="py-12 text-center text-blue-600/70">Нет данных для отображения</div>
          )}
        </div>
      </div>
    </>
  )
}
