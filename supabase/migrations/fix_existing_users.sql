-- =====================================================
-- FIX EXISTING USERS WITHOUT PROFILES
-- =====================================================
-- Этот скрипт исправляет ситуацию, когда пользователи существуют
-- в auth.users, но не имеют соответствующих записей в public.profiles
-- =====================================================

-- Шаг 1: Проверяем пользователей без профилей
DO $$
DECLARE
    missing_profiles_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO missing_profiles_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;

    RAISE NOTICE 'Найдено пользователей без профилей: %', missing_profiles_count;
END $$;

-- Шаг 2: Создаем профили для пользователей без них
INSERT INTO public.profiles (
    id,
    full_name,
    role,
    balance,
    group_name,
    created_at
)
SELECT
    u.id,
    -- Извлекаем full_name из raw_user_meta_data, если нет - используем email
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        SPLIT_PART(u.email, '@', 1)
    ) AS full_name,
    -- Извлекаем role из raw_user_meta_data, если нет - устанавливаем 'student'
    COALESCE(
        u.raw_user_meta_data->>'role',
        'student'
    ) AS role,
    -- Устанавливаем начальный баланс
    0 AS balance,
    -- Группа по умолчанию NULL
    u.raw_user_meta_data->>'group_name' AS group_name,
    -- Timestamp создания
    NOW() AS created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Шаг 3: Проверяем результат
DO $$
DECLARE
    fixed_count INTEGER;
    remaining_count INTEGER;
BEGIN
    -- Считаем сколько профилей создали
    SELECT COUNT(*)
    INTO fixed_count
    FROM public.profiles
    WHERE created_at >= NOW() - INTERVAL '1 minute';

    -- Проверяем остались ли пользователи без профилей
    SELECT COUNT(*)
    INTO remaining_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;

    RAISE NOTICE 'Создано профилей: %', fixed_count;
    RAISE NOTICE 'Осталось пользователей без профилей: %', remaining_count;
END $$;

-- =====================================================
-- ПРИМЕРЫ ПРАВИЛЬНОГО СОЗДАНИЯ ПОЛЬЗОВАТЕЛЕЙ
-- =====================================================

/*
ВАЖНО: При создании пользователей через Supabase Dashboard
необходимо правильно заполнить поле "User Metadata".

┌─────────────────────────────────────────────────────┐
│ ВАРИАНТ 1: Создание студента                         │
└─────────────────────────────────────────────────────┘

Email: student@example.com
Password: SecurePass123!
User Metadata (JSON):
{
  "full_name": "Иван Иванов",
  "role": "student",
  "group_name": "ИС-301"
}

┌─────────────────────────────────────────────────────┐
│ ВАРИАНТ 2: Создание преподавателя                    │
└─────────────────────────────────────────────────────┘

Email: teacher@example.com
Password: SecurePass123!
User Metadata (JSON):
{
  "full_name": "Петр Петров",
  "role": "teacher"
}

┌─────────────────────────────────────────────────────┐
│ ВАРИАНТ 3: Создание администратора                   │
└─────────────────────────────────────────────────────┘

Email: admin@example.com
Password: SecurePass123!
User Metadata (JSON):
{
  "full_name": "Администратор Системы",
  "role": "admin"
}

┌─────────────────────────────────────────────────────┐
│ МИНИМАЛЬНЫЙ ВАРИАНТ (только обязательные поля)       │
└─────────────────────────────────────────────────────┘

Email: user@example.com
Password: SecurePass123!
User Metadata (JSON):
{
  "full_name": "Новый Пользователь"
}

Примечание: если role не указан, автоматически установится 'student'

┌─────────────────────────────────────────────────────┐
│ ЧТО ПРОИСХОДИТ АВТОМАТИЧЕСКИ                         │
└─────────────────────────────────────────────────────┘

После создания пользователя в auth.users:

1. Триггер create_profile_for_user автоматически создаст запись в profiles
2. Если full_name не указан - будет использован email
3. Если role не указан - будет установлен 'student'
4. balance автоматически установится в 0
5. group_name будет NULL (можно обновить позже)

┌─────────────────────────────────────────────────────┐
│ ПРОВЕРКА ПОСЛЕ СОЗДАНИЯ                              │
└─────────────────────────────────────────────────────┘

-- Проверить создание профиля
SELECT
    u.email,
    p.full_name,
    p.role,
    p.balance,
    p.group_name,
    p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'новый_email@example.com';

-- Если профиль не создался, можно создать вручную:
INSERT INTO public.profiles (id, full_name, role, balance)
SELECT
    id,
    COALESCE(raw_user_meta_data->>'full_name', email),
    COALESCE(raw_user_meta_data->>'role', 'student'),
    0
FROM auth.users
WHERE email = 'новый_email@example.com'
ON CONFLICT (id) DO NOTHING;

┌─────────────────────────────────────────────────────┐
│ РАСПРОСТРАНЕННЫЕ ОШИБКИ                              │
└─────────────────────────────────────────────────────┘

❌ НЕПРАВИЛЬНО: Оставить User Metadata пустым
   Результат: профиль создастся с email вместо имени

❌ НЕПРАВИЛЬНО: Указать неверный формат JSON
   {full_name: "Имя"}  // без кавычек у ключа
   Результат: ошибка создания пользователя

❌ НЕПРАВИЛЬНО: Указать неверную роль
   {"role": "superuser"}  // такой роли нет
   Результат: ошибка триггера (допустимы: student, teacher, admin)

✅ ПРАВИЛЬНО: Минимальный корректный JSON
   {"full_name": "Имя Фамилия"}

✅ ПРАВИЛЬНО: Полный корректный JSON
   {
     "full_name": "Имя Фамилия",
     "role": "student",
     "group_name": "ИС-301"
   }
*/

-- =====================================================
-- ДОПОЛНИТЕЛЬНЫЕ ПОЛЕЗНЫЕ КОМАНДЫ
-- =====================================================

-- Список всех пользователей с профилями
-- SELECT
--     u.email,
--     u.created_at as user_created,
--     p.full_name,
--     p.role,
--     p.balance,
--     p.group_name,
--     p.created_at as profile_created
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON u.id = p.id
-- ORDER BY u.created_at DESC;

-- Найти пользователей без профилей
-- SELECT
--     u.id,
--     u.email,
--     u.raw_user_meta_data
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON u.id = p.id
-- WHERE p.id IS NULL;

-- Обновить группу для студента
-- UPDATE public.profiles
-- SET group_name = 'ИС-301'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'student@example.com');

-- Обновить баланс для студента
-- UPDATE public.profiles
-- SET balance = 100
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'student@example.com');
