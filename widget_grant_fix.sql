-- ══════════════════════════════════════════════════════════════
-- Fix: GRANT SELECT für anon-Rolle
-- RLS-Policy allein reicht nicht – die Rolle braucht auch GRANT
-- ══════════════════════════════════════════════════════════════

-- Tabellen-Zugriff für anon-Rolle gewähren
GRANT SELECT ON public.achievements TO anon;
GRANT SELECT ON public.achievement_participants TO anon;
GRANT SELECT ON public.achievement_media TO anon;

-- Prüfen
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_name IN ('achievements', 'achievement_participants', 'achievement_media');
