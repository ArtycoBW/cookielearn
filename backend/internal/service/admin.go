package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"
	"unicode"

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
	Login    string `json:"login"`
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type AdminService struct {
	profileRepo        *repository.ProfileRepository
	txRepo             *repository.TransactionRepository
	certRepo           *repository.CertificateRepository
	taskRepo           *repository.TaskRepository
	taskSubmissionRepo *repository.TaskSubmissionRepository
	purchaseRepo       *repository.PurchaseRepository
	statsRepo          *repository.StatsRepository
	surveyRepo         *repository.SurveyRepository
	credRepo           *repository.AccountCredentialRepository
	authAdmin          *SupabaseAuthAdmin
	emailDomain        string
}

func NewAdminService(
	profileRepo *repository.ProfileRepository,
	txRepo *repository.TransactionRepository,
	certRepo *repository.CertificateRepository,
	taskRepo *repository.TaskRepository,
	taskSubmissionRepo *repository.TaskSubmissionRepository,
	purchaseRepo *repository.PurchaseRepository,
	statsRepo *repository.StatsRepository,
	surveyRepo *repository.SurveyRepository,
	credRepo *repository.AccountCredentialRepository,
	authAdmin *SupabaseAuthAdmin,
	emailDomain string,
) *AdminService {
	if strings.TrimSpace(emailDomain) == "" {
		emailDomain = "student.cookielearn.local"
	}

	return &AdminService{
		profileRepo:        profileRepo,
		txRepo:             txRepo,
		certRepo:           certRepo,
		taskRepo:           taskRepo,
		taskSubmissionRepo: taskSubmissionRepo,
		purchaseRepo:       purchaseRepo,
		statsRepo:          statsRepo,
		surveyRepo:         surveyRepo,
		credRepo:           credRepo,
		authAdmin:          authAdmin,
		emailDomain:        strings.ToLower(strings.TrimSpace(emailDomain)),
	}
}

func (s *AdminService) GetStudents(ctx context.Context) ([]*model.Profile, error) {
	return s.profileRepo.GetStudents(ctx)
}

func (s *AdminService) CreateStudent(ctx context.Context, profile *model.Profile) error {
	if profile.Role == "" {
		profile.Role = "student"
	}
	if profile.Role != "student" {
		return fmt.Errorf("можно создавать только студентов")
	}
	if profile.ID == "" || profile.FullName == "" {
		return fmt.Errorf("id и full_name обязательны")
	}

	return s.profileRepo.Create(ctx, profile)
}

func (s *AdminService) RegisterStudent(
	ctx context.Context,
	loginOrEmail string,
	password string,
	fullName string,
	groupName *string,
) (*CreatedStudentAccount, error) {
	login, email, err := s.resolveStudentCredentials(loginOrEmail)
	if err != nil {
		return nil, err
	}

	fullName = strings.TrimSpace(fullName)
	password = strings.TrimSpace(password)
	if password == "" || fullName == "" {
		return nil, fmt.Errorf("login, password и full_name обязательны")
	}
	if s.authAdmin == nil {
		return nil, fmt.Errorf("клиент Supabase Admin не настроен")
	}

	userID, err := s.authAdmin.CreateUser(ctx, email, password, fullName, groupName, "student")
	if err != nil {
		return nil, err
	}

	if _, err := s.profileRepo.UpsertFromAuth(ctx, userID, fullName, groupName, "student"); err != nil {
		return nil, err
	}
	if err := s.credRepo.Upsert(ctx, userID, login, email, password); err != nil {
		return nil, err
	}

	return &CreatedStudentAccount{
		ID:       userID,
		Login:    login,
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
	usedLogins := make(map[string]int)
	created := make([]CreatedStudentAccount, 0, len(students))

	for index, student := range students {
		fullName := buildFullName(student.LastName, student.FirstName, student.MiddleName)
		if fullName == "" {
			return nil, fmt.Errorf("строка %d: пустое ФИО", index+1)
		}

		baseLogin := generateLoginFromFullName(fullName)
		if baseLogin == "" {
			baseLogin = fmt.Sprintf("student-%d", index+1)
		}

		pass := password
		if pass == "" {
			pass = randomPassword(12)
		}

		startIndex := usedLogins[baseLogin]
		var (
			account *CreatedStudentAccount
			err     error
		)

		for attempt := 0; attempt < 25; attempt++ {
			candidate := baseLogin
			if startIndex+attempt > 0 {
				candidate = fmt.Sprintf("%s-%d", baseLogin, startIndex+attempt+1)
			}

			account, err = s.RegisterStudent(ctx, candidate, pass, fullName, groupName)
			if err == nil {
				usedLogins[baseLogin] = startIndex + attempt + 1
				created = append(created, *account)
				break
			}

			if !isDuplicateStudentLoginError(err) {
				return nil, fmt.Errorf("ошибка в строке %d (%s): %w", index+1, fullName, err)
			}
		}

		if err != nil {
			return nil, fmt.Errorf("ошибка в строке %d (%s): не удалось подобрать уникальный логин", index+1, fullName)
		}
	}

	return created, nil
}

func (s *AdminService) UpdateStudent(ctx context.Context, id, fullName string, groupName *string) error {
	if id == "" || strings.TrimSpace(fullName) == "" {
		return fmt.Errorf("id и full_name обязательны")
	}

	return s.profileRepo.UpdateStudent(ctx, id, strings.TrimSpace(fullName), groupName)
}

func (s *AdminService) DeleteStudent(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("id обязателен")
	}

	profile, err := s.profileRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if profile.Role != "student" {
		return fmt.Errorf("можно удалять только студентов")
	}
	if s.authAdmin == nil {
		return fmt.Errorf("клиент Supabase Admin не настроен")
	}

	return s.authAdmin.DeleteUser(ctx, id)
}

func (s *AdminService) AwardCookies(
	ctx context.Context,
	adminID, userID string,
	amount int,
	reason string,
	category *string,
) error {
	if userID == "" || amount == 0 || strings.TrimSpace(reason) == "" {
		return fmt.Errorf("user_id, amount и reason обязательны")
	}

	tx := &model.Transaction{
		UserID:    userID,
		Amount:    amount,
		Reason:    strings.TrimSpace(reason),
		Category:  category,
		CreatedBy: &adminID,
	}

	return s.txRepo.Create(ctx, tx)
}

func (s *AdminService) GetTransactionHistory(ctx context.Context) ([]*model.TransactionHistoryEntry, error) {
	return s.txRepo.GetHistory(ctx, 0)
}

func (s *AdminService) GetPurchaseHistory(ctx context.Context) ([]*model.PurchaseHistoryEntry, error) {
	return s.purchaseRepo.GetAll(ctx)
}

func (s *AdminService) GetCertificates(ctx context.Context) ([]*model.Certificate, error) {
	return s.certRepo.GetAll(ctx, false)
}

func (s *AdminService) CreateCertificate(ctx context.Context, certificate *model.Certificate) error {
	if strings.TrimSpace(certificate.Title) == "" || certificate.BasePrice <= 0 || certificate.CurrentPrice <= 0 {
		return fmt.Errorf("title, base_price и current_price обязательны")
	}

	certificate.Title = strings.TrimSpace(certificate.Title)
	if err := normalizeCertificateQuantities(certificate); err != nil {
		return err
	}
	return s.certRepo.Create(ctx, certificate)
}

func (s *AdminService) UpdateCertificate(ctx context.Context, certificate *model.Certificate) error {
	if certificate.ID == "" || strings.TrimSpace(certificate.Title) == "" || certificate.BasePrice <= 0 || certificate.CurrentPrice <= 0 {
		return fmt.Errorf("id, title, base_price и current_price обязательны")
	}

	certificate.Title = strings.TrimSpace(certificate.Title)
	if err := normalizeCertificateQuantities(certificate); err != nil {
		return err
	}
	return s.certRepo.Update(ctx, certificate)
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
	if strings.TrimSpace(task.Title) == "" || task.Reward <= 0 {
		return fmt.Errorf("title и reward обязательны")
	}

	task.Title = strings.TrimSpace(task.Title)
	if task.Description != nil {
		description := strings.TrimSpace(*task.Description)
		if description == "" {
			task.Description = nil
		} else {
			task.Description = &description
		}
	}
	if strings.TrimSpace(task.Type) == "" {
		task.Type = "other"
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
	if strings.TrimSpace(task.Type) == "" {
		task.Type = "other"
	}

	task.Title = strings.TrimSpace(task.Title)
	if task.Description != nil {
		description := strings.TrimSpace(*task.Description)
		if description == "" {
			task.Description = nil
		} else {
			task.Description = &description
		}
	}

	return s.taskRepo.Update(ctx, task)
}

func (s *AdminService) CloseTask(ctx context.Context, taskID string) error {
	if strings.TrimSpace(taskID) == "" {
		return fmt.Errorf("task id обязателен")
	}

	return s.taskRepo.Close(ctx, taskID)
}

func (s *AdminService) GetTaskSubmissions(ctx context.Context) ([]*model.TaskSubmission, error) {
	return s.taskSubmissionRepo.GetAll(ctx)
}

func (s *AdminService) RewardTaskSubmission(ctx context.Context, adminID, submissionID string, reward int) error {
	if submissionID == "" {
		return fmt.Errorf("submission_id обязателен")
	}
	if reward < 0 {
		return fmt.Errorf("reward не может быть отрицательным")
	}

	submission, err := s.taskSubmissionRepo.GetByID(ctx, submissionID)
	if err != nil {
		return err
	}
	if submission.Reviewed {
		return fmt.Errorf("ответ уже проверен")
	}
	if submission.Task != nil && reward > submission.Task.Reward {
		return fmt.Errorf("награда не может быть больше максимума задания (%d)", submission.Task.Reward)
	}

	if reward > 0 {
		category := "task_reward"
		tx := &model.Transaction{
			UserID:    submission.UserID,
			Amount:    reward,
			Reason:    fmt.Sprintf("Награда за задание: %s", submission.Task.Title),
			Category:  &category,
			CreatedBy: &adminID,
		}
		if err := s.txRepo.Create(ctx, tx); err != nil {
			return err
		}
	}

	return s.taskSubmissionRepo.Review(ctx, submissionID, adminID, reward)
}

func (s *AdminService) GetStats(ctx context.Context) (*model.Stats, error) {
	return s.statsRepo.GetStats(ctx)
}

func (s *AdminService) GetAccountCredentials(ctx context.Context) ([]*model.AccountCredential, error) {
	return s.credRepo.GetAll(ctx)
}

func (s *AdminService) GetSurveySubmissions(ctx context.Context) ([]*model.SurveySubmission, error) {
	return s.surveyRepo.GetAll(ctx)
}

func (s *AdminService) RewardSurvey(ctx context.Context, adminID, submissionID string, reward int) error {
	if submissionID == "" {
		return fmt.Errorf("submission_id обязателен")
	}
	if reward < 0 {
		return fmt.Errorf("reward не может быть отрицательным")
	}

	submission, err := s.surveyRepo.GetByID(ctx, submissionID)
	if err != nil {
		return err
	}
	if submission == nil {
		return fmt.Errorf("анкета не найдена")
	}
	if submission.Reviewed {
		return fmt.Errorf("анкета уже обработана")
	}

	if reward > 0 {
		category := "survey_reward"
		tx := &model.Transaction{
			UserID:    submission.UserID,
			Amount:    reward,
			Reason:    "Награда за заполнение анкеты",
			Category:  &category,
			CreatedBy: &adminID,
		}
		if err := s.txRepo.Create(ctx, tx); err != nil {
			return err
		}
	}

	return s.surveyRepo.MarkRewarded(ctx, submissionID, reward)
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

	buffer := make([]byte, length)
	if _, err := rand.Read(buffer); err != nil {
		return "Student123!"
	}

	encoded := base64.RawURLEncoding.EncodeToString(buffer)
	if len(encoded) < length {
		return encoded + "A1!"
	}

	return encoded[:length]
}

func (s *AdminService) resolveStudentCredentials(loginOrEmail string) (string, string, error) {
	trimmed := strings.ToLower(strings.TrimSpace(loginOrEmail))
	if trimmed == "" {
		return "", "", fmt.Errorf("login обязателен")
	}

	if strings.Contains(trimmed, "@") {
		parts := strings.SplitN(trimmed, "@", 2)
		login := sanitizeLogin(parts[0])
		if login == "" || strings.TrimSpace(parts[1]) == "" {
			return "", "", fmt.Errorf("некорректный email студента")
		}
		return login, trimmed, nil
	}

	login := sanitizeLogin(transliterateRussian(trimmed))
	if login == "" {
		return "", "", fmt.Errorf("не удалось сформировать логин")
	}

	return login, fmt.Sprintf("%s@%s", login, s.emailDomain), nil
}

func generateLoginFromFullName(fullName string) string {
	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return ""
	}

	lastName := sanitizeLogin(transliterateRussian(parts[0]))
	if lastName == "" {
		return ""
	}

	initials := make([]string, 0, max(len(parts)-1, 0))
	for _, part := range parts[1:] {
		runes := []rune(part)
		if len(runes) == 0 {
			continue
		}

		initial := sanitizeLogin(transliterateRussian(string(runes[0])))
		if initial != "" {
			initials = append(initials, initial)
		}
	}

	if len(initials) == 0 {
		return lastName
	}

	return sanitizeLogin(lastName + "." + strings.Join(initials, ""))
}

func isDuplicateStudentLoginError(err error) bool {
	if err == nil {
		return false
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "already been registered") ||
		strings.Contains(message, "already registered") ||
		strings.Contains(message, "duplicate") ||
		strings.Contains(message, "unique")
}

func sanitizeLogin(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}

	var builder strings.Builder
	lastSeparator := false
	for _, char := range value {
		switch {
		case char >= 'a' && char <= 'z':
			builder.WriteRune(char)
			lastSeparator = false
		case char >= '0' && char <= '9':
			builder.WriteRune(char)
			lastSeparator = false
		case char == '.' || char == '_' || char == '-':
			if builder.Len() > 0 && !lastSeparator {
				builder.WriteRune(char)
				lastSeparator = true
			}
		case unicode.IsSpace(char):
			if builder.Len() > 0 && !lastSeparator {
				builder.WriteRune('.')
				lastSeparator = true
			}
		}
	}

	return strings.Trim(builder.String(), "._-")
}

func transliterateRussian(value string) string {
	var builder strings.Builder
	for _, char := range strings.ToLower(value) {
		switch char {
		case 'а':
			builder.WriteString("a")
		case 'б':
			builder.WriteString("b")
		case 'в':
			builder.WriteString("v")
		case 'г':
			builder.WriteString("g")
		case 'д':
			builder.WriteString("d")
		case 'е':
			builder.WriteString("e")
		case 'ё':
			builder.WriteString("yo")
		case 'ж':
			builder.WriteString("zh")
		case 'з':
			builder.WriteString("z")
		case 'и':
			builder.WriteString("i")
		case 'й':
			builder.WriteString("y")
		case 'к':
			builder.WriteString("k")
		case 'л':
			builder.WriteString("l")
		case 'м':
			builder.WriteString("m")
		case 'н':
			builder.WriteString("n")
		case 'о':
			builder.WriteString("o")
		case 'п':
			builder.WriteString("p")
		case 'р':
			builder.WriteString("r")
		case 'с':
			builder.WriteString("s")
		case 'т':
			builder.WriteString("t")
		case 'у':
			builder.WriteString("u")
		case 'ф':
			builder.WriteString("f")
		case 'х':
			builder.WriteString("kh")
		case 'ц':
			builder.WriteString("ts")
		case 'ч':
			builder.WriteString("ch")
		case 'ш':
			builder.WriteString("sh")
		case 'щ':
			builder.WriteString("shch")
		case 'ъ':
		case 'ы':
			builder.WriteString("y")
		case 'ь':
		case 'э':
			builder.WriteString("e")
		case 'ю':
			builder.WriteString("yu")
		case 'я':
			builder.WriteString("ya")
		default:
			builder.WriteRune(char)
		}
	}

	return builder.String()
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func normalizeCertificateQuantities(certificate *model.Certificate) error {
	if certificate.TotalQuantity == nil {
		certificate.RemainingQuantity = nil
		return nil
	}

	if *certificate.TotalQuantity < 0 {
		return fmt.Errorf("total_quantity не может быть отрицательным")
	}

	if certificate.RemainingQuantity == nil {
		value := *certificate.TotalQuantity
		certificate.RemainingQuantity = &value
	}

	if *certificate.RemainingQuantity < 0 {
		return fmt.Errorf("remaining_quantity не может быть отрицательным")
	}
	if *certificate.RemainingQuantity > *certificate.TotalQuantity {
		return fmt.Errorf("remaining_quantity не может быть больше total_quantity")
	}

	return nil
}
