package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
)

type ProfileRepository struct {
	db *DB
}

func NewProfileRepository(db *DB) *ProfileRepository {
	return &ProfileRepository{db: db}
}

func (r *ProfileRepository) GetByID(ctx context.Context, id string) (*model.Profile, error) {
	query := `
		SELECT id, full_name, group_name, role, balance, created_at, last_login_at
		FROM profiles
		WHERE id = $1
	`

	var p model.Profile
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.FullName, &p.GroupName, &p.Role, &p.Balance, &p.CreatedAt, &p.LastLoginAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get profile by id: %w", err)
	}

	return &p, nil
}

func (r *ProfileRepository) GetLeaderboard(ctx context.Context, limit int) ([]*model.LeaderboardEntry, error) {
	query := `
		SELECT id, full_name, group_name, balance,
			ROW_NUMBER() OVER (ORDER BY balance DESC, created_at ASC) as rank
		FROM profiles
		WHERE role = 'student'
		ORDER BY balance DESC, created_at ASC
		LIMIT $1
	`

	rows, err := r.db.Pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("get leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*model.LeaderboardEntry
	for rows.Next() {
		var e model.LeaderboardEntry
		if err := rows.Scan(&e.ID, &e.FullName, &e.GroupName, &e.Balance, &e.Rank); err != nil {
			return nil, fmt.Errorf("scan leaderboard entry: %w", err)
		}
		entries = append(entries, &e)
	}

	return entries, nil
}

func (r *ProfileRepository) UpdateLastLogin(ctx context.Context, id string) error {
	query := `UPDATE profiles SET last_login_at = NOW() WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	return err
}

func (r *ProfileRepository) GetAll(ctx context.Context) ([]*model.Profile, error) {
	query := `
		SELECT id, full_name, group_name, role, balance, created_at, last_login_at
		FROM profiles
		ORDER BY created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get all profiles: %w", err)
	}
	defer rows.Close()

	var profiles []*model.Profile
	for rows.Next() {
		var p model.Profile
		if err := rows.Scan(&p.ID, &p.FullName, &p.GroupName, &p.Role, &p.Balance, &p.CreatedAt, &p.LastLoginAt); err != nil {
			return nil, fmt.Errorf("scan profile: %w", err)
		}
		profiles = append(profiles, &p)
	}

	return profiles, nil
}
