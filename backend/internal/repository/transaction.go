package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
)

type TransactionRepository struct {
	db *DB
}

func NewTransactionRepository(db *DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

func (r *TransactionRepository) Create(ctx context.Context, tx *model.Transaction) error {
	query := `
		INSERT INTO cookie_transactions (user_id, amount, reason, category, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`

	err := r.db.Pool.QueryRow(ctx, query,
		tx.UserID, tx.Amount, tx.Reason, tx.Category, tx.CreatedBy,
	).Scan(&tx.ID, &tx.CreatedAt)

	if err != nil {
		return fmt.Errorf("create transaction: %w", err)
	}

	return nil
}

func (r *TransactionRepository) GetByUserID(ctx context.Context, userID string, limit int) ([]*model.Transaction, error) {
	query := `
		SELECT id, user_id, amount, reason, category, created_by, created_at
		FROM cookie_transactions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("get transactions by user: %w", err)
	}
	defer rows.Close()

	var transactions []*model.Transaction
	for rows.Next() {
		var t model.Transaction
		err := rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Reason, &t.Category, &t.CreatedBy, &t.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		transactions = append(transactions, &t)
	}

	return transactions, nil
}

func (r *TransactionRepository) GetAll(ctx context.Context, limit int) ([]*model.Transaction, error) {
	query := `
		SELECT id, user_id, amount, reason, category, created_by, created_at
		FROM cookie_transactions
		ORDER BY created_at DESC
		LIMIT $1
	`

	rows, err := r.db.Pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("get all transactions: %w", err)
	}
	defer rows.Close()

	var transactions []*model.Transaction
	for rows.Next() {
		var t model.Transaction
		err := rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Reason, &t.Category, &t.CreatedBy, &t.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		transactions = append(transactions, &t)
	}

	return transactions, nil
}
