DO $$
BEGIN
  IF to_regclass('public.materials') IS NULL THEN
    RAISE EXCEPTION 'Run 014_materials.sql before 015_material_storage.sql';
  END IF;
END $$;

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT CHECK (file_size IS NULL OR file_size > 0);

ALTER TABLE materials
  ALTER COLUMN storage_bucket SET DEFAULT 'materials';

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published materials" ON materials;
CREATE POLICY "Anyone can view published materials"
  ON materials FOR SELECT
  USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage materials" ON materials;
CREATE POLICY "Admins can manage materials"
  ON materials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  true,
  26214400,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/rtf',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read materials files" ON storage.objects;
CREATE POLICY "Public can read materials files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "Admins can upload materials files" ON storage.objects;
CREATE POLICY "Admins can upload materials files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materials' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update materials files" ON storage.objects;
CREATE POLICY "Admins can update materials files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'materials' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'materials' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete materials files" ON storage.objects;
CREATE POLICY "Admins can delete materials files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'materials' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );