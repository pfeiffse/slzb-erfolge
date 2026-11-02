-- ============================================================
-- SLZB-Erfolge v3 – Poster-Entwürfe Versionierung
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- Neue Spalten hinzufügen
ALTER TABLE poster_drafts
  ADD COLUMN IF NOT EXISTS version    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_id  UUID REFERENCES poster_drafts(id) ON DELETE SET NULL;

-- Index für schnelle Versionsabfragen
CREATE INDEX IF NOT EXISTS idx_poster_drafts_typ
  ON poster_drafts(achievement_id, typ, erstellt_am DESC);

-- Kontrolle
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'poster_drafts'
  AND column_name IN ('version','parent_id')
ORDER BY column_name;
