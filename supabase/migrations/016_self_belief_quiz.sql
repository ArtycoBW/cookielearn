CREATE TABLE IF NOT EXISTS self_belief_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  wager INT NOT NULL CHECK (wager IN (1, 3, 5)),
  prompt TEXT NOT NULL,
  options TEXT[] NOT NULL CHECK (cardinality(options) = 4),
  correct_option INT NOT NULL CHECK (correct_option BETWEEN 0 AND 3),
  explanation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS self_belief_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES self_belief_questions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  wager INT NOT NULL CHECK (wager IN (1, 3, 5)),
  selected_option INT NOT NULL CHECK (selected_option BETWEEN 0 AND 3),
  is_correct BOOLEAN NOT NULL,
  reward_delta INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_self_belief_questions_active
  ON self_belief_questions (is_active, wager, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_self_belief_attempts_user_created
  ON self_belief_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_self_belief_attempts_question
  ON self_belief_attempts (question_id);

CREATE OR REPLACE FUNCTION set_self_belief_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_self_belief_questions_updated_at ON self_belief_questions;
CREATE TRIGGER trg_self_belief_questions_updated_at
  BEFORE UPDATE ON self_belief_questions
  FOR EACH ROW
  EXECUTE FUNCTION set_self_belief_questions_updated_at();

COMMENT ON TABLE self_belief_questions IS 'Вопросы для режима "Верю в себя"';
COMMENT ON TABLE self_belief_attempts IS 'История попыток студентов в режиме "Верю в себя"';
