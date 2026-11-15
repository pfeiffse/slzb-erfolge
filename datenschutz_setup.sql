-- ============================================================
-- SLZB-Erfolge v3 – Datenschutz-Negativliste
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS datenschutz_widerspruch (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nachname    TEXT NOT NULL,
  vorname     TEXT NOT NULL,
  klasse      TEXT,
  -- Widerspruch Namensveröffentlichung
  name_print      BOOLEAN DEFAULT FALSE,
  name_presse     BOOLEAN DEFAULT FALSE,
  name_homepage   BOOLEAN DEFAULT FALSE,
  name_events     BOOLEAN DEFAULT FALSE,
  name_social     BOOLEAN DEFAULT FALSE,
  -- Widerspruch Fotoveröffentlichung
  foto_print      BOOLEAN DEFAULT FALSE,
  foto_presse     BOOLEAN DEFAULT FALSE,
  foto_homepage   BOOLEAN DEFAULT FALSE,
  foto_events     BOOLEAN DEFAULT FALSE,
  foto_social     BOOLEAN DEFAULT FALSE,
  -- Metadaten
  importiert_am   TIMESTAMPTZ DEFAULT now(),
  importiert_von  UUID REFERENCES auth.users(id),
  schuljahr       TEXT DEFAULT '2026/27'
);

-- RLS
ALTER TABLE datenschutz_widerspruch ENABLE ROW LEVEL SECURITY;

-- Nur Datenschutz/Admin können lesen und schreiben
DROP POLICY IF EXISTS "ds_select" ON datenschutz_widerspruch;
CREATE POLICY "ds_select" ON datenschutz_widerspruch FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active = true
    AND role IN ('datenschutz','admin','redaktion','oea')
  ));

DROP POLICY IF EXISTS "ds_insert" ON datenschutz_widerspruch;
CREATE POLICY "ds_insert" ON datenschutz_widerspruch FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active = true
    AND role IN ('datenschutz','admin')
  ));

DROP POLICY IF EXISTS "ds_delete" ON datenschutz_widerspruch;
CREATE POLICY "ds_delete" ON datenschutz_widerspruch FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active = true
    AND role IN ('datenschutz','admin')
  ));

-- Index für schnelle Namenssuche
CREATE INDEX IF NOT EXISTS idx_ds_name ON datenschutz_widerspruch(nachname, vorname);
CREATE INDEX IF NOT EXISTS idx_ds_schuljahr ON datenschutz_widerspruch(schuljahr);

-- Kontrolle
SELECT column_name FROM information_schema.columns
WHERE table_name = 'datenschutz_widerspruch'
ORDER BY ordinal_position;
