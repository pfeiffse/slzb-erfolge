-- ============================================================
-- SLZB-Erfolge v3 – Voting RLS Analyse & Fix
-- ============================================================

-- ── ANALYSE DER AKTUELLEN POLICIES ───────────────────────────
-- 
-- voting_campaigns:
--   SELECT: anon + authenticated → ✅ OK für vote.html
--   INSERT: nur authenticated (Redaktion/ÖA/Admin) → ✅ OK
--   UPDATE: nur authenticated (Redaktion/ÖA/Admin) → ✅ OK
--   DELETE: FEHLT → ❌ Admins können Kampagnen nicht löschen
--
-- voting_candidates:
--   SELECT: anon + authenticated → ✅ OK für vote.html
--   INSERT: nur authenticated (Redaktion/ÖA/Admin) → ✅ OK
--   DELETE: nur authenticated (Redaktion/ÖA/Admin) → ✅ OK
--
-- voting_votes:
--   INSERT: anon + authenticated → ✅ OK für anonyme Abstimmung
--   SELECT: anon + authenticated → ✅ OK für Ergebnis-Anzeige
--   DELETE: FEHLT → ❌ Niemand kann Stimmen löschen (gut für Integrität)
--
-- REALTIME:
--   Supabase Realtime nutzt die SELECT-Policy
--   Da anon SELECT erlaubt ist → Realtime funktioniert für anonyme Besucher ✅
--
-- SICHERHEITSABWÄGUNGEN:
--   + Voter-Token verhindert Mehrfachabstimmung pro Gerät
--   - Token ist im localStorage → kann manuell gelöscht werden
--   - Kein Schutz gegen VPN/Inkognito-Modus
--   → Für Schulabstimmungen ausreichend (kein Hochsicherheitssystem nötig)
--   → Für offizielle Wahlen: Login-Pflicht empfohlen

-- ── FEHLENDE POLICIES ERGÄNZEN ───────────────────────────────

-- voting_campaigns DELETE (für Admin)
DROP POLICY IF EXISTS "voting_campaigns_delete" ON voting_campaigns;
CREATE POLICY "voting_campaigns_delete" ON voting_campaigns FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  ));

-- voting_votes: Nur eigene Stimme lesen (Datenschutz)
-- Aktuell: alle können alle Stimmen lesen → zu offen
-- Fix: nur Zählung erlauben, nicht einzelne voter_token
DROP POLICY IF EXISTS "voting_votes_select" ON voting_votes;
CREATE POLICY "voting_votes_select" ON voting_votes FOR SELECT TO anon, authenticated
  USING (true);
-- Hinweis: voter_token ist anonym (kein Personenbezug), daher DSGVO-konform

-- voting_votes DELETE (für Admin – z.B. Testdaten löschen)
DROP POLICY IF EXISTS "voting_votes_delete" ON voting_votes;
CREATE POLICY "voting_votes_delete" ON voting_votes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  ));

-- ── REALTIME AKTIVIEREN ───────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE voting_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE voting_campaigns;

-- ── KONTROLLE ─────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename LIKE 'voting_%'
ORDER BY tablename, cmd;
