CREATE TABLE IF NOT EXISTS self_belief_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  wager INT NOT NULL CHECK (wager IN (1, 3, 5)),
  time_limit_seconds INT NOT NULL DEFAULT 10 CHECK (time_limit_seconds BETWEEN 5 AND 30),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS self_belief_quiz_questions (
  quiz_id UUID NOT NULL REFERENCES self_belief_quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES self_belief_questions(id) ON DELETE CASCADE,
  position INT NOT NULL CHECK (position > 0),
  PRIMARY KEY (quiz_id, question_id),
  UNIQUE (quiz_id, position)
);

CREATE TABLE IF NOT EXISTS self_belief_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES self_belief_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_title TEXT NOT NULL,
  wager INT NOT NULL CHECK (wager IN (1, 3, 5)),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  total_questions INT NOT NULL CHECK (total_questions > 0),
  entry_cost INT NOT NULL CHECK (entry_cost > 0),
  payout INT NOT NULL DEFAULT 0 CHECK (payout >= 0),
  net_reward INT NOT NULL DEFAULT 0,
  user_correct_count INT NOT NULL DEFAULT 0 CHECK (user_correct_count >= 0),
  corgi_correct_count INT NOT NULL DEFAULT 0 CHECK (corgi_correct_count >= 0),
  outcome TEXT CHECK (outcome IN ('win', 'draw', 'lose')),
  balance_after INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS self_belief_quiz_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES self_belief_quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES self_belief_questions(id) ON DELETE CASCADE,
  position INT NOT NULL CHECK (position > 0),
  selected_option INT CHECK (selected_option BETWEEN 0 AND 3),
  correct_option INT NOT NULL CHECK (correct_option BETWEEN 0 AND 3),
  timed_out BOOLEAN NOT NULL DEFAULT FALSE,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  corgi_selected_option INT NOT NULL CHECK (corgi_selected_option BETWEEN 0 AND 3),
  corgi_is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  response_ms INT NOT NULL DEFAULT 0 CHECK (response_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, question_id),
  UNIQUE (attempt_id, position)
);

CREATE INDEX IF NOT EXISTS idx_self_belief_quizzes_active
  ON self_belief_quizzes (is_active, wager, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_self_belief_quiz_questions_quiz
  ON self_belief_quiz_questions (quiz_id, position);

CREATE INDEX IF NOT EXISTS idx_self_belief_quiz_attempts_user
  ON self_belief_quiz_attempts (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_self_belief_quiz_attempts_status
  ON self_belief_quiz_attempts (status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_self_belief_quiz_attempt_answers_attempt
  ON self_belief_quiz_attempt_answers (attempt_id, position);

CREATE OR REPLACE FUNCTION set_self_belief_quizzes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_self_belief_quizzes_updated_at ON self_belief_quizzes;
CREATE TRIGGER trg_self_belief_quizzes_updated_at
  BEFORE UPDATE ON self_belief_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION set_self_belief_quizzes_updated_at();

COMMENT ON TABLE self_belief_quizzes IS 'Тесты для дуэли с Корги Дуровым в режиме "Верю в себя"';
COMMENT ON TABLE self_belief_quiz_questions IS 'Порядок вопросов внутри теста режима "Верю в себя"';
COMMENT ON TABLE self_belief_quiz_attempts IS 'Запуски тестов студентами в режиме дуэли с Корги Дуровым';
COMMENT ON TABLE self_belief_quiz_attempt_answers IS 'Ответы студента и Корги Дурова по каждому вопросу теста';
