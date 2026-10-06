-- ============================================================
-- SLZB-Erfolge v2 – Supabase Schema
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── Erweiterungen ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Sportarten ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slzb_sportarten (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  kuerzel     TEXT,
  kategorie   TEXT,
  disziplinen TEXT[] DEFAULT '{}',
  aktiv       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Wettbewerbe ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slzb_wettbewerbe (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL,
  veranstalter TEXT DEFAULT '',
  ort          TEXT DEFAULT '',
  beginn       DATE,
  ende         DATE,
  ebene        TEXT DEFAULT '',
  sportart_id  TEXT REFERENCES slzb_sportarten(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Teams ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slzb_teams (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  sportart_id TEXT REFERENCES slzb_sportarten(id),
  kategorie   TEXT DEFAULT '',
  schuljahr   TEXT DEFAULT '',
  aktiv       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Schüler ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slzb_schueler (
  id                   TEXT PRIMARY KEY,
  schueler_nr          TEXT UNIQUE,
  vorname              TEXT NOT NULL,
  nachname             TEXT NOT NULL,
  anzeigename          TEXT NOT NULL,
  klasse               TEXT DEFAULT '',
  sportart_id          TEXT REFERENCES slzb_sportarten(id),
  gruppe               TEXT DEFAULT '',
  aktiv                BOOLEAN DEFAULT true,
  ew_foto              BOOLEAN DEFAULT false,
  ew_print             BOOLEAN DEFAULT false,
  ew_homepage          BOOLEAN DEFAULT false,
  ew_digital_signage   BOOLEAN DEFAULT false,
  ew_social_media      BOOLEAN DEFAULT false,
  ew_einzeldarstellung BOOLEAN DEFAULT false,
  ew_klasse            BOOLEAN DEFAULT false,
  ew_gueltig_bis       DATE,
  ew_widerruf          BOOLEAN DEFAULT false,
  ew_widerruf_datum    TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Nutzer ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slzb_nutzer (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  anzeigename   TEXT NOT NULL,
  rolle         TEXT NOT NULL CHECK (rolle IN ('trainer','redaktion','oea','datenschutz','admin')),
  aktiv         BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  email         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Erfolge ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slzb_erfolge (
  id                    TEXT PRIMARY KEY,
  erfolg_nr             TEXT UNIQUE,
  meldungsart           TEXT NOT NULL,
  titel                 TEXT NOT NULL,
  sportart_id           TEXT REFERENCES slzb_sportarten(id),
  disziplin             TEXT DEFAULT '',
  wettbewerb_id         TEXT REFERENCES slzb_wettbewerbe(id),
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
  quelle_original       TEXT DEFAULT '',
  quelle_url            TEXT DEFAULT '',
  status                TEXT DEFAULT 'Entwurf',
  melder_id             TEXT REFERENCES slzb_nutzer(id),
  melder_name           TEXT DEFAULT '',
  eingangsdatum         TIMESTAMPTZ DEFAULT NOW(),
  einwilligung_geprueft BOOLEAN DEFAULT false,
  dubletten_hinweis     BOOLEAN DEFAULT false,
  dubletten_text        TEXT DEFAULT '',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Erfolgsbeteiligungen ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS slzb_beteiligungen (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  erfolg_id           TEXT NOT NULL REFERENCES slzb_erfolge(id) ON DELETE CASCADE,
  schueler_id         TEXT REFERENCES slzb_schueler(id),
  rolle               TEXT DEFAULT 'Athlet',
  einwilligungsstatus TEXT DEFAULT 'Nicht geprüft',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Statusprotokoll ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slzb_protokoll (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  erfolg_id  TEXT NOT NULL REFERENCES slzb_erfolge(id) ON DELETE CASCADE,
  status_alt TEXT DEFAULT '',
  status_neu TEXT NOT NULL,
  zeitpunkt  TIMESTAMPTZ DEFAULT NOW(),
  person     TEXT DEFAULT '',
  kommentar  TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(erfolg_id, zeitpunkt, status_neu)
);

-- ── updated_at Trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS erfolge_updated_at ON slzb_erfolge;
CREATE TRIGGER erfolge_updated_at
  BEFORE UPDATE ON slzb_erfolge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE slzb_sportarten   ENABLE ROW LEVEL SECURITY;
ALTER TABLE slzb_wettbewerbe  ENABLE ROW LEVEL SECURITY;
ALTER TABLE slzb_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE slzb_schueler     ENABLE ROW LEVEL SECURITY;
ALTER TABLE slzb_nutzer       ENABLE ROW LEVEL SECURITY;
ALTER TABLE slzb_erfolge      ENABLE ROW LEVEL SECURITY;
ALTER TABLE slzb_beteiligungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE slzb_protokoll    ENABLE ROW LEVEL SECURITY;

-- Zugriff für anon-Key (App kontrolliert Berechtigungen selbst)
DO $$ BEGIN
  CREATE POLICY "anon_all" ON slzb_sportarten    FOR ALL TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_all" ON slzb_wettbewerbe   FOR ALL TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_all" ON slzb_teams         FOR ALL TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_all" ON slzb_schueler      FOR ALL TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_all" ON slzb_nutzer        FOR ALL TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_all" ON slzb_erfolge       FOR ALL TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_all" ON slzb_beteiligungen FOR ALL TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_all" ON slzb_protokoll     FOR ALL TO anon USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Stammdaten einfügen ──────────────────────────────────────
INSERT INTO slzb_sportarten (id, name, kuerzel, kategorie, disziplinen) VALUES
  ('SP01','Leichtathletik','LA','Leichtathletik',
   ARRAY['100m Sprint','200m Sprint','400m','800m','1500m','5000m','110m Hürden','400m Hürden','Hochsprung','Weitsprung','Dreisprung','Stabhochsprung','Kugelstoßen','Diskuswurf','Speerwurf','Hammerwurf','4×100m Staffel','4×400m Staffel','Zehnkampf','Siebenkampf']),
  ('SP02','Schwimmen','SW','Wassersport',
   ARRAY['50m Freistil','100m Freistil','200m Freistil','400m Freistil','800m Freistil','100m Rücken','200m Rücken','100m Brust','200m Brust','100m Schmetterling','200m Schmetterling','200m Lagen','400m Lagen']),
  ('SP03','Judo','JU','Kampfsport',ARRAY['Einzel','Mannschaft','Kata']),
  ('SP04','Fußball','FB','Mannschaftssport',ARRAY['Mannschaft','Futsal']),
  ('SP05','Turnen','TU','Turnen',ARRAY['Boden','Reck','Barren','Ringe','Pferd','Sprung','Mehrkampf','Rhythmische Sportgymnastik']),
  ('SP06','Radsport','RS','Radsport',ARRAY['Straße','Bahn','MTB','BMX']),
  ('SP07','Boxen','BX','Kampfsport',ARRAY['Einzel']),
  ('SP08','Rudern','RU','Wassersport',ARRAY['Einer','Zweier','Vierer','Achter']),
  ('SP09','Volleyball','VB','Mannschaftssport',ARRAY['Mannschaft','Beach-Volleyball']),
  ('SP10','Ringen','RI','Kampfsport',ARRAY['Freistil','Griechisch-Römisch'])
ON CONFLICT (id) DO NOTHING;

-- ── Nutzer einfügen (Passwort: Admin1234!) ───────────────────
-- SHA-256 von "Admin1234!": 5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6
INSERT INTO slzb_nutzer (id, username, password_hash, anzeigename, rolle) VALUES
  ('admin1',       'admin',        '5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6', 'Administrator',    'admin'),
  ('trainer1',     'trainer1',     '5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6', 'K. Trainer',       'trainer'),
  ('redaktion1',   'redaktion1',   '5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6', 'R. Redakteur',     'redaktion'),
  ('oea1',         'oea1',         '5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6', 'Ö. Öffentlichkeit','oea'),
  ('datenschutz1', 'datenschutz1', '5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6', 'D. Datenschutz',   'datenschutz')
ON CONFLICT (id) DO NOTHING;

-- ── Synthetische Testdaten: Schüler ──────────────────────────
INSERT INTO slzb_schueler (id, schueler_nr, vorname, nachname, anzeigename, klasse, sportart_id, gruppe, ew_foto, ew_print, ew_homepage, ew_digital_signage, ew_social_media, ew_einzeldarstellung, ew_klasse, ew_gueltig_bis) VALUES
  ('SLZB-000001','SLZB-000001','Max','Mustermann','M. Mustermann','10a','SP01','Kader B',true,true,true,true,false,true,false,'2027-08-31'),
  ('SLZB-000002','SLZB-000002','Lena','Beispiel','L. Beispiel','11b','SP01','Kader A',true,true,true,true,true,true,true,'2027-08-31'),
  ('SLZB-000003','SLZB-000003','Tom','Testperson','T. Testperson','9c','SP01','Schüler',false,false,false,false,false,false,false,'2027-08-31'),
  ('SLZB-000004','SLZB-000004','Anna','Probe','A. Probe','12a','SP01','Kader A',true,true,false,false,false,false,false,'2026-12-31'),
  ('SLZB-000005','SLZB-000005','Jonas','Beispielmann','J. Beispielmann','10b','SP02','Kader B',true,true,true,true,true,true,true,'2027-08-31'),
  ('SLZB-000006','SLZB-000006','Sara','Musterfrau','S. Musterfrau','11a','SP03','Kader A',true,true,true,false,false,true,true,'2027-08-31'),
  ('SLZB-000007','SLZB-000007','Felix','Proband','F. Proband','9a','SP04','Schüler',true,false,false,false,false,false,false,'2027-08-31'),
  ('SLZB-000008','SLZB-000008','Marie','Testfall','M. Testfall','12b','SP05','Perspektivkader',true,true,true,true,false,true,true,'2027-08-31')
ON CONFLICT (id) DO NOTHING;

-- ── Synthetische Testdaten: Wettbewerbe ──────────────────────
INSERT INTO slzb_wettbewerbe (id, name, veranstalter, ort, beginn, ende, ebene, sportart_id) VALUES
  ('WB01','Berliner Landesmeisterschaften Leichtathletik 2026','Leichtathletik-Verband Berlin','Friedrich-Ludwig-Jahn-Sportpark Berlin','2026-03-14','2026-03-15','Landesebene','SP01'),
  ('WB02','Deutsche Schülermeisterschaften Schwimmen 2026','Deutscher Schwimm-Verband','Schwimmhalle Musterstadt','2026-04-20','2026-04-21','Bundesebene','SP02'),
  ('WB03','Berliner Meisterschaften Judo 2026','Berliner Judo-Verband','Sporthalle Mitte','2026-02-08','2026-02-09','Landesebene','SP03'),
  ('WB04','Jugend trainiert für Olympia – Fußball Berlin 2026','Berliner Senat für Bildung','Sportanlage Tempelhof','2026-05-10','2026-05-10','Bezirk','SP04'),
  ('WB05','Bundesfinale Jugend trainiert – Turnen 2026','Schulsport Deutschland','Berlin','2026-09-01','2026-09-05','Bundesebene','SP05'),
  ('WB06','Bezirksmeisterschaften Leichtathletik Pankow 2026','Bezirksamt Pankow','Sportplatz Pankow','2026-02-20','2026-02-20','Bezirk','SP01')
ON CONFLICT (id) DO NOTHING;

-- ── Kontrolle ────────────────────────────────────────────────
SELECT 'slzb_sportarten' as tabelle, COUNT(*) as zeilen FROM slzb_sportarten
UNION ALL SELECT 'slzb_nutzer', COUNT(*) FROM slzb_nutzer
UNION ALL SELECT 'slzb_schueler', COUNT(*) FROM slzb_schueler
UNION ALL SELECT 'slzb_wettbewerbe', COUNT(*) FROM slzb_wettbewerbe;