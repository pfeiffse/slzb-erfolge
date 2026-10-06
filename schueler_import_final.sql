-- ============================================================
-- SLZB-Erfolge – Schüler-Import (Final)
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── Schritt 1: Kürzel korrigieren + Fußball ergänzen ─────────

-- Bogenschießen: BO → BS (Ihr Kürzel)
UPDATE slzb_sportarten SET kuerzel = 'BS' WHERE id = 'SP03';

-- Radsport: RS → RA (Ihr Kürzel)
UPDATE slzb_sportarten SET kuerzel = 'RA' WHERE id = 'SP13';

-- Fußball neu anlegen
INSERT INTO slzb_sportarten (id, name, kuerzel, kategorie, disziplinen, aktiv)
VALUES ('SP18', 'Fußball', 'FU', 'Mannschaftssport', ARRAY['Mannschaft','Futsal'], true)
ON CONFLICT (id) DO NOTHING;

-- Trainer für Fußball anlegen (Passwort: 1234)
INSERT INTO slzb_nutzer (id, username, password_hash, anzeigename, rolle, aktiv)
VALUES ('t_fu', 'fussball', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Fußball', 'trainer', true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, aktiv=true;

-- ── Schritt 2: Hilfsfunktion Kürzel → ID ─────────────────────
CREATE OR REPLACE FUNCTION kuerzel_zu_id(k TEXT)
RETURNS TEXT AS $$
  SELECT id FROM slzb_sportarten WHERE kuerzel = UPPER(TRIM(k)) LIMIT 1;
$$ LANGUAGE SQL;

-- ── Schritt 3: Schüler importieren ───────────────────────────
-- Anzeigename-Format: "Vorname N." (Nachname abgekürzt)
-- Alle Einwilligungen: false (Privacy by Default)
-- Schüler-ID: Ihre reine Zahl, wird als schueler_nr gespeichert

INSERT INTO slzb_schueler (
  id, schueler_nr,
  vorname, nachname, anzeigename,
  klasse, sportart_id, gruppe,
  ew_foto, ew_print, ew_homepage, ew_digital_signage,
  ew_social_media, ew_einzeldarstellung, ew_klasse,
  ew_gueltig_bis, ew_widerruf
)
SELECT
  'SLZB-' || LPAD(schueler_nr::text, 6, '0'),
  schueler_nr::text,
  vorname,
  nachname,
  vorname || ' ' || LEFT(nachname, 1) || '.',
  klasse,
  kuerzel_zu_id(sportart_kuerzel),
  'Schüler',
  false, false, false, false, false, false, false,
  NULL, false
FROM (VALUES
-- ════════════════════════════════════════════════════════════
-- HIER IHRE DATEN EINFÜGEN
-- Format: (SchuelerNr_als_Zahl, 'Vorname', 'Nachname', 'Klasse', 'Kuerzel')
-- Beispiel:
--   (12345, 'Max',  'Mustermann', '10a', 'LA'),
--   (12346, 'Lena', 'Beispiel',   '11b', 'SW'),
-- ════════════════════════════════════════════════════════════

-- SYNTHETISCHE BEISPIELDATEN (durch echte ersetzen):
  (10001, 'Max',    'Mustermann',  '10a', 'LA'),
  (10002, 'Lena',   'Beispiel',    '11b', 'SW'),
  (10003, 'Tom',    'Testperson',  '9c',  'JU'),
  (10004, 'Anna',   'Probe',       '12a', 'VB'),
  (10005, 'Jonas',  'Muster',      '10b', 'BA'),
  (10006, 'Sara',   'Demo',        '11a', 'HA'),
  (10007, 'Felix',  'Beispiel',    '9a',  'EK'),
  (10008, 'Marie',  'Testfall',    '12b', 'TU'),
  (10009, 'Paul',   'Proband',     '10c', 'BS'),
  (10010, 'Lisa',   'Musterfrau',  '11c', 'WS'),
  (10011, 'Kai',    'Sportler',    '9b',  'ES'),
  (10012, 'Nina',   'Athletin',    '10d', 'RA'),
  (10013, 'Ben',    'Kicker',      '11d', 'FU'),
  (10014, 'Mia',    'Volleyerin',  '12c', 'VB'),
  (10015, 'Leon',   'Judoka',      '9d',  'JU')

) AS t(schueler_nr, vorname, nachname, klasse, sportart_kuerzel)
ON CONFLICT (id) DO NOTHING;

-- ── Schritt 4: Kontrolle ─────────────────────────────────────
SELECT
  s.schueler_nr                                    AS "Nr",
  s.anzeigename                                    AS "Anzeigename",
  s.klasse                                         AS "Klasse",
  sp.kuerzel                                       AS "Kürzel",
  sp.name                                          AS "Sportart",
  CASE
    WHEN sp.id IS NULL THEN '⚠️ Sportart nicht gefunden!'
    ELSE '✅ OK'
  END                                              AS "Status"
FROM slzb_schueler s
LEFT JOIN slzb_sportarten sp ON s.sportart_id = sp.id
ORDER BY s.klasse, s.nachname;

-- ── Vollständiges Kürzel-Mapping zur Referenz ─────────────────
-- BA → Basketball       (SP01)
-- BS → Bogenschießen    (SP03)
-- EK → Eiskunstlauf     (SP06)
-- ES → Eisschnelllauf   (SP07)
-- FU → Fußball          (SP18) ← neu
-- HA → Handball         (SP09)
-- JU → Judo             (SP10)
-- LA → Leichtathletik   (SP11)
-- RA → Radsport         (SP13)
-- SW → Schwimmen        (SP14)
-- TU → Turnen (männlich)(SP15)
-- VB → Volleyball       (SP16)
-- WS → Wasserspringen   (SP17)