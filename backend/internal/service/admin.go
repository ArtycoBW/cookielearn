package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/cookielearn/backend/internal/model"
	"github.com/cookielearn/backend/internal/repository"
)

type StudentName struct {
	LastName   string
	FirstName  string
	MiddleName string
}

type CreatedStudentAccount struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type AdminService struct {
	profileRepo *repository.ProfileRepository
	txRepo      *repository.TransactionRepository
	certRepo    *repository.CertificateRepository
	taskRepo    *repository.TaskRepository
	statsRepo   *repository.StatsRepository
	authAdmin   *SupabaseAuthAdmin
	emailDomain string
}

func NewAdminService(
	profileRepo *repository.ProfileRepository,
	txRepo *repository.TransactionRepository,
	certRepo *repository.CertificateRepository,
	taskRepo *repository.TaskRepository,
	statsRepo *repository.StatsRepository,
	authAdmin *SupabaseAuthAdmin,
	emailDomain string,
) *AdminService {
	if strings.TrimSpace(emailDomain) == "" {
		emailDomain = "student.cookielearn.local"
	}

	return &AdminService{
		profileRepo: profileRepo,
		txRepo:      txRepo,
		certRepo:    certRepo,
		taskRepo:    taskRepo,
		statsRepo:   statsRepo,
		authAdmin:   authAdmin,
		emailDomain: emailDomain,
	}
}

func (s *AdminService) GetStudents(ctx context.Context) ([]*model.Profile, error) {
	return s.profileRepo.GetStudents(ctx)
}

func (s *AdminService) CreateStudent(ctx context.Context, p *model.Profile) error {
	if p.Role == "" {
		p.Role = "student"
	}
	if p.Role != "student" {
		return fmt.Errorf("можно создавать только студентов")
	}
	if p.ID == "" || p.FullName == "" {
		return fmt.Errorf("id и full_name обязательны")
	}
	return s.profileRepo.Create(ctx, p)
}

func (s *AdminService) RegisterStudent(
	ctx context.Context,
	email string,
	password string,
	fullName string,
	groupName *string,
) (*CreatedStudentAccount, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	fullName = strings.TrimSpace(fullName)
	password = strings.TrimSpace(password)

	if email == "" || password == "" || fullName == "" {
		return nil, fmt.Errorf("email, password и full_name обязательны")
	}

	userID, err := s.authAdmin.CreateUser(ctx, email, password, fullName, groupName, "student")
	if err != nil {
		return nil, err
	}

	// В БД есть триггер on_auth_user_created, который уже создает запись в profiles.
	// Поэтому здесь делаем upsert, чтобы обновить ФИО/группу без ошибки duplicate key.
	if _, err := s.profileRepo.UpsertFromAuth(ctx, userID, fullName, groupName, "student"); err != nil {
		return nil, err
	}

	return &CreatedStudentAccount{
		ID:       userID,
		Email:    email,
		Password: password,
		FullName: fullName,
	}, nil
}

func (s *AdminService) BulkRegisterStudents(
	ctx context.Context,
	groupName *string,
	students []StudentName,
	defaultPassword string,
) ([]CreatedStudentAccount, error) {
	if len(students) == 0 {
		return nil, fmt.Errorf("список студентов пуст")
	}

	password := strings.TrimSpace(defaultPassword)
	batchID := time.Now().UnixNano()

	created := make([]CreatedStudentAccount, 0, len(students))
	for i, student := range students {
		fullName := buildFullName(student.LastName, student.FirstName, student.MiddleName)
		if fullName == "" {
			return nil, fmt.Errorf("строка %d: пустое ФИО", i+1)
		}

		email := fmt.Sprintf("student-%d-%03d@%s", batchID, i+1, s.emailDomain)
		pass := password
		if pass == "" {
			pass = randomPassword(12)
		}

		account, err := s.RegisterStudent(ctx, email, pass, fullName, groupName)
		if err != nil {
			return nil, fmt.Errorf("ошибка в строке %d (%s): %w", i+1, fullName, err)
		}

		created = append(created, *account)
	}

	return created, nil
}

func buildFullName(lastName, firstName, middleName string) string {
	parts := []string{
		strings.TrimSpace(lastName),
		strings.TrimSpace(firstName),
		strings.TrimSpace(middleName),
	}

	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			filtered = append(filtered, part)
		}
	}

	return strings.Join(filtered, " ")
}

func randomPassword(length int) string {
	if length < 8 {
		length = 8
	}

	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "Student123!"
	}

	encoded := base64.RawURLEncoding.EncodeToString(buf)
	if len(encoded) < length {
		return encoded + "A1!"
	}

	return encoded[:length]
}

func (s *AdminService) UpdateStudent(ctx context.Context, id, fullName string, groupName *string) error {
	if id == "" || fullName == "" {
		return fmt.Errorf("id и full_name обязательны")
	}
	return s.profileRepo.UpdateStudent(ctx, id, fullName, groupName)
}

func (s *AdminService) DeleteStudent(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("id обязателен")
	}
	return s.profileRepo.DeleteByID(ctx, id)
}

func (s *AdminService) AwardCookies(
	ctx context.Context,
	adminID, userID string,
	amount int,
	reason string,
	category *string,
) error {
	if userID == "" || amount == 0 || reason == "" {
		return fmt.Errorf("user_id, amount и reason обязательны")
	}

	tx := &model.Transaction{
		UserID:    userID,
		Amount:    amount,
		Reason:    reason,
		Category:  category,
		CreatedBy: &adminID,
	}

	return s.txRepo.Create(ctx, tx)
}

func (s *AdminService) GetCertificates(ctx context.Context) ([]*model.Certificate, error) {
	return s.certRepo.GetAll(ctx, false)
}

func (s *AdminService) CreateCertificate(ctx context.Context, cert *model.Certificate) error {
	if cert.Title == "" || cert.BasePrice <= 0 || cert.CurrentPrice <= 0 {
		return fmt.Errorf("title, base_price и current_price обязательны")
	}
	return s.certRepo.Create(ctx, cert)
}

func (s *AdminService) UpdateCertificate(ctx context.Context, cert *model.Certificate) error {
	if cert.ID == "" || cert.Title == "" || cert.BasePrice <= 0 || cert.CurrentPrice <= 0 {
		return fmt.Errorf("id, title, base_price и current_price обязательны")
	}
	return s.certRepo.Update(ctx, cert)
}

func (s *AdminService) DeleteCertificate(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("id обязателен")
	}
	return s.certRepo.Delete(ctx, id)
}

func (s *AdminService) GetTasks(ctx context.Context) ([]*model.Task, error) {
	return s.taskRepo.GetAll(ctx)
}

func (s *AdminService) CreateTask(ctx context.Context, task *model.Task, adminID string) error {
	if task.Title == "" || task.Reward <= 0 {
		return fmt.Errorf("title и reward обязательны")
	}
	if task.Type == "" {
		task.Type = "vote"
	}
	task.CreatedBy = &adminID
	return s.taskRepo.Create(ctx, task)
}

func (s *AdminService) UpdateTask(ctx context.Context, task *model.Task) error {
	if task.ID == "" || strings.TrimSpace(task.Title) == "" {
		return fmt.Errorf("id и title обязательны")
	}
	if task.Reward <= 0 {
		return fmt.Errorf("reward должен быть больше 0")
	}

	return s.taskRepo.Update(ctx, task)
}

func (s *AdminService) CloseTask(ctx context.Context, taskID, adminID string) (*string, error) {
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, err
	}

	winnerID, err := s.taskRepo.GetWinnerID(ctx, taskID)
	if err != nil {
		return nil, err
	}

	if err := s.taskRepo.Close(ctx, taskID); err != nil {
		return nil, err
	}

	if winnerID != nil {
		category := "task_reward"
		tx := &model.Transaction{
			UserID:    *winnerID,
			Amount:    task.Reward,
			Reason:    fmt.Sprintf("Награда за задание: %s", task.Title),
			Category:  &category,
			CreatedBy: &adminID,
		}
		if err := s.txRepo.Create(ctx, tx); err != nil {
			return nil, err
		}
	}

	return winnerID, nil
}

func (s *AdminService) GetStats(ctx context.Context) (*model.Stats, error) {
	return s.statsRepo.GetStats(ctx)
}
