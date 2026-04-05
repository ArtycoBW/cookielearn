export type SeasonChapter = {
  id: string
  title: string
  subtitle: string
  threshold: number
  description: string
}

export const seasonChapters: SeasonChapter[] = [
  {
    id: 'html',
    title: 'Глава 1',
    subtitle: 'Мир HTML',
    threshold: 0,
    description: 'Разбираем структуру страницы, теги, семантику и основу интерфейсов.',
  },
  {
    id: 'css',
    title: 'Глава 2',
    subtitle: 'Битва с CSS',
    threshold: 14,
    description: 'Сетки, адаптив, стили и первые настоящие визуальные победы.',
  },
  {
    id: 'sql',
    title: 'Глава 3',
    subtitle: 'Подземелье SQL',
    threshold: 32,
    description: 'Запросы, связи и логика данных, без которой мир не работает.',
  },
  {
    id: 'php',
    title: 'Глава 4',
    subtitle: 'Крепость PHP',
    threshold: 58,
    description: 'Собираем серверную часть, учимся держать состояние и маршруты.',
  },
  {
    id: 'auth',
    title: 'Глава 5',
    subtitle: 'Башня авторизации',
    threshold: 86,
    description: 'Финальный уровень: доступы, сессии, защита и уверенный прод.',
  },
]

export function getCurrentSeasonChapter(totalEarned: number) {
  let currentIndex = 0

  for (let index = seasonChapters.length - 1; index >= 0; index -= 1) {
    if (totalEarned >= seasonChapters[index].threshold) {
      currentIndex = index
      break
    }
  }

  const current = seasonChapters[currentIndex]
  const next = seasonChapters[currentIndex + 1] ?? null
  const currentFloor = current.threshold
  const nextFloor = next?.threshold ?? current.threshold
  const span = Math.max(nextFloor - currentFloor, 1)
  const progress = next ? Math.min(Math.max(((totalEarned - currentFloor) / span) * 100, 0), 100) : 100

  return {
    current,
    next,
    currentIndex,
    progress,
  }
}

export function buildCorgiMood(params: {
  totalEarned: number
  streak: number
  rank: number
  badgeCount: number
}) {
  const { totalEarned, streak, rank, badgeCount } = params

  if (rank > 0 && rank <= 3) {
    return {
      eyebrow: 'Лидерский темп',
      message: 'Корги Дуров уже наточил корону. Главное теперь не скидывай темп и держи серию.',
    }
  }

  if (streak >= 7) {
    return {
      eyebrow: 'Огонь без пропусков',
      message: 'Семь дней подряд и больше? Это уже не случайность, это стиль прохождения сезона.',
    }
  }

  if (badgeCount >= 3) {
    return {
      eyebrow: 'Коллекционер достижений',
      message: 'Бейджи собираются красиво. Ещё пара сильных задач и профиль будет выглядеть как витрина трофеев.',
    }
  }

  if (totalEarned >= 40) {
    return {
      eyebrow: 'Середина сезона',
      message: 'Ты уже уверенно идёшь по маршруту. Самое время добрать серию и закрепиться в рейтинге.',
    }
  }

  return {
    eyebrow: 'Хороший старт',
    message: 'Каждая печенька двигает сезон вперёд. Забирай бонус, держи активность и не давай тепловой карте остыть.',
  }
}
