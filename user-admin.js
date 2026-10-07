// ============================================================
// SLZB-Erfolge v3 – Benutzerverwaltung
// Basiert auf dem bereitgestellten UserAdmin-Code
// + Fallback auf profiles-Tabelle wenn Edge Function fehlt
// ============================================================

// UserAdmin ist bereits in backend.js definiert
// Hier: UI-Funktionen

function renderNutzerverwaltung() {
  return `<div class="page">
    <div class="page-header"><h1>👥 Nutzerverwaltung</h1>
      <p>Konten, Rollen, Aktivierung und Passwortverwaltung.</p></div>

    <div class="card mb-3">
      <div class="card-header"><h2>Neuen Nutzer anlegen</h2></div>
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Die E-Mail-Adresse dient der Anmeldung bei Supabase Auth.</span></div>
        <div class="form-row cols-3">
          <div class="form-group"><label>Benutzername <span class="required">*</span></label>
            <input type="text" id="nu-username" placeholder="trainer1"></div>
          <div class="form-group"><label>E-Mail <span class="required">*</span></label>
            <input type="email" id="nu-email" placeholder="trainer1@slzb.de"></div>
          <div class="form-group"><label>Anzeigename <span class="required">*</span></label>
            <input type="text" id="nu-anzeige" placeholder="Vorname Nachname"></div>
          <div class="form-group"><label>Rolle <span class="required">*</span></label>
            <select id="nu-rolle">
              <option value="trainer">Trainer/Melder</option>
              <option value="redaktion">Redaktion</option>
              <option value="oea">Öffentlichkeitsarbeit</option>
              <option value="datenschutz">Datenschutz</option>
              <option value="admin">Administrator</option>
            </select></div>
          <div class="form-group"><label>Initialpasswort <span class="required">*</span></label>
            <input type="password" id="nu-passwort" placeholder="Mindestens 12 Zeichen"></div>
        </div>
        <div id="nu-fehler" style="display:none" class="alert alert-danger mb-2">
          <span class="alert-icon">❌</span><span id="nu-fehler-text"></span></div>
        <button class="btn btn-primary btn-sm" id="nu-create-btn" onclick="erstelleNutzerV3()">
          + Nutzer anlegen
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Vorhandene Nutzer</h2>
        <button class="btn btn-ghost btn-sm" onclick="ladeNutzerverwaltung()">↻ Aktualisieren</button>
      </div>
      <div id="nutzerverwaltung-liste" class="card-body">
        <div class="flex items-center gap-2">
          <div class="spinner"></div><span>Lade Nutzer...</span>
        </div>
      </div>
    </div>
  </div>`;
}

async function ladeNutzerverwaltung() {
  const el = document.getElementById('nutzerverwaltung-liste');
  if (!el) return;
  el.innerHTML = '<div class="flex items-center gap-2"><div class="spinner"></div><span>Lade Nutzer...</span></div>';
  try {
    let users = [];
    let quelle = '';

    // Erst Edge Function versuchen
    try {
      debug('Nutzerverwaltung: Versuche Edge Function admin-user/list');
      const result = await UserAdmin.call('list');
      users = result.users || result || [];
      quelle = 'Edge Function';
      debug(`Nutzerverwaltung: ${users.length} Nutzer via Edge Function`);
    } catch(e) {
      debug(`Edge Function fehlgeschlagen (${e.message}), Fallback auf profiles`);
      // Fallback: direkt aus profiles-Tabelle
      users = await UserAdmin.loadFallback();
      quelle = 'profiles-Tabelle (Fallback)';
      debug(`Nutzerverwaltung: ${users.length} Nutzer via profiles`);
    }

    if (!users.length) {
      el.innerHTML = `<div class="alert alert-warning"><span class="alert-icon">⚠️</span>
        <span>Keine Nutzer gefunden. Quelle: ${esc(quelle)}</span></div>`;
      return;
    }

    // Normalisiere Feldnamen (Edge Function vs. profiles haben unterschiedliche Namen)
    const normalisiereNutzer = (u) => ({
      id:          u.id,
      username:    u.username    || u.user_metadata?.username || '–',
      displayName: u.displayName || u.display_name || u.user_metadata?.display_name || '–',
      email:       u.email       || '–',
      role:        u.role        || u.user_metadata?.role || 'trainer',
      active:      u.active      !== undefined ? u.active : (u.is_active !== false),
      lastSignInAt:u.lastSignInAt|| u.last_sign_in_at || null,
      createdAt:   u.createdAt   || u.created_at || null,
    });

    const normalUsers = users.map(normalisiereNutzer);

    el.innerHTML = `
      <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
        <span>Datenquelle: <strong>${esc(quelle)}</strong> · ${normalUsers.length} Nutzer</span></div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Benutzer</th><th>E-Mail</th><th>Rolle</th>
          <th>Status</th><th>Letzte Anmeldung</th><th>Erstellt</th><th>Aktionen</th>
        </tr></thead>
        <tbody>${normalUsers.map(u=>`<tr>
          <td>
            <strong>${esc(u.displayName)}</strong><br>
            <span class="text-xs text-muted">${esc(u.username)}</span>
          </td>
          <td class="text-sm">${esc(u.email)}</td>
          <td>
            <select id="role-${u.id}" ${u.id===Auth.id()?'disabled title="Eigene Rolle kann nicht geändert werden"':''}>
              ${['trainer','redaktion','oea','datenschutz','admin'].map(r=>
                `<option value="${r}"${u.role===r?' selected':''}>${UserAdmin.roleLabel(r)}</option>`
              ).join('')}
            </select>
          </td>
          <td>${u.active
            ? '<span class="badge badge-success">Aktiv</span>'
            : '<span class="badge badge-danger">Deaktiviert</span>'}</td>
          <td class="text-sm">${UserAdmin.fmtDate(u.lastSignInAt)}</td>
          <td class="text-sm">${UserAdmin.fmtDate(u.createdAt)}</td>
          <td>
            <div class="flex gap-2" style="flex-wrap:wrap">
              <button class="btn btn-outline btn-sm"
                onclick="speichereNutzerRolle('${u.id}')"
                ${u.id===Auth.id()?'disabled':''}
                title="${u.id===Auth.id()?'Eigene Rolle kann nicht geändert werden':'Rolle speichern'}">
                Rolle speichern
              </button>
              <button class="btn btn-ghost btn-sm"
                onclick="zeigePasswortAendernV3('${u.id}','${esc(u.displayName||u.username)}')">
                🔑 Passwort
              </button>
              <button class="btn btn-${u.active?'danger':'success'} btn-sm"
                onclick="setzeNutzerAktiv('${u.id}',${!u.active})"
                ${u.id===Auth.id()?'disabled title="Eigenes Konto kann nicht deaktiviert werden"':''}>
                ${u.active?'Deaktivieren':'Aktivieren'}
              </button>
            </div>
          </td>
        </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch(e) {
    debug('Nutzerverwaltung Fehler: '+e.message);
    el.innerHTML = `<div class="alert alert-danger">
      <span class="alert-icon">❌</span>
      <span>${esc(e.message)}</span>
    </div>
    <div class="alert alert-info mt-2">
      <span class="alert-icon">💡</span>
      <span>Tipp: Öffnen Sie die <button class="btn btn-ghost btn-sm" onclick="navigateTo('diagnose')">Diagnose-Seite</button> um den Fehler zu analysieren.</span>
    </div>`;
  }
}

async function erstelleNutzerV3() {
  const username    = document.getElementById('nu-username')?.value.trim().toLowerCase() || '';
  const email       = document.getElementById('nu-email')?.value.trim().toLowerCase() || '';
  const displayName = document.getElementById('nu-anzeige')?.value.trim() || '';
  const role        = document.getElementById('nu-rolle')?.value || 'trainer';
  const password    = document.getElementById('nu-passwort')?.value || '';
  const errEl       = document.getElementById('nu-fehler');
  const errTxt      = document.getElementById('nu-fehler-text');

  const zeigeErr = (msg) => { errTxt.textContent=msg; errEl.style.display='flex'; };
  errEl.style.display = 'none';

  if (!username||!email||!displayName||!role||!password) {
    zeigeErr('Alle Felder sind Pflichtfelder.'); return;
  }
  if (password.length < 12) {
    zeigeErr('Das Initialpasswort muss mindestens 12 Zeichen haben.'); return;
  }

  const btn = document.getElementById('nu-create-btn');
  btn.disabled = true; btn.textContent = 'Wird angelegt...';

  try {
    debug(`Erstelle Nutzer: ${username} (${role})`);
    await UserAdmin.call('create', { username, email, displayName, role, password });
    toast(`Nutzer ${username} wurde angelegt`, 'success');
    ['nu-username','nu-email','nu-anzeige','nu-passwort'].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    await ladeNutzerverwaltung();
  } catch(e) {
    debug('Nutzer anlegen Fehler: '+e.message);
    zeigeErr(e.message);
  } finally {
    btn.disabled = false; btn.textContent = '+ Nutzer anlegen';
  }
}

async function speichereNutzerRolle(userId) {
  const roleEl = document.getElementById(`role-${userId}`);
  if (!roleEl) return;
  try {
    await UserAdmin.call('update', { userId, role: roleEl.value });
    toast('Rolle gespeichert', 'success');
    await ladeNutzerverwaltung();
  } catch(e) {
    toast(e.message, 'danger');
  }
}

async function setzeNutzerAktiv(userId, active) {
  if (!confirm(`Konto wirklich ${active?'aktivieren':'deaktivieren'}?`)) return;
  try {
    await UserAdmin.call('update', { userId, active });
    toast(`Konto ${active?'aktiviert':'deaktiviert'}`, 'success');
    await ladeNutzerverwaltung();
  } catch(e) {
    toast(e.message, 'danger');
  }
}

function zeigePasswortAendernV3(userId, name) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal" style="max-width:420px">
    <div class="modal-header">
      <h3>🔑 Passwort setzen: ${esc(name)}</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
        <span>Die Änderung wird sofort wirksam. Mindestens 12 Zeichen.</span></div>
      <div class="form-group"><label>Neues Passwort</label>
        <input type="password" id="admin-new-password" placeholder="Mindestens 12 Zeichen"></div>
      <div id="admin-pw-error"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="setzeNutzerPasswort('${userId}')">Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function setzeNutzerPasswort(userId) {
  const password = document.getElementById('admin-new-password')?.value || '';
  const errEl    = document.getElementById('admin-pw-error');
  if (password.length < 12) {
    errEl.innerHTML = '<div class="alert alert-danger mt-2"><span class="alert-icon">❌</span><span>Mindestens 12 Zeichen erforderlich.</span></div>';
    return;
  }
  try {
    await UserAdmin.call('reset-password', { userId, password });
    document.querySelector('.modal-overlay')?.remove();
    toast('Passwort wurde geändert', 'success');
  } catch(e) {
    errEl.innerHTML = `<div class="alert alert-danger mt-2"><span class="alert-icon">❌</span><span>${esc(e.message)}</span></div>`;
  }
}