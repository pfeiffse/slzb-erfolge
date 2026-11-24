-- ══════════════════════════════════════════════════════════════
-- Fix: Soft-Delete RLS-Policy für achievements
-- Problem: achievements_update blockiert das Setzen von deleted_at
-- ══════════════════════════════════════════════════════════════

-- 1. Bestehende Update-Policy löschen
DROP POLICY IF EXISTS achievements_update ON achievements;

-- 2. Neue Update-Policy: erlaubt auch Soft-Delete (deleted_at setzen)
CREATE POLICY achievements_update ON achievements
  FOR UPDATE
  USING (
    slzb_user_active() AND (
      -- Eigene Meldungen: Trainer/Mitarbeiter/Schüler können eigene bearbeiten
      (reporter_id = auth.uid() AND slzb_has_role(ARRAY['trainer','mitarbeiter','schueler','redaktion','oea','admin']))
      OR
      -- Redaktion/OEA/Admin können alle bearbeiten (auch soft-delete)
      slzb_has_role(ARRAY['redaktion','oea','datenschutz','admin'])
    )
  )
  WITH CHECK (
    slzb_user_active() AND (
      (reporter_id = auth.uid() AND slzb_has_role(ARRAY['trainer','mitarbeiter','schueler','redaktion','oea','admin']))
      OR
      slzb_has_role(ARRAY['redaktion','oea','datenschutz','admin'])
    )
  );

-- 3. Prüfen ob Policy korrekt angelegt wurde
SELECT policyname, cmd, 
  LEFT(qual, 80) as qual_preview,
  LEFT(with_check, 80) as with_check_preview
FROM pg_policies 
WHERE tablename = 'achievements' AND cmd = 'UPDATE';
