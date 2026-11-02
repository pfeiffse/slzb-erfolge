# SLZB-Erfolge v3 – Technische Dokumentation

**Version 3.0 · Stand Oktober 2026**
**Für Entwickler und Systemadministratoren**

---

## 1. Systemarchitektur

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (GitHub Pages – statisch)                     │
│  https://tinyurl.com/slzb-erfolge               │
│                                                         │
│  index.html  →  config.js  →  supabase.min.js (lokal)  │
│  termine.js  →  data.js    →  backend.js               │
│  app.js      →  app2.js    →  poster.js                │
│  pdf.js      →  style.css  →  user-admin.js            │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST / WebSocket
┌────────────────────────▼────────────────────────────────┐
│  Supabase (Frankfurt EU)                                │
│  Projekt-ID: yjzvmvgnpxbxmcjopqws                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Auth     │  │PostgreSQL│  │ Storage  │             │
│  │ (E-Mail) │  │(Daten)   │  │(Bilder)  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│  Edge Functions:                                        │
│  • admin-user (Nutzerverwaltung)                       │
│  • notify-new-meldung (E-Mail, noch nicht aktiv)       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Technologie-Stack

| Komponente | Technologie | Version |
|---|---|---|
| Frontend | Vanilla JavaScript (kein Framework) | ES2022 |
| Hosting | GitHub Pages | – |
| Backend | Supabase | 2.x |
| Datenbank | PostgreSQL (via Supabase) | 15 |
| Auth | Supabase Auth (E-Mail + Passwort) | – |
| Storage | Supabase Storage | – |
| Edge Functions | Deno (TypeScript) | – |
| Canvas/Poster | HTML5 Canvas API | – |
| PDF | jsPDF | – |
| CSV | SheetJS | – |
| Schrift | Montserrat (Google Fonts) | – |

---

## 3. Dateistruktur

```
slzb-v3/
├── index.html              # App-Shell, Login, Script-Loader
├── config.js               # Supabase URL + Anon Key
├── supabase.min.js         # Supabase Client (lokal, kein CDN)
├── backend.js              # Auth, DB-Operationen, Mapping
├── app.js                  # App-Logik Teil 1 (Navigation, Formulare)
├── app2.js                 # App-Logik Teil 2 (Detail, Ausgaben, Modals)
├── poster.js               # Canvas-Poster-Generator
├── data.js                 # Lokale Stammdaten (Sportarten, Wettbewerbe)
├── termine.js              # Veranstaltungskalender 2026/27 (891 Termine)
├── pdf.js                  # PDF-Export, CSV-Import
├── user-admin.js           # Nutzerverwaltungs-UI
├── style.css               # Design-System
├── slzb-logo.png           # SLZB-Logo für Canvas
├── admin-user/
│   └── index.ts            # Edge Function: Nutzerverwaltung
├── notify-new-meldung/
│   └── index.ts            # Edge Function: E-Mail (noch nicht aktiv)
├── supabase_erfolge.sql    # Datenbankschema
├── sports_setup.sql        # Sportarten-Daten
├── fix_policies.sql        # RLS-Policies
├── fix_history_policy.sql  # History-RLS
├── poster_upload_policy.sql # Storage-Policy für Poster-Bilder
├── enable_realtime.sql     # Realtime-Konfiguration
├── create-users.html       # Browser-Tool: Batch-Nutzeranlage
├── create-users.js         # Node.js-Script: Batch-Nutzeranlage
├── deploy-edge-function.md # Anleitung: Edge Functions deployen
├── deploy-notify.md        # Anleitung: E-Mail-Benachrichtigungen
├── ANLEITUNG-TRAINER.md    # Benutzerhandbuch Trainer
├── ANLEITUNG-REDAKTION.md  # Benutzerhandbuch Redaktion/Admin
└── TECHNISCHE-DOKUMENTATION.md  # Diese Datei
```

---

## 4. Datenbankschema

### Tabellen

| Tabelle | Beschreibung |
|---|---|
| `profiles` | Nutzerprofile (user_id, username, display_name, role, active) |
| `sports` | Sportarten (id SP01-SP18, name, code, disciplines[]) |
| `competitions` | Wettbewerbe (id WB-xxxxxxxx, name, organizer, location, dates) |
| `students` | Schüler (optional, Freitext-Namen möglich) |
| `achievements` | Erfolgsmeldungen (Kerntabelle) |
| `achievement_participants` | Beteiligte pro Meldung |
| `achievement_status_history` | Statuswechsel-Protokoll |
| `achievement_media` | Bild-Metadaten |
| `consents` | Einwilligungen |
| `teams` | Teams/Mannschaften |
| `import_jobs` | CSV-Import-Aufträge |
| `audit_log` | Systemprotokoll |

### Wichtige Enums

```sql
-- Rollen
CREATE TYPE app_role AS ENUM ('trainer','redaktion','oea','datenschutz','admin');

-- Meldungsstatus (17 Status)
CREATE TYPE achievement_status AS ENUM (
  'Entwurf','Unvollständig','Eingereicht','Rückfrage an Melder',
  'Datenprüfung','Dublettenverdacht','Einwilligungsprüfung',
  'Redaktion','Freigabe Öffentlichkeitsarbeit','Teilweise freigegeben',
  'Freigegeben','Veröffentlicht','Archiviert',
  'Wegen Einwilligung gesperrt','Widerrufen',
  'Zur Löschung vorgemerkt','Gelöscht/Anonymisiert'
);
```

### Storage Buckets

| Bucket | Zweck | Zugriff |
|---|---|---|
| `achievement-media` | Bilder zu Erfolgsmeldungen | Privat, Signed URLs |
| `achievement-media` (Pfad `userId/poster-*/`) | Poster-Hintergrundbilder | Privat, Signed URLs |

---

## 5. Authentifizierung & Rollen

### Anmeldung
- Supabase Auth (E-Mail + Passwort)
- Session wird im Browser gespeichert (localStorage)
- Auto-Refresh Token aktiv

### Rollenprüfung
```javascript
// In backend.js
Auth.rolle()    // → 'trainer'|'redaktion'|'oea'|'datenschutz'|'admin'
Auth.id()       // → UUID des angemeldeten Nutzers
Auth.name()     // → Anzeigename
Auth.canDo('erfassen')  // → true/false
```

### Row Level Security (RLS)
Alle Tabellen haben RLS aktiviert. Wichtige Policies:
- Trainer sehen nur eigene Meldungen
- Redaktion/Admin sehen alle Meldungen
- Bilder: nur Uploader und Redaktion/Admin

---

## 6. Frontend-Architektur

### Navigation
```javascript
navigateTo('dashboard')           // Seite wechseln
navigateTo('erfolg-detail', {currentErfolgId: id})  // Mit Parametern
```

### Daten-Cache
```javascript
APP._erfolgeCache = null;   // Cache leeren
ladeErfolge(force=true)     // Neu laden
```

### Poster-Generator (poster.js)

**Basis-Funktionen (SLZB-Design):**
```javascript
zeichneSlzbHintergrund(ctx, W, H, bild, akzent)  // akzent: 'rot'|'blau'|'gruen'|'gold'|'grau'
zeichneSlzbDeko(ctx, W, H)                        // Schräges Rechteck + Kreise
zeichneSlzbHeader(ctx, W, H, sportart, datum, akzent)
zeichneSlzbKarte(ctx, W, H, opts, akzent)         // Glasmorphismus-Karte
zeichneSlzbFooterNeu(ctx, W, H, akzent)
```

**Poster-Typen:**
```javascript
zeichneSLZBPoster(canvasId, e)           // Hochformat 1080×1350
zeichneBildschirmQuerformat(canvasId, e) // Querformat 1920×1080
zeichneA3Druckfreundlich(canvasId, e)    // A3 Druck 1587×1123
zeichneA3Split(canvasId, e)              // A3 Split-Layout
zeichneA3Vollbild(canvasId, e)           // A3 Vollbild
zeichneSocialFormat(canvasId, e, format) // Social 'beitrag'|'story'
zeichneHighlightKarte(canvasId, e, nr, gesamt)  // Karussell-Karte
zeichneNachwuchswahlPoster(canvasId, opts)       // Nachwuchswahl
zeichneNachwuchsSiegerPoster(canvasId, opts)     // Sieger-Ehrung
zeichneCountdownPoster(canvasId, opts)           // Countdown
zeichnePosterA3Allgemein(ctx, W, H, bild, opts, akzent, datum)  // A3 allgemein
```

---

## 7. Edge Functions

### admin-user
**Zweck:** Nutzerverwaltung (Anlegen, Bearbeiten, Deaktivieren, Passwort-Reset)
**Aktionen:** `list`, `create`, `update`, `reset-password`
**Auth:** Nur Admins

### notify-new-meldung (noch nicht aktiv)
**Zweck:** E-Mail-Benachrichtigung bei neuen Meldungen
**Voraussetzung:** `RESEND_API_KEY` in Supabase Secrets
**Empfänger:** Alle aktiven Nutzer mit Rolle `redaktion`, `oea`, `admin`

**Aktivierung:**
```bash
npx supabase@latest functions deploy notify-new-meldung --no-verify-jwt
```
Dann in `app.js` die zwei auskommentierten Zeilen in `speichereErfolg` und `speichereTeamerfolg` wieder einkommentieren.

---

## 8. Deployment

### GitHub Pages
```
Repository: https://github.com/pfeiffse/slzb-erfolge
Branch: main (oder gh-pages)
URL: https://tinyurl.com/slzb-erfolge
```

**Dateien hochladen:** Direkt über GitHub Web-Interface oder Git.
**Cache-Busting:** Versionsnummer in `index.html` erhöhen:
```html
<script src="poster.js?v=3"></script>
```

### Supabase
- **Projekt-ID:** `yjzvmvgnpxbxmcjopqws`
- **Region:** Frankfurt (eu-central-1)
- **URL:** `https://yjzvmvgnpxbxmcjopqws.supabase.co`

---

## 9. Bekannte Einschränkungen

| Einschränkung | Beschreibung | Workaround |
|---|---|---|
| Kein Realtime | Neue Meldungen erscheinen erst nach 30s Cache-Ablauf | Seite neu laden |
| Keine automatische Unkenntlichmachung | Teamfotos mit fehlender Einwilligung müssen manuell ersetzt werden | Manuelle Bildauswahl |
| Kein Auto-Posting | Social-Media-Pakete werden nur als PNG exportiert | Manuelles Hochladen |
| Supabase Free Plan | 500MB Datenbank, 1GB Storage, 50.000 MAU | Upgrade bei Wachstum |
| termine.js Größe | 255KB (891 Termine) – wird einmalig geladen | Akzeptabel für Schulnetz |

---

## 10. Weiterentwicklung

### Nächste sinnvolle Schritte

1. **E-Mail-Benachrichtigungen aktivieren** (deploy-notify.md)
2. **Schüler-Import** aus Excel/CSV (Vorbereitung vorhanden)
3. **Einwilligungs-Negativ-Liste** importieren
4. **Kalender-Termine aus Supabase** statt statischer Datei
5. **Volltext-Suche** im Archiv
6. **KI-Textgenerierung** (Überschrift, Kurzmeldung, Hashtags)
7. **QR-Code** auf A3-Aushängen
8. **Mehrsprachigkeit** (Englisch für internationale Athleten)

### Code-Konventionen

- **Kein Framework** – Vanilla JS, kein Build-Step nötig
- **Async/Await** für alle Supabase-Calls
- **esc()** für alle User-Inputs in HTML (XSS-Schutz)
- **toast()** für Nutzer-Feedback
- **debug()** für Entwickler-Logs
- **APP._cache** für lokale Zwischenspeicherung

### Neue Seite hinzufügen

```javascript
// 1. In app.js: pages-Map ergänzen
pages['meine-neue-seite'] = renderMeineNeueSeite;

// 2. In app.js: Navigation ergänzen
{page:'meine-neue-seite', icon:'🆕', label:'Neue Seite', roles:['admin']}

// 3. In app2.js: Render-Funktion erstellen
async function renderMeineNeueSeite() {
  return `<div class="page">
    <div class="page-header"><h1>🆕 Neue Seite</h1></div>
    <!-- Inhalt -->
  </div>`;
}
```

### Neuen Poster-Typ hinzufügen

```javascript
// In poster.js: Neue Funktion
async function zeichneNeuenPosterTyp(canvasId, opts) {
  const canvas = document.getElementById(canvasId);
  canvas.width=1080; canvas.height=1350;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  zeichneSlzbHintergrund(ctx, 1080, 1350, null, 'rot');
  zeichneSlzbDeko(ctx, 1080, 1350);
  zeichneSlzbHeader(ctx, 1080, 1350, 'Sportart', 'Datum', 'rot');
  zeichneSlzbKarte(ctx, 1080, 1350, { subtitle:'TITEL', nachname:'TEXT' }, 'rot');
  zeichneSlzbFooterNeu(ctx, 1080, 1350, 'rot');
}
```

---

## 11. Sicherheitshinweise

- **Anon Key** ist öffentlich sichtbar – das ist normal (Supabase-Design)
- **Service Role Key** niemals im Frontend verwenden
- **RLS** schützt alle Daten auf Datenbankebene
- **Keine echten Schülerdaten** in Testumgebung
- **Social Media** ist standardmäßig gesperrt
- **Audit-Log** protokolliert alle kritischen Aktionen

---

## 12. Kontakt & Support

- **Repository:** https://github.com/pfeiffse/slzb-erfolge
- **Supabase Dashboard:** https://supabase.com/dashboard/project/yjzvmvgnpxbxmcjopqws
- **Entwickelt mit:** Office Agent (KI-Assistent)
- **Stand:** Oktober 2026

