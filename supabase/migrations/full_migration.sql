-- ============================================
-- CookieLearn Database Migration
-- Применить в SQL Editor на https://supabase.com/dashboard
-- ============================================

-- 001: PROFILES
-- Профили пользователей (расширение Supabase Auth)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  group_name    TEXT,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  balance       INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_group ON profiles(group_name);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 002: TRANSACTIONS
CREATE TABLE cookie_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      INT NOT NULL,
  reason      TEXT NOT NULL,
  category    TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON cookie_transactions(user_id);
CREATE INDEX idx_transactions_created_at ON cookie_transactions(created_at DESC);
CREATE INDEX idx_transactions_category ON cookie_transactions(category);

CREATE OR REPLACE FUNCTION update_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET balance = balance + NEW.amount
  WHERE id = NEW.user_id;
  
  IF (SELECT balance FROM profiles WHERE id = NEW.user_id) < 0 THEN
    RAISE EXCEPTION 'Недостаточно печенек для выполнения операции';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_transaction_created
  AFTER INSERT ON cookie_transactions
  FOR EACH ROW EXECUTE FUNCTION update_balance_on_transaction();

-- 003: CERTIFICATES
CREATE TABLE certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT,
  base_price         INT NOT NULL CHECK (base_price > 0),
  current_price      INT NOT NULL CHECK (current_price > 0),
  inflation_step     INT NOT NULL DEFAULT 0,
  total_quantity     INT,
  remaining_quantity INT,
  validity_days      INT,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_certificates_active ON certificates(is_active);
CREATE INDEX idx_certificates_price ON certificates(current_price);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 004: PURCHASES
CREATE TABLE purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE RESTRICT,
  price_paid     INT NOT NULL CHECK (price_paid > 0),
  purchased_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ,
  used_at        TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired'))
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_certificate_id ON purchases(certificate_id);
CREATE INDEX idx_purchases_expires_at ON purchases(expires_at);

CREATE OR REPLACE FUNCTION set_purchase_expiry()
RETURNS TRIGGER AS $$
DECLARE
  cert_validity INT;
BEGIN
  SELECT validity_days INTO cert_validity
  FROM certificates
  WHERE id = NEW.certificate_id;
  
  IF cert_validity IS NOT NULL THEN
    NEW.expires_at := NEW.purchased_at + (cert_validity || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_purchase_set_expiry
  BEFORE INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION set_purchase_expiry();

-- 005: DAILY BONUSES
CREATE TABLE daily_bonuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  awarded_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, awarded_at)
);

CREATE INDEX idx_daily_bonuses_user_id ON daily_bonuses(user_id);
CREATE INDEX idx_daily_bonuses_awarded_at ON daily_bonuses(awarded_at DESC);

-- 006: TASKS & VOTES
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'vote' CHECK (type IN ('vote', 'quiz', 'activity')),
  reward      INT NOT NULL DEFAULT 1 CHECK (reward > 0),
  deadline    TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  closed_at   TIMESTAMPTZ
);

CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nominee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, voter_id),
  CHECK (voter_id != nominee_id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_votes_task_id ON votes(task_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_nominee_id ON votes(nominee_id);

CREATE OR REPLACE FUNCTION get_task_winner(task_uuid UUID)
RETURNS UUID AS $$
DECLARE
  winner_id UUID;
BEGIN
  SELECT nominee_id INTO winner_id
  FROM votes
  WHERE task_id = task_uuid
  GROUP BY nominee_id
  ORDER BY COUNT(*) DESC, MIN(created_at) ASC
  LIMIT 1;
  
  RETURN winner_id;
END;
$$ LANGUAGE plpgsql;

-- 007: RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Transactions
CREATE POLICY "Users can view own transactions"
  ON cookie_transactions FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can create transactions"
  ON cookie_transactions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Certificates
CREATE POLICY "Anyone can view active certificates"
  ON certificates FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage certificates"
  ON certificates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Purchases
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create own purchases"
  ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases"
  ON purchases FOR UPDATE USING (auth.uid() = user_id);

-- Daily Bonuses
CREATE POLICY "Users can view own bonuses"
  ON daily_bonuses FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can claim own daily bonus"
  ON daily_bonuses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Anyone can view active tasks"
  ON tasks FOR SELECT
  USING (status = 'active' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage tasks"
  ON tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Votes
CREATE POLICY "Users can view votes in active tasks"
  ON votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND status = 'active') OR 
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can vote"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id AND EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND status = 'active'));

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (auth.uid() = voter_id AND EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND status = 'active'));
