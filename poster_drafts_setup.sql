-- ============================================================
-- SLZB-Erfolge v3 – Poster-Entwürfe (poster_drafts)
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS poster_drafts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  typ             TEXT NOT NULL CHECK (typ IN ('a3','bildschirm','social')),
  variante        INTEGER DEFAULT 1,
  format          TEXT DEFAULT 'hochformat',
  -- Editor-Parameter
  titel           TEXT,
  athlet          TEXT,
  wettbewerb      TEXT,
  datum           DATE,
  ort             TEXT,
  platzierung     INTEGER,
  medaille        TEXT DEFAULT 'keine',
  ebene           TEXT,
  sportart        TEXT,
  -- PNG-Referenz (optional)
  storage_path    TEXT,
  -- Metadaten
  notiz           TEXT,
  erstellt_am     TIMESTAMPTZ DEFAULT now(),
  erstellt_von    UUID REFERENCES auth.users(id),
  erstellt_von_name TEXT
);

-- Index für schnelle Abfragen pro Meldung
CREATE INDEX IF NOT EXISTS idx_poster_drafts_achievement
  ON poster_drafts(achievement_id);

-- RLS aktivieren
ALTER TABLE poster_drafts ENABLE ROW LEVEL SECURITY;

-- SELECT: Eigene + Redaktion/ÖA/Admin
DROP POLICY IF EXISTS "poster_drafts_select" ON poster_drafts;
CREATE POLICY "poster_drafts_select" ON poster_drafts FOR SELECT TO authenticated
USING (
  erstellt_von = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND active = true
      AND role IN ('redaktion','oea','admin')
  )
);

-- INSERT: Alle authentifizierten Nutzer
DROP POLICY IF EXISTS "poster_drafts_insert" ON poster_drafts;
CREATE POLICY "poster_drafts_insert" ON poster_drafts FOR INSERT TO authenticated
WITH CHECK (erstellt_von = auth.uid());

-- UPDATE: Eigene Entwürfe
DROP POLICY IF EXISTS "poster_drafts_update" ON poster_drafts;
CREATE POLICY "poster_drafts_update" ON poster_drafts FOR UPDATE TO authenticated
USING (erstellt_von = auth.uid());

-- DELETE: Eigene + Admin
DROP POLICY IF EXISTS "poster_drafts_delete" ON poster_drafts;
CREATE POLICY "poster_drafts_delete" ON poster_drafts FOR DELETE TO authenticated
USING (
  erstellt_von = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND active = true AND role = 'admin'
  )
);

-- Storage-Bucket für Poster-PNGs (falls noch nicht vorhanden)
-- Manuell in Supabase Dashboard anlegen: Storage → New Bucket → "poster-exports" (private)

-- Kontrolle
SELECT tablename, policyname, cmd
FROM pg_policies WHERE tablename = 'poster_drafts'
ORDER BY cmd;
