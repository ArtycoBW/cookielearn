package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
)

type AccountCredentialRepository struct {
	db *DB
}

func NewAccountCredentialRepository(db *DB) *AccountCredentialRepository {
	return &AccountCredentialRepository{db: db}
}

func (r *AccountCredentialRepository) Upsert(ctx context.Context, userID, login, email, password string) error {
	query := `
		INSERT INTO account_credentials (user_id, login, email, password_plain)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE
		SET login = EXCLUDED.login,
			email = EXCLUDED.email,
			password_plain = EXCLUDED.password_plain,
			updated_at = NOW()
	`

	if _, err := r.db.Pool.Exec(ctx, query, userID, login, email, password); err != nil {
		return fmt.Errorf("upsert account credential: %w", err)
	}

	return nil
}

func (r *AccountCredentialRepository) GetAll(ctx context.Context) ([]*model.AccountCredential, error) {
	query := `
		SELECT ac.user_id, p.full_name, p.group_name, p.role,
		       ac.login, ac.email, ac.password_plain, ac.created_at, ac.updated_at
		FROM account_credentials ac
		JOIN profiles p ON p.id = ac.user_id
		ORDER BY CASE WHEN p.role = 'admin' THEN 0 ELSE 1 END, p.full_name ASC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get account credentials: %w", err)
	}
	defer rows.Close()

	var credentials []*model.AccountCredential
	for rows.Next() {
		var item model.AccountCredential
		if err := rows.Scan(
			&item.UserID,
			&item.FullName,
			&item.GroupName,
			&item.Role,
			&item.Login,
			&item.Email,
			&item.Password,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan account credential: %w", err)
		}
		credentials = append(credentials, &item)
	}

	return credentials, nil
}
