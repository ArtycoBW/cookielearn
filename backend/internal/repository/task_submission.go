package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
	"github.com/jackc/pgx/v5"
)

type TaskSubmissionRepository struct {
	db *DB
}

func NewTaskSubmissionRepository(db *DB) *TaskSubmissionRepository {
	return &TaskSubmissionRepository{db: db}
}

func (r *TaskSubmissionRepository) Upsert(ctx context.Context, submission *model.TaskSubmission) error {
	query := `
		INSERT INTO task_submissions (task_id, user_id, response_text, response_url)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (task_id, user_id) DO UPDATE
		SET response_text = EXCLUDED.response_text,
			response_url = EXCLUDED.response_url,
			submitted_at = NOW(),
			reviewed = FALSE,
			reward_given = NULL,
			reviewed_at = NULL,
			reviewed_by = NULL
		WHERE task_submissions.reviewed = FALSE
		RETURNING id, submitted_at, reviewed, reward_given, reviewed_at, reviewed_by
	`

	if err := r.db.Pool.QueryRow(
		ctx,
		query,
		submission.TaskID,
		submission.UserID,
		submission.ResponseText,
		submission.ResponseURL,
	).Scan(
		&submission.ID,
		&submission.SubmittedAt,
		&submission.Reviewed,
		&submission.RewardGiven,
		&submission.ReviewedAt,
		&submission.ReviewedBy,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("ответ уже проверен и больше не редактируется")
		}
		return fmt.Errorf("upsert task submission: %w", err)
	}

	return nil
}

func (r *TaskSubmissionRepository) GetByID(ctx context.Context, id string) (*model.TaskSubmission, error) {
	query := `
		SELECT
			ts.id,
			ts.task_id,
			ts.user_id,
			ts.response_text,
			ts.response_url,
			ts.submitted_at,
			ts.reviewed,
			ts.reward_given,
			ts.reviewed_at,
			ts.reviewed_by,
			p.id,
			p.full_name,
			p.group_name,
			p.role,
			p.balance,
			p.created_at,
			p.last_login_at,
			t.id,
			t.title,
			t.description,
			t.type,
			t.reward,
			t.deadline,
			t.status,
			t.created_by,
			t.created_at,
			t.closed_at
		FROM task_submissions ts
		JOIN profiles p ON p.id = ts.user_id
		JOIN tasks t ON t.id = ts.task_id
		WHERE ts.id = $1
	`

	var (
		submission model.TaskSubmission
		user       model.Profile
		task       model.Task
	)
	if err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&submission.ID,
		&submission.TaskID,
		&submission.UserID,
		&submission.ResponseText,
		&submission.ResponseURL,
		&submission.SubmittedAt,
		&submission.Reviewed,
		&submission.RewardGiven,
		&submission.ReviewedAt,
		&submission.ReviewedBy,
		&user.ID,
		&user.FullName,
		&user.GroupName,
		&user.Role,
		&user.Balance,
		&user.CreatedAt,
		&user.LastLoginAt,
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
		return nil, fmt.Errorf("get task submission: %w", err)
	}

	submission.User = &user
	submission.Task = &task

	return &submission, nil
}

func (r *TaskSubmissionRepository) GetAll(ctx context.Context) ([]*model.TaskSubmission, error) {
	query := `
		SELECT
			ts.id,
			ts.task_id,
			ts.user_id,
			ts.response_text,
			ts.response_url,
			ts.submitted_at,
			ts.reviewed,
			ts.reward_given,
			ts.reviewed_at,
			ts.reviewed_by,
			p.id,
			p.full_name,
			p.group_name,
			p.role,
			p.balance,
			p.created_at,
			p.last_login_at,
			t.id,
			t.title,
			t.description,
			t.type,
			t.reward,
			t.deadline,
			t.status,
			t.created_by,
			t.created_at,
			t.closed_at
		FROM task_submissions ts
		JOIN profiles p ON p.id = ts.user_id
		JOIN tasks t ON t.id = ts.task_id
		ORDER BY ts.submitted_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get task submissions: %w", err)
	}
	defer rows.Close()

	var items []*model.TaskSubmission
	for rows.Next() {
		var (
			submission model.TaskSubmission
			user       model.Profile
			task       model.Task
		)

		if err := rows.Scan(
			&submission.ID,
			&submission.TaskID,
			&submission.UserID,
			&submission.ResponseText,
			&submission.ResponseURL,
			&submission.SubmittedAt,
			&submission.Reviewed,
			&submission.RewardGiven,
			&submission.ReviewedAt,
			&submission.ReviewedBy,
			&user.ID,
			&user.FullName,
			&user.GroupName,
			&user.Role,
			&user.Balance,
			&user.CreatedAt,
			&user.LastLoginAt,
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
			return nil, fmt.Errorf("scan task submission: %w", err)
		}

		submission.User = &user
		submission.Task = &task
		items = append(items, &submission)
	}

	return items, nil
}

func (r *TaskSubmissionRepository) Review(ctx context.Context, submissionID, reviewedBy string, reward int) error {
	query := `
		UPDATE task_submissions
		SET reviewed = TRUE,
			reward_given = $2,
			reviewed_at = NOW(),
			reviewed_by = $3
		WHERE id = $1 AND reviewed = FALSE
	`

	result, err := r.db.Pool.Exec(ctx, query, submissionID, reward, reviewedBy)
	if err != nil {
		return fmt.Errorf("review task submission: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("ответ не найден или уже проверен")
	}

	return nil
}
