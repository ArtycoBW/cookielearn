package handler

import (
	"encoding/json"
	"net/http"

	"github.com/cookielearn/backend/internal/middleware"
	"github.com/cookielearn/backend/internal/model"
	"github.com/go-chi/chi/v5"
)

func (h *AdminHandler) GetSelfBeliefQuestions(w http.ResponseWriter, r *http.Request) {
	questions, err := h.service.GetSelfBeliefQuestions(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения вопросов викторины")
		return
	}

	respondJSON(w, http.StatusOK, questions)
}

func (h *AdminHandler) CreateSelfBeliefQuestion(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	var question model.SelfBeliefQuestion
	if err := json.NewDecoder(r.Body).Decode(&question); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	if err := h.service.CreateSelfBeliefQuestion(r.Context(), &question, adminID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, question)
}

func (h *AdminHandler) UpdateSelfBeliefQuestion(w http.ResponseWriter, r *http.Request) {
	questionID := chi.URLParam(r, "id")

	var question model.SelfBeliefQuestion
	if err := json.NewDecoder(r.Body).Decode(&question); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}
	question.ID = questionID

	if err := h.service.UpdateSelfBeliefQuestion(r.Context(), &question); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success":  true,
		"question": question,
		"message":  "Вопрос обновлён",
	})
}

func (h *AdminHandler) DeleteSelfBeliefQuestion(w http.ResponseWriter, r *http.Request) {
	questionID := chi.URLParam(r, "id")

	if err := h.service.DeleteSelfBeliefQuestion(r.Context(), questionID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Вопрос удалён",
	})
}
