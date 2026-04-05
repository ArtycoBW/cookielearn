package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/cookielearn/backend/internal/model"
)

func (r *ProfileRepository) GetActivityCalendar(ctx context.Context, userID string, days int) ([]model.ActivityHeatmapDay, error) {
	if days <= 0 {
		days = 140
	}

	query := `
		WITH date_window AS (
			SELECT generate_series(
				CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day'),
				CURRENT_DATE,
				INTERVAL '1 day'
			)::date AS day
		),
		activity AS (
			SELECT created_at::date AS day, COUNT(*)::int AS count
			FROM cookie_transactions
			WHERE user_id = $1
			  AND created_at::date >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
			GROUP BY created_at::date

			UNION ALL

			SELECT submitted_at::date AS day, COUNT(*)::int AS count
			FROM task_submissions
			WHERE user_id = $1
			  AND submitted_at::date >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
			GROUP BY submitted_at::date

			UNION ALL

			SELECT purchased_at::date AS day, COUNT(*)::int AS count
			FROM purchases
			WHERE user_id = $1
			  AND purchased_at::date >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
			GROUP BY purchased_at::date

			UNION ALL

			SELECT awarded_at::date AS day, COUNT(*)::int AS count
			FROM daily_bonuses
			WHERE user_id = $1
			  AND awarded_at::date >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
			GROUP BY awarded_at::date
		)
		SELECT
			to_char(dw.day, 'YYYY-MM-DD'),
			COALESCE(SUM(activity.count), 0)::int AS activity_count
		FROM date_window dw
		LEFT JOIN activity ON activity.day = dw.day
		GROUP BY dw.day
		ORDER BY dw.day
	`

	rows, err := r.db.Pool.Query(ctx, query, userID, days)
	if err != nil {
		return nil, fmt.Errorf("get activity calendar: %w", err)
	}
	defer rows.Close()

	today := time.Now().UTC().Format("2006-01-02")
	daysList := make([]model.ActivityHeatmapDay, 0, days)
	maxCount := 0
	for rows.Next() {
		var day model.ActivityHeatmapDay
		if err := rows.Scan(&day.Date, &day.Count); err != nil {
			return nil, fmt.Errorf("scan activity calendar: %w", err)
		}
		if day.Count > maxCount {
			maxCount = day.Count
		}
		day.IsToday = day.Date == today
		daysList = append(daysList, day)
	}

	for index := range daysList {
		daysList[index].Intensity = heatmapIntensity(daysList[index].Count, maxCount)
	}

	return daysList, nil
}

func (r *ProfileRepository) GetRecentActivities(ctx context.Context, userID string, limit int) ([]model.ProfileRecentActivity, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT activity_id, activity_type, title, subtitle, amount, created_at
		FROM (
			SELECT
				t.id::text AS activity_id,
				'transaction'::text AS activity_type,
				t.reason AS title,
				t.category AS subtitle,
				t.amount,
				t.created_at
			FROM cookie_transactions t
			WHERE t.user_id = $1

			UNION ALL

			SELECT
				ts.id::text AS activity_id,
				'task_submission'::text AS activity_type,
				'Ответ отправлен: ' || tasks.title AS title,
				tasks.type AS subtitle,
				NULL::int AS amount,
				ts.submitted_at AS created_at
			FROM task_submissions ts
			JOIN tasks ON tasks.id = ts.task_id
			WHERE ts.user_id = $1
		) activity_stream
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("get recent activities: %w", err)
	}
	defer rows.Close()

	activities := make([]model.ProfileRecentActivity, 0, limit)
	for rows.Next() {
		var activity model.ProfileRecentActivity
		if err := rows.Scan(
			&activity.ID,
			&activity.Type,
			&activity.Title,
			&activity.Subtitle,
			&activity.Amount,
			&activity.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan recent activity: %w", err)
		}
		activities = append(activities, activity)
	}

	return activities, nil
}

func (r *ProfileRepository) GetFavoriteTaskCategory(ctx context.Context, userID string) (*model.FavoriteTaskCategory, error) {
	query := `
		SELECT
			COALESCE(NULLIF(BTRIM(tasks.type), ''), 'other') AS task_type,
			COUNT(*)::int AS submissions_count
		FROM task_submissions
		JOIN tasks ON tasks.id = task_submissions.task_id
		WHERE task_submissions.user_id = $1
		GROUP BY task_type
		ORDER BY submissions_count DESC, task_type ASC
		LIMIT 1
	`

	var (
		taskType string
		count    int
	)
	if err := r.db.Pool.QueryRow(ctx, query, userID).Scan(&taskType, &count); err != nil {
		if isNoRowsError(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("get favorite task category: %w", err)
	}

	return &model.FavoriteTaskCategory{
		Value:           taskType,
		Label:           resolveTaskCategoryLabel(taskType),
		SubmissionCount: count,
	}, nil
}

func heatmapIntensity(count, maxCount int) int {
	if count <= 0 || maxCount <= 0 {
		return 0
	}
	if count == maxCount {
		return 4
	}

	ratio := float64(count) / float64(maxCount)
	switch {
	case ratio >= 0.75:
		return 4
	case ratio >= 0.5:
		return 3
	case ratio >= 0.25:
		return 2
	default:
		return 1
	}
}

func resolveTaskCategoryLabel(value string) string {
	switch value {
	case "feedback":
		return "Замечания по материалам"
	case "sql":
		return "SQL"
	case "meme":
		return "Мем"
	case "other":
		return "Другое"
	default:
		return value
	}
}
