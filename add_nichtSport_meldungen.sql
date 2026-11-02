-- ══════════════════════════════════════════════════════════════
-- Neue Rolle 'mitarbeiter' zur app_role enum hinzufügen
-- WICHTIG: Muss in zwei separaten Schritten ausgeführt werden!
-- ══════════════════════════════════════════════════════════════

-- SCHRITT 1: Enum-Wert hinzufügen (separat ausführen, dann committen)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'mitarbeiter';

-- ══════════════════════════════════════════════════════════════
-- SCHRITT 2: Erst NACH Schritt 1 ausführen (neues SQL-Fenster)
-- ══════════════════════════════════════════════════════════════
-- Prüfung ob Mitarbeiter-Rolle vorhanden:
-- SELECT unnest(enum_range(NULL::app_role)) AS rolle;

-- RLS-Policy für Mitarbeiter (gleiche Rechte wie Trainer):
-- Bereits durch bestehende Policies abgedeckt (auth_read, auth_insert, auth_update)
-- Keine weiteren SQL-Änderungen nötig.
