package handler

import (
	"encoding/json"
	"net/http"

	"github.com/cookielearn/backend/internal/middleware"
	"github.com/cookielearn/backend/internal/model"
	"github.com/go-chi/chi/v5"
)

func (h *StudentHandler) GetMySelfBeliefQuizOverview(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	overview, err := h.service.GetSelfBeliefQuizOverview(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "не удалось получить сводку викторины")
		return
	}

	respondJSON(w, http.StatusOK, overview)
}

func (h *StudentHandler) GetMySelfBeliefQuizzes(w http.ResponseWriter, r *http.Request) {
	quizzes, err := h.service.GetAvailableSelfBeliefQuizzes(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "не удалось получить список тестов")
		return
	}

	respondJSON(w, http.StatusOK, quizzes)
}

func (h *StudentHandler) StartMySelfBeliefQuiz(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	quizID := chi.URLParam(r, "id")
	result, err := h.service.StartSelfBeliefQuiz(r.Context(), userID, quizID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, result)
}

func (h *StudentHandler) FinishMySelfBeliefQuiz(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	attemptID := chi.URLParam(r, "id")

	var req struct {
		Answers []model.SelfBeliefQuizAnswerSubmission `json:"answers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	result, err := h.service.FinishSelfBeliefQuiz(r.Context(), userID, attemptID, req.Answers)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, result)
}
