-- ============================================
-- Расширенные тестовые данные для CookieLearn
-- Применять ПОСЛЕ основных миграций
-- ============================================

-- ВАЖНО: Сначала создайте пользователей через Supabase Auth UI:
-- 1. Перейдите в Authentication > Users
-- 2. Создайте пользователей с email и паролем
-- 3. В User Metadata добавьте поля:
--    - full_name: "Имя Фамилия"
--    - role: "student" или "admin"
-- 4. После создания скопируйте их UUID из таблицы profiles

-- ============================================
-- СЕРТИФИКАТЫ
-- ============================================

-- Очистка существующих тестовых данных (если нужно)
-- TRUNCATE certificates, purchases, cookie_transactions CASCADE;

INSERT INTO certificates (title, description, base_price, current_price, inflation_step, total_quantity, remaining_quantity, validity_days, is_active)
VALUES
  -- Премиум сертификаты (ограниченное количество)
  (
    'Освобождение от экзамена', 
    'Полное освобождение от одного экзамена по выбору. Выбор экзамена согласовывается с преподавателем.', 
    100, 100, 10, 3, 3, 30, true
  ),
  (
    'Автомат по предмету', 
    'Автоматическая оценка "отлично" по одному предмету', 
    150, 150, 15, 2, 2, 60, true
  ),
  (
    'VIP поддержка преподавателя', 
    'Личная консультация преподавателя 2 часа', 
    80, 80, 8, 5, 5, 14, true
  ),
  
  -- Популярные сертификаты
  (
    'Пересдача без штрафа', 
    'Одна бесплатная пересдача любого задания без снижения балла', 
    50, 50, 5, 10, 10, 60, true
  ),
  (
    'Дополнительное время', 
    '+30 минут ко времени сдачи экзамена или контрольной работы', 
    30, 30, 3, 20, 20, 14, true
  ),
  (
    'Бонусные баллы', 
    '+10 баллов к любой работе (максимальная оценка 100 баллов)', 
    40, 40, 4, 15, 15, 30, true
  ),
  
  -- Доступные сертификаты (безлимит)
  (
    'Подсказка преподавателя', 
    'Одна подсказка на экзамене или контрольной', 
    25, 25, 2, NULL, NULL, 7, true
  ),
  (
    'Отсрочка сдачи', 
    'Перенос срока сдачи работы на неделю без штрафа', 
    20, 20, 0, NULL, NULL, 21, true
  ),
  (
    'Проверка работы наставником', 
    'Предварительная проверка работы с обратной связью перед сдачей', 
    35, 35, 3, NULL, NULL, 14, true
  ),
  (
    'Материалы лекции', 
    'Доступ к расширенным материалам лекции с примерами', 
    15, 15, 0, NULL, NULL, NULL, true
  ),
  
  -- Развлекательные сертификаты
  (
    'Выбор темы проекта', 
    'Право выбрать тему курсового проекта из списка интересных вариантов', 
    45, 45, 5, 8, 8, 90, true
  ),
  (
    'Кофе с преподавателем', 
    'Неформальная встреча и обсуждение карьерных вопросов за чашкой кофе', 
    30, 30, 0, NULL, NULL, 30, true
  ),
  
  -- Специальные предложения
  (
    'Пакет "Студент"', 
    'Комплект: 2 подсказки + отсрочка сдачи + материалы лекции', 
    55, 55, 5, 12, 12, 45, true
  ),
  (
    'Пакет "Отличник"', 
    'Комплект: Пересдача без штрафа + Бонусные баллы + Дополнительное время', 
    110, 110, 10, 7, 7, 60, true
  );

-- ============================================
-- ПРИМЕРЫ ТЕСТОВЫХ ПРОФИЛЕЙ
-- ============================================

-- После создания пользователей через Supabase Auth,
-- можно обновить их группы следующим образом:

-- Пример обновления групп студентов (замените UUID на реальные)
/*
UPDATE profiles 
SET group_name = 'ИВТ-401'
WHERE id IN (
  'user-uuid-1',
  'user-uuid-2',
  'user-uuid-3'
);

UPDATE profiles 
SET group_name = 'ИВТ-402'
WHERE id IN (
  'user-uuid-4',
  'user-uuid-5'
);

UPDATE profiles 
SET group_name = 'ПМИ-301'
WHERE id IN (
  'user-uuid-6',
  'user-uuid-7'
);
*/

-- ============================================
-- НАЧИСЛЕНИЕ СТАРТОВЫХ ПЕЧЕНЕК
-- ============================================

-- Начислить приветственный бонус всем студентам
-- (замените на реальные UUID пользователей)
/*
INSERT INTO cookie_transactions (user_id, amount, reason, category)
SELECT 
  id,
  50,
  'Приветственный бонус',
  'manual'
FROM profiles
WHERE role = 'student';
*/

-- Начислить разные суммы конкретным студентам
/*
INSERT INTO cookie_transactions (user_id, amount, reason, category)
VALUES 
  ('student-uuid-1', 100, 'Приветственный бонус для тестирования', 'manual'),
  ('student-uuid-2', 75, 'Приветственный бонус', 'manual'),
  ('student-uuid-3', 50, 'Приветственный бонус', 'manual'),
  ('student-uuid-4', 200, 'Бонус за активное участие', 'task_reward'),
  ('student-uuid-5', 30, 'Приветственный бонус', 'manual');
*/

-- ============================================
-- СИМУЛЯЦИЯ ПОКУПОК (для тестирования истории)
-- ============================================

-- Создать несколько тестовых покупок
-- (замените на реальные UUID пользователей и сертификатов)
/*
DO $$
DECLARE
  student_id UUID := 'student-uuid-1';  -- UUID студента
  cert_id UUID;                          -- UUID сертификата
  cert_price INT;                        -- Текущая цена
BEGIN
  -- Покупка "Подсказка преподавателя"
  SELECT id, current_price INTO cert_id, cert_price
  FROM certificates 
  WHERE title = 'Подсказка преподавателя';
  
  -- Списываем деньги
  INSERT INTO cookie_transactions (user_id, amount, reason, category)
  VALUES (student_id, -cert_price, 'Покупка: Подсказка преподавателя', 'purchase');
  
  -- Создаём покупку
  INSERT INTO purchases (user_id, certificate_id, price_paid)
  VALUES (student_id, cert_id, cert_price);
  
  -- Обновляем цену сертификата (если есть инфляция)
  UPDATE certificates 
  SET current_price = current_price + inflation_step,
      remaining_quantity = CASE 
        WHEN remaining_quantity IS NOT NULL 
        THEN remaining_quantity - 1 
        ELSE NULL 
      END
  WHERE id = cert_id;
END $$;
*/

-- ============================================
-- СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ (референс)
-- ============================================

-- ВАЖНО: Создавайте пользователей через Supabase Auth UI!
-- Это просто референс для понимания структуры.

-- Пример данных для создания пользователей:
/*
Группа ИВТ-401:
  1. Email: ivanov@example.com, Password: Test123!, 
     Metadata: {"full_name": "Иван Иванов", "role": "student"}
  2. Email: petrov@example.com, Password: Test123!,
     Metadata: {"full_name": "Пётр Петров", "role": "student"}
  3. Email: sidorov@example.com, Password: Test123!,
     Metadata: {"full_name": "Сидор Сидоров", "role": "student"}

Группа ИВТ-402:
  1. Email: kuznetsova@example.com, Password: Test123!,
     Metadata: {"full_name": "Мария Кузнецова", "role": "student"}
  2. Email: smirnov@example.com, Password: Test123!,
     Metadata: {"full_name": "Алексей Смирнов", "role": "student"}

Группа ПМИ-301:
  1. Email: popova@example.com, Password: Test123!,
     Metadata: {"full_name": "Анна Попова", "role": "student"}
  2. Email: volkov@example.com, Password: Test123!,
     Metadata: {"full_name": "Дмитрий Волков", "role": "student"}

Администратор:
  Email: admin@example.com, Password: Admin123!,
  Metadata: {"full_name": "Администратор", "role": "admin"}
*/

-- ============================================
-- БЫСТРЫЙ СПОСОБ ДОБАВИТЬ ТЕСТОВЫХ СТУДЕНТОВ
-- ============================================

-- После создания пользователей через Auth UI, выполните:
/*
-- 1. Посмотреть всех созданных пользователей
SELECT id, email, raw_user_meta_data->>'full_name' as name 
FROM auth.users 
ORDER BY created_at DESC;

-- 2. Обновить группы
UPDATE profiles SET group_name = 'ИВТ-401' WHERE full_name IN ('Иван Иванов', 'Пётр Петров', 'Сидор Сидоров');
UPDATE profiles SET group_name = 'ИВТ-402' WHERE full_name IN ('Мария Кузнецова', 'Алексей Смирнов');
UPDATE profiles SET group_name = 'ПМИ-301' WHERE full_name IN ('Анна Попова', 'Дмитрий Волков');

-- 3. Начислить всем по 100 печенек
INSERT INTO cookie_transactions (user_id, amount, reason, category)
SELECT id, 100, 'Стартовый бонус', 'manual'
FROM profiles WHERE role = 'student';

-- 4. Проверить балансы
SELECT full_name, group_name, balance FROM profiles WHERE role = 'student' ORDER BY group_name, full_name;
*/

-- ============================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ ДЛЯ ПРОВЕРКИ
-- ============================================

-- Посмотреть все сертификаты с остатками
-- SELECT title, current_price, remaining_quantity, is_active FROM certificates ORDER BY current_price;

-- Посмотреть топ студентов по балансу
-- SELECT full_name, group_name, balance FROM profiles WHERE role = 'student' ORDER BY balance DESC LIMIT 10;

-- Посмотреть историю покупок с деталями
-- SELECT p.purchased_at, pr.full_name, pr.group_name, c.title, p.price_paid, p.status
-- FROM purchases p
-- JOIN profiles pr ON p.user_id = pr.id
-- JOIN certificates c ON p.certificate_id = c.id
-- ORDER BY p.purchased_at DESC;

-- Посмотреть транзакции студента
-- SELECT created_at, amount, reason, category 
-- FROM cookie_transactions 
-- WHERE user_id = 'student-uuid'
-- ORDER BY created_at DESC;
