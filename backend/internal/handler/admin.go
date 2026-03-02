package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/cookielearn/backend/internal/middleware"
	"github.com/cookielearn/backend/internal/model"
	"github.com/cookielearn/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type AdminHandler struct {
	service *service.AdminService
}

func NewAdminHandler(service *service.AdminService) *AdminHandler {
	return &AdminHandler{service: service}
}

func (h *AdminHandler) GetStudents(w http.ResponseWriter, r *http.Request) {
	students, err := h.service.GetStudents(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения студентов")
		return
	}
	respondJSON(w, http.StatusOK, students)
}

func (h *AdminHandler) CreateStudent(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID       string  `json:"id"`
		FullName string  `json:"full_name"`
		Group    *string `json:"group_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	student := &model.Profile{
		ID:        strings.TrimSpace(req.ID),
		FullName:  strings.TrimSpace(req.FullName),
		GroupName: normalizeOptional(req.Group),
		Role:      "student",
	}
	if err := h.service.CreateStudent(r.Context(), student); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, student)
}

func (h *AdminHandler) RegisterStudent(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string  `json:"email"`
		Password string  `json:"password"`
		FullName string  `json:"full_name"`
		Group    *string `json:"group_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	account, err := h.service.RegisterStudent(
		r.Context(),
		strings.TrimSpace(req.Email),
		strings.TrimSpace(req.Password),
		strings.TrimSpace(req.FullName),
		normalizeOptional(req.Group),
	)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{
		"success": true,
		"account": account,
		"message": "Аккаунт студента создан",
	})
}

func (h *AdminHandler) BulkImportStudents(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GroupName       *string `json:"group_name"`
		DefaultPassword string  `json:"default_password"`
		Students        []struct {
			LastName   string `json:"last_name"`
			FirstName  string `json:"first_name"`
			MiddleName string `json:"middle_name"`
		} `json:"students"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	students := make([]service.StudentName, 0, len(req.Students))
	for _, item := range req.Students {
		students = append(students, service.StudentName{
			LastName:   item.LastName,
			FirstName:  item.FirstName,
			MiddleName: item.MiddleName,
		})
	}

	accounts, err := h.service.BulkRegisterStudents(
		r.Context(),
		normalizeOptional(req.GroupName),
		students,
		req.DefaultPassword,
	)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success":       true,
		"created_count": len(accounts),
		"accounts":      accounts,
		"message":       "Список студентов импортирован",
	})
}

func (h *AdminHandler) UpdateStudent(w http.ResponseWriter, r *http.Request) {
	studentID := chi.URLParam(r, "id")
	var req struct {
		FullName string  `json:"full_name"`
		Group    *string `json:"group_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	if err := h.service.UpdateStudent(r.Context(), studentID, strings.TrimSpace(req.FullName), normalizeOptional(req.Group)); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Студент обновлен",
	})
}

func (h *AdminHandler) DeleteStudent(w http.ResponseWriter, r *http.Request) {
	studentID := chi.URLParam(r, "id")

	if err := h.service.DeleteStudent(r.Context(), studentID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Студент удален",
	})
}

func (h *AdminHandler) AwardCookies(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	var req struct {
		UserID   string  `json:"user_id"`
		Amount   int     `json:"amount"`
		Reason   string  `json:"reason"`
		Category *string `json:"category"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	if err := h.service.AwardCookies(
		r.Context(),
		adminID,
		strings.TrimSpace(req.UserID),
		req.Amount,
		strings.TrimSpace(req.Reason),
		normalizeOptional(req.Category),
	); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Начисление выполнено",
	})
}

func (h *AdminHandler) GetCertificates(w http.ResponseWriter, r *http.Request) {
	certificates, err := h.service.GetCertificates(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения сертификатов")
		return
	}
	respondJSON(w, http.StatusOK, certificates)
}

func (h *AdminHandler) CreateCertificate(w http.ResponseWriter, r *http.Request) {
	var cert model.Certificate
	if err := json.NewDecoder(r.Body).Decode(&cert); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	if err := h.service.CreateCertificate(r.Context(), &cert); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, cert)
}

func (h *AdminHandler) UpdateCertificate(w http.ResponseWriter, r *http.Request) {
	certID := chi.URLParam(r, "id")
	var cert model.Certificate
	if err := json.NewDecoder(r.Body).Decode(&cert); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}
	cert.ID = certID

	if err := h.service.UpdateCertificate(r.Context(), &cert); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, cert)
}

func (h *AdminHandler) DeleteCertificate(w http.ResponseWriter, r *http.Request) {
	certID := chi.URLParam(r, "id")
	if err := h.service.DeleteCertificate(r.Context(), certID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Сертификат удален",
	})
}

func (h *AdminHandler) GetTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := h.service.GetTasks(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения задач")
		return
	}
	respondJSON(w, http.StatusOK, tasks)
}

func (h *AdminHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	var task model.Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}

	if err := h.service.CreateTask(r.Context(), &task, adminID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, task)
}

func (h *AdminHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	taskID := chi.URLParam(r, "id")

	var task model.Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		respondError(w, http.StatusBadRequest, "неверный формат запроса")
		return
	}
	task.ID = taskID

	if err := h.service.UpdateTask(r.Context(), &task); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"task":    task,
		"message": "Задача обновлена",
	})
}

func (h *AdminHandler) CloseTask(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "пользователь не авторизован")
		return
	}

	taskID := chi.URLParam(r, "id")
	winnerID, err := h.service.CloseTask(r.Context(), taskID, adminID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success":   true,
		"winner_id": winnerID,
	})
}

func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.service.GetStats(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "ошибка получения статистики")
		return
	}
	respondJSON(w, http.StatusOK, stats)
}

func normalizeOptional(input *string) *string {
	if input == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*input)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
