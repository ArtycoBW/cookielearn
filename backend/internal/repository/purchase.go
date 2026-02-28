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

	err := r.db.Pool.QueryRow(ctx, query,
		p.UserID, p.CertificateID, p.PricePaid,
	).Scan(&p.ID, &p.PurchasedAt, &p.ExpiresAt, &p.Status)

	if err != nil {
		return fmt.Errorf("create purchase: %w", err)
	}

	return nil
}

func (r *PurchaseRepository) GetByUserID(ctx context.Context, userID string) ([]*model.Purchase, error) {
	query := `
		SELECT p.id, p.user_id, p.certificate_id, p.price_paid, p.purchased_at,
			   p.expires_at, p.used_at, p.status,
			   c.id, c.title, c.description, c.validity_days
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
		var p model.Purchase
		var c model.Certificate

		if err := rows.Scan(
			&p.ID, &p.UserID, &p.CertificateID, &p.PricePaid, &p.PurchasedAt,
			&p.ExpiresAt, &p.UsedAt, &p.Status,
			&c.ID, &c.Title, &c.Description, &c.ValidityDays,
		); err != nil {
			return nil, fmt.Errorf("scan purchase: %w", err)
		}

		p.Certificate = &c
		purchases = append(purchases, &p)
	}

	return purchases, nil
}

func (r *PurchaseRepository) UpdateStatus(ctx context.Context, id, status string) error {
	query := `
		UPDATE purchases
		SET status = $2, used_at = CASE WHEN $2 = 'used' THEN NOW() ELSE used_at END
		WHERE id = $1
	`

	_, err := r.db.Pool.Exec(ctx, query, id, status)
	if err != nil {
		return fmt.Errorf("update purchase status: %w", err)
	}

	return nil
}
