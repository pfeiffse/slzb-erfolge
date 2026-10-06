-- ============================================================
-- SLZB-Erfolge – Schüler-Import
-- Mapping: Ihre Kürzel → Supabase Sportart-IDs
-- ============================================================

-- ── Kürzel-Mapping ───────────────────────────────────────────
-- Ihre Kürzel → Supabase ID
-- BA  → SP01  Basketball
-- BV  → SP02  Beachvolleyball  (bei Ihnen: BS oder BV?)
-- BO  → SP03  Bogenschießen
-- BX  → SP04  Boxen            (bei Ihnen: BX oder FU=Fußball?)
-- EH  → SP05  Eishockey        (bei Ihnen: EH oder HA=Handball?)
-- EK  → SP06  Eiskunstlauf
-- ES  → SP07  Eisschnelllauf
-- GH  → SP08  Gewichtheben
-- HA  → SP09  Handball
-- JU  → SP10  Judo
-- LA  → SP11  Leichtathletik
-- PS  → SP12  Para-Schwimmen
-- RA  → SP13  Radsport         (bei Ihnen: RA statt RS)
-- SW  → SP14  Schwimmen
-- TU  → SP15  Turnen (männlich)
-- VB  → SP16  Volleyball
-- WS  → SP17  Wasserspringen
-- FU  → kein Match → Fußball nicht in Ihrer Sportartliste!
-- BS  → kein Match → Beachvolleyball? (SP02 hat Kürzel BV)

-- ── Schritt 1: Kürzel in Supabase anpassen ───────────────────
-- Damit Ihre Kürzel direkt funktionieren, passen wir die
-- Kürzel in Supabase an Ihre bestehenden Abkürzungen an:

UPDATE slzb_sportarten SET kuerzel = 'BA'  WHERE id = 'SP01'; -- Basketball
UPDATE slzb_sportarten SET kuerzel = 'BS'  WHERE id = 'SP02'; -- Beachvolleyball (BS statt BV)
UPDATE slzb_sportarten SET kuerzel = 'BO'  WHERE id = 'SP03'; -- Bogenschießen
UPDATE slzb_sportarten SET kuerzel = 'BX'  WHERE id = 'SP04'; -- Boxen
UPDATE slzb_sportarten SET kuerzel = 'EH'  WHERE id = 'SP05'; -- Eishockey
UPDATE slzb_sportarten SET kuerzel = 'EK'  WHERE id = 'SP06'; -- Eiskunstlauf
UPDATE slzb_sportarten SET kuerzel = 'ES'  WHERE id = 'SP07'; -- Eisschnelllauf
UPDATE slzb_sportarten SET kuerzel = 'GH'  WHERE id = 'SP08'; -- Gewichtheben
UPDATE slzb_sportarten SET kuerzel = 'HA'  WHERE id = 'SP09'; -- Handball
UPDATE slzb_sportarten SET kuerzel = 'JU'  WHERE id = 'SP10'; -- Judo
UPDATE slzb_sportarten SET kuerzel = 'LA'  WHERE id = 'SP11'; -- Leichtathletik
UPDATE slzb_sportarten SET kuerzel = 'PS'  WHERE id = 'SP12'; -- Para-Schwimmen
UPDATE slzb_sportarten SET kuerzel = 'RA'  WHERE id = 'SP13'; -- Radsport (RA statt RS)
UPDATE slzb_sportarten SET kuerzel = 'SW'  WHERE id = 'SP14'; -- Schwimmen
UPDATE slzb_sportarten SET kuerzel = 'TU'  WHERE id = 'SP15'; -- Turnen (männlich)
UPDATE slzb_sportarten SET kuerzel = 'VB'  WHERE id = 'SP16'; -- Volleyball
UPDATE slzb_sportarten SET kuerzel = 'WS'  WHERE id = 'SP17'; -- Wasserspringen

-- ── Schritt 2: Hilfsfunktion – Kürzel → Sportart-ID ──────────
-- Diese Funktion wandelt Ihr Kürzel in die Supabase-ID um:
CREATE OR REPLACE FUNCTION kuerzel_zu_sportart_id(k TEXT)
RETURNS TEXT AS $$
  SELECT id FROM slzb_sportarten WHERE kuerzel = UPPER(k) LIMIT 1;
$$ LANGUAGE SQL;

-- ── Schritt 3: Schüler importieren ───────────────────────────
-- Vorlage – ersetzen Sie die Beispieldaten durch echte Daten
-- Format: (schueler_nr, vorname, nachname, anzeigename, klasse, sportart_kuerzel, jahrgang)

-- WICHTIG: Anzeigename = öffentlich verwendbarer Name gemäß Einwilligung
-- Vorname/Nachname = intern, nie öffentlich exportieren
-- Alle Einwilligungen standardmäßig FALSE (Privacy by Default)

INSERT INTO slzb_schueler (
  id, schueler_nr, vorname, nachname, anzeigename,
  klasse, sportart_id, gruppe,
  ew_foto, ew_print, ew_homepage, ew_digital_signage,
  ew_social_media, ew_einzeldarstellung, ew_klasse,
  ew_gueltig_bis, ew_widerruf
)
SELECT
  schueler_nr,           -- id = schueler_nr
  schueler_nr,
  vorname, nachname,
  -- Anzeigename: Vorname + erster Buchstabe Nachname (anpassbar)
  vorname || ' ' || LEFT(nachname, 1) || '.',
  klasse,
  kuerzel_zu_sportart_id(sportart_kuerzel),
  'Schüler',             -- Gruppe: Standard, später anpassbar
  false, false, false, false, false, false, false,  -- alle Einwilligungen false
  NULL, false
FROM (VALUES
  -- ── HIER IHRE DATEN EINFÜGEN ─────────────────────────────
  -- Format: ('SchuelerNr', 'Vorname', 'Nachname', 'Klasse', 'Kuerzel')
  -- Beispiele (SYNTHETISCH – durch echte Daten ersetzen):
  ('SLZB-100001', 'Max',    'Mustermann', '10a', 'LA'),
  ('SLZB-100002', 'Lena',   'Beispiel',   '11b', 'SW'),
  ('SLZB-100003', 'Tom',    'Testperson', '9c',  'JU'),
  ('SLZB-100004', 'Anna',   'Probe',      '12a', 'VB'),
  ('SLZB-100005', 'Jonas',  'Muster',     '10b', 'BA'),
  ('SLZB-100006', 'Sara',   'Demo',       '11a', 'HA'),
  ('SLZB-100007', 'Felix',  'Beispiel',   '9a',  'EK'),
  ('SLZB-100008', 'Marie',  'Testfall',   '12b', 'TU'),
  ('SLZB-100009', 'Paul',   'Proband',    '10c', 'BO'),
  ('SLZB-100010', 'Lisa',   'Musterfrau', '11c', 'WS')
  -- ── WEITERE ZEILEN HIER EINFÜGEN ─────────────────────────
) AS t(schueler_nr, vorname, nachname, klasse, sportart_kuerzel)
ON CONFLICT (id) DO NOTHING;

-- ── Schritt 4: Kontrolle ─────────────────────────────────────
SELECT
  s.schueler_nr,
  s.anzeigename,
  s.klasse,
  sp.name as sportart,
  sp.kuerzel,
  CASE WHEN sp.id IS NULL THEN '⚠️ Sportart nicht gefunden!' ELSE '✅ OK' END as status
FROM slzb_schueler s
LEFT JOIN slzb_sportarten sp ON s.sportart_id = sp.id
WHERE s.schueler_nr LIKE 'SLZB-1%'
ORDER BY s.klasse, s.nachname;

-- ── Offene Fragen ─────────────────────────────────────────────
-- 1. Was bedeutet "FU" in Ihren Daten? → Fußball ist nicht in der Sportartliste
-- 2. Was bedeutet "BS"? → Beachvolleyball (SP02) oder andere Sportart?
-- 3. Wie lautet Ihre Schüler-ID? (Nummer aus der Spalte "Schüler-ID")
--    → Wird als schueler_nr verwendet