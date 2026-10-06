-- ============================================================
-- SLZB-Erfolge – Sportarten & Trainer aktualisieren
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── Schritt 1: Abhängigkeiten zuerst bereinigen ───────────────
-- Wettbewerbe: Sportart-Referenz aufheben
UPDATE slzb_wettbewerbe SET sportart_id = NULL;
-- Schüler: Sportart-Referenz aufheben
UPDATE slzb_schueler SET sportart_id = NULL;
-- Alte Sportarten löschen
DELETE FROM slzb_sportarten;

-- ── Schritt 2: Neue Sportarten einfügen ──────────────────────
INSERT INTO slzb_sportarten (id, name, kuerzel, kategorie, disziplinen) VALUES
  ('SP01','Basketball',      'BA','Mannschaftssport', ARRAY['Mannschaft']),
  ('SP02','Beachvolleyball', 'BV','Mannschaftssport', ARRAY['Mannschaft','Mixed']),
  ('SP03','Bogenschießen',   'BO','Leichtathletik',   ARRAY['Recurve','Compound','Blankbogen']),
  ('SP04','Boxen',           'BX','Kampfsport',       ARRAY['Einzel']),
  ('SP05','Eishockey',       'EH','Mannschaftssport', ARRAY['Mannschaft']),
  ('SP06','Eiskunstlauf',    'EK','Turnen',           ARRAY['Einzel','Paarlauf','Eistanz']),
  ('SP07','Eisschnelllauf',  'ES','Leichtathletik',   ARRAY['500m','1000m','1500m','3000m','5000m','10000m','Massenstart']),
  ('SP08','Gewichtheben',    'GH','Kampfsport',       ARRAY['Reißen','Stoßen','Zweikampf']),
  ('SP09','Handball',        'HB','Mannschaftssport', ARRAY['Mannschaft']),
  ('SP10','Judo',            'JU','Kampfsport',       ARRAY['Einzel','Mannschaft','Kata']),
  ('SP11','Leichtathletik',  'LA','Leichtathletik',   ARRAY['100m Sprint','200m Sprint','400m','800m','1500m','5000m','10000m','110m Hürden','400m Hürden','Hochsprung','Weitsprung','Dreisprung','Stabhochsprung','Kugelstoßen','Diskuswurf','Speerwurf','Hammerwurf','4×100m Staffel','4×400m Staffel','Zehnkampf','Siebenkampf']),
  ('SP12','Para-Schwimmen',  'PS','Wassersport',      ARRAY['50m Freistil','100m Freistil','200m Freistil','400m Freistil','100m Rücken','100m Brust','100m Schmetterling','200m Lagen']),
  ('SP13','Radsport',        'RS','Radsport',         ARRAY['Straße','Bahn','MTB','BMX','Zeitfahren']),
  ('SP14','Schwimmen',       'SW','Wassersport',      ARRAY['50m Freistil','100m Freistil','200m Freistil','400m Freistil','800m Freistil','1500m Freistil','100m Rücken','200m Rücken','100m Brust','200m Brust','100m Schmetterling','200m Schmetterling','200m Lagen','400m Lagen']),
  ('SP15','Turnen (männlich)','TM','Turnen',          ARRAY['Boden','Reck','Barren','Ringe','Pferd','Sprung','Mehrkampf']),
  ('SP16','Volleyball',      'VB','Mannschaftssport', ARRAY['Mannschaft']),
  ('SP17','Wasserspringen',  'WS','Wassersport',      ARRAY['1m Brett','3m Brett','10m Turm','Synchron 3m','Synchron 10m']);

-- ── Schritt 2b: Wettbewerbe mit neuen Sportarten verknüpfen ─────
UPDATE slzb_wettbewerbe SET sportart_id='SP11' WHERE name ILIKE '%Leichtathletik%';
UPDATE slzb_wettbewerbe SET sportart_id='SP14' WHERE name ILIKE '%Schwimmen%';
UPDATE slzb_wettbewerbe SET sportart_id='SP10' WHERE name ILIKE '%Judo%';
UPDATE slzb_wettbewerbe SET sportart_id='SP09' WHERE name ILIKE '%Fußball%' OR name ILIKE '%Fussball%';
UPDATE slzb_wettbewerbe SET sportart_id='SP15' WHERE name ILIKE '%Turnen%';

-- ── Schritt 3: Alte Trainer-Zugänge entfernen ─────────────────
DELETE FROM slzb_nutzer
WHERE username IN (
  'leichtathletik','schwimmen','judo','fussball','turnen',
  'radsport','boxen','rudern','volleyball','ringen'
);

-- ── Schritt 4: Neue Trainer-Zugänge anlegen (Passwort: 1234) ──
-- SHA-256 von "1234": 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
INSERT INTO slzb_nutzer (id, username, password_hash, anzeigename, rolle, aktiv) VALUES
  ('t_ba','basketball',      '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Basketball',       'trainer',true),
  ('t_bv','beachvolleyball', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Beachvolleyball',  'trainer',true),
  ('t_bo','bogenschiessen',  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Bogenschießen',    'trainer',true),
  ('t_bx','boxen',           '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Boxen',            'trainer',true),
  ('t_eh','eishockey',       '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Eishockey',        'trainer',true),
  ('t_ek','eiskunstlauf',    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Eiskunstlauf',     'trainer',true),
  ('t_es','eisschnelllauf',  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Eisschnelllauf',   'trainer',true),
  ('t_gh','gewichtheben',    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Gewichtheben',     'trainer',true),
  ('t_hb','handball',        '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Handball',         'trainer',true),
  ('t_ju','judo',            '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Judo',             'trainer',true),
  ('t_la','leichtathletik',  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Leichtathletik',   'trainer',true),
  ('t_ps','para_schwimmen',  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Para-Schwimmen',   'trainer',true),
  ('t_rs','radsport',        '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Radsport',         'trainer',true),
  ('t_sw','schwimmen',       '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Schwimmen',        'trainer',true),
  ('t_tm','turnen_maennlich','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Turnen (männlich)','trainer',true),
  ('t_vb','volleyball',      '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Volleyball',       'trainer',true),
  ('t_ws','wasserspringen',  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Wasserspringen',   'trainer',true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, aktiv=true;

-- ── Kontrolle ────────────────────────────────────────────────
SELECT 'Sportarten: ' || COUNT(*) FROM slzb_sportarten
UNION ALL
SELECT 'Trainer: '    || COUNT(*) FROM slzb_nutzer WHERE rolle='trainer' AND aktiv=true
UNION ALL
SELECT 'Admins: '     || COUNT(*) FROM slzb_nutzer WHERE rolle='admin'   AND aktiv=true;