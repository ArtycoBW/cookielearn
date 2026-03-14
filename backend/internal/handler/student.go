package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/cookielearn/backend/internal/middleware"
	"github.com/cookielearn/backend/internal/model"
	"github.com/cookielearn/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type StudentHandler struct {
	service *service.StudentService
}

func NewStudentHandler(service *service.StudentService) *StudentHandler {
	return &StudentHandler{service: service}
}

func (h *StudentHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	profile, err := h.service.GetProfile(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения профиля")
		return
	}

	respondJSON(w, http.StatusOK, profile)
}

func (h *StudentHandler) GetMyTransactions(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	transactions, err := h.service.GetTransactions(r.Context(), userID, 50)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения транзакций")
		return
	}

	respondJSON(w, http.StatusOK, transactions)
}

func (h *StudentHandler) GetMyCertificates(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	purchases, err := h.service.GetPurchases(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения сертификатов")
		return
	}

	respondJSON(w, http.StatusOK, purchases)
}

func (h *StudentHandler) ClaimDailyBonus(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	bonus, err := h.service.ClaimDailyBonus(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"bonus":   bonus,
		"message": "Ежедневный бонус получен",
	})
}

func (h *StudentHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	leaderboard, err := h.service.GetLeaderboard(r.Context(), 0)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения лидерборда")
		return
	}

	respondJSON(w, http.StatusOK, leaderboard)
}

func (h *StudentHandler) UseCertificate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	purchaseID := chi.URLParam(r, "id")
	if purchaseID == "" {
		respondError(w, http.StatusBadRequest, "требуется id сертификата")
		return
	}

	if err := h.service.UseCertificate(r.Context(), userID, purchaseID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Сертификат отмечен как использованный",
	})
}

func (h *StudentHandler) SyncProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	var req struct {
		FullName  string  `json:"full_name"`
		GroupName *string `json:"group_name"`
		Role      string  `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
		respondError(w, http.StatusBadRequest, "неверное тело запроса")
		return
	}

	profile, err := h.service.SyncProfile(r.Context(), userID, req.FullName, req.GroupName, req.Role)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, profile)
}

func (h *StudentHandler) GetMySurvey(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	submission, err := h.service.GetSurvey(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения анкеты")
		return
	}

	respondJSON(w, http.StatusOK, submission)
}

func (h *StudentHandler) SubmitSurvey(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	var req struct {
		Answers []model.SurveyAnswer `json:"answers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	submission, err := h.service.SubmitSurvey(r.Context(), userID, req.Answers)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{
		"success":    true,
		"submission": submission,
		"message":    "Анкета успешно отправлена",
	})
}

func (h *StudentHandler) GetMyTasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	tasks, err := h.service.GetTasks(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения заданий")
		return
	}

	respondJSON(w, http.StatusOK, tasks)
}

func (h *StudentHandler) SubmitTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	taskID := chi.URLParam(r, "id")
	if taskID == "" {
		respondError(w, http.StatusBadRequest, "task id обязателен")
		return
	}

	var req struct {
		ResponseText *string `json:"response_text"`
		ResponseURL  *string `json:"response_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	submission, err := h.service.SubmitTask(r.Context(), userID, taskID, req.ResponseText, req.ResponseURL)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success":    true,
		"submission": submission,
		"message":    "Ответ отправлен",
	})
}
