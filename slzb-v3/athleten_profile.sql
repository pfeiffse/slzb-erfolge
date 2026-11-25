-- Athleten-Profile Tabelle
CREATE TABLE IF NOT EXISTS athleten_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vorname text,
  nachname text,
  sportart text,
  klasse text,
  kader text,
  bild_url text,
  storage_path text,
  notizen text,
  aktiv boolean DEFAULT true,
  erstellt_von uuid REFERENCES auth.users(id),
  erstellt_am timestamptz DEFAULT now(),
  aktualisiert_am timestamptz DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE athleten_profile ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY athleten_profile_select ON athleten_profile
  FOR SELECT TO authenticated
  USING (aktiv = true OR erstellt_von = auth.uid());

CREATE POLICY athleten_profile_insert ON athleten_profile
  FOR INSERT TO authenticated
  WITH CHECK (erstellt_von = auth.uid());

CREATE POLICY athleten_profile_update ON athleten_profile
  FOR UPDATE TO authenticated
  USING (erstellt_von = auth.uid() OR slzb_has_role(ARRAY['redaktion'::app_role,'oea'::app_role,'admin'::app_role]));

CREATE POLICY athleten_profile_delete ON athleten_profile
  FOR DELETE TO authenticated
  USING (erstellt_von = auth.uid() OR slzb_has_role(ARRAY['admin'::app_role]));

-- Index für Suche
CREATE INDEX IF NOT EXISTS idx_athleten_profile_name ON athleten_profile(name);
CREATE INDEX IF NOT EXISTS idx_athleten_profile_sportart ON athleten_profile(sportart);

-- Storage Bucket für Athleten-Bilder (falls noch nicht vorhanden)
-- Bitte in Supabase Dashboard unter Storage erstellen:
-- Bucket: "athleten-bilder" (public)
