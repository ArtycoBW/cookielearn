import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  BulkImportStudentsResponse,
  Certificate,
  LeaderboardEntry,
  Profile,
  Purchase,
  RegisterStudentResponse,
  Stats,
  Task,
  Transaction,
} from './types'

export const queryKeys = {
  profile: ['profile'] as const,
  transactions: ['transactions'] as const,
  certificates: ['certificates'] as const,
  purchases: ['purchases'] as const,
  leaderboard: ['leaderboard'] as const,
  shopCertificates: ['shop', 'certificates'] as const,
  adminStudents: ['admin', 'students'] as const,
  adminCertificates: ['admin', 'certificates'] as const,
  adminTasks: ['admin', 'tasks'] as const,
  adminStats: ['admin', 'stats'] as const,
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
    mutationFn: (certificateId: string) => api.post(`/api/shop/certificates/${certificateId}/buy`),
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
    mutationFn: (cost: number) => api.post('/api/shop/random-bonus/buy', { cost }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}

export function useMyCertificates() {
  return useQuery({
    queryKey: queryKeys.purchases,
    queryFn: () => api.get<Purchase[]>('/api/me/certificates'),
  })
}

export function useUseCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (certificateId: string) => api.post(`/api/me/certificates/${certificateId}/use`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}

export function useAdminStudents() {
  return useQuery({
    queryKey: queryKeys.adminStudents,
    queryFn: () => api.get<Profile[]>('/api/admin/students'),
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { id: string; full_name: string; group_name?: string }) => api.post('/api/admin/students', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
    },
  })
}

export function useRegisterStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { email: string; password: string; full_name: string; group_name?: string }) =>
      api.post<RegisterStudentResponse>('/api/admin/students/register', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useBulkImportStudents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      group_name?: string
      default_password?: string
      students: Array<{ last_name: string; first_name: string; middle_name?: string }>
    }) => api.post<BulkImportStudentsResponse>('/api/admin/students/bulk-import', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useUpdateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { id: string; full_name: string; group_name?: string }) =>
      api.put(`/api/admin/students/${payload.id}`, {
        full_name: payload.full_name,
        group_name: payload.group_name,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
    },
  })
}

export function useDeleteStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
    },
  })
}

export function useAwardCookies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { user_id: string; amount: number; reason: string; category?: string }) =>
      api.post('/api/admin/cookies/award', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useAdminCertificates() {
  return useQuery({
    queryKey: queryKeys.adminCertificates,
    queryFn: () => api.get<Certificate[]>('/api/admin/certificates'),
  })
}

export function useCreateCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Omit<Certificate, 'id' | 'created_at' | 'updated_at'>) => api.post('/api/admin/certificates', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCertificates })
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCertificates })
    },
  })
}

export function useUpdateCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Certificate) => api.put(`/api/admin/certificates/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCertificates })
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCertificates })
    },
  })
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/certificates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCertificates })
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCertificates })
    },
  })
}

export function useAdminTasks() {
  return useQuery({
    queryKey: queryKeys.adminTasks,
    queryFn: () => api.get<Task[]>('/api/admin/tasks'),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { title: string; description?: string; type?: string; reward: number; deadline?: string }) =>
      api.post('/api/admin/tasks', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Task) => api.put(`/api/admin/tasks/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useCloseTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => api.post(`/api/admin/tasks/${taskId}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
    },
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => api.get<Stats>('/api/admin/stats'),
    refetchInterval: 30000,
  })
}
