# SQL Миграции CookieLearn

## Порядок применения

Миграции применяются в порядке номеров:

1. **001_profiles.sql** - Профили пользователей
2. **002_transactions.sql** - Транзакции печенек
3. **003_certificates.sql** - Каталог сертификатов
4. **004_purchases.sql** - Покупки
5. **005_daily_bonuses.sql** - Ежедневные бонусы
6. **006_tasks.sql** - Задания и голосования
7. **007_rls_policies.sql** - Политики безопасности (RLS)

## Как применить миграции

### Вариант 1: Через Supabase Dashboard

1. Откройте ваш проект на https://supabase.com/dashboard
2. Перейдите в раздел **SQL Editor**
3. Скопируйте содержимое каждого файла по порядку
4. Выполните SQL запросы

### Вариант 2: Через SQL Editor (рекомендуется)

Откройте SQL Editor в Supabase Dashboard и выполните все миграции одним скриптом:

```sql
-- Скопируйте сюда содержимое всех файлов по порядку
-- 001_profiles.sql
-- 002_transactions.sql
-- 003_certificates.sql
-- 004_purchases.sql
-- 005_daily_bonuses.sql
-- 006_tasks.sql
-- 007_rls_policies.sql
```

## Проверка

После применения всех миграций выполните:

```sql
-- Проверка созданных таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Должны быть:
-- profiles
-- cookie_transactions
-- certificates
-- purchases
-- daily_bonuses
-- tasks
-- votes
```

## Тестовые данные

После применения миграций можно создать тестового админа через Supabase Auth Dashboard:
- Email: admin@cookielearn.ru
- В метаданных пользователя добавить: `{ "role": "admin", "full_name": "Администратор" }`
