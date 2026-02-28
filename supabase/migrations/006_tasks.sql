-- Задания и голосования
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

-- Голоса в заданиях
CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nominee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, voter_id),
  CHECK (voter_id != nominee_id) -- нельзя голосовать за себя
);

-- Индексы для tasks
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);

-- Индексы для votes
CREATE INDEX idx_votes_task_id ON votes(task_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_nominee_id ON votes(nominee_id);

-- Функция для подсчёта голосов и определения победителя
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

-- Комментарии
COMMENT ON TABLE tasks IS 'Задания и активности для студентов';
COMMENT ON TABLE votes IS 'Голоса в заданиях с голосованием';
COMMENT ON COLUMN votes.voter_id IS 'Кто голосует';
COMMENT ON COLUMN votes.nominee_id IS 'За кого голосуют';
