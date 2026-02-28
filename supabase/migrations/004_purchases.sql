-- Покупки сертификатов пользователями
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

-- Индексы
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_certificate_id ON purchases(certificate_id);
CREATE INDEX idx_purchases_expires_at ON purchases(expires_at);

-- Функция для вычисления даты истечения
CREATE OR REPLACE FUNCTION set_purchase_expiry()
RETURNS TRIGGER AS $$
DECLARE
  cert_validity INT;
BEGIN
  -- Получаем срок действия сертификата
  SELECT validity_days INTO cert_validity
  FROM certificates
  WHERE id = NEW.certificate_id;
  
  -- Устанавливаем дату истечения если указан срок
  IF cert_validity IS NOT NULL THEN
    NEW.expires_at := NEW.purchased_at + (cert_validity || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на установку даты истечения
CREATE TRIGGER on_purchase_set_expiry
  BEFORE INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION set_purchase_expiry();

-- Функция для автоматической пометки истёкших покупок
CREATE OR REPLACE FUNCTION mark_expired_purchases()
RETURNS void AS $$
BEGIN
  UPDATE purchases
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Комментарии
COMMENT ON TABLE purchases IS 'История покупок сертификатов';
COMMENT ON COLUMN purchases.status IS 'Статус: active, used или expired';
COMMENT ON COLUMN purchases.price_paid IS 'Цена на момент покупки';
