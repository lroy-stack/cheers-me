-- ============================================================================
-- Migration 045: Branding storage bucket
-- Creates a public Supabase Storage bucket for logo and branding assets
-- ============================================================================

-- Create the branding bucket (public, 2MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  2097152,  -- 2MB
  ARRAY['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Public read access
CREATE POLICY "Public can read branding assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'branding');

-- RLS: Only admin/manager can upload
CREATE POLICY "Admins can upload branding assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- RLS: Only admin/manager can update
CREATE POLICY "Admins can update branding assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- RLS: Only admin/manager can delete
CREATE POLICY "Admins can delete branding assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );
