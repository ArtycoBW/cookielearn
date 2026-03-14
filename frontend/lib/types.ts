export interface Profile {
  id: string
  full_name: string
  group_name?: string | null
  login?: string | null
  role: 'student' | 'admin'
  balance: number
  created_at: string
  last_login_at?: string | null
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  reason: string
  category?: 'daily_bonus' | 'manual' | 'purchase' | 'random_bonus' | 'task_reward' | 'survey_reward' | null
  created_by?: string | null
  created_at: string
}

export interface TransactionHistoryEntry {
  id: string
  user_id: string
  user_full_name: string
  user_group_name?: string | null
  user_login?: string | null
  amount: number
  reason: string
  category?: 'daily_bonus' | 'manual' | 'purchase' | 'random_bonus' | 'task_reward' | 'survey_reward' | null
  created_by?: string | null
  created_by_name?: string | null
  created_at: string
}

export interface Certificate {
  id: string
  title: string
  description?: string | null
  base_price: number
  current_price: number
  inflation_step: number
  total_quantity?: number | null
  remaining_quantity?: number | null
  validity_days?: number | null
  expires_at?: string | null
  background_image?: string | null
  has_background?: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  user_id: string
  certificate_id: string
  price_paid: number
  purchased_at: string
  expires_at?: string | null
  used_at?: string | null
  status: 'active' | 'used' | 'expired'
  certificate?: Certificate
}

export interface PurchaseHistoryEntry {
  id: string
  user_id: string
  user_full_name: string
  user_group_name?: string | null
  user_login?: string | null
  certificate_id: string
  certificate_title: string
  price_paid: number
  purchased_at: string
  expires_at?: string | null
  used_at?: string | null
  status: 'active' | 'used' | 'expired'
}

export interface DailyBonus {
  id: string
  user_id: string
  awarded_at: string
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  full_name: string
  group_name?: string | null
  login?: string | null
  balance: number
  rank: number
}

export interface Task {
  id: string
  title: string
  description?: string | null
  type: string
  reward: number
  deadline?: string | null
  status: 'active' | 'closed'
  created_by?: string | null
  created_at: string
  closed_at?: string | null
  submission_count?: number
  reviewed_count?: number
  my_submission?: TaskSubmission | null
}

export interface TaskSubmission {
  id: string
  task_id: string
  user_id: string
  response_text?: string | null
  response_url?: string | null
  submitted_at: string
  reviewed: boolean
  reward_given?: number | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  user?: Profile
  task?: Task
}

export interface Stats {
  total_users: number
  total_students: number
  total_cookies: number
  total_transactions: number
  avg_balance: number
  active_tasks: number
  total_purchases: number
}

export interface StudentAccount {
  id: string
  login: string
  email: string
  password: string
  full_name: string
}

export interface AccountCredential {
  user_id: string
  full_name: string
  group_name?: string | null
  role: 'student' | 'admin'
  login: string
  email: string
  password: string
  created_at: string
  updated_at: string
}

export interface RegisterStudentResponse {
  success: boolean
  account: StudentAccount
  message: string
}

export interface BulkImportStudentsResponse {
  success: boolean
  created_count: number
  accounts: StudentAccount[]
  message: string
}

export interface SurveyAnswer {
  question_id: number
  answer: string
}

export interface SurveySubmission {
  id: string
  user_id: string
  answers: SurveyAnswer[]
  submitted_at: string
  reviewed: boolean
  reward_given?: number | null
  user?: Profile
}


