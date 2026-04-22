package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/cookielearn/backend/internal/model"
)

func (s *StudentService) GetSelfBeliefQuizOverview(ctx context.Context, userID string) (*model.SelfBeliefQuizOverview, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("user id обязателен")
	}

	return s.selfBeliefRepo.GetQuizOverview(ctx, userID)
}

func (s *StudentService) GetAvailableSelfBeliefQuizzes(ctx context.Context) ([]*model.SelfBeliefQuiz, error) {
	return s.selfBeliefRepo.GetActiveQuizzes(ctx)
}

func (s *StudentService) StartSelfBeliefQuiz(ctx context.Context, userID, quizID string) (*model.SelfBeliefQuizStartResult, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("user id обязателен")
	}
	if strings.TrimSpace(quizID) == "" {
		return nil, fmt.Errorf("quiz_id обязателен")
	}

	return s.selfBeliefRepo.StartQuizAttempt(ctx, userID, strings.TrimSpace(quizID))
}

func (s *StudentService) FinishSelfBeliefQuiz(
	ctx context.Context,
	userID string,
	attemptID string,
	answers []model.SelfBeliefQuizAnswerSubmission,
) (*model.SelfBeliefQuizAttemptResult, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("user id обязателен")
	}
	if strings.TrimSpace(attemptID) == "" {
		return nil, fmt.Errorf("attempt_id обязателен")
	}

	cleanAnswers := make([]model.SelfBeliefQuizAnswerSubmission, 0, len(answers))
	for _, answer := range answers {
		questionID := strings.TrimSpace(answer.QuestionID)
		if questionID == "" {
			continue
		}

		if answer.ResponseMs < 0 {
			answer.ResponseMs = 0
		}
		if answer.ResponseMs > 60_000 {
			answer.ResponseMs = 60_000
		}

		answer.QuestionID = questionID
		cleanAnswers = append(cleanAnswers, answer)
	}

	return s.selfBeliefRepo.FinishQuizAttempt(ctx, userID, strings.TrimSpace(attemptID), cleanAnswers)
}
