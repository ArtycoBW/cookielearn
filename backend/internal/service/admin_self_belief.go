package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/cookielearn/backend/internal/model"
)

func (s *AdminService) GetSelfBeliefQuestions(ctx context.Context) ([]*model.SelfBeliefQuestion, error) {
	return s.selfBeliefRepo.GetAllQuestions(ctx)
}

func (s *AdminService) CreateSelfBeliefQuestion(
	ctx context.Context,
	question *model.SelfBeliefQuestion,
	adminID string,
) error {
	if err := normalizeSelfBeliefQuestion(question); err != nil {
		return err
	}

	question.CreatedBy = &adminID
	return s.selfBeliefRepo.CreateQuestion(ctx, question)
}

func (s *AdminService) UpdateSelfBeliefQuestion(ctx context.Context, question *model.SelfBeliefQuestion) error {
	if strings.TrimSpace(question.ID) == "" {
		return fmt.Errorf("id обязателен")
	}
	if err := normalizeSelfBeliefQuestion(question); err != nil {
		return err
	}

	return s.selfBeliefRepo.UpdateQuestion(ctx, question)
}

func (s *AdminService) DeleteSelfBeliefQuestion(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return fmt.Errorf("id обязателен")
	}

	return s.selfBeliefRepo.DeleteQuestion(ctx, strings.TrimSpace(id))
}

func normalizeSelfBeliefQuestion(question *model.SelfBeliefQuestion) error {
	question.Category = strings.TrimSpace(question.Category)
	question.Prompt = strings.TrimSpace(question.Prompt)
	question.Explanation = normalizeOptionalText(question.Explanation)

	if question.Category == "" || question.Prompt == "" {
		return fmt.Errorf("category и prompt обязательны")
	}
	if !isValidSelfBeliefWager(question.Wager) {
		return fmt.Errorf("ставка должна быть 1, 3 или 5 печенек")
	}
	if question.CorrectOption < 0 || question.CorrectOption > 3 {
		return fmt.Errorf("correct_option должен быть от 0 до 3")
	}
	if len(question.Options) != 4 {
		return fmt.Errorf("нужно указать ровно 4 варианта ответа")
	}

	normalizedOptions := make([]string, 0, len(question.Options))
	uniqueOptions := make(map[string]struct{}, len(question.Options))

	for _, option := range question.Options {
		value := strings.TrimSpace(option)
		if value == "" {
			return fmt.Errorf("варианты ответа не могут быть пустыми")
		}
		key := strings.ToLower(value)
		if _, exists := uniqueOptions[key]; exists {
			return fmt.Errorf("варианты ответа должны быть уникальными")
		}

		uniqueOptions[key] = struct{}{}
		normalizedOptions = append(normalizedOptions, value)
	}

	question.Options = normalizedOptions
	return nil
}
