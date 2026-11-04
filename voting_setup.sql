-- ============================================================
-- SLZB-Erfolge v3 – Sportler/in des Monats Abstimmung
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- Abstimmungs-Kampagnen (z.B. "November 2026")
CREATE TABLE IF NOT EXISTS voting_campaigns (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel        TEXT NOT NULL,              -- z.B. "Sportler/in des Monats November 2026"
  monat        TEXT NOT NULL,              -- z.B. "2026-11"
  beschreibung TEXT,
  status       TEXT DEFAULT 'entwurf'     -- entwurf | aktiv | beendet
                CHECK (status IN ('entwurf','aktiv','beendet')),
  start_at     TIMESTAMPTZ,
  end_at       TIMESTAMPTZ,
  erstellt_von UUID REFERENCES auth.users(id),
  erstellt_am  TIMESTAMPTZ DEFAULT now(),
  ergebnis_sichtbar BOOLEAN DEFAULT false  -- Ergebnis für alle sichtbar?
);

-- Kandidaten (max. 3 pro Kampagne)
CREATE TABLE IF NOT EXISTS voting_candidates (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id  UUID NOT NULL REFERENCES voting_campaigns(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,              -- Athletenname
  sportart     TEXT,
  erfolg       TEXT NOT NULL,             -- Kurzbeschreibung des Erfolgs
  bild_url     TEXT,                      -- Foto-URL (aus Supabase Storage)
  klasse       TEXT,
  reihenfolge  INTEGER DEFAULT 1,
  erstellt_am  TIMESTAMPTZ DEFAULT now()
);

-- Stimmen (anonym, einmal pro Gerät)
CREATE TABLE IF NOT EXISTS voting_votes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id  UUID NOT NULL REFERENCES voting_campaigns(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES voting_candidates(id) ON DELETE CASCADE,
  voter_token  TEXT NOT NULL,             -- anonymes Token (localStorage)
  abgestimmt_am TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, voter_token)        -- einmal pro Gerät
);

-- RLS aktivieren
ALTER TABLE voting_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_votes ENABLE ROW LEVEL SECURITY;

-- Kampagnen: alle lesen, nur Admin/Redaktion schreiben
DROP POLICY IF EXISTS "voting_campaigns_select" ON voting_campaigns;
CREATE POLICY "voting_campaigns_select" ON voting_campaigns FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "voting_campaigns_insert" ON voting_campaigns;
CREATE POLICY "voting_campaigns_insert" ON voting_campaigns FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('redaktion','oea','admin') AND active = true));

DROP POLICY IF EXISTS "voting_campaigns_update" ON voting_campaigns;
CREATE POLICY "voting_campaigns_update" ON voting_campaigns FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('redaktion','oea','admin') AND active = true));

-- Kandidaten: alle lesen, nur Admin/Redaktion schreiben
DROP POLICY IF EXISTS "voting_candidates_select" ON voting_candidates;
CREATE POLICY "voting_candidates_select" ON voting_candidates FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "voting_candidates_insert" ON voting_candidates;
CREATE POLICY "voting_candidates_insert" ON voting_candidates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('redaktion','oea','admin') AND active = true));

DROP POLICY IF EXISTS "voting_candidates_delete" ON voting_candidates;
CREATE POLICY "voting_candidates_delete" ON voting_candidates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('redaktion','oea','admin') AND active = true));

-- Stimmen: alle können abstimmen (anon), nur lesen wenn Ergebnis sichtbar
DROP POLICY IF EXISTS "voting_votes_insert" ON voting_votes;
CREATE POLICY "voting_votes_insert" ON voting_votes FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "voting_votes_select" ON voting_votes;
CREATE POLICY "voting_votes_select" ON voting_votes FOR SELECT TO anon, authenticated
  USING (true);

-- Kontrolle
SELECT tablename FROM pg_tables WHERE tablename LIKE 'voting_%' ORDER BY tablename;

-- Spalte für storage_path hinzufügen (für Signed URL Generierung)
ALTER TABLE voting_candidates
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'achievement-media';
