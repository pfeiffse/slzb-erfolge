-- ══════════════════════════════════════════════════════════════
-- RLS-Policy: Poster-Bild-Upload in achievement-media Bucket
-- Erlaubt authentifizierten Nutzern, Bilder unter
-- userId/poster-*/ hochzuladen (ohne achievement_media-Tabelle)
-- ══════════════════════════════════════════════════════════════

-- Policy für Storage-Upload (Pfad: userId/poster-kategorie/datei)
CREATE POLICY "poster_upload_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'achievement-media'
  AND (
    -- Erlaubt: userId/poster-*/datei
    name LIKE (auth.uid()::text || '/poster-%/%')
  )
);

-- Policy für Storage-Read (Signed URLs funktionieren bereits über bestehende Policies)
-- Falls nötig, explizit für Poster-Pfade:
CREATE POLICY "poster_read_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'achievement-media'
  AND name LIKE (auth.uid()::text || '/poster-%/%')
);
