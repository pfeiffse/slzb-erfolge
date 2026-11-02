-- ══════════════════════════════════════════════════════════════
-- RLS-Policies für die competitions-Tabelle
-- In Supabase SQL Editor ausführen
-- ══════════════════════════════════════════════════════════════

-- 1. RLS aktivieren (falls noch nicht aktiv)
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- 2. Bestehende Policies entfernen
DROP POLICY IF EXISTS "competitions_select" ON competitions;
DROP POLICY IF EXISTS "competitions_insert" ON competitions;
DROP POLICY IF EXISTS "competitions_update" ON competitions;
DROP POLICY IF EXISTS "competitions_delete" ON competitions;

-- ══════════════════════════════════════════════════════════════
-- SELECT: Alle authentifizierten Nutzer dürfen lesen
-- (Trainer müssen Wettbewerbe sehen können)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "competitions_select"
ON competitions FOR SELECT
TO authenticated
USING (true);

-- ══════════════════════════════════════════════════════════════
-- INSERT: Trainer, Mitarbeiter, Redaktion, ÖA und Admin
-- dürfen neue Wettbewerbe anlegen
-- (Datenschutz-Rolle braucht das nicht)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "competitions_insert"
ON competitions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('trainer', 'mitarbeiter', 'redaktion', 'oea', 'admin')
  )
);

-- ══════════════════════════════════════════════════════════════
-- UPDATE: Nur Redaktion, ÖA und Admin dürfen Wettbewerbe ändern
-- (Trainer sollen keine bestehenden Wettbewerbe überschreiben)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "competitions_update"
ON competitions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('redaktion', 'oea', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('redaktion', 'oea', 'admin')
  )
);

-- ══════════════════════════════════════════════════════════════
-- DELETE: Nur Admin darf Wettbewerbe löschen
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "competitions_delete"
ON competitions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND active = true
      AND role = 'admin'
  )
);

-- ══════════════════════════════════════════════════════════════
-- Prüfung: Alle Policies anzeigen
-- ══════════════════════════════════════════════════════════════
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'competitions'
ORDER BY cmd;
