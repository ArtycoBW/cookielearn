"use client"

import { motion } from 'framer-motion'
import { useLeaderboard, useProfile } from '@/lib/queries'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Navigation } from '@/components/navigation'

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useLeaderboard()
  const { data: profile } = useProfile()

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `${rank}.`
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="max-w-4xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-blue-900 mb-2">
              Таблица лидеров 🏆
            </h1>
            <p className="text-blue-600/70">
              Рейтинг студентов по печенькам
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Топ студентов</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-16 bg-blue-50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((entry, i) => {
                      const isCurrentUser = profile?.id === entry.id
                      const isTopThree = entry.rank <= 3

                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                            isCurrentUser 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105' 
                              : isTopThree
                              ? 'bg-gradient-to-r from-blue-100 to-blue-50'
                              : 'bg-blue-50 hover:bg-blue-100'
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`text-2xl font-bold ${isCurrentUser ? 'text-white' : 'text-blue-900'} min-w-[3rem] text-center`}>
                              {getMedalEmoji(entry.rank)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`font-semibold ${isCurrentUser ? 'text-white' : 'text-blue-900'}`}>
                                  {entry.full_name}
                                  {isCurrentUser && <span className="ml-2 text-xs opacity-90">(Вы)</span>}
                                </p>
                              </div>
                              {entry.group_name && (
                                <p className={`text-sm ${isCurrentUser ? 'text-blue-100' : 'text-blue-600/60'}`}>
                                  {entry.group_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${isCurrentUser ? 'text-white' : 'text-blue-900'}`}>
                              {entry.balance}
                            </span>
                            <span className="text-2xl">🍪</span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 text-blue-600/50">
                    <div className="text-6xl mb-4">🏆</div>
                    <p className="text-xl">Рейтинг пока пуст</p>
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
