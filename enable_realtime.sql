-- ============================================================
-- SLZB-Erfolge v3 – Supabase Realtime aktivieren
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- Realtime für die wichtigsten Tabellen aktivieren
-- (Fehler "already member" kann ignoriert werden)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE achievements;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'achievements: bereits in Realtime (OK)';
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE achievement_status_history;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'achievement_status_history: bereits in Realtime (OK)';
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE achievement_media;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'achievement_media: bereits in Realtime (OK)';
  END;
END $$;

-- Kontrolle: Welche Tabellen haben Realtime?
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename LIKE '%achievement%';
