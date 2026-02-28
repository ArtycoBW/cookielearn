export interface Profile {
  id: string
  full_name: string
  group_name?: string
  role: 'student' | 'admin'
  balance: number
  created_at: string
  last_login_at?: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  reason: string
  category?: 'daily_bonus' | 'manual' | 'purchase' | 'random_bonus' | 'task_reward'
  created_by?: string
  created_at: string
}

export interface Certificate {
  id: string
  title: string
  description?: string
  base_price: number
  current_price: number
  inflation_step: number
  total_quantity?: number
  remaining_quantity?: number
  validity_days?: number
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
  expires_at?: string
  used_at?: string
  status: 'active' | 'used' | 'expired'
  certificate?: Certificate
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
  group_name?: string
  balance: number
  rank: number
}
