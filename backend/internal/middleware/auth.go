package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/MicahParks/keyfunc/v2"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey   contextKey = "user_id"
	UserRoleKey contextKey = "user_role"
)

var (
	jwksOnce sync.Once
	jwksSet  *keyfunc.JWKS
	jwksErr  error
)

func getJWKS() (*keyfunc.JWKS, error) {
	jwksOnce.Do(func() {
		supabaseURL := strings.TrimRight(os.Getenv("SUPABASE_URL"), "/")
		if supabaseURL == "" {
			jwksErr = fmt.Errorf("SUPABASE_URL is not set")
			return
		}

		jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"
		opts := keyfunc.Options{
			RefreshInterval:   time.Hour,
			RefreshTimeout:    10 * time.Second,
			RefreshUnknownKID: true,
			RefreshErrorHandler: func(err error) {
				log.Printf("JWKS refresh failed: %v", err)
			},
		}

		jwksSet, jwksErr = keyfunc.Get(jwksURL, opts)
	})

	return jwksSet, jwksErr
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing auth token"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token format"})
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			switch token.Method.(type) {
			case *jwt.SigningMethodHMAC:
				secret := os.Getenv("SUPABASE_JWT_SECRET")
				if secret == "" {
					return nil, fmt.Errorf("SUPABASE_JWT_SECRET is not set")
				}
				return []byte(secret), nil
			default:
				set, err := getJWKS()
				if err != nil {
					return nil, err
				}
				return set.Keyfunc(token)
			}
		}, jwt.WithValidMethods([]string{
			jwt.SigningMethodHS256.Alg(),
			jwt.SigningMethodHS384.Alg(),
			jwt.SigningMethodHS512.Alg(),
			jwt.SigningMethodRS256.Alg(),
			jwt.SigningMethodRS384.Alg(),
			jwt.SigningMethodRS512.Alg(),
			jwt.SigningMethodES256.Alg(),
			jwt.SigningMethodES384.Alg(),
			jwt.SigningMethodES512.Alg(),
		}))

		if err != nil || !token.Valid {
			respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token claims"})
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "user id missing in token"})
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
			respondJSON(w, http.StatusForbidden, map[string]string{"error": "admin role required"})
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

	if errMap, ok := data.(map[string]string); ok {
		if msg, exists := errMap["error"]; exists {
			fmt.Fprintf(w, `{"error":"%s"}`, msg)
			return
		}
	}
	fmt.Fprint(w, data)
}
