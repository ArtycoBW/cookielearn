import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  AccountCredential,
  DailyBonusClaimResponse,
  BulkImportStudentsResponse,
  Certificate,
  Material,
  MaterialInput,
  ProfileSummary,
  LeaderboardEntry,
  PurchaseHistoryEntry,
  Profile,
  Purchase,
  RandomBonusResponse,
  RegisterStudentResponse,
  SelfBeliefAnswerResult,
  SelfBeliefOverview,
  SelfBeliefQuiz,
  SelfBeliefQuizAttemptResult,
  SelfBeliefQuizInput,
  SelfBeliefQuizOverview,
  SelfBeliefQuestion,
  SelfBeliefQuestionInput,
  SelfBeliefQuestionResponse,
  SelfBeliefQuizStartResult,
  SelfBeliefQuizAnswerSubmission,
  Stats,
  SurveySubmission,
  Task,
  TaskSubmission,
  Transaction,
  TransactionHistoryEntry,
} from './types'

export const queryKeys = {
  profile: ['profile'] as const,
  profileSummary: ['profile', 'summary'] as const,
  transactions: ['transactions'] as const,
  certificates: ['certificates'] as const,
  materials: ['materials'] as const,
  purchases: ['purchases'] as const,
  leaderboard: ['leaderboard'] as const,
  shopCertificates: ['shop', 'certificates'] as const,
  certificateBackground: (id: string) => ['shop', 'certificates', id, 'background'] as const,
  adminStudents: ['admin', 'students'] as const,
  adminAccounts: ['admin', 'accounts'] as const,
  adminCertificates: ['admin', 'certificates'] as const,
  adminMaterials: ['admin', 'materials'] as const,
  adminTasks: ['admin', 'tasks'] as const,
  adminTaskSubmissions: ['admin', 'task-submissions'] as const,
  adminTransactionHistory: ['admin', 'transaction-history'] as const,
  adminPurchaseHistory: ['admin', 'purchase-history'] as const,
  adminStats: ['admin', 'stats'] as const,
  myTasks: ['my', 'tasks'] as const,
  mySurvey: ['my', 'survey'] as const,
  selfBeliefOverview: ['self-belief', 'overview'] as const,
  selfBeliefQuizOverview: ['self-belief', 'quiz-overview'] as const,
  selfBeliefQuizzes: ['self-belief', 'quizzes'] as const,
  selfBeliefQuestion: (wager: number, category: string, seed: number) => ['self-belief', 'question', wager, category, seed] as const,
  adminSelfBeliefQuestions: ['admin', 'self-belief', 'questions'] as const,
  adminSelfBeliefQuizzes: ['admin', 'self-belief', 'quizzes'] as const,
  adminSurveys: ['admin', 'surveys'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api.get<Profile>('/api/me'),
  })
}

export function useProfileSummary() {
  return useQuery({
    queryKey: queryKeys.profileSummary,
    queryFn: () => api.get<ProfileSummary>('/api/me/profile-summary'),
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => api.get<Transaction[]>('/api/me/transactions'),
  })
}

export function useMaterials() {
  return useQuery({
    queryKey: queryKeys.materials,
    queryFn: () => api.get<Material[]>('/api/materials'),
    staleTime: 60_000,
  })
}

export function useSelfBeliefOverview() {
  return useQuery({
    queryKey: queryKeys.selfBeliefOverview,
    queryFn: () => api.get<SelfBeliefOverview>('/api/me/self-belief'),
  })
}

export function useSelfBeliefQuizOverview() {
  return useQuery({
    queryKey: queryKeys.selfBeliefQuizOverview,
    queryFn: async (): Promise<SelfBeliefQuizOverview> => {
      const data = await api.get<SelfBeliefQuizOverview>('/api/me/self-belief/overview')
      return {
        stats: data?.stats ?? {
          matches_played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          net_reward: 0,
          win_rate: 0,
        },
        recent_attempts: Array.isArray(data?.recent_attempts) ? data.recent_attempts : [],
        completed_quiz_ids: Array.isArray(data?.completed_quiz_ids) ? data.completed_quiz_ids : [],
      }
    },
  })
}

export function useSelfBeliefQuizzes() {
  return useQuery({
    queryKey: queryKeys.selfBeliefQuizzes,
    queryFn: async () => {
      const data = await api.get<SelfBeliefQuiz[]>('/api/me/self-belief/quizzes')
      return Array.isArray(data) ? data : []
    },
    staleTime: 30_000,
  })
}

export function useSelfBeliefQuestion(wager: number, category: string | undefined, seed: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.selfBeliefQuestion(wager, category || 'all', seed),
    queryFn: () => {
      const params = new URLSearchParams({ wager: String(wager) })
      if (category) {
        params.set('category', category)
      }
      return api.get<SelfBeliefQuestionResponse>(`/api/me/self-belief/question?${params.toString()}`)
    },
    enabled: enabled && Number.isFinite(wager),
    refetchOnWindowFocus: false,
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
    mutationFn: () => api.post<DailyBonusClaimResponse>('/api/me/daily-bonus'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}

export function useBuyRandomBonus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload?: { cost?: number }) => api.post<RandomBonusResponse>('/api/shop/random-bonus/buy', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}

export function useAnswerSelfBeliefQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { question_id: string; wager: number; selected_option: number }) =>
      api.post<SelfBeliefAnswerResult>('/api/me/self-belief/answer', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefOverview })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useStartSelfBeliefQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (quizId: string) => api.post<SelfBeliefQuizStartResult>(`/api/me/self-belief/quizzes/${quizId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizOverview })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useFinishSelfBeliefQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { attempt_id: string; answers: SelfBeliefQuizAnswerSubmission[] }) =>
      api.post<SelfBeliefQuizAttemptResult>(`/api/me/self-belief/attempts/${payload.attempt_id}/finish`, {
        answers: payload.answers,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizOverview })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizzes })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}

export function useBuyCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (certificateId: string) => api.post(`/api/shop/certificates/${certificateId}/buy`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases })
      queryClient.invalidateQueries({ queryKey: queryKeys.shopCertificates })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPurchaseHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTransactionHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
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
    mutationFn: (payload: { user_id: string; amount: number; reason: string; category?: string; badge_icon?: string; badge_title?: string }) =>
      api.post('/api/admin/cookies/award', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
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

export function useAdminMaterials() {
  return useQuery({
    queryKey: queryKeys.adminMaterials,
    queryFn: () => api.get<Material[]>('/api/admin/materials'),
    staleTime: 30_000,
  })
}

export function useAdminSelfBeliefQuestions() {
  return useQuery({
    queryKey: queryKeys.adminSelfBeliefQuestions,
    queryFn: async () => {
      const data = await api.get<SelfBeliefQuestion[]>('/api/admin/self-belief/questions')
      return Array.isArray(data) ? data : []
    },
    staleTime: 30_000,
  })
}

export function useAdminSelfBeliefQuizzes() {
  return useQuery({
    queryKey: queryKeys.adminSelfBeliefQuizzes,
    queryFn: async () => {
      const data = await api.get<SelfBeliefQuiz[]>('/api/admin/self-belief/quizzes')
      return Array.isArray(data) ? data : []
    },
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

export function useCreateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MaterialInput) => api.post('/api/admin/materials', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminMaterials })
      queryClient.invalidateQueries({ queryKey: queryKeys.materials })
    },
  })
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Material) => api.put(`/api/admin/materials/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminMaterials })
      queryClient.invalidateQueries({ queryKey: queryKeys.materials })
    },
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminMaterials })
      queryClient.invalidateQueries({ queryKey: queryKeys.materials })
    },
  })
}

export function useCreateSelfBeliefQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SelfBeliefQuestionInput) => api.post('/api/admin/self-belief/questions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSelfBeliefQuestions })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefOverview })
    },
  })
}

export function useUpdateSelfBeliefQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SelfBeliefQuestion) => api.put(`/api/admin/self-belief/questions/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSelfBeliefQuestions })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefOverview })
    },
  })
}

export function useDeleteSelfBeliefQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/self-belief/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSelfBeliefQuestions })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefOverview })
    },
  })
}

export function useCreateSelfBeliefQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SelfBeliefQuizInput) => api.post<SelfBeliefQuiz>('/api/admin/self-belief/quizzes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSelfBeliefQuizzes })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizzes })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizOverview })
    },
  })
}

export function useUpdateSelfBeliefQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SelfBeliefQuiz) => api.put<SelfBeliefQuiz>(`/api/admin/self-belief/quizzes/${payload.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSelfBeliefQuizzes })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizzes })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizOverview })
    },
  })
}

export function useDeleteSelfBeliefQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/self-belief/quizzes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSelfBeliefQuizzes })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizzes })
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBeliefQuizOverview })
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

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/api/admin/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTaskSubmissions })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSummary })
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
