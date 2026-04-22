export interface BadgeAward {
  id: string
  icon: string
  title: string
  reason: string
  created_at: string
}

export interface BadgePreview {
  icon: string
  title: string
  reason: string
}

export interface Profile {
  id: string
  full_name: string
  group_name?: string | null
  login?: string | null
  role: 'student' | 'admin'
  balance: number
  total_earned: number
  activity_score: number
  level_name?: string | null
  next_level_name?: string | null
  level_progress: number
  submitted_tasks: number
  reviewed_tasks: number
  purchase_count: number
  survey_completed: boolean
  badge_count: number
  badges?: BadgeAward[]
  created_at: string
  last_login_at?: string | null
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  reason: string
  category?:
    | 'daily_bonus'
    | 'manual'
    | 'purchase'
    | 'random_bonus'
    | 'task_reward'
    | 'survey_reward'
    | 'streak_bonus'
    | 'self_belief_quiz'
    | null
  badge_icon?: string | null
  badge_title?: string | null
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
  category?:
    | 'daily_bonus'
    | 'manual'
    | 'purchase'
    | 'random_bonus'
    | 'task_reward'
    | 'survey_reward'
    | 'streak_bonus'
    | 'self_belief_quiz'
    | null
  badge_icon?: string | null
  badge_title?: string | null
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

export interface Material {
  id: string
  title: string
  description?: string | null
  category: string
  format: string
  url: string
  storage_bucket?: string | null
  storage_path?: string | null
  file_name?: string | null
  mime_type?: string | null
  file_size?: number | null
  estimated_minutes?: number | null
  is_published: boolean
  is_featured: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export type MaterialInput = Omit<Material, 'id' | 'created_at' | 'updated_at' | 'created_by'>

export interface SelfBeliefQuestion {
  id: string
  category: string
  wager: number
  prompt: string
  options: string[]
  correct_option: number
  explanation?: string | null
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface SelfBeliefQuestionPublic {
  id: string
  category: string
  wager: number
  prompt: string
  options: string[]
}

export interface SelfBeliefAttempt {
  id: string
  user_id: string
  question_id: string
  category: string
  wager: number
  selected_option: number
  correct_option: number
  prompt: string
  options: string[]
  is_correct: boolean
  reward_delta: number
  balance_after: number
  explanation?: string | null
  created_at: string
}

export interface SelfBeliefStats {
  total_attempts: number
  correct_attempts: number
  net_reward: number
  accuracy_percent: number
}

export interface SelfBeliefOverview {
  stats: SelfBeliefStats
  categories: string[]
  recent_attempts: SelfBeliefAttempt[]
}

export interface SelfBeliefQuestionResponse {
  question: SelfBeliefQuestionPublic | null
  exhausted: boolean
  message?: string
}

export interface SelfBeliefAnswerResult {
  attempt: SelfBeliefAttempt
  message: string
}

export type SelfBeliefQuestionInput = Omit<SelfBeliefQuestion, 'id' | 'created_at' | 'updated_at' | 'created_by'>

export interface SelfBeliefQuizQuestionLink {
  question_id: string
  position: number
}

export interface SelfBeliefQuiz {
  id: string
  title: string
  description?: string | null
  wager: number
  time_limit_seconds: number
  is_active: boolean
  question_count: number
  questions: SelfBeliefQuizQuestionLink[]
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface SelfBeliefQuizPublicQuestion {
  id: string
  category: string
  prompt: string
  options: string[]
  position: number
  corgi_selected_option: number
  corgi_reveal_after_ms: number
}

export interface SelfBeliefQuizPublic {
  id: string
  title: string
  description?: string | null
  wager: number
  time_limit_seconds: number
  question_count: number
  questions: SelfBeliefQuizPublicQuestion[]
}

export interface SelfBeliefQuizStartResult {
  attempt_id: string
  quiz: SelfBeliefQuizPublic
  entry_cost: number
  balance_after_entry: number
  started_at: string
  message: string
}

export interface SelfBeliefQuizAnswerSubmission {
  question_id: string
  selected_option?: number | null
  timed_out: boolean
  response_ms: number
}

export interface SelfBeliefQuizQuestionResult {
  question_id: string
  position: number
  category: string
  prompt: string
  options: string[]
  correct_option: number
  selected_option?: number | null
  response_ms: number
  timed_out: boolean
  is_correct: boolean
  corgi_selected_option: number
  corgi_is_correct: boolean
  explanation?: string | null
  created_at: string
}

export interface SelfBeliefQuizAttemptSummary {
  id: string
  quiz_id: string
  quiz_title: string
  wager: number
  outcome: 'win' | 'draw' | 'lose'
  total_questions: number
  user_correct_count: number
  corgi_correct_count: number
  entry_cost: number
  payout: number
  net_reward: number
  started_at: string
  finished_at?: string | null
}

export interface SelfBeliefQuizAttemptResult {
  attempt_id: string
  quiz_id: string
  quiz_title: string
  wager: number
  outcome: 'win' | 'draw' | 'lose'
  entry_cost: number
  payout: number
  net_reward: number
  total_questions: number
  user_correct_count: number
  corgi_correct_count: number
  balance_after: number
  message: string
  questions: SelfBeliefQuizQuestionResult[]
  finished_at: string
}

export interface SelfBeliefQuizOverviewStats {
  matches_played: number
  wins: number
  draws: number
  losses: number
  net_reward: number
  win_rate: number
}

export interface SelfBeliefQuizOverview {
  stats: SelfBeliefQuizOverviewStats
  recent_attempts: SelfBeliefQuizAttemptSummary[]
  completed_quiz_ids?: string[]
}

export type SelfBeliefQuizInput = Omit<SelfBeliefQuiz, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'question_count'>

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

export interface StreakSummary {
  current: number
  longest: number
  last_claimed_at?: string | null
  can_claim_today: boolean
  next_milestone: number
  days_to_next_milestone: number
}

export interface ActivityHeatmapDay {
  date: string
  count: number
  intensity: number
  is_today: boolean
}

export interface ProfileRecentActivity {
  id: string
  type: 'transaction' | 'task_submission' | string
  title: string
  subtitle?: string | null
  amount?: number | null
  created_at: string
}

export interface FavoriteTaskCategory {
  value: string
  label: string
  submission_count: number
}

export interface ProfileSummary {
  profile: Profile
  rank: number
  streak: StreakSummary
  activity_days: ActivityHeatmapDay[]
  active_days_count: number
  recent_activities: ProfileRecentActivity[]
  recent_certificates: Purchase[]
  favorite_task_category?: FavoriteTaskCategory | null
}

export interface DailyBonusClaimResult {
  bonus: DailyBonus
  base_reward: number
  streak_reward: number
  total_reward: number
  streak: StreakSummary
  badge?: BadgePreview | null
}

export interface DailyBonusClaimResponse {
  success: boolean
  claim: DailyBonusClaimResult
  message: string
}

export interface RandomBonusResponse {
  success: boolean
  cost: number
  reward: number
  message: string
}

export interface LeaderboardEntry {
  id: string
  full_name: string
  group_name?: string | null
  login?: string | null
  balance: number
  total_earned: number
  activity_score: number
  level_name: string
  next_level_name?: string | null
  level_progress: number
  badge_count: number
  badges?: BadgeAward[]
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
