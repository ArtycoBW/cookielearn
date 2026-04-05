package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/cookielearn/backend/internal/model"
	"github.com/cookielearn/backend/internal/repository"
)

type StudentService struct {
	profileRepo        *repository.ProfileRepository
	txRepo             *repository.TransactionRepository
	purchRepo          *repository.PurchaseRepository
	bonusRepo          *repository.DailyBonusRepository
	materialRepo       *repository.MaterialRepository
	surveyRepo         *repository.SurveyRepository
	taskRepo           *repository.TaskRepository
	taskSubmissionRepo *repository.TaskSubmissionRepository
}

func NewStudentService(
	profileRepo *repository.ProfileRepository,
	txRepo *repository.TransactionRepository,
	purchRepo *repository.PurchaseRepository,
	bonusRepo *repository.DailyBonusRepository,
	materialRepo *repository.MaterialRepository,
	surveyRepo *repository.SurveyRepository,
	taskRepo *repository.TaskRepository,
	taskSubmissionRepo *repository.TaskSubmissionRepository,
) *StudentService {
	return &StudentService{
		profileRepo:        profileRepo,
		txRepo:             txRepo,
		purchRepo:          purchRepo,
		bonusRepo:          bonusRepo,
		materialRepo:       materialRepo,
		surveyRepo:         surveyRepo,
		taskRepo:           taskRepo,
		taskSubmissionRepo: taskSubmissionRepo,
	}
}

func (s *StudentService) GetProfile(ctx context.Context, userID string) (*model.Profile, error) {
	profile, err := s.profileRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if err := applyProgressToProfiles(ctx, s.profileRepo, []*model.Profile{profile}); err != nil {
		return nil, err
	}

	return profile, nil
}

func (s *StudentService) GetTransactions(ctx context.Context, userID string, limit int) ([]*model.Transaction, error) {
	if limit > 100 {
		limit = 100
	}

	return s.txRepo.GetByUserID(ctx, userID, limit)
}

func (s *StudentService) GetPurchases(ctx context.Context, userID string) ([]*model.Purchase, error) {
	return s.purchRepo.GetByUserID(ctx, userID)
}

func (s *StudentService) ClaimDailyBonus(ctx context.Context, userID string) (*model.DailyBonusClaimResult, error) {
	claimed, err := s.bonusRepo.HasClaimedToday(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("check claimed status: %w", err)
	}

	if claimed {
		return nil, fmt.Errorf("вы уже получили бонус сегодня")
	}

	bonus, err := s.bonusRepo.Create(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("create bonus: %w", err)
	}

	const baseReward = 1
	transaction := &model.Transaction{
		UserID:   userID,
		Amount:   baseReward,
		Reason:   "Ежедневный бонус",
		Category: strPtr("daily_bonus"),
	}

	if err := s.txRepo.Create(ctx, transaction); err != nil {
		return nil, fmt.Errorf("create transaction: %w", err)
	}

	streak, err := s.getStreakSummary(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("build streak summary: %w", err)
	}

	streakReward, badge := resolveStreakReward(streak.Current)
	if streakReward > 0 || badge != nil {
		category := "streak_bonus"
		streakTransaction := &model.Transaction{
			UserID:   userID,
			Amount:   streakReward,
			Reason:   fmt.Sprintf("Бонус за серию %d дн.", streak.Current),
			Category: &category,
		}

		if badge != nil {
			streakTransaction.BadgeIcon = &badge.Icon
			streakTransaction.BadgeTitle = &badge.Title
		}

		if err := s.txRepo.Create(ctx, streakTransaction); err != nil {
			return nil, fmt.Errorf("create streak transaction: %w", err)
		}
	}

	return &model.DailyBonusClaimResult{
		Bonus:        bonus,
		BaseReward:   baseReward,
		StreakReward: streakReward,
		TotalReward:  baseReward + streakReward,
		Streak:       streak,
		Badge:        badge,
	}, nil
}

func (s *StudentService) GetLeaderboard(ctx context.Context, limit int) ([]*model.LeaderboardEntry, error) {
	profiles, err := s.profileRepo.GetStudents(ctx)
	if err != nil {
		return nil, err
	}

	if err := applyProgressToProfiles(ctx, s.profileRepo, profiles); err != nil {
		return nil, err
	}

	entries := buildLeaderboardEntries(profiles)
	if limit > 0 && len(entries) > limit {
		entries = entries[:limit]
	}

	result := make([]*model.LeaderboardEntry, 0, len(entries))
	for index := range entries {
		entry := entries[index]
		result = append(result, &entry)
	}

	return result, nil
}

func (s *StudentService) SyncProfile(
	ctx context.Context,
	userID string,
	fullName string,
	groupName *string,
	role string,
) (*model.Profile, error) {
	if userID == "" {
		return nil, fmt.Errorf("user id обязателен")
	}

	if strings.TrimSpace(fullName) == "" {
		fullName = "Пользователь"
	}
	if strings.TrimSpace(role) == "" {
		role = "student"
	}

	profile, err := s.profileRepo.UpsertFromAuth(ctx, userID, strings.TrimSpace(fullName), groupName, role)
	if err != nil {
		return nil, err
	}

	if err := applyProgressToProfiles(ctx, s.profileRepo, []*model.Profile{profile}); err != nil {
		return nil, err
	}

	return profile, nil
}

func (s *StudentService) UseCertificate(ctx context.Context, userID, purchaseID string) error {
	if strings.TrimSpace(purchaseID) == "" {
		return fmt.Errorf("отсутствует ID сертификата")
	}

	return s.purchRepo.MarkAsUsed(ctx, purchaseID, userID)
}

func (s *StudentService) GetSurvey(ctx context.Context, userID string) (*model.SurveySubmission, error) {
	return s.surveyRepo.GetByUserID(ctx, userID)
}

func (s *StudentService) SubmitSurvey(ctx context.Context, userID string, answers []model.SurveyAnswer) (*model.SurveySubmission, error) {
	if userID == "" {
		return nil, fmt.Errorf("user id обязателен")
	}
	if len(answers) == 0 {
		return nil, fmt.Errorf("ответы анкеты обязательны")
	}

	existing, err := s.surveyRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("анкета уже заполнена")
	}

	cleanAnswers := make([]model.SurveyAnswer, 0, len(answers))
	for _, answer := range answers {
		text := strings.TrimSpace(answer.Answer)
		if answer.QuestionID <= 0 || text == "" {
			return nil, fmt.Errorf("в анкете есть пустые ответы")
		}
		cleanAnswers = append(cleanAnswers, model.SurveyAnswer{
			QuestionID: answer.QuestionID,
			Answer:     text,
		})
	}

	submission := &model.SurveySubmission{
		UserID:  userID,
		Answers: cleanAnswers,
	}
	if err := s.surveyRepo.Create(ctx, submission); err != nil {
		return nil, err
	}

	return s.surveyRepo.GetByUserID(ctx, userID)
}

func (s *StudentService) GetTasks(ctx context.Context, userID string) ([]*model.Task, error) {
	if err := s.taskRepo.CloseExpired(ctx); err != nil {
		return nil, err
	}

	return s.taskRepo.GetForUser(ctx, userID)
}

func (s *StudentService) GetMaterials(ctx context.Context) ([]*model.Material, error) {
	return s.materialRepo.GetAll(ctx, false)
}

func (s *StudentService) SubmitTask(ctx context.Context, userID, taskID string, responseText, responseURL *string) (*model.TaskSubmission, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(taskID) == "" {
		return nil, fmt.Errorf("user_id и task_id обязательны")
	}

	if responseText != nil {
		value := strings.TrimSpace(*responseText)
		if value == "" {
			responseText = nil
		} else {
			responseText = &value
		}
	}
	if responseURL != nil {
		value := strings.TrimSpace(*responseURL)
		if value == "" {
			responseURL = nil
		} else {
			responseURL = &value
		}
	}
	if responseText == nil && responseURL == nil {
		return nil, fmt.Errorf("нужно добавить комментарий, ссылку или оба поля сразу")
	}

	if err := s.taskRepo.CloseExpired(ctx); err != nil {
		return nil, err
	}

	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, err
	}
	if task.Status != "active" {
		return nil, fmt.Errorf("задание уже закрыто")
	}

	submission := &model.TaskSubmission{
		TaskID:       taskID,
		UserID:       userID,
		ResponseText: responseText,
		ResponseURL:  responseURL,
	}
	if err := s.taskSubmissionRepo.Upsert(ctx, submission); err != nil {
		return nil, err
	}

	return submission, nil
}
