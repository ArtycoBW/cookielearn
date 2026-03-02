package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/cookielearn/backend/internal/middleware"
	"github.com/cookielearn/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type ShopHandler struct {
	service *service.ShopService
}

func NewShopHandler(service *service.ShopService) *ShopHandler {
	return &ShopHandler{service: service}
}

func (h *ShopHandler) GetCertificates(w http.ResponseWriter, r *http.Request) {
	certificates, err := h.service.GetCertificates(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения сертификатов")
		return
	}

	respondJSON(w, http.StatusOK, certificates)
}

func (h *ShopHandler) BuyCertificate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	certID := chi.URLParam(r, "id")
	if certID == "" {
		respondError(w, http.StatusBadRequest, "отсутствует ID сертификата")
		return
	}

	purchase, err := h.service.BuyCertificate(r.Context(), userID, certID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success":  true,
		"purchase": purchase,
		"message":  "Сертификат успешно куплен!",
	})
}

func (h *ShopHandler) BuyRandomBonus(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	var req struct {
		Cost int `json:"cost"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	if req.Cost <= 0 {
		req.Cost = 3
	}

	reward, err := h.service.BuyRandomBonus(r.Context(), userID, req.Cost)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"cost":    req.Cost,
		"reward":  reward,
		"message": "Вы выиграли " + strconv.Itoa(reward) + " печенек!",
	})
}
