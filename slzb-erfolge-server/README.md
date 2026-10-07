# SLZB-Erfolge v3 – Mehrbenutzer-Starter

Dieses Paket baut den vorhandenen Prototypen auf Supabase/PostgreSQL um. Es enthält ein Datenbankschema, RLS-Richtlinien, Supabase Auth, private Storage-Grundlage und eine serverseitige Administratorfunktion.

## Wichtiger Status

Dies ist ein ausführbarer Migrations-Starter, aber noch keine abgenommene Produktivsoftware. Vor echtem Betrieb sind insbesondere Datenschutzprüfung, Penetrationstest, Backup-/Restore-Test, Upload-Validierung und Tests aller Rollen erforderlich.

## Einrichtung

1. Supabase CLI und Docker installieren.
2. Im Projektordner `supabase init` nur ausführen, falls noch keine Konfiguration vorhanden ist.
3. Lokal starten: `supabase start`.
4. Migration anwenden: `supabase db reset`.
5. Edge Function bereitstellen: `supabase functions deploy admin-user`.
6. `config.example.js` nach `config.js` kopieren und Projekt-URL sowie Publishable/Anon-Key eintragen.
7. Einen ersten Auth-Benutzer in Supabase anlegen. Danach in SQL ein Profil ergänzen:

```sql
insert into public.profiles(user_id,username,display_name,role)
values ('AUTH-USER-UUID','admin','Administrator','admin');
```

8. Den Ordner über einen lokalen Webserver öffnen, zum Beispiel `python3 -m http.server 8080`.

## Enthaltene Dateien

- `backend.js`: Supabase-Client
- `auth.js`: echte servergestützte Anmeldung
- `data.js`: Datenadapter für die vorhandene UI
- `supabase/migrations/202610060001_initial.sql`: Schema, Rollen, RLS und Statusfunktion
- `supabase/functions/admin-user/index.ts`: Anlage und Passwortreset durch Administratoren
- vorhandene UI-Dateien `app.js`, `app2.js`, `style.css`, `pdf.js`

## Noch umzusetzen vor Produktivbetrieb

- Bild-Upload im Formular an `achievement-media` anbinden
- Einwilligungen bei jeder Ausgabe atomar serverseitig prüfen
- CSV-Import vollständig in eine Edge Function verlagern
- Lösch-/Anonymisierungsprozess definieren
- E-Mail-Domain bzw. SSO statt lokaler Alias-Adressen verwenden
- automatisierte RLS- und Workflow-Tests
- CSP und weitere Security Header im Hosting konfigurieren
- getrennte Dev-, Test- und Produktionsprojekte

## Sicherheitsregeln

- Niemals `SUPABASE_SERVICE_ROLE_KEY` im Browser oder in `config.js` verwenden.
- Keine alten Passwort-Hashes oder Demo-Passwörter übernehmen.
- Alle bisherigen Kennwörter zurücksetzen.
- Vor echten Schülerdaten eine Datenschutz-Freigabe durchführen.
