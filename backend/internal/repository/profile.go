package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
	"github.com/jackc/pgx/v5"
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

func (r *ProfileRepository) Create(ctx context.Context, p *model.Profile) error {
	query := `
		INSERT INTO profiles (id, full_name, group_name, role)
		VALUES ($1, $2, $3, $4)
		RETURNING balance, created_at, last_login_at
	`

	err := r.db.Pool.QueryRow(ctx, query, p.ID, p.FullName, p.GroupName, p.Role).Scan(
		&p.Balance, &p.CreatedAt, &p.LastLoginAt,
	)
	if err != nil {
		return fmt.Errorf("create profile: %w", err)
	}

	return nil
}

func (r *ProfileRepository) UpdateStudent(ctx context.Context, id, fullName string, groupName *string) error {
	query := `
		UPDATE profiles
		SET full_name = $2, group_name = $3
		WHERE id = $1 AND role = 'student'
	`

	result, err := r.db.Pool.Exec(ctx, query, id, fullName, groupName)
	if err != nil {
		return fmt.Errorf("update student: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("студент не найден")
	}

	return nil
}

func (r *ProfileRepository) DeleteByID(ctx context.Context, id string) error {
	query := `DELETE FROM profiles WHERE id = $1 AND role = 'student'`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete profile: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("профиль не найден")
	}

	return nil
}

func (r *ProfileRepository) GetStudents(ctx context.Context) ([]*model.Profile, error) {
	query := `
		SELECT p.id, p.full_name, p.group_name, ac.login, p.role, p.balance, p.created_at, p.last_login_at
		FROM profiles p
		LEFT JOIN account_credentials ac ON ac.user_id = p.id
		WHERE p.role = 'student'
		ORDER BY p.full_name ASC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get students: %w", err)
	}
	defer rows.Close()

	var students []*model.Profile
	for rows.Next() {
		var p model.Profile
		if err := rows.Scan(&p.ID, &p.FullName, &p.GroupName, &p.Login, &p.Role, &p.Balance, &p.CreatedAt, &p.LastLoginAt); err != nil {
			return nil, fmt.Errorf("scan student: %w", err)
		}
		students = append(students, &p)
	}

	return students, nil
}

func (r *ProfileRepository) UpsertFromAuth(
	ctx context.Context,
	userID, fullName string,
	groupName *string,
	role string,
) (*model.Profile, error) {
	query := `
		INSERT INTO profiles (id, full_name, group_name, role, last_login_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (id) DO UPDATE
		SET full_name = EXCLUDED.full_name,
			group_name = COALESCE(EXCLUDED.group_name, profiles.group_name),
			last_login_at = NOW()
		RETURNING id, full_name, group_name, role, balance, created_at, last_login_at
	`

	var p model.Profile
	if err := r.db.Pool.QueryRow(ctx, query, userID, fullName, groupName, role).Scan(
		&p.ID,
		&p.FullName,
		&p.GroupName,
		&p.Role,
		&p.Balance,
		&p.CreatedAt,
		&p.LastLoginAt,
	); err != nil {
		return nil, fmt.Errorf("upsert profile from auth: %w", err)
	}

	return &p, nil
}
