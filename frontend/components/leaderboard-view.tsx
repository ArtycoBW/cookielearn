"use client"

import { motion } from 'framer-motion'
import { useLeaderboard, useProfile } from '@/lib/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type LeaderboardViewProps = {
  title: string
  description: string
}

export function LeaderboardView({ title, description }: LeaderboardViewProps) {
  const { data: leaderboard, isLoading } = useLeaderboard()
  const { data: profile } = useProfile()

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `${rank}.`
    }
  }

  return (
    <div className="min-h-screen page-theme-gradient">
      <div className="mx-auto max-w-5xl p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-blue-900">{title} 🏆</h1>
          <p className="text-blue-600/70">{description}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle>Все студенты</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-blue-50" />
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
                        transition={{ delay: Math.min(i * 0.02, 0.25) }}
                        className={`flex items-center justify-between rounded-lg p-4 transition-all ${
                          isCurrentUser
                            ? 'scale-[1.01] bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                            : isTopThree
                              ? 'bg-gradient-to-r from-blue-100 to-blue-50'
                              : 'bg-blue-50 hover:bg-blue-100'
                        }`}
                      >
                        <div className="flex flex-1 items-center gap-4">
                          <div className={`min-w-[3rem] text-center text-2xl font-bold ${isCurrentUser ? 'text-white' : 'text-blue-900'}`}>
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
                              <p className={`text-sm ${isCurrentUser ? 'text-blue-100' : 'text-blue-600/60'}`}>{entry.group_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${isCurrentUser ? 'text-white' : 'text-blue-900'}`}>{entry.balance}</span>
                          <span className="text-2xl">🍪</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-20 text-center text-blue-600/50">
                  <div className="mb-4 text-6xl">🏆</div>
                  <p className="text-xl">Рейтинг пока пуст</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
