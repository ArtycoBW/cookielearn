-- Включаем RLS на всех таблицах
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES: политики доступа
-- ============================================

-- Все могут читать базовую информацию для лидерборда
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Пользователи могут обновлять только свой профиль
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Только админы могут создавать профили
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Только админы могут удалять профили
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- COOKIE_TRANSACTIONS: политики доступа
-- ============================================

-- Пользователи видят только свои транзакции
CREATE POLICY "Users can view own transactions"
  ON cookie_transactions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Только админы могут создавать транзакции
CREATE POLICY "Admins can create transactions"
  ON cookie_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- CERTIFICATES: политики доступа
-- ============================================

-- Все могут читать активные сертификаты
CREATE POLICY "Anyone can view active certificates"
  ON certificates FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Только админы управляют сертификатами
CREATE POLICY "Admins can manage certificates"
  ON certificates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- PURCHASES: политики доступа
-- ============================================

-- Пользователи видят только свои покупки
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Пользователи могут покупать (создание через триггер)
CREATE POLICY "Users can create own purchases"
  ON purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять статус своих покупок
CREATE POLICY "Users can update own purchases"
  ON purchases FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- DAILY_BONUSES: политики доступа
-- ============================================

-- Пользователи видят только свои бонусы
CREATE POLICY "Users can view own bonuses"
  ON daily_bonuses FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Пользователи могут создавать свои бонусы
CREATE POLICY "Users can claim own daily bonus"
  ON daily_bonuses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TASKS: политики доступа
-- ============================================

-- Все могут читать активные задания
CREATE POLICY "Anyone can view active tasks"
  ON tasks FOR SELECT
  USING (
    status = 'active' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Только админы управляют заданиями
CREATE POLICY "Admins can manage tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- VOTES: политики доступа
-- ============================================

-- Пользователи видят голоса в своих заданиях
CREATE POLICY "Users can view votes in active tasks"
  ON votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_id AND status = 'active'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Пользователи могут голосовать
CREATE POLICY "Users can vote"
  ON votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_id AND status = 'active'
    )
  );

-- Пользователи могут удалять свои голоса
CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_id AND status = 'active'
    )
  );

-- Комментарий
COMMENT ON POLICY "Public profiles are viewable by everyone" ON profiles IS 'Профили доступны всем для лидерборда';
