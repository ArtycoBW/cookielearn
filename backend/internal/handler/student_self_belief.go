package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/cookielearn/backend/internal/middleware"
)

func (h *StudentHandler) GetMySelfBeliefOverview(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	overview, err := h.service.GetSelfBeliefOverview(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения режима \"Верю в себя\"")
		return
	}

	respondJSON(w, http.StatusOK, overview)
}

func (h *StudentHandler) GetMySelfBeliefQuestion(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	wager, err := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("wager")))
	if err != nil {
		respondError(w, http.StatusBadRequest, "wager должен быть числом 1, 3 или 5")
		return
	}

	question, err := h.service.GetSelfBeliefQuestion(r.Context(), userID, wager, r.URL.Query().Get("category"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if question == nil {
		respondJSON(w, http.StatusOK, map[string]any{
			"question":  nil,
			"exhausted": true,
			"message":   "Для выбранной ставки пока не осталось новых вопросов",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"question":  question,
		"exhausted": false,
	})
}

func (h *StudentHandler) AnswerMySelfBeliefQuestion(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	var req struct {
		QuestionID     string `json:"question_id"`
		Wager          int    `json:"wager"`
		SelectedOption int    `json:"selected_option"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	result, err := h.service.AnswerSelfBeliefQuestion(
		r.Context(),
		userID,
		req.QuestionID,
		req.Wager,
		req.SelectedOption,
	)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, result)
}
