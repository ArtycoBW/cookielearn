package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/cookielearn/backend/internal/model"
)

var selfBeliefAllowedWagers = map[int]struct{}{
	1: {},
	3: {},
	5: {},
}

func (s *StudentService) GetSelfBeliefOverview(ctx context.Context, userID string) (*model.SelfBeliefOverview, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("user id обязателен")
	}

	return s.selfBeliefRepo.GetOverview(ctx, userID)
}

func (s *StudentService) GetSelfBeliefQuestion(
	ctx context.Context,
	userID string,
	wager int,
	category string,
) (*model.SelfBeliefQuestionPublic, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("user id обязателен")
	}
	if !isValidSelfBeliefWager(wager) {
		return nil, fmt.Errorf("ставка должна быть 1, 3 или 5 печенек")
	}

	question, err := s.selfBeliefRepo.GetNextQuestion(ctx, userID, wager, strings.TrimSpace(category))
	if err != nil {
		return nil, err
	}
	if question == nil {
		return nil, nil
	}

	return &model.SelfBeliefQuestionPublic{
		ID:       question.ID,
		Category: question.Category,
		Wager:    question.Wager,
		Prompt:   question.Prompt,
		Options:  append([]string(nil), question.Options...),
	}, nil
}

func (s *StudentService) AnswerSelfBeliefQuestion(
	ctx context.Context,
	userID string,
	questionID string,
	wager int,
	selectedOption int,
) (*model.SelfBeliefAnswerResult, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("user id обязателен")
	}
	if strings.TrimSpace(questionID) == "" {
		return nil, fmt.Errorf("question_id обязателен")
	}
	if !isValidSelfBeliefWager(wager) {
		return nil, fmt.Errorf("ставка должна быть 1, 3 или 5 печенек")
	}
	if selectedOption < 0 || selectedOption > 3 {
		return nil, fmt.Errorf("нужно выбрать один из вариантов ответа")
	}

	return s.selfBeliefRepo.AnswerQuestion(ctx, userID, strings.TrimSpace(questionID), wager, selectedOption)
}

func isValidSelfBeliefWager(wager int) bool {
	_, ok := selfBeliefAllowedWagers[wager]
	return ok
}
