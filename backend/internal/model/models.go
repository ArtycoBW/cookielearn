package model

import "time"

type Profile struct {
	ID          string     `json:"id"`
	FullName    string     `json:"full_name"`
	GroupName   *string    `json:"group_name"`
	Role        string     `json:"role"`
	Balance     int        `json:"balance"`
	CreatedAt   time.Time  `json:"created_at"`
	LastLoginAt *time.Time `json:"last_login_at"`
}

type Transaction struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	Amount    int        `json:"amount"`
	Reason    string     `json:"reason"`
	Category  *string    `json:"category"`
	CreatedBy *string    `json:"created_by"`
	CreatedAt time.Time  `json:"created_at"`
}

type Certificate struct {
	ID                string     `json:"id"`
	Title             string     `json:"title"`
	Description       *string    `json:"description"`
	BasePrice         int        `json:"base_price"`
	CurrentPrice      int        `json:"current_price"`
	InflationStep     int        `json:"inflation_step"`
	TotalQuantity     *int       `json:"total_quantity"`
	RemainingQuantity *int       `json:"remaining_quantity"`
	ValidityDays      *int       `json:"validity_days"`
	IsActive          bool       `json:"is_active"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type Purchase struct {
	ID            string     `json:"id"`
	UserID        string     `json:"user_id"`
	CertificateID string     `json:"certificate_id"`
	PricePaid     int        `json:"price_paid"`
	PurchasedAt   time.Time  `json:"purchased_at"`
	ExpiresAt     *time.Time `json:"expires_at"`
	UsedAt        *time.Time `json:"used_at"`
	Status        string     `json:"status"`
	
	Certificate   *Certificate `json:"certificate,omitempty"`
}

type DailyBonus struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	AwardedAt time.Time `json:"awarded_at"`
	CreatedAt time.Time `json:"created_at"`
}

type Task struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Type        string     `json:"type"`
	Reward      int        `json:"reward"`
	Deadline    *time.Time `json:"deadline"`
	Status      string     `json:"status"`
	CreatedBy   *string    `json:"created_by"`
	CreatedAt   time.Time  `json:"created_at"`
	ClosedAt    *time.Time `json:"closed_at"`
}

type Vote struct {
	ID         string    `json:"id"`
	TaskID     string    `json:"task_id"`
	VoterID    string    `json:"voter_id"`
	NomineeID  string    `json:"nominee_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type LeaderboardEntry struct {
	ID        string  `json:"id"`
	FullName  string  `json:"full_name"`
	GroupName *string `json:"group_name"`
	Balance   int     `json:"balance"`
	Rank      int     `json:"rank"`
}

type Stats struct {
	TotalUsers        int     `json:"total_users"`
	TotalStudents     int     `json:"total_students"`
	TotalCookies      int     `json:"total_cookies"`
	TotalTransactions int     `json:"total_transactions"`
	AvgBalance        float64 `json:"avg_balance"`
	ActiveTasks       int     `json:"active_tasks"`
	TotalPurchases    int     `json:"total_purchases"`
}
