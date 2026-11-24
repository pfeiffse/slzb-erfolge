-- ══════════════════════════════════════════════════════════════
-- Fix: Widget-Zugriff für anonyme Besucher (anon-Rolle)
-- Erlaubt das Lesen freigegebener Meldungen ohne Login
-- ══════════════════════════════════════════════════════════════

-- 1. SELECT-Berechtigung für anon-Rolle auf achievements
CREATE POLICY widget_public_read ON achievements
  FOR SELECT
  TO anon
  USING (
    status IN ('Freigegeben', 'Veröffentlicht')
    AND deleted_at IS NULL
  );

-- 2. SELECT-Berechtigung für achievement_participants (Athletennamen)
CREATE POLICY widget_participants_read ON achievement_participants
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM achievements a
      WHERE a.id = achievement_participants.achievement_id
        AND a.status IN ('Freigegeben', 'Veröffentlicht')
        AND a.deleted_at IS NULL
    )
  );

-- 3. SELECT-Berechtigung für achievement_media (Bilder)
CREATE POLICY widget_media_read ON achievement_media
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM achievements a
      WHERE a.id = achievement_media.achievement_id
        AND a.status IN ('Freigegeben', 'Veröffentlicht')
        AND a.deleted_at IS NULL
    )
  );

-- 4. Prüfen ob Policies angelegt wurden
SELECT tablename, policyname, roles
FROM pg_policies
WHERE policyname LIKE 'widget_%';
