-- ═══════════════════════════════════════════════════
-- Migration 042: Create exports storage bucket
-- ═══════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf', 'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies: users can manage their own exports (folder = user_id)
CREATE POLICY "Users can upload own exports" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own exports" ON storage.objects
  FOR SELECT USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own exports" ON storage.objects
  FOR DELETE USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);
