package repository

import (
	"context"
	"fmt"

	"github.com/cookielearn/backend/internal/model"
)

type MaterialRepository struct {
	db *DB
}

func NewMaterialRepository(db *DB) *MaterialRepository {
	return &MaterialRepository{db: db}
}

func (r *MaterialRepository) GetAll(ctx context.Context, includeUnpublished bool) ([]*model.Material, error) {
	query := `
		SELECT
			id,
			title,
			description,
			category,
			format,
			url,
			storage_bucket,
			storage_path,
			file_name,
			mime_type,
			file_size,
			estimated_minutes,
			is_published,
			is_featured,
			created_by,
			created_at,
			updated_at
		FROM materials
	`
	if !includeUnpublished {
		query += ` WHERE is_published = true`
	}
	query += `
		ORDER BY
			is_featured DESC,
			category ASC,
			updated_at DESC,
			created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get materials: %w", err)
	}
	defer rows.Close()

	materials := make([]*model.Material, 0)
	for rows.Next() {
		var material model.Material
		if err := rows.Scan(
			&material.ID,
			&material.Title,
			&material.Description,
			&material.Category,
			&material.Format,
			&material.URL,
			&material.StorageBucket,
			&material.StoragePath,
			&material.FileName,
			&material.MimeType,
			&material.FileSize,
			&material.EstimatedMinutes,
			&material.IsPublished,
			&material.IsFeatured,
			&material.CreatedBy,
			&material.CreatedAt,
			&material.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan material: %w", err)
		}
		materials = append(materials, &material)
	}

	return materials, nil
}

func (r *MaterialRepository) Create(ctx context.Context, material *model.Material) error {
	query := `
		INSERT INTO materials (
			title,
			description,
			category,
			format,
			url,
			storage_bucket,
			storage_path,
			file_name,
			mime_type,
			file_size,
			estimated_minutes,
			is_published,
			is_featured,
			created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, created_at, updated_at
	`

	if err := r.db.Pool.QueryRow(
		ctx,
		query,
		material.Title,
		material.Description,
		material.Category,
		material.Format,
		material.URL,
		material.StorageBucket,
		material.StoragePath,
		material.FileName,
		material.MimeType,
		material.FileSize,
		material.EstimatedMinutes,
		material.IsPublished,
		material.IsFeatured,
		material.CreatedBy,
	).Scan(&material.ID, &material.CreatedAt, &material.UpdatedAt); err != nil {
		return fmt.Errorf("create material: %w", err)
	}

	return nil
}

func (r *MaterialRepository) Update(ctx context.Context, material *model.Material) error {
	query := `
		UPDATE materials
		SET title = $2,
			description = $3,
			category = $4,
			format = $5,
			url = $6,
			storage_bucket = $7,
			storage_path = $8,
			file_name = $9,
			mime_type = $10,
			file_size = $11,
			estimated_minutes = $12,
			is_published = $13,
			is_featured = $14,
			updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	if err := r.db.Pool.QueryRow(
		ctx,
		query,
		material.ID,
		material.Title,
		material.Description,
		material.Category,
		material.Format,
		material.URL,
		material.StorageBucket,
		material.StoragePath,
		material.FileName,
		material.MimeType,
		material.FileSize,
		material.EstimatedMinutes,
		material.IsPublished,
		material.IsFeatured,
	).Scan(&material.UpdatedAt); err != nil {
		return fmt.Errorf("update material: %w", err)
	}

	return nil
}

func (r *MaterialRepository) Delete(ctx context.Context, id string) error {
	result, err := r.db.Pool.Exec(ctx, `DELETE FROM materials WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete material: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("материал не найден")
	}

	return nil
}
