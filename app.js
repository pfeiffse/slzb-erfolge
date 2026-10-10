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
      <img src="slzb-logo.png" alt="SLZB Logo" style="height:44px;width:auto;border-radius:6px"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="logo-icon" style="display:none">S</div>
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
  // 30 Sekunden Cache
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
    <div class="card mb-3">
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
    </div>
    ${bilderBlock()}
    <div class="card">
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
    <div class="card mb-3">
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
    </div>
    ${bilderBlock()}
    <div class="card">
      <div class="card-footer">
        <button class="btn btn-ghost" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">Abbrechen</button>
        <button class="btn btn-primary" onclick="speichereArtikel()">📤 Einreichen</button>
      </div>
    </div>
  </div>`;
}

// Bilder aus bilderBlock() nach dem Speichern hochladen
async function uploadBilderAusFormular(erfolgId) {
  const rows = document.querySelectorAll('[id^="bild-row-"]');
  let ok=0, fehler=0;
  for (const row of rows) {
    const id = row.id.replace('bild-row-','');
    const fileInput = row.querySelector('input[type="file"]');
    const urheber = row.querySelector(`#bild-urheber-${id}`)?.value?.trim()||'';
    const quelle = row.querySelector(`#bild-quelle-${id}`)?.value?.trim()||urheber;
    const caption = row.querySelector(`#bild-caption-${id}`)?.value?.trim()||null;
    const altText = row.querySelector(`#bild-alt-${id}`)?.value?.trim()||null;
    if (!fileInput?.files?.length) continue;
    if (!urheber) { toast(`Bild ${id}: Urheber fehlt – übersprungen`,'warning'); fehler++; continue; }
    const datei = fileInput.files[0];
    if (datei.size > 10*1024*1024) { toast(`Bild ${id}: Datei zu groß – übersprungen`,'warning'); fehler++; continue; }
    try {
      const session = await Backend.session();
      if (!session) throw new Error('Nicht angemeldet');
      const userId = Auth.id();
      const dateiname = `${Date.now()}_${datei.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const pfad = `${userId}/${erfolgId}/${dateiname}`;
      const { data: uploadData, error: uploadError } = await Backend.client.storage
        .from('achievement-media').upload(pfad, datei, { cacheControl:'3600', upsert:false, contentType:datei.type });
      if (uploadError) throw new Error('Storage: '+uploadError.message);
      const { error: metaError } = await Backend.client.from('achievement_media').insert([{
        achievement_id: erfolgId,
        storage_path: uploadData.path || pfad,
        original_name: datei.name,
        mime_type: datei.type,
        file_size: datei.size || null,
        creator: urheber,
        copyright_holder: urheber,
        source: quelle,
        caption: caption,
        alt_text: altText,
        uploaded_by: userId || null,
        created_at: new Date().toISOString(),
      }]);
      if (metaError) {
        await Backend.client.storage.from('achievement-media').remove([pfad]);
        throw new Error('Metadaten: '+metaError.message);
      }
      ok++;
    } catch(err) {
      toast(`Bild ${id} Fehler: ${err.message}`,'danger');
      fehler++;
    }
  }
  if (ok>0) toast(`${ok} Bild(er) erfolgreich hochgeladen`,'success');
  if (fehler>0) toast(`${fehler} Bild(er) konnten nicht hochgeladen werden`,'warning');
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
  const btn=document.querySelector('.card-footer .btn-primary,.card-footer .btn-warning');
  if(btn){btn.disabled=true;btn.textContent='Wird gespeichert...';}
  try {
    const beteiligte = athletText ? [{
      schuelerId:null, anzeigename:athletText,
      rolle:'Athlet', einwilligungsstatus:'Nicht geprüft'
    }] : [];
    const result = await DB.erstelleErfolg({...daten,status}, beteiligte);
    if (!result.ok) throw new Error(result.fehler||'Unbekannter Fehler');
    // Bilder aus Formular hochladen
    await uploadBilderAusFormular(result.id);
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
    // Bilder aus Formular hochladen
    await uploadBilderAusFormular(result.id);
    APP._teamBeteiligte=[]; APP.selectedMeldungsart=null;
    toast(`Teamerfolg ${result.nr} ${status==='Entwurf'?'gespeichert':'eingereicht'}!`,'success');
    navigateTo('meine-meldungen');
  } catch(e) {
    toast('Fehler: '+e.message,'danger');
    if(btn){btn.disabled=false;btn.textContent='📤 Einreichen';}
  }
}

function renderSammelmeldungForm() {
  // Sportart-Optionen für Datalist
  const sportOptionen = SLZB_DB.sportarten.map(s=>`<option value="${esc(s.name)}">`).join('');
  return `<div class="page">
    ${formularKopf('Sammelmeldung','📊')}

    <!-- Tabs -->
    <div class="tabs mb-3" style="display:flex;gap:8px">
      <button class="tab-btn active" id="tab-raster" onclick="sammelTabWechsel('raster')">📋 Raster-Eingabe</button>
      <button class="tab-btn" id="tab-csv" onclick="sammelTabWechsel('csv')">📥 CSV-Import</button>
    </div>

    <!-- RASTER-TAB -->
    <div id="sammel-raster-panel">
      <div class="card mb-3">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h2>📋 Schnelleingabe</h2>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="sammelRasterZeileHinzu()">+ Zeile</button>
            <button class="btn btn-ghost btn-sm" onclick="sammelRasterLeeren()">🗑️ Leeren</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <datalist id="sammel-sportarten">${sportOptionen}</datalist>
          <table id="sammel-tabelle" style="width:100%;border-collapse:collapse;font-size:.85rem">
            <thead>
              <tr style="background:rgba(226,0,26,0.12);position:sticky;top:0;z-index:1">
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:180px">Titel <span class="required">*</span></th>
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:130px">Sportart <span class="required">*</span></th>
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:120px">Datum <span class="required">*</span></th>
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:120px">Wettbewerb</th>
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:80px">Platz</th>
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:80px">Medaille</th>
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:120px">Athlet/Team</th>
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:80px">Ebene</th>
                <th style="padding:8px 6px;text-align:left;white-space:nowrap;min-width:120px">Kurzinfo</th>
                <th style="padding:8px 4px;width:36px"></th>
              </tr>
            </thead>
            <tbody id="sammel-tbody"></tbody>
          </table>
        </div>
        <div class="card-footer" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="sammelRasterZeileHinzu()">+ Zeile hinzufügen</button>
          <span id="sammel-zaehler" class="text-xs text-muted">0 Zeilen</span>
          <div style="flex:1"></div>
          <div id="sammel-fehler" style="color:#E2001A;font-size:.8rem"></div>
          <button class="btn btn-outline btn-sm" onclick="sammelRasterVorschau()">👁️ Vorschau</button>
          <button class="btn btn-primary" onclick="sammelRasterEinreichen()">📤 Alle einreichen</button>
        </div>
      </div>

      <!-- Bilder für Sammelmeldung -->
      <div class="card mb-3">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
          <h2>📷 Bilder <span class="text-muted text-sm">(optional – werden allen eingereichten Meldungen zugeordnet)</span></h2>
          <button class="btn btn-ghost btn-sm" onclick="addBildRow()">+ Bild hinzufügen</button>
        </div>
        <div class="card-body">
          <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
            <span>Bilder werden nach dem Einreichen automatisch allen Meldungen dieser Sammlung zugeordnet. Urheber und Quelle sind Pflichtfelder.</span></div>
          <div id="bilder-liste"></div>
        </div>
      </div>
      <div id="sammel-vorschau"></div>
    </div>

    <!-- CSV-TAB -->
    <div id="sammel-csv-panel" style="display:none">
      <div class="card mb-3">
        <div class="card-header"><h2>📥 CSV-Import</h2></div>
        <div class="card-body">
          <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
            <span>Pflichtfelder: Titel, Sportart, Datum. Trennzeichen: Semikolon oder Komma.</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="btn btn-outline btn-sm" onclick="PDF.downloadImportvorlage()">⬇️ Vorlage herunterladen (CSV)</button>
            <button class="btn btn-ghost btn-sm" onclick="sammelCSVInRaster()">📋 In Raster übernehmen</button>
          </div>
          <div class="form-group mt-3"><label>CSV-Datei hochladen</label>
            <input type="file" id="import-file" accept=".csv,.xlsx" onchange="importDateiGewaehlt(this)"></div>
          <div id="import-preview"></div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Sammelmeldung Raster-Logik ────────────────────────────────
let _sammelZeilen = [];
let _sammelNaechsteId = 1;

function sammelTabWechsel(tab) {
  document.getElementById('sammel-raster-panel').style.display = tab==='raster' ? '' : 'none';
  document.getElementById('sammel-csv-panel').style.display   = tab==='csv'    ? '' : 'none';
  document.querySelectorAll('#tab-raster,#tab-csv').forEach(b=>{
    b.classList.toggle('active', b.id==='tab-'+tab);
  });
}

function sammelRasterZeileHinzu(daten={}) {
  const id = _sammelNaechsteId++;
  _sammelZeilen.push({id, ...daten});
  const tbody = document.getElementById('sammel-tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = `sammel-zeile-${id}`;
  tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,.06)';
  const medailleOpts = ['','Gold','Silber','Bronze'].map(m=>`<option value="${m}"${daten.medaille===m?'selected':''}>${m||'–'}</option>`).join('');
  const ebeneOpts = ['','Schulebene','Bezirk','Landesebene','Bundesebene','International'].map(e=>`<option value="${e}"${daten.ebene===e?'selected':''}>${e||'–'}</option>`).join('');
  tr.innerHTML = `
    <td style="padding:4px 6px"><input type="text" class="sammel-input" data-id="${id}" data-field="titel" value="${esc(daten.titel||'')}" placeholder="Titel" style="width:100%;min-width:170px"></td>
    <td style="padding:4px 6px"><input type="text" class="sammel-input" data-id="${id}" data-field="sportart" value="${esc(daten.sportart||'')}" list="sammel-sportarten" placeholder="Sportart" style="width:100%;min-width:120px"></td>
    <td style="padding:4px 6px"><input type="date" class="sammel-input" data-id="${id}" data-field="datum" value="${esc(daten.datum||'')}" style="width:100%;min-width:110px"></td>
    <td style="padding:4px 6px"><input type="text" class="sammel-input" data-id="${id}" data-field="wettbewerb" value="${esc(daten.wettbewerb||'')}" placeholder="Wettbewerb" style="width:100%;min-width:110px"></td>
    <td style="padding:4px 6px"><input type="number" class="sammel-input" data-id="${id}" data-field="platz" value="${daten.platz||''}" min="1" placeholder="1" style="width:60px"></td>
    <td style="padding:4px 6px"><select class="sammel-input" data-id="${id}" data-field="medaille" style="width:80px">${medailleOpts}</select></td>
    <td style="padding:4px 6px"><input type="text" class="sammel-input" data-id="${id}" data-field="athlet" value="${esc(daten.athlet||'')}" placeholder="Name/Team" style="width:100%;min-width:110px"></td>
    <td style="padding:4px 6px"><select class="sammel-input" data-id="${id}" data-field="ebene" style="width:100px">${ebeneOpts}</select></td>
    <td style="padding:4px 6px"><input type="text" class="sammel-input" data-id="${id}" data-field="kurzinfo" value="${esc(daten.kurzinfo||'')}" placeholder="Kurzinfo" style="width:100%;min-width:110px"></td>
    <td style="padding:4px;text-align:center"><button class="btn btn-ghost btn-sm" onclick="sammelZeileLoeschen(${id})" title="Zeile löschen" style="padding:2px 6px;color:#E2001A">✕</button></td>`;
  // Tab-Navigation zwischen Zeilen
  tr.querySelectorAll('input,select').forEach((el,i,arr)=>{
    el.addEventListener('keydown', ev=>{
      if (ev.key==='Tab' && !ev.shiftKey && i===arr.length-1) {
        ev.preventDefault(); sammelRasterZeileHinzu(); 
        setTimeout(()=>document.querySelector(`#sammel-zeile-${_sammelNaechsteId-1} input`)?.focus(),50);
      }
      if (ev.key==='Enter') { ev.preventDefault(); sammelRasterZeileHinzu(); setTimeout(()=>document.querySelector(`#sammel-zeile-${_sammelNaechsteId-1} input`)?.focus(),50); }
    });
    el.addEventListener('change', ()=>sammelZeileAktualisieren(id));
    el.addEventListener('input', ()=>sammelZeileAktualisieren(id));
  });
  tbody.appendChild(tr);
  sammelZaehlerAktualisieren();
  // Erste Zeile: Fokus auf Titel
  if (_sammelZeilen.length===1) tr.querySelector('input')?.focus();
}

function sammelZeileAktualisieren(id) {
  const tr = document.getElementById(`sammel-zeile-${id}`);
  if (!tr) return;
  const zeile = _sammelZeilen.find(z=>z.id===id);
  if (!zeile) return;
  tr.querySelectorAll('.sammel-input').forEach(el=>{
    zeile[el.dataset.field] = el.value;
  });
}

function sammelZeileLoeschen(id) {
  _sammelZeilen = _sammelZeilen.filter(z=>z.id!==id);
  document.getElementById(`sammel-zeile-${id}`)?.remove();
  sammelZaehlerAktualisieren();
}

function sammelRasterLeeren() {
  if (!confirm('Alle Zeilen löschen?')) return;
  _sammelZeilen = [];
  const tbody = document.getElementById('sammel-tbody');
  if (tbody) tbody.innerHTML = '';
  sammelZaehlerAktualisieren();
}

function sammelZaehlerAktualisieren() {
  const el = document.getElementById('sammel-zaehler');
  if (el) el.textContent = `${_sammelZeilen.length} Zeile(n)`;
}

function sammelRasterDatenLesen() {
  // Aktuelle Werte aus DOM lesen
  _sammelZeilen.forEach(z=>{
    const tr = document.getElementById(`sammel-zeile-${z.id}`);
    if (!tr) return;
    tr.querySelectorAll('.sammel-input').forEach(el=>{ z[el.dataset.field]=el.value; });
  });
  return _sammelZeilen;
}

function sammelRasterValidieren(zeilen) {
  const fehler = [];
  zeilen.forEach((z,i)=>{
    const nr = i+1;
    if (!z.titel?.trim()) fehler.push(`Zeile ${nr}: Titel fehlt`);
    if (!z.sportart?.trim()) fehler.push(`Zeile ${nr}: Sportart fehlt`);
    if (!z.datum) fehler.push(`Zeile ${nr}: Datum fehlt`);
    else {
      const d = new Date(z.datum);
      if (isNaN(d)) fehler.push(`Zeile ${nr}: Datum ungültig`);
      else if (d > new Date(Date.now()+365*24*60*60*1000)) fehler.push(`Zeile ${nr}: Datum > 1 Jahr in Zukunft`);
    }
    if (z.platz && (isNaN(z.platz)||Number(z.platz)<1)) fehler.push(`Zeile ${nr}: Platzierung muss ≥ 1 sein`);
  });
  return fehler;
}

function sammelRasterVorschau() {
  const zeilen = sammelRasterDatenLesen();
  const fehler = sammelRasterValidieren(zeilen);
  const vorschauEl = document.getElementById('sammel-vorschau');
  const fehlerEl = document.getElementById('sammel-fehler');
  if (!vorschauEl) return;

  if (fehler.length) {
    if (fehlerEl) fehlerEl.innerHTML = fehler.map(f=>`⚠️ ${esc(f)}`).join('<br>');
    vorschauEl.innerHTML = '';
    return;
  }
  if (fehlerEl) fehlerEl.innerHTML = '';

  const gueltig = zeilen.filter(z=>z.titel?.trim()&&z.sportart?.trim()&&z.datum);
  if (!gueltig.length) { vorschauEl.innerHTML = '<div class="alert alert-warning mt-2"><span class="alert-icon">⚠️</span><span>Keine gültigen Zeilen.</span></div>'; return; }

  vorschauEl.innerHTML = `<div class="card mt-3">
    <div class="card-header"><h2>👁️ Vorschau (${gueltig.length} Meldungen)</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Titel</th><th>Sportart</th><th>Datum</th><th>Wettbewerb</th><th>Platz</th><th>Athlet/Team</th><th>Status</th></tr></thead>
      <tbody>${gueltig.map((z,i)=>`<tr>
        <td class="text-xs text-muted">${i+1}</td>
        <td><strong>${esc(z.titel)}</strong></td>
        <td class="text-sm">${esc(z.sportart)}</td>
        <td class="text-sm">${z.datum?new Date(z.datum).toLocaleDateString('de-DE'):''}</td>
        <td class="text-sm">${esc(z.wettbewerb||'–')}</td>
        <td class="text-sm">${z.platz?`${z.platz}. Platz`+(z.medaille?` (${z.medaille})`:''):'–'}</td>
        <td class="text-sm">${esc(z.athlet||'–')}</td>
        <td><span class="badge badge-eingereicht">Eingereicht</span></td>
      </tr>`).join('')}
      </tbody>
    </table></div>
    <div class="card-footer">
      <button class="btn btn-primary" onclick="sammelRasterEinreichen()">📤 ${gueltig.length} Meldungen einreichen</button>
    </div>
  </div>`;
}

async function sammelRasterEinreichen() {
  const zeilen = sammelRasterDatenLesen();
  const gueltig = zeilen.filter(z=>z.titel?.trim()&&z.sportart?.trim()&&z.datum);
  const fehler = sammelRasterValidieren(gueltig);
  const fehlerEl = document.getElementById('sammel-fehler');

  if (!gueltig.length) { toast('Keine gültigen Zeilen zum Einreichen','warning'); return; }
  if (fehler.length) {
    if (fehlerEl) fehlerEl.innerHTML = fehler.map(f=>`⚠️ ${esc(f)}`).join('<br>');
    return;
  }
  if (fehlerEl) fehlerEl.innerHTML = '';

  const btn = document.querySelector('#sammel-raster-panel .btn-primary');
  if (btn) { btn.disabled=true; btn.textContent='Wird gespeichert...'; }

  let ok=0, fehlgeschlagen=[], _sammelEingereichtIds=[];
  for (const z of gueltig) {
    try {
      const sp = SLZB_DB.sportarten.find(s=>s.name.toLowerCase()===z.sportart.toLowerCase());
      const wb = SLZB_DB.wettbewerbe.find(w=>w.name.toLowerCase()===(z.wettbewerb||'').toLowerCase());
      const daten = {
        titel: z.titel.trim(),
        sportartId: sp?.id||null, sportartText: z.sportart.trim(),
        wettbewerbId: wb?.id||null, wettbewerbText: z.wettbewerb?.trim()||'',
        datum: z.datum,
        platzierung: z.platz ? Number(z.platz) : null,
        medaille: z.medaille||'keine',
        ebene: z.ebene||'',
        kurzinfo: z.kurzinfo?.trim()||'',
        meldungsart: 'Sammelmeldung',
        status: 'Eingereicht',
      };
      const beteiligte = z.athlet?.trim() ? [{
        schuelerId:null, anzeigename:z.athlet.trim(),
        rolle:'Athlet', einwilligungsstatus:'Nicht geprüft'
      }] : [];
      const result = await DB.erstelleErfolg(daten, beteiligte);
      if (result.ok) { ok++; _sammelEingereichtIds.push(result.id); }
      else fehlgeschlagen.push(`${z.titel}: ${result.fehler}`);
    } catch(e) {
      fehlgeschlagen.push(`${z.titel}: ${e.message}`);
    }
  }

  if (btn) { btn.disabled=false; btn.textContent='📤 Alle einreichen'; }

  if (ok>0) {
    toast(`${ok} Meldung(en) erfolgreich eingereicht!`,'success');
    // Eingereichte Zeilen aus Raster entfernen
    const eingereichtIds = gueltig.slice(0,ok).map(z=>z.id);
    eingereichtIds.forEach(id=>{ _sammelZeilen=_sammelZeilen.filter(z=>z.id!==id); document.getElementById(`sammel-zeile-${id}`)?.remove(); });
    sammelZaehlerAktualisieren();
    APP._erfolgeCache=null;
    // Bilder aus bilderBlock hochladen – für alle eingereichten Meldungen
    const bilderRows = document.querySelectorAll('[id^="bild-row-"]');
    if (bilderRows.length > 0 && _sammelEingereichtIds.length > 0) {
      toast('Bilder werden hochgeladen...','info');
      for (const erfolgId of _sammelEingereichtIds) {
        await uploadBilderAusFormular(erfolgId);
      }
    }
  }
  if (fehlgeschlagen.length) {
    const fehlerEl2 = document.getElementById('sammel-fehler');
    if (fehlerEl2) fehlerEl2.innerHTML = fehlgeschlagen.map(f=>`❌ ${esc(f)}`).join('<br>');
    toast(`${fehlgeschlagen.length} Meldung(en) fehlgeschlagen`,'danger');
  }
}

// CSV-Daten ins Raster übernehmen
async function sammelCSVInRaster() {
  const input = document.getElementById('import-file');
  if (!input?.files?.length) { toast('Bitte zuerst CSV-Datei auswählen','warning'); return; }
  try {
    const zeilen = await PDF.leseCSVFlexibel(input.files[0]);
    if (!zeilen.length) { toast('Keine Daten gefunden','warning'); return; }
    sammelTabWechsel('raster');
    zeilen.forEach(z=>{
      sammelRasterZeileHinzu({
        titel: z.titel||z.Titel||z.title||'',
        sportart: z.sportart||z.Sportart||z.sport||'',
        datum: z.datum||z.Datum||z.date||'',
        wettbewerb: z.wettbewerb||z.Wettbewerb||z.competition||'',
        platz: z.platz||z.Platz||z.placement||'',
        medaille: z.medaille||z.Medaille||z.medal||'',
        athlet: z.athlet||z.Athlet||z.name||z.Name||'',
        ebene: z.ebene||z.Ebene||z.level||'',
        kurzinfo: z.kurzinfo||z.Kurzinfo||z.info||'',
      });
    });
    toast(`${zeilen.length} Zeilen ins Raster übernommen`,'success');
  } catch(e) { toast('Fehler: '+e.message,'danger'); }
}

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
    // Bilder aus Formular hochladen
    await uploadBilderAusFormular(result.id);
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
    // Vorschau-Tabelle
    const felder = Object.keys(zeilen[0]);
    preview.innerHTML=`<div class="alert alert-success mt-3"><span class="alert-icon">✅</span>
      <span>${zeilen.length} Zeilen eingelesen. <button class="btn btn-outline btn-sm ml-2" onclick="sammelCSVInRaster()">📋 In Raster übernehmen</button></span></div>
      <div class="table-wrap mt-2"><table style="font-size:.8rem">
        <thead><tr>${felder.map(f=>`<th>${esc(f)}</th>`).join('')}</tr></thead>
        <tbody>${zeilen.slice(0,5).map(z=>`<tr>${felder.map(f=>`<td>${esc(z[f]||'')}</td>`).join('')}</tr>`).join('')}
        ${zeilen.length>5?`<tr><td colspan="${felder.length}" class="text-center text-muted">... und ${zeilen.length-5} weitere</td></tr>`:''}
        </tbody>
      </table></div>`;
  } catch(e) {
    preview.innerHTML=`<div class="alert alert-danger mt-3"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div>`;
  }
}