package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type SupabaseAuthAdmin struct {
	baseURL    string
	serviceKey string
	client     *http.Client
}

func NewSupabaseAuthAdmin(baseURL, serviceKey string) *SupabaseAuthAdmin {
	baseURL = strings.TrimRight(baseURL, "/")
	if baseURL == "" || serviceKey == "" {
		return nil
	}

	return &SupabaseAuthAdmin{
		baseURL:    baseURL,
		serviceKey: serviceKey,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *SupabaseAuthAdmin) CreateUser(
	ctx context.Context,
	email string,
	password string,
	fullName string,
	groupName *string,
	role string,
) (string, error) {
	if c == nil {
		return "", fmt.Errorf("клиент Supabase Admin не настроен")
	}

	body := map[string]any{
		"email":         email,
		"password":      password,
		"email_confirm": true,
		"user_metadata": map[string]any{
			"full_name": fullName,
			"role":      role,
		},
	}

	if groupName != nil && strings.TrimSpace(*groupName) != "" {
		body["user_metadata"].(map[string]any)["group_name"] = strings.TrimSpace(*groupName)
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal create user payload: %w", err)
	}

	url := c.baseURL + "/auth/v1/admin/users"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.serviceKey)
	req.Header.Set("Authorization", "Bearer "+c.serviceKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("ошибка Supabase Auth (%d): %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var parsed struct {
		ID string `json:"id"`
	}

	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("parse create user response: %w", err)
	}

	if parsed.ID == "" {
		return "", fmt.Errorf("Supabase Auth вернул пустой id пользователя")
	}

	return parsed.ID, nil
}

func (c *SupabaseAuthAdmin) DeleteUser(ctx context.Context, userID string) error {
	if c == nil {
		return fmt.Errorf("клиент Supabase Admin не настроен")
	}
	if strings.TrimSpace(userID) == "" {
		return fmt.Errorf("user id is required")
	}

	url := c.baseURL + "/auth/v1/admin/users/" + strings.TrimSpace(userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("apikey", c.serviceKey)
	req.Header.Set("Authorization", "Bearer "+c.serviceKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return fmt.Errorf("ошибка Supabase Auth (%d): %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	return nil
}
