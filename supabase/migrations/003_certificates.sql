-- Каталог сертификатов в магазине
CREATE TABLE certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT,
  base_price         INT NOT NULL CHECK (base_price > 0),
  current_price      INT NOT NULL CHECK (current_price > 0),
  inflation_step     INT NOT NULL DEFAULT 0,  -- рост цены за каждую покупку
  total_quantity     INT,                      -- NULL = безлимит
  remaining_quantity INT,
  validity_days      INT,                      -- срок действия после покупки (дни)
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_certificates_active ON certificates(is_active);
CREATE INDEX idx_certificates_price ON certificates(current_price);

-- Функция для обновления цены с учётом инфляции
CREATE OR REPLACE FUNCTION update_certificate_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Уменьшаем остаток
  IF NEW.remaining_quantity IS NOT NULL THEN
    NEW.remaining_quantity := NEW.remaining_quantity - 1;
    
    IF NEW.remaining_quantity < 0 THEN
      RAISE EXCEPTION 'Сертификат закончился';
    END IF;
    
    -- Деактивируем если закончился
    IF NEW.remaining_quantity = 0 THEN
      NEW.is_active := FALSE;
    END IF;
  END IF;
  
  -- Увеличиваем цену
  IF NEW.inflation_step > 0 THEN
    NEW.current_price := NEW.current_price + NEW.inflation_step;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на обновление времени
CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Комментарии
COMMENT ON TABLE certificates IS 'Каталог сертификатов доступных для покупки';
COMMENT ON COLUMN certificates.inflation_step IS 'Увеличение цены после каждой покупки';
COMMENT ON COLUMN certificates.remaining_quantity IS 'Оставшееся количество (NULL = безлимит)';
