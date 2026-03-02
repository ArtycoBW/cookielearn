package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
)

type StatsRepository struct {
	db *DB
}

func NewStatsRepository(db *DB) *StatsRepository {
	return &StatsRepository{db: db}
}

func (r *StatsRepository) GetStats(ctx context.Context) (*model.Stats, error) {
	query := `
		SELECT
			(SELECT COUNT(*) FROM profiles) AS total_users,
			(SELECT COUNT(*) FROM profiles WHERE role = 'student') AS total_students,
			COALESCE((SELECT SUM(balance) FROM profiles WHERE role = 'student'), 0) AS total_cookies,
			(SELECT COUNT(*) FROM cookie_transactions) AS total_transactions,
			COALESCE((SELECT AVG(balance)::float8 FROM profiles WHERE role = 'student'), 0) AS avg_balance,
			(SELECT COUNT(*) FROM tasks WHERE status = 'active') AS active_tasks,
			(SELECT COUNT(*) FROM purchases) AS total_purchases
	`

	var stats model.Stats
	if err := r.db.Pool.QueryRow(ctx, query).Scan(
		&stats.TotalUsers,
		&stats.TotalStudents,
		&stats.TotalCookies,
		&stats.TotalTransactions,
		&stats.AvgBalance,
		&stats.ActiveTasks,
		&stats.TotalPurchases,
	); err != nil {
		return nil, fmt.Errorf("get stats: %w", err)
	}

	return &stats, nil
}
