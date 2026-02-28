# Структура базы данных CookieLearn

## Диаграмма связей

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
│                 │
│ - id (UUID)     │
│ - email         │
│ - metadata      │
└────────┬────────┘
         │ 1:1
         │ (trigger on_auth_user_created)
         ↓
┌─────────────────────────────────────┐
│           profiles                   │
├─────────────────────────────────────┤
│ - id (UUID) PK [FK auth.users]      │
│ - full_name (TEXT)                  │
│ - group_name (TEXT) nullable        │
│ - role (TEXT) 'student'|'admin'     │
│ - balance (INT) ≥ 0                 │◄────┐
│ - created_at (TIMESTAMPTZ)          │     │
│ - last_login_at (TIMESTAMPTZ)       │     │
└──────────┬──────────────────────────┘     │
           │                                 │
           │ 1:N                            │ update balance
           │                                 │
           ↓                                 │
┌─────────────────────────────────────┐     │
│      cookie_transactions             │     │
├─────────────────────────────────────┤     │
│ - id (UUID) PK                      │     │
│ - user_id (UUID) FK [profiles]      │─────┘
│ - amount (INT) + начисление         │  (trigger on_transaction_created)
│                - списание           │
│ - reason (TEXT)                     │
│ - category (TEXT) nullable          │
│   'daily_bonus'|'manual'|           │
│   'purchase'|'random_bonus'|        │
│   'task_reward'                     │
│ - created_by (UUID) FK [profiles]   │
│ - created_at (TIMESTAMPTZ)          │
└─────────────────────────────────────┘


┌─────────────────────────────────────┐
│          certificates                │
├─────────────────────────────────────┤
│ - id (UUID) PK                      │
│ - title (TEXT)                      │
│ - description (TEXT)                │
│ - base_price (INT) > 0              │
│ - current_price (INT) > 0           │
│ - inflation_step (INT)              │
│ - total_quantity (INT) nullable     │
│ - remaining_quantity (INT) nullable │
│ - validity_days (INT) nullable      │
│ - is_active (BOOLEAN)               │
│ - created_at (TIMESTAMPTZ)          │
│ - updated_at (TIMESTAMPTZ)          │
└──────────┬──────────────────────────┘
           │
           │ 1:N
           │
           ↓
┌─────────────────────────────────────┐
│           purchases                  │
├─────────────────────────────────────┤
│ - id (UUID) PK                      │
│ - user_id (UUID) FK [profiles]      │
│ - certificate_id (UUID) FK [cert]   │
│ - price_paid (INT) > 0              │
│ - purchased_at (TIMESTAMPTZ)        │
│ - expires_at (TIMESTAMPTZ) nullable │◄─ (auto computed)
│ - used_at (TIMESTAMPTZ) nullable    │
│ - status (TEXT)                     │
│   'active'|'used'|'expired'         │
└─────────────────────────────────────┘


┌─────────────────────────────────────┐
│         daily_bonuses                │
├─────────────────────────────────────┤
│ - id (UUID) PK                      │
│ - user_id (UUID) FK [profiles]      │
│ - awarded_at (DATE)                 │
│ - created_at (TIMESTAMPTZ)          │
│                                      │
│ UNIQUE(user_id, awarded_at)         │
└─────────────────────────────────────┘


┌─────────────────────────────────────┐
│             tasks                    │
├─────────────────────────────────────┤
│ - id (UUID) PK                      │
│ - title (TEXT)                      │
│ - description (TEXT)                │
│ - type (TEXT) 'vote'|'quiz'|        │
│        'activity'                   │
│ - reward (INT) > 0                  │
│ - deadline (TIMESTAMPTZ)            │
│ - status (TEXT) 'active'|'closed'   │
│ - created_by (UUID) FK [profiles]   │
│ - created_at (TIMESTAMPTZ)          │
│ - closed_at (TIMESTAMPTZ)           │
└──────────┬──────────────────────────┘
           │
           │ 1:N
           │
           ↓
┌─────────────────────────────────────┐
│             votes                    │
├─────────────────────────────────────┤
│ - id (UUID) PK                      │
│ - task_id (UUID) FK [tasks]         │
│ - voter_id (UUID) FK [profiles]     │
│ - nominee_id (UUID) FK [profiles]   │
│ - created_at (TIMESTAMPTZ)          │
│                                      │
│ UNIQUE(task_id, voter_id)           │
│ CHECK(voter_id != nominee_id)       │
└─────────────────────────────────────┘
```

## Таблицы и их назначение

### 🔐 profiles
**Назначение**: Профили пользователей с балансом печенек

**Ключевые поля**:
- `balance` - текущий баланс печенек (обновляется через триггер)
- `group_name` - учебная группа студента (ИВТ-401, ПМИ-301 и т.д.)
- `role` - роль пользователя (student или admin)

**Связи**:
- ← `auth.users` (1:1) - создаётся автоматически при регистрации
- → `cookie_transactions` (1:N) - история операций
- → `purchases` (1:N) - покупки сертификатов
- → `daily_bonuses` (1:N) - полученные бонусы

---

### 💰 cookie_transactions
**Назначение**: История всех операций с печеньками

**Ключевые поля**:
- `amount` - сумма транзакции (положительная = начисление, отрицательная = списание)
- `category` - тип операции для аналитики
- `reason` - человекочитаемое описание

**Категории**:
- `daily_bonus` - ежедневный бонус
- `manual` - ручное начисление админом
- `purchase` - покупка в магазине
- `random_bonus` - случайный бонус
- `task_reward` - награда за задание

**Триггер**: `on_transaction_created`
- Автоматически обновляет `profiles.balance`
- Проверяет что баланс не отрицательный

---

### 🎫 certificates
**Назначение**: Каталог сертификатов в магазине

**Ключевые поля**:
- `base_price` - начальная цена сертификата
- `current_price` - текущая цена (растёт с инфляцией)
- `inflation_step` - на сколько растёт цена после каждой покупки
- `total_quantity` - всего доступно (NULL = безлимит)
- `remaining_quantity` - сколько осталось
- `validity_days` - срок действия после покупки в днях (NULL = бессрочный)

**Механика инфляции**:
```
Покупка #1: цена = 100
Покупка #2: цена = 100 + 10 = 110 (если inflation_step = 10)
Покупка #3: цена = 110 + 10 = 120
```

**Триггер**: `update_certificates_updated_at`
- Обновляет `updated_at` при изменении

---

### 🛒 purchases
**Назначение**: История покупок сертификатов студентами

**Ключевые поля**:
- `price_paid` - цена на момент покупки (фиксируется)
- `status` - текущий статус сертификата
  - `active` - действует, можно использовать
  - `used` - был использован
  - `expired` - срок истёк
- `expires_at` - дата истечения (вычисляется автоматически)
- `used_at` - когда был использован

**Триггер**: `set_purchase_expiry`
- Автоматически вычисляет `expires_at` на основе `validity_days` сертификата
- Формула: `expires_at = purchased_at + validity_days`

**Функция**: `mark_expired_purchases()`
- Можно вызывать периодически для автоматической пометки истёкших сертификатов

---

### 🎁 daily_bonuses
**Назначение**: Отслеживание получения ежедневных бонусов

**Ключевые поля**:
- `awarded_at` - дата получения бонуса
- `UNIQUE(user_id, awarded_at)` - студент может получить бонус только раз в день

**Логика**:
1. Студент запрашивает бонус
2. Проверяется нет ли записи с сегодняшней датой
3. Создаётся запись в `daily_bonuses`
4. Создаётся транзакция в `cookie_transactions` (+1 печенька)

---

### 📋 tasks
**Назначение**: Задания для студентов (голосования, квизы, активности)

**Ключевые поля**:
- `type` - тип задания
  - `vote` - голосование
  - `quiz` - опрос/тест
  - `activity` - активность
- `reward` - награда в печеньках
- `status` - активное или закрытое
- `deadline` - крайний срок

---

### 🗳️ votes
**Назначение**: Голоса в заданиях типа "vote"

**Ключевые поля**:
- `voter_id` - кто голосует
- `nominee_id` - за кого голосует
- `UNIQUE(task_id, voter_id)` - один студент = один голос в задании
- `CHECK(voter_id != nominee_id)` - нельзя голосовать за себя

**Функция**: `get_task_winner(task_uuid)`
- Возвращает победителя голосования (с наибольшим количеством голосов)

## Бизнес-логика покупки сертификата

```sql
-- Пример полного процесса покупки
BEGIN;

-- 1. Получаем информацию о сертификате
SELECT id, current_price, remaining_quantity 
FROM certificates 
WHERE id = 'cert-uuid' AND is_active = true;

-- 2. Проверяем баланс студента
SELECT balance FROM profiles WHERE id = 'student-uuid';
-- balance >= current_price?

-- 3. Списываем деньги (через транзакцию)
INSERT INTO cookie_transactions (user_id, amount, reason, category)
VALUES ('student-uuid', -current_price, 'Покупка: Название сертификата', 'purchase');
-- Триггер автоматически обновит profiles.balance

-- 4. Создаём покупку
INSERT INTO purchases (user_id, certificate_id, price_paid)
VALUES ('student-uuid', 'cert-uuid', current_price);
-- Триггер автоматически вычислит expires_at

-- 5. Обновляем сертификат
UPDATE certificates 
SET 
  current_price = current_price + inflation_step,
  remaining_quantity = CASE 
    WHEN remaining_quantity IS NOT NULL 
    THEN remaining_quantity - 1 
    ELSE NULL 
  END,
  is_active = CASE
    WHEN remaining_quantity IS NOT NULL AND remaining_quantity - 1 = 0
    THEN false
    ELSE true
  END
WHERE id = 'cert-uuid';

COMMIT;
```

## Индексы для производительности

### profiles
```sql
idx_profiles_role ON profiles(role)
idx_profiles_group ON profiles(group_name)
```

### cookie_transactions
```sql
idx_transactions_user_id ON cookie_transactions(user_id)
idx_transactions_created_at ON cookie_transactions(created_at DESC)
idx_transactions_category ON cookie_transactions(category)
```

### certificates
```sql
idx_certificates_active ON certificates(is_active)
idx_certificates_price ON certificates(current_price)
```

### purchases
```sql
idx_purchases_user_id ON purchases(user_id)
idx_purchases_status ON purchases(status)
idx_purchases_certificate_id ON purchases(certificate_id)
idx_purchases_expires_at ON purchases(expires_at)
```

### daily_bonuses
```sql
idx_daily_bonuses_user_id ON daily_bonuses(user_id)
idx_daily_bonuses_awarded_at ON daily_bonuses(awarded_at DESC)
```

## RLS (Row Level Security)

Все таблицы защищены политиками безопасности:

### profiles
- ✅ Все могут просматривать профили
- ✅ Пользователи могут редактировать свой профиль
- ✅ Админы могут создавать/удалять профили

### cookie_transactions
- ✅ Пользователи видят свои транзакции
- ✅ Админы видят все транзакции
- ✅ Только админы могут создавать транзакции

### certificates
- ✅ Все видят активные сертификаты
- ✅ Админы видят все сертификаты
- ✅ Только админы могут управлять сертификатами

### purchases
- ✅ Пользователи видят свои покупки
- ✅ Админы видят все покупки
- ✅ Пользователи могут создавать покупки (через API)

### daily_bonuses
- ✅ Пользователи видят свои бонусы
- ✅ Админы видят все бонусы
- ✅ Пользователи могут получать свои бонусы

## Пример данных

### Сертификат с инфляцией и ограниченным количеством
```json
{
  "title": "Освобождение от экзамена",
  "base_price": 100,
  "current_price": 100,
  "inflation_step": 10,
  "total_quantity": 3,
  "remaining_quantity": 3,
  "validity_days": 30
}
```

После 1 покупки:
```json
{
  "current_price": 110,    // +10
  "remaining_quantity": 2   // -1
}
```

### Профиль студента
```json
{
  "full_name": "Иван Иванов",
  "group_name": "ИВТ-401",
  "role": "student",
  "balance": 150
}
```

### Покупка
```json
{
  "user_id": "uuid-студента",
  "certificate_id": "uuid-сертификата",
  "price_paid": 100,
  "purchased_at": "2024-01-15T10:30:00Z",
  "expires_at": "2024-02-14T10:30:00Z",  // +30 дней
  "status": "active"
}
```

### Транзакция
```json
{
  "user_id": "uuid-студента",
  "amount": -100,
  "reason": "Покупка: Освобождение от экзамена",
  "category": "purchase",
  "created_at": "2024-01-15T10:30:00Z"
}
```
