-- Fix v2: Alle Signed URLs in voting_candidates auf Public URLs umstellen
-- Funktioniert auch wenn der Pfad URL-kodiert ist

-- Zeige aktuelle URLs
SELECT id, name, bild_url FROM voting_candidates WHERE bild_url IS NOT NULL;

-- Update: Ersetze /object/sign/ durch /object/public/ und entferne Token
UPDATE voting_candidates
SET bild_url = CONCAT(
  'https://yjzvmvgnpxbxmcjopqws.supabase.co/storage/v1/object/public/achievement-media/',
  SPLIT_PART(
    SPLIT_PART(bild_url, '/achievement-media/', 2),
    '?', 1
  )
)
WHERE bild_url LIKE '%/object/sign/achievement-media/%'
   OR bild_url LIKE '%/object/public/achievement-media/%';

-- Prüfen
SELECT name, LEFT(bild_url, 100) as url FROM voting_candidates WHERE bild_url IS NOT NULL;
