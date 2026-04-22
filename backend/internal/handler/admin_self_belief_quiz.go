package handler

import (
	"encoding/json"
	"net/http"

	"github.com/cookielearn/backend/internal/middleware"
	"github.com/cookielearn/backend/internal/model"
	"github.com/go-chi/chi/v5"
)

func (h *AdminHandler) GetSelfBeliefQuizzes(w http.ResponseWriter, r *http.Request) {
	quizzes, err := h.service.GetSelfBeliefQuizzes(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "не удалось получить тесты викторины")
		return
	}

	respondJSON(w, http.StatusOK, quizzes)
}

func (h *AdminHandler) CreateSelfBeliefQuiz(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	var quiz model.SelfBeliefQuiz
	if err := json.NewDecoder(r.Body).Decode(&quiz); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	if err := h.service.CreateSelfBeliefQuiz(r.Context(), &quiz, adminID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, quiz)
}

func (h *AdminHandler) UpdateSelfBeliefQuiz(w http.ResponseWriter, r *http.Request) {
	quizID := chi.URLParam(r, "id")

	var quiz model.SelfBeliefQuiz
	if err := json.NewDecoder(r.Body).Decode(&quiz); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}
	quiz.ID = quizID

	if err := h.service.UpdateSelfBeliefQuiz(r.Context(), &quiz); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"quiz":    quiz,
		"message": "Тест обновлён",
	})
}

func (h *AdminHandler) DeleteSelfBeliefQuiz(w http.ResponseWriter, r *http.Request) {
	quizID := chi.URLParam(r, "id")

	if err := h.service.DeleteSelfBeliefQuiz(r.Context(), quizID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Тест удалён",
	})
}
