-- Fix: UPDATE-Policy für voting_candidates
-- Aktuell fehlt eine UPDATE-Policy → Updates werden still ignoriert

-- Bestehende Policies anzeigen
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'voting_candidates';

-- UPDATE-Policy hinzufügen
CREATE POLICY voting_candidates_update ON voting_candidates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM voting_campaigns c
      WHERE c.id = voting_candidates.campaign_id
        AND (c.erstellt_von = auth.uid()
          OR slzb_has_role(ARRAY['redaktion'::app_role,'oea'::app_role,'admin'::app_role,'schueler'::app_role]))
    )
  );

-- Prüfen
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'voting_candidates';
