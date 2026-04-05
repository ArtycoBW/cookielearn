package repository

import (
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func isUndefinedColumnError(err error, column string) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "42703" {
		return false
	}

	if column == "" {
		return true
	}

	lowerColumn := strings.ToLower(column)
	return strings.EqualFold(pgErr.ColumnName, column) || strings.Contains(strings.ToLower(pgErr.Message), lowerColumn)
}

func isNoRowsError(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
