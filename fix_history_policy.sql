-- ============================================================
-- SLZB-Erfolge v3 – RLS für achievement_status_history
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

ALTER TABLE achievement_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_insert_history" ON achievement_status_history;
CREATE POLICY "auth_insert_history" ON achievement_status_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_history" ON achievement_status_history;
CREATE POLICY "auth_select_history" ON achievement_status_history
  FOR SELECT TO authenticated
  USING (true);

-- Kontrolle
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'achievement_status_history';