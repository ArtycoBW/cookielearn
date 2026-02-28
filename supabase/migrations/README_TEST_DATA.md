# Тестовые данные для CookieLearn

Руководство по добавлению тестовых данных в базу данных.

## Структура Purchase (Покупка сертификата)

```typescript
interface Purchase {
  id: string                     // UUID покупки
  user_id: string                // UUID студента
  certificate_id: string         // UUID сертификата
  price_paid: number             // Цена на момент покупки
  purchased_at: string           // Дата и время покупки
  expires_at?: string            // Дата истечения (вычисляется автоматически)
  used_at?: string               // Дата использования
  status: 'active' | 'used' | 'expired'
  certificate?: Certificate      // Связанный объект сертификата
}
```

### Как работает система покупок

1. **При покупке сертификата**:
   - Списываются печеньки через `cookie_transactions` (сумма с минусом)
   - Создаётся запись в `purchases` с текущей ценой сертификата
   - Автоматически вычисляется `expires_at` на основе `validity_days` сертификата
   - Если у сертификата есть `inflation_step`, цена увеличивается для следующей покупки
   - Если есть `remaining_quantity`, она уменьшается на 1

2. **Статусы покупки**:
   - `active` - сертификат действителен, можно использовать
   - `used` - сертификат был использован (поле `used_at` заполнено)
   - `expired` - срок действия истёк (автоматически при `expires_at < NOW()`)

## Быстрый старт

### Шаг 1: Применить основную миграцию

```sql
-- В Supabase Dashboard > SQL Editor
-- Выполните файл: full_migration.sql
```

### Шаг 2: Создать тестовых пользователей

В Supabase Dashboard > Authentication > Users нажмите "Add user":

**Студенты группы ИВТ-401:**
```
Email: ivan.ivanov@test.com
Password: Test123!
User Metadata:
{
  "full_name": "Иван Иванов",
  "role": "student"
}
```

Повторите для:
- petr.petrov@test.com (Пётр Петров)
- sidor.sidorov@test.com (Сидор Сидоров)

**Студенты группы ИВТ-402:**
- maria.kuznetsova@test.com (Мария Кузнецова)
- alex.smirnov@test.com (Алексей Смирнов)

**Студенты группы ПМИ-301:**
- anna.popova@test.com (Анна Попова)
- dmitry.volkov@test.com (Дмитрий Волков)

**Администратор:**
```
Email: admin@test.com
Password: Admin123!
User Metadata:
{
  "full_name": "Администратор Системы",
  "role": "admin"
}
```

### Шаг 3: Выполнить скрипт быстрой настройки

```sql
-- В SQL Editor выполните файл: quick_setup.sql
-- Этот скрипт:
-- ✓ Добавит 8 разнообразных сертификатов
-- ✓ Назначит группы студентам
-- ✓ Начислит стартовые печеньки (100-180 штук)
-- ✓ Создаст несколько тестовых покупок
-- ✓ Добавит ежедневные бонусы
```

## Файлы тестовых данных

### `seed_data.sql` (базовый)
- 5 базовых сертификатов
- Комментарии с примерами

### `seed_test_data.sql` (расширенный)
- 14 разнообразных сертификатов
- Подробные примеры и комментарии
- Референс для создания пользователей

### `quick_setup.sql` (быстрая настройка)
- Готовый скрипт для запуска одной командой
- Создаёт полный набор тестовых данных
- Включает проверочные запросы

## Примеры сертификатов

| Название | Цена | Инфляция | Количество | Срок |
|----------|------|----------|------------|------|
| Освобождение от экзамена | 100 | +10 | 3 шт | 30 дней |
| Автомат по предмету | 150 | +15 | 2 шт | 60 дней |
| Пересдача без штрафа | 50 | +5 | 10 шт | 60 дней |
| Подсказка преподавателя | 25 | +2 | безлимит | 7 дней |
| Отсрочка сдачи | 20 | 0 | безлимит | 21 день |

**Инфляция**: цена увеличивается после каждой покупки  
**Количество**: NULL = безлимитный товар  
**Срок**: срок действия после покупки (NULL = бессрочный)

## Полезные запросы

### Посмотреть таблицу лидеров
```sql
SELECT 
  ROW_NUMBER() OVER (ORDER BY balance DESC) as rank,
  full_name,
  group_name,
  balance
FROM profiles
WHERE role = 'student'
ORDER BY balance DESC;
```

### Посмотреть покупки с деталями
```sql
SELECT 
  p.purchased_at::DATE as date,
  pr.full_name,
  pr.group_name,
  c.title as certificate,
  p.price_paid,
  p.status,
  p.expires_at::DATE as expires
FROM purchases p
JOIN profiles pr ON p.user_id = pr.id
JOIN certificates c ON p.certificate_id = c.id
ORDER BY p.purchased_at DESC;
```

### Транзакции студента
```sql
SELECT 
  created_at::DATE as date,
  amount,
  reason,
  category,
  (SELECT balance FROM profiles WHERE id = cookie_transactions.user_id) as current_balance
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
  MAX(balance) as top_student,
  SUM(balance) as total
FROM profiles
WHERE role = 'student'
GROUP BY group_name
ORDER BY avg_balance DESC;
```

## Добавление данных через миграции

Можно создать новую миграцию для автоматического добавления данных:

```bash
# В директории проекта
cd supabase
supabase migration new add_test_certificates

# Отредактируйте созданный файл в migrations/
# Добавьте INSERT запросы
```

Или выполните напрямую через SQL Editor в Supabase Dashboard.

## Структура таблиц

### certificates
```sql
- id (UUID)
- title (TEXT) - название
- description (TEXT) - описание
- base_price (INT) - базовая цена
- current_price (INT) - текущая цена
- inflation_step (INT) - шаг инфляции
- total_quantity (INT, nullable) - всего штук
- remaining_quantity (INT, nullable) - осталось
- validity_days (INT, nullable) - срок действия
- is_active (BOOLEAN) - активен ли
- created_at, updated_at (TIMESTAMPTZ)
```

### profiles
```sql
- id (UUID) - связь с auth.users
- full_name (TEXT) - ФИО
- group_name (TEXT, nullable) - группа
- role (TEXT) - 'student' | 'admin'
- balance (INT) - баланс печенек
- created_at, last_login_at (TIMESTAMPTZ)
```

### purchases
```sql
- id (UUID)
- user_id (UUID) - студент
- certificate_id (UUID) - сертификат
- price_paid (INT) - цена покупки
- purchased_at (TIMESTAMPTZ) - дата покупки
- expires_at (TIMESTAMPTZ, nullable) - истекает
- used_at (TIMESTAMPTZ, nullable) - использован
- status (TEXT) - 'active' | 'used' | 'expired'
```

### cookie_transactions
```sql
- id (UUID)
- user_id (UUID) - студент
- amount (INT) - сумма (+ или -)
- reason (TEXT) - описание
- category (TEXT) - категория
- created_by (UUID, nullable) - кто создал
- created_at (TIMESTAMPTZ)
```

## Триггеры и автоматика

1. **При создании пользователя** (`on_auth_user_created`):
   - Автоматически создаётся профиль в таблице `profiles`
   - Берётся `full_name` и `role` из User Metadata

2. **При создании транзакции** (`on_transaction_created`):
   - Автоматически обновляется `balance` в профиле
   - Проверяется что баланс не стал отрицательным

3. **При создании покупки** (`on_purchase_set_expiry`):
   - Автоматически вычисляется `expires_at` на основе `validity_days`

4. **При обновлении сертификата** (`update_certificates_updated_at`):
   - Автоматически обновляется поле `updated_at`

## Тестирование API

После добавления данных можно тестировать через:

1. **Swagger UI**: http://localhost:8080/docs
2. **Postman/Insomnia**: используйте `backend/docs/swagger.yaml`
3. **curl**:
```bash
# Получить токен (через Supabase Auth)
# Затем использовать в запросах

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/me

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/shop/certificates
```

## Очистка данных

Для полной очистки и пересоздания:

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

-- Затем заново выполните quick_setup.sql
```

## Полезные ссылки

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Документация Supabase](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
