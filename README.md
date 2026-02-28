# 🍪 CookieLearn

**Веб-приложение для геймификации учебного курса**

Студенты зарабатывают виртуальные "печеньки" за активность и тратят их на привилегии (сертификаты). Преподаватель управляет всей экономикой через административную панель.

## Технологический стек

- **Frontend**: Next.js 15 (App Router) + TypeScript + shadcn/ui + TailwindCSS
- **UI библиотеки**: Framer Motion для анимаций, canvas-confetti для эффектов
- **Data fetching**: TanStack Query v5
- **Backend**: Go (net/http + chi router)
- **БД / Auth / Storage**: Supabase (PostgreSQL + Auth)
- **Контейнеризация**: Docker + Docker Compose

## Структура проекта

```
/
├── frontend/          # Next.js приложение
├── backend/           # Go API сервер
├── supabase/          # SQL миграции
├── docker-compose.yml
└── .env.example
```

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и заполните переменные
2. Запустите проект через Docker:

```bash
docker compose up --build
```

3. Откройте http://localhost:3000

## Локальная разработка

### Backend

```bash
cd backend
go run ./cmd/server
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Особенности

- 🎨 Современный дизайн с тёплой цветовой схемой (янтарный/оранжевый акцент)
- ✨ Плавные анимации с Framer Motion и GSAP
- 🎉 Confetti-эффекты при получении печенек
- 📱 Адаптивный дизайн (mobile-first)
- 🔐 Полная аутентификация через Supabase
- 📊 Админ-панель с аналитикой и управлением

