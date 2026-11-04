-- ============================================================
-- SLZB-Erfolge v3 – Schüler-Rolle hinzufügen
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- Neue Rolle zur Enum hinzufügen
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'schueler';

-- RLS: Schüler dürfen eigene Meldungen einreichen
-- (bereits durch bestehende Policies abgedeckt wenn role IN ('trainer','schueler',...))

-- Bestehende Policies erweitern die 'trainer' erlauben
-- achievements INSERT
DROP POLICY IF EXISTS "achievements_insert" ON achievements;
CREATE POLICY "achievements_insert" ON achievements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND active = true
        AND role IN ('trainer','mitarbeiter','schueler','redaktion','oea','admin')
    )
  );

-- achievement_participants INSERT
DROP POLICY IF EXISTS "participants_insert" ON achievement_participants;
CREATE POLICY "participants_insert" ON achievement_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND active = true
        AND role IN ('trainer','mitarbeiter','schueler','redaktion','oea','admin')
    )
  );

-- voting_campaigns: Schüler dürfen Abstimmungen SEHEN und abstimmen
-- (bereits durch anon-Policy abgedeckt)

-- Kontrolle
SELECT unnest(enum_range(NULL::app_role))::text AS rolle ORDER BY rolle;
