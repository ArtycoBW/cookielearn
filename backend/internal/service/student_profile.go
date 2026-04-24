package service

import (
	"context"
	"time"

	"github.com/cookielearn/backend/internal/model"
)

const defaultActivityCalendarDays = 140

func (s *StudentService) GetProfileSummary(ctx context.Context, userID string) (*model.ProfileSummary, error) {
	profile, err := s.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	streak, err := s.getStreakSummary(ctx, userID)
	if err != nil {
		return nil, err
	}

	activityDays, err := s.profileRepo.GetActivityCalendar(ctx, userID, defaultActivityCalendarDays)
	if err != nil {
		return nil, err
	}

	recentActivities, err := s.profileRepo.GetRecentActivities(ctx, userID, 10)
	if err != nil {
		return nil, err
	}

	favoriteTaskCategory, err := s.profileRepo.GetFavoriteTaskCategory(ctx, userID)
	if err != nil {
		return nil, err
	}

	recentCertificates, err := s.purchRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if recentCertificates == nil {
		recentCertificates = make([]*model.Purchase, 0)
	}
	if len(recentCertificates) > 4 {
		recentCertificates = recentCertificates[:4]
	}

	rank := 0
	if profile.Role == "student" {
		rank, err = s.getLeaderboardRank(ctx, userID)
		if err != nil {
			return nil, err
		}
	}

	activeDaysCount := 0
	for _, day := range activityDays {
		if day.Count > 0 {
			activeDaysCount++
		}
	}

	return &model.ProfileSummary{
		Profile:              profile,
		Rank:                 rank,
		Streak:               streak,
		ActivityDays:         activityDays,
		ActiveDaysCount:      activeDaysCount,
		RecentActivities:     recentActivities,
		RecentCertificates:   recentCertificates,
		FavoriteTaskCategory: favoriteTaskCategory,
	}, nil
}

func (s *StudentService) getLeaderboardRank(ctx context.Context, userID string) (int, error) {
	profiles, err := s.profileRepo.GetStudents(ctx)
	if err != nil {
		return 0, err
	}

	if err := applyLeaderboardProgressToProfiles(ctx, s.profileRepo, profiles); err != nil {
		return 0, err
	}

	for _, entry := range buildLeaderboardEntries(profiles) {
		if entry.ID == userID {
			return entry.Rank, nil
		}
	}

	return 0, nil
}

func (s *StudentService) getStreakSummary(ctx context.Context, userID string) (model.StreakSummary, error) {
	claimedToday, err := s.bonusRepo.HasClaimedToday(ctx, userID)
	if err != nil {
		return model.StreakSummary{}, err
	}

	dates, err := s.bonusRepo.GetAwardedDates(ctx, userID)
	if err != nil {
		return model.StreakSummary{}, err
	}

	return buildStreakSummary(dates, time.Now().UTC(), claimedToday), nil
}

func buildStreakSummary(dates []time.Time, now time.Time, claimedToday bool) model.StreakSummary {
	today := normalizeBonusDate(now)
	summary := model.StreakSummary{
		CanClaimToday: claimedToday == false,
	}

	if len(dates) == 0 {
		summary.NextMilestone = nextStreakMilestone(0)
		summary.DaysToNextMilestone = summary.NextMilestone
		return summary
	}

	normalizedDates := make([]time.Time, 0, len(dates))
	for _, date := range dates {
		normalizedDates = append(normalizedDates, normalizeBonusDate(date))
	}

	longest := 0
	currentRun := 0
	for index, day := range normalizedDates {
		if index == 0 || day.Equal(normalizedDates[index-1].AddDate(0, 0, 1)) {
			currentRun++
		} else if day.Equal(normalizedDates[index-1]) {
			continue
		} else {
			currentRun = 1
		}

		if currentRun > longest {
			longest = currentRun
		}
	}

	lastDay := normalizedDates[len(normalizedDates)-1]
	summary.LastClaimedAt = &lastDay
	summary.Longest = longest

	if !lastDay.Before(today.AddDate(0, 0, -1)) {
		current := 1
		for index := len(normalizedDates) - 1; index > 0; index-- {
			if normalizedDates[index].Equal(normalizedDates[index-1].AddDate(0, 0, 1)) {
				current++
				continue
			}
			break
		}
		summary.Current = current
	}

	summary.NextMilestone = nextStreakMilestone(summary.Current)
	summary.DaysToNextMilestone = summary.NextMilestone - summary.Current
	if summary.DaysToNextMilestone < 0 {
		summary.DaysToNextMilestone = 0
	}

	return summary
}

func resolveStreakReward(streak int) (int, *model.BadgePreview) {
	switch {
	case streak > 0 && streak%7 == 0:
		return 2, &model.BadgePreview{
			Icon:   "🔥",
			Title:  "Серия без пропусков",
			Reason: "Семь дней подряд с ежедневным бонусом.",
		}
	case streak > 0 && streak%3 == 0:
		return 1, nil
	default:
		return 0, nil
	}
}

func nextStreakMilestone(current int) int {
	milestones := []int{3, 7, 14, 21, 30}
	for _, milestone := range milestones {
		if current < milestone {
			return milestone
		}
	}

	return ((current / 7) + 1) * 7
}

func normalizeBonusDate(value time.Time) time.Time {
	year, month, day := value.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}
