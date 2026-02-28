package service

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
	"github.com/cookielearn/backend/internal/repository"
)

type StudentService struct {
	profileRepo *repository.ProfileRepository
	txRepo      *repository.TransactionRepository
	purchRepo   *repository.PurchaseRepository
	bonusRepo   *repository.DailyBonusRepository
}

func NewStudentService(
	profileRepo *repository.ProfileRepository,
	txRepo *repository.TransactionRepository,
	purchRepo *repository.PurchaseRepository,
	bonusRepo *repository.DailyBonusRepository,
) *StudentService {
	return &StudentService{
		profileRepo: profileRepo,
		txRepo:      txRepo,
		purchRepo:   purchRepo,
		bonusRepo:   bonusRepo,
	}
}

func (s *StudentService) GetProfile(ctx context.Context, userID string) (*model.Profile, error) {
	return s.profileRepo.GetByID(ctx, userID)
}

func (s *StudentService) GetTransactions(ctx context.Context, userID string, limit int) ([]*model.Transaction, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return s.txRepo.GetByUserID(ctx, userID, limit)
}

func (s *StudentService) GetPurchases(ctx context.Context, userID string) ([]*model.Purchase, error) {
	return s.purchRepo.GetByUserID(ctx, userID)
}

func (s *StudentService) ClaimDailyBonus(ctx context.Context, userID string) (*model.DailyBonus, error) {
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

	transaction := &model.Transaction{
		UserID:   userID,
		Amount:   1,
		Reason:   "Ежедневный бонус",
		Category: strPtr("daily_bonus"),
	}

	if err := s.txRepo.Create(ctx, transaction); err != nil {
		return nil, fmt.Errorf("create transaction: %w", err)
	}

	return bonus, nil
}

func (s *StudentService) GetLeaderboard(ctx context.Context, limit int) ([]*model.LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.profileRepo.GetLeaderboard(ctx, limit)
}
