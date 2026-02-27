# 🍪 CookieLearn — Веб-приложение для геймификации учебного курса

## Контекст проекта

**Тема ВКР:** «Веб-приложение для геймификации учебного курса»  
Студенты зарабатывают виртуальные «печеньки» за активность и тратят их на привилегии (сертификаты). Преподаватель управляет всей экономикой через административную панель.

---

## Правила работы агента

1. **После каждого завершённого шага** — делай `git commit` с понятным сообщением на русском в стиле `feat: добавление конечной точки магазина сертификатов`.
2. **Всё должно собираться через Docker** — поддерживай актуальный `docker-compose.yml` на протяжении всей разработки.
3. Перед началом нового шага убедись, что предыдущий шаг компилируется и тесты (если есть) проходят.
4. Не удаляй существующий рабочий код без явной причины.
5. Используй переменные окружения через `.env` / `.env.example` — секреты никогда не хардкодить.
6. Придерживайся структуры проекта, описанной ниже.

---

## Технический стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | shadcn/ui + TailwindCSS |
| Data fetching | TanStack Query v5 |
| Backend | Go (net/http + chi router) |
| БД / Auth / Storage | Supabase (PostgreSQL + Auth) |
| Контейнеризация | Docker + Docker Compose |

---

## Структура монорепозитория

```
/
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (student)/
│   │   │   ├── dashboard/
│   │   │   ├── shop/
│   │   │   ├── history/
│   │   │   ├── leaderboard/
│   │   │   └── my-certificates/
│   │   └── (admin)/
│   │       ├── students/
│   │       ├── award/
│   │       ├── certificates/
│   │       ├── tasks/
│   │       └── stats/
│   ├── components/
│   │   ├── ui/               # shadcn компоненты
│   │   └── shared/           # кастомные компоненты
│   ├── lib/
│   │   ├── api.ts            # базовый fetch-клиент с JWT
│   │   ├── queryKeys.ts      # TanStack Query ключи
│   │   ├── queries/          # TanStack Query хуки
│   │   └── types.ts          # общие TypeScript типы
│   ├── middleware.ts          # защита маршрутов
│   ├── Dockerfile
│   └── .env.local.example
│
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── handler/          # HTTP handlers (тонкие)
│   │   ├── service/          # бизнес-логика
│   │   ├── repository/       # запросы к PostgreSQL
│   │   ├── middleware/       # auth JWT, CORS, logger
│   │   └── model/            # Go structs
│   ├── Dockerfile
│   └── .env.example
│
├── supabase/
│   └── migrations/           # SQL миграции (001_, 002_, ...)
│
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

---

## Docker Compose

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["8080:8080"]
    env_file: .env
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    env_file: .env
    depends_on:
      - backend
    restart: unless-stopped
```

`.env.example`:
```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Backend
PORT=8080
FRONTEND_URL=http://localhost:3000

# Frontend (публичные)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## База данных (Supabase / PostgreSQL)

Все миграции — в `supabase/migrations/` с префиксом `001_`, `002_` и т.д.

### Схема

```sql
-- 001_profiles.sql
-- Профили (расширение Supabase Auth)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  group_name    TEXT,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  balance       INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 002_transactions.sql
CREATE TABLE cookie_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      INT NOT NULL,       -- + начисление, - списание
  reason      TEXT NOT NULL,
  category    TEXT,               -- 'daily_bonus','manual','purchase','random_bonus'
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 003_certificates.sql
CREATE TABLE certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT,
  base_price         INT NOT NULL CHECK (base_price > 0),
  current_price      INT NOT NULL,
  inflation_step     INT NOT NULL DEFAULT 0,  -- рост цены за каждую покупку
  total_quantity     INT,                      -- NULL = безлимит
  remaining_quantity INT,
  validity_days      INT,                      -- срок действия после покупки (дни)
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 004_purchases.sql
CREATE TABLE purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id),
  certificate_id UUID NOT NULL REFERENCES certificates(id),
  price_paid     INT NOT NULL,
  purchased_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ,
  used_at        TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired'))
);

-- 005_daily_bonuses.sql
CREATE TABLE daily_bonuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  awarded_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, awarded_at)
);

-- 006_tasks.sql
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'vote',
  reward      INT NOT NULL DEFAULT 1,
  deadline    TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES profiles(id),
  nominee_id  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, voter_id)
);
```

### Row Level Security

Включить RLS на всех таблицах. Политики:
- `profiles`: студент видит только свою строку; admin видит все; leaderboard-поля (id, full_name, balance) публичны.
- `cookie_transactions`: студент видит только свои.
- `purchases`: студент видит только свои.
- `certificates`: читают все (активные); пишет только admin через service_role.
- `daily_bonuses`, `tasks`, `votes`: студент видит/пишет только своё.

---

## Backend API (Go)

### Маршруты

```
GET  /health

POST /api/auth/sync                      # создать/обновить профиль после Supabase Auth

# Студент (auth required)
GET  /api/me
GET  /api/me/transactions
GET  /api/me/certificates
POST /api/me/daily-bonus

GET  /api/leaderboard                    # публично

# Магазин (auth required)
GET  /api/shop/certificates
POST /api/shop/certificates/:id/buy
POST /api/shop/random-bonus/buy

# Admin (role=admin required)
GET    /api/admin/students
POST   /api/admin/students
PUT    /api/admin/students/:id
DELETE /api/admin/students/:id
POST   /api/admin/students/bulk-import   # CSV: email,full_name,group_name

POST   /api/admin/cookies/award          # { user_id, amount, reason, category }

GET    /api/admin/certificates
POST   /api/admin/certificates
PUT    /api/admin/certificates/:id
DELETE /api/admin/certificates/:id

GET    /api/admin/tasks
POST   /api/admin/tasks
POST   /api/admin/tasks/:id/close

GET    /api/admin/stats
```

### Middleware

- **AuthMiddleware** — валидирует Supabase JWT из `Authorization: Bearer <token>`, кладёт `user_id` и `role` в `context.Context`.
- **AdminOnly** — проверяет `role == "admin"`, иначе 403.
- **CORS** — разрешает запросы с `FRONTEND_URL`.
- **Logger** — метод, путь, статус, duration.

### Бизнес-логика

**Покупка сертификата** (`POST /api/shop/certificates/:id/buy`):
1. Проверить `remaining_quantity > 0` (если не безлимит).
2. Проверить `balance >= current_price`.
3. В одной транзакции БД:
   - Создать запись в `purchases` (статус `active`, вычислить `expires_at`).
   - Создать запись в `cookie_transactions` на `-current_price`.
   - Обновить `profiles.balance -= current_price`.
   - Уменьшить `certificates.remaining_quantity`.
   - Пересчитать `current_price = base_price + sold_count * inflation_step`.
4. Вернуть покупку и новый баланс.

**Ежедневный бонус** (`POST /api/me/daily-bonus`):
1. INSERT в `daily_bonuses` — UNIQUE constraint защищает от дублирования.
2. При успехе — начислить +1 печеньку.

**Случайный бонус** (`POST /api/shop/random-bonus/buy`):
1. Фиксированная стоимость из конфига (по умолчанию 3 печеньки).
2. Списать стоимость (проверить баланс).
3. Случайный выигрыш: 1–5 печенек.
4. Вернуть сколько выиграл.

**Закрытие задания** (`POST /api/admin/tasks/:id/close`):
1. Подсчитать голоса, найти победителя.
2. Начислить `task.reward` победителю.
3. Перевести задание в `closed`.

---

## Frontend (Next.js + shadcn)

### Auth Flow

- Использовать `@supabase/ssr` для работы с токенами.
- После входа через Supabase Auth — вызвать `POST /api/auth/sync`.
- `middleware.ts` — редиректить неавторизованных на `/login`, студентов от `/admin/*` — 403.

### TanStack Query

Все запросы через хелпер `api.ts`, который берёт JWT из Supabase сессии и добавляет в заголовок:

```ts
// lib/api.ts
export const api = {
  get: async <T>(path: string): Promise<T> => {
    const token = await getSupabaseToken()
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  post: async <T>(path: string, body?: unknown): Promise<T> => { ... },
  // put, delete аналогично
}
```

Инвалидация кэша после мутаций — обязательна (`queryClient.invalidateQueries`).

### Ключевые страницы

| Путь | Роль | Содержимое |
|---|---|---|
| `/login` | все | Форма входа (email + пароль) |
| `/dashboard` | student | Баланс 🍪, кнопка ежедневного бонуса, последние транзакции |
| `/shop` | student | Карточки сертификатов с ценой и остатком |
| `/history` | student | Таблица всех транзакций с фильтрами |
| `/leaderboard` | student | Рейтинг группы |
| `/my-certificates` | student | Купленные сертификаты и их статус |
| `/admin/students` | admin | Таблица + CRUD + импорт CSV |
| `/admin/award` | admin | Форма начисления / списания |
| `/admin/certificates` | admin | CRUD сертификатов с ценой и инфляцией |
| `/admin/tasks` | admin | Создание заданий и голосований |
| `/admin/stats` | admin | Графики активности, топ сертификатов |

### UI/UX требования

- Тёплая цветовая схема: янтарный / оранжевый акцент (ассоциация с печенькой 🍪).
- Confetti-анимация при получении печенек — библиотека `canvas-confetti`.
- Toast-уведомления — `sonner`.
- Скелетон-загрузки для всех таблиц и карточек.
- Адаптивная вёрстка, mobile-first.

---

## Порядок разработки

Выполнять строго по порядку. После каждого шага — `git commit`.

### Шаг 1 — Инфраструктура
- [ ] Инициализировать монорепозиторий, создать `frontend/` и `backend/`
- [ ] `docker-compose.yml` с обоими сервисами
- [ ] Dockerfile для Go (multi-stage: `golang:alpine` builder + `alpine` runner)
- [ ] Dockerfile для Next.js (multi-stage)
- [ ] `.env.example` со всеми переменными
- [ ] `git commit: chore: initial project structure with docker`

### Шаг 2 — База данных
- [ ] Написать SQL миграции `001_` – `006_` в `supabase/migrations/`
- [ ] Применить миграции (`supabase db push`)
- [ ] Написать RLS политики
- [ ] `git commit: feat: database schema and RLS policies`

### Шаг 3 — Backend: основа
- [ ] Инициализировать Go модуль (`go mod init`)
- [ ] Зависимости: `chi`, `pgx/v5`, `golang-jwt/jwt`
- [ ] `cmd/server/main.go` с запуском HTTP-сервера
- [ ] CORS, Logger, AuthMiddleware
- [ ] `GET /health`
- [ ] `git commit: feat: go server with auth middleware`

### Шаг 4 — Backend: студент API
- [ ] `GET /api/me`
- [ ] `GET /api/me/transactions`
- [ ] `GET /api/me/certificates`
- [ ] `POST /api/me/daily-bonus`
- [ ] `GET /api/leaderboard`
- [ ] `git commit: feat: student API endpoints`

### Шаг 5 — Backend: магазин
- [ ] `GET /api/shop/certificates`
- [ ] `POST /api/shop/certificates/:id/buy` (с инфляцией, в транзакции БД)
- [ ] `POST /api/shop/random-bonus/buy`
- [ ] `git commit: feat: shop API with inflation mechanic`

### Шаг 6 — Backend: Admin API
- [ ] Students CRUD + `POST /bulk-import`
- [ ] `POST /api/admin/cookies/award`
- [ ] Certificates CRUD
- [ ] Tasks CRUD + `POST /:id/close`
- [ ] `GET /api/admin/stats`
- [ ] `git commit: feat: admin API endpoints`

### Шаг 7 — Frontend: основа
- [ ] `create-next-app` с TypeScript + TailwindCSS
- [ ] Установить shadcn/ui, TanStack Query v5, Supabase SSR, sonner, canvas-confetti
- [ ] Настроить QueryClientProvider и Supabase клиент
- [ ] Layout с боковой навигацией (разная для student / admin)
- [ ] `git commit: feat: next.js base setup with providers`

### Шаг 8 — Frontend: Auth
- [ ] Страница `/login`
- [ ] `middleware.ts` для защиты маршрутов
- [ ] Хук `useUser()` и вызов `POST /api/auth/sync` при первом входе
- [ ] `git commit: feat: authentication flow`

### Шаг 9 — Frontend: страницы студента
- [ ] `/dashboard` — баланс, ежедневный бонус с confetti, последние транзакции
- [ ] `/shop` — карточки, кнопка «Купить», счётчик остатка
- [ ] `/history` — таблица с фильтрами
- [ ] `/leaderboard`
- [ ] `/my-certificates`
- [ ] `git commit: feat: student pages`

### Шаг 10 — Frontend: Admin панель
- [ ] `/admin/students` — таблица + диалог создания + импорт CSV
- [ ] `/admin/award` — форма начисления
- [ ] `/admin/certificates` — CRUD-диалоги
- [ ] `/admin/tasks` — создание + голосование
- [ ] `/admin/stats` — графики (recharts)
- [ ] `git commit: feat: admin dashboard`

### Шаг 11 — Полировка и финал
- [ ] Confetti на все начисления
- [ ] Toast везде, включая ошибки с понятным текстом
- [ ] Скелетоны и пустые состояния
- [ ] Проверить все Docker сборки от нуля (`docker compose up --build`)
- [ ] `git commit: feat: UI polish, animations, final docker check`

---

## Соглашения по коду

### Go
- Хендлеры тонкие — только парсинг запроса и ответ; логика в `service/`.
- Ошибки оборачивать: `fmt.Errorf("service.BuyCertificate: %w", err)`.
- JSON-ответ через хелпер: `respondJSON(w, http.StatusOK, data)`.
- Конфиг через `os.Getenv`; паниковать при старте, если обязательное поле пустое.

### TypeScript / Next.js
- `"use client"` — только там, где реально нужен браузер (интерактивность, хуки).
- Все API-типы в `lib/types.ts`.
- Все query keys в `lib/queryKeys.ts`.
- Обязательная обработка `isLoading` и `isError` в каждом компоненте с данными.
- `strict: true` в `tsconfig.json`.

### Git
- Ветки: `feature/название`, `fix/название`.
- Коммиты: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- Главная ветка: `main`.

---

## Полезные команды

```bash
# Запустить всё через Docker
docker compose up --build

# Backend локально
cd backend && go run ./cmd/server

# Frontend локально
cd frontend && npm run dev

# Применить миграции Supabase
supabase db push

# Линтер Go
golangci-lint run ./...

# Линтер TypeScript
npm run lint
```
