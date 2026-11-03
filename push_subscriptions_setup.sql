-- ============================================================
-- SLZB-Erfolge v3 – Push-Benachrichtigungen
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- Tabelle für Browser-Push-Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription TEXT NOT NULL,  -- JSON der Browser-Subscription
  user_agent   TEXT,           -- Browser/Gerät Info
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)              -- Ein Abonnement pro Nutzer (letztes Gerät)
);

-- RLS aktivieren
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Eigene Subscription lesen/schreiben
DROP POLICY IF EXISTS "push_own_select" ON push_subscriptions;
CREATE POLICY "push_own_select" ON push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_own_upsert" ON push_subscriptions;
CREATE POLICY "push_own_upsert" ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_own_update" ON push_subscriptions;
CREATE POLICY "push_own_update" ON push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_own_delete" ON push_subscriptions;
CREATE POLICY "push_own_delete" ON push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admin/Service kann alle lesen (für Edge Function mit Service Role)
-- Wird über Service Role Key in der Edge Function gemacht

-- Kontrolle
SELECT tablename, policyname, cmd
FROM pg_policies WHERE tablename = 'push_subscriptions'
ORDER BY cmd;
