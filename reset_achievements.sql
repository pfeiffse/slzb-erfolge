-- ══════════════════════════════════════════════════════════════
-- RESET: Alle Testdaten aus achievements löschen
-- In Supabase SQL Editor ausführen
-- ACHTUNG: Dieser Vorgang ist nicht rückgängig zu machen!
-- ══════════════════════════════════════════════════════════════

-- 1. Abhängige Tabellen zuerst leeren
DELETE FROM achievement_media;
DELETE FROM achievement_status_history;
DELETE FROM achievement_participants;

-- 2. Haupttabelle leeren
DELETE FROM achievements;

-- 3. Sequenz zurücksetzen (Erfolgsnummern wieder bei ERF-00000001 starten)
ALTER SEQUENCE IF EXISTS erfolg_seq RESTART WITH 1;

-- 4. Wettbewerbe leeren (wurden automatisch angelegt)
DELETE FROM competitions;

-- 5. Audit-Log für diesen Reset eintragen
INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details)
SELECT 
  id,
  'system_reset',
  'achievements',
  '00000000-0000-0000-0000-000000000000',
  ('{"info": "Alle Testdaten gelöscht. Produktivbetrieb gestartet.", "datum": "' || NOW()::text || '"}')::jsonb
FROM auth.users
WHERE email = 'pfeiffer@slzb.de'
LIMIT 1;

-- 6. Prüfung
SELECT 
  (SELECT COUNT(*) FROM achievements) AS achievements,
  (SELECT COUNT(*) FROM achievement_participants) AS participants,
  (SELECT COUNT(*) FROM achievement_media) AS media,
  (SELECT COUNT(*) FROM achievement_status_history) AS history,
  (SELECT COUNT(*) FROM competitions) AS competitions;
