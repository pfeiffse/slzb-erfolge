-- ============================================================
-- SLZB-Erfolge v3 – Löschen von Meldungen erlauben
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- Löschen für Redaktion, ÖA und Admin erlauben
DROP POLICY IF EXISTS "achievements_delete" ON achievements;
CREATE POLICY "achievements_delete"
ON achievements FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('redaktion', 'oea', 'admin')
  )
);

-- Löschen von Protokolleinträgen (für Admins beim Meldungs-Löschen)
DROP POLICY IF EXISTS "history_delete" ON achievement_status_history;
CREATE POLICY "history_delete"
ON achievement_status_history FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('redaktion', 'oea', 'admin')
  )
);

-- Löschen von Medien-Metadaten
DROP POLICY IF EXISTS "media_delete" ON achievement_media;
CREATE POLICY "media_delete"
ON achievement_media FOR DELETE TO authenticated
USING (
  (uploaded_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('redaktion', 'oea', 'admin')
  )
);

-- Kontrolle
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('achievements','achievement_status_history','achievement_media')
  AND cmd = 'DELETE'
ORDER BY tablename;
