CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Общее',
  format TEXT NOT NULL DEFAULT 'article',
  url TEXT NOT NULL,
  estimated_minutes INT CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_catalog
  ON materials (is_published, is_featured DESC, category, updated_at DESC);

COMMENT ON TABLE materials IS 'Учебные материалы и полезные ссылки для студентов';
COMMENT ON COLUMN materials.category IS 'Логическая категория материала, например HTML, CSS, SQL';
COMMENT ON COLUMN materials.format IS 'Тип материала: article, video, guide, checklist, repository и т.п.';
COMMENT ON COLUMN materials.url IS 'Ссылка на внешний материал';
