-- ══════════════════════════════════════════════════════════════
-- Fix: Soft-Delete RLS-Policy für achievements (v2)
-- Fehler: "new row violates row-level security policy"
-- Ursache: WITH CHECK verhindert das Setzen von deleted_at
-- ══════════════════════════════════════════════════════════════

-- 1. Bestehende Update-Policy anzeigen (zur Diagnose)
SELECT policyname, cmd, 
  LEFT(qual::text, 120) as qual,
  LEFT(with_check::text, 120) as with_check
FROM pg_policies 
WHERE tablename = 'achievements' AND cmd = 'UPDATE';

-- 2. Alte Policy löschen
DROP POLICY IF EXISTS achievements_update ON achievements;

-- 3. Neue Policy: erlaubt UPDATE ohne deleted_at-Einschränkung in WITH CHECK
-- QUAL (wer darf updaten): aktive Nutzer die Eigentümer sind ODER Redaktion/Admin
-- WITH CHECK (was darf gesetzt werden): keine Einschränkung auf deleted_at
CREATE POLICY achievements_update ON achievements
  FOR UPDATE
  USING (
    slzb_user_active() AND (
      reporter_id = auth.uid()
      OR slzb_has_role(ARRAY['redaktion','oea','datenschutz','admin'])
    )
  )
  WITH CHECK (
    slzb_user_active() AND (
      reporter_id = auth.uid()
      OR slzb_has_role(ARRAY['redaktion','oea','datenschutz','admin'])
    )
  );

-- 4. Prüfen
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'achievements';
