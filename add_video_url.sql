-- ══════════════════════════════════════════════════════════════
-- Video-URL Spalte zur achievements-Tabelle hinzufügen
-- In Supabase SQL Editor ausführen
-- ══════════════════════════════════════════════════════════════

ALTER TABLE achievements ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Kommentar
COMMENT ON COLUMN achievements.video_url IS 'YouTube oder Vimeo URL (optional, kein Auto-Embed auf öffentlichen Seiten)';
