-- 006_add_storage_buckets.sql
-- Create the maps storage bucket and its RLS policies.

INSERT INTO storage.buckets (id, name, public)
VALUES ('maps', 'maps', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view map images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'maps');

CREATE POLICY "Authenticated users can upload maps"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'maps' AND auth.role() = 'authenticated');

CREATE POLICY "Map owner can delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'maps' AND auth.uid() = owner::uuid);
