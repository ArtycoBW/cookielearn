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
	materialRepo := repository.NewMaterialRepository(db)
	purchRepo := repository.NewPurchaseRepository(db)
	bonusRepo := repository.NewDailyBonusRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	taskSubmissionRepo := repository.NewTaskSubmissionRepository(db)
	statsRepo := repository.NewStatsRepository(db)
	surveyRepo := repository.NewSurveyRepository(db)
	credRepo := repository.NewAccountCredentialRepository(db)

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceRole := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	studentEmailDomain := os.Getenv("SUPABASE_STUDENT_EMAIL_DOMAIN")
	authAdmin := service.NewSupabaseAuthAdmin(supabaseURL, supabaseServiceRole)

	studentService := service.NewStudentService(profileRepo, txRepo, purchRepo, bonusRepo, materialRepo, surveyRepo, taskRepo, taskSubmissionRepo)
	shopService := service.NewShopService(certRepo, purchRepo, txRepo, db)
	adminService := service.NewAdminService(
		profileRepo,
		txRepo,
		certRepo,
		materialRepo,
		taskRepo,
		taskSubmissionRepo,
		purchRepo,
		statsRepo,
		surveyRepo,
		credRepo,
		authAdmin,
		studentEmailDomain,
	)

	studentHandler := handler.NewStudentHandler(studentService)
	shopHandler := handler.NewShopHandler(shopService)
	adminHandler := handler.NewAdminHandler(adminService)

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
		r.Get("/me/profile-summary", studentHandler.GetMyProfileSummary)
		r.Post("/auth/sync", studentHandler.SyncProfile)
		r.Get("/me/transactions", studentHandler.GetMyTransactions)
		r.Get("/me/certificates", studentHandler.GetMyCertificates)
		r.Post("/me/certificates/{id}/use", studentHandler.UseCertificate)
		r.Post("/me/daily-bonus", studentHandler.ClaimDailyBonus)
		r.Get("/me/survey", studentHandler.GetMySurvey)
		r.Post("/me/survey", studentHandler.SubmitSurvey)
		r.Get("/materials", studentHandler.GetMaterials)
		r.Get("/me/tasks", studentHandler.GetMyTasks)
		r.Post("/me/tasks/{id}/submit", studentHandler.SubmitTask)

		r.Get("/leaderboard", studentHandler.GetLeaderboard)

		r.Route("/shop", func(r chi.Router) {
			r.Get("/certificates", shopHandler.GetCertificates)
			r.Get("/certificates/{id}/background", shopHandler.GetCertificateBackground)
			r.Post("/certificates/{id}/buy", shopHandler.BuyCertificate)
			r.Post("/random-bonus/buy", shopHandler.BuyRandomBonus)
		})

		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.AdminOnly)

			r.Get("/students", adminHandler.GetStudents)
			r.Get("/accounts", adminHandler.GetAccountCredentials)
			r.Post("/students", adminHandler.CreateStudent)
			r.Post("/students/register", adminHandler.RegisterStudent)
			r.Post("/students/bulk-import", adminHandler.BulkImportStudents)
			r.Put("/students/{id}", adminHandler.UpdateStudent)
			r.Delete("/students/{id}", adminHandler.DeleteStudent)
			r.Post("/cookies/award", adminHandler.AwardCookies)
			r.Get("/cookies/history", adminHandler.GetTransactionHistory)
			r.Get("/purchases", adminHandler.GetPurchaseHistory)

			r.Get("/certificates", adminHandler.GetCertificates)
			r.Post("/certificates", adminHandler.CreateCertificate)
			r.Put("/certificates/{id}", adminHandler.UpdateCertificate)
			r.Delete("/certificates/{id}", adminHandler.DeleteCertificate)

			r.Get("/materials", adminHandler.GetMaterials)
			r.Post("/materials", adminHandler.CreateMaterial)
			r.Put("/materials/{id}", adminHandler.UpdateMaterial)
			r.Delete("/materials/{id}", adminHandler.DeleteMaterial)

			r.Get("/tasks", adminHandler.GetTasks)
			r.Post("/tasks", adminHandler.CreateTask)
			r.Put("/tasks/{id}", adminHandler.UpdateTask)
			r.Delete("/tasks/{id}", adminHandler.DeleteTask)
			r.Post("/tasks/{id}/close", adminHandler.CloseTask)
			r.Get("/task-submissions", adminHandler.GetTaskSubmissions)
			r.Post("/task-submissions/reward", adminHandler.RewardTaskSubmission)

			r.Get("/surveys", adminHandler.GetSurveys)
			r.Post("/surveys/reward", adminHandler.RewardSurvey)

			r.Get("/stats", adminHandler.GetStats)
		})
	})

	addr := fmt.Sprintf(":%s", port)
	log.Printf("CookieLearn Backend starting on %s", addr)
	log.Printf("API Documentation: http://localhost:%s/api/docs", port)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
