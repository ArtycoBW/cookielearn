package service

import (
	"context"
	"sort"

	"github.com/cookielearn/backend/internal/model"
	"github.com/cookielearn/backend/internal/repository"
)

type playerLevel struct {
	Name      string
	Threshold int
}

var playerLevels = []playerLevel{
	{Name: "Заклинатель запросов", Threshold: 0},
	{Name: "Исследователь кода", Threshold: 36},
	{Name: "Разработчик фич", Threshold: 46},
	{Name: "Легенда бэкенда", Threshold: 77},
	{Name: "Божество продакшена", Threshold: 91},
}

func applyProgressToProfiles(
	ctx context.Context,
	profileRepo *repository.ProfileRepository,
	profiles []*model.Profile,
) error {
	if len(profiles) == 0 {
		return nil
	}

	userIDs := make([]string, 0, len(profiles))
	for _, profile := range profiles {
		if profile != nil && profile.ID != "" {
			userIDs = append(userIDs, profile.ID)
		}
	}

	metrics, err := profileRepo.GetActivityMetrics(ctx, userIDs)
	if err != nil {
		return err
	}

	badges, err := profileRepo.GetRecentBadges(ctx, userIDs, 3)
	if err != nil {
		return err
	}

	for _, profile := range profiles {
		if profile == nil {
			continue
		}
		applyProgressToProfile(profile, metrics[profile.ID], badges[profile.ID])
	}

	return nil
}

func applyProgressToProfile(profile *model.Profile, metrics repository.ProfileActivityMetrics, badges []model.BadgeAward) {
	if profile == nil {
		return
	}

	levelName, nextLevelName, progress, score := calculatePlayerLevel(metrics)

	profile.TotalEarned = metrics.TotalEarned
	profile.ActivityScore = score
	profile.LevelName = levelName
	profile.NextLevelName = nextLevelName
	profile.LevelProgress = progress
	profile.SubmittedTasks = metrics.SubmittedTasks
	profile.ReviewedTasks = metrics.ReviewedTasks
	profile.PurchaseCount = metrics.PurchaseCount
	profile.SurveyCompleted = metrics.SurveyCompleted
	profile.BadgeCount = metrics.BadgeCount
	profile.Badges = badges
}

func calculatePlayerLevel(metrics repository.ProfileActivityMetrics) (string, *string, int, int) {
	score := metrics.TotalEarned +
		metrics.SubmittedTasks*4 +
		metrics.ReviewedTasks*10 +
		metrics.PurchaseCount*4 +
		metrics.BadgeCount*8

	if metrics.SurveyCompleted {
		score += 12
	}

	levelValue := metrics.TotalEarned

	currentIndex := 0
	for index := len(playerLevels) - 1; index >= 0; index-- {
		if levelValue >= playerLevels[index].Threshold {
			currentIndex = index
			break
		}
	}

	current := playerLevels[currentIndex]
	if currentIndex == len(playerLevels)-1 {
		return current.Name, nil, 100, score
	}

	next := playerLevels[currentIndex+1]
	currentMax := next.Threshold - 1
	span := currentMax - current.Threshold
	progress := 100
	if span > 0 {
		progress = ((levelValue - current.Threshold) * 100) / span
		if progress < 0 {
			progress = 0
		}
		if progress > 100 {
			progress = 100
		}
	}

	nextName := next.Name
	return current.Name, &nextName, progress, score
}

func buildLeaderboardEntries(profiles []*model.Profile) []model.LeaderboardEntry {
	entries := make([]model.LeaderboardEntry, 0, len(profiles))
	for _, profile := range profiles {
		if profile == nil {
			continue
		}

		entry := model.LeaderboardEntry{
			ID:            profile.ID,
			FullName:      profile.FullName,
			GroupName:     profile.GroupName,
			Login:         profile.Login,
			Balance:       profile.Balance,
			TotalEarned:   profile.TotalEarned,
			ActivityScore: profile.ActivityScore,
			LevelName:     profile.LevelName,
			NextLevelName: profile.NextLevelName,
			LevelProgress: profile.LevelProgress,
			BadgeCount:    profile.BadgeCount,
			Badges:        profile.Badges,
		}
		entries = append(entries, entry)
	}

	sort.SliceStable(entries, func(left, right int) bool {
		if entries[left].TotalEarned != entries[right].TotalEarned {
			return entries[left].TotalEarned > entries[right].TotalEarned
		}
		if entries[left].ActivityScore != entries[right].ActivityScore {
			return entries[left].ActivityScore > entries[right].ActivityScore
		}
		return entries[left].FullName < entries[right].FullName
	})

	for index := range entries {
		entries[index].Rank = index + 1
	}

	return entries
}
