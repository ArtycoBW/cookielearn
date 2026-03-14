ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check;
ALTER TABLE tasks ALTER COLUMN type SET DEFAULT 'other';

CREATE TABLE IF NOT EXISTS task_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_text  TEXT,
  response_url   TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed       BOOLEAN NOT NULL DEFAULT FALSE,
  reward_given   INT,
  reviewed_at    TIMESTAMPTZ,
  reviewed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(task_id, user_id),
  CHECK (
    NULLIF(BTRIM(COALESCE(response_text, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(response_url, '')), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_reviewed ON task_submissions(reviewed);
CREATE INDEX IF NOT EXISTS idx_task_submissions_submitted_at ON task_submissions(submitted_at DESC);

COMMENT ON TABLE task_submissions IS 'Ответы студентов на задания';
COMMENT ON COLUMN task_submissions.response_text IS 'Комментарий студента по заданию';
COMMENT ON COLUMN task_submissions.response_url IS 'Ссылка на документ, мем, отчёт или другой внешний материал';
COMMENT ON COLUMN tasks.type IS 'Тип задания: feedback, sql, meme, other';
