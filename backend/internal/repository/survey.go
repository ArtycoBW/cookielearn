package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
	"github.com/jackc/pgx/v5"
)

type SurveyRepository struct {
	db *DB
}

type rowScanner interface {
	Scan(dest ...any) error
}

func NewSurveyRepository(db *DB) *SurveyRepository {
	return &SurveyRepository{db: db}
}

func (r *SurveyRepository) GetByUserID(ctx context.Context, userID string) (*model.SurveySubmission, error) {
	query := `
		SELECT s.id, s.user_id, s.answers, s.submitted_at, s.reviewed, s.reward_given,
		       p.id, p.full_name, p.group_name, p.role, p.balance, p.created_at, p.last_login_at
		FROM survey_submissions s
		LEFT JOIN profiles p ON p.id = s.user_id
		WHERE s.user_id = $1
		LIMIT 1
	`

	submission, err := scanSurveySubmission(r.db.Pool.QueryRow(ctx, query, userID), true)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get survey by user id: %w", err)
	}

	return submission, nil
}

func (r *SurveyRepository) GetByID(ctx context.Context, id string) (*model.SurveySubmission, error) {
	query := `
		SELECT s.id, s.user_id, s.answers, s.submitted_at, s.reviewed, s.reward_given,
		       p.id, p.full_name, p.group_name, p.role, p.balance, p.created_at, p.last_login_at
		FROM survey_submissions s
		LEFT JOIN profiles p ON p.id = s.user_id
		WHERE s.id = $1
		LIMIT 1
	`

	submission, err := scanSurveySubmission(r.db.Pool.QueryRow(ctx, query, id), true)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get survey by id: %w", err)
	}

	return submission, nil
}

func (r *SurveyRepository) Create(ctx context.Context, submission *model.SurveySubmission) error {
	payload, err := json.Marshal(submission.Answers)
	if err != nil {
		return fmt.Errorf("marshal survey answers: %w", err)
	}

	query := `
		INSERT INTO survey_submissions (user_id, answers)
		VALUES ($1, $2::jsonb)
		RETURNING id, submitted_at, reviewed, reward_given
	`

	err = r.db.Pool.QueryRow(ctx, query, submission.UserID, payload).Scan(
		&submission.ID,
		&submission.SubmittedAt,
		&submission.Reviewed,
		&submission.RewardGiven,
	)
	if err != nil {
		return fmt.Errorf("create survey submission: %w", err)
	}

	return nil
}

func (r *SurveyRepository) GetAll(ctx context.Context) ([]*model.SurveySubmission, error) {
	query := `
		SELECT s.id, s.user_id, s.answers, s.submitted_at, s.reviewed, s.reward_given,
		       p.id, p.full_name, p.group_name, p.role, p.balance, p.created_at, p.last_login_at
		FROM survey_submissions s
		LEFT JOIN profiles p ON p.id = s.user_id
		ORDER BY s.submitted_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get surveys: %w", err)
	}
	defer rows.Close()

	var submissions []*model.SurveySubmission
	for rows.Next() {
		submission, err := scanSurveySubmission(rows, true)
		if err != nil {
			return nil, fmt.Errorf("scan survey submission: %w", err)
		}
		submissions = append(submissions, submission)
	}

	return submissions, nil
}

func (r *SurveyRepository) MarkRewarded(ctx context.Context, id string, reward int) error {
	query := `
		UPDATE survey_submissions
		SET reviewed = true, reward_given = $2
		WHERE id = $1 AND reviewed = false
	`

	result, err := r.db.Pool.Exec(ctx, query, id, reward)
	if err != nil {
		return fmt.Errorf("mark survey rewarded: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("анкета не найдена или уже обработана")
	}

	return nil
}

func scanSurveySubmission(row rowScanner, includeUser bool) (*model.SurveySubmission, error) {
	var (
		submission model.SurveySubmission
		answersRaw []byte
	)

	if includeUser {
		var user model.Profile
		if err := row.Scan(
			&submission.ID,
			&submission.UserID,
			&answersRaw,
			&submission.SubmittedAt,
			&submission.Reviewed,
			&submission.RewardGiven,
			&user.ID,
			&user.FullName,
			&user.GroupName,
			&user.Role,
			&user.Balance,
			&user.CreatedAt,
			&user.LastLoginAt,
		); err != nil {
			return nil, err
		}
		submission.User = &user
	} else {
		if err := row.Scan(
			&submission.ID,
			&submission.UserID,
			&answersRaw,
			&submission.SubmittedAt,
			&submission.Reviewed,
			&submission.RewardGiven,
		); err != nil {
			return nil, err
		}
	}

	if len(answersRaw) > 0 {
		if err := json.Unmarshal(answersRaw, &submission.Answers); err != nil {
			return nil, fmt.Errorf("unmarshal survey answers: %w", err)
		}
	}

	if submission.Answers == nil {
		submission.Answers = make([]model.SurveyAnswer, 0)
	}

	return &submission, nil
}
