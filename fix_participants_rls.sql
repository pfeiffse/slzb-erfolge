-- ============================================================
-- SLZB-Erfolge v3 – RLS für achievement_participants
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- RLS aktivieren (falls noch nicht aktiv)
ALTER TABLE achievement_participants ENABLE ROW LEVEL SECURITY;

-- Bestehende Policies entfernen
DROP POLICY IF EXISTS "participants_select" ON achievement_participants;
DROP POLICY IF EXISTS "participants_insert" ON achievement_participants;
DROP POLICY IF EXISTS "participants_update" ON achievement_participants;
DROP POLICY IF EXISTS "participants_delete" ON achievement_participants;

-- SELECT: Alle authentifizierten Nutzer dürfen lesen
CREATE POLICY "participants_select"
ON achievement_participants FOR SELECT
TO authenticated
USING (true);

-- INSERT: Trainer, Mitarbeiter, Redaktion, ÖA und Admin dürfen einfügen
CREATE POLICY "participants_insert"
ON achievement_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('trainer', 'mitarbeiter', 'redaktion', 'oea', 'admin')
  )
);

-- UPDATE: Redaktion, ÖA und Admin dürfen ändern
CREATE POLICY "participants_update"
ON achievement_participants FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('redaktion', 'oea', 'admin')
  )
);

-- DELETE: Eigene Einträge oder Redaktion/ÖA/Admin dürfen löschen
-- (Wichtig: Trainer müssen ihre eigenen Beteiligte beim Bearbeiten löschen können)
CREATE POLICY "participants_delete"
ON achievement_participants FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM achievements a
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE a.id = achievement_participants.achievement_id
      AND p.active = true
      AND (
        a.reporter_id = auth.uid()  -- eigene Meldung
        OR p.role IN ('redaktion', 'oea', 'admin')  -- Redaktion/Admin
      )
  )
);

-- Kontrolle
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'achievement_participants'
ORDER BY cmd;