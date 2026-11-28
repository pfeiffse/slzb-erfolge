-- ══════════════════════════════════════════════════════════════
-- SLZB-Erfolge: Fehlende Spalten ergänzen
-- Ausführen in Supabase SQL-Editor
-- ══════════════════════════════════════════════════════════════

-- 1. kalender_eintraege: land + link Spalten
ALTER TABLE kalender_eintraege 
  ADD COLUMN IF NOT EXISTS land TEXT,
  ADD COLUMN IF NOT EXISTS link TEXT;

-- 2. Athleten-Profile: Bild-URL in Supabase Storage speichern
-- (bereits vorhanden: bild_url TEXT)
-- Prüfe ob storage_path fehlt:
ALTER TABLE athleten_profile
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'achievement-media';

-- 3. voting_candidates: storage_path für Bilder
-- (bereits vorhanden: bild_url, storage_bucket, storage_path)
-- Keine Änderung nötig

-- 4. Veranstaltungs-Workspace: Neue Tabelle für persistente Speicherung
CREATE TABLE IF NOT EXISTS veranstaltungs_workspace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erstellt_von UUID REFERENCES auth.users(id),
  veranstaltung TEXT NOT NULL,
  ort TEXT,
  sportart TEXT,
  format TEXT DEFAULT 'carousel',
  teamfoto_url TEXT,
  teamfoto_path TEXT,
  athleten JSONB DEFAULT '[]',
  gespeichert_am TIMESTAMPTZ DEFAULT NOW(),
  geaendert_am TIMESTAMPTZ DEFAULT NOW()
);

-- RLS für veranstaltungs_workspace
ALTER TABLE veranstaltungs_workspace ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_select ON veranstaltungs_workspace
  FOR SELECT TO authenticated
  USING (erstellt_von = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() 
    AND p.active = true AND p.role IN ('redaktion','oea','admin')
  ));

CREATE POLICY ws_insert ON veranstaltungs_workspace
  FOR INSERT TO authenticated
  WITH CHECK (erstellt_von = auth.uid());

CREATE POLICY ws_update ON veranstaltungs_workspace
  FOR UPDATE TO authenticated
  USING (erstellt_von = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() 
    AND p.active = true AND p.role IN ('admin')
  ));

CREATE POLICY ws_delete ON veranstaltungs_workspace
  FOR DELETE TO authenticated
  USING (erstellt_von = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() 
    AND p.active = true AND p.role IN ('admin')
  ));

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_ws_erstellt_von ON veranstaltungs_workspace(erstellt_von);
CREATE INDEX IF NOT EXISTS idx_ws_gespeichert ON veranstaltungs_workspace(gespeichert_am DESC);

-- 5. Athleten-Profile Tabelle (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS athleten_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erstellt_von UUID REFERENCES auth.users(id),
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  sportart TEXT,
  klasse TEXT,
  kader TEXT,
  bild_url TEXT,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'achievement-media',
  notizen TEXT,
  erstellt_am TIMESTAMPTZ DEFAULT NOW(),
  geaendert_am TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE athleten_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap_select ON athleten_profile
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ap_insert ON athleten_profile
  FOR INSERT TO authenticated
  WITH CHECK (erstellt_von = auth.uid());

CREATE POLICY ap_update ON athleten_profile
  FOR UPDATE TO authenticated
  USING (erstellt_von = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() 
    AND p.active = true AND p.role IN ('redaktion','oea','admin')
  ));

CREATE POLICY ap_delete ON athleten_profile
  FOR DELETE TO authenticated
  USING (erstellt_von = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() 
    AND p.active = true AND p.role IN ('admin')
  ));

-- Realtime für Workspace
ALTER PUBLICATION supabase_realtime ADD TABLE veranstaltungs_workspace;
