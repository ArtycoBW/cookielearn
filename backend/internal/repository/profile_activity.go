package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
)

type ProfileActivityMetrics struct {
	TotalEarned     int
	SubmittedTasks  int
	ReviewedTasks   int
	PurchaseCount   int
	SurveyCompleted bool
	BadgeCount      int
}

func (r *ProfileRepository) GetActivityMetrics(ctx context.Context, userIDs []string) (map[string]ProfileActivityMetrics, error) {
	if len(userIDs) == 0 {
		return map[string]ProfileActivityMetrics{}, nil
	}

	queryWithBadges := `
		WITH scoped_users AS (
			SELECT UNNEST($1::uuid[]) AS user_id
		),
		transaction_metrics AS (
			SELECT
				user_id,
				COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::INT AS total_earned,
				COUNT(*) FILTER (WHERE badge_icon IS NOT NULL AND badge_title IS NOT NULL)::INT AS badge_count
			FROM cookie_transactions
			WHERE user_id = ANY($1::uuid[])
			GROUP BY user_id
		),
		task_metrics AS (
			SELECT
				user_id,
				COUNT(*)::INT AS submitted_tasks,
				COUNT(*) FILTER (WHERE reviewed = TRUE)::INT AS reviewed_tasks
			FROM task_submissions
			WHERE user_id = ANY($1::uuid[])
			GROUP BY user_id
		),
		purchase_metrics AS (
			SELECT
				user_id,
				COUNT(*)::INT AS purchase_count
			FROM purchases
			WHERE user_id = ANY($1::uuid[])
			GROUP BY user_id
		),
		survey_metrics AS (
			SELECT
				user_id,
				TRUE AS survey_completed
			FROM survey_submissions
			WHERE user_id = ANY($1::uuid[])
			GROUP BY user_id
		)
		SELECT
			u.user_id::text,
			COALESCE(tm.total_earned, 0),
			COALESCE(ts.submitted_tasks, 0),
			COALESCE(ts.reviewed_tasks, 0),
			COALESCE(pm.purchase_count, 0),
			COALESCE(sm.survey_completed, FALSE),
			COALESCE(tm.badge_count, 0)
		FROM scoped_users u
		LEFT JOIN transaction_metrics tm ON tm.user_id = u.user_id
		LEFT JOIN task_metrics ts ON ts.user_id = u.user_id
		LEFT JOIN purchase_metrics pm ON pm.user_id = u.user_id
		LEFT JOIN survey_metrics sm ON sm.user_id = u.user_id
	`

	queryWithoutBadges := `
		WITH scoped_users AS (
			SELECT UNNEST($1::uuid[]) AS user_id
		),
		transaction_metrics AS (
			SELECT
				user_id,
				COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::INT AS total_earned,
				0::INT AS badge_count
			FROM cookie_transactions
			WHERE user_id = ANY($1::uuid[])
			GROUP BY user_id
		),
		task_metrics AS (
			SELECT
				user_id,
				COUNT(*)::INT AS submitted_tasks,
				COUNT(*) FILTER (WHERE reviewed = TRUE)::INT AS reviewed_tasks
			FROM task_submissions
			WHERE user_id = ANY($1::uuid[])
			GROUP BY user_id
		),
		purchase_metrics AS (
			SELECT
				user_id,
				COUNT(*)::INT AS purchase_count
			FROM purchases
			WHERE user_id = ANY($1::uuid[])
			GROUP BY user_id
		),
		survey_metrics AS (
			SELECT
				user_id,
				TRUE AS survey_completed
			FROM survey_submissions
			WHERE user_id = ANY($1::uuid[])
			GROUP BY user_id
		)
		SELECT
			u.user_id::text,
			COALESCE(tm.total_earned, 0),
			COALESCE(ts.submitted_tasks, 0),
			COALESCE(ts.reviewed_tasks, 0),
			COALESCE(pm.purchase_count, 0),
			COALESCE(sm.survey_completed, FALSE),
			COALESCE(tm.badge_count, 0)
		FROM scoped_users u
		LEFT JOIN transaction_metrics tm ON tm.user_id = u.user_id
		LEFT JOIN task_metrics ts ON ts.user_id = u.user_id
		LEFT JOIN purchase_metrics pm ON pm.user_id = u.user_id
		LEFT JOIN survey_metrics sm ON sm.user_id = u.user_id
	`

	rows, err := r.db.Pool.Query(ctx, queryWithBadges, userIDs)
	if err != nil && isUndefinedColumnError(err, "badge_icon") {
		rows, err = r.db.Pool.Query(ctx, queryWithoutBadges, userIDs)
	}
	if err != nil {
		return nil, fmt.Errorf("get activity metrics: %w", err)
	}
	defer rows.Close()

	metrics := make(map[string]ProfileActivityMetrics, len(userIDs))
	for rows.Next() {
		var (
			userID string
			item   ProfileActivityMetrics
		)

		if err := rows.Scan(
			&userID,
			&item.TotalEarned,
			&item.SubmittedTasks,
			&item.ReviewedTasks,
			&item.PurchaseCount,
			&item.SurveyCompleted,
			&item.BadgeCount,
		); err != nil {
			return nil, fmt.Errorf("scan activity metrics: %w", err)
		}

		metrics[userID] = item
	}

	return metrics, nil
}

func (r *ProfileRepository) GetRecentBadges(ctx context.Context, userIDs []string, limitPerUser int) (map[string][]model.BadgeAward, error) {
	if len(userIDs) == 0 {
		return map[string][]model.BadgeAward{}, nil
	}
	if limitPerUser <= 0 {
		limitPerUser = 3
	}

	query := `
		WITH ranked_badges AS (
			SELECT
				id,
				user_id,
				badge_icon,
				badge_title,
				reason,
				created_at,
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS badge_rank
			FROM cookie_transactions
			WHERE user_id = ANY($1::uuid[])
			  AND badge_icon IS NOT NULL
			  AND badge_title IS NOT NULL
		)
		SELECT
			id::text,
			user_id::text,
			badge_icon,
			badge_title,
			reason,
			created_at
		FROM ranked_badges
		WHERE badge_rank <= $2
		ORDER BY user_id, created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, userIDs, limitPerUser)
	if err != nil && isUndefinedColumnError(err, "badge_icon") {
		return map[string][]model.BadgeAward{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get recent badges: %w", err)
	}
	defer rows.Close()

	badges := make(map[string][]model.BadgeAward, len(userIDs))
	for rows.Next() {
		var (
			userID string
			badge  model.BadgeAward
		)

		if err := rows.Scan(
			&badge.ID,
			&userID,
			&badge.Icon,
			&badge.Title,
			&badge.Reason,
			&badge.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan badge: %w", err)
		}

		badges[userID] = append(badges[userID], badge)
	}

	return badges, nil
}
