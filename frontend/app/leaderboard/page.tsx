"use client"

import { Navigation } from '@/components/navigation'
import { LeaderboardView } from '@/components/leaderboard-view'

export default function LeaderboardPage() {
  return (
    <>
      <Navigation />
      <LeaderboardView title="Таблица лидеров" description="Полный рейтинг студентов по печенькам без ограничения в 20 записей." />
    </>
  )
}
