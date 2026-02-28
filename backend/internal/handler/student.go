package handler

import (
	"net/http"

	"github.com/cookielearn/backend/internal/middleware"
	"github.com/cookielearn/backend/internal/service"
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

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"bonus":   bonus,
		"message": "Вы получили 1 печеньку!",
	})
}

func (h *StudentHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	leaderboard, err := h.service.GetLeaderboard(r.Context(), 20)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения лидерборда")
		return
	}

	respondJSON(w, http.StatusOK, leaderboard)
}
