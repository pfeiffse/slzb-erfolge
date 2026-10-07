// ============================================================
// SLZB-Erfolge v3 – Batch-Nutzer-Anlage
// Ausführen mit: node create-users.js
// Voraussetzung: Node.js installiert
// ============================================================

const SUPABASE_URL = 'https://yjzvmvgnpxbxmcjopqws.supabase.co';

// Service Role Key – NUR für dieses Script, danach nicht weitergeben!
// Zu finden in: Supabase → Settings → API → service_role key
const SERVICE_ROLE_KEY = 'HIER_SERVICE_ROLE_KEY_EINFÜGEN';

// ── Nutzer-Liste ─────────────────────────────────────────────
// Format: { username, email, displayName, role, password }
// Passwort muss mindestens 12 Zeichen haben
const NUTZER = [
  // Admins (bereits vorhanden – auskommentiert)
  // { username:'pfeiffer', email:'pfeiffer@slzb.de', displayName:'Pfeiffer', role:'admin', password:'...' },

  // Öffentlichkeitsarbeit
  { username:'str', email:'str@slzb.de', displayName:'Str', role:'oea', password:'Str_Passwort_2026!' },

  // Redaktion
  { username:'unt', email:'unt@slzb.de', displayName:'Unt', role:'redaktion', password:'Unt_Passwort_2026!' },

  // Trainer je Sportart
  { username:'basketball',    email:'basketball@slzb.de',    displayName:'Basketball',       role:'trainer', password:'Basketball_2026!' },
  { username:'beachvolleyball',email:'beachvolleyball@slzb.de',displayName:'Beachvolleyball', role:'trainer', password:'Beachvb_2026!' },
  { username:'bogenschiessen',email:'bogenschiessen@slzb.de', displayName:'Bogenschießen',   role:'trainer', password:'Bogen_2026!' },
  { username:'boxen',         email:'boxen@slzb.de',          displayName:'Boxen',            role:'trainer', password:'Boxen_2026!' },
  { username:'eishockey',     email:'eishockey@slzb.de',      displayName:'Eishockey',        role:'trainer', password:'Eishockey_2026!' },
  { username:'eiskunstlauf',  email:'eiskunstlauf@slzb.de',   displayName:'Eiskunstlauf',     role:'trainer', password:'Eiskunst_2026!' },
  { username:'eisschnelllauf',email:'eisschnelllauf@slzb.de', displayName:'Eisschnelllauf',   role:'trainer', password:'Eisschnell_2026!' },
  { username:'gewichtheben',  email:'gewichtheben@slzb.de',   displayName:'Gewichtheben',     role:'trainer', password:'Gewicht_2026!' },
  { username:'handball',      email:'handball@slzb.de',        displayName:'Handball',         role:'trainer', password:'Handball_2026!' },
  { username:'judo',          email:'judo@slzb.de',            displayName:'Judo',             role:'trainer', password:'Judo_2026!' },
  { username:'leichtathletik',email:'leichtathletik@slzb.de', displayName:'Leichtathletik',   role:'trainer', password:'Leicht_2026!' },
  { username:'para_schwimmen',email:'paraschwimmen@slzb.de',  displayName:'Para-Schwimmen',   role:'trainer', password:'ParaSchwimm_2026!' },
  { username:'radsport',      email:'radsport@slzb.de',        displayName:'Radsport',         role:'trainer', password:'Radsport_2026!' },
  { username:'schwimmen',     email:'schwimmen@slzb.de',       displayName:'Schwimmen',        role:'trainer', password:'Schwimmen_2026!' },
  { username:'turnen_maennlich',email:'turnen@slzb.de',       displayName:'Turnen (männlich)',role:'trainer', password:'Turnen_2026!' },
  { username:'volleyball',    email:'volleyball@slzb.de',      displayName:'Volleyball',       role:'trainer', password:'Volleyball_2026!' },
  { username:'wasserspringen',email:'wasserspringen@slzb.de', displayName:'Wasserspringen',   role:'trainer', password:'Wasserspring_2026!' },
  { username:'fussball',      email:'fussball@slzb.de',        displayName:'Fußball',          role:'trainer', password:'Fussball_2026!' },
];

// ── Hilfsfunktionen ──────────────────────────────────────────
async function apiCall(path, method, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || JSON.stringify(data));
  return data;
}

async function erstelleNutzer(nutzer) {
  // 1. Auth-Nutzer anlegen
  const authUser = await apiCall('/auth/v1/admin/users', 'POST', {
    email:         nutzer.email,
    password:      nutzer.password,
    email_confirm: true,
    user_metadata: {
      display_name: nutzer.displayName,
      username:     nutzer.username,
    },
  });

  const userId = authUser.id;

  // 2. Profil in profiles-Tabelle anlegen
  await apiCall('/rest/v1/profiles', 'POST', {
    user_id:      userId,
    username:     nutzer.username,
    display_name: nutzer.displayName,
    role:         nutzer.role,
    active:       true,
  });

  return userId;
}

// ── Hauptprogramm ────────────────────────────────────────────
async function main() {
  if (SERVICE_ROLE_KEY === 'HIER_SERVICE_ROLE_KEY_EINFÜGEN') {
    console.error('❌ Bitte SERVICE_ROLE_KEY in der Datei eintragen!');
    console.error('   Supabase → Settings → API → service_role key');
    process.exit(1);
  }

  console.log(`\n🚀 SLZB-Erfolge – Batch-Nutzer-Anlage`);
  console.log(`   ${NUTZER.length} Nutzer werden angelegt...\n`);

  const ergebnisse = { ok: [], fehler: [] };

  for (const nutzer of NUTZER) {
    process.stdout.write(`  Anlegen: ${nutzer.username} (${nutzer.role})... `);
    try {
      const userId = await erstelleNutzer(nutzer);
      console.log(`✅ ${userId.slice(0,8)}...`);
      ergebnisse.ok.push(nutzer.username);
    } catch(e) {
      const msg = e.message;
      // Bereits vorhanden ist kein Fehler
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
        console.log(`⏭️  Bereits vorhanden`);
        ergebnisse.ok.push(nutzer.username + ' (bereits vorhanden)');
      } else {
        console.log(`❌ ${msg}`);
        ergebnisse.fehler.push({ username: nutzer.username, fehler: msg });
      }
    }
    // Kurze Pause um Rate-Limits zu vermeiden
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Erfolgreich: ${ergebnisse.ok.length}`);
  console.log(`❌ Fehler:      ${ergebnisse.fehler.length}`);

  if (ergebnisse.fehler.length > 0) {
    console.log('\nFehler-Details:');
    ergebnisse.fehler.forEach(f => console.log(`  - ${f.username}: ${f.fehler}`));
  }

  console.log('\n📋 Zugangsdaten-Übersicht:');
  console.log('='.repeat(50));
  NUTZER.forEach(n => {
    console.log(`${n.username.padEnd(20)} ${n.email.padEnd(30)} ${n.password}`);
  });
  console.log('\n⚠️  Bitte Passwörter sicher aufbewahren und Trainern mitteilen!');
  console.log('   Trainer können ihr Passwort selbst ändern unter: Mein Profil → Passwort ändern\n');
}

main().catch(e => { console.error('Fataler Fehler:', e.message); process.exit(1); });