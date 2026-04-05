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
	queryWithBadges := `
		INSERT INTO cookie_transactions (user_id, amount, reason, category, badge_icon, badge_title, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`

	err := r.db.Pool.QueryRow(ctx, queryWithBadges,
		tx.UserID, tx.Amount, tx.Reason, tx.Category, tx.BadgeIcon, tx.BadgeTitle, tx.CreatedBy,
	).Scan(&tx.ID, &tx.CreatedAt)
	if err != nil && isUndefinedColumnError(err, "badge_icon") {
		if tx.BadgeIcon != nil || tx.BadgeTitle != nil {
			return fmt.Errorf("create transaction: badge columns are unavailable in the current database schema")
		}

		queryWithoutBadges := `
			INSERT INTO cookie_transactions (user_id, amount, reason, category, created_by)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, created_at
		`
		err = r.db.Pool.QueryRow(ctx, queryWithoutBadges,
			tx.UserID, tx.Amount, tx.Reason, tx.Category, tx.CreatedBy,
		).Scan(&tx.ID, &tx.CreatedAt)
	}

	if err != nil {
		return fmt.Errorf("create transaction: %w", err)
	}

	return nil
}

func (r *TransactionRepository) GetByUserID(ctx context.Context, userID string, limit int) ([]*model.Transaction, error) {
	queryWithBadges := `
		SELECT id, user_id, amount, reason, category, badge_icon, badge_title, created_by, created_at
		FROM cookie_transactions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	queryWithoutBadges := `
		SELECT id, user_id, amount, reason, category, created_by, created_at
		FROM cookie_transactions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	var (
		rows      pgx.Rows
		err       error
		hasBadges = true
	)
	if limit > 0 {
		rows, err = r.db.Pool.Query(ctx, queryWithBadges+"\nLIMIT $2", userID, limit)
	} else {
		rows, err = r.db.Pool.Query(ctx, queryWithBadges, userID)
	}
	if err != nil && isUndefinedColumnError(err, "badge_icon") {
		hasBadges = false
		if limit > 0 {
			rows, err = r.db.Pool.Query(ctx, queryWithoutBadges+"\nLIMIT $2", userID, limit)
		} else {
			rows, err = r.db.Pool.Query(ctx, queryWithoutBadges, userID)
		}
	}
	if err != nil {
		return nil, fmt.Errorf("get transactions by user: %w", err)
	}
	defer rows.Close()

	var transactions []*model.Transaction
	for rows.Next() {
		var t model.Transaction
		if hasBadges {
			err = rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Reason, &t.Category, &t.BadgeIcon, &t.BadgeTitle, &t.CreatedBy, &t.CreatedAt)
		} else {
			err = rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Reason, &t.Category, &t.CreatedBy, &t.CreatedAt)
		}
		if err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		transactions = append(transactions, &t)
	}

	return transactions, nil
}

func (r *TransactionRepository) GetAll(ctx context.Context, limit int) ([]*model.Transaction, error) {
	queryWithBadges := `
		SELECT id, user_id, amount, reason, category, badge_icon, badge_title, created_by, created_at
		FROM cookie_transactions
		ORDER BY created_at DESC
	`
	queryWithoutBadges := `
		SELECT id, user_id, amount, reason, category, created_by, created_at
		FROM cookie_transactions
		ORDER BY created_at DESC
	`

	var (
		rows      pgx.Rows
		err       error
		hasBadges = true
	)
	if limit > 0 {
		rows, err = r.db.Pool.Query(ctx, queryWithBadges+"\nLIMIT $1", limit)
	} else {
		rows, err = r.db.Pool.Query(ctx, queryWithBadges)
	}
	if err != nil && isUndefinedColumnError(err, "badge_icon") {
		hasBadges = false
		if limit > 0 {
			rows, err = r.db.Pool.Query(ctx, queryWithoutBadges+"\nLIMIT $1", limit)
		} else {
			rows, err = r.db.Pool.Query(ctx, queryWithoutBadges)
		}
	}
	if err != nil {
		return nil, fmt.Errorf("get all transactions: %w", err)
	}
	defer rows.Close()

	var transactions []*model.Transaction
	for rows.Next() {
		var t model.Transaction
		if hasBadges {
			err = rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Reason, &t.Category, &t.BadgeIcon, &t.BadgeTitle, &t.CreatedBy, &t.CreatedAt)
		} else {
			err = rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Reason, &t.Category, &t.CreatedBy, &t.CreatedAt)
		}
		if err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		transactions = append(transactions, &t)
	}

	return transactions, nil
}

func (r *TransactionRepository) GetHistory(ctx context.Context, limit int) ([]*model.TransactionHistoryEntry, error) {
	queryWithBadges := `
		SELECT
			t.id,
			t.user_id,
			p.full_name,
			p.group_name,
			ac.login,
			t.amount,
			t.reason,
			t.category,
			t.badge_icon,
			t.badge_title,
			t.created_by,
			admin.full_name,
			t.created_at
		FROM cookie_transactions t
		JOIN profiles p ON p.id = t.user_id
		LEFT JOIN account_credentials ac ON ac.user_id = p.id
		LEFT JOIN profiles admin ON admin.id = t.created_by
		ORDER BY t.created_at DESC
	`
	queryWithoutBadges := `
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
		rows      pgx.Rows
		err       error
		hasBadges = true
	)
	if limit > 0 {
		rows, err = r.db.Pool.Query(ctx, queryWithBadges+"\nLIMIT $1", limit)
	} else {
		rows, err = r.db.Pool.Query(ctx, queryWithBadges)
	}
	if err != nil && isUndefinedColumnError(err, "badge_icon") {
		hasBadges = false
		if limit > 0 {
			rows, err = r.db.Pool.Query(ctx, queryWithoutBadges+"\nLIMIT $1", limit)
		} else {
			rows, err = r.db.Pool.Query(ctx, queryWithoutBadges)
		}
	}
	if err != nil {
		return nil, fmt.Errorf("get transaction history: %w", err)
	}
	defer rows.Close()

	var items []*model.TransactionHistoryEntry
	for rows.Next() {
		var item model.TransactionHistoryEntry
		if hasBadges {
			err = rows.Scan(
				&item.ID,
				&item.UserID,
				&item.UserFullName,
				&item.UserGroupName,
				&item.UserLogin,
				&item.Amount,
				&item.Reason,
				&item.Category,
				&item.BadgeIcon,
				&item.BadgeTitle,
				&item.CreatedBy,
				&item.CreatedByName,
				&item.CreatedAt,
			)
		} else {
			err = rows.Scan(
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
			)
		}
		if err != nil {
			return nil, fmt.Errorf("scan transaction history: %w", err)
		}
		items = append(items, &item)
	}

	return items, nil
}
