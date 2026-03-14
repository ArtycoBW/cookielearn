"use client"

import { Navigation } from '@/components/navigation'
import { LeaderboardView } from '@/components/leaderboard-view'

export default function AdminLeaderboardPage() {
  return (
    <>
      <Navigation />
      <LeaderboardView title="Лидерборд" description="Администратор видит полный рейтинг студентов по печенькам." />
    </>
  )
}
