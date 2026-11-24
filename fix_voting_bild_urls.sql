-- Fix: voting_candidates bild_url von Signed URLs auf Public URLs umstellen
-- Signed URL Format: .../object/sign/achievement-media/PATH?token=...
-- Public URL Format: .../object/public/achievement-media/PATH

UPDATE voting_candidates
SET bild_url = REGEXP_REPLACE(
  bild_url,
  'https://[^/]+/storage/v1/object/sign/achievement-media/([^?]+)\?.*',
  'https://yjzvmvgnpxbxmcjopqws.supabase.co/storage/v1/object/public/achievement-media/\1'
)
WHERE bild_url LIKE '%/object/sign/achievement-media/%';

-- Prüfen
SELECT id, name, LEFT(bild_url, 80) as bild_url_preview
FROM voting_candidates
WHERE bild_url IS NOT NULL
LIMIT 10;
