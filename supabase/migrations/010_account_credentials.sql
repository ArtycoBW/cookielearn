CREATE TABLE IF NOT EXISTS account_credentials (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  login          TEXT NOT NULL UNIQUE,
  email          TEXT NOT NULL UNIQUE,
  password_plain TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_credentials_login ON account_credentials(login);

CREATE OR REPLACE FUNCTION update_account_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_account_credentials_updated_at ON account_credentials;
CREATE TRIGGER update_account_credentials_updated_at
  BEFORE UPDATE ON account_credentials
  FOR EACH ROW EXECUTE FUNCTION update_account_credentials_updated_at();

COMMENT ON TABLE account_credentials IS 'Учётные данные пользователей для просмотра администратором';
COMMENT ON COLUMN account_credentials.password_plain IS 'Пароль хранится в открытом виде по требованию админ-панели';