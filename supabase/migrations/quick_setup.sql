-- ============================================
-- БЫСТРАЯ НАСТРОЙКА ТЕСТОВЫХ ДАННЫХ
-- ============================================
-- Этот файл содержит готовые команды для быстрого добавления
-- тестовых данных после создания пользователей через Auth UI

-- ============================================
-- ШАГ 1: ДОБАВЛЯЕМ СЕРТИФИКАТЫ
-- ============================================

INSERT INTO certificates (title, description, base_price, current_price, inflation_step, total_quantity, remaining_quantity, validity_days, is_active)
VALUES
  ('Освобождение от экзамена', 'Полное освобождение от одного экзамена по выбору', 100, 100, 10, 3, 3, 30, true),
  ('Автомат по предмету', 'Автоматическая оценка "отлично" по одному предмету', 150, 150, 15, 2, 2, 60, true),
  ('Пересдача без штрафа', 'Одна бесплатная пересдача любого задания', 50, 50, 5, 10, 10, 60, true),
  ('Дополнительное время', '+30 минут ко времени сдачи экзамена', 30, 30, 3, 20, 20, 14, true),
  ('Подсказка преподавателя', 'Одна подсказка на экзамене', 25, 25, 2, NULL, NULL, 7, true),
  ('Бонусные баллы', '+10 баллов к любой работе', 40, 40, 4, 15, 15, 30, true),
  ('Отсрочка сдачи', 'Перенос срока сдачи на неделю', 20, 20, 0, NULL, NULL, 21, true),
  ('Проверка наставником', 'Предварительная проверка работы', 35, 35, 3, NULL, NULL, 14, true);

-- ============================================
-- ШАГ 2: СОЗДАТЬ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================
-- Перейдите в Supabase Dashboard > Authentication > Users
-- Нажмите "Add user" и создайте пользователей со следующими данными:

/*
СТУДЕНТЫ ГРУППЫ ИВТ-401:

1. Email: ivan.ivanov@test.com
   Password: Test123!
   User Metadata (JSON):
   {
     "full_name": "Иван Иванов",
     "role": "student"
   }

2. Email: petr.petrov@test.com
   Password: Test123!
   User Metadata:
   {
     "full_name": "Пётр Петров",
     "role": "student"
   }

3. Email: sidor.sidorov@test.com
   Password: Test123!
   User Metadata:
   {
     "full_name": "Сидор Сидоров",
     "role": "student"
   }

СТУДЕНТЫ ГРУППЫ ИВТ-402:

4. Email: maria.kuznetsova@test.com
   Password: Test123!
   User Metadata:
   {
     "full_name": "Мария Кузнецова",
     "role": "student"
   }

5. Email: alex.smirnov@test.com
   Password: Test123!
   User Metadata:
   {
     "full_name": "Алексей Смирнов",
     "role": "student"
   }

СТУДЕНТЫ ГРУППЫ ПМИ-301:

6. Email: anna.popova@test.com
   Password: Test123!
   User Metadata:
   {
     "full_name": "Анна Попова",
     "role": "student"
   }

7. Email: dmitry.volkov@test.com
   Password: Test123!
   User Metadata:
   {
     "full_name": "Дмитрий Волков",
     "role": "student"
   }

АДМИНИСТРАТОР:

8. Email: admin@test.com
   Password: Admin123!
   User Metadata:
   {
     "full_name": "Администратор Системы",
     "role": "admin"
   }
*/

-- ============================================
-- ШАГ 3: ПРОВЕРИТЬ СОЗДАННЫХ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

-- Посмотреть список всех пользователей
SELECT 
  p.id,
  p.full_name,
  p.group_name,
  p.role,
  p.balance,
  au.email
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.role DESC, p.full_name;

-- ============================================
-- ШАГ 4: НАЗНАЧИТЬ ГРУППЫ СТУДЕНТАМ
-- ============================================

-- Назначаем группы по именам студентов
UPDATE profiles SET group_name = 'ИВТ-401' 
WHERE full_name IN ('Иван Иванов', 'Пётр Петров', 'Сидор Сидоров');

UPDATE profiles SET group_name = 'ИВТ-402' 
WHERE full_name IN ('Мария Кузнецова', 'Алексей Смирнов');

UPDATE profiles SET group_name = 'ПМИ-301' 
WHERE full_name IN ('Анна Попова', 'Дмитрий Волков');

-- Проверяем результат
SELECT full_name, group_name, role, balance 
FROM profiles 
ORDER BY group_name, full_name;

-- ============================================
-- ШАГ 5: НАЧИСЛИТЬ СТАРТОВЫЕ ПЕЧЕНЬКИ
-- ============================================

-- Начислить всем студентам по 100 печенек
INSERT INTO cookie_transactions (user_id, amount, reason, category)
SELECT 
  id,
  100,
  'Приветственный бонус',
  'manual'
FROM profiles
WHERE role = 'student';

-- Дополнительно начислить некоторым студентам для разнообразия
INSERT INTO cookie_transactions (user_id, amount, reason, category)
SELECT 
  id,
  50,
  'Бонус за раннюю регистрацию',
  'manual'
FROM profiles
WHERE full_name IN ('Иван Иванов', 'Мария Кузнецова', 'Анна Попова');

-- Начислить бонус за задание
INSERT INTO cookie_transactions (user_id, amount, reason, category)
SELECT 
  id,
  30,
  'Награда за выполнение вводного задания',
  'task_reward'
FROM profiles
WHERE full_name IN ('Пётр Петров', 'Дмитрий Волков');

-- Проверяем балансы
SELECT 
  full_name, 
  group_name, 
  balance,
  (SELECT COUNT(*) FROM cookie_transactions WHERE user_id = profiles.id) as transactions_count
FROM profiles 
WHERE role = 'student'
ORDER BY balance DESC;

-- ============================================
-- ШАГ 6: СОЗДАТЬ ТЕСТОВЫЕ ПОКУПКИ
-- ============================================

-- Функция для покупки сертификата
DO $$
DECLARE
  student_record RECORD;
  cert_record RECORD;
BEGIN
  -- Иван покупает "Подсказка преподавателя"
  SELECT * INTO student_record FROM profiles WHERE full_name = 'Иван Иванов';
  SELECT * INTO cert_record FROM certificates WHERE title = 'Подсказка преподавателя';
  
  IF student_record.id IS NOT NULL AND cert_record.id IS NOT NULL THEN
    -- Списываем деньги
    INSERT INTO cookie_transactions (user_id, amount, reason, category)
    VALUES (student_record.id, -cert_record.current_price, 'Покупка: ' || cert_record.title, 'purchase');
    
    -- Создаём покупку
    INSERT INTO purchases (user_id, certificate_id, price_paid, status)
    VALUES (student_record.id, cert_record.id, cert_record.current_price, 'active');
    
    RAISE NOTICE 'Покупка создана для %', student_record.full_name;
  END IF;

  -- Мария покупает "Дополнительное время"
  SELECT * INTO student_record FROM profiles WHERE full_name = 'Мария Кузнецова';
  SELECT * INTO cert_record FROM certificates WHERE title = 'Дополнительное время';
  
  IF student_record.id IS NOT NULL AND cert_record.id IS NOT NULL THEN
    INSERT INTO cookie_transactions (user_id, amount, reason, category)
    VALUES (student_record.id, -cert_record.current_price, 'Покупка: ' || cert_record.title, 'purchase');
    
    INSERT INTO purchases (user_id, certificate_id, price_paid, status)
    VALUES (student_record.id, cert_record.id, cert_record.current_price, 'active');
    
    RAISE NOTICE 'Покупка создана для %', student_record.full_name;
  END IF;

  -- Анна покупает "Бонусные баллы" (и использует сразу)
  SELECT * INTO student_record FROM profiles WHERE full_name = 'Анна Попова';
  SELECT * INTO cert_record FROM certificates WHERE title = 'Бонусные баллы';
  
  IF student_record.id IS NOT NULL AND cert_record.id IS NOT NULL THEN
    INSERT INTO cookie_transactions (user_id, amount, reason, category)
    VALUES (student_record.id, -cert_record.current_price, 'Покупка: ' || cert_record.title, 'purchase');
    
    INSERT INTO purchases (user_id, certificate_id, price_paid, status, used_at)
    VALUES (student_record.id, cert_record.id, cert_record.current_price, 'used', NOW());
    
    RAISE NOTICE 'Покупка создана и использована для %', student_record.full_name;
  END IF;
END $$;

-- ============================================
-- ШАГ 7: СОЗДАТЬ ЕЖЕДНЕВНЫЕ БОНУСЫ
-- ============================================

-- Симулируем что некоторые студенты получили бонусы сегодня
INSERT INTO daily_bonuses (user_id, awarded_at)
SELECT 
  id,
  CURRENT_DATE
FROM profiles
WHERE full_name IN ('Иван Иванов', 'Пётр Петров', 'Мария Кузнецова')
AND role = 'student';

-- Начисляем по 1 печеньке за ежедневный бонус
INSERT INTO cookie_transactions (user_id, amount, reason, category)
SELECT 
  id,
  1,
  'Ежедневный бонус',
  'daily_bonus'
FROM profiles
WHERE full_name IN ('Иван Иванов', 'Пётр Петров', 'Мария Кузнецова')
AND role = 'student';

-- ============================================
-- ПРОВЕРКА ДАННЫХ
-- ============================================

-- Таблица лидеров
SELECT 
  ROW_NUMBER() OVER (ORDER BY balance DESC) as rank,
  full_name,
  group_name,
  balance
FROM profiles
WHERE role = 'student'
ORDER BY balance DESC;

-- История покупок
SELECT 
  p.purchased_at,
  pr.full_name,
  pr.group_name,
  c.title,
  p.price_paid,
  p.status,
  p.expires_at,
  p.used_at
FROM purchases p
JOIN profiles pr ON p.user_id = pr.id
JOIN certificates c ON p.certificate_id = c.id
ORDER BY p.purchased_at DESC;

-- История транзакций
SELECT 
  ct.created_at,
  p.full_name,
  p.group_name,
  ct.amount,
  ct.reason,
  ct.category
FROM cookie_transactions ct
JOIN profiles p ON ct.user_id = p.id
ORDER BY ct.created_at DESC
LIMIT 20;

-- Статистика по сертификатам
SELECT 
  title,
  base_price,
  current_price,
  remaining_quantity,
  (SELECT COUNT(*) FROM purchases WHERE certificate_id = certificates.id) as times_purchased,
  is_active
FROM certificates
ORDER BY times_purchased DESC, current_price;

-- Кто получил бонус сегодня
SELECT 
  p.full_name,
  p.group_name,
  db.awarded_at
FROM daily_bonuses db
JOIN profiles p ON db.user_id = p.id
WHERE db.awarded_at = CURRENT_DATE
ORDER BY p.full_name;

-- ============================================
-- ДОПОЛНИТЕЛЬНЫЕ ПОЛЕЗНЫЕ ЗАПРОСЫ
-- ============================================

-- Посмотреть детальную информацию о студенте
/*
SELECT 
  p.full_name,
  p.group_name,
  p.balance,
  p.created_at as registered_at,
  p.last_login_at,
  (SELECT COUNT(*) FROM cookie_transactions WHERE user_id = p.id) as total_transactions,
  (SELECT COUNT(*) FROM purchases WHERE user_id = p.id) as total_purchases,
  (SELECT COUNT(*) FROM daily_bonuses WHERE user_id = p.id) as daily_bonuses_claimed
FROM profiles p
WHERE p.full_name = 'Иван Иванов';
*/

-- Статистика по группам
/*
SELECT 
  group_name,
  COUNT(*) as students_count,
  AVG(balance)::INT as avg_balance,
  MAX(balance) as max_balance,
  MIN(balance) as min_balance,
  SUM(balance) as total_balance
FROM profiles
WHERE role = 'student'
GROUP BY group_name
ORDER BY avg_balance DESC;
*/

-- Самые популярные сертификаты
/*
SELECT 
  c.title,
  COUNT(p.id) as purchase_count,
  c.current_price,
  c.base_price,
  (c.current_price - c.base_price) as price_increase
FROM certificates c
LEFT JOIN purchases p ON c.id = p.certificate_id
GROUP BY c.id, c.title, c.current_price, c.base_price
ORDER BY purchase_count DESC;
*/
