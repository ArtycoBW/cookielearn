CREATE TABLE IF NOT EXISTS survey_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  answers      JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed     BOOLEAN NOT NULL DEFAULT FALSE,
  reward_given INT
);

CREATE INDEX IF NOT EXISTS idx_survey_submissions_submitted_at ON survey_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_reviewed ON survey_submissions(reviewed);

COMMENT ON TABLE survey_submissions IS 'Ответы студентов на анкету';
COMMENT ON COLUMN survey_submissions.answers IS 'JSON-массив ответов формата [{question_id, answer}]';
COMMENT ON COLUMN survey_submissions.reviewed IS 'Проверена ли анкета администратором';