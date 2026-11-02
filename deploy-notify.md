# Deployment: notify-new-meldung Edge Function

## 1. Resend API Key einrichten

1. Gehe zu https://resend.com und erstelle einen kostenlosen Account
2. Erstelle einen API Key unter "API Keys"
3. In Supabase Dashboard → Project Settings → Edge Functions → Secrets:
   - Name: `RESEND_API_KEY`
   - Value: `re_...` (dein Resend API Key)

## 2. Absender-Domain konfigurieren (optional, empfohlen)

Für professionelle E-Mails eigene Domain verifizieren:
- In Resend: Domains → Add Domain → `slzb-berlin.de` o.ä.
- DNS-Einträge setzen (MX, SPF, DKIM)
- Dann `from` in index.ts anpassen: `noreply@slzb-berlin.de`

**Ohne eigene Domain:** Resend erlaubt Versand von `onboarding@resend.dev` im Free-Plan.
Dann in index.ts ändern:
```typescript
from: 'SLZB-Erfolge <onboarding@resend.dev>',
```

## 3. Edge Function deployen

```bash
npx supabase@latest functions deploy notify-new-meldung --no-verify-jwt
```

## 4. Testen

In der App: Neue Meldung einreichen → Redakteure/ÖA/Admins erhalten E-Mail.

## 5. Wann wird benachrichtigt?

- Bei Einreichung eines Einzelerfolgs (nicht bei Entwurf)
- Bei Einreichung eines Teamerfolgss
- Bei Einreichung eines Artikels
- Bei Einreichung einer Minimalmeldung

## 6. Empfänger

Alle aktiven Nutzer mit Rolle `redaktion`, `oea` oder `admin`.

## 7. Kosten

Resend Free Plan: 3.000 E-Mails/Monat kostenlos.
Bei ~20 Meldungen/Monat × 5 Empfänger = 100 E-Mails/Monat → weit im Free-Plan.
