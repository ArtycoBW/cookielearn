package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
	"github.com/jackc/pgx/v5"
)

type TaskRepository struct {
	db *DB
}

func NewTaskRepository(db *DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) GetAll(ctx context.Context) ([]*model.Task, error) {
	query := `
		SELECT id, title, description, type, reward, deadline, status, created_by, created_at, closed_at
		FROM tasks
		ORDER BY created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*model.Task
	for rows.Next() {
		var t model.Task
		if err := rows.Scan(
			&t.ID,
			&t.Title,
			&t.Description,
			&t.Type,
			&t.Reward,
			&t.Deadline,
			&t.Status,
			&t.CreatedBy,
			&t.CreatedAt,
			&t.ClosedAt,
		); err != nil {
			return nil, fmt.Errorf("scan task: %w", err)
		}

		tasks = append(tasks, &t)
	}

	return tasks, nil
}

func (r *TaskRepository) GetByID(ctx context.Context, id string) (*model.Task, error) {
	query := `
		SELECT id, title, description, type, reward, deadline, status, created_by, created_at, closed_at
		FROM tasks
		WHERE id = $1
	`

	var t model.Task
	if err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&t.ID,
		&t.Title,
		&t.Description,
		&t.Type,
		&t.Reward,
		&t.Deadline,
		&t.Status,
		&t.CreatedBy,
		&t.CreatedAt,
		&t.ClosedAt,
	); err != nil {
		return nil, fmt.Errorf("get task by id: %w", err)
	}

	return &t, nil
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

	result, err := r.db.Pool.Exec(ctx, query,
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

func (r *TaskRepository) GetWinnerID(ctx context.Context, taskID string) (*string, error) {
	query := `
		SELECT nominee_id
		FROM votes
		WHERE task_id = $1
		GROUP BY nominee_id
		ORDER BY COUNT(*) DESC, MIN(created_at) ASC
		LIMIT 1
	`

	var winnerID string
	if err := r.db.Pool.QueryRow(ctx, query, taskID).Scan(&winnerID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get task winner: %w", err)
	}

	return &winnerID, nil
}
