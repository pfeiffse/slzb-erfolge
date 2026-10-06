// ============================================================
// SLZB-Erfolge v2 – App-Logik Teil 1
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
  const d=new Date(date);
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
function toast(msg,type='info') {
  const t=document.createElement('div');
  t.className=`alert alert-${type}`;
  t.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;max-width:380px;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:slideUp .2s ease';
  const icons={info:'ℹ️',success:'✅',warning:'⚠️',danger:'❌'};
  t.innerHTML=`<span class="alert-icon">${icons[type]||'ℹ️'}</span><span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3500);
}
function ebeneOptions() {
  return ['Schulebene','Bezirk','Landesebene','Bundesebene','International','Weltmeisterschaft','Olympia','Sonstiges']
    .map(e=>`<option>${e}</option>`).join('');
}

// ── Autocomplete ─────────────────────────────────────────────
function bindAutocomplete(inputId, vorschlaege) {
  const input=document.getElementById(inputId); if(!input) return;
  let liste=document.getElementById(inputId+'-liste');
  if (!liste) {
    liste=document.createElement('datalist');
    liste.id=inputId+'-liste';
    input.parentNode.appendChild(liste);
  }
  input.setAttribute('list',inputId+'-liste');
  liste.innerHTML=vorschlaege.map(v=>`<option value="${esc(v)}">`).join('');
}
function bindSportartAC(inputId, diszInputId) {
  bindAutocomplete(inputId, SLZB_DB.sportarten.map(s=>s.name));
  const input=document.getElementById(inputId); if(!input) return;
  input.addEventListener('input',()=>{
    const sp=SLZB_DB.sportarten.find(s=>s.name.toLowerCase()===input.value.toLowerCase());
    if (sp&&diszInputId) bindAutocomplete(diszInputId, sp.disziplinen||[]);
  });
}

// ── Navigation ───────────────────────────────────────────────
function navigateTo(page, params={}) {
  APP.currentPage=page;
  Object.assign(APP,params);
  document.querySelectorAll('.nav-item').forEach(el=>
    el.classList.toggle('active',el.dataset.page===page));
  document.getElementById('sidebar')?.classList.remove('open');
  const main=document.getElementById('main-page'); if(!main) return;
  main.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;padding:60px"><div class="spinner"></div></div>`;
  const pages={
    dashboard:        renderDashboard,
    'neue-meldung':   renderNeueMeldung,
    'meine-meldungen':renderMeineMeldungen,
    rueckfragen:      renderRueckfragen,
    redaktion:        renderRedaktion,
    'erfolg-detail':  renderErfolgDetail,
    einwilligungen:   renderEinwilligungen,
    ausgaben:         renderAusgaben,
    archiv:           renderArchiv,
    stammdaten:       renderStammdaten,
    import:           renderImport,
    nutzerverwaltung: renderNutzerverwaltung,
    'mein-profil':    renderMeinProfil,
    jahreschronik:    renderJahreschronik,
  };
  const fn=pages[page];
  try { main.innerHTML=fn?fn():`<div class="page"><p>Seite nicht gefunden.</p></div>`; }
  catch(e) { main.innerHTML=`<div class="page"><div class="alert alert-danger"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div></div>`; }
  updateBadges();
}

function updateBadges() {
  const alle=SLZB_DB.erfolge;
  const offene=alle.filter(e=>['Eingereicht','Datenprüfung','Dublettenverdacht','Einwilligungsprüfung','Redaktion'].includes(e.status)).length;
  const rueck=alle.filter(e=>e.status==='Rückfrage an Melder'&&e.melderId===Auth.id()).length;
  const frg=alle.filter(e=>e.status==='Freigabe Öffentlichkeitsarbeit').length;
  document.querySelectorAll('[data-badge="redaktion"]').forEach(el=>{el.textContent=offene||'';el.classList.toggle('hidden',!offene);});
  document.querySelectorAll('[data-badge="rueckfragen"]').forEach(el=>{el.textContent=rueck||'';el.classList.toggle('hidden',!rueck);});
  document.querySelectorAll('[data-badge="freigabe"]').forEach(el=>{el.textContent=frg||'';el.classList.toggle('hidden',!frg);});
}

// ── Sidebar ──────────────────────────────────────────────────
function renderSidebar() {
  const r=Auth.rolle(); const name=Auth.name();
  const initials=name.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
  const navDef=[
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
    {section:'Mein Konto',roles:['trainer','redaktion','oea','datenschutz','admin']},
    {page:'mein-profil',icon:'👤',label:'Mein Profil',roles:['trainer','redaktion','oea','datenschutz','admin']},
  ];
  let navHtml='';
  navDef.forEach(item=>{
    if (!item.roles.includes(r)) return;
    if (item.section){navHtml+=`<div class="nav-section-label">${esc(item.section)}</div>`;return;}
    const badge=item.badge?`<span class="nav-badge hidden" data-badge="${item.badge}"></span>`:'';
    navHtml+=`<div class="nav-item${APP.currentPage===item.page?' active':''}" data-page="${item.page}" onclick="navigateTo('${item.page}')">
      <span class="nav-icon">${item.icon}</span><span>${esc(item.label)}</span>${badge}</div>`;
  });
  document.getElementById('sidebar').innerHTML=`
    <div class="sidebar-logo"><div class="logo-badge">
      <div class="logo-icon">S</div>
      <div class="logo-text"><strong>SLZB-Erfolge</strong><small>Schul- und Leistungssportzentrum Berlin</small></div>
    </div></div>
    <div class="sidebar-user">
      <div class="user-avatar">${initials}</div>
      <div class="user-info"><div class="user-name">${esc(name)}</div>
        <div class="user-role">${esc({trainer:'Trainer/Melder',redaktion:'Redaktion',oea:'Öffentlichkeitsarbeit',datenschutz:'Datenschutz',admin:'Administrator'}[r]||r)}</div>
      </div>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,.1);font-size:.7rem;opacity:.4;text-align:center">
      SLZB-Erfolge v2.0<br>© SLZB Berlin
    </div>`;
  updateBadges();
}

async function initApp() {
  renderSidebar();
  document.getElementById('topbar-subtitle').textContent=`Angemeldet als: ${Auth.name()} (${Auth.rolle()})`;
  navigateTo('dashboard');
}

// ── Dashboard ────────────────────────────────────────────────
function renderDashboard() {
  const alle=SLZB_DB.erfolge;
  const freigegeben=alle.filter(e=>['Freigegeben','Veröffentlicht'].includes(e.status)).length;
  const offen=alle.filter(e=>['Eingereicht','Datenprüfung','Redaktion','Einwilligungsprüfung','Dublettenverdacht'].includes(e.status)).length;
  const unvollst=alle.filter(e=>e.status==='Unvollständig').length;
  const gesperrt=alle.filter(e=>e.status==='Wegen Einwilligung gesperrt').length;
  const rueck=alle.filter(e=>e.status==='Rückfrage an Melder').length;
  const frg=alle.filter(e=>e.status==='Freigabe Öffentlichkeitsarbeit').length;
  const recent=[...alle].sort((a,b)=>new Date(b.eingangsdatum)-new Date(a.eingangsdatum)).slice(0,6);
  return `<div class="page">
    <div class="synthetisch-banner">⚠️ DEMO-MODUS – Alle Daten sind synthetisch und dienen nur zu Testzwecken</div>
    <div class="page-header"><h1>Dashboard</h1><p>Willkommen, ${esc(Auth.name())}.</p></div>
    <div class="grid grid-4 mb-4">
      <div class="stat-card"><div class="stat-icon blue">📋</div><div><div class="stat-value">${alle.length}</div><div class="stat-label">Meldungen gesamt</div></div></div>
      <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">${freigegeben}</div><div class="stat-label">Freigegeben</div></div></div>
      <div class="stat-card"><div class="stat-icon orange">⏳</div><div><div class="stat-value">${offen}</div><div class="stat-label">In Bearbeitung</div></div></div>
      <div class="stat-card"><div class="stat-icon red">🔒</div><div><div class="stat-value">${gesperrt}</div><div class="stat-label">Gesperrt</div></div></div>
    </div>
    <div class="grid grid-3 mb-4">
      <div class="stat-card"><div class="stat-icon orange">⚠️</div><div><div class="stat-value">${unvollst}</div><div class="stat-label">Unvollständig</div></div></div>
      <div class="stat-card"><div class="stat-icon purple">💬</div><div><div class="stat-value">${rueck}</div><div class="stat-label">Rückfragen</div></div></div>
      <div class="stat-card"><div class="stat-icon gold">🏆</div><div><div class="stat-value">${frg}</div><div class="stat-label">Warten auf ÖA</div></div></div>
    </div>
    ${Auth.canDo('erfassen')?`<div class="card mb-4">
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
      </div></div></div>`:''}
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

// ── Neue Meldung ─────────────────────────────────────────────
function renderNeueMeldung() {
  if (!APP.selectedMeldungsart) return renderMeldungsartAuswahl();
  const forms={
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

function kerndatenFelder(extra='') {
  return `<div class="alert alert-info mb-3"><span class="alert-icon">💡</span>
    <span>Tippen Sie in die Felder – Vorschläge erscheinen automatisch.</span></div>
  <div id="form-errors"></div>
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
  const html=`<div class="page">
    ${formularKopf('Einzelerfolg melden','🏅')}
    <div class="card mb-3">
      <div class="card-header"><h2>Kerndaten</h2></div>
      <div class="card-body">
        ${kerndatenFelder(`<div class="form-group"><label>Schüler/in <span class="required">*</span></label>
          <input type="text" id="f-schueler-text" placeholder="Name der Schülerin / des Schülers" autocomplete="off"></div>
        <div class="form-group"><label>Quell-URL</label>
          <input type="url" id="f-quelle" placeholder="https://..."></div>`)}
      </div>
    </div>
    <div class="card mb-3">
      <div class="card-header"><h2>📷 Bilder (optional)</h2></div>
      <div class="card-body">
        <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
          <span>Bilder nur hochladen wenn Nutzungsrechte vorhanden. Urheber und Quelle sind Pflichtfelder.</span></div>
        <div id="bilder-liste"></div>
        <button class="btn btn-ghost btn-sm mt-2" onclick="addBildRow()">+ Bild hinzufügen</button>
      </div>
    </div>
    <div class="card"><div class="card-footer">
      <button class="btn btn-ghost" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">Abbrechen</button>
      <button class="btn btn-outline" onclick="speichereErfolg('Entwurf','Einzelerfolg')">💾 Entwurf</button>
      <button class="btn btn-primary" onclick="speichereErfolg('Eingereicht','Einzelerfolg')">📤 Einreichen</button>
    </div></div>
  </div>`;
  setTimeout(()=>{
    bindKerndatenAC();
    bindAutocomplete('f-schueler-text', SLZB_DB.schueler.map(s=>s.anzeigename));
  },100);
  return html;
}

function renderTeamerfolgForm() {
  APP._teamBeteiligte=[];
  const html=`<div class="page">
    ${formularKopf('Teamerfolg melden','🏆')}
    <div class="card mb-3">
      <div class="card-header"><h2>Team & Kerndaten</h2></div>
      <div class="card-body">
        ${kerndatenFelder(`<div class="form-group"><label>Team/Mannschaft</label>
          <input type="text" id="f-team-text" placeholder="z.B. Staffel 4×100m Männer" autocomplete="off"></div>`)}
      </div>
    </div>
    <div class="card mb-3">
      <div class="card-header"><h2>👥 Beteiligte Schüler/innen</h2></div>
      <div class="card-body">
        <div class="alert alert-warning"><span class="alert-icon">⚠️</span>
          <span><strong>Teamfoto-Regel:</strong> Fehlt für eine identifizierbare Person die Einwilligung, darf das Teamfoto nicht verwendet werden.</span></div>
        <div class="form-row cols-2 mt-3">
          <div class="form-group"><label>Schüler/in hinzufügen</label>
            <input type="text" id="schueler-add-text" placeholder="Name der Schülerin / des Schülers" autocomplete="off"></div>
          <div class="form-group"><label>Rolle</label>
            <select id="schueler-add-rolle">
              ${['Athlet','Kapitän','Ersatz','Trainer','Betreuer','Sonstiges'].map(r=>`<option>${r}</option>`).join('')}
            </select></div>
        </div>
        <button class="btn btn-outline btn-sm mb-3" onclick="addSchuelerZuTeam()">+ Hinzufügen</button>
        <div id="team-beteiligte-liste"><p class="text-muted text-sm">Noch keine Beteiligten.</p></div>
      </div>
    </div>
    <div class="card"><div class="card-footer">
      <button class="btn btn-ghost" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">Abbrechen</button>
      <button class="btn btn-outline" onclick="speichereTeamerfolg('Entwurf')">💾 Entwurf</button>
      <button class="btn btn-primary" onclick="speichereTeamerfolg('Eingereicht')">📤 Einreichen</button>
    </div></div>
  </div>`;
  setTimeout(()=>{
    bindKerndatenAC();
    bindAutocomplete('f-team-text', SLZB_DB.teams.map(t=>t.name));
    bindAutocomplete('schueler-add-text', SLZB_DB.schueler.map(s=>s.anzeigename));
  },100);
  return html;
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
        <button class="btn btn-outline mt-2" onclick="kiExtraktion()">🤖 KI-Extraktion starten (Entwurf)</button>
        <div id="ki-extraktion-result" class="mt-3"></div>
      </div>
      <div class="card-footer">
        <button class="btn btn-ghost" onclick="APP.selectedMeldungsart=null;navigateTo('neue-meldung')">Abbrechen</button>
        <button class="btn btn-primary" onclick="speichereArtikel()">📤 Einreichen</button>
      </div>
    </div>
  </div>`;
}

function renderSammelmeldungForm() {
  return `<div class="page">
    ${formularKopf('Sammelmeldung','📊')}
    <div class="card mb-3">
      <div class="card-header"><h2>📥 CSV-Import</h2></div>
      <div class="card-body">
        <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
          <span>Pflichtfelder: Titel, Sportart, Datum. Bilder können nicht per Import hochgeladen werden.</span></div>
        <div class="flex gap-3 mt-3">
          <button class="btn btn-outline" onclick="PDF.downloadImportvorlage()">⬇️ Vorlage herunterladen (CSV)</button>
        </div>
        <div class="form-group mt-3"><label>CSV-Datei hochladen</label>
          <input type="file" id="import-file" accept=".csv" onchange="importDateiGewaehlt(this)"></div>
        <div id="import-preview"></div>
      </div>
    </div>
  </div>`;
}

// ── Meine Meldungen ──────────────────────────────────────────
function renderMeineMeldungen() {
  const uid=Auth.id(); const r=Auth.rolle();
  const meldungen=r==='admin'?SLZB_DB.erfolge:SLZB_DB.erfolge.filter(e=>e.melderId===uid);
  return `<div class="page">
    <div class="page-header"><h1>📋 Meine Meldungen</h1><p>${meldungen.length} Meldung(en).</p></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Nr.</th><th>Titel</th><th>Art</th><th>Sportart</th><th>Datum</th><th>Status</th><th>Eingereicht</th><th></th></tr></thead>
      <tbody>${meldungen.length===0?'<tr><td colspan="8" class="text-center text-muted" style="padding:30px">Keine Meldungen.</td></tr>':
        meldungen.map(e=>{const sp=SLZB_DB.getSportart(e.sportartId);
          return`<tr class="clickable" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
            <td class="text-xs text-muted">${esc(e.erfolgNr||'–')}</td>
            <td><strong>${esc(e.titel)}</strong></td>
            <td class="text-sm">${esc(e.meldungsart)}</td>
            <td class="text-sm">${esc(sp?.name||'–')}</td>
            <td class="text-sm">${fmt(e.datum)}</td>
            <td>${statusBadge(e.status)}</td>
            <td class="text-sm text-muted">${fmtDT(e.eingangsdatum)}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">→</button></td>
          </tr>`;}).join('')}
      </tbody>
    </table></div></div>
  </div>`;
}

// ── Rückfragen ───────────────────────────────────────────────
function renderRueckfragen() {
  const uid=Auth.id(); const r=Auth.rolle();
  const rueck=SLZB_DB.erfolge.filter(e=>e.status==='Rückfrage an Melder'&&(e.melderId===uid||r==='admin'));
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
function renderRedaktion() {
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
      const items=SLZB_DB.erfolge.filter(e=>g.status.includes(e.status));
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
function renderArchiv() {
  return `<div class="page">
    <div class="page-header"><h1>🗄️ Archiv</h1><p>${SLZB_DB.erfolge.length} Meldungen gesamt.</p></div>
    <div class="card mb-3"><div class="card-body">
      <div class="form-row cols-4">
        <div class="form-group"><label>Suche</label>
          <input type="text" id="archiv-suche" placeholder="Titel..." oninput="filterArchiv()"></div>
        <div class="form-group"><label>Sportart</label>
          <select id="archiv-sportart" onchange="filterArchiv()"><option value="">Alle</option>
            ${SLZB_DB.sportarten.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label>Status</label>
          <select id="archiv-status" onchange="filterArchiv()"><option value="">Alle</option>
            ${['Entwurf','Unvollständig','Eingereicht','Redaktion','Freigegeben','Veröffentlicht','Archiviert','Wegen Einwilligung gesperrt'].map(s=>`<option>${s}</option>`).join('')}</select></div>
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

function addSchuelerZuTeam() {
  const text=document.getElementById('schueler-add-text')?.value?.trim()||'';
  const rolle=document.getElementById('schueler-add-rolle')?.value||'Athlet';
  if (!text){toast('Bitte Name eingeben','warning');return;}
  const s=SLZB_DB.schueler.find(s=>s.anzeigename.toLowerCase()===text.toLowerCase());
  if (!s){toast(`Schüler/in "${text}" nicht gefunden. Bitte aus den Vorschlägen wählen.`,'warning');return;}
  if (APP._teamBeteiligte.find(b=>b.schuelerId===s.id)){toast('Bereits hinzugefügt','warning');return;}
  APP._teamBeteiligte.push({schuelerId:s.id,rolle,einwilligungsstatus:'Nicht geprüft'});
  renderTeamBeteiligteUI();
  document.getElementById('schueler-add-text').value='';
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
    titel:          document.getElementById('f-titel')?.value?.trim()||'',
    sportartId:     sp?.id||null,
    sportartText,
    disziplin:      document.getElementById('f-disziplin')?.value||'',
    wettbewerbId:   wb?.id||null,
    datum:          document.getElementById('f-datum')?.value||null,
    ort:            document.getElementById('f-ort')?.value||'',
    ebene:          document.getElementById('f-ebene')?.value||'',
    platzierung:    document.getElementById('f-platzierung')?.value?Number(document.getElementById('f-platzierung').value):null,
    medaille:       document.getElementById('f-medaille')?.value||'keine',
    ergebnisWert:   document.getElementById('f-ergebnis-wert')?.value?Number(document.getElementById('f-ergebnis-wert').value):null,
    ergebnisEinheit:document.getElementById('f-ergebnis-einheit')?.value||'',
    ergebnisText:   document.getElementById('f-ergebnis-text')?.value||'',
    kurzinfo:       document.getElementById('f-kurzinfo')?.value||'',
    quelleUrl:      document.getElementById('f-quelle')?.value||'',
    meldungsart,
  };
}

function speichereErfolg(status, meldungsart) {
  const daten=leseDatenAusFormular(meldungsart);
  const schuelerText=document.getElementById('f-schueler-text')?.value?.trim()||'';
  const schueler=schuelerText?SLZB_DB.schueler.find(s=>s.anzeigename.toLowerCase()===schuelerText.toLowerCase()):null;
  const fehler=SLZB_DB.validiereErfolg(daten);
  if (!daten.sportartId&&daten.sportartText) fehler.push(`Sportart "${daten.sportartText}" nicht gefunden – bitte aus den Vorschlägen wählen.`);
  if (!schuelerText&&status==='Eingereicht'&&meldungsart==='Einzelerfolg') fehler.push('Schüler/in ist Pflichtfeld.');
  if (schuelerText&&!schueler&&meldungsart==='Einzelerfolg') fehler.push(`Schüler/in "${schuelerText}" nicht gefunden – bitte aus den Vorschlägen wählen.`);
  if (fehler.length){
    const el=document.getElementById('form-errors');
    if(el) el.innerHTML=`<div class="alert alert-danger"><span class="alert-icon">❌</span><ul>${fehler.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
    return;
  }
  const id=SLZB_DB.neueErfolgNr();
  const neuerErfolg={
    id,erfolgNr:id,...daten,status,
    melderId:Auth.id(),melderName:Auth.name(),
    eingangsdatum:new Date().toISOString(),
    einwilligungGeprueft:false,
    beteiligte:schueler?[{schuelerId:schueler.id,rolle:'Athlet',einwilligungsstatus:'Nicht geprüft'}]:[],
    medien:[],
    protokoll:[{statusAlt:'',statusNeu:status,zeitpunkt:new Date().toISOString(),person:Auth.name(),kommentar:''}],
  };
  const dubletten=SLZB_DB.pruefeDubletten(neuerErfolg);
  if(dubletten.length){
    neuerErfolg.dublettenhinweis=true;
    neuerErfolg.dublettenhinweisText=`Mögliche Dublette zu: ${dubletten.map(d=>d.erfolgNr||d.id).join(', ')}`;
    neuerErfolg.status='Dublettenverdacht';
    neuerErfolg.protokoll.push({statusAlt:status,statusNeu:'Dublettenverdacht',zeitpunkt:new Date().toISOString(),person:'System',kommentar:'Automatische Dublettenprüfung'});
  }
  SLZB_DB.erfolge.push(neuerErfolg);
  slzbSaveUndSync(neuerErfolg,'erfolg');
  APP.selectedMeldungsart=null;
  toast(`Erfolg ${id} ${status==='Entwurf'?'als Entwurf gespeichert':'eingereicht'}!`,'success');
  navigateTo('erfolg-detail',{currentErfolgId:id});
}

function speichereTeamerfolg(status) {
  const daten=leseDatenAusFormular('Teamerfolg');
  const fehler=SLZB_DB.validiereErfolg(daten);
  if(!daten.sportartId&&daten.sportartText) fehler.push(`Sportart "${daten.sportartText}" nicht gefunden.`);
  if(!APP._teamBeteiligte.length&&status==='Eingereicht') fehler.push('Mindestens ein Beteiligter erforderlich.');
  if(fehler.length){
    const el=document.getElementById('form-errors');
    if(el) el.innerHTML=`<div class="alert alert-danger"><span class="alert-icon">❌</span><ul>${fehler.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
    return;
  }
  const id=SLZB_DB.neueErfolgNr();
  const neuerTeamerfolg = {
    id,erfolgNr:id,...daten,status,
    melderId:Auth.id(),melderName:Auth.name(),
    eingangsdatum:new Date().toISOString(),
    einwilligungGeprueft:false,
    beteiligte:[...APP._teamBeteiligte],medien:[],
    protokoll:[{statusAlt:'',statusNeu:status,zeitpunkt:new Date().toISOString(),person:Auth.name(),kommentar:''}],
  };
  SLZB_DB.erfolge.push(neuerTeamerfolg);
  slzbSaveUndSync(neuerTeamerfolg,'erfolg');
  APP._teamBeteiligte=[]; APP.selectedMeldungsart=null;
  toast(`Teamerfolg ${id} ${status==='Entwurf'?'gespeichert':'eingereicht'}!`,'success');
  navigateTo('meine-meldungen');
}

function speichereArtikel() {
  const text=document.getElementById('f-artikel-text')?.value?.trim()||'';
  const sportartText=document.getElementById('f-sportart-text')?.value?.trim()||'';
  const datum=document.getElementById('f-datum')?.value||null;
  const sp=SLZB_DB.sportarten.find(s=>s.name.toLowerCase()===sportartText.toLowerCase());
  const fehler=[];
  if(!text) fehler.push('Artikeltext ist Pflichtfeld');
  if(!sportartText) fehler.push('Sportart ist Pflichtfeld');
  if(!datum) fehler.push('Datum ist Pflichtfeld');
  if(fehler.length){
    const el=document.getElementById('form-errors');
    if(el) el.innerHTML=`<div class="alert alert-danger"><span class="alert-icon">❌</span><ul>${fehler.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
    return;
  }
  const id=SLZB_DB.neueErfolgNr();
  SLZB_DB.erfolge.push({
    id,erfolgNr:id,meldungsart:'Fertiger Artikel',
    titel:'[Aus Artikel] '+text.slice(0,60)+'…',
    sportartId:sp?.id||null,datum,status:'Eingereicht',
    quelleOriginal:text,
    melderId:Auth.id(),melderName:Auth.name(),
    eingangsdatum:new Date().toISOString(),
    einwilligungGeprueft:false,beteiligte:[],medien:[],
    protokoll:[{statusAlt:'',statusNeu:'Eingereicht',zeitpunkt:new Date().toISOString(),person:Auth.name(),kommentar:'Fertiger Artikel'}],
  });
  slzbSave(); APP.selectedMeldungsart=null;
  toast(`Artikel ${id} eingereicht!`,'success');
  navigateTo('meine-meldungen');
}

function kiExtraktion() {
  const text=document.getElementById('f-artikel-text')?.value||'';
  if(!text.trim()){toast('Bitte zuerst Artikeltext eingeben','warning');return;}
  const result=document.getElementById('ki-extraktion-result'); if(!result) return;
  result.innerHTML='<div class="alert alert-info"><span class="alert-icon">⏳</span><span>KI-Extraktion läuft...</span></div>';
  setTimeout(()=>{
    result.innerHTML=`<div class="alert alert-warning"><span class="alert-icon">🤖</span><span><strong>KI-Entwurf (nur zur Prüfung):</strong></span></div>
      <pre style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:14px;font-size:.8rem;white-space:pre-wrap">[KI-ENTWURF – NICHT VERÖFFENTLICHEN]\n\nExtrahierte Daten (simuliert):\n- Sportart: [Bitte prüfen]\n- Datum: ${new Date().toLocaleDateString('de-DE')}\n- Platzierung: [Bitte prüfen]\n- Personen: [Bitte manuell prüfen]\n\nAlle Daten müssen manuell bestätigt werden.</pre>
      <div class="alert alert-danger mt-2"><span class="alert-icon">⚠️</span><span>Dieser Entwurf muss manuell geprüft werden. Nicht veröffentlichen.</span></div>`;
  },1200);
}

function antworteSenden(erfolgId) {
  const antwort=document.getElementById(`antwort-${erfolgId}`)?.value?.trim()||'';
  if(!antwort){toast('Bitte Antwort eingeben','warning');return;}
  SLZB_DB.statusWechsel(erfolgId,'Eingereicht',Auth.name(),`Antwort auf Rückfrage: ${antwort}`);
  toast('Antwort gesendet – Meldung erneut eingereicht','success');
  navigateTo('rueckfragen');
}

function filterArchiv() {
  const suche=(document.getElementById('archiv-suche')?.value||'').toLowerCase();
  const sportart=document.getElementById('archiv-sportart')?.value||'';
  const status=document.getElementById('archiv-status')?.value||'';
  const ebene=document.getElementById('archiv-ebene')?.value||'';
  const gefiltert=SLZB_DB.erfolge.filter(e=>{
    if(suche&&!e.titel.toLowerCase().includes(suche)&&!(e.erfolgNr||'').toLowerCase().includes(suche)) return false;
    if(sportart&&e.sportartId!==sportart) return false;
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
    const zeilen=await PDF.leseCSV(datei);
    if(!zeilen.length){preview.innerHTML='<div class="alert alert-warning mt-3"><span class="alert-icon">⚠️</span><span>Keine Daten gefunden.</span></div>';return;}
    preview.innerHTML=`<div class="alert alert-success mt-3"><span class="alert-icon">✅</span>
      <span>${zeilen.length} Zeilen eingelesen.</span></div>
      <div class="import-table-wrap mt-2"><table>
        <thead><tr><th>#</th><th>Titel</th><th>Sportart</th><th>Datum</th><th>Platz</th></tr></thead>
        <tbody>${zeilen.slice(0,10).map((z,i)=>`<tr>
          <td>${i+1}</td><td>${esc(z.Titel||'–')}</td><td>${esc(z.Sportart||'–')}</td>
          <td>${esc(z.Datum||'–')}</td><td>${esc(String(z.Platzierung||'–'))}</td>
        </tr>`).join('')}
        ${zeilen.length>10?`<tr><td colspan="5" class="text-center text-muted">... und ${zeilen.length-10} weitere</td></tr>`:''}
        </tbody>
      </table></div>
      <button class="btn btn-primary mt-3" onclick="starteImport(${JSON.stringify(zeilen).replace(/</g,'&lt;')})">📤 ${zeilen.length} Zeilen importieren</button>`;
  } catch(e) {
    preview.innerHTML=`<div class="alert alert-danger mt-3"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div>`;
  }
}

// ── Schüler-Import aus Excel/CSV ─────────────────────────────
async function schuelerImportDateiGewaehlt(input) {
  const preview = document.getElementById('schueler-import-preview');
  if (!preview || !input.files?.length) return;
  const datei = input.files[0];
  preview.innerHTML = '<div class="alert alert-info mt-3"><span class="alert-icon">⏳</span><span>Datei wird eingelesen...</span></div>';
  try {
    const zeilen = await PDF.leseCSV(datei);
    if (!zeilen.length) { preview.innerHTML = '<div class="alert alert-warning mt-3"><span class="alert-icon">⚠️</span><span>Keine Daten gefunden.</span></div>'; return; }
    const spalten = Object.keys(zeilen[0]);
    const findSpalte = (...k) => spalten.find(s=>k.some(x=>s.toLowerCase().includes(x.toLowerCase())))||spalten[0];
    const colId       = findSpalte('id','nr','nummer','schüler');
    const colNachname = findSpalte('name','nachname');
    const colVorname  = findSpalte('vorname');
    const colSportart = findSpalte('sportart','sport');
    const colKlasse   = findSpalte('klasse');
    const fehlendeKuerzel = new Set();
    zeilen.forEach(z=>{
      const k=(z[colSportart]||'').trim().toUpperCase();
      if(k&&!SLZB_DB.sportarten.find(s=>s.kuerzel===k)) fehlendeKuerzel.add(k);
    });
    const vorschau = zeilen.slice(0,8);
    preview.innerHTML = `
      <div class="alert alert-success mt-3"><span class="alert-icon">✅</span>
        <span><strong>${zeilen.length} Schüler</strong> erkannt.</span></div>
      ${fehlendeKuerzel.size>0?`<div class="alert alert-warning mt-2"><span class="alert-icon">⚠️</span>
        <span>Unbekannte Kürzel: <strong>${[...fehlendeKuerzel].join(', ')}</strong> – ohne Sportart importiert.</span></div>`:''}
      <div class="card mt-3">
        <div class="card-header"><h2>Spalten-Zuordnung prüfen</h2></div>
        <div class="card-body">
          <div class="form-row cols-3">
            <div class="form-group"><label>Schüler-ID</label>
              <select id="col-id">${spalten.map(s=>`<option${s===colId?' selected':''}>${esc(s)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Nachname</label>
              <select id="col-nachname">${spalten.map(s=>`<option${s===colNachname?' selected':''}>${esc(s)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Vorname</label>
              <select id="col-vorname">${spalten.map(s=>`<option${s===colVorname?' selected':''}>${esc(s)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Sportart</label>
              <select id="col-sportart">${spalten.map(s=>`<option${s===colSportart?' selected':''}>${esc(s)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Klasse</label>
              <select id="col-klasse">${spalten.map(s=>`<option${s===colKlasse?' selected':''}>${esc(s)}</option>`).join('')}</select></div>
          </div>
        </div>
      </div>
      <div class="import-table-wrap mt-3"><table>
        <thead><tr><th>ID</th><th>Nachname</th><th>Vorname</th><th>Sportart</th><th>Klasse</th><th>Anzeigename</th><th>Status</th></tr></thead>
        <tbody>${vorschau.map(z=>{
          const k=(z[colSportart]||'').trim().toUpperCase();
          const sp=SLZB_DB.sportarten.find(s=>s.kuerzel===k);
          return`<tr class="${sp||!k?'import-row-ok':'import-row-err'}">
            <td class="text-xs">${esc(z[colId]||'–')}</td>
            <td>${esc(z[colNachname]||'–')}</td>
            <td>${esc(z[colVorname]||'–')}</td>
            <td>${esc(k)}${sp?` <span class="text-xs text-muted">(${esc(sp.name)})</span>`:'<span class="badge badge-warning text-xs">?</span>'}</td>
            <td>${esc(z[colKlasse]||'–')}</td>
            <td>${esc(z[colVorname]||'')} ${esc((z[colNachname]||'').slice(0,1))}.</td>
            <td>${sp||!k?'<span class="badge badge-success">OK</span>':'<span class="badge badge-warning">Kürzel?</span>'}</td>
          </tr>`;}).join('')}
        </tbody>
      </table></div>
      <div class="alert alert-info mt-3"><span class="alert-icon">ℹ️</span>
        <span>Alle Einwilligungen werden auf <strong>aktiv</strong> gesetzt (Opt-Out-Prinzip). Widersprüche danach über die Negativ-Liste eintragen.</span></div>
      <button class="btn btn-primary mt-2" onclick="starteSchuelerImport(${JSON.stringify(zeilen).replace(/</g,'&lt;')})">
        📥 ${zeilen.length} Schüler importieren
      </button>`;
  } catch(e) {
    preview.innerHTML = `<div class="alert alert-danger mt-3"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div>`;
  }
}

async function starteSchuelerImport(zeilen) {
  const colId       = document.getElementById('col-id')?.value||'';
  const colNachname = document.getElementById('col-nachname')?.value||'';
  const colVorname  = document.getElementById('col-vorname')?.value||'';
  const colSportart = document.getElementById('col-sportart')?.value||'';
  const colKlasse   = document.getElementById('col-klasse')?.value||'';
  let ok=0,fehler=0,uebersprungen=0,protokoll=[];
  for (const z of zeilen) {
    const rawId    = String(z[colId]||'').trim();
    const nachname = String(z[colNachname]||'').trim();
    const vorname  = String(z[colVorname]||'').trim();
    const kuerzel  = String(z[colSportart]||'').trim().toUpperCase();
    const klasse   = String(z[colKlasse]||'').trim();
    if (!rawId||!nachname||!vorname) { fehler++; protokoll.push(`ID ${rawId||'?'}: Pflichtfelder fehlen`); continue; }
    const schuelerNr = 'SLZB-' + rawId.padStart(6,'0');
    if (SLZB_DB.schueler.find(s=>s.schuelerNr===rawId||s.id===schuelerNr)) {
      uebersprungen++; protokoll.push(`${vorname} ${nachname}: bereits vorhanden`); continue;
    }
    const sp = SLZB_DB.sportarten.find(s=>s.kuerzel===kuerzel);
    const neuerSchueler = {
      id:schuelerNr, schuelerNr:rawId,
      vorname, nachname,
      anzeigename: vorname+' '+nachname.slice(0,1)+'.',
      klasse, sportartId:sp?.id||null, gruppe:'Schüler', aktiv:true,
      ew:{foto:true,print:true,homepage:true,digitalSignage:true,
          socialMedia:false,einzeldarstellung:true,klasse:true},
      ewGueltigBis:null, ewWiderruf:false,
    };
    SLZB_DB.schueler.push(neuerSchueler);
    if (typeof Sync!=='undefined'&&Sync.verfuegbar) await Sync.uploadSchueler(neuerSchueler);
    ok++;
  }
  slzbSave();
  const preview=document.getElementById('schueler-import-preview');
  if(preview) preview.innerHTML=`
    <div class="alert alert-${fehler>0?'warning':'success'} mt-3">
      <span class="alert-icon">${fehler>0?'⚠️':'✅'}</span>
      <span><strong>Import abgeschlossen:</strong> ${ok} importiert · ${uebersprungen} übersprungen · ${fehler} Fehler.</span></div>
    ${protokoll.length?`<pre style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:12px;font-size:.78rem;margin-top:8px;white-space:pre-wrap">${protokoll.join('\n')}</pre>`:''}
    <button class="btn btn-outline mt-3" onclick="navigateTo('stammdaten')">→ Zu den Schülern</button>`;
  if(ok>0) toast(`${ok} Schüler importiert!`,'success');
}

// ── Negativ-Liste importieren ─────────────────────────────────
async function negativImportDateiGewaehlt(input) {
  const preview=document.getElementById('negativ-import-preview');
  if(!preview||!input.files?.length) return;
  const datei=input.files[0];
  preview.innerHTML='<div class="alert alert-info mt-3"><span class="alert-icon">⏳</span><span>Negativ-Liste wird eingelesen...</span></div>';
  try {
    const zeilen=await PDF.leseCSV(datei);
    if(!zeilen.length){preview.innerHTML='<div class="alert alert-warning mt-3"><span class="alert-icon">⚠️</span><span>Keine Daten.</span></div>';return;}
    const spalten=Object.keys(zeilen[0]);
    const findSpalte=(...k)=>spalten.find(s=>k.some(x=>s.toLowerCase().includes(x.toLowerCase())))||'';
    const colNachname=findSpalte('name','nachname');
    const colVorname=findSpalte('vorname');
    const colKlasse=findSpalte('klasse');
    preview.innerHTML=`
      <div class="alert alert-success mt-3"><span class="alert-icon">✅</span>
        <span><strong>${zeilen.length} Einträge</strong> in der Negativ-Liste erkannt.</span></div>
      <div class="import-table-wrap mt-2"><table>
        <thead><tr><th>Nachname</th><th>Vorname</th><th>Klasse</th><th>Schüler gefunden</th></tr></thead>
        <tbody>${zeilen.slice(0,8).map(z=>{
          const nn=(z[colNachname]||'').trim();
          const vn=(z[colVorname]||'').trim();
          const kl=(z[colKlasse]||'').trim();
          const s=SLZB_DB.schueler.find(s=>s.nachname?.toLowerCase()===nn.toLowerCase()&&s.vorname?.toLowerCase()===vn.toLowerCase());
          return`<tr class="${s?'import-row-ok':'import-row-warn'}">
            <td>${esc(nn)}</td><td>${esc(vn)}</td><td>${esc(kl)}</td>
            <td>${s?`<span class="badge badge-success">${esc(s.anzeigename)}</span>`:'<span class="badge badge-warning">Nicht gefunden</span>'}</td>
          </tr>`;}).join('')}
        </tbody>
      </table></div>
      <button class="btn btn-danger mt-3" onclick="starteNegativImport(${JSON.stringify(zeilen).replace(/</g,'&lt;')})">
        🚫 Widersprüche anwenden
      </button>`;
  } catch(e) {
    preview.innerHTML=`<div class="alert alert-danger mt-3"><span class="alert-icon">❌</span><span>Fehler: ${esc(e.message)}</span></div>`;
  }
}

async function starteNegativImport(zeilen) {
  const spalten=Object.keys(zeilen[0]||{});
  const findSpalte=(...k)=>spalten.find(s=>k.some(x=>s.toLowerCase().includes(x.toLowerCase())))||'';
  const colNachname=findSpalte('name','nachname');
  const colVorname=findSpalte('vorname');
  const istX=(val)=>{
    if(!val) return false;
    const v=String(val).trim().toLowerCase();
    return v==='x'||v==='ja'||v==='yes'||v==='1'||v==='true'||v==='✓'||v==='j';
  };
  let ok=0,nichtGefunden=0;
  for (const z of zeilen) {
    const nn=String(z[colNachname]||'').trim();
    const vn=String(z[colVorname]||'').trim();
    if(!nn||!vn) continue;
    const s=SLZB_DB.schueler.find(s=>s.nachname?.toLowerCase()===nn.toLowerCase()&&s.vorname?.toLowerCase()===vn.toLowerCase());
    if(!s){nichtGefunden++;continue;}
    // Spaltenwerte als Array (Position 3-12)
    const w=Object.values(z);
    // Widerspruch Namensveröffentlichung: Print(3) Presse(4) Homepage(5) Events(6) Social(7)
    // Widerspruch Fotoveröffentlichung:   Print(8) Presse(9) Homepage(10) Events(11) Social(12)
    if(istX(w[3])||istX(w[8]))  s.ew.print=false;
    if(istX(w[5])||istX(w[10])) s.ew.homepage=false;
    if(istX(w[6])||istX(w[11])) s.ew.digitalSignage=false;
    if(istX(w[7])||istX(w[12])) s.ew.socialMedia=false;
    if(istX(w[8])||istX(w[9])||istX(w[10])||istX(w[11])||istX(w[12])) s.ew.foto=false;
    if(typeof Sync!=='undefined'&&Sync.verfuegbar) await Sync.uploadSchueler(s);
    ok++;
  }
  slzbSave();
  const preview=document.getElementById('negativ-import-preview');
  if(preview) preview.innerHTML=`
    <div class="alert alert-success mt-3"><span class="alert-icon">✅</span>
      <span><strong>Negativ-Liste angewendet:</strong> ${ok} Widersprüche gesetzt · ${nichtGefunden} nicht gefunden.</span></div>
    ${nichtGefunden>0?`<div class="alert alert-warning mt-2"><span class="alert-icon">⚠️</span>
      <span>${nichtGefunden} Einträge konnten keinem Schüler zugeordnet werden. Bitte Namen prüfen.</span></div>`:''}
    <button class="btn btn-outline mt-3" onclick="navigateTo('stammdaten')">→ Zu den Schülern</button>`;
  toast(`${ok} Widersprüche angewendet`,'success');
}

function starteImport(zeilen) {
  let ok=0,fehler=0,protokoll=[];
  zeilen.forEach((z,i)=>{
    const sp=SLZB_DB.sportarten.find(s=>s.name.toLowerCase()===(z.Sportart||'').toLowerCase());
    const f=[];
    if(!z.Titel?.trim()) f.push('Titel fehlt');
    if(!z.Datum) f.push('Datum fehlt');
    if(!sp) f.push(`Sportart "${z.Sportart}" nicht gefunden`);
    if(z.Platzierung&&Number(z.Platzierung)<1) f.push('Platzierung < 1');
    if(f.length){fehler++;protokoll.push(`Zeile ${i+2}: ${f.join(', ')}`);return;}
    const id=SLZB_DB.neueErfolgNr();
    SLZB_DB.erfolge.push({
      id,erfolgNr:id,meldungsart:z.Meldungsart||'Sammelmeldung',
      titel:z.Titel.trim(),sportartId:sp.id,
      datum:new Date(z.Datum).toISOString().slice(0,10),
      ort:z.Ort||'',ebene:z.Ebene||'',
      platzierung:z.Platzierung?Number(z.Platzierung):null,
      medaille:z.Medaille||'keine',
      ergebnisWert:z.Ergebnis_Wert?Number(z.Ergebnis_Wert):null,
      ergebnisEinheit:z.Ergebnis_Einheit||'',
      ergebnisText:z.Ergebnis_Text||'',
      kurzinfo:z.Kurzinfo||'',
      status:'Eingereicht',
      melderId:Auth.id(),melderName:Auth.name(),
      eingangsdatum:new Date().toISOString(),
      einwilligungGeprueft:false,beteiligte:[],medien:[],
      protokoll:[{statusAlt:'',statusNeu:'Eingereicht',zeitpunkt:new Date().toISOString(),person:Auth.name(),kommentar:'Import'}],
    });
    ok++;
  });
  slzbSave();
  const preview=document.getElementById('import-preview');
  if(preview) preview.innerHTML=`<div class="alert alert-${fehler>0?'warning':'success'} mt-3">
    <span class="alert-icon">${fehler>0?'⚠️':'✅'}</span>
    <span><strong>Import abgeschlossen:</strong> ${ok} erfolgreich, ${fehler} Fehler.</span></div>
    ${protokoll.length?`<pre style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;font-size:.78rem;margin-top:8px;white-space:pre-wrap;color:#991b1b">${protokoll.join('\n')}</pre>`:''}`;
  if(ok>0) toast(`${ok} Meldungen importiert!`,'success');
}