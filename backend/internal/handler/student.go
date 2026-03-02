package handler

import (
	"net/http"

	"github.com/cookielearn/backend/internal/middleware"
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
		respondError(w, http.StatusUnauthorized, "РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ")
		return
	}

	profile, err := h.service.GetProfile(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "РѕС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РїСЂРѕС„РёР»СЏ")
		return
	}

	respondJSON(w, http.StatusOK, profile)
}

func (h *StudentHandler) GetMyTransactions(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ")
		return
	}

	transactions, err := h.service.GetTransactions(r.Context(), userID, 50)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "РѕС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ С‚СЂР°РЅР·Р°РєС†РёР№")
		return
	}

	respondJSON(w, http.StatusOK, transactions)
}

func (h *StudentHandler) GetMyCertificates(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ")
		return
	}

	purchases, err := h.service.GetPurchases(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "РѕС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ СЃРµСЂС‚РёС„РёРєР°С‚РѕРІ")
		return
	}

	respondJSON(w, http.StatusOK, purchases)
}

func (h *StudentHandler) ClaimDailyBonus(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ")
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
		"message": "Р’С‹ РїРѕР»СѓС‡РёР»Рё 1 РїРµС‡РµРЅСЊРєСѓ!",
	})
}

func (h *StudentHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	leaderboard, err := h.service.GetLeaderboard(r.Context(), 20)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "РѕС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ Р»РёРґРµСЂР±РѕСЂРґР°")
		return
	}

	respondJSON(w, http.StatusOK, leaderboard)
}

func (h *StudentHandler) UseCertificate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ")
		return
	}

	purchaseID := chi.URLParam(r, "id")
	if purchaseID == "" {
		respondError(w, http.StatusBadRequest, "РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ ID СЃРµСЂС‚РёС„РёРєР°С‚Р°")
		return
	}

	if err := h.service.UseCertificate(r.Context(), userID, purchaseID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "РЎРµСЂС‚РёС„РёРєР°С‚ РѕС‚РјРµС‡РµРЅ РєР°Рє РёСЃРїРѕР»СЊР·РѕРІР°РЅРЅС‹Р№",
	})
}
