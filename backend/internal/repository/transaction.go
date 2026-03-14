package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
	"github.com/jackc/pgx/v5"
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
	`

	var (
		rows pgx.Rows
		err  error
	)
	if limit > 0 {
		rows, err = r.db.Pool.Query(ctx, query+"\nLIMIT $2", userID, limit)
	} else {
		rows, err = r.db.Pool.Query(ctx, query, userID)
	}
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
	`

	var (
		rows pgx.Rows
		err  error
	)
	if limit > 0 {
		rows, err = r.db.Pool.Query(ctx, query+"\nLIMIT $1", limit)
	} else {
		rows, err = r.db.Pool.Query(ctx, query)
	}
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

func (r *TransactionRepository) GetHistory(ctx context.Context, limit int) ([]*model.TransactionHistoryEntry, error) {
	query := `
		SELECT
			t.id,
			t.user_id,
			p.full_name,
			p.group_name,
			ac.login,
			t.amount,
			t.reason,
			t.category,
			t.created_by,
			admin.full_name,
			t.created_at
		FROM cookie_transactions t
		JOIN profiles p ON p.id = t.user_id
		LEFT JOIN account_credentials ac ON ac.user_id = p.id
		LEFT JOIN profiles admin ON admin.id = t.created_by
		ORDER BY t.created_at DESC
	`

	var (
		rows pgx.Rows
		err  error
	)
	if limit > 0 {
		rows, err = r.db.Pool.Query(ctx, query+"\nLIMIT $1", limit)
	} else {
		rows, err = r.db.Pool.Query(ctx, query)
	}
	if err != nil {
		return nil, fmt.Errorf("get transaction history: %w", err)
	}
	defer rows.Close()

	var items []*model.TransactionHistoryEntry
	for rows.Next() {
		var item model.TransactionHistoryEntry
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.UserFullName,
			&item.UserGroupName,
			&item.UserLogin,
			&item.Amount,
			&item.Reason,
			&item.Category,
			&item.CreatedBy,
			&item.CreatedByName,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan transaction history: %w", err)
		}
		items = append(items, &item)
	}

	return items, nil
}
