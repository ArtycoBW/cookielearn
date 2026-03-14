ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS background_image TEXT;

CREATE INDEX IF NOT EXISTS idx_certificates_expires_at ON certificates(expires_at);