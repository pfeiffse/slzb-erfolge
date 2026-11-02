# SLZB-Erfolge – Anleitung für Redaktion, ÖA und Administration

**Version 3.0 · Stand Oktober 2026**

---

## Rollenübersicht

| Rolle | Aufgaben |
|---|---|
| **Trainer/Melder** | Meldungen einreichen, Bilder hochladen, Rückfragen beantworten |
| **Redaktion** | Meldungen prüfen, bearbeiten, freigeben, Dubletten verwalten |
| **Öffentlichkeitsarbeit (ÖA)** | Ausgaben erstellen, Kanäle freigeben, Exportpakete |
| **Datenschutz** | Einwilligungen verwalten, Widerrufe, Löschungen |
| **Administrator** | Nutzerverwaltung, Stammdaten, Systemeinstellungen |

---

## Redaktionsübersicht

Klicke auf **✏️ Redaktionsübersicht** für eine Übersicht aller offenen Meldungen.

**Gruppen:**
- **Neu eingegangen** – frisch eingereichte Meldungen
- **Unvollständig** – Minimalmeldungen, die ergänzt werden müssen
- **Dublettenverdacht** – mögliche Doppelmeldungen
- **Einwilligungsprüfung** – Einwilligungsstatus unklar
- **In Redaktion** – wird gerade bearbeitet
- **Freigabe ÖA** – wartet auf Freigabe durch Öffentlichkeitsarbeit

---

## Meldung prüfen und freigeben

1. Klicke auf eine Meldung in der Redaktionsübersicht
2. Prüfe alle Felder (Titel, Sportart, Datum, Platzierung, Bilder)
3. Wähle eine Aktion:

| Aktion | Wann |
|---|---|
| **✅ Freigeben** | Meldung ist vollständig und korrekt |
| **💬 Rückfrage** | Etwas fehlt oder ist unklar – Kommentar eingeben |
| **🔄 Zurück zu Entwurf** | Grundlegende Überarbeitung nötig |
| **🚫 Sperren** | Einwilligungsproblem oder Datenschutzbedenken |

---

## Ausgaben erstellen

Klicke auf **📤 Ausgaben & Freigaben**.

### Für einzelne Meldungen:
- **📄 A3-Aushang** – Druckbares Poster (A3 quer, mehrere Varianten)
- **🖥️ Bildschirm** – Digital Signage (Hochformat, Querformat)
- **📱 Social-Media-Paket** – Instagram Beitrag, Story, Karussell

### Spezial-Ausgaben:
- **🎠 Highlights-Karussell** – Monatliche Top-Erfolge als Instagram-Serie
- **🏆 Nachwuchssportler-Wahl** – Abstimmungsposter (Monat/Jahr/Sieger)
- **⏳ Countdown-Poster** – Countdown bis zu einem Event
- **🏅 Jubiläums-Poster** – Festliche Poster in Gold
- **📰 Schulnachrichten-Poster** – Informationsplakate in Grau

### Ausgabe-Formate:
- **Hochformat 4:5** (1080×1350px) – Social Media, Bildschirm
- **Querformat 16:9** (1920×1080px) – TV, Beamer, Digital Signage
- **A3 Druck quer** (1587×1123px) – Druckfreundlich, weißer Hintergrund

---

## Farbsystem der Ausgaben

| Inhaltstyp | Farbe | Verwendung |
|---|---|---|
| Sportliche Erfolge | 🔴 Rot | Alle Erfolgsposter |
| Personen / Ehrungen | 🔵 Blau | Nachwuchssportler-Wahl |
| Events / Termine | 🟢 Grün | Countdown-Poster |
| Jubiläen | 🟡 Gold | Jubiläums-Poster |
| Schulnachrichten | ⚪ Grau | Informationsplakate |

---

## Einwilligungen verwalten (Datenschutz-Rolle)

Klicke auf **🔒 Einwilligungen**.

**Wichtige Regeln:**
- Social Media ist **standardmäßig gesperrt** – eigene Freigabe erforderlich
- Teamfotos: Fehlt für eine Person die Freigabe → Bild darf nicht verwendet werden
- Widerruf: Sofort alle betroffenen Meldungen sperren

---

## Nutzerverwaltung (Admin)

Klicke auf **👥 Nutzerverwaltung**.

**Nutzer anlegen:**
- Benutzername, E-Mail, Anzeigename, Rolle, Initialpasswort
- Passwort muss mindestens 12 Zeichen haben

**Rollen ändern:**
- Rolle im Dropdown auswählen → „Rolle speichern"

**Nutzer deaktivieren:**
- „Deaktivieren" – Nutzer kann sich nicht mehr anmelden, Daten bleiben erhalten

---

## Veranstaltungskalender

Klicke auf **📅 Veranstaltungskalender**.

- 891 Termine aus der Terminübersicht 2026/27
- Filter nach Sportart und Priorität
- Ansichten: Monat, Liste, Nächste 30 Tage

**Prioritätsstufen:**
- 🔴 Meisterschaft / Olympia / Finale
- 🟠 Wettkampf / Qualifikation / Rangliste
- 🔵 Lehrgang / Sichtung / Trainingslager
- ⚫ Regulär

---

## Jahreschronik

Klicke auf **📅 Jahreschronik** für eine Übersicht aller Erfolge nach Schuljahr.

Filter nach: Schuljahr, Sportart, Ebene, Team/Einzel

---

## Workflow-Status

Jede Meldung durchläuft folgende Status:

```
Entwurf → Eingereicht → Datenprüfung → Redaktion → Freigegeben → Veröffentlicht
                ↓                                        ↓
         Rückfrage an Melder                    Wegen Einwilligung gesperrt
                ↓                                        ↓
         Dublettenverdacht                         Widerrufen → Zur Löschung vorgemerkt
```

Jeden Statuswechsel protokolliert das System automatisch mit Person, Zeit und Kommentar.

---

## Diagnose (Admin)

Klicke auf **🔍 Diagnose** für Systemstatus, Datenbankverbindung und Edge Function Tests.

---

*Bei Fragen zur Technik: Systemadministration kontaktieren.*
