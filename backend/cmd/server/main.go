package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/cookielearn/backend/internal/handler"
	"github.com/cookielearn/backend/internal/middleware"
	"github.com/cookielearn/backend/internal/repository"
	"github.com/cookielearn/backend/internal/service"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	ctx := context.Background()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	db, err := repository.NewDB(ctx)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	profileRepo := repository.NewProfileRepository(db)
	txRepo := repository.NewTransactionRepository(db)
	certRepo := repository.NewCertificateRepository(db)
	purchRepo := repository.NewPurchaseRepository(db)
	bonusRepo := repository.NewDailyBonusRepository(db)

	studentService := service.NewStudentService(profileRepo, txRepo, purchRepo, bonusRepo)
	shopService := service.NewShopService(certRepo, purchRepo, txRepo, db)

	studentHandler := handler.NewStudentHandler(studentService)
	shopHandler := handler.NewShopHandler(shopService)

	r := chi.NewRouter()

	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(60 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"cookielearn-backend"}`))
	})

	r.Get("/api/docs", handler.ServeSwaggerUI)
	r.Get("/api/docs/swagger.yaml", handler.ServeSwaggerYAML)

	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)

		r.Get("/me", studentHandler.GetMe)
		r.Get("/me/transactions", studentHandler.GetMyTransactions)
		r.Get("/me/certificates", studentHandler.GetMyCertificates)
		r.Post("/me/certificates/{id}/use", studentHandler.UseCertificate)
		r.Post("/me/daily-bonus", studentHandler.ClaimDailyBonus)

		r.Get("/leaderboard", studentHandler.GetLeaderboard)

		r.Route("/shop", func(r chi.Router) {
			r.Get("/certificates", shopHandler.GetCertificates)
			r.Post("/certificates/{id}/buy", shopHandler.BuyCertificate)
			r.Post("/random-bonus/buy", shopHandler.BuyRandomBonus)
		})
	})

	addr := fmt.Sprintf(":%s", port)
	log.Printf("🍪 CookieLearn Backend starting on %s", addr)
	log.Printf("📚 API Documentation: http://localhost:%s/api/docs", port)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
