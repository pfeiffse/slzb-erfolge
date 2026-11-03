# Push-Benachrichtigungen einrichten

## Schritt 1: VAPID-Schlüssel in Supabase hinterlegen

In Supabase → Settings → Edge Functions → Secrets:

```
VAPID_PUBLIC_KEY  = BAWC0AkL9JN6A1bWdIISWuBXDndCvVP2cG9IL_JzdkFiWasxx9Uek49YXkJfayy3vWqGl8m-sdBhzS8DYcDm9sg
VAPID_PRIVATE_KEY = iIhwgfbqpRyeCU4iAg3LJ2e8orLbEftQqDbLvmEvHbo
```

## Schritt 2: Datenbank-Tabelle anlegen

In Supabase → SQL Editor → `push_subscriptions_setup.sql` ausführen.

## Schritt 3: Edge Function deployen

```bash
npx supabase@latest functions deploy notify-status-change --project-ref yjzvmvgnpxbxmcjopqws
```

## Schritt 4: Testen

1. App auf Smartphone öffnen (Chrome/Android oder Safari/iOS 16.4+)
2. Einloggen → nach 5 Sekunden erscheint der Benachrichtigungs-Dialog
3. „Ja, aktivieren" → Erlaubnis erteilen
4. Als Redakteur eine Meldung freigeben → Trainer erhält Push

## Welche Status lösen Push aus?

- ✅ Freigegeben
- 🎉 Veröffentlicht  
- 💬 Rückfrage an Melder
- 🔒 Wegen Einwilligung gesperrt
- 🗄️ Archiviert
- ⚡ Teilweise freigegeben

## Benachrichtigungen verwalten

Trainer: Mein Profil → Benachrichtigungen → Aktivieren/Deaktivieren
