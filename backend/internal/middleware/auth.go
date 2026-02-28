package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	UserRoleKey contextKey = "user_role"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Отсутствует токен авторизации",
			})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			respondJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Неверный формат токена",
			})
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("неожиданный метод подписи: %v", token.Header["alg"])
			}

			secret := os.Getenv("SUPABASE_JWT_SECRET")
			if secret == "" {
				return nil, fmt.Errorf("SUPABASE_JWT_SECRET не установлен")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			respondJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Невалидный токен",
			})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			respondJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Невалидные claims",
			})
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			respondJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "Отсутствует user ID в токене",
			})
			return
		}

		var userRole string
		if metadata, ok := claims["user_metadata"].(map[string]interface{}); ok {
			if role, ok := metadata["role"].(string); ok {
				userRole = role
			}
		}
		if userRole == "" {
			userRole = "student"
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UserRoleKey, userRole)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(UserRoleKey).(string)
		if !ok || role != "admin" {
			respondJSON(w, http.StatusForbidden, map[string]string{
				"error": "Доступ запрещён: требуются права администратора",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}

func GetUserRole(ctx context.Context) (string, bool) {
	userRole, ok := ctx.Value(UserRoleKey).(string)
	return userRole, ok
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	
	if err, ok := data.(map[string]string); ok {
		if msg, exists := err["error"]; exists {
			fmt.Fprintf(w, `{"error":"%s"}`, msg)
			return
		}
	}
	fmt.Fprint(w, data)
}
