-- Ежедневные бонусы
CREATE TABLE daily_bonuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  awarded_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, awarded_at)
);

-- Индексы
CREATE INDEX idx_daily_bonuses_user_id ON daily_bonuses(user_id);
CREATE INDEX idx_daily_bonuses_awarded_at ON daily_bonuses(awarded_at DESC);

-- Комментарии
COMMENT ON TABLE daily_bonuses IS 'Журнал получения ежедневных бонусов';
COMMENT ON COLUMN daily_bonuses.awarded_at IS 'Дата получения бонуса (UNIQUE с user_id)';
