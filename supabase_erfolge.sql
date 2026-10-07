-- ============================================================
-- SLZB-Erfolge v3 – Erfolge in Supabase
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── Erfolge ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erfolg_nr             TEXT UNIQUE,
  meldungsart           TEXT NOT NULL,
  titel                 TEXT NOT NULL,
  sport                 TEXT,                    -- Sportart-Name (Freitext)
  sport_id              TEXT,                    -- Sportart-ID (lokal)
  disziplin             TEXT DEFAULT '',
  wettbewerb            TEXT DEFAULT '',         -- Wettbewerb-Name (Freitext)
  wettbewerb_id         TEXT,                    -- Wettbewerb-ID (lokal)
  datum                 DATE,
  ort                   TEXT DEFAULT '',
  ebene                 TEXT DEFAULT '',
  platzierung           INTEGER,
  medaille              TEXT DEFAULT 'keine',
  ergebnis_wert         NUMERIC,
  ergebnis_einheit      TEXT DEFAULT '',
  ergebnis_text         TEXT DEFAULT '',
  kurzinfo              TEXT DEFAULT '',
  text_artikel          TEXT DEFAULT '',
  text_ki_entwurf       TEXT DEFAULT '',
  quelle_url            TEXT DEFAULT '',
  status                TEXT DEFAULT 'Entwurf',
  melder_id             UUID REFERENCES auth.users(id),
  melder_name           TEXT DEFAULT '',
  eingangsdatum         TIMESTAMPTZ DEFAULT NOW(),
  einwilligung_geprueft BOOLEAN DEFAULT false,
  dubletten_hinweis     BOOLEAN DEFAULT false,
  dubletten_text        TEXT DEFAULT '',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Beteiligungen ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievement_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  student_id      TEXT,                          -- Schüler-ID (lokal)
  student_name    TEXT DEFAULT '',               -- Anzeigename
  rolle           TEXT DEFAULT 'Athlet',
  consent_status  TEXT DEFAULT 'Nicht geprüft',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Statusprotokoll ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievement_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  status_alt      TEXT DEFAULT '',
  status_neu      TEXT NOT NULL,
  zeitpunkt       TIMESTAMPTZ DEFAULT NOW(),
  person          TEXT DEFAULT '',
  person_id       UUID REFERENCES auth.users(id),
  kommentar       TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── updated_at Trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS achievements_updated_at ON achievements;
CREATE TRIGGER achievements_updated_at
  BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION update_achievements_updated_at();

-- ── Sequenz für lesbare IDs ───────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS erfolg_seq START 1;

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE achievements              ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_status_history ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten Nutzer können lesen
CREATE POLICY "auth_read" ON achievements
  FOR SELECT TO authenticated USING (true);

-- Trainer können eigene Meldungen erstellen
CREATE POLICY "auth_insert" ON achievements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = melder_id);

-- Trainer können eigene Entwürfe bearbeiten, Redaktion/Admin alles
CREATE POLICY "auth_update" ON achievements
  FOR UPDATE TO authenticated USING (
    auth.uid() = melder_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('redaktion', 'oea', 'datenschutz', 'admin')
      AND active = true
    )
  );

-- Beteiligungen
CREATE POLICY "auth_read" ON achievement_participants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON achievement_participants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Protokoll
CREATE POLICY "auth_read" ON achievement_status_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON achievement_status_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Kontrolle ─────────────────────────────────────────────────
SELECT 'achievements' as tabelle, COUNT(*) FROM achievements
UNION ALL SELECT 'achievement_participants', COUNT(*) FROM achievement_participants
UNION ALL SELECT 'achievement_status_history', COUNT(*) FROM achievement_status_history;