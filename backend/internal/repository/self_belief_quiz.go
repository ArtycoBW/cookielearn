package repository

import (
	"context"
	"errors"
	"fmt"
	"hash/fnv"
	"strings"
	"time"

	"github.com/cookielearn/backend/internal/model"
	"github.com/jackc/pgx/v5"
)

type selfBeliefQuizQuestionInternal struct {
	ID            string
	Category      string
	Prompt        string
	Options       []string
	CorrectOption int
	Explanation   *string
	Position      int
}

type selfBeliefQuizAttemptRow struct {
	ID             string
	QuizID         string
	UserID         string
	QuizTitle      string
	Wager          int
	Status         string
	TotalQuestions int
	EntryCost      int
}

func (r *SelfBeliefRepository) GetQuizOverview(ctx context.Context, userID string) (*model.SelfBeliefQuizOverview, error) {
	overview := &model.SelfBeliefQuizOverview{
		RecentAttempts:   []model.SelfBeliefQuizAttemptSummary{},
		CompletedQuizIDs: []string{},
	}

	err := r.db.Pool.QueryRow(ctx, `
		SELECT
			COUNT(*)::INT,
			COUNT(*) FILTER (WHERE outcome = 'win')::INT,
			COUNT(*) FILTER (WHERE outcome = 'draw')::INT,
			COUNT(*) FILTER (WHERE outcome = 'lose')::INT,
			COALESCE(SUM(net_reward), 0)::INT
		FROM self_belief_quiz_attempts
		WHERE user_id = $1
		  AND status = 'completed'
	`, userID).Scan(
		&overview.Stats.MatchesPlayed,
		&overview.Stats.Wins,
		&overview.Stats.Draws,
		&overview.Stats.Losses,
		&overview.Stats.NetReward,
	)
	if err != nil {
		return nil, fmt.Errorf("get self belief quiz overview: %w", err)
	}

	if overview.Stats.MatchesPlayed > 0 {
		overview.Stats.WinRate = int(float64(overview.Stats.Wins) / float64(overview.Stats.MatchesPlayed) * 100)
	}

	rows, err := r.db.Pool.Query(ctx, `
		SELECT
			id,
			quiz_id,
			quiz_title,
			wager,
			outcome,
			total_questions,
			user_correct_count,
			corgi_correct_count,
			entry_cost,
			payout,
			net_reward,
			started_at,
			finished_at
		FROM self_belief_quiz_attempts
		WHERE user_id = $1
		  AND status = 'completed'
		ORDER BY finished_at DESC NULLS LAST, started_at DESC
		LIMIT 6
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get self belief recent quiz attempts: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item model.SelfBeliefQuizAttemptSummary
		if err := rows.Scan(
			&item.ID,
			&item.QuizID,
			&item.QuizTitle,
			&item.Wager,
			&item.Outcome,
			&item.TotalQuestions,
			&item.UserCorrectCount,
			&item.CorgiCorrectCount,
			&item.EntryCost,
			&item.Payout,
			&item.NetReward,
			&item.StartedAt,
			&item.FinishedAt,
		); err != nil {
			return nil, fmt.Errorf("scan self belief recent quiz attempt: %w", err)
		}
		overview.RecentAttempts = append(overview.RecentAttempts, item)
	}

	completedRows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT quiz_id
		FROM self_belief_quiz_attempts
		WHERE user_id = $1 AND status = 'completed'
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get completed quiz ids: %w", err)
	}
	defer completedRows.Close()

	for completedRows.Next() {
		var quizID string
		if err := completedRows.Scan(&quizID); err != nil {
			return nil, fmt.Errorf("scan completed quiz id: %w", err)
		}
		overview.CompletedQuizIDs = append(overview.CompletedQuizIDs, quizID)
	}

	return overview, nil
}

func (r *SelfBeliefRepository) GetAllQuizzes(ctx context.Context) ([]*model.SelfBeliefQuiz, error) {
	return r.getQuizList(ctx, false)
}

func (r *SelfBeliefRepository) GetActiveQuizzes(ctx context.Context) ([]*model.SelfBeliefQuiz, error) {
	return r.getQuizList(ctx, true)
}

func (r *SelfBeliefRepository) getQuizList(ctx context.Context, onlyActive bool) ([]*model.SelfBeliefQuiz, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT
			q.id,
			q.title,
			q.description,
			q.wager,
			q.time_limit_seconds,
			q.is_active,
			q.created_by,
			q.created_at,
			q.updated_at,
			COUNT(qq.question_id)::INT AS question_count
		FROM self_belief_quizzes q
		LEFT JOIN self_belief_quiz_questions qq ON qq.quiz_id = q.id
		WHERE ($1 = FALSE OR q.is_active = TRUE)
		GROUP BY q.id
		ORDER BY
			CASE WHEN q.is_active THEN 0 ELSE 1 END,
			q.wager ASC,
			q.created_at DESC
	`, onlyActive)
	if err != nil {
		return nil, fmt.Errorf("get self belief quizzes: %w", err)
	}
	defer rows.Close()

	quizzes := make([]*model.SelfBeliefQuiz, 0)
	for rows.Next() {
		var quiz model.SelfBeliefQuiz
		if err := rows.Scan(
			&quiz.ID,
			&quiz.Title,
			&quiz.Description,
			&quiz.Wager,
			&quiz.TimeLimitSeconds,
			&quiz.IsActive,
			&quiz.CreatedBy,
			&quiz.CreatedAt,
			&quiz.UpdatedAt,
			&quiz.QuestionCount,
		); err != nil {
			return nil, fmt.Errorf("scan self belief quiz: %w", err)
		}
		quiz.Questions = []model.SelfBeliefQuizQuestionLink{}
		quizzes = append(quizzes, &quiz)
	}

	if len(quizzes) == 0 {
		return quizzes, nil
	}

	linksByQuiz, err := r.getQuizQuestionLinks(ctx, collectQuizIDs(quizzes))
	if err != nil {
		return nil, err
	}

	for _, quiz := range quizzes {
		if linksByQuiz[quiz.ID] != nil {
			quiz.Questions = linksByQuiz[quiz.ID]
		}
	}

	return quizzes, nil
}

func (r *SelfBeliefRepository) CreateQuiz(ctx context.Context, quiz *model.SelfBeliefQuiz) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin create self belief quiz tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := r.validateQuizQuestionLinksTx(ctx, tx, quiz.Wager, quiz.Questions); err != nil {
		return err
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO self_belief_quizzes (
			title,
			description,
			wager,
			time_limit_seconds,
			is_active,
			created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`, quiz.Title, quiz.Description, quiz.Wager, quiz.TimeLimitSeconds, quiz.IsActive, quiz.CreatedBy).
		Scan(&quiz.ID, &quiz.CreatedAt, &quiz.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create self belief quiz: %w", err)
	}

	if err := r.replaceQuizQuestionLinksTx(ctx, tx, quiz.ID, quiz.Questions); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit create self belief quiz tx: %w", err)
	}

	quiz.QuestionCount = len(quiz.Questions)
	return nil
}

func (r *SelfBeliefRepository) UpdateQuiz(ctx context.Context, quiz *model.SelfBeliefQuiz) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin update self belief quiz tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := r.validateQuizQuestionLinksTx(ctx, tx, quiz.Wager, quiz.Questions); err != nil {
		return err
	}

	result, err := tx.Exec(ctx, `
		UPDATE self_belief_quizzes
		SET
			title = $2,
			description = $3,
			wager = $4,
			time_limit_seconds = $5,
			is_active = $6
		WHERE id = $1
	`, quiz.ID, quiz.Title, quiz.Description, quiz.Wager, quiz.TimeLimitSeconds, quiz.IsActive)
	if err != nil {
		return fmt.Errorf("update self belief quiz: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("тест викторины не найден")
	}

	if err := r.replaceQuizQuestionLinksTx(ctx, tx, quiz.ID, quiz.Questions); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit update self belief quiz tx: %w", err)
	}

	quiz.QuestionCount = len(quiz.Questions)
	return nil
}

func (r *SelfBeliefRepository) DeleteQuiz(ctx context.Context, id string) error {
	result, err := r.db.Pool.Exec(ctx, `DELETE FROM self_belief_quizzes WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete self belief quiz: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("тест викторины не найден")
	}

	return nil
}

func (r *SelfBeliefRepository) StartQuizAttempt(ctx context.Context, userID, quizID string) (*model.SelfBeliefQuizStartResult, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin start self belief quiz tx: %w", err)
	}
	defer tx.Rollback(ctx)

	quiz, err := r.getQuizPublicTx(ctx, tx, quizID, true)
	if err != nil {
		return nil, err
	}
	_, questions, err := r.getQuizInternalTx(ctx, tx, quizID, true)
	if err != nil {
		return nil, err
	}
	if quiz.QuestionCount == 0 {
		return nil, fmt.Errorf("в тесте пока нет вопросов")
	}

	var completed int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM self_belief_quiz_attempts WHERE user_id = $1 AND quiz_id = $2 AND status = 'completed'`, userID, quizID).Scan(&completed); err != nil {
		return nil, fmt.Errorf("check completed attempts: %w", err)
	}
	if completed > 0 {
		return nil, fmt.Errorf("вы уже прошли этот тест — каждый матч доступен один раз")
	}

	var balance int
	if err := tx.QueryRow(ctx, `SELECT balance FROM profiles WHERE id = $1 FOR UPDATE`, userID).Scan(&balance); err != nil {
		return nil, fmt.Errorf("get balance before quiz entry: %w", err)
	}
	if balance < quiz.Wager {
		return nil, fmt.Errorf("для старта нужно минимум %d печенек на балансе", quiz.Wager)
	}

	category := "self_belief_quiz"
	reason := fmt.Sprintf("Взнос за матч с Корги Дуровым: %s", quiz.Title)
	if _, err := tx.Exec(ctx, `
		INSERT INTO cookie_transactions (user_id, amount, reason, category)
		VALUES ($1, $2, $3, $4)
	`, userID, -quiz.Wager, reason, &category); err != nil {
		return nil, fmt.Errorf("create self belief quiz entry transaction: %w", err)
	}

	var (
		attemptID string
		startedAt time.Time
	)
	err = tx.QueryRow(ctx, `
		INSERT INTO self_belief_quiz_attempts (
			quiz_id,
			user_id,
			quiz_title,
			wager,
			total_questions,
			entry_cost
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, started_at
	`, quiz.ID, userID, quiz.Title, quiz.Wager, quiz.QuestionCount, quiz.Wager).Scan(&attemptID, &startedAt)
	if err != nil {
		return nil, fmt.Errorf("create self belief quiz attempt: %w", err)
	}

	if err := tx.QueryRow(ctx, `SELECT balance FROM profiles WHERE id = $1`, userID).Scan(&balance); err != nil {
		return nil, fmt.Errorf("get balance after quiz entry: %w", err)
	}

	for index := range quiz.Questions {
		question := &quiz.Questions[index]
		corgiSelectedOption, _ := resolveCorgiSelection(
			attemptID,
			question.ID,
			question.Position,
			questions[index].CorrectOption,
			len(question.Options),
		)
		question.CorgiSelectedOption = corgiSelectedOption
		question.CorgiRevealAfterMs = resolveCorgiRevealAfterMs(attemptID, question.ID, question.Position)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit start self belief quiz tx: %w", err)
	}

	return &model.SelfBeliefQuizStartResult{
		AttemptID:         attemptID,
		Quiz:              *quiz,
		EntryCost:         quiz.Wager,
		BalanceAfterEntry: balance,
		StartedAt:         startedAt,
		Message:           "Матч начался. Корги Дуров уже разминает лапы.",
	}, nil
}

func (r *SelfBeliefRepository) FinishQuizAttempt(
	ctx context.Context,
	userID string,
	attemptID string,
	submissions []model.SelfBeliefQuizAnswerSubmission,
) (*model.SelfBeliefQuizAttemptResult, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin finish self belief quiz tx: %w", err)
	}
	defer tx.Rollback(ctx)

	attempt, err := r.getQuizAttemptTx(ctx, tx, attemptID)
	if err != nil {
		return nil, err
	}
	if attempt.UserID != userID {
		return nil, fmt.Errorf("этот матч принадлежит другому студенту")
	}
	if attempt.Status != "in_progress" {
		return nil, fmt.Errorf("матч уже завершён")
	}

	quiz, questions, err := r.getQuizInternalTx(ctx, tx, attempt.QuizID, false)
	if err != nil {
		return nil, err
	}
	if len(questions) == 0 {
		return nil, fmt.Errorf("в тесте не осталось вопросов")
	}

	answerByQuestion := make(map[string]model.SelfBeliefQuizAnswerSubmission, len(submissions))
	for _, submission := range submissions {
		questionID := strings.TrimSpace(submission.QuestionID)
		if questionID == "" {
			continue
		}
		if submission.SelectedOption != nil {
			if *submission.SelectedOption < 0 || *submission.SelectedOption > 3 {
				return nil, fmt.Errorf("вариант ответа должен быть от 0 до 3")
			}
		}
		if submission.ResponseMs < 0 {
			submission.ResponseMs = 0
		}
		submission.QuestionID = questionID
		answerByQuestion[questionID] = submission
	}

	var (
		userCorrectCount  int
		corgiCorrectCount int
	)
	questionResults := make([]model.SelfBeliefQuizQuestionResult, 0, len(questions))

	for _, question := range questions {
		submission, ok := answerByQuestion[question.ID]
		if !ok {
			submission = model.SelfBeliefQuizAnswerSubmission{
				QuestionID: question.ID,
				TimedOut:   true,
				ResponseMs: quiz.TimeLimitSeconds * 1000,
			}
		}

		selectedOption := submission.SelectedOption
		if submission.TimedOut {
			selectedOption = nil
		}

		isCorrect := selectedOption != nil && *selectedOption == question.CorrectOption
		if isCorrect {
			userCorrectCount++
		}

		corgiSelectedOption, corgiIsCorrect := resolveCorgiSelection(
			attempt.ID,
			question.ID,
			question.Position,
			question.CorrectOption,
			len(question.Options),
		)
		if corgiIsCorrect {
			corgiCorrectCount++
		}

		questionResults = append(questionResults, model.SelfBeliefQuizQuestionResult{
			QuestionID:          question.ID,
			Position:            question.Position,
			Category:            question.Category,
			Prompt:              question.Prompt,
			Options:             append([]string(nil), question.Options...),
			CorrectOption:       question.CorrectOption,
			SelectedOption:      selectedOption,
			ResponseMs:          submission.ResponseMs,
			TimedOut:            submission.TimedOut,
			IsCorrect:           isCorrect,
			CorgiSelectedOption: corgiSelectedOption,
			CorgiIsCorrect:      corgiIsCorrect,
			Explanation:         question.Explanation,
		})
	}

	outcome := "draw"
	payout := attempt.EntryCost
	message := "Ничья с Корги Дуровым. Ставка вернулась на баланс."

	switch {
	case userCorrectCount > corgiCorrectCount:
		outcome = "win"
		payout = attempt.EntryCost * 2
		message = "Вы обошли Корги Дурова и забрали матч."
	case userCorrectCount < corgiCorrectCount:
		outcome = "lose"
		payout = 0
		message = "Корги Дуров оказался сильнее. Взнос ушёл в его банк."
	}

	for _, item := range questionResults {
		var selected any
		if item.SelectedOption != nil {
			selected = *item.SelectedOption
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO self_belief_quiz_attempt_answers (
				attempt_id,
				question_id,
				position,
				selected_option,
				correct_option,
				timed_out,
				is_correct,
				corgi_selected_option,
				corgi_is_correct,
				response_ms
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`,
			attempt.ID,
			item.QuestionID,
			item.Position,
			selected,
			item.CorrectOption,
			item.TimedOut,
			item.IsCorrect,
			item.CorgiSelectedOption,
			item.CorgiIsCorrect,
			item.ResponseMs,
		); err != nil {
			return nil, fmt.Errorf("insert self belief quiz answer: %w", err)
		}
	}

	if payout > 0 {
		category := "self_belief_quiz"
		reason := fmt.Sprintf("Результат матча с Корги Дуровым: %s", attempt.QuizTitle)
		if _, err := tx.Exec(ctx, `
			INSERT INTO cookie_transactions (user_id, amount, reason, category)
			VALUES ($1, $2, $3, $4)
		`, userID, payout, reason, &category); err != nil {
			return nil, fmt.Errorf("create self belief quiz payout transaction: %w", err)
		}
	}

	netReward := payout - attempt.EntryCost
	var balanceAfter int
	if err := tx.QueryRow(ctx, `SELECT balance FROM profiles WHERE id = $1`, userID).Scan(&balanceAfter); err != nil {
		return nil, fmt.Errorf("get balance after quiz finish: %w", err)
	}

	var finishedAt time.Time
	err = tx.QueryRow(ctx, `
		UPDATE self_belief_quiz_attempts
		SET
			status = 'completed',
			payout = $2,
			net_reward = $3,
			user_correct_count = $4,
			corgi_correct_count = $5,
			outcome = $6,
			balance_after = $7,
			finished_at = NOW()
		WHERE id = $1
		RETURNING finished_at
	`, attempt.ID, payout, netReward, userCorrectCount, corgiCorrectCount, outcome, balanceAfter).Scan(&finishedAt)
	if err != nil {
		return nil, fmt.Errorf("update self belief quiz attempt: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit finish self belief quiz tx: %w", err)
	}

	for index := range questionResults {
		questionResults[index].CreatedAt = finishedAt
	}

	return &model.SelfBeliefQuizAttemptResult{
		AttemptID:         attempt.ID,
		QuizID:            attempt.QuizID,
		QuizTitle:         attempt.QuizTitle,
		Wager:             attempt.Wager,
		Outcome:           outcome,
		EntryCost:         attempt.EntryCost,
		Payout:            payout,
		NetReward:         netReward,
		TotalQuestions:    attempt.TotalQuestions,
		UserCorrectCount:  userCorrectCount,
		CorgiCorrectCount: corgiCorrectCount,
		BalanceAfter:      balanceAfter,
		Message:           message,
		Questions:         questionResults,
		FinishedAt:        finishedAt,
	}, nil
}

func (r *SelfBeliefRepository) validateQuizQuestionLinksTx(
	ctx context.Context,
	tx pgx.Tx,
	wager int,
	links []model.SelfBeliefQuizQuestionLink,
) error {
	if len(links) < 2 {
		return fmt.Errorf("в тесте должно быть минимум 2 вопроса")
	}

	questionIDs := make([]string, 0, len(links))
	for _, link := range links {
		questionIDs = append(questionIDs, link.QuestionID)
	}

	rows, err := tx.Query(ctx, `
		SELECT id, wager
		FROM self_belief_questions
		WHERE id = ANY($1)
	`, questionIDs)
	if err != nil {
		return fmt.Errorf("validate self belief quiz questions: %w", err)
	}
	defer rows.Close()

	found := make(map[string]int, len(questionIDs))
	for rows.Next() {
		var (
			questionID    string
			questionWager int
		)
		if err := rows.Scan(&questionID, &questionWager); err != nil {
			return fmt.Errorf("scan self belief quiz validation row: %w", err)
		}
		found[questionID] = questionWager
	}

	if len(found) != len(questionIDs) {
		return fmt.Errorf("не все вопросы из теста существуют")
	}

	for _, link := range links {
		if found[link.QuestionID] != wager {
			return fmt.Errorf("вопросы теста должны соответствовать ставке %d", wager)
		}
	}

	return nil
}

func (r *SelfBeliefRepository) replaceQuizQuestionLinksTx(
	ctx context.Context,
	tx pgx.Tx,
	quizID string,
	links []model.SelfBeliefQuizQuestionLink,
) error {
	if _, err := tx.Exec(ctx, `DELETE FROM self_belief_quiz_questions WHERE quiz_id = $1`, quizID); err != nil {
		return fmt.Errorf("clear self belief quiz questions: %w", err)
	}

	for _, link := range links {
		if _, err := tx.Exec(ctx, `
			INSERT INTO self_belief_quiz_questions (quiz_id, question_id, position)
			VALUES ($1, $2, $3)
		`, quizID, link.QuestionID, link.Position); err != nil {
			return fmt.Errorf("insert self belief quiz question link: %w", err)
		}
	}

	return nil
}

func (r *SelfBeliefRepository) getQuizQuestionLinks(
	ctx context.Context,
	quizIDs []string,
) (map[string][]model.SelfBeliefQuizQuestionLink, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT quiz_id, question_id, position
		FROM self_belief_quiz_questions
		WHERE quiz_id = ANY($1)
		ORDER BY quiz_id, position
	`, quizIDs)
	if err != nil {
		return nil, fmt.Errorf("get self belief quiz question links: %w", err)
	}
	defer rows.Close()

	links := make(map[string][]model.SelfBeliefQuizQuestionLink, len(quizIDs))
	for rows.Next() {
		var (
			quizID     string
			questionID string
			position   int
		)
		if err := rows.Scan(&quizID, &questionID, &position); err != nil {
			return nil, fmt.Errorf("scan self belief quiz link: %w", err)
		}
		links[quizID] = append(links[quizID], model.SelfBeliefQuizQuestionLink{
			QuestionID: questionID,
			Position:   position,
		})
	}

	return links, nil
}

func (r *SelfBeliefRepository) getQuizPublicTx(
	ctx context.Context,
	tx pgx.Tx,
	quizID string,
	onlyActive bool,
) (*model.SelfBeliefQuizPublic, error) {
	quiz, questions, err := r.getQuizInternalTx(ctx, tx, quizID, onlyActive)
	if err != nil {
		return nil, err
	}

	publicQuestions := make([]model.SelfBeliefQuizPublicQuestion, 0, len(questions))
	for _, question := range questions {
		publicQuestions = append(publicQuestions, model.SelfBeliefQuizPublicQuestion{
			ID:                  question.ID,
			Category:            question.Category,
			Prompt:              question.Prompt,
			Options:             append([]string(nil), question.Options...),
			Position:            question.Position,
			CorgiSelectedOption: 0,
			CorgiRevealAfterMs:  0,
		})
	}

	return &model.SelfBeliefQuizPublic{
		ID:               quiz.ID,
		Title:            quiz.Title,
		Description:      quiz.Description,
		Wager:            quiz.Wager,
		TimeLimitSeconds: quiz.TimeLimitSeconds,
		QuestionCount:    len(publicQuestions),
		Questions:        publicQuestions,
	}, nil
}

func (r *SelfBeliefRepository) getQuizInternalTx(
	ctx context.Context,
	tx pgx.Tx,
	quizID string,
	onlyActive bool,
) (*model.SelfBeliefQuiz, []*selfBeliefQuizQuestionInternal, error) {
	row := tx.QueryRow(ctx, `
		SELECT
			id,
			title,
			description,
			wager,
			time_limit_seconds,
			is_active,
			created_by,
			created_at,
			updated_at
		FROM self_belief_quizzes
		WHERE id = $1
		  AND ($2 = FALSE OR is_active = TRUE)
	`, quizID, onlyActive)

	var quiz model.SelfBeliefQuiz
	if err := row.Scan(
		&quiz.ID,
		&quiz.Title,
		&quiz.Description,
		&quiz.Wager,
		&quiz.TimeLimitSeconds,
		&quiz.IsActive,
		&quiz.CreatedBy,
		&quiz.CreatedAt,
		&quiz.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, fmt.Errorf("тест викторины не найден")
		}
		return nil, nil, fmt.Errorf("get self belief quiz: %w", err)
	}

	rows, err := tx.Query(ctx, `
		SELECT
			q.id,
			q.category,
			q.prompt,
			q.options,
			q.correct_option,
			q.explanation,
			qq.position
		FROM self_belief_quiz_questions qq
		JOIN self_belief_questions q ON q.id = qq.question_id
		WHERE qq.quiz_id = $1
		ORDER BY qq.position
	`, quizID)
	if err != nil {
		return nil, nil, fmt.Errorf("get self belief quiz questions: %w", err)
	}
	defer rows.Close()

	questions := make([]*selfBeliefQuizQuestionInternal, 0)
	for rows.Next() {
		var question selfBeliefQuizQuestionInternal
		if err := rows.Scan(
			&question.ID,
			&question.Category,
			&question.Prompt,
			&question.Options,
			&question.CorrectOption,
			&question.Explanation,
			&question.Position,
		); err != nil {
			return nil, nil, fmt.Errorf("scan self belief quiz question: %w", err)
		}
		questions = append(questions, &question)
	}

	quiz.QuestionCount = len(questions)
	return &quiz, questions, nil
}

func (r *SelfBeliefRepository) getQuizAttemptTx(ctx context.Context, tx pgx.Tx, attemptID string) (*selfBeliefQuizAttemptRow, error) {
	row := tx.QueryRow(ctx, `
		SELECT
			id,
			quiz_id,
			user_id,
			quiz_title,
			wager,
			status,
			total_questions,
			entry_cost
		FROM self_belief_quiz_attempts
		WHERE id = $1
		FOR UPDATE
	`, attemptID)

	var attempt selfBeliefQuizAttemptRow
	if err := row.Scan(
		&attempt.ID,
		&attempt.QuizID,
		&attempt.UserID,
		&attempt.QuizTitle,
		&attempt.Wager,
		&attempt.Status,
		&attempt.TotalQuestions,
		&attempt.EntryCost,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("матч не найден")
		}
		return nil, fmt.Errorf("get self belief quiz attempt: %w", err)
	}

	return &attempt, nil
}

func collectQuizIDs(quizzes []*model.SelfBeliefQuiz) []string {
	ids := make([]string, 0, len(quizzes))
	for _, quiz := range quizzes {
		ids = append(ids, quiz.ID)
	}
	return ids
}

func resolveCorgiSelection(attemptID, questionID string, position, correctOption, optionCount int) (int, bool) {
	if optionCount <= 1 {
		return correctOption, true
	}

	baseAccuracy := 46 + int(hashFNV32(attemptID)%11)
	seed := hashFNV32(fmt.Sprintf("%s:%s:%d", attemptID, questionID, position))
	isCorrect := int(seed%100) < baseAccuracy
	if isCorrect {
		return correctOption, true
	}

	wrongOptions := make([]int, 0, optionCount-1)
	for index := 0; index < optionCount; index++ {
		if index != correctOption {
			wrongOptions = append(wrongOptions, index)
		}
	}

	selected := wrongOptions[int((seed/97)%uint32(len(wrongOptions)))]
	return selected, false
}

func resolveCorgiRevealAfterMs(attemptID, questionID string, position int) int {
	seed := hashFNV32(fmt.Sprintf("%s:%s:%d", attemptID, questionID, position))
	return (2 + int((seed/29)%6)) * 1000
}

func hashFNV32(value string) uint32 {
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(value))
	return hasher.Sum32()
}
