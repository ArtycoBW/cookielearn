import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { Profile, Transaction, Certificate, Purchase, LeaderboardEntry } from './types'

export const queryKeys = {
  profile: ['profile'] as const,
  transactions: ['transactions'] as const,
  certificates: ['certificates'] as const,
  purchases: ['purchases'] as const,
  leaderboard: ['leaderboard'] as const,
  shopCertificates: ['shop', 'certificates'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api.get<Profile>('/api/me'),
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => api.get<Transaction[]>('/api/me/transactions'),
  })
}

export function usePurchases() {
  return useQuery({
    queryKey: queryKeys.purchases,
    queryFn: () => api.get<Purchase[]>('/api/me/certificates'),
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: () => api.get<LeaderboardEntry[]>('/api/leaderboard'),
  })
}

export function useShopCertificates() {
  return useQuery({
    queryKey: queryKeys.shopCertificates,
    queryFn: () => api.get<Certificate[]>('/api/shop/certificates'),
  })
}

export function useClaimDailyBonus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => api.post('/api/me/daily-bonus'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}

export function useBuyCertificate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (certificateId: string) => 
      api.post(`/api/shop/certificates/${certificateId}/buy`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases })
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCertificates })
    },
  })
}

export function useBuyRandomBonus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (cost: number) => 
      api.post('/api/shop/random-bonus/buy', { cost }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}
