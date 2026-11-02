-- ============================================================
-- SLZB-Erfolge v3 – Soft-Delete System
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Spalten hinzufügen
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by  UUID        DEFAULT NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_by_name TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT      DEFAULT NULL;

-- 2. Index für Performance
CREATE INDEX IF NOT EXISTS idx_achievements_deleted_at
  ON achievements(deleted_at) WHERE deleted_at IS NULL;

-- 3. RLS: Gelöschte Meldungen ausblenden (außer für Admins)
-- Bestehende SELECT-Policy anpassen
DROP POLICY IF EXISTS "achievements_select" ON achievements;
DROP POLICY IF EXISTS "auth_select" ON achievements;

-- Normale Nutzer sehen nur nicht-gelöschte Meldungen
CREATE POLICY "achievements_select_active"
ON achievements FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role = 'admin'
  )
);

-- 4. DELETE: Nur Admins dürfen wirklich löschen (Hard-Delete)
DROP POLICY IF EXISTS "achievements_delete" ON achievements;
CREATE POLICY "achievements_delete_admin_only"
ON achievements FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role = 'admin'
  )
);

-- 5. UPDATE: Soft-Delete über UPDATE (deleted_at setzen)
-- Trainer dürfen eigene Meldungen soft-deleten
-- Redaktion/ÖA/Admin dürfen alle soft-deleten
DROP POLICY IF EXISTS "achievements_update" ON achievements;
CREATE POLICY "achievements_update"
ON achievements FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL
  AND (
    reporter_id = auth.uid()  -- eigene Meldung (Trainer)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND active = true
        AND role IN ('redaktion', 'oea', 'admin')
    )
  )
)
WITH CHECK (true);

-- 6. Kontrolle
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'achievements'
ORDER BY cmd, policyname;

-- 7. Spalten prüfen
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'achievements'
  AND column_name IN ('deleted_at','deleted_by','deleted_by_name','delete_reason')
ORDER BY column_name;
