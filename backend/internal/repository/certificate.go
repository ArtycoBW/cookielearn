package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
)

type CertificateRepository struct {
	db *DB
}

func NewCertificateRepository(db *DB) *CertificateRepository {
	return &CertificateRepository{db: db}
}

func (r *CertificateRepository) GetAll(ctx context.Context, activeOnly bool) ([]*model.Certificate, error) {
	query := `
		SELECT id, title, description, base_price, current_price, inflation_step,
		       total_quantity, remaining_quantity, validity_days, expires_at, background_image,
		       (background_image IS NOT NULL) AS has_background,
		       is_active, created_at, updated_at
		FROM certificates
	`
	if activeOnly {
		query += ` WHERE is_active = true AND (expires_at IS NULL OR expires_at >= NOW())`
	}
	query += ` ORDER BY current_price ASC, created_at DESC`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get certificates: %w", err)
	}
	defer rows.Close()

	var certificates []*model.Certificate
	for rows.Next() {
		var c model.Certificate
		if err := rows.Scan(
			&c.ID,
			&c.Title,
			&c.Description,
			&c.BasePrice,
			&c.CurrentPrice,
			&c.InflationStep,
			&c.TotalQuantity,
			&c.RemainingQuantity,
			&c.ValidityDays,
			&c.ExpiresAt,
			&c.BackgroundImage,
			&c.HasBackground,
			&c.IsActive,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan certificate: %w", err)
		}
		certificates = append(certificates, &c)
	}

	return certificates, nil
}

func (r *CertificateRepository) GetByID(ctx context.Context, id string) (*model.Certificate, error) {
	query := `
		SELECT id, title, description, base_price, current_price, inflation_step,
		       total_quantity, remaining_quantity, validity_days, expires_at, background_image,
		       (background_image IS NOT NULL) AS has_background,
		       is_active, created_at, updated_at
		FROM certificates
		WHERE id = $1
	`

	var c model.Certificate
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&c.ID,
		&c.Title,
		&c.Description,
		&c.BasePrice,
		&c.CurrentPrice,
		&c.InflationStep,
		&c.TotalQuantity,
		&c.RemainingQuantity,
		&c.ValidityDays,
		&c.ExpiresAt,
		&c.BackgroundImage,
		&c.HasBackground,
		&c.IsActive,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get certificate by id: %w", err)
	}

	return &c, nil
}

func (r *CertificateRepository) GetCatalog(ctx context.Context, activeOnly bool) ([]*model.Certificate, error) {
	query := `
		SELECT id, title, description, base_price, current_price, inflation_step,
		       total_quantity, remaining_quantity, validity_days, expires_at,
		       (background_image IS NOT NULL) AS has_background,
		       is_active, created_at, updated_at
		FROM certificates
	`
	if activeOnly {
		query += ` WHERE is_active = true AND (expires_at IS NULL OR expires_at >= NOW())`
	}
	query += ` ORDER BY current_price ASC, created_at DESC`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get certificate catalog: %w", err)
	}
	defer rows.Close()

	var certificates []*model.Certificate
	for rows.Next() {
		var c model.Certificate
		if err := rows.Scan(
			&c.ID,
			&c.Title,
			&c.Description,
			&c.BasePrice,
			&c.CurrentPrice,
			&c.InflationStep,
			&c.TotalQuantity,
			&c.RemainingQuantity,
			&c.ValidityDays,
			&c.ExpiresAt,
			&c.HasBackground,
			&c.IsActive,
			&c.CreatedAt,
			&c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan certificate catalog: %w", err)
		}
		certificates = append(certificates, &c)
	}

	return certificates, nil
}

func (r *CertificateRepository) GetBackground(ctx context.Context, id string) (*string, error) {
	query := `SELECT background_image FROM certificates WHERE id = $1`

	var background *string
	if err := r.db.Pool.QueryRow(ctx, query, id).Scan(&background); err != nil {
		return nil, fmt.Errorf("get certificate background: %w", err)
	}

	return background, nil
}

func (r *CertificateRepository) Create(ctx context.Context, c *model.Certificate) error {
	query := `
		INSERT INTO certificates (
			title,
			description,
			base_price,
			current_price,
			inflation_step,
			total_quantity,
			remaining_quantity,
			validity_days,
			expires_at,
			background_image,
			is_active
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at
	`

	err := r.db.Pool.QueryRow(ctx, query,
		c.Title,
		c.Description,
		c.BasePrice,
		c.CurrentPrice,
		c.InflationStep,
		c.TotalQuantity,
		c.RemainingQuantity,
		c.ValidityDays,
		c.ExpiresAt,
		c.BackgroundImage,
		c.IsActive,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create certificate: %w", err)
	}

	return nil
}

func (r *CertificateRepository) Update(ctx context.Context, c *model.Certificate) error {
	query := `
		UPDATE certificates
		SET title = $2,
			description = $3,
			base_price = $4,
			current_price = $5,
			inflation_step = $6,
			total_quantity = $7,
			remaining_quantity = $8,
			validity_days = $9,
			expires_at = $10,
			background_image = $11,
			is_active = $12
		WHERE id = $1
		RETURNING updated_at
	`

	err := r.db.Pool.QueryRow(ctx, query,
		c.ID,
		c.Title,
		c.Description,
		c.BasePrice,
		c.CurrentPrice,
		c.InflationStep,
		c.TotalQuantity,
		c.RemainingQuantity,
		c.ValidityDays,
		c.ExpiresAt,
		c.BackgroundImage,
		c.IsActive,
	).Scan(&c.UpdatedAt)
	if err != nil {
		return fmt.Errorf("update certificate: %w", err)
	}

	return nil
}

func (r *CertificateRepository) Delete(ctx context.Context, id string) error {
	var count int
	if err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM purchases WHERE certificate_id = $1`, id).Scan(&count); err != nil {
		return fmt.Errorf("check certificate purchases: %w", err)
	}
	if count > 0 {
		return fmt.Errorf("нельзя удалить сертификат: оформлено %d покупок — сначала удалите их вручную", count)
	}

	_, err := r.db.Pool.Exec(ctx, `DELETE FROM certificates WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete certificate: %w", err)
	}
	return nil
}

func (r *CertificateRepository) UpdatePriceAndQuantity(ctx context.Context, id string) error {
	query := `
		UPDATE certificates
		SET current_price = current_price + inflation_step,
			remaining_quantity = CASE
				WHEN remaining_quantity IS NOT NULL THEN remaining_quantity - 1
				ELSE NULL
			END,
			is_active = CASE
				WHEN remaining_quantity IS NOT NULL AND remaining_quantity - 1 <= 0 THEN false
				WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN false
				ELSE is_active
			END
		WHERE id = $1
	`

	_, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("update certificate price and quantity: %w", err)
	}

	return nil
}
