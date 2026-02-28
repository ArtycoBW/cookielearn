package service

import (
	"context"
	"fmt"
	"math/rand"

	"github.com/cookielearn/backend/internal/model"
	"github.com/cookielearn/backend/internal/repository"
	"github.com/jackc/pgx/v5"
)

type ShopService struct {
	certRepo  *repository.CertificateRepository
	purchRepo *repository.PurchaseRepository
	txRepo    *repository.TransactionRepository
	db        *repository.DB
}

func NewShopService(
	certRepo *repository.CertificateRepository,
	purchRepo *repository.PurchaseRepository,
	txRepo *repository.TransactionRepository,
	db *repository.DB,
) *ShopService {
	return &ShopService{
		certRepo:  certRepo,
		purchRepo: purchRepo,
		txRepo:    txRepo,
		db:        db,
	}
}

func (s *ShopService) GetCertificates(ctx context.Context) ([]*model.Certificate, error) {
	return s.certRepo.GetAll(ctx, true)
}

func (s *ShopService) BuyCertificate(ctx context.Context, userID, certID string) (*model.Purchase, error) {
	tx, err := s.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	cert, err := s.certRepo.GetByID(ctx, certID)
	if err != nil {
		return nil, fmt.Errorf("get certificate: %w", err)
	}

	if !cert.IsActive {
		return nil, fmt.Errorf("сертификат недоступен")
	}

	if cert.RemainingQuantity != nil && *cert.RemainingQuantity <= 0 {
		return nil, fmt.Errorf("сертификат закончился")
	}

	purchase := &model.Purchase{
		UserID:        userID,
		CertificateID: certID,
		PricePaid:     cert.CurrentPrice,
	}

	if err := s.purchRepo.Create(ctx, purchase); err != nil {
		return nil, fmt.Errorf("create purchase: %w", err)
	}

	transaction := &model.Transaction{
		UserID:   userID,
		Amount:   -cert.CurrentPrice,
		Reason:   fmt.Sprintf("Покупка сертификата: %s", cert.Title),
		Category: strPtr("purchase"),
	}

	if err := s.txRepo.Create(ctx, transaction); err != nil {
		return nil, fmt.Errorf("create transaction: %w", err)
	}

	if err := s.certRepo.UpdatePriceAndQuantity(ctx, certID); err != nil {
		return nil, fmt.Errorf("update certificate: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	purchase.Certificate = cert
	return purchase, nil
}

func (s *ShopService) BuyRandomBonus(ctx context.Context, userID string, cost int) (int, error) {
	reward := rand.Intn(5) + 1
	netAmount := reward - cost

	transaction := &model.Transaction{
		UserID:   userID,
		Amount:   netAmount,
		Reason:   fmt.Sprintf("Случайный бонус (-%d, +%d)", cost, reward),
		Category: strPtr("random_bonus"),
	}

	if err := s.txRepo.Create(ctx, transaction); err != nil {
		return 0, fmt.Errorf("create transaction: %w", err)
	}

	return reward, nil
}

func strPtr(s string) *string {
	return &s
}
