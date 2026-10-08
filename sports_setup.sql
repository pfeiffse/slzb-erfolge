-- ============================================================
-- SLZB-Erfolge v3 – Sports-Tabelle befüllen
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- Prüfe Struktur der sports-Tabelle
-- SELECT column_name FROM information_schema.columns WHERE table_name='sports';

-- Alle SLZB-Sportarten einfügen (IDs identisch mit lokaler data.js)
INSERT INTO sports (id, name, code, category, active, disciplines) VALUES
  ('SP01','Basketball',      'BA','Mannschaftssport', true, ARRAY['Mannschaft']),
  ('SP02','Beachvolleyball', 'BV','Mannschaftssport', true, ARRAY['Mannschaft','Mixed']),
  ('SP03','Bogenschießen',   'BS','Leichtathletik',   true, ARRAY['Recurve','Compound','Blankbogen']),
  ('SP04','Boxen',           'BX','Kampfsport',       true, ARRAY['Einzel']),
  ('SP05','Eishockey',       'EH','Mannschaftssport', true, ARRAY['Mannschaft']),
  ('SP06','Eiskunstlauf',    'EK','Turnen',           true, ARRAY['Einzel','Paarlauf','Eistanz']),
  ('SP07','Eisschnelllauf',  'ES','Leichtathletik',   true, ARRAY['500m','1000m','1500m','3000m','5000m','10000m','Massenstart']),
  ('SP08','Gewichtheben',    'GH','Kampfsport',       true, ARRAY['Reißen','Stoßen','Zweikampf']),
  ('SP09','Handball',        'HB','Mannschaftssport', true, ARRAY['Mannschaft']),
  ('SP10','Judo',            'JU','Kampfsport',       true, ARRAY['Einzel','Mannschaft','Kata']),
  ('SP11','Leichtathletik',  'LA','Leichtathletik',   true, ARRAY['100m Sprint','200m Sprint','400m','800m','1500m','5000m','10000m','110m Hürden','400m Hürden','Hochsprung','Weitsprung','Dreisprung','Stabhochsprung','Kugelstoßen','Diskuswurf','Speerwurf','Hammerwurf','4×100m Staffel','4×400m Staffel','Zehnkampf','Siebenkampf']),
  ('SP12','Para-Schwimmen',  'PS','Wassersport',      true, ARRAY['50m Freistil','100m Freistil','200m Freistil','400m Freistil','100m Rücken','100m Brust','100m Schmetterling','200m Lagen']),
  ('SP13','Radsport',        'RA','Radsport',         true, ARRAY['Straße','Bahn','MTB','BMX','Zeitfahren']),
  ('SP14','Schwimmen',       'SW','Wassersport',      true, ARRAY['50m Freistil','100m Freistil','200m Freistil','400m Freistil','800m Freistil','1500m Freistil','100m Rücken','200m Rücken','100m Brust','200m Brust','100m Schmetterling','200m Schmetterling','200m Lagen','400m Lagen']),
  ('SP15','Turnen (männlich)','TM','Turnen',          true, ARRAY['Boden','Reck','Barren','Ringe','Pferd','Sprung','Mehrkampf']),
  ('SP16','Volleyball',      'VB','Mannschaftssport', true, ARRAY['Mannschaft']),
  ('SP17','Wasserspringen',  'WS','Wassersport',      true, ARRAY['1m Brett','3m Brett','10m Turm','Synchron 3m','Synchron 10m']),
  ('SP18','Fußball',         'FU','Mannschaftssport', true, ARRAY['Mannschaft','Futsal'])
ON CONFLICT (id) DO UPDATE SET 
  name=EXCLUDED.name, code=EXCLUDED.code, 
  category=EXCLUDED.category, disciplines=EXCLUDED.disciplines;

-- Kontrolle
SELECT id, name FROM sports ORDER BY name;