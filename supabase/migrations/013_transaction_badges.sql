ALTER TABLE cookie_transactions
  ADD COLUMN IF NOT EXISTS badge_icon TEXT,
  ADD COLUMN IF NOT EXISTS badge_title TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_badges
  ON cookie_transactions (user_id, created_at DESC)
  WHERE badge_icon IS NOT NULL AND badge_title IS NOT NULL;

COMMENT ON COLUMN cookie_transactions.badge_icon IS 'Иконка бейджа, выданного вместе с транзакцией';
COMMENT ON COLUMN cookie_transactions.badge_title IS 'Название бейджа, выданного вместе с транзакцией';
