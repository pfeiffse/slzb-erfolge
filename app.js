// ============================================================
// SLZB-Erfolge v3 – App-Logik (Supabase Auth)
// ============================================================

const APP = {
  currentPage: 'dashboard',
  currentErfolgId: null,
  selectedMeldungsart: null,
  _teamBeteiligte: [],
  _bildZaehler: 0,
};

// ── Hilfsfunktionen ──────────────────────────────────────────
function fmt(date) {
  if (!date) return '–';
  return new Date(date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function fmtDT(date) {
  if (!date) return '–';
  const d = new Date(date);
  return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+
    ' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
}
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function statusBadge(status) {
  const map={
    'Entwurf':'entwurf','Unvollständig':'unvollstaendig','Eingereicht':'eingereicht',
    'Rückfrage an Melder':'rueckfrage','Datenprüfung':'datenpruefung',
    'Dublettenverdacht':'dublette','Einwilligungsprüfung':'einwilligung',
    'Redaktion':'redaktion','Freigabe Öffentlichkeitsarbeit':'freigabe-oa',
    'Teilweise freigegeben':'teilweise','Freigegeben':'freigegeben',
    'Veröffentlicht':'veroeffentlicht','Archiviert':'archiviert',
    'Wegen Einwilligung gesperrt':'gesperrt','Widerrufen':'widerrufen',
    'Zur Löschung vorgemerkt':'loeschung','Gelöscht/Anonymisiert':'geloescht',
  };
  return `<span class="badge badge-${map[status]||'entwurf'}">${esc(status)}</span>`;
}
function medailleBadge(m) {
  if (!m||m==='keine') return '';
  const icons={Gold:'🥇',Silber:'🥈',Bronze:'🥉'};
  const cls={Gold:'gold',Silber:'silver',Bronze:'bronze'};
  return `<span class="badge badge-${cls[m]}">${icons[m]} ${m}</span>`;
}
function ebeneBadge(e) {
  if (!e) return '';
  const cls={Schulebene:'info',Bezirk:'info',Landesebene:'warning',
    Bundesebene:'danger',International:'danger',Weltmeisterschaft:'danger',Olympia:'gold'};
  return `<span class="badge badge-${cls[e]||'info'}">${esc(e)}</span>`;
}
function einwilligungIcon(ok) {
  return ok?'<span class="ew-ok">✓</span>':'<span class="ew-nok">✗</span>';
}
function toast(msg, type='info') {
  const t = document.createElement('div');
  t.className = `alert alert-${type}`;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;max-width:380px;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:slideUp .2s ease';
  const icons={info:'ℹ️',success:'✅',warning:'⚠️',danger:'❌'};
  t.innerHTML = `<span class="alert-icon">${icons[type]||'ℹ️'}</span><span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3500);
}
function ebeneOptions() {
  return ['Schulebene','Bezirk','Landesebene','Bundesebene','International','Weltmeisterschaft','Olympia','Sonstiges']
    .map(e=>`<option>${e}</option>`).join('');
}

// ── Autocomplete ─────────────────────────────────────────────
function bindAutocomplete(inputId, vorschlaege) {
  const input = document.getElementById(inputId); if (!input) return;
  let liste = document.getElementById(inputId+'-liste');
  if (!liste) {
    liste = document.createElement('datalist');
    liste.id = inputId+'-liste';
    input.parentNode.appendChild(liste);
  }
  input.setAttribute('list', inputId+'-liste');
  liste.innerHTML = vorschlaege.map(v=>`<option value="${esc(v)}">`).join('');
}
function bindSportartAC(inputId, diszInputId) {
  bindAutocomplete(inputId, SLZB_DB.sportarten.map(s=>s.name));
  const input = document.getElementById(inputId); if (!input) return;
  input.addEventListener('input', ()=>{
    const sp = SLZB_DB.sportarten.find(s=>s.name.toLowerCase()===input.value.toLowerCase());
    if (sp && diszInputId) bindAutocomplete(diszInputId, sp.disziplinen||[]);
  });
}

// ── Navigation ───────────────────────────────────────────────
function navigateTo(page, params={}) {
  APP.currentPage = page;
  Object.assign(APP, params);
  document.querySelectorAll('.nav-item').forEach(el=>
    el.classList.toggle('active', el.dataset.page===page));
  document.getElementById('sidebar')?.classList.remove('open');
  const main = document.getElementById('main-page'); if (!main) return;
  main.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px"><div class="spinner"></div></div>`;
  const pages = {
    dashboard:         renderDashboard,
    'neue-meldung':    renderNeueMeldung,
    'meine-meldungen': renderMeineMeldungen,
    rueckfragen:       renderRueckfragen,
    redaktion:         renderRedaktion,
    'erfolg-detail':   renderErfolgDetail,
    einwilligungen:    renderEinwilligungen,
    ausgaben:          renderAusgaben,
    archiv:            renderArchiv,
    stammdaten:        renderStammdaten,
    import:            renderImport,
    nutzerverwaltung:  renderNutzerverwaltung,
    'mein-profil':     renderMeinProfil,
    jahreschronik:     renderJahreschronik,
    diagnose:          renderDiagnose,
  };
  const fn = pages[page];
  try {
    const result = fn ? fn() : null;
    if (result && typeof result.then === 'function') {
      result.then(html => {
        main.innerHTML = html || `<div class="page"><p>Seite nicht gefunden.</p></div>`;
        updateBadges();
      }).catch(e => {
        main.innerHTML = `<div class="page"><div class="alert alert-danger"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div></div>`;
        debug(`Render-Fehler auf ${page}: ${e.message}`);
      });
    } else {
      main.innerHTML = result || `<div class="page"><p>Seite nicht gefunden.</p></div>`;
      updateBadges();
    }
  } catch(e) {
    main.innerHTML = `<div class="page"><div class="alert alert-danger"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div></div>`;
    debug(`Render-Fehler auf ${page}: ${e.message}`);
  }
  // Nutzerverwaltung: Daten asynchron nachladen
  if (page === 'nutzerverwaltung') {
    setTimeout(ladeNutzerverwaltung, 50);
  }
}

function updateBadges() {
  const alle = SLZB_DB.erfolge;
  const offene = alle.filter(e=>['Eingereicht','Datenprüfung','Dublettenverdacht','Einwilligungsprüfung','Redaktion'].includes(e.status)).length;
  const rueck  = alle.filter(e=>e.status==='Rückfrage an Melder'&&e.melderId===Auth.id()).length;
  const frg    = alle.filter(e=>e.status==='Freigabe Öffentlichkeitsarbeit').length;
  document.querySelectorAll('[data-badge="redaktion"]').forEach(el=>{el.textContent=offene||'';el.classList.toggle('hidden',!offene);});
  document.querySelectorAll('[data-badge="rueckfragen"]').forEach(el=>{el.textContent=rueck||'';el.classList.toggle('hidden',!rueck);});
  document.querySelectorAll('[data-badge="freigabe"]').forEach(el=>{el.textContent=frg||'';el.classList.toggle('hidden',!frg);});
}

// ── Sidebar ──────────────────────────────────────────────────
function renderSidebar() {
  const r = Auth.rolle(); const name = Auth.name();
  const initials = name.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
  const navDef = [
    {page:'dashboard',icon:'🏠',label:'Dashboard',roles:['trainer','redaktion','oea','datenschutz','admin']},
    {section:'Meldungen',roles:['trainer','redaktion','admin']},
    {page:'neue-meldung',icon:'➕',label:'Neue Meldung',roles:['trainer','redaktion','admin']},
    {page:'meine-meldungen',icon:'📋',label:'Meine Meldungen',roles:['trainer','redaktion','admin']},
    {page:'rueckfragen',icon:'💬',label:'Rückfragen',badge:'rueckfragen',roles:['trainer','redaktion','admin']},
    {page:'import',icon:'📥',label:'Import',roles:['trainer','redaktion','admin']},
    {section:'Redaktion',roles:['redaktion','oea','admin']},
    {page:'redaktion',icon:'✏️',label:'Redaktionsübersicht',badge:'redaktion',roles:['redaktion','admin']},
    {page:'ausgaben',icon:'📤',label:'Ausgaben & Freigaben',badge:'freigabe',roles:['redaktion','oea','admin']},
    {page:'archiv',icon:'🗄️',label:'Archiv',roles:['redaktion','oea','admin']},
    {section:'Auswertung',roles:['redaktion','oea','admin']},
    {page:'jahreschronik',icon:'📅',label:'Jahreschronik',roles:['redaktion','oea','admin']},
    {section:'Datenschutz',roles:['datenschutz','admin']},
    {page:'einwilligungen',icon:'🔒',label:'Einwilligungen',roles:['datenschutz','admin']},
    {section:'Administration',roles:['admin']},
    {page:'stammdaten',icon:'⚙️',label:'Stammdaten',roles:['admin']},
    {page:'nutzerverwaltung',icon:'👥',label:'Nutzerverwaltung',roles:['admin']},
    {page:'diagnose',icon:'🔍',label:'Diagnose',roles:['admin']},
    {section:'Mein Konto',roles:['trainer','redaktion','oea','datenschutz','admin']},
    {page:'mein-profil',icon:'👤',label:'Mein Profil',roles:['trainer','redaktion','oea','datenschutz','admin']},
  ];
  let navHtml = '';
  navDef.forEach(item=>{
    if (!item.roles.includes(r)) return;
    if (item.section) { navHtml+=`<div class="nav-section-label">${esc(item.section)}</div>`; return; }
    const badge = item.badge ? `<span class="nav-badge hidden" data-badge="${item.badge}"></span>` : '';
    navHtml += `<div class="nav-item${APP.currentPage===item.page?' active':''}" data-page="${item.page}"
      onclick="navigateTo('${item.page}')">
      <span class="nav-icon">${item.icon}</span><span>${esc(item.label)}</span>${badge}</div>`;
  });
  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-logo"><div class="logo-badge">
      <div class="logo-icon">S</div>
      <div class="logo-text"><strong>SLZB-Erfolge</strong><small>v3 · Schul- und Leistungssportzentrum Berlin</small></div>
    </div></div>
    <div class="sidebar-user">
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${esc(name)}</div>
        <div class="user-role">${esc({trainer:'Trainer/Melder',redaktion:'Redaktion',oea:'Öffentlichkeitsarbeit',datenschutz:'Datenschutz',admin:'Administrator'}[r]||r)}</div>
      </div>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,.1);font-size:.7rem;opacity:.4;text-align:center">
      SLZB-Erfolge v3.0<br>© SLZB Berlin
    </div>`;
  updateBadges();
}

function initApp() {
  renderSidebar();
  document.getElementById('topbar-subtitle').textContent =
    `Angemeldet als: ${Auth.name()} (${Auth.rolle()})`;
  navigateTo('dashboard');
}

// ── Dashboard ────────────────────────────────────────────────
// Cache für geladene Erfolge
APP._erfolgeCache = null;
APP._lastLoad = 0;

async function ladeErfolge(force=false) {
  const jetzt = Date.now();
  if (!force && APP._erfolgeCache && (jetzt - APP._lastLoad) < 30000) {
    return APP._erfolgeCache;
  }
  try {
    const erfolge = await DB.getErfolge();
    APP._erfolgeCache = erfolge;
    APP._lastLoad = jetzt;
    return erfolge;
  } catch(e) {
    debug('Erfolge laden fehlgeschlagen: '+e.message);
    return APP._erfolgeCache || [];
  }
}

async function renderDashboard() {
  // Sofort Spinner zeigen, dann Daten laden
  const alle = await ladeErfolge();
  const freigegeben = alle.filter(e=>['Freigegeben','Veröffentlicht'].includes(e.status)).length;
  const offen = alle.filter(e=>['Eingereicht','Datenprüfung','Redaktion','Einwilligungsprüfung','Dublettenverdacht'].includes(e.status)).length;
  const unvollst = alle.filter(e=>e.status==='Unvollständig').length;
  const gesperrt = alle.filter(e=>e.status==='Wegen Einwilligung gesperrt').length;
  const rueck = alle.filter(e=>e.status==='Rückfrage an Melder').length;
  const frg = alle.filter(e=>e.status==='Freigabe Öffentlichkeitsarbeit').length;
  const recent = [...alle].sort((a,b)=>new Date(b.eingangsdatum)-new Date(a.eingangsdatum)).slice(0,6);

  return `<div class="page">
    <div class="page-header"><h1>Dashboard</h1>
      <p>Willkommen, ${esc(Auth.name())}. <span class="text-muted text-sm">v3 · Supabase Auth</span></p></div>
    <div class="grid grid-4 mb-4">
      <div class="stat-card clickable" style="cursor:pointer" onclick="navigateTo('archiv')"><div class="stat-icon blue">📋</div><div><div class="stat-value">${alle.length}</div><div class="stat-label">Meldungen gesamt</div></div></div>
      <div class="stat-card clickable" style="cursor:pointer" onclick="navigateTo('ausgaben')"><div class="stat-icon green">✅</div><div><div class="stat-value">${freigegeben}</div><div class="stat-label">Freigegeben</div></div></div>
      <div class="stat-card clickable" style="cursor:pointer" onclick="navigateTo('redaktion')"><div class="stat-icon orange">⏳</div><div><div class="stat-value">${offen}</div><div class="stat-label">In Bearbeitung</div></div></div>
      <div class="stat-card clickable" style="cursor:pointer" onclick="navigateTo('einwilligungen')"><div class="stat-icon red">🔒</div><div><div class="stat-value">${gesperrt}</div><div class="stat-label">Gesperrt</div></div></div>
    </div>
    <div class="grid grid-3 mb-4">
      <div class="stat-card clickable" style="cursor:pointer" onclick="navigateTo('redaktion')"><div class="stat-icon orange">⚠️</div><div><div class="stat-value">${unvollst}</div><div class="stat-label">Unvollständig</div></div></div>
      <div class="stat-card clickable" style="cursor:pointer" onclick="navigateTo('rueckfragen')"><div class="stat-icon purple">💬</div><div><div class="stat-value">${rueck}</div><div class="stat-label">Rückfragen</div></div></div>
      <div class="stat-card clickable" style="cursor:pointer" onclick="navigateTo('ausgaben')"><div class="stat-icon gold">🏆</div><div><div class="stat-value">${frg}</div><div class="stat-label">Warten auf ÖA</div></div></div>
    </div>
    ${Auth.canDo('erfassen') ? `<div class="card mb-4">
      <div class="card-header"><h2>➕ Schnellerfassung</h2></div>
      <div class="card-body"><div class="meldungsart-grid">
        ${[{art:'Einzelerfolg',icon:'🏅',desc:'Ein Schüler, ein Ergebnis'},
           {art:'Teamerfolg',icon:'🏆',desc:'Mehrere Schüler, gemeinsames Ergebnis'},
           {art:'Sammelmeldung',icon:'📊',desc:'Import / Schnelleingabe'},
           {art:'Fertiger Artikel',icon:'📰',desc:'Text mit KI-Extraktion'},
           {art:'Minimalmeldung',icon:'⚡',desc:'Schnellmeldung, Details folgen'},
        ].map(m=>`<div class="meldungsart-card" onclick="APP.selectedMeldungsart='${m.art}';navigateTo('neue-meldung')">
          <div class="meldungsart-icon">${m.icon}</div>
          <div class="meldungsart-title">${m.art}</div>
          <div class="meldungsart-desc">${m.desc}</div>
        </div>`).join('')}
      </div></div></div>` : ''}
    <div class="card">
      <div class="card-header"><h2>🕐 Letzte Meldungen</h2>
        <button class="btn btn-ghost btn-sm" onclick="navigateTo('archiv')">Alle →</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nr.</th><th>Titel</th><th>Sportart</th><th>Datum</th><th>Status</th><th>Melder</th><th></th></tr></thead>
        <tbody>${recent.length===0?'<tr><td colspan="7" class="text-center text-muted" style="padding:30px">Noch keine Meldungen.</td></tr>':
          recent.map(e=>{const sp=SLZB_DB.getSportart(e.sportartId);
            return`<tr class="clickable" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
              <td class="text-xs text-muted">${esc(e.erfolgNr||'–')}</td>
              <td><strong>${esc(e.titel)}</strong><br><span class="text-xs text-muted">${esc(e.meldungsart)}</span></td>
              <td class="text-sm">${esc(sp?.name||'–')}</td>
              <td class="text-sm">${fmt(e.datum)}</td>
              <td>${statusBadge(e.status)}</td>
              <td class="text-sm">${esc(e.melderName)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">→</button></td>
            </tr>`;}).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

// ── Diagnose-Seite (Admin) ───────────────────────────────────
function renderDiagnose() {
  return `<div class="page">
    <div class="page-header"><h1>🔍 Diagnose & Debug</h1><p>Nur für Administratoren.</p></div>

    <div class="card mb-3">
      <div class="card-header"><h2>Supabase-Verbindung</h2></div>
      <div class="card-body">
        <div class="form-row cols-2">
          <div>
            <div class="section-title">Konfiguration</div>
            <table style="font-size:.82rem;width:100%">
              <tr><td class="text-muted" style="padding:4px 0;width:40%">URL</td><td>${esc(window.SLZB_CONFIG?.supabaseUrl||'–')}</td></tr>
              <tr><td class="text-muted" style="padding:4px 0">Anon-Key</td><td class="text-xs">${(window.SLZB_CONFIG?.supabaseAnonKey||'').slice(0,30)}...</td></tr>
              <tr><td class="text-muted" style="padding:4px 0">Nutzer-ID</td><td class="text-xs">${esc(Auth.id()||'–')}</td></tr>
              <tr><td class="text-muted" style="padding:4px 0">E-Mail</td><td>${esc(Auth.email()||'–')}</td></tr>
              <tr><td class="text-muted" style="padding:4px 0">Rolle</td><td>${esc(Auth.rolle()||'–')}</td></tr>
            </table>
          </div>
          <div>
            <div class="section-title">Tests</div>
            <div class="flex gap-2" style="flex-wrap:wrap">
              <button class="btn btn-outline btn-sm" onclick="testDbVerbindung()">🗄️ DB testen</button>
              <button class="btn btn-outline btn-sm" onclick="testEdgeFunction()">⚡ Edge Function testen</button>
              <button class="btn btn-outline btn-sm" onclick="testNutzerListe()">👥 Nutzerliste laden</button>
            </div>
            <div id="diagnose-ergebnis" class="mt-3"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>Debug-Log</h2>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('debug-log').innerHTML=dbg.join('<br>')">Aktualisieren</button>
      </div>
      <div class="card-body">
        <pre id="debug-log" style="font-size:.72rem;max-height:300px;overflow-y:auto;background:#f8f9fa;padding:12px;border-radius:8px">${dbg.join('\n')}</pre>
      </div>
    </div>
  </div>`;
}

async function testDbVerbindung() {
  const el = document.getElementById('diagnose-ergebnis');
  el.innerHTML = '<div class="alert alert-info"><span class="alert-icon">⏳</span><span>Teste DB...</span></div>';
  try {
    const { data, error } = await Backend.client.from('profiles').select('id').limit(1);
    if (error) throw new Error(error.message);
    el.innerHTML = `<div class="alert alert-success"><span class="alert-icon">✅</span><span>DB erreichbar. ${data?.length||0} Profile gefunden.</span></div>`;
    debug('DB-Test OK');
  } catch(e) {
    el.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><span>DB-Fehler: ${esc(e.message)}</span></div>`;
    debug('DB-Test FEHLER: '+e.message);
  }
}

async function testEdgeFunction() {
  const el = document.getElementById('diagnose-ergebnis');
  el.innerHTML = '<div class="alert alert-info"><span class="alert-icon">⏳</span><span>Teste Edge Function admin-user...</span></div>';
  try {
    debug('Edge Function Test: action=list');
    const result = await Backend.invoke('admin-user', { action: 'list' });
    el.innerHTML = `<div class="alert alert-success"><span class="alert-icon">✅</span><span>Edge Function OK. Antwort: ${esc(JSON.stringify(result).slice(0,200))}</span></div>`;
    debug('Edge Function OK: '+JSON.stringify(result).slice(0,100));
  } catch(e) {
    el.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><span>Edge Function Fehler: ${esc(e.message)}</span></div>`;
    debug('Edge Function FEHLER: '+e.message);
  }
}

async function testNutzerListe() {
  const el = document.getElementById('diagnose-ergebnis');
  el.innerHTML = '<div class="alert alert-info"><span class="alert-icon">⏳</span><span>Lade Nutzerliste...</span></div>';
  try {
    // Erst Edge Function versuchen
    let users;
    try {
      const result = await UserAdmin.call('list');
      users = result.users || result || [];
      debug('Nutzerliste via Edge Function: '+users.length+' Nutzer');
    } catch(e) {
      debug('Edge Function fehlgeschlagen, Fallback auf profiles: '+e.message);
      users = await UserAdmin.loadFallback();
      debug('Nutzerliste via profiles: '+users.length+' Nutzer');
    }
    el.innerHTML = `<div class="alert alert-success"><span class="alert-icon">✅</span><span>${users.length} Nutzer geladen.</span></div>
      <pre style="font-size:.72rem;background:#f8f9fa;padding:10px;border-radius:6px;margin-top:8px;max-height:200px;overflow-y:auto">${esc(JSON.stringify(users,null,2).slice(0,1000))}</pre>`;
  } catch(e) {
    el.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div>`;
    debug('Nutzerliste FEHLER: '+e.message);
  }
}

// ── Neue Meldung ─────────────────────────────────────────────
function renderNeueMeldung() {
  if (!APP.selectedMeldungsart) return renderMeldungsartAuswahl();
  const forms = {
    'Einzelerfolg':    renderEinzelerfolgForm,
    'Teamerfolg':      renderTeamerfolgForm,
    'Sammelmeldung':   renderSammelmeldungForm,
    'Fertiger Artikel':renderArtikelForm,
    'Minimalmeldung':  renderMinimalmeldungForm,
  };
  return (forms[APP.selectedMeldungsart]||renderMeldungsartAuswahl)();
}

function renderMeldungsartAuswahl() {
  return `<div class="page">
    <div class="page-header"><h1>Neue Meldung</h1></div>
    <div class="meldungsart-grid">
      ${[{art:'Einzelerfolg',icon:'🏅',desc:'Ein Schüler, ein Wettbewerb, ein Ergebnis.'},
         {art:'Teamerfolg',icon:'🏆',desc:'Mehrere Schüler, Team/Mannschaft.'},
         {art:'Sammelmeldung',icon:'📊',desc:'CSV-Import oder Schnelleingabe.'},
         {art:'Fertiger Artikel',icon:'📰',desc:'Artikeltext einreichen.'},
         {art:'Minimalmeldung',icon:'⚡',desc:'Schnellmeldung. Status: Unvollständig.'},
      ].map(m=>`<div class="meldungsart-card" onclick="APP.selectedMeldungsart='${m.art}';navigateTo('neue-meldung')">
        <div class="meldungsart-icon">${m.icon}</div>
        <div class="meldungsart-title">${m.art}</div>
        <div class="meldungsart-desc">${m.desc}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

function formularKopf(titel, icon) {
  return `<div class="page-header flex items-center gap-3">
    <button class="btn btn-ghost btn-sm" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">← Zurück</button>
    <div><h1>${icon} ${titel}</h1></div>
  </div>`;
}

function bilderBlock() {
  return `<div class="card mb-3">
    <div class="card-header"><h2>📷 Bilder <span class="text-muted text-sm">(optional, 0–n)</span></h2></div>
    <div class="card-body">
      <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
        <span>Bilder nur hochladen wenn Nutzungsrechte vorhanden. <strong>Urheber und Quelle sind Pflichtfelder.</strong></span></div>
      <div class="alert alert-warning mt-2"><span class="alert-icon">⚠️</span>
        <span><strong>Teamfoto-Regel:</strong> Fehlt für eine abgebildete Person die Einwilligung, darf das Bild nicht verwendet werden.</span></div>
      <div id="bilder-liste"></div>
      <button class="btn btn-ghost btn-sm mt-2" onclick="addBildRow()">+ Bild hinzufügen</button>
    </div>
  </div>`;
}



function kerndatenFelder(extra='') {
  return `<div id="form-errors"></div>
  <div class="form-group"><label>Titel <span class="required">*</span></label>
    <input type="text" id="f-titel" placeholder="z.B. Landesmeister 100m Sprint 2026" maxlength="300"></div>
  <div class="form-row cols-2">
    <div class="form-group"><label>Sportart <span class="required">*</span></label>
      <input type="text" id="f-sportart-text" placeholder="z.B. Leichtathletik" autocomplete="off"></div>
    <div class="form-group"><label>Disziplin</label>
      <input type="text" id="f-disziplin" placeholder="z.B. 100m Sprint" autocomplete="off"></div>
  </div>
  <div class="form-group"><label>Wettbewerb / Veranstaltung</label>
    <input type="text" id="f-wettbewerb-text" placeholder="z.B. Berliner Landesmeisterschaften 2026" autocomplete="off"></div>
  <div class="form-row cols-4">
    <div class="form-group"><label>Datum <span class="required">*</span></label><input type="date" id="f-datum"></div>
    <div class="form-group"><label>Ort</label><input type="text" id="f-ort" placeholder="z.B. Berlin"></div>
    <div class="form-group"><label>Ebene</label>
      <select id="f-ebene"><option value="">–</option>${ebeneOptions()}</select></div>
    <div class="form-group"><label>Medaille</label>
      <select id="f-medaille">${['keine','Bronze','Silber','Gold'].map(m=>`<option>${m}</option>`).join('')}</select></div>
  </div>
  <div class="form-row cols-3">
    <div class="form-group"><label>Platzierung</label>
      <input type="number" id="f-platzierung" min="1" placeholder="1"></div>
    <div class="form-group"><label>Ergebnis (Wert)</label>
      <input type="number" id="f-ergebnis-wert" step="0.001" placeholder="10.85"></div>
    <div class="form-group"><label>Einheit</label>
      <input type="text" id="f-ergebnis-einheit" placeholder="Sekunden / Meter / Punkte"></div>
  </div>
  <div class="form-group"><label>Ergebnis (Text)</label>
    <input type="text" id="f-ergebnis-text" placeholder="z.B. Neuer Schulrekord"></div>
  <div class="form-group"><label>Kurzinfo</label>
    <textarea id="f-kurzinfo" rows="3" placeholder="Kurze Beschreibung..."></textarea></div>
  ${extra}`;
}

function bindKerndatenAC() {
  setTimeout(()=>{
    bindSportartAC('f-sportart-text','f-disziplin');
    bindAutocomplete('f-wettbewerb-text', SLZB_DB.wettbewerbe.map(w=>w.name));
  },100);
}

function renderEinzelerfolgForm() {
  const html = `<div class="page">
    ${formularKopf('Einzelerfolg melden','🏅')}
    <div class="card mb-3">
      <div class="card-header"><h2>Kerndaten</h2></div>
      <div class="card-body">
        ${kerndatenFelder(`
        <div class="form-group">
          <label>Athlet/in <span class="hint">(Freitext – kein Schüler muss vorher angelegt sein)</span></label>
          <input type="text" id="f-schueler-text"
            placeholder="z.B. Max M., Klasse 10a – oder leer lassen" autocomplete="off">
        </div>
        <div class="form-group"><label>Quell-URL</label>
          <input type="url" id="f-quelle" placeholder="https://..."></div>`)}
      </div>
    </div>
    ${bilderBlock()}
    <div class="card"><div class="card-footer">
      <button class="btn btn-ghost" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">Abbrechen</button>
      <button class="btn btn-outline" onclick="speichereErfolg('Entwurf','Einzelerfolg')">💾 Entwurf</button>
      <button class="btn btn-primary" onclick="speichereErfolg('Eingereicht','Einzelerfolg')">📤 Einreichen</button>
    </div></div>
  </div>`;
  setTimeout(()=>{ bindKerndatenAC(); }, 100);
  return html;
}

function renderTeamerfolgForm() {
  APP._teamBeteiligte = [];
  const html = `<div class="page">
    ${formularKopf('Teamerfolg melden','🏆')}
    <div class="card mb-3">
      <div class="card-header"><h2>Team & Kerndaten</h2></div>
      <div class="card-body">
        ${kerndatenFelder(`
        <div class="form-group">
          <label>Team / Mannschaft <span class="hint">(Freitext)</span></label>
          <input type="text" id="f-team-text"
            placeholder="z.B. Staffel 4×100m Männer" autocomplete="off">
        </div>`)}
      </div>
    </div>
    <div class="card mb-3">
      <div class="card-header"><h2>👥 Beteiligte Personen</h2></div>
      <div class="card-body">
        <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
          <span>Namen als Freitext – keine Vorregistrierung nötig.</span></div>
        <div class="form-row cols-2 mt-3">
          <div class="form-group"><label>Name hinzufügen</label>
            <input type="text" id="schueler-add-text"
              placeholder="z.B. Max M., Klasse 10a" autocomplete="off"></div>
          <div class="form-group"><label>Rolle</label>
            <select id="schueler-add-rolle">
              ${['Athlet','Kapitän','Ersatz','Trainer','Betreuer','Sonstiges'].map(r=>`<option>${r}</option>`).join('')}
            </select></div>
        </div>
        <button class="btn btn-outline btn-sm mb-3" onclick="addFreitextZuTeam()">+ Hinzufügen</button>
        <div id="team-beteiligte-liste"><p class="text-muted text-sm">Noch keine Beteiligten.</p></div>
      </div>
    </div>
    ${bilderBlock()}
    <div class="card"><div class="card-footer">
      <button class="btn btn-ghost" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">Abbrechen</button>
      <button class="btn btn-outline" onclick="speichereTeamerfolg('Entwurf')">💾 Entwurf</button>
      <button class="btn btn-primary" onclick="speichereTeamerfolg('Eingereicht')">📤 Einreichen</button>
    </div></div>
  </div>`;
  setTimeout(()=>{ bindKerndatenAC(); }, 100);
  return html;
}

function addFreitextZuTeam() {
  const text = document.getElementById('schueler-add-text')?.value?.trim()||'';
  const rolle = document.getElementById('schueler-add-rolle')?.value||'Athlet';
  if (!text) { toast('Bitte Name eingeben','warning'); return; }
  if (APP._teamBeteiligte.find(b=>b.anzeigename===text)) { toast('Name bereits in der Liste','warning'); return; }
  APP._teamBeteiligte.push({ schuelerId:null, anzeigename:text, rolle, einwilligungsstatus:'Nicht geprüft' });
  renderTeamBeteiligteFreitext();
  document.getElementById('schueler-add-text').value='';
}
function removeFreitextVonTeam(name) {
  APP._teamBeteiligte = APP._teamBeteiligte.filter(b=>b.anzeigename!==name);
  renderTeamBeteiligteFreitext();
}
function renderTeamBeteiligteFreitext() {
  const c = document.getElementById('team-beteiligte-liste'); if(!c) return;
  if (!APP._teamBeteiligte.length) { c.innerHTML='<p class="text-muted text-sm">Noch keine Beteiligten.</p>'; return; }
  c.innerHTML=`<div class="schueler-chips">
    ${APP._teamBeteiligte.map(b=>`<div class="schueler-chip">
      <span>${esc(b.anzeigename)}</span>
      <span class="text-xs text-muted">(${esc(b.rolle)})</span>
      <span class="chip-remove" onclick="removeFreitextVonTeam('${esc(b.anzeigename)}')">✕</span>
    </div>`).join('')}
  </div>`;
}

function renderMinimalmeldungForm() {
  return `<div class="page">
    ${formularKopf('Minimalmeldung','⚡')}
    <div class="alert alert-warning"><span class="alert-icon">⚠️</span>
      <span>Minimalmeldungen erhalten automatisch den Status <strong>Unvollständig</strong>.</span></div>
    <div class="card">
      <div class="card-body">
        <div id="form-errors"></div>
        <div class="form-row cols-2">
          <div class="form-group"><label>Sportart <span class="required">*</span></label>
            <input type="text" id="f-sportart-text" placeholder="z.B. Leichtathletik" autocomplete="off"></div>
          <div class="form-group"><label>Wettbewerb</label>
            <input type="text" id="f-wettbewerb-text" placeholder="z.B. Berliner Landesmeisterschaften" autocomplete="off"></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label>Datum <span class="required">*</span></label><input type="date" id="f-datum"></div>
          <div class="form-group"><label>Ort</label><input type="text" id="f-ort"></div>
        </div>
        <div class="form-group"><label>Titel</label>
          <input type="text" id="f-titel" placeholder="Kurzer Titel (optional)"></div>
        <div class="form-group"><label>Kurzinfo <span class="required">*</span></label>
          <textarea id="f-kurzinfo" rows="3" placeholder="Was ist passiert?"></textarea></div>
      </div>
      <div class="card-footer">
        <button class="btn btn-ghost" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">Abbrechen</button>
        <button class="btn btn-warning" onclick="speichereErfolg('Unvollständig','Minimalmeldung')">⚡ Einreichen</button>
      </div>
    </div>
  </div>`;
}

function renderArtikelForm() {
  return `<div class="page">
    ${formularKopf('Fertiger Artikel','📰')}
    <div class="card">
      <div class="card-body">
        <div id="form-errors"></div>
        <div class="alert alert-info"><span class="alert-icon">🤖</span>
          <span>KI-Extraktion erzeugt nur einen <strong>Entwurf</strong>. Alle Daten müssen manuell bestätigt werden.</span></div>
        <div class="form-group"><label>Artikeltext <span class="required">*</span></label>
          <textarea id="f-artikel-text" rows="10" placeholder="Fügen Sie hier den vollständigen Artikeltext ein..."></textarea></div>
        <div class="form-row cols-2">
          <div class="form-group"><label>Sportart <span class="required">*</span></label>
            <input type="text" id="f-sportart-text" placeholder="z.B. Leichtathletik" autocomplete="off"></div>
          <div class="form-group"><label>Datum <span class="required">*</span></label><input type="date" id="f-datum"></div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-ghost" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">Abbrechen</button>
        <button class="btn btn-primary" onclick="speichereArtikel()">📤 Einreichen</button>
      </div>
    </div>
  </div>`;
}

async function speichereErfolg(status, meldungsart) {
  const daten = leseDatenAusFormular(meldungsart);
  const athletText = document.getElementById('f-schueler-text')?.value?.trim()||'';
  const fehler = validiereFormular(daten, meldungsart);
  if (fehler.length) {
    const el=document.getElementById('form-errors');
    if(el) el.innerHTML=`<div class="alert alert-danger"><span class="alert-icon">❌</span><ul>${fehler.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
    return;
  }
  const btn=document.querySelector('.card-footer .btn-primary');
  if(btn){btn.disabled=true;btn.textContent='Wird gespeichert...';}
  try {
    const beteiligte = athletText ? [{
      schuelerId:null, anzeigename:athletText,
      rolle:'Athlet', einwilligungsstatus:'Nicht geprüft'
    }] : [];
    const result = await DB.erstelleErfolg({...daten,status}, beteiligte);
    if (!result.ok) throw new Error(result.fehler||'Unbekannter Fehler');
    APP.selectedMeldungsart=null;
    toast(`Erfolg ${result.nr} ${status==='Entwurf'?'als Entwurf gespeichert':'eingereicht'}!`,'success');
    navigateTo('erfolg-detail',{currentErfolgId:result.id});
  } catch(e) {
    toast('Fehler: '+e.message,'danger');
    if(btn){btn.disabled=false;btn.textContent='📤 Einreichen';}
  }
}

async function speichereTeamerfolg(status) {
  const daten = leseDatenAusFormular('Teamerfolg');
  const teamText = document.getElementById('f-team-text')?.value?.trim()||'';
  const fehler = validiereFormular(daten,'Teamerfolg');
  if (fehler.length) {
    const el=document.getElementById('form-errors');
    if(el) el.innerHTML=`<div class="alert alert-danger"><span class="alert-icon">❌</span><ul>${fehler.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
    return;
  }
  const btn=document.querySelector('.card-footer .btn-primary');
  if(btn){btn.disabled=true;btn.textContent='Wird gespeichert...';}
  try {
    const beteiligte = APP._teamBeteiligte.map(b=>({
      schuelerId:null, anzeigename:b.anzeigename,
      rolle:b.rolle, einwilligungsstatus:'Nicht geprüft'
    }));
    const titelFinal = daten.titel || teamText || 'Teamerfolg';
    const result = await DB.erstelleErfolg({...daten,titel:titelFinal,status}, beteiligte);
    if (!result.ok) throw new Error(result.fehler||'Unbekannter Fehler');
    APP._teamBeteiligte=[]; APP.selectedMeldungsart=null;
    toast(`Teamerfolg ${result.nr} ${status==='Entwurf'?'gespeichert':'eingereicht'}!`,'success');
    navigateTo('meine-meldungen');
  } catch(e) {
    toast('Fehler: '+e.message,'danger');
    if(btn){btn.disabled=false;btn.textContent='📤 Einreichen';}
  }
}

function renderSammelmeldungForm() {
  return `<div class="page">
    ${formularKopf('Sammelmeldung','📊')}
    <div class="card mb-3">
      <div class="card-header"><h2>📥 CSV-Import</h2></div>
      <div class="card-body">
        <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
          <span>Pflichtfelder: Titel, Sportart, Datum.</span></div>
        <button class="btn btn-outline mt-2" onclick="PDF.downloadImportvorlage()">⬇️ Vorlage herunterladen (CSV)</button>
        <div class="form-group mt-3"><label>CSV-Datei hochladen</label>
          <input type="file" id="import-file" accept=".csv" onchange="importDateiGewaehlt(this)"></div>
        <div id="import-preview"></div>
      </div>
    </div>
  </div>`;
}

// ── Meine Meldungen ──────────────────────────────────────────
async function renderMeineMeldungen() {
  const r = Auth.rolle();
  const filter = r==='admin' ? {} : { melderId: Auth.id() };
  const meldungen = await ladeErfolge();
  const gefiltert = r==='admin' ? meldungen : meldungen.filter(e=>e.melderId===Auth.id());
  return `<div class="page">
    <div class="page-header"><h1>📋 Meine Meldungen</h1><p>${gefiltert.length} Meldung(en).</p></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Nr.</th><th>Titel</th><th>Art</th><th>Sportart</th><th>Datum</th><th>Status</th><th>Eingereicht</th><th></th></tr></thead>
      <tbody>${gefiltert.length===0?'<tr><td colspan="8" class="text-center text-muted" style="padding:30px">Keine Meldungen.</td></tr>':
        gefiltert.map(e=>`<tr class="clickable" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
          <td class="text-xs text-muted">${esc(e.erfolgNr||'–')}</td>
          <td><strong>${esc(e.titel)}</strong></td>
          <td class="text-sm">${esc(e.meldungsart)}</td>
          <td class="text-sm">${esc(e.sportartText||'–')}</td>
          <td class="text-sm">${fmt(e.datum)}</td>
          <td>${statusBadge(e.status)}</td>
          <td class="text-sm text-muted">${fmtDT(e.eingangsdatum)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">→</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>
  </div>`;
}

// ── Rückfragen ───────────────────────────────────────────────
async function renderRueckfragen() {
  const uid = Auth.id(); const r = Auth.rolle();
  const alle = await ladeErfolge();
  const rueck = alle.filter(e=>
    e.status==='Rückfrage an Melder'&&(e.melderId===uid||r==='admin'));
  return `<div class="page">
    <div class="page-header"><h1>💬 Rückfragen</h1><p>${rueck.length} offene Rückfrage(n).</p></div>
    ${rueck.length===0?'<div class="alert alert-success"><span class="alert-icon">✅</span><span>Keine offenen Rückfragen.</span></div>':
      rueck.map(e=>{
        const letzterKommentar=[...e.protokoll].reverse().find(p=>p.kommentar);
        return`<div class="card mb-3">
          <div class="card-header">
            <div><strong>${esc(e.titel)}</strong><br><span class="text-xs text-muted">${esc(e.erfolgNr||e.id)}</span></div>
            ${statusBadge(e.status)}
          </div>
          <div class="card-body">
            ${letzterKommentar?`<div class="alert alert-warning"><span class="alert-icon">💬</span>
              <span><strong>Rückfrage:</strong> ${esc(letzterKommentar.kommentar)}</span></div>`:''}
            <div class="form-group"><label>Ihre Antwort</label>
              <textarea id="antwort-${e.id}" rows="3" placeholder="Bitte ergänzen Sie..."></textarea></div>
          </div>
          <div class="card-footer">
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">Detail</button>
            <button class="btn btn-primary btn-sm" onclick="antworteSenden('${e.id}')">Antwort senden</button>
          </div>
        </div>`;}).join('')}
  </div>`;
}

// ── Redaktionsübersicht ──────────────────────────────────────
async function renderRedaktion() {
  const alle = await ladeErfolge();
  const gruppen=[
    {label:'Neu eingegangen',status:['Eingereicht'],icon:'📥'},
    {label:'Unvollständig',status:['Unvollständig'],icon:'⚠️'},
    {label:'Dublettenverdacht',status:['Dublettenverdacht'],icon:'🔁'},
    {label:'Einwilligungsprüfung',status:['Einwilligungsprüfung'],icon:'🔒'},
    {label:'In Redaktion',status:['Redaktion','Datenprüfung'],icon:'✏️'},
    {label:'Freigabe ÖA',status:['Freigabe Öffentlichkeitsarbeit'],icon:'📢'},
  ];
  return `<div class="page">
    <div class="page-header"><h1>✏️ Redaktionsübersicht</h1></div>
    ${gruppen.map(g=>{
      const items=alle.filter(e=>g.status.includes(e.status));
      if(!items.length) return '';
      return`<div class="card mb-3">
        <div class="card-header"><h2>${g.icon} ${esc(g.label)}</h2><span class="badge badge-info">${items.length}</span></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Nr.</th><th>Titel</th><th>Sportart</th><th>Datum</th><th>Status</th><th>Melder</th><th></th></tr></thead>
          <tbody>${items.map(e=>{const sp=SLZB_DB.getSportart(e.sportartId);
            return`<tr class="clickable" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
              <td class="text-xs text-muted">${esc(e.erfolgNr||'–')}</td>
              <td><strong>${esc(e.titel)}</strong>${e.dublettenhinweis?'<br><span class="badge badge-danger text-xs">Dublette</span>':''}</td>
              <td class="text-sm">${esc(sp?.name||'–')}</td>
              <td class="text-sm">${fmt(e.datum)}</td>
              <td>${statusBadge(e.status)}</td>
              <td class="text-sm">${esc(e.melderName)}</td>
              <td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">Bearbeiten →</button></td>
            </tr>`;}).join('')}
          </tbody>
        </table></div>
      </div>`;}).join('')}
  </div>`;
}

// ── Archiv ───────────────────────────────────────────────────
async function renderArchiv() {
  const alle = await ladeErfolge();
  return `<div class="page">
    <div class="page-header"><h1>🗄️ Archiv</h1><p>${alle.length} Meldungen gesamt.</p></div>
    <div class="card mb-3"><div class="card-body">
      <div class="form-row cols-4">
        <div class="form-group"><label>Suche</label>
          <input type="text" id="archiv-suche" placeholder="Titel..." oninput="filterArchiv()"></div>
        <div class="form-group"><label>Sportart</label>
          <select id="archiv-sportart" onchange="filterArchiv()"><option value="">Alle</option>
            ${SLZB_DB.sportarten.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label>Status</label>
          <select id="archiv-status" onchange="filterArchiv()"><option value="">Alle</option>
            ${['Entwurf','Unvollständig','Eingereicht','Redaktion','Freigegeben','Veröffentlicht','Archiviert'].map(s=>`<option>${s}</option>`).join('')}</select></div>
        <div class="form-group"><label>Ebene</label>
          <select id="archiv-ebene" onchange="filterArchiv()"><option value="">Alle</option>
            ${['Schulebene','Bezirk','Landesebene','Bundesebene','International'].map(e=>`<option>${e}</option>`).join('')}</select></div>
      </div>
    </div></div>
    <div class="card" id="archiv-tabelle">${renderArchivTabelle(SLZB_DB.erfolge)}</div>
  </div>`;
}
function renderArchivTabelle(items) {
  return `<div class="table-wrap"><table>
    <thead><tr><th>Nr.</th><th>Titel</th><th>Art</th><th>Sportart</th><th>Datum</th><th>Ebene</th><th>Platz</th><th>Status</th><th></th></tr></thead>
    <tbody>${items.length===0?'<tr><td colspan="9" class="text-center text-muted" style="padding:30px">Keine Ergebnisse.</td></tr>':
      items.map(e=>{const sp=SLZB_DB.getSportart(e.sportartId);
        return`<tr class="clickable" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
          <td class="text-xs text-muted">${esc(e.erfolgNr||'–')}</td>
          <td><strong>${esc(e.titel)}</strong></td>
          <td class="text-sm">${esc(e.meldungsart)}</td>
          <td class="text-sm">${esc(sp?.name||'–')}</td>
          <td class="text-sm">${fmt(e.datum)}</td>
          <td>${ebeneBadge(e.ebene)}</td>
          <td class="text-sm">${e.platzierung||'–'}${e.medaille&&e.medaille!=='keine'?' '+medailleBadge(e.medaille):''}</td>
          <td>${statusBadge(e.status)}</td>
          <td><button class="btn btn-ghost btn-sm">→</button></td>
        </tr>`;}).join('')}
    </tbody>
  </table></div>`;
}

// ── Interaktionen ────────────────────────────────────────────
function switchTab(id) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const panel=document.getElementById('tab-'+id); if(panel) panel.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b=>{
    if(b.getAttribute('onclick')?.includes(`'${id}'`)) b.classList.add('active');
  });
}


function removeSchuelerVonTeam(id) {
  APP._teamBeteiligte=APP._teamBeteiligte.filter(b=>b.schuelerId!==id);
  renderTeamBeteiligteUI();
}
function renderTeamBeteiligteUI() {
  const c=document.getElementById('team-beteiligte-liste'); if(!c) return;
  if(!APP._teamBeteiligte.length){c.innerHTML='<p class="text-muted text-sm">Noch keine Beteiligten.</p>';return;}
  const hatFehlende=APP._teamBeteiligte.some(b=>{const s=SLZB_DB.getSchueler(b.schuelerId);return !s?.ew?.foto||s?.ewWiderruf;});
  c.innerHTML=`<div class="schueler-chips">
    ${APP._teamBeteiligte.map(b=>{
      const s=SLZB_DB.getSchueler(b.schuelerId);
      const ok=s?.ew?.foto&&!s?.ewWiderruf;
      return`<div class="schueler-chip">
        <span>${esc(s?.anzeigename||b.schuelerId)}</span>
        <span class="text-xs text-muted">(${esc(b.rolle)})</span>
        <span class="chip-status">${ok?'✅':'⚠️'}</span>
        <span class="chip-remove" onclick="removeSchuelerVonTeam('${b.schuelerId}')">✕</span>
      </div>`;}).join('')}
    </div>
    ${hatFehlende?'<div class="alert alert-warning mt-2"><span class="alert-icon">⚠️</span><span>Mindestens eine Person hat keine Fotofreigabe. Teamfotos dürfen nicht verwendet werden.</span></div>':''}`;
}

function addBildRow() {
  const id=++APP._bildZaehler;
  const c=document.getElementById('bilder-liste'); if(!c) return;
  const div=document.createElement('div');
  div.id=`bild-row-${id}`; div.className='card mb-2'; div.style.padding='14px';
  div.innerHTML=`<div class="flex items-center gap-2 mb-2">
    <strong class="text-sm">Bild ${id}</strong>
    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('bild-row-${id}').remove()">✕</button>
  </div>
  <div class="form-row cols-3">
    <div class="form-group"><label>Datei</label><input type="file" accept="image/*"></div>
    <div class="form-group"><label>Urheber <span class="required">*</span></label><input type="text" id="bild-urheber-${id}" placeholder="Name des Fotografen"></div>
    <div class="form-group"><label>Quelle <span class="required">*</span></label><input type="text" id="bild-quelle-${id}" placeholder="z.B. SLZB-Archiv"></div>
  </div>
  <div class="form-row cols-2">
    <div class="form-group"><label>Bildunterschrift</label><input type="text" id="bild-caption-${id}"></div>
    <div class="form-group"><label>Alternativtext</label><input type="text" id="bild-alt-${id}"></div>
  </div>`;
  c.appendChild(div);
}

function leseDatenAusFormular(meldungsart) {
  const sportartText=document.getElementById('f-sportart-text')?.value?.trim()||'';
  const wettbewerbText=document.getElementById('f-wettbewerb-text')?.value?.trim()||'';
  const sp=SLZB_DB.sportarten.find(s=>s.name.toLowerCase()===sportartText.toLowerCase());
  const wb=SLZB_DB.wettbewerbe.find(w=>w.name.toLowerCase()===wettbewerbText.toLowerCase());
  return {
    titel:           document.getElementById('f-titel')?.value?.trim()||'',
    sportartId:      sp?.id||null, sportartText,
    disziplin:       document.getElementById('f-disziplin')?.value||'',
    wettbewerbId:    wb?.id||null,
    datum:           document.getElementById('f-datum')?.value||null,
    ort:             document.getElementById('f-ort')?.value||'',
    ebene:           document.getElementById('f-ebene')?.value||'',
    platzierung:     document.getElementById('f-platzierung')?.value?Number(document.getElementById('f-platzierung').value):null,
    medaille:        document.getElementById('f-medaille')?.value||'keine',
    ergebnisWert:    document.getElementById('f-ergebnis-wert')?.value?Number(document.getElementById('f-ergebnis-wert').value):null,
    ergebnisEinheit: document.getElementById('f-ergebnis-einheit')?.value||'',
    ergebnisText:    document.getElementById('f-ergebnis-text')?.value||'',
    kurzinfo:        document.getElementById('f-kurzinfo')?.value||'',
    quelleUrl:       document.getElementById('f-quelle')?.value||'',
    meldungsart,
  };
}

function validiereFormular(daten, meldungsart) {
  const fehler=[];
  if(!daten.titel?.trim()) fehler.push('Titel ist Pflichtfeld');
  if(!daten.sportartId&&!daten.sportartText) fehler.push('Sportart ist Pflichtfeld');
  if(!daten.datum) fehler.push('Datum ist Pflichtfeld');
  else {
    const d=new Date(daten.datum);
    if(isNaN(d)) fehler.push('Datum ist ungültig');
    else if(d>new Date(Date.now()+365*24*60*60*1000)) fehler.push('Datum liegt mehr als 1 Jahr in der Zukunft');
    else if(d<new Date('2000-01-01')) fehler.push('Datum vor dem Jahr 2000');
  }
  if(daten.platzierung!==null&&daten.platzierung<1) fehler.push('Platzierung muss mindestens 1 sein');
  if(meldungsart==='Minimalmeldung'&&!daten.kurzinfo?.trim()) fehler.push('Kurzinfo ist Pflichtfeld');
  return fehler;
}





async function speichereArtikel() {
  const text=document.getElementById('f-artikel-text')?.value?.trim()||'';
  const sportartText=document.getElementById('f-sportart-text')?.value?.trim()||'';
  const datum=document.getElementById('f-datum')?.value||null;
  const fehler=[];
  if(!text) fehler.push('Artikeltext ist Pflichtfeld');
  if(!sportartText) fehler.push('Sportart ist Pflichtfeld');
  if(!datum) fehler.push('Datum ist Pflichtfeld');
  if(fehler.length){
    const el=document.getElementById('form-errors');
    if(el) el.innerHTML=`<div class="alert alert-danger"><span class="alert-icon">❌</span><ul>${fehler.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
    return;
  }
  const sp=SLZB_DB.sportarten.find(s=>s.name.toLowerCase()===sportartText.toLowerCase());
  try {
    const result=await DB.erstelleErfolg({
      meldungsart:'Fertiger Artikel',
      titel:'[Aus Artikel] '+text.slice(0,60)+'…',
      sportartId:sp?.id||null, sportartText,
      datum, status:'Eingereicht',
      quelleOriginal:text,
    },[]);
    if(!result.ok) throw new Error(result.fehler);
    APP.selectedMeldungsart=null;
    toast(`Artikel ${result.nr} eingereicht!`,'success');
    navigateTo('meine-meldungen');
  } catch(e) {
    toast('Fehler: '+e.message,'danger');
  }
}

function antworteSenden(erfolgId) {
  const antwort=document.getElementById(`antwort-${erfolgId}`)?.value?.trim()||'';
  if(!antwort){toast('Bitte Antwort eingeben','warning');return;}
  SLZB_DB.statusWechsel(erfolgId,'Eingereicht',Auth.name(),`Antwort auf Rückfrage: ${antwort}`);
  toast('Antwort gesendet – Meldung erneut eingereicht','success');
  navigateTo('rueckfragen');
}

async function filterArchiv() {
  const suche=(document.getElementById('archiv-suche')?.value||'').toLowerCase();
  const sportart=document.getElementById('archiv-sportart')?.value||'';
  const status=document.getElementById('archiv-status')?.value||'';
  const ebene=document.getElementById('archiv-ebene')?.value||'';
  const alle=await ladeErfolge();
  const spName=SLZB_DB.getSportart(sportart)?.name?.toLowerCase()||'';
  const gefiltert=alle.filter(e=>{
    if(suche&&!e.titel.toLowerCase().includes(suche)&&!(e.erfolgNr||'').toLowerCase().includes(suche)) return false;
    if(sportart&&e.sportartId!==sportart&&(e.sportartText||'').toLowerCase()!==spName) return false;
    if(status&&e.status!==status) return false;
    if(ebene&&e.ebene!==ebene) return false;
    return true;
  });
  const tabelle=document.getElementById('archiv-tabelle');
  if(tabelle) tabelle.innerHTML=renderArchivTabelle(gefiltert);
}

async function importDateiGewaehlt(input) {
  const preview=document.getElementById('import-preview'); if(!preview) return;
  if(!input.files?.length){preview.innerHTML='';return;}
  const datei=input.files[0];
  try {
    const zeilen=await PDF.leseCSVFlexibel(datei);
    if(!zeilen.length){preview.innerHTML='<div class="alert alert-warning mt-3"><span class="alert-icon">⚠️</span><span>Keine Daten gefunden.</span></div>';return;}
    preview.innerHTML=`<div class="alert alert-success mt-3"><span class="alert-icon">✅</span>
      <span>${zeilen.length} Zeilen eingelesen.</span></div>`;
  } catch(e) {
    preview.innerHTML=`<div class="alert alert-danger mt-3"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div>`;
  }
}