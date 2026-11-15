-- ============================================================
-- SLZB-Erfolge v3 – Migrations-Fix
-- Alle fehlenden Spalten ergänzen
-- Ausführen in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── achievements: fehlende Spalten ───────────────────────────
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by       UUID        DEFAULT NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_by_name  TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delete_reason    TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_url        TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_draft         TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duplicate_flag   BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_note   TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- ── achievement_participants: fehlende Spalten ────────────────
ALTER TABLE achievement_participants
  ADD COLUMN IF NOT EXISTS participant_role TEXT DEFAULT NULL;

-- ── achievement_media: fehlende Spalten ──────────────────────
ALTER TABLE achievement_media
  ADD COLUMN IF NOT EXISTS copyright_holder TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS uploaded_by      UUID DEFAULT NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS file_size        BIGINT DEFAULT NULL;

-- ── voting_candidates: fehlende Spalten ──────────────────────
ALTER TABLE voting_candidates
  ADD COLUMN IF NOT EXISTS storage_path   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'achievement-media';

-- ── push_subscriptions: Tabelle ──────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_own_select" ON push_subscriptions;
CREATE POLICY "push_own_select" ON push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "push_own_upsert" ON push_subscriptions;
CREATE POLICY "push_own_upsert" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "push_own_update" ON push_subscriptions;
CREATE POLICY "push_own_update" ON push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "push_own_delete" ON push_subscriptions;
CREATE POLICY "push_own_delete" ON push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── poster_drafts: Tabelle ────────────────────────────────────
CREATE TABLE IF NOT EXISTS poster_drafts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  typ             TEXT NOT NULL CHECK (typ IN ('a3','bildschirm','social')),
  variante        INTEGER DEFAULT 1,
  format          TEXT DEFAULT 'hochformat',
  version         INTEGER DEFAULT 1,
  parent_id       UUID REFERENCES poster_drafts(id) ON DELETE SET NULL,
  titel           TEXT, athlet TEXT, wettbewerb TEXT,
  datum           DATE, ort TEXT, platzierung INTEGER,
  medaille        TEXT DEFAULT 'keine', ebene TEXT, sportart TEXT,
  storage_path    TEXT, notiz TEXT,
  erstellt_am     TIMESTAMPTZ DEFAULT now(),
  erstellt_von    UUID REFERENCES auth.users(id),
  erstellt_von_name TEXT
);
ALTER TABLE poster_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "poster_drafts_select" ON poster_drafts;
CREATE POLICY "poster_drafts_select" ON poster_drafts FOR SELECT TO authenticated
  USING (erstellt_von = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active = true AND role IN ('redaktion','oea','admin')));
DROP POLICY IF EXISTS "poster_drafts_insert" ON poster_drafts;
CREATE POLICY "poster_drafts_insert" ON poster_drafts FOR INSERT TO authenticated WITH CHECK (erstellt_von = auth.uid());
DROP POLICY IF EXISTS "poster_drafts_update" ON poster_drafts;
CREATE POLICY "poster_drafts_update" ON poster_drafts FOR UPDATE TO authenticated USING (erstellt_von = auth.uid());
DROP POLICY IF EXISTS "poster_drafts_delete" ON poster_drafts;
CREATE POLICY "poster_drafts_delete" ON poster_drafts FOR DELETE TO authenticated USING (erstellt_von = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active = true AND role = 'admin'));

-- ── RLS: achievements UPDATE Policy für Soft-Delete ──────────
DROP POLICY IF EXISTS "achievements_update" ON achievements;
CREATE POLICY "achievements_update" ON achievements FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active = true AND role IN ('redaktion','oea','admin'))
    )
  )
  WITH CHECK (true);

-- ── RLS: achievements DELETE (nur Admin) ─────────────────────
DROP POLICY IF EXISTS "achievements_delete_admin_only" ON achievements;
CREATE POLICY "achievements_delete_admin_only" ON achievements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active = true AND role = 'admin'));

-- ── SELECT Policy: gelöschte ausblenden ──────────────────────
DROP POLICY IF EXISTS "achievements_select_active" ON achievements;
CREATE POLICY "achievements_select_active" ON achievements FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active = true AND role = 'admin')
  );

-- ── Indizes für Performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_achievements_deleted_at ON achievements(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_achievements_status ON achievements(status);
CREATE INDEX IF NOT EXISTS idx_achievements_reporter ON achievements(reporter_id);
CREATE INDEX IF NOT EXISTS idx_achievement_media_achievement ON achievement_media(achievement_id);
CREATE INDEX IF NOT EXISTS idx_poster_drafts_achievement ON poster_drafts(achievement_id);

-- ── Schueler-Rolle ────────────────────────────────────────────
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'schueler';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'mitarbeiter';

-- ── Kontrolle ─────────────────────────────────────────────────
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'achievements' 
  AND column_name IN ('deleted_at','deleted_by','video_url','ai_draft','duplicate_flag','updated_at')
ORDER BY column_name;
