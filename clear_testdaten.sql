-- Synthetische Testdaten löschen
-- ACHTUNG: Nur ausführen wenn keine echten Daten vorhanden sind!

-- Alle Achievements löschen (außer echten)
-- Prüfe zuerst welche Daten vorhanden sind:
SELECT id, title, status, created_at 
FROM achievements 
ORDER BY created_at 
LIMIT 20;

-- Wenn alle synthetisch sind, dann löschen:
-- DELETE FROM achievements WHERE TRUE;
-- DELETE FROM achievement_participants WHERE TRUE;
-- DELETE FROM achievement_media WHERE TRUE;
-- DELETE FROM achievement_status_history WHERE TRUE;
