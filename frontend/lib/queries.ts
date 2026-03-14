import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  AccountCredential,
  BulkImportStudentsResponse,
  Certificate,
  LeaderboardEntry,
  PurchaseHistoryEntry,
  Profile,
  Purchase,
  RegisterStudentResponse,
  Stats,
  SurveySubmission,
  Task,
  TaskSubmission,
  Transaction,
  TransactionHistoryEntry,
} from './types'

export const queryKeys = {
  profile: ['profile'] as const,
  transactions: ['transactions'] as const,
  certificates: ['certificates'] as const,
  purchases: ['purchases'] as const,
  leaderboard: ['leaderboard'] as const,
  shopCertificates: ['shop', 'certificates'] as const,
  certificateBackground: (id: string) => ['shop', 'certificates', id, 'background'] as const,
  adminStudents: ['admin', 'students'] as const,
  adminAccounts: ['admin', 'accounts'] as const,
  adminCertificates: ['admin', 'certificates'] as const,
  adminTasks: ['admin', 'tasks'] as const,
  adminTaskSubmissions: ['admin', 'task-submissions'] as const,
  adminTransactionHistory: ['admin', 'transaction-history'] as const,
  adminPurchaseHistory: ['admin', 'purchase-history'] as const,
  adminStats: ['admin', 'stats'] as const,
  myTasks: ['my', 'tasks'] as const,
  mySurvey: ['my', 'survey'] as const,
  adminSurveys: ['admin', 'surveys'] as const,
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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useCertificateBackground(certificateId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.certificateBackground(certificateId),
    queryFn: () => api.get<{ background_image?: string | null }>(`/api/shop/certificates/${certificateId}/background`),
    enabled: enabled && Boolean(certificateId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPurchaseHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAccounts })
    },
  })
}

export function useRegisterStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { login: string; password: string; full_name: string; group_name?: string }) =>
      api.post<RegisterStudentResponse>('/api/admin/students/register', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAccounts })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useBulkImportStudents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      group_name?: string
      students: Array<{ last_name: string; first_name: string; middle_name?: string }>
    }) => api.post<BulkImportStudentsResponse>('/api/admin/students/bulk-import', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAccounts })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAccounts })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAccounts })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPurchaseHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
    },
  })
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: queryKeys.adminAccounts,
    queryFn: () => api.get<AccountCredential[]>('/api/admin/accounts'),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
    },
  })
}

export function useAdminCertificates() {
  return useQuery({
    queryKey: queryKeys.adminCertificates,
    queryFn: () => api.get<Certificate[]>('/api/admin/certificates'),
    staleTime: 30_000,
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

export function useAdminTaskSubmissions() {
  return useQuery({
    queryKey: queryKeys.adminTaskSubmissions,
    queryFn: () => api.get<TaskSubmission[]>('/api/admin/task-submissions'),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks })
    },
  })
}

export function useRewardTaskSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { submission_id: string; reward: number }) =>
      api.post('/api/admin/task-submissions/reward', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTaskSubmissions })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useAdminTransactionHistory() {
  return useQuery({
    queryKey: queryKeys.adminTransactionHistory,
    queryFn: () => api.get<TransactionHistoryEntry[]>('/api/admin/cookies/history'),
  })
}

export function useAdminPurchaseHistory() {
  return useQuery({
    queryKey: queryKeys.adminPurchaseHistory,
    queryFn: () => api.get<PurchaseHistoryEntry[]>('/api/admin/purchases'),
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => api.get<Stats>('/api/admin/stats'),
    refetchInterval: 30000,
  })
}

export function useMySurvey() {
  return useQuery({
    queryKey: queryKeys.mySurvey,
    queryFn: () => api.get<SurveySubmission | null>('/api/me/survey'),
  })
}

export function useMyTasks() {
  return useQuery({
    queryKey: queryKeys.myTasks,
    queryFn: () => api.get<Task[]>('/api/me/tasks'),
  })
}

export function useSubmitTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { task_id: string; response_text?: string; response_url?: string }) =>
      api.post(`/api/me/tasks/${payload.task_id}/submit`, {
        response_text: payload.response_text,
        response_url: payload.response_url,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks })
    },
  })
}

export function useSubmitSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { answers: Array<{ question_id: number; answer: string }> }) =>
      api.post('/api/me/survey', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mySurvey })
    },
  })
}

export function useAdminSurveys() {
  return useQuery({
    queryKey: queryKeys.adminSurveys,
    queryFn: () => api.get<SurveySubmission[]>('/api/admin/surveys'),
  })
}

export function useRewardSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { submission_id: string; reward: number }) =>
      api.post('/api/admin/surveys/reward', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSurveys })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
    },
  })
}

