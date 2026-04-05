# Быстрая справка CookieLearn

## Структура Purchase (для вашего вопроса #1)

```typescript
interface Purchase {
  id: string                              // UUID покупки
  user_id: string                         // UUID студента  
  certificate_id: string                  // UUID сертификата
  price_paid: number                      // Цена на момент покупки
  purchased_at: string                    // "2024-01-15T10:30:00Z"
  expires_at?: string                     // "2024-02-14T10:30:00Z" (auto)
  used_at?: string                        // "2024-01-20T14:00:00Z" или null
  status: 'active' | 'used' | 'expired'   // Текущий статус
  certificate?: Certificate               // Вложенный объект (опционально)
}
```

## Быстрый старт (3 шага)

### 1️⃣ Создать пользователей в Supabase Dashboard

**Authentication > Users > Add user**

Скопируйте в User Metadata:
```json
{"full_name": "Иван Иванов", "role": "student"}
```

Создайте 7-8 студентов + 1 админа (см. `user_metadata_templates.json`)

### 2️⃣ Выполнить SQL скрипт

**SQL Editor > New query > Вставьте содержимое `quick_setup.sql` > Run**

Этот скрипт:
- ✅ Добавит 8 сертификатов
- ✅ Назначит группы студентам  
- ✅ Начислит 100-180 печенек каждому
- ✅ Создаст тестовые покупки
- ✅ Добавит ежедневные бонусы

### 3️⃣ Проверить данные

```sql
-- Таблица лидеров
SELECT full_name, group_name, balance 
FROM profiles 
WHERE role = 'student' 
ORDER BY balance DESC;

-- Покупки
SELECT p.full_name, c.title, pu.price_paid, pu.status
FROM purchases pu
JOIN profiles p ON pu.user_id = p.id
JOIN certificates c ON pu.certificate_id = c.id;
```

## SQL для копирования

### Добавить сертификаты
```sql
INSERT INTO certificates (title, description, base_price, current_price, inflation_step, total_quantity, remaining_quantity, validity_days, is_active)
VALUES
  ('Освобождение от экзамена', 'Полное освобождение от одного экзамена', 100, 100, 10, 3, 3, 30, true),
  ('Пересдача без штрафа', 'Бесплатная пересдача любого задания', 50, 50, 5, 10, 10, 60, true),
  ('Подсказка преподавателя', 'Одна подсказка на экзамене', 25, 25, 2, NULL, NULL, 7, true);
```

### Назначить группы
```sql
UPDATE profiles SET group_name = 'ИВТ-401' 
WHERE full_name IN ('Иван Иванов', 'Пётр Петров', 'Сидор Сидоров');

UPDATE profiles SET group_name = 'ИВТ-402' 
WHERE full_name IN ('Мария Кузнецова', 'Алексей Смирнов');

UPDATE profiles SET group_name = 'ПМИ-301' 
WHERE full_name IN ('Анна Попова', 'Дмитрий Волков');
```

### Начислить печеньки всем
```sql
INSERT INTO cookie_transactions (user_id, amount, reason, category)
SELECT id, 100, 'Приветственный бонус', 'manual'
FROM profiles WHERE role = 'student';
```

### Создать покупку (пример)
```sql
DO $$
DECLARE
  student_id UUID;
  cert_id UUID;
  cert_price INT;
BEGIN
  -- Находим студента и сертификат
  SELECT id INTO student_id FROM profiles WHERE full_name = 'Иван Иванов';
  SELECT id, current_price INTO cert_id, cert_price FROM certificates WHERE title = 'Подсказка преподавателя';
  
  -- Списываем деньги
  INSERT INTO cookie_transactions (user_id, amount, reason, category)
  VALUES (student_id, -cert_price, 'Покупка: Подсказка преподавателя', 'purchase');
  
  -- Создаём покупку
  INSERT INTO purchases (user_id, certificate_id, price_paid)
  VALUES (student_id, cert_id, cert_price);
END $$;
```

## Полезные запросы

### Таблица лидеров
```sql
SELECT 
  ROW_NUMBER() OVER (ORDER BY balance DESC) as rank,
  full_name, group_name, balance
FROM profiles WHERE role = 'student';
```

### История покупок
```sql
SELECT 
  p.purchased_at::DATE,
  pr.full_name,
  c.title,
  p.price_paid,
  p.status
FROM purchases p
JOIN profiles pr ON p.user_id = pr.id
JOIN certificates c ON p.certificate_id = c.id
ORDER BY p.purchased_at DESC;
```

### Транзакции студента
```sql
SELECT created_at, amount, reason, category
FROM cookie_transactions
WHERE user_id = (SELECT id FROM profiles WHERE full_name = 'Иван Иванов')
ORDER BY created_at DESC;
```

### Статистика по группам
```sql
SELECT 
  group_name,
  COUNT(*) as students,
  AVG(balance)::INT as avg_balance,
  SUM(balance) as total
FROM profiles
WHERE role = 'student'
GROUP BY group_name;
```

### Популярные сертификаты
```sql
SELECT 
  c.title,
  COUNT(p.id) as purchases,
  c.current_price,
  c.remaining_quantity
FROM certificates c
LEFT JOIN purchases p ON c.id = p.certificate_id
GROUP BY c.id
ORDER BY purchases DESC;
```

### Активные сертификаты студента
```sql
SELECT 
  c.title,
  p.price_paid,
  p.purchased_at::DATE as bought,
  p.expires_at::DATE as expires,
  p.status
FROM purchases p
JOIN certificates c ON p.certificate_id = c.id
WHERE p.user_id = (SELECT id FROM profiles WHERE full_name = 'Иван Иванов')
  AND p.status = 'active'
ORDER BY p.expires_at;
```

## User Metadata для копирования

### Студент
```json
{"full_name": "Имя Фамилия", "role": "student"}
```

### Админ
```json
{"full_name": "Администратор", "role": "admin"}
```

## Тестовые пользователи

| Email | Password | ФИО | Группа |
|-------|----------|-----|--------|
| ivan.ivanov@test.com | Test123! | Иван Иванов | ИВТ-401 |
| petr.petrov@test.com | Test123! | Пётр Петров | ИВТ-401 |
| sidor.sidorov@test.com | Test123! | Сидор Сидоров | ИВТ-401 |
| maria.kuznetsova@test.com | Test123! | Мария Кузнецова | ИВТ-402 |
| alex.smirnov@test.com | Test123! | Алексей Смирнов | ИВТ-402 |
| anna.popova@test.com | Test123! | Анна Попова | ПМИ-301 |
| dmitry.volkov@test.com | Test123! | Дмитрий Волков | ПМИ-301 |
| admin@test.com | Admin123! | Администратор | - |

## Примеры сертификатов

| Название | Цена | Инфляция | Кол-во | Срок |
|----------|------|----------|--------|------|
| Освобождение от экзамена | 100₵ | +10₵ | 3 шт | 30 дн |
| Автомат по предмету | 150₵ | +15₵ | 2 шт | 60 дн |
| Пересдача без штрафа | 50₵ | +5₵ | 10 шт | 60 дн |
| Дополнительное время | 30₵ | +3₵ | 20 шт | 14 дн |
| Подсказка преподавателя | 25₵ | +2₵ | ∞ | 7 дн |
| Бонусные баллы | 40₵ | +4₵ | 15 шт | 30 дн |
| Отсрочка сдачи | 20₵ | 0₵ | ∞ | 21 дн |
| Проверка наставником | 35₵ | +3₵ | ∞ | 14 дн |

₵ - печеньки  
∞ - безлимит

## Типы транзакций

| Category | Описание | Пример |
|----------|----------|--------|
| `daily_bonus` | Ежедневный бонус | +1₵ каждый день |
| `manual` | Ручное начисление админом | +50₵ за активность |
| `purchase` | Покупка в магазине | -100₵ купил сертификат |
| `random_bonus` | Случайный бонус | +5₵ выиграл в казино |
| `task_reward` | Награда за задание | +30₵ выполнил задание |

## Статусы покупки

| Status | Описание |
|--------|----------|
| `active` | ✅ Действует, можно использовать |
| `used` | ✓ Был использован |
| `expired` | ✗ Срок истёк |

## API Endpoints (для справки)

```
GET  /api/me                      - Профиль студента
GET  /api/me/transactions         - История транзакций
GET  /api/me/certificates         - Купленные сертификаты
POST /api/me/daily-bonus          - Получить ежедневный бонус

GET  /api/leaderboard             - Таблица лидеров

GET  /api/shop/certificates       - Каталог сертификатов
POST /api/shop/certificates/{id}/buy - Купить сертификат
```

## Файлы миграций

```
supabase/migrations/
├── full_migration.sql          - Полная структура БД
├── seed_data.sql               - Базовые тестовые данные (5 сертификатов)
├── seed_test_data.sql          - Расширенные данные (14 сертификатов)
├── quick_setup.sql             - ⭐ Быстрая настройка (рекомендуется)
├── user_metadata_templates.json - Шаблоны для создания пользователей
├── DATABASE_STRUCTURE.md       - Подробная структура БД
└── README_TEST_DATA.md         - Полное руководство
```

## Очистка данных

```sql
-- Удалить все покупки
TRUNCATE purchases CASCADE;

-- Удалить транзакции и обнулить балансы
TRUNCATE cookie_transactions CASCADE;
UPDATE profiles SET balance = 0 WHERE role = 'student';

-- Удалить сертификаты
TRUNCATE certificates CASCADE;

-- Удалить бонусы
TRUNCATE daily_bonuses CASCADE;
```

## Swagger документация

Откройте `backend/docs/swagger.yaml` в:
- Swagger UI: http://localhost:8080/docs (если запущен backend)
- Swagger Editor: https://editor.swagger.io/

## Проверка миграций

```bash
# Проверить статус миграций (если используете Supabase CLI)
supabase migration list

# Применить миграции
supabase db push

# Сбросить БД и применить заново
supabase db reset
```

## Связь с auth.users

При создании пользователя через Supabase Auth:
1. Создаётся запись в `auth.users`
2. Триггер `on_auth_user_created` автоматически создаёт `profiles`
3. Поля берутся из User Metadata:
   - `full_name` ← metadata.full_name
   - `role` ← metadata.role (по умолчанию 'student')

## Полезные ссылки

- 📁 Полная документация: `README_TEST_DATA.md`
- 🗺️ Структура БД: `DATABASE_STRUCTURE.md`
- 👤 Шаблоны пользователей: `user_metadata_templates.json`
- 🚀 Быстрая настройка: `quick_setup.sql`
- 📋 Swagger API: `backend/docs/swagger.yaml`
