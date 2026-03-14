package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/cookielearn/backend/internal/model"
)

type TaskRepository struct {
	db *DB
}

func NewTaskRepository(db *DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) GetAll(ctx context.Context) ([]*model.Task, error) {
	query := `
		SELECT
			t.id,
			t.title,
			t.description,
			t.type,
			t.reward,
			t.deadline,
			t.status,
			t.created_by,
			t.created_at,
			t.closed_at,
			COUNT(ts.id)::INT AS submission_count,
			(COUNT(ts.id) FILTER (WHERE ts.reviewed = true))::INT AS reviewed_count
		FROM tasks t
		LEFT JOIN task_submissions ts ON ts.task_id = t.id
		GROUP BY t.id
		ORDER BY
			CASE WHEN t.status = 'active' THEN 0 ELSE 1 END,
			t.deadline ASC NULLS LAST,
			t.created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*model.Task
	for rows.Next() {
		var task model.Task
		if err := rows.Scan(
			&task.ID,
			&task.Title,
			&task.Description,
			&task.Type,
			&task.Reward,
			&task.Deadline,
			&task.Status,
			&task.CreatedBy,
			&task.CreatedAt,
			&task.ClosedAt,
			&task.SubmissionCount,
			&task.ReviewedCount,
		); err != nil {
			return nil, fmt.Errorf("scan task: %w", err)
		}
		tasks = append(tasks, &task)
	}

	return tasks, nil
}

func (r *TaskRepository) GetForUser(ctx context.Context, userID string) ([]*model.Task, error) {
	query := `
		SELECT
			t.id,
			t.title,
			t.description,
			t.type,
			t.reward,
			t.deadline,
			t.status,
			t.created_by,
			t.created_at,
			t.closed_at,
			ts.id,
			ts.task_id,
			ts.user_id,
			ts.response_text,
			ts.response_url,
			ts.submitted_at,
			ts.reviewed,
			ts.reward_given,
			ts.reviewed_at,
			ts.reviewed_by
		FROM tasks t
		LEFT JOIN task_submissions ts
			ON ts.task_id = t.id
			AND ts.user_id = $1
		ORDER BY
			CASE WHEN t.status = 'active' THEN 0 ELSE 1 END,
			t.deadline ASC NULLS LAST,
			t.created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get tasks for user: %w", err)
	}
	defer rows.Close()

	var tasks []*model.Task
	for rows.Next() {
		var (
			task             model.Task
			submissionID     *string
			submissionTaskID *string
			submissionUserID *string
			responseText     *string
			responseURL      *string
			submittedAt      *time.Time
			reviewed         *bool
			rewardGiven      *int
			reviewedAt       *time.Time
			reviewedBy       *string
		)

		if err := rows.Scan(
			&task.ID,
			&task.Title,
			&task.Description,
			&task.Type,
			&task.Reward,
			&task.Deadline,
			&task.Status,
			&task.CreatedBy,
			&task.CreatedAt,
			&task.ClosedAt,
			&submissionID,
			&submissionTaskID,
			&submissionUserID,
			&responseText,
			&responseURL,
			&submittedAt,
			&reviewed,
			&rewardGiven,
			&reviewedAt,
			&reviewedBy,
		); err != nil {
			return nil, fmt.Errorf("scan user task: %w", err)
		}

		if submissionID != nil && submissionTaskID != nil && submissionUserID != nil && submittedAt != nil && reviewed != nil {
			task.MySubmission = &model.TaskSubmission{
				ID:           *submissionID,
				TaskID:       *submissionTaskID,
				UserID:       *submissionUserID,
				ResponseText: responseText,
				ResponseURL:  responseURL,
				SubmittedAt:  *submittedAt,
				Reviewed:     *reviewed,
				RewardGiven:  rewardGiven,
				ReviewedAt:   reviewedAt,
				ReviewedBy:   reviewedBy,
			}
		}

		tasks = append(tasks, &task)
	}

	return tasks, nil
}

func (r *TaskRepository) GetByID(ctx context.Context, id string) (*model.Task, error) {
	query := `
		SELECT id, title, description, type, reward, deadline, status, created_by, created_at, closed_at
		FROM tasks
		WHERE id = $1
	`

	var task model.Task
	if err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&task.ID,
		&task.Title,
		&task.Description,
		&task.Type,
		&task.Reward,
		&task.Deadline,
		&task.Status,
		&task.CreatedBy,
		&task.CreatedAt,
		&task.ClosedAt,
	); err != nil {
		return nil, fmt.Errorf("get task by id: %w", err)
	}

	return &task, nil
}

func (r *TaskRepository) Create(ctx context.Context, task *model.Task) error {
	query := `
		INSERT INTO tasks (title, description, type, reward, deadline, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, status, created_at, closed_at
	`

	if err := r.db.Pool.QueryRow(
		ctx,
		query,
		task.Title,
		task.Description,
		task.Type,
		task.Reward,
		task.Deadline,
		task.CreatedBy,
	).Scan(&task.ID, &task.Status, &task.CreatedAt, &task.ClosedAt); err != nil {
		return fmt.Errorf("create task: %w", err)
	}

	return nil
}

func (r *TaskRepository) Update(ctx context.Context, task *model.Task) error {
	query := `
		UPDATE tasks
		SET title = $2,
			description = $3,
			type = $4,
			reward = $5,
			deadline = $6,
			status = $7
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(
		ctx,
		query,
		task.ID,
		task.Title,
		task.Description,
		task.Type,
		task.Reward,
		task.Deadline,
		task.Status,
	)
	if err != nil {
		return fmt.Errorf("update task: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("задача не найдена")
	}

	return nil
}

func (r *TaskRepository) Close(ctx context.Context, id string) error {
	query := `
		UPDATE tasks
		SET status = 'closed', closed_at = NOW()
		WHERE id = $1 AND status = 'active'
	`

	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("close task: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("задача не найдена или уже закрыта")
	}

	return nil
}
