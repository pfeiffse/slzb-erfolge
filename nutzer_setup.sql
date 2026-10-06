-- ============================================================
-- SLZB-Erfolge – Nutzerverwaltung
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── Schritt 1: Demo-Nutzer deaktivieren ──────────────────────
UPDATE slzb_nutzer SET aktiv = false
WHERE username IN ('trainer1','redaktion1','oea1','datenschutz1');
-- Hinweis: 'admin' bleibt vorerst aktiv bis neue Admins bestätigt sind

-- ── Schritt 2: Echte Nutzer anlegen ──────────────────────────

-- Admins
INSERT INTO slzb_nutzer (id, username, password_hash, anzeigename, rolle, aktiv) VALUES
  ('bueh1', 'bueh', '3795d7ae4e6e172d381f7aaab441787aba8da52e25e715fd66a3b41c1fcb92dc', 'Bueh', 'admin',     true),
  ('pfe1',  'pfe',  '7f12c71d6f935f73b3dd1bda5bcd7cd34282b05ee13f997d8465682919cfa0b5', 'Pfe',  'admin',     true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, aktiv=true;

-- Öffentlichkeitsarbeit
INSERT INTO slzb_nutzer (id, username, password_hash, anzeigename, rolle, aktiv) VALUES
  ('str1', 'str', '93f4f4262a091cb4a8d8b317488f611a740854cdc4220dee02df21523f2563e8', 'Str', 'oea', true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, aktiv=true;

-- Redaktion
INSERT INTO slzb_nutzer (id, username, password_hash, anzeigename, rolle, aktiv) VALUES
  ('unt1', 'unt', 'a4886e3310aa045745970ff1b858853ecd1470c0041e3653311bb1f236e609a8', 'Unt', 'redaktion', true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, aktiv=true;

-- Trainer je Sportart (Passwort: 1234)
INSERT INTO slzb_nutzer (id, username, password_hash, anzeigename, rolle, aktiv) VALUES
  ('t_la',  'leichtathletik', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Leichtathletik', 'trainer', true),
  ('t_sw',  'schwimmen',      '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Schwimmen',      'trainer', true),
  ('t_ju',  'judo',           '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Judo',           'trainer', true),
  ('t_fb',  'fussball',       '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Fußball',        'trainer', true),
  ('t_tu',  'turnen',         '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Turnen',         'trainer', true),
  ('t_rs',  'radsport',       '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Radsport',       'trainer', true),
  ('t_bx',  'boxen',          '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Boxen',          'trainer', true),
  ('t_ru',  'rudern',         '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Rudern',         'trainer', true),
  ('t_vb',  'volleyball',     '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Volleyball',     'trainer', true),
  ('t_ri',  'ringen',         '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Ringen',         'trainer', true)
ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, aktiv=true;

-- ── Schritt 3: Demo-Admin deaktivieren (NACH Bestätigung!) ───
-- Erst ausführen wenn Sie sich mit bueh oder pfe erfolgreich angemeldet haben:
-- UPDATE slzb_nutzer SET aktiv = false WHERE username = 'admin';

-- ── Kontrolle ────────────────────────────────────────────────
SELECT username, anzeigename, rolle,
       CASE WHEN aktiv THEN '✅ Aktiv' ELSE '❌ Inaktiv' END as status
FROM slzb_nutzer
ORDER BY rolle, username;