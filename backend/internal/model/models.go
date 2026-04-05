package model

import "time"

type Profile struct {
	ID          string     `json:"id"`
	FullName    string     `json:"full_name"`
	GroupName   *string    `json:"group_name"`
	Login       *string    `json:"login,omitempty"`
	Role        string     `json:"role"`
	Balance     int        `json:"balance"`
	TotalEarned int        `json:"total_earned"`
	ActivityScore int      `json:"activity_score"`
	LevelName   string     `json:"level_name,omitempty"`
	NextLevelName *string  `json:"next_level_name,omitempty"`
	LevelProgress int      `json:"level_progress"`
	SubmittedTasks int     `json:"submitted_tasks"`
	ReviewedTasks int      `json:"reviewed_tasks"`
	PurchaseCount int      `json:"purchase_count"`
	SurveyCompleted bool   `json:"survey_completed"`
	BadgeCount   int       `json:"badge_count"`
	Badges       []BadgeAward `json:"badges,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	LastLoginAt *time.Time `json:"last_login_at"`
}

type Transaction struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Amount    int       `json:"amount"`
	Reason    string    `json:"reason"`
	Category  *string   `json:"category"`
	BadgeIcon *string   `json:"badge_icon,omitempty"`
	BadgeTitle *string  `json:"badge_title,omitempty"`
	CreatedBy *string   `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

type TransactionHistoryEntry struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	UserFullName  string    `json:"user_full_name"`
	UserGroupName *string   `json:"user_group_name"`
	UserLogin     *string   `json:"user_login"`
	Amount        int       `json:"amount"`
	Reason        string    `json:"reason"`
	Category      *string   `json:"category"`
	BadgeIcon     *string   `json:"badge_icon,omitempty"`
	BadgeTitle    *string   `json:"badge_title,omitempty"`
	CreatedBy     *string   `json:"created_by"`
	CreatedByName *string   `json:"created_by_name"`
	CreatedAt     time.Time `json:"created_at"`
}

type BadgeAward struct {
	ID        string    `json:"id"`
	Icon      string    `json:"icon"`
	Title     string    `json:"title"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
}

type BadgePreview struct {
	Icon   string `json:"icon"`
	Title  string `json:"title"`
	Reason string `json:"reason"`
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
	ExpiresAt         *time.Time `json:"expires_at"`
	BackgroundImage   *string    `json:"background_image"`
	HasBackground     bool       `json:"has_background,omitempty"`
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

	Certificate *Certificate `json:"certificate,omitempty"`
}

type PurchaseHistoryEntry struct {
	ID               string     `json:"id"`
	UserID           string     `json:"user_id"`
	UserFullName     string     `json:"user_full_name"`
	UserGroupName    *string    `json:"user_group_name"`
	UserLogin        *string    `json:"user_login"`
	CertificateID    string     `json:"certificate_id"`
	CertificateTitle string     `json:"certificate_title"`
	PricePaid        int        `json:"price_paid"`
	PurchasedAt      time.Time  `json:"purchased_at"`
	ExpiresAt        *time.Time `json:"expires_at"`
	UsedAt           *time.Time `json:"used_at"`
	Status           string     `json:"status"`
}

type DailyBonus struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	AwardedAt time.Time `json:"awarded_at"`
	CreatedAt time.Time `json:"created_at"`
}

type StreakSummary struct {
	Current            int        `json:"current"`
	Longest            int        `json:"longest"`
	LastClaimedAt      *time.Time `json:"last_claimed_at,omitempty"`
	CanClaimToday      bool       `json:"can_claim_today"`
	NextMilestone      int        `json:"next_milestone"`
	DaysToNextMilestone int       `json:"days_to_next_milestone"`
}

type ActivityHeatmapDay struct {
	Date      string `json:"date"`
	Count     int    `json:"count"`
	Intensity int    `json:"intensity"`
	IsToday   bool   `json:"is_today"`
}

type ProfileRecentActivity struct {
	ID        string     `json:"id"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Subtitle  *string    `json:"subtitle,omitempty"`
	Amount    *int       `json:"amount,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type FavoriteTaskCategory struct {
	Value           string `json:"value"`
	Label           string `json:"label"`
	SubmissionCount int    `json:"submission_count"`
}

type ProfileSummary struct {
	Profile              *Profile               `json:"profile"`
	Rank                 int                    `json:"rank"`
	Streak               StreakSummary          `json:"streak"`
	ActivityDays         []ActivityHeatmapDay   `json:"activity_days"`
	ActiveDaysCount      int                    `json:"active_days_count"`
	RecentActivities     []ProfileRecentActivity `json:"recent_activities"`
	RecentCertificates   []*Purchase            `json:"recent_certificates"`
	FavoriteTaskCategory *FavoriteTaskCategory  `json:"favorite_task_category,omitempty"`
}

type DailyBonusClaimResult struct {
	Bonus        *DailyBonus    `json:"bonus"`
	BaseReward   int            `json:"base_reward"`
	StreakReward int            `json:"streak_reward"`
	TotalReward  int            `json:"total_reward"`
	Streak       StreakSummary  `json:"streak"`
	Badge        *BadgePreview  `json:"badge,omitempty"`
}

type Task struct {
	ID              string          `json:"id"`
	Title           string          `json:"title"`
	Description     *string         `json:"description"`
	Type            string          `json:"type"`
	Reward          int             `json:"reward"`
	Deadline        *time.Time      `json:"deadline"`
	Status          string          `json:"status"`
	CreatedBy       *string         `json:"created_by"`
	CreatedAt       time.Time       `json:"created_at"`
	ClosedAt        *time.Time      `json:"closed_at"`
	SubmissionCount int             `json:"submission_count,omitempty"`
	ReviewedCount   int             `json:"reviewed_count,omitempty"`
	MySubmission    *TaskSubmission `json:"my_submission,omitempty"`
}

type Vote struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	VoterID   string    `json:"voter_id"`
	NomineeID string    `json:"nominee_id"`
	CreatedAt time.Time `json:"created_at"`
}

type TaskSubmission struct {
	ID           string     `json:"id"`
	TaskID       string     `json:"task_id"`
	UserID       string     `json:"user_id"`
	ResponseText *string    `json:"response_text,omitempty"`
	ResponseURL  *string    `json:"response_url,omitempty"`
	SubmittedAt  time.Time  `json:"submitted_at"`
	Reviewed     bool       `json:"reviewed"`
	RewardGiven  *int       `json:"reward_given,omitempty"`
	ReviewedAt   *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy   *string    `json:"reviewed_by,omitempty"`
	User         *Profile   `json:"user,omitempty"`
	Task         *Task      `json:"task,omitempty"`
}

type LeaderboardEntry struct {
	ID            string       `json:"id"`
	FullName      string       `json:"full_name"`
	GroupName     *string      `json:"group_name"`
	Login         *string      `json:"login,omitempty"`
	Balance       int          `json:"balance"`
	TotalEarned   int          `json:"total_earned"`
	ActivityScore int          `json:"activity_score"`
	LevelName     string       `json:"level_name"`
	NextLevelName *string      `json:"next_level_name,omitempty"`
	LevelProgress int          `json:"level_progress"`
	BadgeCount    int          `json:"badge_count"`
	Badges        []BadgeAward `json:"badges,omitempty"`
	Rank          int          `json:"rank"`
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

type AccountCredential struct {
	UserID    string    `json:"user_id"`
	FullName  string    `json:"full_name"`
	GroupName *string   `json:"group_name"`
	Role      string    `json:"role"`
	Login     string    `json:"login"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SurveyAnswer struct {
	QuestionID int    `json:"question_id"`
	Answer     string `json:"answer"`
}

type SurveySubmission struct {
	ID          string         `json:"id"`
	UserID      string         `json:"user_id"`
	Answers     []SurveyAnswer `json:"answers"`
	SubmittedAt time.Time      `json:"submitted_at"`
	Reviewed    bool           `json:"reviewed"`
	RewardGiven *int           `json:"reward_given,omitempty"`
	User        *Profile       `json:"user,omitempty"`
}
