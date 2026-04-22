'use client'

import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/components/theme-provider'
import { useAdminStats } from '@/lib/queries'

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useAdminStats()
  const { theme } = useTheme()

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
      <div className="min-h-screen page-theme-gradient">
        <div className="mx-auto flex min-h-[calc(100vh-82px)] w-full max-w-[1400px] flex-col gap-6 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-4xl font-bold text-blue-900">Админ-статистика</h1>
            <p className="text-blue-600/80">Ключевые метрики системы в реальном времени без сломанного контраста на тёмной теме.</p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-[1.35rem] bg-secondary/80" />
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card hover={false}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Всего пользователей</div>
                    <div className="mt-2 text-3xl font-bold text-card-foreground">{stats.total_users}</div>
                  </CardContent>
                </Card>
                <Card hover={false}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Всего студентов</div>
                    <div className="mt-2 text-3xl font-bold text-card-foreground">{stats.total_students}</div>
                  </CardContent>
                </Card>
                <Card hover={false}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Суммарно печенек</div>
                    <div className="mt-2 text-3xl font-bold text-card-foreground">{stats.total_cookies}</div>
                  </CardContent>
                </Card>
                <Card hover={false}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Средний баланс</div>
                    <div className="mt-2 text-3xl font-bold text-card-foreground">{stats.avg_balance.toFixed(1)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Операционная активность</CardTitle>
                </CardHeader>
                <CardContent className="h-[420px] md:h-[480px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart key={theme} data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                      <CartesianGrid stroke="var(--border-soft)" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-base)', fontSize: 13 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-base)', fontSize: 13 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--primary) / 0.12)' }}
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '16px',
                          color: 'hsl(var(--popover-foreground))',
                          boxShadow: '0 24px 48px -28px rgba(15, 23, 42, 0.45)',
                        }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 600 }}
                        formatter={(value: number) => [`${value}`, 'Значение']}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[16, 16, 6, 6]} maxBarSize={120} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/35 px-6 py-14 text-center text-muted-foreground">
              Нет данных для отображения.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
