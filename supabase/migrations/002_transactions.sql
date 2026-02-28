-- История транзакций печенек
CREATE TABLE cookie_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      INT NOT NULL,       -- положительное = начисление, отрицательное = списание
  reason      TEXT NOT NULL,      -- описание транзакции
  category    TEXT,               -- 'daily_bonus', 'manual', 'purchase', 'random_bonus', 'task_reward'
  created_by  UUID REFERENCES profiles(id), -- кто создал транзакцию (для админа)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_transactions_user_id ON cookie_transactions(user_id);
CREATE INDEX idx_transactions_created_at ON cookie_transactions(created_at DESC);
CREATE INDEX idx_transactions_category ON cookie_transactions(category);

-- Функция для обновления баланса при добавлении транзакции
CREATE OR REPLACE FUNCTION update_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET balance = balance + NEW.amount
  WHERE id = NEW.user_id;
  
  -- Проверяем, что баланс не стал отрицательным
  IF (SELECT balance FROM profiles WHERE id = NEW.user_id) < 0 THEN
    RAISE EXCEPTION 'Недостаточно печенек для выполнения операции';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на изменение баланса
CREATE TRIGGER on_transaction_created
  AFTER INSERT ON cookie_transactions
  FOR EACH ROW EXECUTE FUNCTION update_balance_on_transaction();

-- Комментарии
COMMENT ON TABLE cookie_transactions IS 'История всех операций с печеньками';
COMMENT ON COLUMN cookie_transactions.amount IS 'Сумма транзакции (+ начисление, - списание)';
COMMENT ON COLUMN cookie_transactions.category IS 'Категория транзакции для аналитики';
