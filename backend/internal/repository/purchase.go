package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
)

type PurchaseRepository struct {
	db *DB
}

func NewPurchaseRepository(db *DB) *PurchaseRepository {
	return &PurchaseRepository{db: db}
}

func (r *PurchaseRepository) Create(ctx context.Context, p *model.Purchase) error {
	query := `
		INSERT INTO purchases (user_id, certificate_id, price_paid)
		VALUES ($1, $2, $3)
		RETURNING id, purchased_at, expires_at, status
	`

	if err := r.db.Pool.QueryRow(ctx, query, p.UserID, p.CertificateID, p.PricePaid).
		Scan(&p.ID, &p.PurchasedAt, &p.ExpiresAt, &p.Status); err != nil {
		return fmt.Errorf("create purchase: %w", err)
	}

	return nil
}

func (r *PurchaseRepository) GetByUserID(ctx context.Context, userID string) ([]*model.Purchase, error) {
	query := `
		SELECT p.id, p.user_id, p.certificate_id, p.price_paid, p.purchased_at,
		       p.expires_at, p.used_at, p.status,
		       c.id, c.title, c.description, c.base_price, c.current_price,
		       c.inflation_step, c.total_quantity, c.remaining_quantity, c.validity_days,
		       c.expires_at, c.background_image, c.is_active, c.created_at, c.updated_at
		FROM purchases p
		JOIN certificates c ON p.certificate_id = c.id
		WHERE p.user_id = $1
		ORDER BY p.purchased_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get purchases by user: %w", err)
	}
	defer rows.Close()

	var purchases []*model.Purchase
	for rows.Next() {
		var purchase model.Purchase
		var certificate model.Certificate

		if err := rows.Scan(
			&purchase.ID,
			&purchase.UserID,
			&purchase.CertificateID,
			&purchase.PricePaid,
			&purchase.PurchasedAt,
			&purchase.ExpiresAt,
			&purchase.UsedAt,
			&purchase.Status,
			&certificate.ID,
			&certificate.Title,
			&certificate.Description,
			&certificate.BasePrice,
			&certificate.CurrentPrice,
			&certificate.InflationStep,
			&certificate.TotalQuantity,
			&certificate.RemainingQuantity,
			&certificate.ValidityDays,
			&certificate.ExpiresAt,
			&certificate.BackgroundImage,
			&certificate.IsActive,
			&certificate.CreatedAt,
			&certificate.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan purchase: %w", err)
		}

		purchase.Certificate = &certificate
		purchases = append(purchases, &purchase)
	}

	return purchases, nil
}

func (r *PurchaseRepository) GetAll(ctx context.Context) ([]*model.PurchaseHistoryEntry, error) {
	query := `
		SELECT
			p.id,
			p.user_id,
			prof.full_name,
			prof.group_name,
			ac.login,
			p.certificate_id,
			c.title,
			p.price_paid,
			p.purchased_at,
			p.expires_at,
			p.used_at,
			p.status
		FROM purchases p
		JOIN profiles prof ON prof.id = p.user_id
		JOIN certificates c ON c.id = p.certificate_id
		LEFT JOIN account_credentials ac ON ac.user_id = prof.id
		ORDER BY p.purchased_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get all purchases: %w", err)
	}
	defer rows.Close()

	var items []*model.PurchaseHistoryEntry
	for rows.Next() {
		var item model.PurchaseHistoryEntry
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.UserFullName,
			&item.UserGroupName,
			&item.UserLogin,
			&item.CertificateID,
			&item.CertificateTitle,
			&item.PricePaid,
			&item.PurchasedAt,
			&item.ExpiresAt,
			&item.UsedAt,
			&item.Status,
		); err != nil {
			return nil, fmt.Errorf("scan purchase history: %w", err)
		}
		items = append(items, &item)
	}

	return items, nil
}

func (r *PurchaseRepository) UpdateStatus(ctx context.Context, id, status string) error {
	query := `
		UPDATE purchases
		SET status = $2, used_at = CASE WHEN $2 = 'used' THEN NOW() ELSE used_at END
		WHERE id = $1
	`

	if _, err := r.db.Pool.Exec(ctx, query, id, status); err != nil {
		return fmt.Errorf("update purchase status: %w", err)
	}

	return nil
}

func (r *PurchaseRepository) MarkAsUsed(ctx context.Context, purchaseID, userID string) error {
	query := `
		UPDATE purchases
		SET status = 'used', used_at = NOW()
		WHERE id = $1 AND user_id = $2 AND status = 'active'
	`

	result, err := r.db.Pool.Exec(ctx, query, purchaseID, userID)
	if err != nil {
		return fmt.Errorf("mark purchase as used: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("сертификат не найден или уже использован")
	}

	return nil
}
