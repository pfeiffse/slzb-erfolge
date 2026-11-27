-- Fehlende Spalte in kalender_eintraege hinzufügen
ALTER TABLE kalender_eintraege ADD COLUMN IF NOT EXISTS ueberschreibt text;

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_kalender_ueberschreibt ON kalender_eintraege(ueberschreibt);

-- Kommentar
COMMENT ON COLUMN kalender_eintraege.ueberschreibt IS 
  'Name des SLZB_TERMINE-Eintrags der durch diesen Eintrag überschrieben wird';
