-- ============================================================
-- SLZB-Erfolge v3 – RLS Policies für Nutzerverwaltung
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- Admins dürfen profiles aktualisieren
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admins dürfen profiles lesen
DROP POLICY IF EXISTS "auth_read_profiles" ON profiles;
CREATE POLICY "auth_read_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Kontrolle profiles
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'profiles';

-- achievement_participants: student_id darf NULL sein (Freitext-Namen)
-- Falls student_id NOT NULL ist, diesen Constraint entfernen:
ALTER TABLE achievement_participants 
  ALTER COLUMN student_id DROP NOT NULL;

-- Kontrolle
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'achievement_participants';