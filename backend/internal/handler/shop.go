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
		respondError(w, http.StatusInternalServerError, "РѕС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ СЃРµСЂС‚РёС„РёРєР°С‚РѕРІ")
		return
	}

	respondJSON(w, http.StatusOK, certificates)
}

func (h *ShopHandler) BuyCertificate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ")
		return
	}

	certID := chi.URLParam(r, "id")
	if certID == "" {
		respondError(w, http.StatusBadRequest, "РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ ID СЃРµСЂС‚РёС„РёРєР°С‚Р°")
		return
	}

	purchase, err := h.service.BuyCertificate(r.Context(), userID, certID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"purchase": purchase,
		"message":  "РЎРµСЂС‚РёС„РёРєР°С‚ СѓСЃРїРµС€РЅРѕ РєСѓРїР»РµРЅ!",
	})
}

func (h *ShopHandler) BuyRandomBonus(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ")
		return
	}

	var req struct {
		Cost int `json:"cost"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "РЅРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ Р·Р°РїСЂРѕСЃР°")
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

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"cost":    req.Cost,
		"reward":  reward,
		"message": "Р’С‹ РІС‹РёРіСЂР°Р»Рё " + strconv.Itoa(reward) + " РїРµС‡РµРЅРµРє!",
	})
}
