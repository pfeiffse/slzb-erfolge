-- Kalender-Tabelle für benutzerdefinierte Einträge
CREATE TABLE IF NOT EXISTS kalender_eintraege (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum       DATE NOT NULL,
  datum_bis   DATE,
  datum_anzeige TEXT,
  sportart    TEXT NOT NULL,
  veranstaltung TEXT NOT NULL,
  ort         TEXT DEFAULT '',
  klasse      TEXT DEFAULT '',
  teilnahme   TEXT DEFAULT 'Ja',
  prioritaet  INTEGER DEFAULT 4,
  prioritaet_text TEXT DEFAULT '4 – Regulär',
  erstellt_von UUID REFERENCES auth.users(id),
  erstellt_am TIMESTAMPTZ DEFAULT now(),
  geaendert_am TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE kalender_eintraege ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten Nutzer können lesen
CREATE POLICY kalender_read ON kalender_eintraege
  FOR SELECT TO authenticated USING (true);

-- Trainer können eigene Einträge erstellen
CREATE POLICY kalender_insert ON kalender_eintraege
  FOR INSERT TO authenticated
  WITH CHECK (erstellt_von = auth.uid());

-- Trainer können eigene Einträge bearbeiten, Admins alle
CREATE POLICY kalender_update ON kalender_eintraege
  FOR UPDATE TO authenticated
  USING (
    erstellt_von = auth.uid()
    OR slzb_has_role(ARRAY['redaktion'::app_role,'admin'::app_role])
  );

-- Nur Admins können löschen
CREATE POLICY kalender_delete ON kalender_eintraege
  FOR DELETE TO authenticated
  USING (slzb_has_role(ARRAY['admin'::app_role]));

-- Prüfen
SELECT tablename FROM pg_tables WHERE tablename = 'kalender_eintraege';
