-- Neue Spalte event_date_bis für mehrtägige Veranstaltungen
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS event_date_bis date;
