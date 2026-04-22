package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/cookielearn/backend/internal/model"
)

func (s *AdminService) GetSelfBeliefQuizzes(ctx context.Context) ([]*model.SelfBeliefQuiz, error) {
	return s.selfBeliefRepo.GetAllQuizzes(ctx)
}

func (s *AdminService) CreateSelfBeliefQuiz(ctx context.Context, quiz *model.SelfBeliefQuiz, adminID string) error {
	if err := normalizeSelfBeliefQuiz(quiz); err != nil {
		return err
	}

	quiz.CreatedBy = &adminID
	return s.selfBeliefRepo.CreateQuiz(ctx, quiz)
}

func (s *AdminService) UpdateSelfBeliefQuiz(ctx context.Context, quiz *model.SelfBeliefQuiz) error {
	if strings.TrimSpace(quiz.ID) == "" {
		return fmt.Errorf("id обязателен")
	}
	if err := normalizeSelfBeliefQuiz(quiz); err != nil {
		return err
	}

	return s.selfBeliefRepo.UpdateQuiz(ctx, quiz)
}

func (s *AdminService) DeleteSelfBeliefQuiz(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return fmt.Errorf("id обязателен")
	}

	return s.selfBeliefRepo.DeleteQuiz(ctx, strings.TrimSpace(id))
}

func normalizeSelfBeliefQuiz(quiz *model.SelfBeliefQuiz) error {
	quiz.Title = strings.TrimSpace(quiz.Title)
	quiz.Description = normalizeOptionalText(quiz.Description)

	if quiz.Title == "" {
		return fmt.Errorf("title обязателен")
	}
	if !isValidSelfBeliefWager(quiz.Wager) {
		return fmt.Errorf("ставка должна быть 1, 3 или 5 печенек")
	}

	quiz.TimeLimitSeconds = 10

	if len(quiz.Questions) < 3 {
		return fmt.Errorf("в тесте должно быть минимум 3 вопроса")
	}

	normalizedQuestions := make([]model.SelfBeliefQuizQuestionLink, 0, len(quiz.Questions))
	seen := make(map[string]struct{}, len(quiz.Questions))

	for _, question := range quiz.Questions {
		questionID := strings.TrimSpace(question.QuestionID)
		if questionID == "" {
			return fmt.Errorf("все вопросы теста должны иметь id")
		}
		if _, exists := seen[questionID]; exists {
			return fmt.Errorf("вопросы в тесте не должны повторяться")
		}

		seen[questionID] = struct{}{}
		normalizedQuestions = append(normalizedQuestions, model.SelfBeliefQuizQuestionLink{
			QuestionID: questionID,
			Position:   len(normalizedQuestions) + 1,
		})
	}

	quiz.Questions = normalizedQuestions
	return nil
}
