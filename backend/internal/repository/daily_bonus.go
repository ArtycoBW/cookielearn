package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/cookielearn/backend/internal/model"
)

type DailyBonusRepository struct {
	db *DB
}

func NewDailyBonusRepository(db *DB) *DailyBonusRepository {
	return &DailyBonusRepository{db: db}
}

func (r *DailyBonusRepository) Create(ctx context.Context, userID string) (*model.DailyBonus, error) {
	query := `
		INSERT INTO daily_bonuses (user_id, awarded_at)
		VALUES ($1, CURRENT_DATE)
		RETURNING id, user_id, awarded_at, created_at
	`

	var bonus model.DailyBonus
	err := r.db.Pool.QueryRow(ctx, query, userID).Scan(
		&bonus.ID, &bonus.UserID, &bonus.AwardedAt, &bonus.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("create daily bonus: %w", err)
	}

	return &bonus, nil
}

func (r *DailyBonusRepository) HasClaimedToday(ctx context.Context, userID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM daily_bonuses
			WHERE user_id = $1 AND awarded_at = CURRENT_DATE
		)
	`

	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check daily bonus: %w", err)
	}

	return exists, nil
}

func (r *DailyBonusRepository) GetAwardedDates(ctx context.Context, userID string) ([]time.Time, error) {
	query := `
		SELECT awarded_at
		FROM daily_bonuses
		WHERE user_id = $1
		ORDER BY awarded_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get awarded dates: %w", err)
	}
	defer rows.Close()

	dates := make([]time.Time, 0)
	for rows.Next() {
		var awardedAt time.Time
		if err := rows.Scan(&awardedAt); err != nil {
			return nil, fmt.Errorf("scan awarded date: %w", err)
		}
		dates = append(dates, awardedAt)
	}

	return dates, nil
}
