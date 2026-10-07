# Edge Function deployen – Schritt für Schritt

## Das Problem
Die alte Edge Function hatte einen fehlerhaften Import:
```typescript
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'  // ❌ existiert nicht
```
Das verursachte den HTTP 400. Die neue Version definiert corsHeaders direkt.

## Deployment

### Option A: Supabase CLI (empfohlen)

1. Ordner `admin-user` aus der ZIP in Ihr Supabase-Projektverzeichnis kopieren:
```
supabase/functions/admin-user/index.ts
```

2. Deployen:
```bash
npx supabase@latest functions deploy admin-user --project-ref yjzvmvgnpxbxmcjopqws
```

### Option B: Supabase Dashboard (ohne CLI)

1. `supabase.com` → Ihr Projekt → **Edge Functions**
2. `admin-user` anklicken → **Edit**
3. Den gesamten Inhalt von `index.ts` einfügen
4. **Deploy** klicken

## Testen nach dem Deployment

In der App: **Admin → Diagnose → „Edge Function testen"**

Erwartetes Ergebnis:
```json
{ "users": [...] }
```

## Was die neue Version besser macht

1. ✅ Korrekte CORS-Headers (direkt definiert, kein fehlerhafter Import)
2. ✅ Bessere Fehlerbehandlung mit klaren Meldungen
3. ✅ Audit-Log-Fehler werden ignoriert (kein Absturz wenn Tabelle fehlt)
4. ✅ HTTP 500 statt 400 bei unerwarteten Fehlern (besser debuggbar)
5. ✅ Prüft ob Authorization-Header vorhanden ist