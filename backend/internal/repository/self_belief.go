package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/cookielearn/backend/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type SelfBeliefRepository struct {
	db *DB
}

func NewSelfBeliefRepository(db *DB) *SelfBeliefRepository {
	return &SelfBeliefRepository{db: db}
}

func (r *SelfBeliefRepository) GetAllQuestions(ctx context.Context) ([]*model.SelfBeliefQuestion, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT
			id,
			category,
			wager,
			prompt,
			options,
			correct_option,
			explanation,
			is_active,
			created_by,
			created_at,
			updated_at
		FROM self_belief_questions
		ORDER BY
			CASE WHEN is_active THEN 0 ELSE 1 END,
			wager ASC,
			category ASC,
			created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("get self belief questions: %w", err)
	}
	defer rows.Close()

	var items []*model.SelfBeliefQuestion
	for rows.Next() {
		question, err := scanSelfBeliefQuestion(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, question)
	}

	return items, nil
}

func (r *SelfBeliefRepository) GetQuestionByID(ctx context.Context, id string) (*model.SelfBeliefQuestion, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT
			id,
			category,
			wager,
			prompt,
			options,
			correct_option,
			explanation,
			is_active,
			created_by,
			created_at,
			updated_at
		FROM self_belief_questions
		WHERE id = $1
	`, id)

	question, err := scanSelfBeliefQuestionRow(row)
	if err != nil {
		return nil, fmt.Errorf("get self belief question: %w", err)
	}

	return question, nil
}

func (r *SelfBeliefRepository) CreateQuestion(ctx context.Context, question *model.SelfBeliefQuestion) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO self_belief_questions (category, wager, prompt, options, correct_option, explanation, is_active, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`,
		question.Category,
		question.Wager,
		question.Prompt,
		question.Options,
		question.CorrectOption,
		question.Explanation,
		question.IsActive,
		question.CreatedBy,
	).Scan(&question.ID, &question.CreatedAt, &question.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create self belief question: %w", err)
	}

	return nil
}

func (r *SelfBeliefRepository) UpdateQuestion(ctx context.Context, question *model.SelfBeliefQuestion) error {
	result, err := r.db.Pool.Exec(ctx, `
		UPDATE self_belief_questions
		SET
			category = $2,
			wager = $3,
			prompt = $4,
			options = $5,
			correct_option = $6,
			explanation = $7,
			is_active = $8
		WHERE id = $1
	`,
		question.ID,
		question.Category,
		question.Wager,
		question.Prompt,
		question.Options,
		question.CorrectOption,
		question.Explanation,
		question.IsActive,
	)
	if err != nil {
		return fmt.Errorf("update self belief question: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("вопрос не найден")
	}

	return nil
}

func (r *SelfBeliefRepository) DeleteQuestion(ctx context.Context, id string) error {
	result, err := r.db.Pool.Exec(ctx, `DELETE FROM self_belief_questions WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete self belief question: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("вопрос не найден")
	}

	return nil
}

func (r *SelfBeliefRepository) GetOverview(ctx context.Context, userID string) (*model.SelfBeliefOverview, error) {
	overview := &model.SelfBeliefOverview{
		Categories:     []string{},
		RecentAttempts: []model.SelfBeliefAttempt{},
	}

	err := r.db.Pool.QueryRow(ctx, `
		SELECT
			COUNT(*)::INT,
			COUNT(*) FILTER (WHERE is_correct)::INT,
			COALESCE(SUM(reward_delta), 0)::INT
		FROM self_belief_attempts
		WHERE user_id = $1
	`, userID).Scan(
		&overview.Stats.TotalAttempts,
		&overview.Stats.CorrectAttempts,
		&overview.Stats.NetReward,
	)
	if err != nil {
		return nil, fmt.Errorf("get self belief stats: %w", err)
	}

	if overview.Stats.TotalAttempts > 0 {
		overview.Stats.AccuracyPercent = int(float64(overview.Stats.CorrectAttempts) / float64(overview.Stats.TotalAttempts) * 100)
	}

	categoryRows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT category
		FROM self_belief_questions
		WHERE is_active = TRUE
		ORDER BY category ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("get self belief categories: %w", err)
	}
	defer categoryRows.Close()

	for categoryRows.Next() {
		var category string
		if err := categoryRows.Scan(&category); err != nil {
			return nil, fmt.Errorf("scan self belief category: %w", err)
		}
		overview.Categories = append(overview.Categories, category)
	}

	attemptRows, err := r.db.Pool.Query(ctx, `
		SELECT
			a.id,
			a.user_id,
			a.question_id,
			a.category,
			a.wager,
			a.selected_option,
			q.correct_option,
			q.prompt,
			q.options,
			a.is_correct,
			a.reward_delta,
			p.balance,
			q.explanation,
			a.created_at
		FROM self_belief_attempts a
		JOIN self_belief_questions q ON q.id = a.question_id
		JOIN profiles p ON p.id = a.user_id
		WHERE a.user_id = $1
		ORDER BY a.created_at DESC
		LIMIT 6
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get self belief attempts: %w", err)
	}
	defer attemptRows.Close()

	for attemptRows.Next() {
		attempt, err := scanSelfBeliefAttempt(attemptRows)
		if err != nil {
			return nil, err
		}
		overview.RecentAttempts = append(overview.RecentAttempts, *attempt)
	}

	return overview, nil
}

func (r *SelfBeliefRepository) GetNextQuestion(ctx context.Context, userID string, wager int, category string) (*model.SelfBeliefQuestion, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT
			id,
			category,
			wager,
			prompt,
			options,
			correct_option,
			explanation,
			is_active,
			created_by,
			created_at,
			updated_at
		FROM self_belief_questions q
		WHERE q.is_active = TRUE
		  AND q.wager = $2
		  AND ($3 = '' OR q.category = $3)
		  AND NOT EXISTS (
			SELECT 1
			FROM self_belief_attempts a
			WHERE a.user_id = $1 AND a.question_id = q.id
		  )
		ORDER BY random()
		LIMIT 1
	`, userID, wager, strings.TrimSpace(category))

	question, err := scanSelfBeliefQuestionRow(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get next self belief question: %w", err)
	}

	return question, nil
}

func (r *SelfBeliefRepository) AnswerQuestion(
	ctx context.Context,
	userID string,
	questionID string,
	wager int,
	selectedOption int,
) (*model.SelfBeliefAnswerResult, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin self belief answer tx: %w", err)
	}
	defer tx.Rollback(ctx)

	question, err := r.getQuestionByIDTx(ctx, tx, questionID)
	if err != nil {
		return nil, err
	}
	if !question.IsActive {
		return nil, fmt.Errorf("вопрос больше не активен")
	}
	if question.Wager != wager {
		return nil, fmt.Errorf("ставка не совпадает с уровнем вопроса")
	}

	var balance int
	if err := tx.QueryRow(ctx, `SELECT balance FROM profiles WHERE id = $1 FOR UPDATE`, userID).Scan(&balance); err != nil {
		return nil, fmt.Errorf("get balance for self belief: %w", err)
	}
	if balance < wager {
		return nil, fmt.Errorf("для этой ставки нужно минимум %d печенек на балансе", wager)
	}

	var hasAttempt bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM self_belief_attempts
			WHERE user_id = $1 AND question_id = $2
		)
	`, userID, questionID).Scan(&hasAttempt); err != nil {
		return nil, fmt.Errorf("check self belief duplicate attempt: %w", err)
	}
	if hasAttempt {
		return nil, fmt.Errorf("этот вопрос уже был разыгран")
	}

	isCorrect := selectedOption == question.CorrectOption
	rewardDelta := wager
	if !isCorrect {
		rewardDelta = -wager
	}

	attempt := &model.SelfBeliefAttempt{
		UserID:         userID,
		QuestionID:     question.ID,
		Category:       question.Category,
		Wager:          wager,
		SelectedOption: selectedOption,
		CorrectOption:  question.CorrectOption,
		Prompt:         question.Prompt,
		Options:        append([]string(nil), question.Options...),
		IsCorrect:      isCorrect,
		RewardDelta:    rewardDelta,
		Explanation:    question.Explanation,
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO self_belief_attempts (
			user_id,
			question_id,
			category,
			wager,
			selected_option,
			is_correct,
			reward_delta
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`,
		userID,
		question.ID,
		question.Category,
		wager,
		selectedOption,
		isCorrect,
		rewardDelta,
	).Scan(&attempt.ID, &attempt.CreatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("этот вопрос уже был разыгран")
		}
		return nil, fmt.Errorf("insert self belief attempt: %w", err)
	}

	reason := fmt.Sprintf(`Викторина "Верю в себя": %s`, question.Category)
	categoryValue := "self_belief_quiz"
	if _, err := tx.Exec(ctx, `
		INSERT INTO cookie_transactions (user_id, amount, reason, category)
		VALUES ($1, $2, $3, $4)
	`, userID, rewardDelta, reason, &categoryValue); err != nil {
		return nil, fmt.Errorf("insert self belief transaction: %w", err)
	}

	if err := tx.QueryRow(ctx, `SELECT balance FROM profiles WHERE id = $1`, userID).Scan(&attempt.BalanceAfter); err != nil {
		return nil, fmt.Errorf("get balance after self belief answer: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit self belief answer tx: %w", err)
	}

	message := "Неверно, ставка списана."
	if attempt.IsCorrect {
		message = "Верно! Ставка сыграла в вашу пользу."
	}

	return &model.SelfBeliefAnswerResult{
		Attempt: *attempt,
		Message: message,
	}, nil
}

func (r *SelfBeliefRepository) getQuestionByIDTx(ctx context.Context, tx pgx.Tx, id string) (*model.SelfBeliefQuestion, error) {
	row := tx.QueryRow(ctx, `
		SELECT
			id,
			category,
			wager,
			prompt,
			options,
			correct_option,
			explanation,
			is_active,
			created_by,
			created_at,
			updated_at
		FROM self_belief_questions
		WHERE id = $1
	`, id)

	question, err := scanSelfBeliefQuestionRow(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("вопрос не найден")
		}
		return nil, fmt.Errorf("get self belief question in tx: %w", err)
	}

	return question, nil
}

func scanSelfBeliefQuestion(rows pgx.Rows) (*model.SelfBeliefQuestion, error) {
	var item model.SelfBeliefQuestion
	if err := rows.Scan(
		&item.ID,
		&item.Category,
		&item.Wager,
		&item.Prompt,
		&item.Options,
		&item.CorrectOption,
		&item.Explanation,
		&item.IsActive,
		&item.CreatedBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("scan self belief question: %w", err)
	}

	return &item, nil
}

func scanSelfBeliefQuestionRow(row pgx.Row) (*model.SelfBeliefQuestion, error) {
	var item model.SelfBeliefQuestion
	if err := row.Scan(
		&item.ID,
		&item.Category,
		&item.Wager,
		&item.Prompt,
		&item.Options,
		&item.CorrectOption,
		&item.Explanation,
		&item.IsActive,
		&item.CreatedBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, err
	}

	return &item, nil
}

func scanSelfBeliefAttempt(rows pgx.Rows) (*model.SelfBeliefAttempt, error) {
	var item model.SelfBeliefAttempt
	if err := rows.Scan(
		&item.ID,
		&item.UserID,
		&item.QuestionID,
		&item.Category,
		&item.Wager,
		&item.SelectedOption,
		&item.CorrectOption,
		&item.Prompt,
		&item.Options,
		&item.IsCorrect,
		&item.RewardDelta,
		&item.BalanceAfter,
		&item.Explanation,
		&item.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("scan self belief attempt: %w", err)
	}

	return &item, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
