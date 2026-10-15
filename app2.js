// ============================================================
// SLZB-Erfolge v3 – App-Logik Teil 2
// ============================================================

// ── Erfolg-Detail ────────────────────────────────────────────
async function renderErfolgDetail() {
  const e=await DB.getErfolgById(APP.currentErfolgId);
  if (!e) return `<div class="page"><div class="alert alert-danger"><span class="alert-icon">❌</span><span>Meldung nicht gefunden.</span></div></div>`;
  const sp=SLZB_DB.getSportart(e.sportartId);
  const wb=SLZB_DB.getWettbewerb(e.wettbewerbId);
  const r=Auth.rolle();
  const aktionen=getStatusAktionen(e.status,r);

  return `<div class="page">
    <div class="page-header flex items-center gap-3">
      <button class="btn btn-ghost btn-sm" onclick="navigateTo('${Auth.canDo('bearbeiten')?'redaktion':'meine-meldungen'}')">← Zurück</button>
      <div style="flex:1">
        <h1>${esc(e.titel)}</h1>
        <p class="text-muted text-sm">${esc(e.erfolgNr||e.id)} · ${esc(e.meldungsart)} · ${fmtDT(e.eingangsdatum)}</p>
      </div>
      ${statusBadge(e.status)}
    </div>
    ${e.dublettenhinweis?`<div class=\"datenschutz-warning\"><h4>🔄 Dublettenverdacht</h4><p>${esc(e.dublettenhinweisText)}</p><button class=\"btn btn-primary btn-sm mt-2\" onclick=\"zeigeDublettenModal('${e.id}')\">Dubletten verwalten</button></div>`:''}
    ${e.status==='Dublettenverdacht'&&!e.dublettenhinweis?`<div class=\"alert alert-warning mt-2\" style=\"display:flex;align-items:center;gap:12px;flex-wrap:wrap\"><span>🔄 Dublettenverdacht</span><button class=\"btn btn-primary btn-sm ml-2\" onclick=\"zeigeDublettenModal('${e.id}')\">Verwalten</button></div>`:''}

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('kerndaten')">Kerndaten</button>
      <button class="tab-btn" onclick="switchTab('beteiligte')">Beteiligte (${e.beteiligte?.length||0})</button>
      <button class="tab-btn" onclick="switchTab('medien')">📷 Medien (${e.bilder?.length||0})</button>
      <button class="tab-btn" onclick="switchTab('video')">🎬 Video${e.videoUrl?` ✓`:''}</button>
      <button class="tab-btn" onclick="switchTab('texte')">Texte</button>
      <button class="tab-btn" onclick="switchTab('datenschutz')">Datenschutz</button>
      <button class="tab-btn" onclick="switchTab('ausgaben')">Ausgaben</button>
      <button class="tab-btn" onclick="switchTab('protokoll')">Protokoll (${e.protokoll?.length||0})</button>
      ${Auth.canDo('bearbeiten')?`<button class="tab-btn" onclick="switchTab('bearbeiten')" style="color:#E2001A;font-weight:700">✏️ Bearbeiten</button>`:''}
    </div>

    <div id="tab-kerndaten" class="tab-panel active">
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><h2>📋 Kerndaten</h2></div>
          <div class="card-body">
            <table style="width:100%;font-size:.85rem">
              ${[
                ['Meldungsart',`<strong>${esc(e.meldungsart)}</strong>`],
                ['Sportart',esc(sp?.name||'–')],
                ['Disziplin',esc(e.disziplin||'–')],
                ['Wettbewerb',esc(wb?.name||'–')],
                ['Datum',fmt(e.datum)],
                ['Ort',esc(e.ort||'–')],
                ['Ebene',ebeneBadge(e.ebene)||'–'],
                ['Platzierung',e.platzierung?`<strong style="font-size:1.2rem">${e.platzierung}.</strong>`:'–'],
                ['Medaille',medailleBadge(e.medaille)||'–'],
                ['Ergebnis',e.ergebnisWert?`${e.ergebnisWert} ${esc(e.ergebnisEinheit||'')}`:esc(e.ergebnisText||'–')],
                ['Athlet/Team', (e.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', ') || '–'],
                ['Melder',esc(e.melderName)],
              ].map(([k,v])=>`<tr><td class="text-muted" style="width:40%;padding:6px 0">${k}</td><td>${v}</td></tr>`).join('')}
            </table>
          </div>
        </div>
        <div>
          <div class="card mb-3">
            <div class="card-header"><h2>🔄 Status & Aktionen</h2></div>
            <div class="card-body">
              <p class="mb-3">Aktuell: ${statusBadge(e.status)}</p>
              ${aktionen.length>0?`
                <div class="form-group"><label>Kommentar</label>
                  <textarea id="status-kommentar" rows="2" placeholder="Begründung, Hinweis..."></textarea></div>
                <div class="flex gap-2" style="flex-wrap:wrap">
                  ${aktionen.map(a=>`<button class="btn btn-${a.cls} btn-sm" onclick="statusWechselUI('${e.id}','${a.status}')">${a.label}</button>`).join('')}
                </div>`:'<p class="text-muted text-sm">Keine Aktionen für Ihre Rolle.</p>'}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h2>📊 Kurzinfo</h2></div>
            <div class="card-body"><p class="text-sm">${esc(e.kurzinfo||'–')}</p></div>
          </div>
        </div>
      </div>
    </div>

    <div id="tab-beteiligte" class="tab-panel">
      <div class="card">
        <div class="card-header"><h2>👥 Beteiligte</h2></div>
        <div class="card-body">${renderBeteiligteTabelle(e.beteiligte||[])}</div>
      </div>
    </div>

    <div id="tab-medien" class="tab-panel">
      <div class="card">
        <div class="card-header"><h2>📷 Medien</h2>
          ${Auth.canDo('erfassen')?`<button class="btn btn-outline btn-sm" onclick="zeigeBildUploadModal('${e.id}')">+ Bild hochladen</button>`:''}
        </div>
        ${!['Freigegeben','Veröffentlicht','Redaktion','Freigabe Öffentlichkeitsarbeit','Teilweise freigegeben'].includes(e.status)?
          `<div class="alert alert-warning" style="margin:12px 12px 0"><span class="alert-icon">ℹ️</span>
            <span>Bilder können jetzt hochgeladen werden. Sie werden erst nach Freigabe in Ausgaben verwendet.</span></div>`:
          ''}
        <div class="card-body">
          ${!e.bilder?.length ? '<p class="text-muted">Keine Bilder vorhanden. Über „+ Bild hochladen" hinzufügen.</p>' :
            `<div class="grid grid-3">${(e.bilder||[]).map(b=>`
              <div class="card" style="border:1.5px solid var(--slzb-border);overflow:hidden">
                ${b.signedUrl
                  ? `<div style="height:160px;overflow:hidden;background:#111">
                       <img src="${esc(b.signedUrl)}" alt="${esc(b.altText||b.caption||'Bild')}"
                         style="width:100%;height:100%;object-fit:cover"
                         onerror="this.parentNode.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:2rem;color:#666\\'>🖼️</div>'">
                     </div>`
                  : `<div style="height:160px;background:#222;display:flex;align-items:center;justify-content:center;font-size:2rem">🖼️</div>`}
                <div class="card-body" style="padding:10px">
                  ${b.caption?`<div class="text-sm font-bold">${esc(b.caption)}</div>`:''}
                  <div class="text-xs text-muted mt-1">📸 ${esc(b.creator||'–')}</div>
                  <div class="text-xs text-muted">📂 ${esc(b.source||'–')}</div>
                  ${b.signedUrl?`<button class=\"btn btn-ghost btn-sm mt-2\" style=\"font-size:.75rem\" onclick=\"zeigeLightbox('${b.signedUrl}','','')\">&#128269; Vollbild</button>`:''}
                </div>
              </div>`).join('')}</div>`}
        </div>
      </div>
    </div>

    <div id="tab-video" class="tab-panel">
      <div class="card">
        <div class="card-header">
          <h2>🎬 Video</h2>
          ${Auth.canDo('erfassen')?`<button class="btn btn-outline btn-sm" onclick="zeigeVideoModal('${e.id}','${esc(e.videoUrl||'')}')">
            ${e.videoUrl?'✏️ Video ändern':'+ Video hinzufügen'}
          </button>`:''}
        </div>
        <div class="card-body">
          ${e.videoUrl ? renderVideoPlayer(e.videoUrl) :
            '<p class="text-muted">Kein Video verknüpft. YouTube- oder Vimeo-Link hinzufügen.</p>'}
          ${e.videoUrl ? `
            <div class="mt-3" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span class="text-xs text-muted">🔗 ${esc(e.videoUrl)}</span>
              ${Auth.canDo('erfassen')?`<button class="btn btn-ghost btn-sm" style="color:#E2001A"
                onclick="loescheVideoUrl('${e.id}')">✕ Entfernen</button>`:''}
            </div>
            <div class="alert alert-warning mt-3">
              <span class="alert-icon">⚠️</span>
              <span>Das Video liegt auf einer externen Plattform (YouTube/Vimeo). Einwilligung der abgebildeten Personen prüfen.</span>
            </div>` : ''}
        </div>
      </div>
    </div>

    <div id="tab-texte" class="tab-panel">
      <div class="card">
        <div class="card-header"><h2>📝 Texte</h2></div>
        <div class="card-body">
          <div class="form-group"><label>Kurzinfo</label><p class="text-sm">${esc(e.kurzinfo||'–')}</p></div>
          <hr class="divider">
          <div class="form-group"><label>Artikeltext (Redaktion)</label>
            ${Auth.canDo('bearbeiten')?`<textarea id="edit-artikel" rows="6">${esc(e.textArtikel||'')}</textarea>
              <button class="btn btn-primary btn-sm mt-2" onclick="speichereArtikeltext('${e.id}')">Speichern</button>`:
              `<p class="text-sm">${esc(e.textArtikel||'–')}</p>`}
          </div>
          <hr class="divider">
          <div class="form-group">
            <label>KI-Entwurf <span class="badge badge-warning">Entwurf – nicht veröffentlichen</span></label>
            <p class="text-sm text-muted" style="white-space:pre-wrap">${esc(e.textKIEntwurf||'Noch kein KI-Entwurf vorhanden.')}</p>
            ${Auth.canDo('bearbeiten')?`<button class="btn btn-outline btn-sm mt-2" onclick="generiereKIText('${e.id}')">🤖 KI-Entwurf generieren</button>`:''}
          </div>
        </div>
      </div>
    </div>

    ${Auth.canDo('bearbeiten')?`<div id="tab-bearbeiten" class="tab-panel">
      <div class="card mb-3">
        <div class="card-header"><h2>✏️ Kerndaten bearbeiten</h2></div>
        <div class="card-body">
          <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
            <span>Änderungen werden sofort gespeichert und protokolliert.</span></div>
          <div class="form-row cols-2">
            <div class="form-group"><label>Titel <span class="required">*</span></label>
              <input type="text" id="edit-titel" value="${esc(e.titel||'')}" style="width:100%"></div>
            <div class="form-group"><label>Sportart</label>
              <input type="text" id="edit-sportart" value="${esc(e.sportartText||'')}" style="width:100%"></div>
            <div class="form-group"><label>Wettbewerb</label>
              <input type="text" id="edit-wettbewerb" value="${esc(e.wettbewerbText||'')}" style="width:100%"></div>
            <div class="form-group"><label>Disziplin</label>
              <input type="text" id="edit-disziplin" value="${esc(e.disziplin||'')}" style="width:100%"></div>
            <div class="form-group"><label>Datum</label>
              <input type="date" id="edit-datum" value="${e.datum||''}" style="width:100%"></div>
            <div class="form-group"><label>Ort</label>
              <input type="text" id="edit-ort" value="${esc(e.ort||'')}" style="width:100%"></div>
            <div class="form-group"><label>Ebene</label>
              <select id="edit-ebene" style="width:100%">
                ${['','Schulebene','Bezirk','Landesebene','Bundesebene','International','Weltmeisterschaft','Olympia','Sonstiges']
                  .map(eb=>`<option value="${eb}" ${e.ebene===eb?'selected':''}>${eb||'– keine –'}</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Platzierung</label>
              <input type="number" id="edit-platzierung" value="${e.platzierung||''}" min="1" style="width:100%"></div>
            <div class="form-group"><label>Medaille</label>
              <select id="edit-medaille" style="width:100%">
                ${['keine','Gold','Silber','Bronze'].map(m=>`<option value="${m}" ${(e.medaille||'keine')===m?'selected':''}>${m}</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Ergebnis (Wert)</label>
              <input type="number" id="edit-ergebnis-wert" value="${e.ergebnisWert||''}" step="any" style="width:100%"></div>
            <div class="form-group"><label>Einheit</label>
              <input type="text" id="edit-ergebnis-einheit" value="${esc(e.ergebnisEinheit||'')}" placeholder="z.B. m, s, kg" style="width:100%"></div>
            <div class="form-group"><label>Quelle / URL</label>
              <input type="url" id="edit-quelle" value="${esc(e.quelleUrl||'')}" style="width:100%"></div>
          </div>
          <div class="form-group mt-2"><label>Athlet / Team <span class="text-muted text-xs">(Name des/der Athleten)</span></label>
            <input type="text" id="edit-athlet" value="${esc((e.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', '))}" placeholder="z.B. Max Mustermann" style="width:100%"></div>
          <div class="form-group mt-2"><label>Kurzinfo</label>
            <textarea id="edit-kurzinfo" rows="3" style="width:100%">${esc(e.kurzinfo||'')}</textarea></div>
          <div class="form-group"><label>Artikeltext (Redaktion)</label>
            <textarea id="edit-artikel-text" rows="6" style="width:100%">${esc(e.textArtikel||'')}</textarea></div>
          <div class="card-footer mt-3">
            <button class="btn btn-ghost" onclick="switchTab('kerndaten')">Abbrechen</button>
            <button class="btn btn-primary" onclick="speichereKerndaten('${e.id}')">💾 Änderungen speichern</button>
          </div>
        </div>
      </div>
    </div>`:''}

    <div id="tab-datenschutz" class="tab-panel">${renderDatenschutzTab(e)}</div>
    <div id="tab-ausgaben" class="tab-panel">${renderAusgabenTab(e)}</div>

    <div id="tab-protokoll" class="tab-panel">
      <div class="card">
        <div class="card-header"><h2>📜 Statusprotokoll</h2></div>
        <div class="card-body">
          <div class="protokoll-list">
            ${[...e.protokoll].reverse().map(p=>`
              <div class="protokoll-item">
                <div class="protokoll-dot"></div>
                <div class="protokoll-content">
                  <div class="protokoll-status">${p.statusAlt?`${esc(p.statusAlt)} → `:''}${esc(p.statusNeu)}</div>
                  <div class="protokoll-meta">${fmtDT(p.zeitpunkt)} · ${esc(p.person)}</div>
                  ${p.kommentar?`<div class="protokoll-kommentar">"${esc(p.kommentar)}"</div>`:''}
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderBeteiligteTabelle(beteiligte) {
  if (!beteiligte?.length) return '<p class="text-muted">Keine Beteiligten erfasst.</p>';
  return `<table class="einwilligung-matrix">
    <thead><tr><th>Schüler/in</th><th>Rolle</th><th>Foto</th><th>Print</th><th>Homepage</th><th>Dig.Sign.</th><th>Social</th><th>Einzel</th><th>Status</th></tr></thead>
    <tbody>${beteiligte.map(b=>{
      const s=SLZB_DB.getSchueler(b.schuelerId);
      const abgelaufen=s?.ewGueltigBis&&new Date(s.ewGueltigBis)<new Date();
      const ok=(f)=>s&&s.ew?.[f]&&!s.ewWiderruf&&!abgelaufen;
      return`<tr>
        <td>${esc(s?.anzeigename||b.schuelerId)}<br><span class="text-xs text-muted">${esc(b.schuelerId)}</span></td>
        <td class="text-sm">${esc(b.rolle)}</td>
        <td>${s?einwilligungIcon(ok('foto')):'<span class="ew-warn">?</span>'}</td>
        <td>${s?einwilligungIcon(ok('print')):'<span class="ew-warn">?</span>'}</td>
        <td>${s?einwilligungIcon(ok('homepage')):'<span class="ew-warn">?</span>'}</td>
        <td>${s?einwilligungIcon(ok('digitalSignage')):'<span class="ew-warn">?</span>'}</td>
        <td>${s?einwilligungIcon(ok('socialMedia')):'<span class="ew-warn">?</span>'}</td>
        <td>${s?einwilligungIcon(ok('einzeldarstellung')):'<span class="ew-warn">?</span>'}</td>
        <td>${statusBadge(b.einwilligungsstatus)}${abgelaufen?'<br><span class="badge badge-danger text-xs">Abgelaufen</span>':''}${s?.ewWiderruf?'<br><span class="badge badge-danger text-xs">Widerrufen</span>':''}</td>
      </tr>`;}).join('')}
    </tbody>
  </table>`;
}

function renderDatenschutzTab(e) {
  const pruefung=(e.beteiligte||[]).map(b=>{
    const s=SLZB_DB.getSchueler(b.schuelerId);
    if(!s) return{name:b.schuelerId,ok:false,grund:'Schüler nicht gefunden'};
    if(s.ewWiderruf) return{name:s.anzeigename,ok:false,grund:'Widerrufen'};
    if(s.ewGueltigBis&&new Date(s.ewGueltigBis)<new Date()) return{name:s.anzeigename,ok:false,grund:'Abgelaufen'};
    return{name:s.anzeigename,ok:true,grund:'Gültig'};
  });
  const alleOk=pruefung.every(p=>p.ok);
  return`<div class="card">
    <div class="card-header"><h2>🔒 Datenschutzprüfung</h2></div>
    <div class="card-body">
      ${!alleOk?`<div class="datenschutz-warning"><h4>⚠️ Datenschutzprobleme</h4>
        <ul>${pruefung.filter(p=>!p.ok).map(p=>`<li>${esc(p.name)}: ${esc(p.grund)}</li>`).join('')}</ul></div>`:
        `<div class="alert alert-success"><span class="alert-icon">✅</span><span>Alle Einwilligungen gültig.</span></div>`}
      <div class="section-title mt-3">Einwilligungsstatus je Person</div>
      ${renderBeteiligteTabelle(e.beteiligte||[])}
      <hr class="divider">
      <div class="alert alert-info"><span class="alert-icon">📷</span>
        <span><strong>Teamfoto-Regel:</strong> Fehlt für eine identifizierbare Person die Einwilligung, darf das Teamfoto nicht verwendet werden.</span></div>
      <div class="alert alert-warning mt-2"><span class="alert-icon">⚠️</span>
        <span><strong>Social Media:</strong> Standardmäßig gesperrt. Darf niemals aus anderen Freigaben abgeleitet werden.</span></div>
      ${Auth.canDo('datenschutz')?`<hr class="divider"><div class="flex gap-2">
        <button class="btn btn-warning btn-sm" onclick="statusWechselUI('${e.id}','Wegen Einwilligung gesperrt')">🔒 Sperren</button>
        <button class="btn btn-danger btn-sm" onclick="statusWechselUI('${e.id}','Zur Löschung vorgemerkt')">🗑️ Löschung vormerken</button>
      </div>`:''}
    </div>
  </div>`;
}

function renderAusgabenTab(e) {
  const kannAusgeben=['Freigegeben','Veröffentlicht'].includes(e.status);
  return`<div class="card">
    <div class="card-header"><h2>📤 Ausgaben</h2></div>
    <div class="card-body">
      ${!kannAusgeben?`<div class="alert alert-warning"><span class="alert-icon">⚠️</span>
        <span>Ausgaben erst nach Status <strong>Freigegeben</strong> möglich.</span></div>`:''}
      <div class="grid grid-3 mt-3">
        ${[
          {icon:'📄',label:'A3-Aushang',desc:'Druckbares PDF',fn:`zeigeA3Vorschau('${e.id}')`,cls:'primary'},
          {icon:'🖥️',label:'Bildschirm',desc:'960×1080 px HTML',fn:`zeigeBildschirmModal('${e.id}')`,cls:'primary'},
          {icon:'📱',label:'Social-Media-Paket',desc:'Kein Auto-Posting.',fn:`zeigeSocialModal('${e.id}')`,cls:'warning'},
        ].map(a=>`<div class="card" style="border:2px solid var(--slzb-border)">
          <div class="card-body text-center">
            <div style="font-size:2rem">${a.icon}</div>
            <div class="font-bold mt-2">${a.label}</div>
            <div class="text-xs text-muted mt-1">${a.desc}</div>
            <button class="btn btn-${a.cls} btn-sm mt-3 w-full" onclick="${a.fn}" ${!kannAusgeben?'disabled':''}>Vorschau</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── Statusaktionen ───────────────────────────────────────────
function getStatusAktionen(status,rolle) {
  const map={
    
    redaktion:{
      'Eingereicht':[
        {status:'Datenprüfung',label:'🔍 Datenprüfung',cls:'outline'},
        {status:'Rückfrage an Melder',label:'💬 Rückfrage',cls:'warning'},
        {status:'Unvollständig',label:'⚠️ Unvollständig',cls:'warning'},
        {status:'Dublettenverdacht',label:'🔁 Dublette',cls:'danger'},
      ],
      'Datenprüfung':[
        {status:'Einwilligungsprüfung',label:'🔒 Einwilligung prüfen',cls:'outline'},
        {status:'Redaktion',label:'✏️ In Redaktion',cls:'primary'},
        {status:'Rückfrage an Melder',label:'💬 Rückfrage',cls:'warning'},
      ],
      'Einwilligungsprüfung':[
        {status:'Redaktion',label:'✏️ In Redaktion',cls:'primary'},
        {status:'Wegen Einwilligung gesperrt',label:'🔒 Sperren',cls:'danger'},
      ],
      'Dublettenverdacht':[
        {status:'Redaktion',label:'✏️ Kein Duplikat',cls:'primary'},
        {status:'Gelöscht/Anonymisiert',label:'🗑️ Als Duplikat löschen',cls:'danger'},
      ],
      'Redaktion':[
        {status:'Freigegeben',label:'✅ Freigeben',cls:'success'},
        {status:'Freigabe Öffentlichkeitsarbeit',label:'📢 Zur ÖA-Freigabe (optional)',cls:'outline'},
        {status:'Rückfrage an Melder',label:'💬 Rückfrage',cls:'warning'},
      ],
      'Unvollständig':[
        {status:'Rückfrage an Melder',label:'💬 Rückfrage senden',cls:'warning'},
        {status:'Redaktion',label:'✏️ Vollständig – In Redaktion',cls:'primary'},
      ],
    },
    oea:{
      'Freigabe Öffentlichkeitsarbeit':[
        {status:'Freigegeben',label:'✅ Freigeben',cls:'success'},
        {status:'Teilweise freigegeben',label:'⚡ Teilweise freigeben',cls:'warning'},
        {status:'Redaktion',label:'↩️ Zurück zur Redaktion',cls:'ghost'},
      ],
      'Freigegeben':[
        {status:'Veröffentlicht',label:'🌐 Als veröffentlicht markieren',cls:'success'},
        {status:'Archiviert',label:'🗄️ Archivieren',cls:'ghost'},
      ],
    },
    datenschutz:{
      'Einwilligungsprüfung':[
        {status:'Redaktion',label:'✅ Einwilligung OK',cls:'success'},
        {status:'Wegen Einwilligung gesperrt',label:'🔒 Sperren',cls:'danger'},
      ],
      'Wegen Einwilligung gesperrt':[
        {status:'Einwilligungsprüfung',label:'🔄 Erneut prüfen',cls:'outline'},
        {status:'Zur Löschung vorgemerkt',label:'🗑️ Löschung vormerken',cls:'danger'},
      ],
    },
    admin:{
      'Entwurf':[{status:'Eingereicht',label:'📤 Einreichen',cls:'primary'}],
      'Eingereicht':[
        {status:'Redaktion',label:'✏️ In Redaktion',cls:'primary'},
        {status:'Rückfrage an Melder',label:'💬 Rückfrage',cls:'warning'},
        {status:'Dublettenverdacht',label:'🔁 Dublette',cls:'danger'},
      ],
      'Redaktion':[{status:'Freigabe Öffentlichkeitsarbeit',label:'📢 Zur ÖA-Freigabe',cls:'primary'}],
      'Freigabe Öffentlichkeitsarbeit':[{status:'Freigegeben',label:'✅ Freigeben',cls:'success'}],
      'Freigegeben':[
        {status:'Veröffentlicht',label:'🌐 Veröffentlicht',cls:'success'},
        {status:'Archiviert',label:'🗄️ Archivieren',cls:'ghost'},
      ],
      'Veröffentlicht':[
        {status:'Archiviert',label:'🗄️ Archivieren',cls:'ghost'},
        {status:'Widerrufen',label:'↩️ Widerrufen',cls:'danger'},
      ],
      'Wegen Einwilligung gesperrt':[{status:'Zur Löschung vorgemerkt',label:'🗑️ Löschung vormerken',cls:'danger'}],
    },
  };
  return (map[rolle]||{})[status]||[];
}

async function statusWechselUI(erfolgId,statusNeu) {
  const kommentar=document.getElementById('status-kommentar')?.value||'';
  const result=await DB.statusWechsel(erfolgId,statusNeu,kommentar);
  if(!result.ok){toast('Fehler beim Statuswechsel','danger');return;}
  APP._erfolgeCache=null; // Cache leeren
  toast(`Status → ${statusNeu}`,'success');
  navigateTo('erfolg-detail',{currentErfolgId:erfolgId});
}

async function speichereArtikeltext(erfolgId) {
  const text=document.getElementById('edit-artikel')?.value||'';
  await DB.speichereArtikeltext(erfolgId, text);
  APP._erfolgeCache=null;
  toast('Artikeltext gespeichert','success');
}

async function generiereKIText(erfolgId) {
  const e=await DB.getErfolgById(erfolgId); if(!e) return;
  toast('KI-Entwurf wird generiert...','info');
  setTimeout(async()=>{
    const entwurf=`[KI-ENTWURF – NICHT VERÖFFENTLICHEN]\n\nÜberschrift: ${e.titel}\n\nKurzmeldung: Das SLZB Berlin freut sich über einen hervorragenden Erfolg bei ${e.wettbewerbText||'dem Wettbewerb'}. ${e.platzierung?`Platzierung: ${e.platzierung}. Platz.`:''} ${e.ergebnisWert?`Ergebnis: ${e.ergebnisWert} ${e.ergebnisEinheit||''}.`:''}\n\nHinweis: Keine erfundenen Fakten. Keine erfundenen Zitate. Menschliche Freigabe verpflichtend.`;
    await DB.speichereKIEntwurf(erfolgId, entwurf);
    APP._erfolgeCache=null;
    toast('KI-Entwurf generiert – bitte prüfen','success');
    navigateTo('erfolg-detail',{currentErfolgId:erfolgId});
  },1500);
}

// ── Ausgabe-Modals ───────────────────────────────────────────
// ── Ausgaben im JTFO-Stil ────────────────────────────────────





// Hilfsfunktion: HTML als Blob-URL in iframe laden (sicherer als srcdoc)
function htmlZuBlobUrl(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}

async function zeigeA3Vorschau(erfolgId) {
  toast('A3-Ausgabe wird vorbereitet...','info');
  try {
    const e = await DB.getErfolgById(erfolgId);
    if (!e) { toast('Erfolg nicht gefunden','danger'); return; }

    // Poster-Canvas erstellen (1080×1350 → A3 Querformat via CSS)
    const anzBilder = (e.bilder||[]).filter(b=>b.signedUrl).length;
    const extraTabs = anzBilder>=2 ? `<button class="tab-btn" style="color:#aaa;flex:1" onclick="wechsleA3Variante(4)">4: 2 Bilder</button>` : '';
    const extraTabs2 = anzBilder>=4 ? `<button class="tab-btn" style="color:#aaa;flex:1" onclick="wechsleA3Variante(5)">5: 4 Bilder</button>` : '';
    const hatTeam = (e.beteiligte||[]).length > 1;
    const extraTabTeam = hatTeam ? `<button class="tab-btn" style="color:#aaa;flex:1" onclick="wechsleA3Variante(6)">6: Tabelle</button>` : '';
    const extraTabPortrait = `<button class="tab-btn" style="color:#aaa;flex:1" onclick="wechsleA3Variante(7)">7: Porträt</button>`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📄 A3-Aushang – SLZB Poster-Stil</h3>
        <button class="btn btn-ghost btn-sm close-x">✕</button>
      </div>
      <div class="modal-body" style="background:#111;padding:16px">
        <div class="tabs mb-3" style="background:rgba(255,255,255,.08);border-radius:8px;padding:4px;display:flex;gap:4px;flex-wrap:wrap">
          <button class=\"tab-btn active\" style=\"color:#fff;flex:1\" onclick=\"wechsleA3Variante(1)\">1: Bild oben</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleA3Variante(2)\">2: Split</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleA3Variante(3)\">3: Vollbild</button>
          ${extraTabs}${extraTabs2}${extraTabTeam}${extraTabPortrait}
        </div>
        <div style="text-align:center">
          <canvas id="a3-canvas" width="1587" height="1123"
            style="max-width:100%;max-height:55vh;display:block;margin:0 auto;border-radius:8px"></canvas>
          <p class="text-xs mt-2" style="color:#888" id="a3-variante-info">Variante 1: Bild oben · A3 Querformat</p>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
            <span style="color:#888;font-size:.75rem">Hintergrund (ohne Foto):</span>
            <select id="ersatzbild-modus" onchange="setErsatzbildModus(this.value);wechsleA3Variante(window._a3Variante||1)"
              style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:4px 8px;font-size:.75rem">
              <option value="neutral">⚫ Neutral (empfohlen)</option>
              <option value="farbig">🎨 Sportart-Farben</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
        <button class="btn btn-outline dl-png">🖼️ PNG herunterladen</button>
        <button class="btn btn-primary print-btn">🖨️ Drucken</button>
      </div>`;
    modal.querySelector('.close-x').onclick = ()=>overlay.remove();
    modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
    modal.querySelector('.dl-png').onclick = ()=>exportPosterPNG(e,'a3-canvas');
    modal.querySelector('.print-btn').onclick = ()=>{
      const canvas = document.getElementById('a3-canvas');
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const win = window.open('','_blank');
      if (win) {
        win.document.write(`<!DOCTYPE html><html><head><style>
          body{margin:0;background:#fff}
          img{width:100%;height:auto;display:block}
          @page{size:A3 landscape;margin:0}
        </style></head><body><img src="${url}"></body></html>`);
        win.document.close();
        setTimeout(()=>win.print(), 800);
      }
    };
    overlay.appendChild(modal);
    overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    // Variante 1 als Standard
    window._a3Erfolg = e;
    window._a3Variante = 1;
    setTimeout(()=>zeichneA3Variante('a3-canvas', e, 1), 100);
    toast('A3-Aushang wird gezeichnet...','success');
  } catch(err) {
    toast('Fehler: '+err.message,'danger');
    console.error('A3 Fehler:', err);
  }
}

async function zeigeBildschirmModal(erfolgId) {
  toast('Bildschirm-Ausgabe wird vorbereitet...','info');
  try {
    const e = await DB.getErfolgById(erfolgId);
    if (!e) { toast('Erfolg nicht gefunden','danger'); return; }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>🖥️ Bildschirm-Ausgabe (SLZB-Poster-Stil)</h3>
        <button class="btn btn-ghost btn-sm close-x">✕</button>
      </div>
      <div class="modal-body" style="background:#111;padding:16px">
        <div class=\"tabs mb-3\" style=\"background:rgba(255,255,255,.08);border-radius:8px;padding:4px;display:flex;gap:4px;flex-wrap:wrap\">
          <button class=\"tab-btn active\" style=\"color:#fff;flex:1\" onclick=\"wechsleBildschirmFormat('hochformat')\">📱 Hochformat (4:5)</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('querformat')\">🖥️ Querformat (16:9)</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('tabelle')\">📊 Tabelle</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('infografik')\">📈 Infografik</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('portrait')\">👤 Porträt</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('multierfolg')\">🏅 Multi-Erfolg</button>
        </div>
        <div style=\"text-align:center\">
          <canvas id=\"screen-canvas\" width=\"1080\" height=\"1350\"
            style=\"max-width:100%;max-height:65vh;display:block;margin:0 auto;border-radius:8px\"></canvas>
          <p class=\"text-xs mt-2\" style=\"color:#888\" id=\"screen-format-info\">1080×1350 px · Hochformat</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
        <button class="btn btn-primary dl-png">🖼️ PNG herunterladen</button>
      </div>`;
    modal.querySelector('.close-x').onclick = ()=>overlay.remove();
    modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
    modal.querySelector('.dl-png').onclick = ()=>exportPosterPNG(e,'screen-canvas');
    overlay.appendChild(modal);
    overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    // Modus-Select dynamisch einfügen
    const _infoEl = document.getElementById('screen-format-info');
    if (_infoEl) {
      const _sel = document.createElement('div');
      _sel.style.cssText='display:flex;gap:8px;align-items:center;margin-top:6px';
      _sel.innerHTML=`<span style="color:#888;font-size:.75rem">Hintergrund (ohne Foto):</span>
        <select id="screen-modus-select" onchange="setErsatzbildModus(this.value);wechsleBildschirmFormat(window._screenFormat||'hochformat')"
          style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 8px;font-size:.75rem">
          <option value="neutral">⚫ Neutral</option>
          <option value="farbig">🎨 Sportart-Farben</option>
        </select>`;
      _infoEl.parentNode.insertBefore(_sel, _infoEl.nextSibling);
    }
    window._screenErfolg = e;
    window._screenFormat = 'hochformat';
    setTimeout(()=>zeichneSLZBPoster('screen-canvas', e), 100);
  } catch(err) {
    toast('Fehler: '+err.message,'danger');
    console.error('Bildschirm Fehler:', err);
  }
}


async function zeigeSocialModal(erfolgId) {
  toast('Social-Media-Ausgabe wird vorbereitet...','info');
  try {
    const e = await DB.getErfolgById(erfolgId);
    if (!e) { toast('Erfolg nicht gefunden','danger'); return; }

    const anzBilder = (e.bilder||[]).filter(b=>b.signedUrl).length;
    const tab2 = anzBilder>=2 ? `<button class="tab-btn" onclick="wechsleSocialFormat('2bilder','${e.id}')">🖼️ 2 Bilder</button>` : '';
    const tab4 = anzBilder>=4 ? `<button class="tab-btn" onclick="wechsleSocialFormat('4bilder','${e.id}')">🖼️ 4 Bilder</button>` : '';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📱 Social-Media-Ausgabe</h3>
        <button class="btn btn-ghost btn-sm close-x">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-danger mb-3">
          <span class="alert-icon">🔒</span>
          <span><strong>Social Media ist standardmäßig gesperrt.</strong> Kein Auto-Posting.</span>
        </div>
        <div class="tabs mb-3" style="flex-wrap:wrap;gap:4px;display:flex">
          <button class="tab-btn active" onclick="wechsleSocialFormat('beitrag','${e.id}')">📸 Beitrag (1:1)</button>
          <button class="tab-btn" onclick="wechsleSocialFormat('story','${e.id}')">📱 Story/Reel (9:16)</button>
          ${tab2}${tab4}
          <button class="tab-btn" onclick="wechsleSocialFormat('portrait','${e.id}')">👤 Porträt</button>
          <button class="tab-btn" onclick="wechsleSocialFormat('multierfolg','${e.id}')">🏅 Multi</button>
        </div>
        <div style="text-align:center;background:#111;padding:16px;border-radius:8px">
          <canvas id="social-canvas" width="1080" height="1080"
            style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
          <p class="text-xs mt-2" style="color:#888" id="social-format-info">1080×1080 px · Beitrag</p>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <span style="color:#888;font-size:.75rem">Hintergrund (ohne Foto):</span>
            <select onchange="setErsatzbildModus(this.value);wechsleSocialFormat(window._socialFormat||'beitrag','')"
              style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 8px;font-size:.75rem">
              <option value="neutral">⚫ Neutral</option>
              <option value="farbig">🎨 Sportart-Farben</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
        <button class="btn btn-primary dl-png">🖼️ PNG herunterladen</button>
      </div>`;

    modal.querySelector('.close-x').onclick = ()=>overlay.remove();
    modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
    modal.querySelector('.dl-png').onclick = ()=>exportPosterPNG(e,'social-canvas');
    overlay.appendChild(modal);
    overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    // Aktuelles Format merken
    window._socialErfolg = e;
    window._socialFormat = 'beitrag';
    setTimeout(()=>zeichneSocialFormat('social-canvas', e, 'beitrag'), 100);
  } catch(err) {
    toast('Fehler: '+err.message,'danger');
    console.error('Social Fehler:', err);
  }
}

async function wechsleBildschirmFormat(format) {
  // Ersatzbild-Modus aus Select lesen (falls vorhanden)
  const modusSelect = document.getElementById('screen-modus-select');
  if (modusSelect && typeof SLZB_ERSATZBILD_MODUS !== 'undefined') {
    try { eval('SLZB_ERSATZBILD_MODUS = "' + modusSelect.value + '"'); } catch(e) {}
  }
  const tabs = document.querySelectorAll('.modal .tabs .tab-btn');
  tabs.forEach(b => {
    const isActive = (format==='hochformat' && b.textContent.includes('Hochformat')) ||
                     (format==='querformat' && b.textContent.includes('Querformat'));
    b.classList.toggle('active', isActive);
    b.style.color = isActive ? '#fff' : '#aaa';
  });
  const info = document.getElementById('screen-format-info');
  const canvas = document.getElementById('screen-canvas');
  window._screenFormat = format;
  const e = window._screenErfolg;
  if (!e) return;
  if (format==='querformat') {
    if (canvas) { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='50vh'; }
    if (info) info.textContent='1920×1080 px · Querformat (16:9)';
    await zeichneBildschirmQuerformat('screen-canvas', e);
  } else if (format==='tabelle') {
    if (canvas) { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='50vh'; }
    if (info) info.textContent='1920×1080 px · Tabellen-Layout (Team/Staffel)';
    await zeichneTabellenLayout('screen-canvas', e);
  } else if (format==='infografik') {
    if (canvas) { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='50vh'; }
    if (info) info.textContent='1920×1080 px · Infografik-Layout (Bilanz)';
    await zeichneInfografikLayout('screen-canvas', e);
  } else if (format==='portrait') {
    if (canvas) { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='65vh'; }
    if (info) info.textContent='1080×1350 px · Porträt-Layout (Einzelperson)';
    await zeichnePortraitLayout('screen-canvas', e);
  } else if (format==='multierfolg') {
    if (canvas) { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='65vh'; }
    if (info) info.textContent='1080×1350 px · Multi-Erfolg-Layout';
    await zeichneMultiErfolgLayout('screen-canvas', e);
  } else {
    if (canvas) { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='65vh'; }
    if (info) info.textContent='1080×1350 px · Hochformat';
    await zeichneSLZBPoster('screen-canvas', e);
  }
}

async function wechsleSocialFormat(format, erfolgId) {
  // Tab-Buttons aktualisieren
  document.querySelectorAll('.modal .tabs .tab-btn').forEach(b=>{
    const txt = b.textContent.toLowerCase();
    let active = false;
    if (format==='beitrag') active = txt.includes('beitrag');
    else if (format==='story') active = txt.includes('story');
    else if (format==='2bilder') active = txt.includes('2 bilder');
    else if (format==='4bilder') active = txt.includes('4 bilder');
    else if (format==='portrait') active = txt.includes('porträt');
    else if (format==='multierfolg') active = txt.includes('multi');
    b.classList.toggle('active', active);
  });
  const canvas = document.getElementById('social-canvas');
  const info = document.getElementById('social-format-info');
  window._socialFormat = format;
  const e = window._socialErfolg;
  if (!e) return;

  if (format==='story') {
    canvas.width=1080; canvas.height=1920;
    canvas.style.maxHeight='70vh';
    if(info) info.textContent='1080×1920 px · Story/Reel';
    await zeichneSocialFormat('social-canvas', e, 'story');
  } else if (format==='2bilder') {
    canvas.width=1080; canvas.height=1080;
    canvas.style.maxHeight='60vh';
    if(info) info.textContent='1080×1080 px · 2 Bilder';
    await zeichnePoster2Bilder('social-canvas', e);
  } else if (format==='4bilder') {
    canvas.width=1080; canvas.height=1080;
    canvas.style.maxHeight='60vh';
    if(info) info.textContent='1080×1080 px · 4 Bilder';
    await zeichnePoster4Bilder('social-canvas', e);
  } else if (format==='portrait') {
    canvas.width=1080; canvas.height=1350;
    canvas.style.maxHeight='65vh';
    if(info) info.textContent='1080×1350 px · Porträt-Layout';
    await zeichnePortraitLayout('social-canvas', e);
  } else if (format==='multierfolg') {
    canvas.width=1080; canvas.height=1350;
    canvas.style.maxHeight='65vh';
    if(info) info.textContent='1080×1350 px · Multi-Erfolg-Layout';
    await zeichneMultiErfolgLayout('social-canvas', e);
  } else {
    // Beitrag (Standard)
    canvas.width=1080; canvas.height=1080;
    canvas.style.maxHeight='60vh';
    if(info) info.textContent='1080×1080 px · Beitrag';
    await zeichneSocialFormat('social-canvas', e, 'beitrag');
  }
}


async function wechsleA3Variante(nr) {
  document.querySelectorAll('#a3-canvas').length; // ensure modal open
  const tabs = document.querySelectorAll('.modal .tabs .tab-btn');
  tabs.forEach((b,i)=>{
    b.classList.toggle('active', i===nr-1);
    b.style.color = i===nr-1 ? '#fff' : '#aaa';
  });
  const labels = {
    1: 'Variante 1: Bild oben · A3 Querformat',
    2: 'Variante 2: Split (Bild links) · A3 Querformat',
    3: 'Variante 3: Vollbild · A3 Querformat',
    4: 'Variante 4: 2 Bilder · A3 Querformat',
    5: 'Variante 5: 4 Bilder · A3 Querformat',
    6: 'Variante 6: Tabellen-Layout (Team/Staffel) · 1920×1080',
    7: 'Variante 7: Porträt-Layout (Einzelperson) · 1080×1350',
  };
  const info = document.getElementById('a3-variante-info');
  if (info) info.textContent = labels[nr] || '';
  window._a3Variante = nr;
  const e = window._a3Erfolg;
  if (e) await zeichneA3Variante('a3-canvas', e, nr);
}

async function zeichneA3Variante(canvasId, e, nr) {
  // Kein QR-Code – Instagram-Hinweis direkt im Poster
  const eQR = {...e, _qrUrl: null};
  if (nr===1) await zeichneA3Druckfreundlich(canvasId, eQR);
  else if (nr===2) await zeichneA3Split(canvasId, eQR);
  else if (nr===3) await zeichneA3Vollbild(canvasId, eQR);
  else if (nr===4) await zeichnePoster2Bilder(canvasId, eQR);
  else if (nr===5) await zeichnePoster4Bilder(canvasId, eQR);
  else if (nr===6) await zeichneTabellenLayout(canvasId, eQR);
  else if (nr===7) await zeichnePortraitLayout(canvasId, eQR);
}


async function downloadJTFO(erfolgId, typ) {
  const e = await DB.getErfolgById(erfolgId); if(!e) return;
  const html = erzeugeJTFOHtml(e, typ);
  const blob = new Blob([html],{type:'text/html;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`SLZB_${typ}_${e.erfolgNr||'ERF'}_${new Date().toISOString().slice(0,10)}.html`;
  a.click(); URL.revokeObjectURL(url);
  toast('HTML heruntergeladen','success');
}

async function druckeJTFO(erfolgId) {
  const e = await DB.getErfolgById(erfolgId); if(!e) return;
  const html = erzeugeJTFOHtml(e, 'a3');
  const win = window.open('','_blank');
  if (win) { win.document.write(html); win.document.close(); setTimeout(()=>win.print(),800); }
}

// ── JTFO-HTML-Generator ──────────────────────────────────────
function erzeugeJTFOHtml(e, typ) {
  // Sportart: alle möglichen Quellen
  const sportart = e.sportartText ||
    SLZB_DB.getSportart(e.sportartId)?.name ||
    SLZB_DB.sportarten.find(s=>s.id===e.sportartId)?.name ||
    SLZB_DB.sportarten.find(s=>s.kuerzel===e.sportartId)?.name ||
    (e.sportartId && !e.sportartId.startsWith('SP') ? e.sportartId : '') || '';

  // Wettbewerb: alle möglichen Quellen
  const wettbewerb = e.wettbewerbText ||
    SLZB_DB.getWettbewerb(e.wettbewerbId)?.name ||
    (e.wettbewerbId && !e.wettbewerbId.startsWith('WB-') ? e.wettbewerbId : '') || '';

  // Titel bereinigt
  const titelSauber = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  const platz      = e.platzierung || '';
  const medaille   = e.medaille && e.medaille !== 'keine' ? e.medaille.toUpperCase() : '';
  const disziplin  = e.disziplin || '';
  const ergebnis   = e.ergebnisWert ? `${e.ergebnisWert} ${e.ergebnisEinheit||''}` : e.ergebnisText || '';
  const datum      = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

  // Platzierungstext
  const platzText = platz === 1 ? '1. PLATZ' : platz === 2 ? '2. PLATZ' : platz === 3 ? '3. PLATZ' : platz ? `${platz}. PLATZ` : '';

  // Medaillen-Farbe
  const medailleColor = medaille==='GOLD' ? '#FFD700' : medaille==='SILBER' ? '#C0C0C0' : medaille==='BRONZE' ? '#CD7F32' : '#003366';

  const platzLabel = platz === 1 ? (e.meldungsart==='Teamerfolg'?'BUNDESSIEGER':'SIEGER') :
                     platz === 2 ? 'VIZE-BUNDESSIEGER' :
                     platz === 3 ? 'BRONZE BEIM BUNDESFINALE' : platzText;

  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const w = typ==='social' ? '1080px' : typ==='screen' ? '960px' : '420mm';
  const h = typ==='social' ? '1080px' : typ==='screen' ? '1080px' : '297mm';

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>SLZB – ${esc(e.titel)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${w}; height:${h}; overflow:hidden;
    background:#0a0a1a;
    font-family:'Segoe UI',Arial,sans-serif;
    display:flex; flex-direction:column;
    color:#fff;
  }
  .header {
    background:rgba(0,0,0,.5);
    padding:${typ==='a3'?'8mm 12mm':'20px 30px'};
    display:flex; align-items:center; justify-content:space-between;
    border-bottom:3px solid #003366;
  }
  .header-left { display:flex; align-items:center; gap:12px; }
  .header-logo {
    background:#003366; border-radius:8px;
    padding:6px 12px; font-size:${typ==='a3'?'10pt':'14px'};
    font-weight:900; color:#fff; letter-spacing:.05em;
  }
  .header-title {
    font-size:${typ==='a3'?'9pt':'12px'};
    font-weight:700; opacity:.8; text-transform:uppercase;
    letter-spacing:.1em;
  }
  .header-sub {
    font-size:${typ==='a3'?'7pt':'10px'};
    opacity:.6; text-transform:uppercase; letter-spacing:.08em;
  }
  .header-hashtag {
    font-size:${typ==='a3'?'9pt':'13px'};
    font-weight:700; color:#4a9eff; letter-spacing:.05em;
  }
  .body {
    flex:1; display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    padding:${typ==='a3'?'10mm':'30px'};
    text-align:center; gap:${typ==='a3'?'6mm':'16px'};
    position:relative;
  }
  /* Hintergrund-Akzent */
  .body::before {
    content:'';
    position:absolute; inset:0;
    background:radial-gradient(ellipse at center, rgba(0,51,102,.4) 0%, transparent 70%);
    pointer-events:none;
  }
  .sport-label {
    font-size:${typ==='a3'?'14pt':'22px'};
    font-weight:900; text-transform:uppercase;
    letter-spacing:.15em; color:#4a9eff;
    position:relative;
  }
  .disziplin-label {
    font-size:${typ==='a3'?'10pt':'16px'};
    font-weight:600; opacity:.8; text-transform:uppercase;
    letter-spacing:.1em; position:relative;
  }
  .platz-number {
    font-size:${typ==='a3'?'120pt':'180px'};
    font-weight:900; line-height:.9;
    color:${medailleColor};
    text-shadow:0 0 60px ${medailleColor}66;
    position:relative;
  }
  .platz-text {
    font-size:${typ==='a3'?'18pt':'28px'};
    font-weight:900; text-transform:uppercase;
    letter-spacing:.2em; color:${medailleColor};
    position:relative;
  }
  .platz-label {
    font-size:${typ==='a3'?'11pt':'17px'};
    font-weight:700; text-transform:uppercase;
    letter-spacing:.15em; opacity:.9;
    position:relative;
  }
  .wettbewerb {
    font-size:${typ==='a3'?'9pt':'14px'};
    opacity:.7; text-transform:uppercase;
    letter-spacing:.08em; position:relative;
  }
  .ergebnis {
    font-size:${typ==='a3'?'11pt':'18px'};
    font-weight:600; color:#F5A800;
    position:relative;
  }
  .schule {
    font-size:${typ==='a3'?'9pt':'13px'};
    opacity:.7; position:relative;
  }
  .footer {
    background:rgba(0,0,0,.6);
    padding:${typ==='a3'?'5mm 12mm':'12px 30px'};
    display:flex; align-items:center; justify-content:space-between;
    border-top:2px solid rgba(255,255,255,.1);
    font-size:${typ==='a3'?'7pt':'10px'};
    opacity:.6;
  }
  
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="header-logo">SLZB</div>
      <div>
        <div class="header-title">${esc(wettbewerb||'Sportlicher Erfolg')}</div>
        <div class="header-sub">Schul- und Leistungssportzentrum Berlin</div>
      </div>
    </div>
    <div class="header-hashtag">#SLZBerlin</div>
  </div>

  <div class="body">
    ${hauptbild ? `<div style="position:absolute;inset:0;z-index:0;overflow:hidden">
      <img src="${hauptbild.signedUrl}" alt="${esc(hauptbild.altText||hauptbild.caption||'')}"
        style="width:100%;height:100%;object-fit:cover;opacity:.2;filter:blur(3px)">
    </div>` : ''}
    <div class="sport-label" style="position:relative">${esc(sportart || titelSauber)}</div>
    ${disziplin?`<div class="disziplin-label" style="position:relative">${esc(disziplin)}</div>`:''}
    ${platz?`<div class="platz-number" style="position:relative">${platz}</div>`:''}
    ${platzText?`<div class="platz-text" style="position:relative">${platzText}</div>`:''}
    ${platzLabel?`<div class="platz-label" style="position:relative">${esc(platzLabel)}</div>`:''}
    ${ergebnis?`<div class="ergebnis" style="position:relative">${esc(ergebnis)}</div>`:''}
    ${datum?`<div class="wettbewerb" style="position:relative">${esc(datum)}${e.ort?' · '+esc(e.ort):''}</div>`:''}
    <div class="schule" style="position:relative">Schul- und Leistungssportzentrum Berlin</div>
    ${hauptbild?`
    <div style="position:relative;margin-top:${typ==='a3'?'6mm':'16px'};max-width:${typ==='a3'?'160mm':'380px'}">
      <img src="${hauptbild.signedUrl}" alt="${esc(hauptbild.altText||hauptbild.caption||'')}"
        style="width:100%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.5)">
      ${hauptbild.caption?`<div style="font-size:${typ==='a3'?'7pt':'11px'};opacity:.8;margin-top:6px;font-style:italic;color:#fff">${esc(hauptbild.caption)}</div>`:''}
      <div style="font-size:${typ==='a3'?'6pt':'9px'};opacity:.5;margin-top:2px;color:#fff">© ${esc(hauptbild.creator||hauptbild.source||'')}</div>
    </div>`:''}
    ${e.kurzinfo?`<div style="font-size:${typ==='a3'?'9pt':'14px'};opacity:.85;margin-top:${typ==='a3'?'5mm':'14px'};max-width:${typ==='a3'?'180mm':'420px'};line-height:1.5;text-align:center;position:relative;color:#fff">${esc(e.kurzinfo)}</div>`:''}
  </div>

  <div class="footer">
    <span>SLZB-Erfolge · ${new Date().toLocaleDateString('de-DE')}</span>
    <span>${esc(e.erfolgNr||'')}</span>
  </div>
</body>
</html>`;
}

// ── Einwilligungen ───────────────────────────────────────────
function renderEinwilligungen() {
  return`<div class="page">
    <div class="page-header"><h1>🔒 Einwilligungsverwaltung</h1></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Schüler/in</th><th>Gültig bis</th><th>Foto</th><th>Print</th><th>Homepage</th><th>Dig.Sign.</th><th>Social</th><th>Einzel</th><th>Widerruf</th><th>Aktionen</th></tr></thead>
      <tbody>${SLZB_DB.schueler.map(s=>{
        const abgelaufen=s.ewGueltigBis&&new Date(s.ewGueltigBis)<new Date();
        return`<tr>
          <td>${esc(s.anzeigename)}<br><span class="text-xs text-muted">${esc(s.schuelerNr||s.id)}</span></td>
          <td class="text-sm">${fmt(s.ewGueltigBis)||'–'}${abgelaufen?'<br><span class="badge badge-danger">Abgelaufen</span>':''}</td>
          <td>${einwilligungIcon(s.ew?.foto)}</td><td>${einwilligungIcon(s.ew?.print)}</td>
          <td>${einwilligungIcon(s.ew?.homepage)}</td><td>${einwilligungIcon(s.ew?.digitalSignage)}</td>
          <td>${einwilligungIcon(s.ew?.socialMedia)}</td><td>${einwilligungIcon(s.ew?.einzeldarstellung)}</td>
          <td>${s.ewWiderruf?'<span class="badge badge-danger">Widerrufen</span>':'<span class="badge badge-success">Aktiv</span>'}</td>
          <td>${!s.ewWiderruf&&Auth.canDo('datenschutz')?`<button class="btn btn-danger btn-sm" onclick="widerrufEinwilligung('${s.id}','${esc(s.anzeigename)}')">Widerrufen</button>`:'–'}</td>
        </tr>`;}).join('')}
      </tbody>
    </table></div></div>
  </div>`;
}

function widerrufEinwilligung(schuelerId,name) {
  if(!confirm(`Einwilligung von ${name} wirklich widerrufen?`)) return;
  const s=SLZB_DB.getSchueler(schuelerId); if(!s) return;
  s.ewWiderruf=true; s.ewWiderrufDatum=new Date().toISOString();
  Object.keys(s.ew||{}).forEach(k=>s.ew[k]=false);
  SLZB_DB.erfolge.forEach(e=>{
    if(e.beteiligte?.some(b=>b.schuelerId===schuelerId)){
      if(['Veröffentlicht','Freigegeben'].includes(e.status)){
        SLZB_DB.statusWechsel(e.id,'Wegen Einwilligung gesperrt',Auth.name(),`Widerruf: ${name}`);
      }
    }
  });
  slzbSave(); toast(`Einwilligung von ${name} widerrufen.`,'warning');
  navigateTo('einwilligungen');
}

// ── Ausgaben ─────────────────────────────────────────────────
async function renderAusgaben() {
  const alle=await ladeErfolge();
  const freigegebene=alle.filter(e=>['Freigegeben','Veröffentlicht'].includes(e.status));
  return`<div class="page">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div><h1>📤 Ausgaben & Freigaben</h1></div>
    </div>
    <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
      <span>Ausgaben nur für Status <strong>Freigegeben</strong> oder <strong>Veröffentlicht</strong>.</span></div>

    <!-- Veranstaltungs-Gesamtposter -->
    <div class="card mb-3">
      <div class="card-header"><h2>🏆 Veranstaltungs-Gesamtposter</h2></div>
      <div class="card-body">
        <div class="alert alert-info mb-2"><span class="alert-icon">ℹ️</span>
          <span>Übersichts-Poster mit allen freigegebenen Erfolgen einer Veranstaltung.</span></div>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div class="form-group" style="flex:1;min-width:200px;margin:0">
            <label>Veranstaltung auswählen</label>
            <select id="veranstaltungs-poster-select" style="width:100%">
              <option value="">– Veranstaltung wählen –</option>
              ${[...new Map(freigegebene.filter(e=>e.wettbewerbText).map(e=>[e.wettbewerbText,e])).values()]
                .sort((a,b)=>a.wettbewerbText.localeCompare(b.wettbewerbText))
                .map(e=>`<option value="${esc(e.wettbewerbText)}">${esc(e.wettbewerbText)}${e.datum?' ('+new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+')':''}</option>`)
                .join('')}
            </select>
          </div>
          <button class="btn btn-primary" onclick="zeigeVeranstaltungsPosterModal()" style="white-space:nowrap">
            🏆 Gesamtposter erstellen
          </button>
        </div>
      </div>
    </div>

    <!-- Spezial-Ausgaben -->
    <div class="card mb-3">
      <div class="card-header"><h2>✨ Spezial-Ausgaben</h2></div>
      <div class="card-body">
        <div class="form-row cols-3">
          <div style="text-align:center;padding:16px;background:rgba(226,0,26,.08);border-radius:12px">
            <div style="font-size:2rem;margin-bottom:8px">🎠</div>
            <strong style="display:block;margin-bottom:6px">Highlights-Karussell</strong>
            <p class="text-xs text-muted mb-3">Monatliche Top-Erfolge als Social-Media-Serie</p>
            <button class="btn btn-primary btn-sm" onclick="zeigeHighlightsKarussell()">Karussell erstellen</button>
          </div>
          <div style="text-align:center;padding:16px;background:rgba(11,99,206,.08);border-radius:12px">
            <div style="font-size:2rem;margin-bottom:8px">🏆</div>
            <strong style="display:block;margin-bottom:6px">Nachwuchssportler-Wahl</strong>
            <p class="text-xs text-muted mb-3">Abstimmungsaufruf für Social Media</p>
            <button class="btn btn-primary btn-sm" onclick="zeigeNachwuchswahlModal()">Poster erstellen</button>
          </div>
          <div style="text-align:center;padding:16px;background:rgba(227,178,60,.08);border-radius:12px">
            <div style="font-size:2rem;margin-bottom:8px">⏳</div>
            <strong style="display:block;margin-bottom:6px">Countdown-Poster</strong>
            <p class="text-xs text-muted mb-3">Countdown bis zu einem Event</p>
            <button class="btn btn-primary btn-sm" onclick="zeigeCountdownModal()">Countdown erstellen</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Freigegebene Meldungen -->
    <div class="card">
      <div class="card-header"><h2>Freigegebene Meldungen</h2><span class="badge badge-success">${freigegebene.length}</span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nr.</th><th>Titel</th><th>Sportart</th><th>Datum</th><th>Status</th><th>Ausgaben</th></tr></thead>
        <tbody>${freigegebene.length===0?'<tr><td colspan="6" class="text-center text-muted" style="padding:30px">Keine freigegebenen Meldungen.</td></tr>':
          freigegebene.map(e=>{const sp=SLZB_DB.getSportart(e.sportartId);
            return`<tr>
              <td class="text-xs text-muted">${esc(e.erfolgNr||'–')}</td>
              <td><strong>${esc(e.titel)}</strong></td>
              <td class="text-sm">${esc(sp?.name||'–')}</td>
              <td class="text-sm">${fmt(e.datum)}</td>
              <td>${statusBadge(e.status)}</td>
              <td><div class="flex gap-2">
                <button class="btn btn-outline btn-sm" onclick="zeigeA3Vorschau('${e.id}')">📄 A3</button>
                <button class="btn btn-outline btn-sm" onclick="zeigeBildschirmModal('${e.id}')">🖥️ Bildschirm</button>
                <button class="btn btn-warning btn-sm" onclick="zeigeSocialModal('${e.id}')">📱 Social</button>
              </div></td>
            </tr>`;}).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;
}


// ── Stammdaten ───────────────────────────────────────────────
function renderStammdaten() {
  return`<div class="page">
    <div class="page-header"><h1>⚙️ Stammdaten</h1></div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('sd-sportarten')">Sportarten (${SLZB_DB.sportarten.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-wettbewerbe')">Wettbewerbe (${SLZB_DB.wettbewerbe.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-schueler')">Schüler (${SLZB_DB.schueler.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-teams')">Teams (${SLZB_DB.teams.length})</button>
    </div>
    <div id="tab-sd-sportarten" class="tab-panel active">
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Kürzel</th><th>Name</th><th>Kategorie</th><th>Aktiv</th></tr></thead>
        <tbody>${SLZB_DB.sportarten.map(s=>`<tr><td><strong>${esc(s.kuerzel)}</strong></td><td>${esc(s.name)}</td><td>${esc(s.kategorie)}</td><td>${s.aktiv?'✅':'❌'}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>
    <div id="tab-sd-wettbewerbe" class="tab-panel">
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Veranstalter</th><th>Ort</th><th>Beginn</th><th>Ebene</th></tr></thead>
        <tbody>${SLZB_DB.wettbewerbe.map(w=>`<tr><td>${esc(w.name)}</td><td>${esc(w.veranstalter||'–')}</td><td>${esc(w.ort||'–')}</td><td>${fmt(w.beginn)}</td><td>${ebeneBadge(w.ebene)}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>
    <div id="tab-sd-schueler" class="tab-panel">
      <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span><span>Schülerdaten sind intern.</span></div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Nr.</th><th>Anzeigename</th><th>Klasse</th><th>Sportart</th><th>Foto</th><th>Print</th><th>Social</th></tr></thead>
        <tbody>${SLZB_DB.schueler.map(s=>{const sp=SLZB_DB.getSportart(s.sportartId);
          return`<tr><td class="text-xs text-muted">${esc(s.schuelerNr||s.id)}</td><td>${esc(s.anzeigename)}</td>
            <td>${esc(s.klasse||'–')}</td><td>${esc(sp?.name||'–')}</td>
            <td>${einwilligungIcon(s.ew?.foto)}</td><td>${einwilligungIcon(s.ew?.print)}</td><td>${einwilligungIcon(s.ew?.socialMedia)}</td>
          </tr>`;}).join('')}
        </tbody>
      </table></div></div>
    </div>
    <div id="tab-sd-teams" class="tab-panel">
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Sportart</th><th>Kategorie</th><th>Schuljahr</th></tr></thead>
        <tbody>${SLZB_DB.teams.map(t=>{const sp=SLZB_DB.getSportart(t.sportartId);
          return`<tr><td>${esc(t.name)}</td><td>${esc(sp?.name||'–')}</td><td>${esc(t.kategorie||'–')}</td><td>${esc(t.schuljahr||'–')}</td></tr>`;}).join('')}
        </tbody>
      </table></div></div>
    </div>
  </div>`;
}

// ── Import ───────────────────────────────────────────────────
function renderImport() {
  return`<div class="page">
    <div class="page-header"><h1>📥 Import</h1></div>
    <div class="card mb-3">
      <div class="card-header"><h2>Importvorlage</h2></div>
      <div class="card-body">
        <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
          <span>Pflichtfelder: Titel, Sportart, Datum.</span></div>
        <button class="btn btn-outline mt-2" onclick="PDF.downloadImportvorlage()">⬇️ Vorlage herunterladen (CSV)</button>
      </div>
    </div>
  </div>`;
}

// ── Mein Profil ──────────────────────────────────────────────
function renderMeinProfil() {
  return`<div class="page">
    <div class="page-header"><h1>👤 Mein Profil</h1></div>
    <div class="grid grid-2 mb-4">
      <div class="card">
        <div class="card-header"><h2>Meine Daten</h2></div>
        <div class="card-body">
          <table style="width:100%;font-size:.85rem">
            <tr><td class="text-muted" style="padding:6px 0;width:40%">Name</td><td><strong>${esc(Auth.name())}</strong></td></tr>
            <tr><td class="text-muted" style="padding:6px 0">E-Mail</td><td>${esc(Auth.email())}</td></tr>
            <tr><td class="text-muted" style="padding:6px 0">Rolle</td><td><span class="badge badge-info">${esc({trainer:'Trainer/Melder',redaktion:'Redaktion',oea:'Öffentlichkeitsarbeit',datenschutz:'Datenschutz',admin:'Administrator'}[Auth.rolle()]||Auth.rolle())}</span></td></tr>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>🔑 Passwort ändern</h2></div>
        <div class="card-body">
          <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
            <span>Mindestens 12 Zeichen (Supabase-Anforderung).</span></div>
          <div class="form-group"><label>Neues Passwort <span class="required">*</span></label>
            <input type="password" id="pw-neu" placeholder="Mindestens 12 Zeichen" autocomplete="new-password"
              oninput="pruefePwStaerke(this.value)">
            <div id="pw-staerke-bar"><div id="pw-staerke-fill"></div></div>
            <div id="pw-staerke-text" class="form-hint"></div>
          </div>
          <div class="form-group"><label>Passwort bestätigen <span class="required">*</span></label>
            <input type="password" id="pw-bestaetigung" placeholder="Passwort wiederholen" autocomplete="new-password">
            <div id="pw-match-hint" class="form-hint"></div>
          </div>
          <div id="pw-fehler" style="display:none" class="alert alert-danger mb-3">
            <span class="alert-icon">❌</span><span id="pw-fehler-text"></span></div>
          <div id="pw-erfolg" style="display:none" class="alert alert-success mb-3">
            <span class="alert-icon">✅</span><span>Passwort erfolgreich geändert!</span></div>
          <button class="btn btn-primary w-full" onclick="speichereEigenesPasswort()" id="pw-speichern-btn">
            🔑 Passwort ändern
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Bild-Upload Modal ────────────────────────────────────────
function zeigeBildUploadModal(erfolgId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">
    <div class="modal-header"><h3>📷 Bild hochladen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <div class="modal-body">
      <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
        <span>Nur Bilder hochladen für die Sie die Nutzungsrechte besitzen. Urheber und Quelle sind Pflichtfelder.</span></div>
      <div class="form-group"><label>Datei <span class="required">*</span></label>
        <input type="file" id="upload-datei" accept="image/jpeg,image/png,image/webp"></div>
      <div class="form-group">
        <label>Fotograf / Urheber / Quelle <span class="required">*</span></label>
        <input type="text" id="upload-urheber" placeholder="z.B. Max Mustermann / SLZB-Archiv">
        <div class="form-hint">Name des Fotografen oder der Bildquelle</div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label>Bildunterschrift</label>
          <input type="text" id="upload-caption" placeholder="z.B. Die Staffel beim Start"></div>
        <div class="form-group"><label>Alternativtext</label>
          <input type="text" id="upload-alt" placeholder="Beschreibung für Barrierefreiheit"></div>
      </div>
      <div id="upload-error"></div>
      <div id="upload-progress" style="display:none" class="alert alert-info mt-2">
        <span class="alert-icon">⏳</span><span>Wird hochgeladen...</span></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" id="upload-btn" onclick="fuehreBildUploadDurch('${erfolgId}')">📤 Hochladen</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function fuehreBildUploadDurch(erfolgId) {
  const dateiInput = document.getElementById('upload-datei');
  const urheber    = document.getElementById('upload-urheber')?.value?.trim()||'';
  const quelle     = urheber; // Quelle = Urheber (ein Feld)
  const caption    = document.getElementById('upload-caption')?.value?.trim()||'';
  const altText    = document.getElementById('upload-alt')?.value?.trim()||'';
  const errEl      = document.getElementById('upload-error');
  const progEl     = document.getElementById('upload-progress');
  const btn        = document.getElementById('upload-btn');

  const zeigeErr = (msg) => {
    errEl.innerHTML = `<div class="alert alert-danger mt-2"><span class="alert-icon">❌</span><span>${esc(msg)}</span></div>`;
  };
  errEl.innerHTML = '';

  if (!dateiInput?.files?.length) { zeigeErr('Bitte Datei auswählen.'); return; }
  if (!urheber) { zeigeErr('Fotograf / Urheber / Quelle ist Pflichtfeld.'); return; }

  const datei = dateiInput.files[0];
  if (datei.size > 10 * 1024 * 1024) { zeigeErr('Datei zu groß (max. 10 MB).'); return; }

  btn.disabled = true;
  progEl.style.display = 'flex';

  try {
    // Session prüfen
    const session = await Backend.session();
    if (!session) throw new Error('Nicht angemeldet – bitte neu einloggen.');
    console.log('Session vorhanden:', session.user.id);

    // 1. Datei in Supabase Storage hochladen
    const userId    = Auth.id();
    const dateiname = `${Date.now()}_${datei.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const pfad      = `${userId}/${erfolgId}/${dateiname}`;

    const { data: uploadData, error: uploadError } = await Backend.client.storage
      .from('achievement-media')
      .upload(pfad, datei, {
        cacheControl: '3600',
        upsert: false,
        contentType: datei.type,
      });

    if (uploadError) {
      console.error('Storage Upload Fehler:', uploadError);
      throw new Error('Storage Upload: ' + uploadError.message);
    }
    console.log('Storage Upload OK:', uploadData);

    // 2. Metadaten in achievement_media speichern
    const metadaten = {
      achievement_id:   erfolgId,
      storage_path:     uploadData.path || pfad,
      original_name:    datei.name,
      mime_type:        datei.type,
      file_size:        datei.size || null,
      creator:          urheber,
      copyright_holder: urheber,
      source:           quelle,
      caption:          caption || null,
      alt_text:         altText || null,
      uploaded_by:      userId || null,
      created_at:       new Date().toISOString(),
    };
    console.log('Metadaten:', metadaten);

    const { error: metaError } = await Backend.client
      .from('achievement_media')
      .insert([metadaten]);

    if (metaError) {
      await Backend.client.storage.from('achievement-media').remove([pfad]);
      throw new Error('Metadaten-Fehler: ' + metaError.message);
    }

    // Erfolg
    document.querySelector('.modal-overlay')?.remove();
    toast('Bild erfolgreich hochgeladen! ✅', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: erfolgId });

  } catch(e) {
    debug('Bild-Upload Fehler: ' + e.message);
    zeigeErr(e.message);
    btn.disabled = false;
    progEl.style.display = 'none';
  }
}

function pruefePwStaerke(pw) {
  const fill=document.getElementById('pw-staerke-fill');
  const text=document.getElementById('pw-staerke-text');
  if(!fill||!text) return;
  if(!pw){fill.style.width='0%';text.textContent='';return;}
  let p=0;
  if(pw.length>=12) p++;
  if(pw.length>=16) p++;
  if(/[A-Z]/.test(pw)) p++;
  if(/[a-z]/.test(pw)) p++;
  if(/[0-9]/.test(pw)) p++;
  if(/[^A-Za-z0-9]/.test(pw)) p++;
  const stufen=[
    {min:0,max:1,label:'Sehr schwach',farbe:'#E8001D',breite:'15%'},
    {min:2,max:2,label:'Schwach',farbe:'#E67E00',breite:'30%'},
    {min:3,max:3,label:'Mittel',farbe:'#F5A800',breite:'55%'},
    {min:4,max:4,label:'Gut',farbe:'#1A7A3C',breite:'75%'},
    {min:5,max:6,label:'Stark',farbe:'#0D5C2E',breite:'100%'},
  ];
  const s=stufen.find(s=>p>=s.min&&p<=s.max)||stufen[0];
  fill.style.width=s.breite; fill.style.background=s.farbe;
  text.textContent=`Passwortstärke: ${s.label}`; text.style.color=s.farbe;
}

async function speichereEigenesPasswort() {
  const neu=document.getElementById('pw-neu')?.value||'';
  const best=document.getElementById('pw-bestaetigung')?.value||'';
  const btn=document.getElementById('pw-speichern-btn');
  const errEl=document.getElementById('pw-fehler');
  const errTxt=document.getElementById('pw-fehler-text');
  const okEl=document.getElementById('pw-erfolg');
  const zeigeErr=(msg)=>{errTxt.textContent=msg;errEl.style.display='flex';okEl.style.display='none';};
  if(neu.length<12){zeigeErr('Mindestens 12 Zeichen erforderlich.');return;}
  if(neu!==best){zeigeErr('Passwörter stimmen nicht überein.');return;}
  btn.disabled=true; btn.textContent='Wird gespeichert...';
  try {
    await Auth.aenderePasswort(neu);
    errEl.style.display='none'; okEl.style.display='flex';
    document.getElementById('pw-neu').value='';
    document.getElementById('pw-bestaetigung').value='';
    document.getElementById('pw-staerke-fill').style.width='0%';
    document.getElementById('pw-staerke-text').textContent='';
    toast('Passwort erfolgreich geändert!','success');
  } catch(e) {
    zeigeErr(e.message);
  } finally {
    btn.disabled=false; btn.textContent='🔑 Passwort ändern';
  }
}

// ── Jahreschronik ─────────────────────────────────────────────
async function renderJahreschronik() {
  const alle=await ladeErfolge();
  const schuljahre=[...new Set(alle.map(e=>SLZB_DB.getSchuljahr(e.datum)).filter(Boolean))].sort().reverse();
  const aktuellesSchuljahr=schuljahre[0]||'';
  return`<div class="page">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div><h1>📅 Jahreschronik</h1></div>
      <button class="btn btn-outline btn-sm" onclick="exportiereChronikCSVAktuell()" style="white-space:nowrap">
        ⬇️ CSV exportieren
      </button>
      <button class="btn btn-primary btn-sm" onclick="exportiereChronikPPTX()" style="white-space:nowrap">
        📊 PowerPoint exportieren
      </button>
    </div>
    <div class="card mb-3"><div class="card-body">
      <div class="form-row cols-4">
        <div class="form-group"><label>Schuljahr</label>
          <select id="chr-schuljahr" onchange="aktualisiereChronik()">
            <option value="">Alle Schuljahre</option>
            ${schuljahre.map(j=>`<option value="${j}"${j===aktuellesSchuljahr?' selected':''}>${j}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Sportart</label>
          <select id="chr-sportart" onchange="aktualisiereChronik()">
            <option value="">Alle</option>
            ${SLZB_DB.sportarten.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Ebene</label>
          <select id="chr-ebene" onchange="aktualisiereChronik()">
            <option value="">Alle</option>
            ${['Schulebene','Bezirk','Landesebene','Bundesebene','International'].map(e=>`<option>${e}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Typ</label>
          <select id="chr-typ" onchange="aktualisiereChronik()">
            <option value="">Alle</option>
            <option value="Einzelerfolg">Einzelerfolge</option>
            <option value="Teamerfolg">Teamerfolge</option>
          </select></div>
      </div>
      <div class="flex gap-2 mt-2">
        <button class="btn btn-outline btn-sm" onclick="druckeChronik()">🖨️ Drucken</button>
        <button class="btn btn-outline btn-sm" onclick="exportiereChronikCSV()">⬇️ CSV-Export</button>
      </div>
    </div></div>
    <div id="chronik-inhalt">${renderChronikInhalt(alle,aktuellesSchuljahr,'','','')}</div>
  </div>`;
}

function renderChronikInhalt(alle,schuljahr,sportartId,ebene,typ) {
  let gefiltert=alle.filter(e=>['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if(schuljahr) gefiltert=gefiltert.filter(e=>SLZB_DB.getSchuljahr(e.datum)===schuljahr);
  if(sportartId) gefiltert=gefiltert.filter(e=>e.sportartId===sportartId);
  if(ebene) gefiltert=gefiltert.filter(e=>e.ebene===ebene);
  if(typ) gefiltert=gefiltert.filter(e=>e.meldungsart===typ);
  gefiltert.sort((a,b)=>new Date(b.datum)-new Date(a.datum));
  if(!gefiltert.length) return`<div class="alert alert-info"><span class="alert-icon">ℹ️</span><span>Keine freigegebenen Erfolge für die gewählten Filter.</span></div>`;
  const goldCount=gefiltert.filter(e=>e.medaille==='Gold').length;
  const silberCount=gefiltert.filter(e=>e.medaille==='Silber').length;
  const bronzeCount=gefiltert.filter(e=>e.medaille==='Bronze').length;
  const gruppen={};
  gefiltert.forEach(e=>{const key=SLZB_DB.getSportart(e.sportartId)?.name||'Sonstige';if(!gruppen[key])gruppen[key]=[];gruppen[key].push(e);});
  const mi={Gold:'🥇',Silber:'🥈',Bronze:'🥉'};
  return`
    <div class="grid grid-4 mb-4">
      <div class="stat-card"><div class="stat-icon blue">🏆</div><div><div class="stat-value">${gefiltert.length}</div><div class="stat-label">Erfolge gesamt</div></div></div>
      <div class="stat-card"><div class="stat-icon gold">🥇</div><div><div class="stat-value">${goldCount}</div><div class="stat-label">Gold</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#F1F5F9;color:#475569">🥈</div><div><div class="stat-value">${silberCount}</div><div class="stat-label">Silber</div></div></div>
      <div class="stat-card"><div class="stat-icon orange">🥉</div><div><div class="stat-value">${bronzeCount}</div><div class="stat-label">Bronze</div></div></div>
    </div>
    <div id="chronik-druck">
      <div style="display:none" class="chronik-druckkopf">
        <h2 style="color:#003366">SLZB Berlin – Jahreschronik ${schuljahr||'Alle Jahre'}</h2>
        <p style="color:#6B7A99;font-size:.85rem">Erstellt am ${new Date().toLocaleDateString('de-DE')}</p>
        <hr style="margin:12px 0">
      </div>
      ${Object.entries(gruppen).map(([sportart,erfolge])=>`
        <div class="card mb-3">
          <div class="card-header" style="background:var(--slzb-light)">
            <h2>🏅 ${esc(sportart)}</h2>
            <span class="badge badge-info">${erfolge.length}</span>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Datum</th><th>Titel</th><th>Disziplin</th><th>Ebene</th><th>Platz</th><th>Medaille</th><th>Ergebnis</th></tr></thead>
            <tbody>${erfolge.map(e=>`<tr style="cursor:pointer" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
              <td class="text-sm">${fmt(e.datum)}</td>
              <td><strong>${esc(e.titel)}</strong></td>
              <td class="text-sm">${esc(e.disziplin||'–')}</td>
              <td>${ebeneBadge(e.ebene)}</td>
              <td class="text-sm font-bold">${e.platzierung?e.platzierung+'.':'–'}</td>
              <td>${e.medaille&&e.medaille!=='keine'?mi[e.medaille]+' '+e.medaille:'–'}</td>
              <td class="text-sm">${e.ergebnisWert?e.ergebnisWert+' '+esc(e.ergebnisEinheit||''):esc(e.ergebnisText||'–')}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>`).join('')}
    </div>`;
}

async function aktualisiereChronik() {
  const schuljahr=document.getElementById('chr-schuljahr')?.value||'';
  const sportartId=document.getElementById('chr-sportart')?.value||'';
  const ebene=document.getElementById('chr-ebene')?.value||'';
  const typ=document.getElementById('chr-typ')?.value||'';
  const alle=await ladeErfolge();
  const inhalt=document.getElementById('chronik-inhalt');
  if(inhalt) inhalt.innerHTML=renderChronikInhalt(alle,schuljahr,sportartId,ebene,typ);
}

function druckeChronik() {
  document.querySelectorAll('.chronik-druckkopf').forEach(el=>el.style.display='block');
  window.print();
  setTimeout(()=>document.querySelectorAll('.chronik-druckkopf').forEach(el=>el.style.display='none'),1000);
}

async function exportiereChronikCSV() {
  const schuljahr=document.getElementById('chr-schuljahr')?.value||'';
  const sportartId=document.getElementById('chr-sportart')?.value||'';
  const ebene=document.getElementById('chr-ebene')?.value||'';
  const typ=document.getElementById('chr-typ')?.value||'';
  const alle=await ladeErfolge();
  let gefiltert=alle.filter(e=>['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if(schuljahr) gefiltert=gefiltert.filter(e=>SLZB_DB.getSchuljahr(e.datum)===schuljahr);
  if(sportartId) gefiltert=gefiltert.filter(e=>e.sportartId===sportartId||e.sportartText===SLZB_DB.getSportart(sportartId)?.name);
  if(ebene) gefiltert=gefiltert.filter(e=>e.ebene===ebene);
  if(typ) gefiltert=gefiltert.filter(e=>e.meldungsart===typ);
  gefiltert.sort((a,b)=>new Date(b.datum)-new Date(a.datum));
  PDF.exportiereChronikCSV(gefiltert,schuljahr);
  toast('CSV-Export heruntergeladen','success');
}

// ══════════════════════════════════════════════════════════════
// GENERISCHER POSTER-BILD-UPLOAD (Variante 1: nur Storage)
// Kein achievement_media-Eintrag – nur Storage + Signed URL
// ══════════════════════════════════════════════════════════════
async function uploadPosterBild(dateiInput, kategorie='poster') {
  if (!dateiInput?.files?.length) return null;
  const datei = dateiInput.files[0];
  if (datei.size > 10*1024*1024) { toast('Datei zu groß (max. 10 MB)','warning'); return null; }
  const session = await Backend.session();
  if (!session) { toast('Nicht angemeldet','danger'); return null; }
  const userId = Auth.id();
  const dateiname = `${Date.now()}_${datei.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const pfad = `${userId}/${kategorie}/${dateiname}`;
  const { data: uploadData, error: uploadError } = await Backend.client.storage
    .from('achievement-media')
    .upload(pfad, datei, { cacheControl:'3600', upsert:false, contentType:datei.type });
  if (uploadError) { toast('Upload-Fehler: '+uploadError.message,'danger'); return null; }
  const { data: signed } = await Backend.client.storage
    .from('achievement-media').createSignedUrl(uploadData.path||pfad, 3600);
  return signed?.signedUrl || null;
}

// Hilfsfunktion: Datei-Input mit Vorschau-Thumbnail
function posterBildInputHTML(inputId, labelText='Hintergrundbild') {
  return `<div class="form-group" style="grid-column:1/-1">
    <label style="color:#fff">${esc(labelText)} <span style="color:#888;font-size:.75rem">(Upload oder URL)</span></label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input type="file" id="${inputId}-file" accept="image/*"
        style="flex:1;min-width:180px;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:6px"
        onchange="posterBildVorschau('${inputId}')">
      <span style="color:#888;font-size:.8rem">oder</span>
      <input type="text" id="${inputId}-url" placeholder="https://..."
        style="flex:2;min-width:180px;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
    </div>
    <div id="${inputId}-thumb" style="margin-top:6px;display:none">
      <img id="${inputId}-thumb-img" style="height:60px;border-radius:6px;object-fit:cover" alt="Vorschau">
    </div>
  </div>`;
}

function posterBildVorschau(inputId) {
  const file = document.getElementById(`${inputId}-file`)?.files?.[0];
  if (!file) return;
  const thumb = document.getElementById(`${inputId}-thumb`);
  const img = document.getElementById(`${inputId}-thumb-img`);
  if (thumb && img) {
    thumb.style.display='block';
    img.src = URL.createObjectURL(file);
  }
}

// Bild laden: erst File-Input, dann URL-Feld
async function posterBildLaden(inputId, kategorie='poster') {
  const fileInput = document.getElementById(`${inputId}-file`);
  const urlInput = document.getElementById(`${inputId}-url`);
  if (fileInput?.files?.length) {
    // Upload zu Supabase Storage
    const signedUrl = await uploadPosterBild(fileInput, kategorie);
    return signedUrl;
  }
  return urlInput?.value?.trim() || null;
}


// Ersatzbild-Modus umschalten (neutral / farbig)
function setErsatzbildModus(modus) {
  if (typeof SLZB_ERSATZBILD_MODUS !== 'undefined') {
    window.SLZB_ERSATZBILD_MODUS = modus;
    // Auch in poster.js setzen (globale Variable)
    if (typeof zeichneErsatzbild !== 'undefined') {
      // poster.js Variable direkt setzen
      eval('SLZB_ERSATZBILD_MODUS = "' + modus + '"');
    }
  }
}
// ══════════════════════════════════════════════════════════════
// FEATURE 1: HIGHLIGHTS-KARUSSELL MODAL
// ══════════════════════════════════════════════════════════════
async function zeigeHighlightsKarussell() {
  const alle = await ladeErfolge();
  const jetzt = new Date();
  const monat = jetzt.getMonth();
  const jahr = jetzt.getFullYear();

  // Vormonat berechnen
  const vormonat = monat === 0 ? 11 : monat - 1;
  const vormonatJahr = monat === 0 ? jahr - 1 : jahr;
  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  // Erfolge des Vormonats (freigegeben/veröffentlicht)
  const highlights = alle.filter(e => {
    if (!['Freigegeben','Veröffentlicht'].includes(e.status)) return false;
    const d = e.datum ? new Date(e.datum) : null;
    if (!d) return false;
    return d.getMonth() === vormonat && d.getFullYear() === vormonatJahr;
  }).slice(0, 10);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';

  const monatLabel = `${monatNamen[vormonat]} ${vormonatJahr}`;

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🎠 Highlights-Karussell – ${esc(monatLabel)}</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      ${highlights.length === 0 ? `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><span>Keine freigegebenen Erfolge für ${esc(monatLabel)} gefunden.</span></div>` : `
      <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
        <span>${highlights.length} Erfolge gefunden. Jede Karte einzeln herunterladen.</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${highlights.map((_,i)=>`<button class="tab-btn ${i===0?'active':''}" onclick="highlightKarteZeigen(${i})">${i+1}</button>`).join('')}
      </div>
      <div style="text-align:center">
        <canvas id="highlight-canvas" width="1080" height="1080"
          style="max-width:100%;max-height:55vh;display:block;margin:0 auto;border-radius:8px"></canvas>
        <p class="text-xs mt-2" style="color:#888" id="highlight-info">Karte 1 von ${highlights.length}</p>
      </div>`}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Schließen</button>
      ${highlights.length>0?`
      <button class="btn btn-outline" onclick="highlightAlleHerunterladen()">⬇️ Alle herunterladen</button>
      <button class="btn btn-primary" onclick="highlightKarteHerunterladen()">🖼️ Diese Karte</button>`:''}
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  if (highlights.length > 0) {
    window._highlightErfolge = highlights;
    window._highlightAktuell = 0;
    window._highlightMonat = monatLabel;
    setTimeout(()=>highlightKarteZeigen(0), 100);
  }
}

async function highlightKarteZeigen(nr) {
  const erfolge = window._highlightErfolge || [];
  if (!erfolge[nr]) return;
  window._highlightAktuell = nr;
  const e = await DB.getErfolgById(erfolge[nr].id);
  document.querySelectorAll('.modal .tabs .tab-btn, .modal .tab-btn').forEach((b,i)=>{
    b.classList.toggle('active', i===nr);
  });
  const info = document.getElementById('highlight-info');
  if (info) info.textContent = `Karte ${nr+1} von ${erfolge.length} · ${e.titel||''}`;
  await zeichneHighlightKarte('highlight-canvas', e, nr+1, erfolge.length);
}

function highlightKarteHerunterladen() {
  const canvas = document.getElementById('highlight-canvas');
  if (!canvas) return;
  const nr = (window._highlightAktuell||0)+1;
  const monat = (window._highlightMonat||'highlights').replace(/\s/g,'-');
  const a = document.createElement('a');
  a.download = `SLZB_Highlight_${monat}_${nr}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

async function highlightAlleHerunterladen() {
  const erfolge = window._highlightErfolge || [];
  toast(`${erfolge.length} Karten werden generiert...`,'info');
  for (let i=0; i<erfolge.length; i++) {
    await highlightKarteZeigen(i);
    await new Promise(r=>setTimeout(r,300));
    highlightKarteHerunterladen();
    await new Promise(r=>setTimeout(r,200));
  }
  toast('Alle Karten heruntergeladen!','success');
}

// ══════════════════════════════════════════════════════════════
// FEATURE 2: NACHWUCHSSPORTLER-WAHL MODAL
// ══════════════════════════════════════════════════════════════
function zeigeNachwuchswahlModal() {
  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const jetzt = new Date();
  const aktMonat = monatNamen[jetzt.getMonth()];
  const aktJahr = jetzt.getFullYear();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>🏆 Nachwuchssportler-Wahl</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">

      <!-- Modus-Auswahl -->
      <div class="tabs mb-3" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="tab-btn active" id="nw-tab-monat" onclick="nwModusWechsel('monat')">📅 Monat</button>
        <button class="tab-btn" id="nw-tab-jahr" onclick="nwModusWechsel('jahr')">🏆 Jahr</button>
        <button class="tab-btn" id="nw-tab-sieger" onclick="nwModusWechsel('sieger')">🥇 Sieger melden</button>
      </div>

      <!-- Monat/Jahr-Felder -->
      <div id="nw-felder-wahl" class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="color:#fff" id="nw-zeitraum-label">Monat</label>
          <input type="text" id="nw-monat" value="${esc(aktMonat)}" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group" id="nw-link-gruppe">
          <label style="color:#fff">Abstimmungslink (optional)</label>
          <input type="text" id="nw-link" placeholder="z.B. slzb.de/wahl" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
      </div>

      <!-- Sieger-Felder (nur bei Modus sieger) -->
      <div id="nw-felder-sieger" style="display:none" class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="color:#fff">Sieger/in Name <span class="required">*</span></label>
          <input type="text" id="nw-sieger-name" placeholder="Vorname Nachname" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Sportart</label>
          <input type="text" id="nw-sieger-sport" placeholder="z.B. Leichtathletik" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Zeitraum (Monat/Jahr)</label>
          <input type="text" id="nw-sieger-zeitraum" placeholder="z.B. Oktober 2026" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px" value="${esc(aktMonat+' '+aktJahr)}">
        </div>
        ${posterBildInputHTML('nw-sieger-bild','Foto')}
        <div class="form-group" style="grid-column:1/-1">
          <label style="color:#fff">Erfolge (eine pro Zeile)</label>
          <textarea id="nw-sieger-erfolge" rows="4" placeholder="z.B.&#10;🥇 Berliner Meister 100m Sprint&#10;🥈 Deutsche Meisterschaft Staffel&#10;🏆 Schulrekord 200m" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;width:100%"></textarea>
        </div>
      </div>

      <!-- Kandidaten (Wahl-Modus) -->
      <div id="nw-kandidaten-bereich">
        <div id="nw-kandidaten">
          <div class="alert alert-info mb-2"><span class="alert-icon">ℹ️</span><span>Bis zu 3 Kandidaten. Fotos optional per URL.</span></div>
        </div>
        <button class="btn btn-ghost btn-sm mb-3" onclick="nwKandidatHinzu()">+ Kandidat/in hinzufügen</button>
      </div>

      <div style="text-align:center;background:#0a0a1e;padding:16px;border-radius:8px">
        <canvas id="nw-canvas" width="1080" height="1350"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline" onclick="nwVorschau()">👁️ Vorschau</button>
      <button class="btn btn-primary" onclick="nwHerunterladen()">🖼️ PNG herunterladen</button>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  window._nwModus = 'monat';
  window._nwKandidaten = [];
  nwKandidatHinzu();
}

function nwModusWechsel(modus) {
  window._nwModus = modus;
  ['monat','jahr','sieger'].forEach(m=>{
    const btn = document.getElementById(`nw-tab-${m}`);
    if (btn) btn.classList.toggle('active', m===modus);
  });
  const felder = document.getElementById('nw-felder-wahl');
  const sieger = document.getElementById('nw-felder-sieger');
  const kandidaten = document.getElementById('nw-kandidaten-bereich');
  const label = document.getElementById('nw-zeitraum-label');
  const linkGruppe = document.getElementById('nw-link-gruppe');
  const monatInput = document.getElementById('nw-monat');

  if (modus === 'sieger') {
    if (felder) felder.style.display = 'none';
    if (sieger) sieger.style.display = '';
    if (kandidaten) kandidaten.style.display = 'none';
  } else {
    if (felder) felder.style.display = '';
    if (sieger) sieger.style.display = 'none';
    if (kandidaten) kandidaten.style.display = '';
    if (modus === 'jahr') {
      if (label) label.textContent = 'Jahr';
      if (monatInput) monatInput.placeholder = 'z.B. 2026';
      if (linkGruppe) linkGruppe.style.display = '';
    } else {
      if (label) label.textContent = 'Monat';
      if (monatInput) monatInput.placeholder = '';
      if (linkGruppe) linkGruppe.style.display = '';
    }
  }
}

let _nwKandidatId = 0;
function nwKandidatHinzu() {
  const container = document.getElementById('nw-kandidaten');
  if (!container) return;
  const vorh = container.querySelectorAll('.nw-kandidat').length;
  if (vorh >= 3) { toast('Maximal 3 Kandidaten','warning'); return; }
  const id = ++_nwKandidatId;
  const div = document.createElement('div');
  div.className = 'nw-kandidat card mb-2';
  div.style.padding = '12px';
  div.innerHTML = `
    <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">
      <div style="flex:1;min-width:140px">
        <label style="color:#aaa;font-size:.75rem">Name</label>
        <input type="text" id="nw-name-${id}" placeholder="Vorname Nachname" style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
      </div>
      <div style="flex:1;min-width:120px">
        <label style="color:#aaa;font-size:.75rem">Sportart</label>
        <input type="text" id="nw-sport-${id}" placeholder="z.B. Judo" style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
      </div>
      <div style="flex:2;min-width:180px">
        <label style="color:#aaa;font-size:.75rem">Foto-URL (optional)</label>
        <input type="text" id="nw-bild-${id}" placeholder="https://..." style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
      </div>
      <div style="flex:2;min-width:200px">
        <label style="color:#aaa;font-size:.75rem">Erfolge (eine pro Zeile)</label>
        <textarea id="nw-erfolge-${id}" rows="2" placeholder="🥇 Berliner Meister&#10;🥈 Deutsche Meisterschaft" style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px"></textarea>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.nw-kandidat').remove()" style="color:#E2001A;margin-top:20px">✕</button>
    </div>`;
  container.appendChild(div);
}

async function nwVorschau() {
  const modus = window._nwModus || 'monat';

  if (modus === 'sieger') {
    // Sieger-Poster
    const name = document.getElementById('nw-sieger-name')?.value||'';
    const sport = document.getElementById('nw-sieger-sport')?.value||'';
    const zeitraum = document.getElementById('nw-sieger-zeitraum')?.value||'';
    const erfolgeText = document.getElementById('nw-sieger-erfolge')?.value||'';
    const erfolge = erfolgeText.split('\n').map(s=>s.trim()).filter(Boolean);
    if (!name) { toast('Name ist Pflichtfeld','warning'); return; }
    const bildUrl = await posterBildLaden('nw-sieger-bild','poster-nachwuchs');
    await zeichneNachwuchsSiegerPoster('nw-canvas', {name, sport, zeitraum, bildUrl, erfolge});
  } else {
    // Wahl-Poster
    const monat = document.getElementById('nw-monat')?.value||'';
    const link = document.getElementById('nw-link')?.value||'';
    const kandidaten = [];
    document.querySelectorAll('.nw-kandidat').forEach((div)=>{
      const id = div.querySelector('[id^="nw-name-"]')?.id?.replace('nw-name-','');
      if (!id) return;
      const erfolgeRaw = document.getElementById(`nw-erfolge-${id}`)?.value||'';
      kandidaten.push({
        name: document.getElementById(`nw-name-${id}`)?.value||'',
        sportart: document.getElementById(`nw-sport-${id}`)?.value||'',
        bild: document.getElementById(`nw-bild-${id}`)?.value||null,
        erfolge: erfolgeRaw.split('\n').map(s=>s.trim()).filter(Boolean),
      });
    });
    const titel = modus==='jahr' ? `Nachwuchssportler/in des Jahres ${monat}` : null;
    await zeichneNachwuchswahlPoster('nw-canvas', {monat, kandidaten, abstimmungslink: link, titelOverride: titel});
  }
}

function nwHerunterladen() {
  const canvas = document.getElementById('nw-canvas');
  if (!canvas) return;
  const modus = window._nwModus||'monat';
  const zeitraum = modus==='sieger'
    ? (document.getElementById('nw-sieger-zeitraum')?.value||'sieger').replace(/\s/g,'-')
    : (document.getElementById('nw-monat')?.value||'wahl').replace(/\s/g,'-');
  const prefix = modus==='sieger' ? 'Sieger' : modus==='jahr' ? 'JahresSieger' : 'Wahl';
  const a = document.createElement('a');
  a.download = `SLZB_Nachwuchs${prefix}_${zeitraum}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ══════════════════════════════════════════════════════════════
// FEATURE 3: COUNTDOWN-POSTER MODAL
// ══════════════════════════════════════════════════════════════
function zeigeCountdownModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>⏳ Countdown-Poster erstellen</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      <div class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="color:#fff">Event-Name <span class="required">*</span></label>
          <input type="text" id="cd-name" placeholder="z.B. Berliner Meisterschaften" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Datum & Uhrzeit <span class="required">*</span></label>
          <input type="datetime-local" id="cd-datum" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Ort</label>
          <input type="text" id="cd-ort" placeholder="z.B. Schwimmhalle Landsberger Allee" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Sportart (optional)</label>
          <input type="text" id="cd-sportart" placeholder="z.B. Schwimmen" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        ${posterBildInputHTML('cd-bild','Hintergrundbild')}
      </div>
      <div class="tabs mb-3" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="tab-btn active" onclick="cdFormatWechsel('hochformat')">📱 Hochformat (4:5)</button>
        <button class="tab-btn" onclick="cdFormatWechsel('querformat')">🖥️ Querformat (16:9)</button>
        <button class="tab-btn" onclick="cdFormatWechsel('a3')">🖨️ A3 Druck (quer)</button>
      </div>
      <div style="text-align:center;background:#0a0a1e;padding:16px;border-radius:8px">
        <canvas id="cd-canvas" width="1080" height="1350"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
        <p class="text-xs mt-2" style="color:#888" id="cd-info">Countdown wird berechnet...</p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline" onclick="cdVorschau()">👁️ Vorschau aktualisieren</button>
      <button class=\"btn btn-outline\" onclick=\"cdEinreichen()\" style=\"border-color:#00a040;color:#00a040\">📤 Zur Redaktion einreichen</button>
      <button class="btn btn-primary" onclick="cdHerunterladen()">🖼️ PNG herunterladen</button>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  window._cdFormat = 'hochformat';
  // Datum vorausfüllen (morgen)
  const morgen = new Date(Date.now()+24*60*60*1000);
  morgen.setHours(10,0,0,0);
  const iso = morgen.toISOString().slice(0,16);
  setTimeout(()=>{ const el=document.getElementById('cd-datum'); if(el) el.value=iso; },50);
}

function cdFormatWechsel(format) {
  window._cdFormat = format;
  document.querySelectorAll('.modal .tab-btn').forEach(b=>{
    const t=b.textContent.toLowerCase();
    b.classList.toggle('active',(format==='hochformat'&&t.includes('hochformat'))||(format==='querformat'&&t.includes('querformat'))||(format==='a3'&&t.includes('a3')));
  });
  const canvas = document.getElementById('cd-canvas');
  if (canvas) {
    if (format==='querformat') { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='45vh'; }
    else if (format==='a3') { canvas.width=1587; canvas.height=1123; canvas.style.maxHeight='45vh'; }
    else { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='60vh'; }
  }
}

async function cdVorschau() {
  const name = document.getElementById('cd-name')?.value||'';
  const datum = document.getElementById('cd-datum')?.value||'';
  const ort = document.getElementById('cd-ort')?.value||'';
  if (!name||!datum) { toast('Event-Name und Datum sind Pflichtfelder','warning'); return; }
  const format = window._cdFormat||'hochformat';
  cdFormatWechsel(format);
  const bildUrl = await posterBildLaden('cd-bild','poster-countdown');
  const sportartCd = document.getElementById('cd-sportart')?.value||'';
  const opts = { eventName:name, eventDatum:datum, ort, sportart:sportartCd, format: format==='a3'?'hochformat':format, hintergrundbild:bildUrl };
  if (format==='a3') {
    // A3-Druck: Countdown-Zahl + Event-Name im A3-Layout
    const canvas = document.getElementById('cd-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    await ladeMontserrat(); await ladeLogo();
    const W=canvas.width, H=canvas.height;
    const bild = bildUrl ? await ladeBild(bildUrl) : null;
    const eventDatum = datum ? new Date(datum) : null;
    const diff = eventDatum ? eventDatum - new Date() : 0;
    const tage = diff>0 ? Math.floor(diff/(1000*60*60*24)) : 0;
    const datumStr = eventDatum ? eventDatum.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : '';
    const karteOpts = {
      subtitle: 'COUNTDOWN',
      vorname: tage>0 ? `NOCH ${tage}` : 'HEUTE',
      nachname: tage===1?'TAG':'TAGE',
      titel: null,
      zusatz: [name, ort, datumStr].filter(Boolean).join(' · '),
      wettbewerb: name,
    };
    await zeichnePosterA3Allgemein(ctx, W, H, bild, karteOpts, 'gruen', datumStr);
  } else {
    await zeichneCountdownPoster('cd-canvas', opts);
  }
  // Countdown-Info
  const eventD = new Date(datum);
  const diff = eventD - new Date();
  const info = document.getElementById('cd-info');
  if (info) {
    if (diff<=0) info.textContent='Event hat bereits stattgefunden';
    else {
      const t=Math.floor(diff/(1000*60*60*24)), h=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
      info.textContent=`Noch ${t} Tag(e) und ${h} Stunde(n) bis zum Event`;
    }
  }
}

function cdHerunterladen() {
  const canvas = document.getElementById('cd-canvas');
  if (!canvas) return;
  const name = (document.getElementById('cd-name')?.value||'countdown').replace(/\s/g,'-');
  const a = document.createElement('a');
  a.download = `SLZB_Countdown_${name}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ══════════════════════════════════════════════════════════════
// NAVIGIERBARE SEITEN für Highlights, Nachwuchswahl, Countdown
// ══════════════════════════════════════════════════════════════

function renderHighlightsSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>🎠 Highlights-Karussell</h1>
      <p>Monatliche Top-Erfolge als Social-Media-Karussell-Serie</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Es werden automatisch alle <strong>freigegebenen Erfolge des Vormonats</strong> geladen und als einzelne 1080×1080px Karten im SLZB-Stil erstellt.</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Jede Karte zeigt: Foto, Sportart, Titel, Platzierung und Karussell-Nummer (z.B. „3 / 7"). Ideal für Instagram-Karussell-Posts.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeHighlightsKarussell()" style="white-space:nowrap">
            🎠 Karussell erstellen
          </button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Hinweise</h2></div>
      <div class="card-body">
        <ul style="padding-left:20px;line-height:2">
          <li>Nur Erfolge mit Status <strong>Freigegeben</strong> oder <strong>Veröffentlicht</strong> werden berücksichtigt</li>
          <li>Bilder werden aus Supabase Storage geladen (Signed URLs)</li>
          <li>Jede Karte kann einzeln oder alle auf einmal heruntergeladen werden</li>
          <li>Kein automatisches Posting – Export als PNG</li>
        </ul>
      </div>
    </div>
  </div>`;
}

function renderNachwuchswahlSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>🏆 Nachwuchssportler/in des Monats</h1>
      <p>Abstimmungsaufruf für Social Media erstellen</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Erstelle ein Abstimmungsposter mit bis zu <strong>3 Kandidaten</strong> im SLZB-Stil (1080×1350px).</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Kandidaten mit Name, Sportart und optionalem Foto-Link eingeben. Abstimmungslink optional. Export als PNG.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeNachwuchswahlModal()" style="white-space:nowrap">
            🏆 Poster erstellen
          </button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Aufbau des Posters</h2></div>
      <div class="card-body">
        <ul style="padding-left:20px;line-height:2">
          <li>Blauer SLZB-Header mit Logo</li>
          <li>„JETZT ABSTIMMEN!" in weiß/blau</li>
          <li>Kandidaten-Fotos als Kreise mit blauem Rahmen</li>
          <li>Name und Sportart unter jedem Foto</li>
          <li>„Jetzt abstimmen!"-Button mit optionalem Link</li>
          <li>SLZB-Footer mit #SLZBerlin</li>
        </ul>
      </div>
    </div>
  </div>`;
}

function renderCountdownSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>⏳ Countdown-Poster</h1>
      <p>Countdown bis zu einem Event erstellen</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Erstelle ein Countdown-Poster für ein bevorstehendes Event – in <strong>Hochformat (4:5)</strong> oder <strong>Querformat (16:9)</strong>.</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Event-Name, Datum/Uhrzeit und Ort eingeben. Optionales Hintergrundbild per URL. Der Countdown wird automatisch berechnet.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeCountdownModal()" style="white-space:nowrap">
            ⏳ Countdown erstellen
          </button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Aufbau des Posters</h2></div>
      <div class="card-body">
        <ul style="padding-left:20px;line-height:2">
          <li>Blauer SLZB-Header mit Logo</li>
          <li>Große rote Countdown-Zahl (Tage / Stunden / Minuten)</li>
          <li>Event-Name zweizeilig weiß/rot</li>
          <li>Datum und Ort</li>
          <li>Optionales Hintergrundbild mit dunklem Overlay</li>
          <li>Am Event-Tag: „HEUTE!" statt Countdown</li>
        </ul>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// JUBILÄUMS-POSTER (Gold)
// ══════════════════════════════════════════════════════════════
function renderJubilaeumSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>🏅 Jubiläums-Poster</h1>
      <p>Festliche Poster für Jubiläen, Ehrungen und besondere Anlässe</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Goldener Akzent für Jubiläen, runde Geburtstage, Schuljubiläen und Festveranstaltungen.</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Titel, Untertitel, Datum und optionales Hintergrundbild. Export als PNG in Hoch- oder Querformat.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeJubilaeumModal()" style="white-space:nowrap;background:#C9A227;border-color:#C9A227">
            🏅 Poster erstellen
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function zeigeJubilaeumModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>🏅 Jubiläums-Poster erstellen</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      <div class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="color:#fff">Titel / Anlass <span class="required">*</span></label>
          <input type="text" id="jub-titel" placeholder="z.B. 25 Jahre SLZB Berlin" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Untertitel</label>
          <input type="text" id="jub-untertitel" placeholder="z.B. Festveranstaltung" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Datum</label>
          <input type="date" id="jub-datum" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Ort</label>
          <input type="text" id="jub-ort" placeholder="z.B. SLZB Berlin" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        ${posterBildInputHTML('jub-bild','Hintergrundbild')}
      </div>
      <div class="tabs mb-3" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="tab-btn active" onclick="jubFormatWechsel('hochformat')">📱 Hochformat (4:5)</button>
        <button class="tab-btn" onclick="jubFormatWechsel('querformat')">🖥️ Querformat (16:9)</button>
        <button class="tab-btn" onclick="jubFormatWechsel('a3')">🖨️ A3 Druck (quer)</button>
      </div>
      <div style="text-align:center;background:#0a0800;padding:16px;border-radius:8px">
        <canvas id="jub-canvas" width="1080" height="1350"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline" onclick="jubVorschau()">👁️ Vorschau</button>
      <button class=\"btn btn-outline\" onclick=\"jubEinreichen()\" style=\"border-color:#C9A227;color:#C9A227\">📤 Zur Redaktion einreichen</button>
      <button class="btn btn-primary" onclick="jubHerunterladen()" style="background:#C9A227;border-color:#C9A227">🖼️ PNG herunterladen</button>
    </div>`;
  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  window._jubFormat = 'hochformat';
  const morgen = new Date(); morgen.setHours(0,0,0,0);
  setTimeout(()=>{ const el=document.getElementById('jub-datum'); if(el) el.value=morgen.toISOString().slice(0,10); },50);
}

function jubFormatWechsel(format) {
  window._jubFormat = format;
  document.querySelectorAll('.modal .tab-btn').forEach(b=>{
    const t=b.textContent.toLowerCase();
    b.classList.toggle('active',(format==='hochformat'&&t.includes('hochformat'))||(format==='querformat'&&t.includes('querformat'))||(format==='a3'&&t.includes('a3')));
  });
  const canvas = document.getElementById('jub-canvas');
  if (canvas) {
    if (format==='querformat') { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='45vh'; }
    else if (format==='a3') { canvas.width=1587; canvas.height=1123; canvas.style.maxHeight='45vh'; }
    else { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='60vh'; }
  }
}

async function jubVorschau() {
  const titel = document.getElementById('jub-titel')?.value||'';
  const untertitel = document.getElementById('jub-untertitel')?.value||'';
  const datum = document.getElementById('jub-datum')?.value||'';
  const ort = document.getElementById('jub-ort')?.value||'';
  if (!titel) { toast('Titel ist Pflichtfeld','warning'); return; }
  const format = window._jubFormat||'hochformat';
  jubFormatWechsel(format);
  const canvas = document.getElementById('jub-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  const W=canvas.width, H=canvas.height;
  const bildUrl = await posterBildLaden('jub-bild','poster-jubilaeum');
  const bild = bildUrl ? await ladeBild(bildUrl) : null;
  const datumStr = datum ? new Date(datum).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : '';
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  const karteOpts = { subtitle: untertitel||'JUBILÄUM', vorname: vorname||null, nachname, titel: teile.length===1?titel:null, zusatz:ort, wettbewerb:datumStr };
  if (format==='a3') {
    await zeichnePosterA3Allgemein(ctx, W, H, bild, karteOpts, 'gold', datumStr);
  } else {
    zeichneSlzbHintergrund(ctx, W, H, bild, 'gold');
    zeichneSlzbDeko(ctx, W, H);
    zeichneSlzbHeader(ctx, W, H, untertitel||'Jubiläum', datumStr, 'gold');
    zeichneSlzbKarte(ctx, W, H, karteOpts, 'gold');
    zeichneSlzbFooterNeu(ctx, W, H, 'gold');
  }
}

function jubHerunterladen() {
  const canvas = document.getElementById('jub-canvas');
  if (!canvas) return;
  const titel = (document.getElementById('jub-titel')?.value||'jubilaeum').replace(/\s/g,'-');
  const a = document.createElement('a');
  a.download = `SLZB_Jubilaeum_${titel}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ══════════════════════════════════════════════════════════════
// SCHULNACHRICHTEN-POSTER (Grau/Stahlblau)
// ══════════════════════════════════════════════════════════════
function renderSchulnachrichtenSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>📰 Schulnachrichten-Poster</h1>
      <p>Informationsplakate für schulinterne Mitteilungen und Ankündigungen</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Neutraler Stahlblau-Grau-Akzent für allgemeine Schulnachrichten, Ankündigungen und Informationen.</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Überschrift, Nachrichtentext, Datum und optionales Bild. Ideal für Digital Signage und Aushänge.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeSchulnachrichtModal()" style="white-space:nowrap;background:#8A9BB0;border-color:#8A9BB0">
            📰 Poster erstellen
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function zeigeSchulnachrichtModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>📰 Schulnachrichten-Poster erstellen</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      <div class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="color:#fff">Überschrift <span class="required">*</span></label>
          <input type="text" id="sn-titel" placeholder="z.B. Wichtige Mitteilung" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Kategorie</label>
          <input type="text" id="sn-kategorie" placeholder="z.B. Schulleitung · Information" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Datum</label>
          <input type="date" id="sn-datum" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        ${posterBildInputHTML('sn-bild','Hintergrundbild')}
        <div class="form-group" style="grid-column:1/-1">
          <label style="color:#fff">Nachrichtentext (optional)</label>
          <textarea id="sn-text" rows="3" placeholder="Kurzer Informationstext..." style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;width:100%"></textarea>
        </div>
      </div>
      <div class="tabs mb-3" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="tab-btn active" onclick="snFormatWechsel('hochformat')">📱 Hochformat (4:5)</button>
        <button class="tab-btn" onclick="snFormatWechsel('querformat')">🖥️ Querformat (16:9)</button>
        <button class="tab-btn" onclick="snFormatWechsel('a3')">🖨️ A3 Druck (quer)</button>
      </div>
      <div style="text-align:center;background:#0a0c10;padding:16px;border-radius:8px">
        <canvas id="sn-canvas" width="1080" height="1350"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline" onclick="snVorschau()">👁️ Vorschau</button>
      <button class=\"btn btn-outline\" onclick=\"snEinreichen()\" style=\"border-color:#8A9BB0;color:#8A9BB0\">📤 Zur Redaktion einreichen</button>
      <button class="btn btn-primary" onclick="snHerunterladen()" style="background:#8A9BB0;border-color:#8A9BB0">🖼️ PNG herunterladen</button>
    </div>`;
  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  window._snFormat = 'hochformat';
  const heute = new Date();
  setTimeout(()=>{ const el=document.getElementById('sn-datum'); if(el) el.value=heute.toISOString().slice(0,10); },50);
}

function snFormatWechsel(format) {
  window._snFormat = format;
  document.querySelectorAll('.modal .tab-btn').forEach(b=>{
    const t=b.textContent.toLowerCase();
    b.classList.toggle('active',(format==='hochformat'&&t.includes('hochformat'))||(format==='querformat'&&t.includes('querformat'))||(format==='a3'&&t.includes('a3')));
  });
  const canvas = document.getElementById('sn-canvas');
  if (canvas) {
    if (format==='querformat') { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='45vh'; }
    else if (format==='a3') { canvas.width=1587; canvas.height=1123; canvas.style.maxHeight='45vh'; }
    else { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='60vh'; }
  }
}

async function snVorschau() {
  const titel = document.getElementById('sn-titel')?.value||'';
  const kategorie = document.getElementById('sn-kategorie')?.value||'';
  const datum = document.getElementById('sn-datum')?.value||'';
  const text = document.getElementById('sn-text')?.value||'';
  if (!titel) { toast('Überschrift ist Pflichtfeld','warning'); return; }
  const format = window._snFormat||'hochformat';
  snFormatWechsel(format);
  const canvas = document.getElementById('sn-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  const W=canvas.width, H=canvas.height;
  const bildUrl = await posterBildLaden('sn-bild','poster-schulnachricht');
  const bild = bildUrl ? await ladeBild(bildUrl) : null;
  const datumStr = datum ? new Date(datum).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : '';
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  const karteOpts = { subtitle:kategorie||'INFORMATION', vorname:vorname||null, nachname, titel:teile.length===1?titel:null, zusatz:text?text.slice(0,80)+(text.length>80?'…':''):datumStr, wettbewerb:datumStr };
  if (format==='a3') {
    await zeichnePosterA3Allgemein(ctx, W, H, bild, karteOpts, 'grau', datumStr);
  } else {
    zeichneSlzbHintergrund(ctx, W, H, bild, 'grau');
    zeichneSlzbDeko(ctx, W, H);
    zeichneSlzbHeader(ctx, W, H, kategorie||'Schulnachricht', datumStr, 'grau');
    zeichneSlzbKarte(ctx, W, H, karteOpts, 'grau');
    zeichneSlzbFooterNeu(ctx, W, H, 'grau');
  }
}

function snHerunterladen() {
  const canvas = document.getElementById('sn-canvas');
  if (!canvas) return;
  const titel = (document.getElementById('sn-titel')?.value||'schulnachricht').replace(/\s/g,'-');
  const a = document.createElement('a');
  a.download = `SLZB_Nachricht_${titel}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ══════════════════════════════════════════════════════════════
// KALENDER-ANSICHT
// ══════════════════════════════════════════════════════════════
async function renderKalender() {
  const jetzt = new Date();
  const aktMonat = jetzt.getMonth();
  const aktJahr = jetzt.getFullYear();

  // Termine aus SLZB_TERMINE (termine.js)
  const alleTermine = (typeof SLZB_TERMINE !== 'undefined') ? SLZB_TERMINE : [];

  // Filter-State
  const state = window._kalenderState || {
    monat: aktMonat, jahr: aktJahr,
    sportart: '', prio: '', ansicht: 'monat'
  };
  window._kalenderState = state;

  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const sportarten = [...new Set(alleTermine.map(t=>t.sportart).filter(Boolean))].sort();

  // Gefilterte Termine
  const gefiltertAlle = alleTermine.filter(t => {
    if (state.sportart && t.sportart !== state.sportart) return false;
    if (state.prio && String(t.prioritaet) !== state.prio) return false;
    if (state.teilnahme && t.teilnahme !== state.teilnahme) return false;
    if (state.suche) {
      const s = state.suche.toLowerCase();
      const felder = [t.veranstaltung, t.ort, t.klasse, t.sportart, t.datumAnzeige].filter(Boolean).join(' ').toLowerCase();
      if (!felder.includes(s)) return false;
    }
    // Persönliche Ansicht: nur eigene Sportart (für Trainer)
    if (state.nurEigeneSportart && Auth.rolle()==='trainer') {
      const trainerSport = Auth.name(); // Anzeigename = Sportart bei Trainern
      if (!t.sportart.toLowerCase().includes(trainerSport.toLowerCase()) &&
          !trainerSport.toLowerCase().includes(t.sportart.toLowerCase())) return false;
    }
    return true;
  });

  // Termine des aktuellen Monats
  const monatsTermine = gefiltertAlle.filter(t => {
    const d = new Date(t.datum);
    return d.getMonth() === state.monat && d.getFullYear() === state.jahr;
  });

  // Nächste 30 Tage (für Listenansicht)
  const heute = new Date(); heute.setHours(0,0,0,0);
  const in30 = new Date(heute); in30.setDate(in30.getDate()+30);
  const naechste = gefiltertAlle.filter(t => {
    const d = new Date(t.datum);
    return d >= heute && d <= in30;
  }).slice(0,20);

  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#666';
  const prioLabel = (p) => p===1?'🏆 Meisterschaft':p===2?'⚡ Wettkampf':p===3?'📋 Lehrgang':'📅 Regulär';

  return `<div class="page">
    <div class="page-header">
      <h1>📅 Veranstaltungskalender 2026/27</h1>
      <p>${alleTermine.length} Termine · ${sportarten.length} Sportarten</p>
    </div>

    <!-- Filter -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="form-row cols-4">
          <div class="form-group">
            <label>Suche</label>
            <input type="text" placeholder="Veranstaltung, Ort, Klasse..." value="${esc(state.suche||'')}"
              oninput="kalenderFilter('suche',this.value)" style="width:100%">
          </div>
          <div class="form-group">
            <label>Sportart</label>
            <select onchange="kalenderFilter('sportart',this.value)">
              <option value="">Alle Sportarten</option>
              ${sportarten.map(s=>`<option value="${esc(s)}" ${state.sportart===s?'selected':''}>${esc(s)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Priorität</label>
            <select onchange="kalenderFilter('prio',this.value)">
              <option value="">Alle</option>
              <option value="1" ${state.prio==='1'?'selected':''}>🏆 Meisterschaft/Olympia</option>
              <option value="2" ${state.prio==='2'?'selected':''}>⚡ Wettkampf/Qualifikation</option>
              <option value="3" ${state.prio==='3'?'selected':''}>📋 Lehrgang/Sichtung</option>
              <option value="4" ${state.prio==='4'?'selected':''}>📅 Regulär</option>
            </select>
          </div>
          <div class="form-group">
            <label>Teilnahme</label>
            <select onchange="kalenderFilter('teilnahme',this.value)">
              <option value="">Alle</option>
              <option value="Ja" ${state.teilnahme==='Ja'?'selected':''}>✅ Bestätigt</option>
              <option value="Vorläufig" ${state.teilnahme==='Vorläufig'?'selected':''}>⏳ Vorläufig</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
          <div class="form-group" style="margin:0">
            <label>Ansicht</label>
            <select onchange="kalenderFilter('ansicht',this.value)" style="margin-left:8px">
              <option value="monat" ${state.ansicht==='monat'?'selected':''}>📆 Monatsansicht</option>
              <option value="grid" ${state.ansicht==='grid'?'selected':''}>🗓️ Kalender-Grid</option>
              <option value="liste" ${state.ansicht==='liste'?'selected':''}>📋 Listenansicht</option>
              <option value="naechste" ${state.ansicht==='naechste'?'selected':''}>⏭️ Nächste 30 Tage</option>
            </select>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="kalenderFilter('sportart','');kalenderFilter('prio','');kalenderFilter('suche','');kalenderFilter('teilnahme','')">↺ Reset</button>
          <span class="text-xs text-muted">${gefiltertAlle.length} Treffer</span>
          <div style="flex:1"></div>
          <button class="btn btn-outline btn-sm" onclick="exportiereKalenderIcal()">📅 iCal exportieren</button>
        </div>
      </div>
    </div>

    ${state.ansicht === 'grid' ? renderKalenderGrid(state, gefiltertAlle, monatNamen) : state.ansicht === 'naechste' ? `
    <!-- Nächste 30 Tage -->
    <div class="card">
      <div class="card-header"><h2>⏭️ Nächste 30 Tage (${naechste.length} Termine)</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Datum</th><th>Sportart</th><th>Veranstaltung</th><th>Ort</th><th>Klasse</th><th>Priorität</th><th></th></tr></thead>
        <tbody>${naechste.length===0?'<tr><td colspan="6" class="text-center text-muted" style="padding:30px">Keine Termine in den nächsten 30 Tagen.</td></tr>':
          naechste.map(t=>{
            const _istHeuteN = t.datum === new Date().toISOString().slice(0,10);
            return `<tr style="${_istHeuteN?'background:rgba(226,0,26,0.12);':''}">
            <td class="text-sm"><strong>${esc(t.datumAnzeige)}</strong>${_istHeuteN?'<span class="badge badge-danger ml-1" style="font-size:.65rem">HEUTE</span>':''}</td>
            <td class="text-sm">${esc(t.sportart)}</td>
            <td><strong>${esc(t.veranstaltung)}</strong></td>
            <td class="text-sm text-muted">${esc(t.ort||'–')}</td>
            <td class="text-sm text-muted">${esc(t.klasse||'–')}</td>
            <td><span style="color:${prioFarbe(t.prioritaet)};font-size:.75rem;font-weight:700">${prioLabel(t.prioritaet)}</span></td>
            <td><button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 8px" onclick="kalenderCountdown(${JSON.stringify(t).replace(/"/g,'&quot;')})">⏳</button></td>
          </tr>`;}).join('')}
        </tbody>
      </table></div>
    </div>` : state.ansicht === 'liste' ? `
    <!-- Listenansicht: alle gefilterten Termine -->
    <div class="card">
      <div class="card-header"><h2>📋 Alle Termine (${gefiltertAlle.length})</h2></div>
      <div class="table-wrap" style="max-height:600px;overflow-y:auto"><table>
        <thead><tr><th>Datum</th><th>Sportart</th><th>Veranstaltung</th><th>Ort</th><th>Klasse</th><th>Priorität</th><th></th></tr></thead>
        <tbody>${gefiltertAlle.map(t=>`<tr>
          <td class="text-sm">${esc(t.datumAnzeige)}</td>
          <td class="text-sm">${esc(t.sportart)}</td>
          <td>${esc(t.veranstaltung)}</td>
          <td class="text-sm text-muted">${esc(t.ort||'–')}</td>
          <td class="text-sm text-muted">${esc(t.klasse||'–')}</td>
          <td><span style="color:${prioFarbe(t.prioritaet)};font-size:.75rem;font-weight:700">${prioLabel(t.prioritaet)}</span></td>
          <td><button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 8px" onclick="kalenderCountdown(${JSON.stringify(t).replace(/"/g,'&quot;')})">⏳</button></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>` : `
    <!-- Monatsansicht -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;gap:4px;align-items:center">
          <button class="btn btn-ghost btn-sm" onclick="kalenderMonatSchnell(-12)" title="Vorheriges Jahr">«</button>
          <button class="btn btn-ghost btn-sm" onclick="kalenderMonatNav(-1)">← Vorheriger</button>
        </div>
        <div style="text-align:center">
          <h2 style="margin:0">📆 ${monatNamen[state.monat]} ${state.jahr}</h2>
          <span class="text-xs text-muted">${monatsTermine.length} Termine</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="btn btn-ghost btn-sm" onclick="kalenderMonatNav(1)">Nächster →</button>
          <button class="btn btn-ghost btn-sm" onclick="kalenderMonatSchnell(12)" title="Nächstes Jahr">»</button>
          <button class="btn btn-outline btn-sm" onclick="window._kalenderState={monat:new Date().getMonth(),jahr:new Date().getFullYear()};navigateTo('kalender')">Heute</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Datum</th><th>Sportart</th><th>Veranstaltung</th><th>Ort</th><th>Klasse</th><th>Priorität</th><th></th></tr></thead>
        <tbody>${monatsTermine.length===0?`<tr><td colspan="6" class="text-center text-muted" style="padding:30px">Keine Termine im ${monatNamen[state.monat]} ${state.jahr}.</td></tr>`:
          monatsTermine.map(t=>{
            const _istHeute = t.datum === new Date().toISOString().slice(0,10);
            return `<tr style="border-left:3px solid ${prioFarbe(t.prioritaet)};${_istHeute?'background:rgba(226,0,26,0.12);':''}">
            <td class="text-sm"><strong>${esc(t.datumAnzeige)}</strong>${_istHeute?'<span class="badge badge-danger ml-1" style="font-size:.65rem">HEUTE</span>':''}</td>
            <td class="text-sm">${esc(t.sportart)}</td>
            <td><strong>${esc(t.veranstaltung)}</strong></td>
            <td class="text-sm text-muted">${esc(t.ort||'–')}</td>
            <td class="text-sm text-muted">${esc(t.klasse||'–')}</td>
            <td><span style="color:${prioFarbe(t.prioritaet)};font-size:.75rem;font-weight:700">${prioLabel(t.prioritaet)}</span></td>
            <td><button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 8px" onclick="kalenderCountdown(${JSON.stringify(t).replace(/"/g,'&quot;')})">⏳</button></td>
          </tr>`;}).join('')}
        </tbody>
      </table></div>
    </div>`}

    <!-- Legende -->
    <div class="card mt-3">
      <div class="card-body" style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
        <span style="font-size:.8rem;color:#888">Priorität:</span>
        ${[1,2,3,4].map(p=>`<span style="color:${prioFarbe(p)};font-size:.8rem;font-weight:700">${prioLabel(p)}</span>`).join('')}
      </div>
    </div>
  </div>`;
}

function kalenderFilter(key, value) {
  if (!window._kalenderState) window._kalenderState = {};
  window._kalenderState[key] = value;
  navigateTo('kalender');
}

function kalenderMonatSchnell(delta) {
  // Schnellnavigation: +1/-1 Monat, +12/-12 Jahr
  if (!window._kalenderState) window._kalenderState = {};
  let m = (window._kalenderState.monat||new Date().getMonth()) + delta;
  let j = window._kalenderState.jahr || new Date().getFullYear();
  while (m > 11) { m -= 12; j++; }
  while (m < 0)  { m += 12; j--; }
  window._kalenderState.monat = m;
  window._kalenderState.jahr = j;
  navigateTo('kalender');
}

function kalenderMonatNav(delta) {
  if (!window._kalenderState) window._kalenderState = {};
  let m = (window._kalenderState.monat||0) + delta;
  let j = window._kalenderState.jahr || new Date().getFullYear();
  if (m > 11) { m=0; j++; }
  if (m < 0) { m=11; j--; }
  window._kalenderState.monat = m;
  window._kalenderState.jahr = j;
  navigateTo('kalender');
}


// ══════════════════════════════════════════════════════════════
// KALENDER → COUNTDOWN: Direkt aus Kalendereintrag erstellen
// ══════════════════════════════════════════════════════════════
function kalenderCountdown(termin) {
  // Countdown-Modal öffnen
  zeigeCountdownModal();

  // Felder mit Kalender-Daten vorausfüllen
  setTimeout(() => {
    const nameEl = document.getElementById('cd-name');
    const datumEl = document.getElementById('cd-datum');
    const ortEl = document.getElementById('cd-ort');

    if (nameEl) nameEl.value = termin.veranstaltung || '';
    if (ortEl) ortEl.value = termin.ort || '';
    const sportartEl = document.getElementById('cd-sportart');
    if (sportartEl) sportartEl.value = termin.sportart || '';

    // Datum: aus "07.11.2026" oder "3.-11.11.2026" → datetime-local Format
    if (datumEl && termin.datum) {
      // termin.datum ist bereits ISO: "2026-11-07"
      datumEl.value = termin.datum + 'T10:00'; // Standard: 10:00 Uhr
    }

    // Vorschau automatisch generieren
    cdVorschau();
  }, 200);
}

// ══════════════════════════════════════════════════════════════
// DUBLETTEN-ZUSAMMENFÜHRUNG (Option A)
// Hauptmeldung behalten, Duplikat archivieren
// ══════════════════════════════════════════════════════════════
async function zeigeDublettenModal(erfolgId) {
  toast('Lade Dubletten-Vergleich...', 'info');
  try {
    const e = await DB.getErfolgById(erfolgId);
    if (!e) { toast('Meldung nicht gefunden', 'danger'); return; }

    // Alle anderen Meldungen mit Dublettenverdacht laden
    const alle = await ladeErfolge();
    const kandidaten = alle.filter(k =>
      k.id !== erfolgId &&
      (k.status === 'Dublettenverdacht' || k.dublettenhinweis) &&
      k.sportartText === e.sportartText
    );

    // Auch ähnliche Meldungen (gleiche Sportart + ähnliches Datum)
    const aehnliche = alle.filter(k => {
      if (k.id === erfolgId) return false;
      if (kandidaten.find(c => c.id === k.id)) return false;
      if (k.sportartText !== e.sportartText) return false;
      if (!k.datum || !e.datum) return false;
      const diff = Math.abs(new Date(k.datum) - new Date(e.datum));
      return diff < 7 * 24 * 60 * 60 * 1000; // ±7 Tage
    });

    const vergleichsKandidaten = [...kandidaten, ...aehnliche].slice(0, 10);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';

    const renderKarte = (m, istHaupt) => `
      <div class="card mb-2" style="border:2px solid ${istHaupt?'#E2001A':'#444'};position:relative">
        ${istHaupt?'<div style="position:absolute;top:-10px;left:12px;background:#E2001A;color:#fff;font-size:.7rem;font-weight:700;padding:2px 10px;border-radius:10px">DIESE MELDUNG</div>':''}
        <div class="card-body" style="padding:12px">
          <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div class="text-xs text-muted">${esc(m.erfolgNr||'–')}</div>
              <strong>${esc(m.titel)}</strong>
              <div class="text-sm text-muted mt-1">${esc(m.sportartText||'–')} · ${m.datum?new Date(m.datum).toLocaleDateString('de-DE'):''} · ${esc(m.ort||'–')}</div>
              <div class="text-sm mt-1">${esc(m.wettbewerbText||'–')} · Platz: ${m.platzierung||'–'}</div>
              <div class="mt-1">${statusBadge(m.status)}</div>
              <div class="text-xs text-muted mt-1">Melder: ${esc(m.melderName||'–')} · ${m.eingangsdatum?new Date(m.eingangsdatum).toLocaleDateString('de-DE'):''}</div>
            </div>
            ${!istHaupt?`<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <button class="btn btn-primary btn-sm" onclick="dubletteZusammenfuehren('${erfolgId}','${m.id}','haupt')">
                ⭐ Diese als Hauptmeldung
              </button>
              <button class="btn btn-outline btn-sm" onclick="dubletteZusammenfuehren('${m.id}','${erfolgId}','haupt')">
                🗄️ Aktuelle als Duplikat
              </button>
            </div>`:''}
          </div>
        </div>
      </div>`;

    modal.innerHTML = `
      <div class="modal-header">
        <h3>🔄 Dubletten-Verwaltung</h3>
        <button class="btn btn-ghost btn-sm close-x">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-info mb-3">
          <span class="alert-icon">ℹ️</span>
          <span><strong>Option A:</strong> Hauptmeldung behalten, Duplikat wird als „Archiviert" markiert und mit Hinweis versehen. Keine Daten werden gelöscht.</span>
        </div>

        <h3 style="margin-bottom:8px">Aktuelle Meldung</h3>
        ${renderKarte(e, true)}

        <h3 style="margin:16px 0 8px">Mögliche Dubletten (${vergleichsKandidaten.length})</h3>
        ${vergleichsKandidaten.length === 0
          ? '<div class="alert alert-success"><span class="alert-icon">✅</span><span>Keine ähnlichen Meldungen gefunden.</span></div>'
          : vergleichsKandidaten.map(k => renderKarte(k, false)).join('')}

        <div class="alert alert-warning mt-3">
          <span class="alert-icon">⚠️</span>
          <span>Die als Duplikat markierte Meldung wird <strong>nicht gelöscht</strong>, sondern auf Status „Archiviert" gesetzt und mit einem Duplikat-Hinweis versehen. Sie bleibt im System nachvollziehbar.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
      </div>`;

    modal.querySelector('.close-x').onclick = ()=>overlay.remove();
    modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
    overlay.appendChild(modal);
    overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);

  } catch(err) {
    toast('Fehler: '+err.message, 'danger');
    console.error(err);
  }
}

async function dubletteZusammenfuehren(hauptId, duplikatId, modus) {
  const msg = `Meldung als Duplikat archivieren?\n\nHauptmeldung: wird behalten (Status unverändert)\nDuplikat: wird auf "Archiviert" gesetzt + Duplikat-Hinweis`;
  if (!confirm(msg)) return;

  try {
    // 1. Duplikat auf "Archiviert" setzen + duplicate_flag + Hinweis
    const haupt = await DB.getErfolgById(hauptId);
    const hinweis = `Duplikat von ${haupt?.erfolgNr||hauptId} (${haupt?.titel||''}). Zusammengeführt am ${new Date().toLocaleDateString('de-DE')} durch ${Auth.name()}.`;

    const { error: updateErr } = await Backend.client
      .from('achievements')
      .update({
        status: 'Archiviert',
        duplicate_flag: true,
        duplicate_note: hinweis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', duplikatId);

    if (updateErr) throw new Error(updateErr.message);

    // 2. Statuswechsel protokollieren
    await DB.protokolliere(duplikatId, 'Dublettenverdacht', 'Archiviert',
      `Als Duplikat von ${haupt?.erfolgNr||hauptId} archiviert.`);

    // 3. Hauptmeldung: duplicate_flag entfernen, Status auf Redaktion
    const { error: hauptErr } = await Backend.client
      .from('achievements')
      .update({
        duplicate_flag: false,
        duplicate_note: '',
        status: haupt?.status === 'Dublettenverdacht' ? 'Redaktion' : haupt?.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hauptId);

    if (hauptErr) throw new Error(hauptErr.message);

    // Cache leeren
    APP._erfolgeCache = null;

    toast('✅ Zusammenführung abgeschlossen. Duplikat archiviert.', 'success');
    document.querySelector('.modal-overlay')?.remove();
    navigateTo('redaktion');

  } catch(err) {
    toast('Fehler: '+err.message, 'danger');
    console.error(err);
  }
}

// ══════════════════════════════════════════════════════════════
// VIDEO-INTEGRATION (YouTube / Vimeo)
// ══════════════════════════════════════════════════════════════

// URL validieren und Embed-ID extrahieren
function parseVideoUrl(url) {
  if (!url) return null;
  url = url.trim();

  // YouTube: verschiedene Formate
  // https://www.youtube.com/watch?v=ID
  // https://youtu.be/ID
  // https://www.youtube.com/embed/ID
  // https://youtube.com/shorts/ID
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) return { platform: 'youtube', id: m[1], embedUrl: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` };

  // Vimeo: https://vimeo.com/ID oder https://player.vimeo.com/video/ID
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { platform: 'vimeo', id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}?dnt=1` };

  return null; // Unbekanntes Format
}

// Video-Player HTML rendern
function renderVideoPlayer(url) {
  const info = parseVideoUrl(url);
  if (!info) return `<div class="alert alert-danger"><span class="alert-icon">❌</span><span>Ungültige Video-URL: ${esc(url)}</span></div>`;

  const plattformLabel = info.platform === 'youtube' ? '▶️ YouTube' : '🎬 Vimeo';
  const datenschutzHinweis = info.platform === 'youtube'
    ? 'YouTube (datenschutzfreundlicher Modus: youtube-nocookie.com)'
    : 'Vimeo (DNT=1 aktiviert)';

  return `
    <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#000">
      <iframe
        src="${esc(info.embedUrl)}"
        style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
        title="SLZB Video">
      </iframe>
    </div>
    <p class="text-xs text-muted mt-2">${plattformLabel} · ${datenschutzHinweis}</p>`;
}

// Video-URL Modal
function zeigeVideoModal(erfolgId, aktuelleUrl='') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '520px';

  const info = aktuelleUrl ? parseVideoUrl(aktuelleUrl) : null;

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🎬 Video verknüpfen</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info mb-3">
        <span class="alert-icon">ℹ️</span>
        <span>Unterstützt: <strong>YouTube</strong> und <strong>Vimeo</strong>. Das Video wird eingebettet, aber nicht auf SLZB-Servern gespeichert.</span>
      </div>
      <div class="form-group">
        <label>Video-URL <span class="required">*</span></label>
        <input type="url" id="video-url-input"
          value="${esc(aktuelleUrl)}"
          placeholder="https://www.youtube.com/watch?v=... oder https://vimeo.com/..."
          style="width:100%"
          oninput="videoUrlVorschau()">
        <div id="video-url-status" class="text-xs mt-1" style="min-height:20px"></div>
      </div>
      <div id="video-vorschau" style="margin-top:12px">
        ${info ? renderVideoPlayer(aktuelleUrl) : ''}
      </div>
      <div class="alert alert-warning mt-3">
        <span class="alert-icon">⚠️</span>
        <span><strong>Datenschutz:</strong> Nur Videos mit Einwilligung aller abgebildeten Personen verknüpfen. Bei YouTube: „Nicht gelistet" empfohlen.</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Abbrechen</button>
      <button class="btn btn-primary" id="video-speichern-btn" onclick="speichereVideoUrl('${erfolgId}')">
        🎬 Video speichern
      </button>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  // Vorschau sofort aktualisieren wenn URL vorhanden
  if (aktuelleUrl) setTimeout(videoUrlVorschau, 100);
}

function videoUrlVorschau() {
  const input = document.getElementById('video-url-input');
  const status = document.getElementById('video-url-status');
  const vorschau = document.getElementById('video-vorschau');
  const btn = document.getElementById('video-speichern-btn');
  if (!input || !status || !vorschau) return;

  const url = input.value.trim();
  if (!url) {
    status.innerHTML = '';
    vorschau.innerHTML = '';
    if (btn) btn.disabled = false;
    return;
  }

  const info = parseVideoUrl(url);
  if (info) {
    status.innerHTML = `<span style="color:#00a040">✅ ${info.platform === 'youtube' ? 'YouTube' : 'Vimeo'}-Video erkannt (ID: ${info.id})</span>`;
    vorschau.innerHTML = renderVideoPlayer(url);
    if (btn) btn.disabled = false;
  } else {
    status.innerHTML = `<span style="color:#E2001A">❌ Ungültige URL. Bitte YouTube- oder Vimeo-Link eingeben.</span>`;
    vorschau.innerHTML = '';
    if (btn) btn.disabled = true;
  }
}

async function speichereVideoUrl(erfolgId) {
  const input = document.getElementById('video-url-input');
  const url = input?.value?.trim() || '';

  if (url && !parseVideoUrl(url)) {
    toast('Ungültige Video-URL. Bitte YouTube- oder Vimeo-Link eingeben.', 'warning');
    return;
  }

  const btn = document.getElementById('video-speichern-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Wird gespeichert...'; }

  try {
    const { error } = await Backend.client
      .from('achievements')
      .update({ video_url: url || null, updated_at: new Date().toISOString() })
      .eq('id', erfolgId);

    if (error) throw new Error(error.message);

    // Protokoll
    await DB.protokolliere(erfolgId, null, null, url ? `Video verknüpft: ${url}` : 'Video entfernt');

    APP._erfolgeCache = null;
    document.querySelector('.modal-overlay')?.remove();
    toast(url ? '🎬 Video erfolgreich verknüpft!' : 'Video entfernt', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: erfolgId });

  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
    if (btn) { btn.disabled = false; btn.textContent = '🎬 Video speichern'; }
  }
}

async function loescheVideoUrl(erfolgId) {
  if (!confirm('Video-Verknüpfung entfernen?')) return;
  try {
    const { error } = await Backend.client
      .from('achievements')
      .update({ video_url: null, updated_at: new Date().toISOString() })
      .eq('id', erfolgId);
    if (error) throw new Error(error.message);
    await DB.protokolliere(erfolgId, null, null, 'Video-Verknüpfung entfernt');
    APP._erfolgeCache = null;
    toast('Video entfernt', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: erfolgId });
  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
  }
}

// ══════════════════════════════════════════════════════════════
// WOCHENVORSCHAU – Poster + Modal
// ══════════════════════════════════════════════════════════════
async function zeigeWochenvorschau() {
  const alleTermine = (typeof SLZB_TERMINE !== 'undefined') ? SLZB_TERMINE : [];
  const jetzt = new Date(); jetzt.setHours(0,0,0,0);

  // Aktuelle Woche: Montag bis Sonntag
  const tag = jetzt.getDay(); // 0=So, 1=Mo...
  const diffMo = tag === 0 ? -6 : 1 - tag;
  const montag = new Date(jetzt); montag.setDate(jetzt.getDate() + diffMo);
  const sonntag = new Date(montag); sonntag.setDate(montag.getDate() + 6);

  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const tagNamen = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  const wocheTermine = alleTermine.filter(t => {
    const d = new Date(t.datum);
    return d >= montag && d <= sonntag;
  }).sort((a,b) => a.datum.localeCompare(b.datum));

  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#666';
  const prioLabel = (p) => p===1?'🏆 Meisterschaft':p===2?'⚡ Wettkampf':p===3?'📋 Lehrgang':'📅 Regulär';

  const wocheLabel = `${montag.getDate()}. ${monatNamen[montag.getMonth()]} – ${sonntag.getDate()}. ${monatNamen[sonntag.getMonth()]} ${sonntag.getFullYear()}`;

  // Gruppiere nach Tag
  const nachTag = {};
  wocheTermine.forEach(t => {
    const d = new Date(t.datum);
    const key = t.datum;
    if (!nachTag[key]) nachTag[key] = { datum: d, termine: [] };
    nachTag[key].termine.push(t);
  });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>📅 Wochenvorschau – ${esc(wocheLabel)}</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body">
      ${wocheTermine.length === 0
        ? `<div class="alert alert-success"><span class="alert-icon">✅</span>
            <span>Diese Woche stehen keine Veranstaltungen an.</span></div>`
        : `<div class="alert alert-info mb-3">
            <span class="alert-icon">📅</span>
            <span><strong>${wocheTermine.length} Veranstaltung(en)</strong> diese Woche</span>
          </div>
          ${Object.entries(nachTag).map(([key, {datum, termine}]) => `
            <div class="card mb-3">
              <div class="card-header" style="background:rgba(0,51,102,0.08)">
                <h3 style="margin:0;font-size:1rem">
                  <span style="color:#003366;font-weight:800">${tagNamen[datum.getDay()]}, ${datum.getDate()}. ${monatNamen[datum.getMonth()]}</span>
                  <span class="badge badge-info ml-2">${termine.length}</span>
                </h3>
              </div>
              <div class="table-wrap"><table>
                <thead><tr>
                  <th>Sportart</th><th>Veranstaltung</th><th>Ort</th><th>Klasse</th><th>Priorität</th><th></th>
                </tr></thead>
                <tbody>${termine.map(t => `<tr>
                  <td class="text-sm">${esc(t.sportart)}</td>
                  <td><strong>${esc(t.veranstaltung)}</strong></td>
                  <td class="text-sm text-muted">${esc(t.ort||'–')}</td>
                  <td class="text-sm text-muted">${esc(t.klasse||'–')}</td>
                  <td><span style="color:${prioFarbe(t.prioritaet)};font-size:.75rem;font-weight:700">${prioLabel(t.prioritaet)}</span></td>
                  <td><button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 8px"
                    onclick="kalenderCountdown(${JSON.stringify(t).replace(/"/g,'&quot;')})">⏳</button></td>
                </tr>`).join('')}
                </tbody>
              </table></div>
            </div>`).join('')}`}
    </div>
    <div class="modal-footer" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline" onclick="wochenvorschauPoster()">🖼️ Poster (1:1)</button>
      <button class="btn btn-outline" onclick="wochenvorschauStories()">📱 Instagram Stories</button>
      <button class="btn btn-primary" onclick="navigateTo('kalender');document.querySelector('.modal-overlay')?.remove()">📅 Zum Kalender</button>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  // Wochentermine für Poster merken
  window._wocheTermine = wocheTermine;
  window._wocheLabel = wocheLabel;
}

// Wochenvorschau als Poster exportieren (1080×1350)
async function wochenvorschauPoster() {
  const termine = window._wocheTermine || [];
  const wocheLabel = window._wocheLabel || '';
  if (!termine.length) { toast('Keine Termine diese Woche','warning'); return; }

  // Canvas erstellen
  const canvas = document.createElement('canvas');
  canvas.width=1080; canvas.height=1350;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const W=1080, H=1350;
  const monatNamen = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const tagNamen = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  // Hintergrund
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0a0c1a'); grad.addColorStop(1,'#1B1C1F');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  // Deko
  zeichneSlzbDeko(ctx, W, H);

  // Header
  drawLogo(ctx, 40, 24, 55);
  ctx.fillStyle='#E2001A'; ctx.fillRect(120, 32, 2, 44);
  ctx.fillStyle='#fff'; ctx.font='bold 16px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('WOCHENVORSCHAU', 130, 30);
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='12px Montserrat, Arial, sans-serif';
  ctx.fillText(wocheLabel.toUpperCase(), 130, 52);

  // Titel
  ctx.fillStyle='#E2001A'; ctx.font='bold italic 48px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('DIESE WOCHE', W/2, 110);
  ctx.fillStyle='#fff'; ctx.font='bold italic 36px Montserrat, Arial, sans-serif';
  ctx.fillText('BEI UNS', W/2, 166);
  ctx.fillStyle='#E2001A'; ctx.fillRect((W-120)/2, 212, 120, 3);

  // Termine-Liste
  let y = 240;
  const ROW_H = 72;
  const PAD = 40;
  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#555';

  // Gruppiere nach Tag
  const nachTag = {};
  termine.forEach(t => {
    if (!nachTag[t.datum]) nachTag[t.datum] = [];
    nachTag[t.datum].push(t);
  });

  Object.entries(nachTag).forEach(([datum, tage]) => {
    const d = new Date(datum);
    const tagLabel = `${tagNamen[d.getDay()]}, ${d.getDate()}. ${monatNamen[d.getMonth()]}`;

    // Tag-Header
    if (y + 30 > H - 100) return;
    ctx.fillStyle='rgba(226,0,26,0.15)';
    ctx.fillRect(PAD, y, W-2*PAD, 28);
    ctx.fillStyle='#E2001A'; ctx.font='bold 13px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.letterSpacing='2px';
    ctx.fillText(tagLabel.toUpperCase(), PAD+10, y+14);
    ctx.letterSpacing='0px';
    y += 32;

    tage.forEach(t => {
      if (y + ROW_H > H - 100) return;
      // Zeilen-Hintergrund
      ctx.fillStyle='rgba(255,255,255,0.04)';
      ctx.fillRect(PAD, y, W-2*PAD, ROW_H-4);
      // Prioritäts-Akzent
      ctx.fillStyle=prioFarbe(t.prioritaet);
      ctx.fillRect(PAD, y, 3, ROW_H-4);
      // Sportart
      ctx.fillStyle=prioFarbe(t.prioritaet); ctx.font='bold 12px Montserrat, Arial, sans-serif';
      ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText(t.sportart.toUpperCase(), PAD+14, y+10);
      // Veranstaltung
      ctx.fillStyle='#fff'; ctx.font='bold 16px Montserrat, Arial, sans-serif';
      ctx.fillText(t.veranstaltung, PAD+14, y+28, W-2*PAD-80);
      // Ort + Klasse
      const info = [t.ort, t.klasse].filter(Boolean).join(' · ');
      if (info) {
        ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='12px Montserrat, Arial, sans-serif';
        ctx.fillText(info, PAD+14, y+50, W-2*PAD-80);
      }
      y += ROW_H;
    });
    y += 8;
  });

  // Footer
  zeichneSlzbFooterNeu(ctx, W, H);

  // Download
  const a = document.createElement('a');
  a.download = `SLZB_Wochenvorschau_${wocheLabel.replace(/[^a-zA-Z0-9]/g,'-')}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('Wochenvorschau-Poster heruntergeladen!', 'success');
}

// ══════════════════════════════════════════════════════════════
// WOCHENVORSCHAU – INSTAGRAM STORY EXPORT (1080×1920)
// Eine Story pro Wochentag mit Terminen
// ══════════════════════════════════════════════════════════════
async function wochenvorschauStories() {
  const termine = window._wocheTermine || [];
  const wocheLabel = window._wocheLabel || '';
  if (!termine.length) { toast('Keine Termine diese Woche', 'warning'); return; }

  await ladeMontserrat(); await ladeLogo();

  const monatNamen = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const tagNamen = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const tagKurz = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  // Gruppiere nach Tag
  const nachTag = {};
  termine.forEach(t => {
    if (!nachTag[t.datum]) nachTag[t.datum] = [];
    nachTag[t.datum].push(t);
  });

  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#888';
  const prioIcon = (p) => p===1?'🏆':p===2?'⚡':p===3?'📋':'📅';

  let storyNr = 0;
  const gesamt = Object.keys(nachTag).length + 1; // +1 für Titelkarte

  // ── Story 0: Titelkarte ──────────────────────────────────────
  await exportStoryKarte(async (ctx, W, H) => {
    // Hintergrund
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#0a0c1a'); grad.addColorStop(1,'#1B1C1F');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    zeichneSlzbDeko(ctx, W, H);

    // Deko-Kreis
    ctx.save(); ctx.globalAlpha=0.08; ctx.fillStyle='#E2001A';
    ctx.beginPath(); ctx.arc(W/2, H*0.38, 320, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Header
    drawLogo(ctx, 40, 40, 60);

    // Titel
    ctx.fillStyle='#E2001A'; ctx.font='bold 22px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top'; ctx.letterSpacing='6px';
    ctx.fillText('WOCHENVORSCHAU', W/2, H*0.28);
    ctx.letterSpacing='0px';
    ctx.fillStyle='#E2001A'; ctx.fillRect((W-100)/2, H*0.28+30, 100, 3);

    ctx.fillStyle='#fff'; ctx.font='bold italic 88px Montserrat, Arial, sans-serif';
    ctx.fillText('DIESE', W/2, H*0.34);
    ctx.fillStyle='#E2001A'; ctx.font='bold italic 88px Montserrat, Arial, sans-serif';
    ctx.fillText('WOCHE', W/2, H*0.34+96);

    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='20px Montserrat, Arial, sans-serif';
    ctx.fillText(wocheLabel, W/2, H*0.34+200);

    // Anzahl Termine
    ctx.fillStyle='rgba(226,0,26,0.15)';
    ctx.beginPath(); ctx.roundRect((W-280)/2, H*0.62, 280, 80, 40); ctx.fill();
    ctx.fillStyle='#E2001A'; ctx.font='bold italic 48px Montserrat, Arial, sans-serif';
    ctx.fillText(String(termine.length), W/2, H*0.62+40);
    ctx.fillStyle='#fff'; ctx.font='bold 18px Montserrat, Arial, sans-serif';
    ctx.fillText(termine.length===1?'VERANSTALTUNG':'VERANSTALTUNGEN', W/2, H*0.62+62);

    // Story-Nummer
    zeichneStoryNummer(ctx, W, H, 1, gesamt);
    zeichneSlzbFooterNeu(ctx, W, H);
  }, `SLZB_Woche_Story_01_Titel.png`);

  storyNr = 1;

  // ── Story pro Wochentag ──────────────────────────────────────
  for (const [datum, tage] of Object.entries(nachTag)) {
    storyNr++;
    const d = new Date(datum);
    const tagName = tagNamen[d.getDay()];
    const datumLabel = `${d.getDate()}. ${monatNamen[d.getMonth()]}`;

    await exportStoryKarte(async (ctx, W, H) => {
      // Hintergrund
      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,'#0a0c1a'); grad.addColorStop(1,'#1B1C1F');
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
      zeichneSlzbDeko(ctx, W, H);

      // Header
      drawLogo(ctx, 40, 40, 55);
      ctx.fillStyle='#E2001A'; ctx.fillRect(120, 48, 2, 40);
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='12px Montserrat, Arial, sans-serif';
      ctx.textAlign='left'; ctx.textBaseline='top'; ctx.letterSpacing='3px';
      ctx.fillText('WOCHENVORSCHAU', 130, 48);
      ctx.letterSpacing='0px';

      // Wochentag groß
      ctx.fillStyle='#E2001A'; ctx.font='bold 18px Montserrat, Arial, sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='top'; ctx.letterSpacing='4px';
      ctx.fillText(tagName.toUpperCase(), W/2, 140);
      ctx.letterSpacing='0px';
      ctx.fillStyle='#fff'; ctx.font='bold italic 72px Montserrat, Arial, sans-serif';
      ctx.fillText(datumLabel, W/2, 170);
      ctx.fillStyle='#E2001A'; ctx.fillRect((W-80)/2, 250, 80, 3);

      // Termine-Liste
      let y = 290;
      const ROW_H = Math.min(200, Math.floor((H - 290 - 120) / tage.length));

      tage.forEach((t, i) => {
        if (y + ROW_H > H - 120) return;

        // Karten-Hintergrund
        ctx.fillStyle='rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.roundRect(40, y, W-80, ROW_H-12, 12); ctx.fill();

        // Prioritäts-Akzent
        ctx.fillStyle=prioFarbe(t.prioritaet);
        ctx.beginPath(); ctx.roundRect(40, y, 4, ROW_H-12, [2,0,0,2]); ctx.fill();

        // Prioritäts-Icon
        ctx.font=`${Math.round(ROW_H*0.28)}px Arial`;
        ctx.textAlign='left'; ctx.textBaseline='top';
        ctx.fillText(prioIcon(t.prioritaet), 56, y+12);

        // Sportart
        ctx.fillStyle=prioFarbe(t.prioritaet);
        ctx.font=`bold 14px Montserrat, Arial, sans-serif`;
        ctx.letterSpacing='2px';
        ctx.fillText(t.sportart.toUpperCase(), 100, y+14);
        ctx.letterSpacing='0px';

        // Veranstaltung
        ctx.fillStyle='#fff'; ctx.font=`bold ${Math.min(22, Math.round(ROW_H*0.22))}px Montserrat, Arial, sans-serif`;
        ctx.fillText(t.veranstaltung, 100, y+36, W-160);

        // Ort + Klasse
        const info = [t.ort, t.klasse].filter(Boolean).join(' · ');
        if (info && ROW_H > 80) {
          ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='13px Montserrat, Arial, sans-serif';
          ctx.fillText(info, 100, y+64, W-160);
        }

        y += ROW_H;
      });

      // Story-Nummer
      zeichneStoryNummer(ctx, W, H, storyNr, gesamt);
      zeichneSlzbFooterNeu(ctx, W, H);
    }, `SLZB_Woche_Story_${String(storyNr).padStart(2,'0')}_${tagName}.png`);

    await new Promise(r=>setTimeout(r,150)); // kurze Pause zwischen Downloads
  }

  toast(`${storyNr} Story-Bilder heruntergeladen! 📱`, 'success');
}

// Hilfsfunktion: Story-Canvas erstellen und herunterladen
async function exportStoryKarte(drawFn, filename) {
  const canvas = document.createElement('canvas');
  canvas.width=1080; canvas.height=1920;
  const ctx = canvas.getContext('2d');
  await drawFn(ctx, 1080, 1920);
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
  await new Promise(r=>setTimeout(r,300));
}

// Story-Nummer oben rechts
function zeichneStoryNummer(ctx, W, H, nr, gesamt) {
  ctx.fillStyle='rgba(226,0,26,0.8)';
  ctx.beginPath(); ctx.roundRect(W-90, 36, 74, 36, 18); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 15px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(`${nr} / ${gesamt}`, W-53, 54);
}

// ══════════════════════════════════════════════════════════════
// QUICK-WIN 1: JAHRESCHRONIK CSV-EXPORT
// ══════════════════════════════════════════════════════════════
async function exportiereChronikCSVAktuell() {
  const alle = await ladeErfolge();
  // Aktuelle Filter aus der Jahreschronik-Seite lesen
  const schuljahr = document.getElementById('chronik-schuljahr')?.value || '';
  const sportart = document.getElementById('chronik-sportart')?.value || '';
  const ebene = document.getElementById('chronik-ebene')?.value || '';

  let gefiltert = alle.filter(e => ['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));

  if (schuljahr) {
    const [von, bis] = schuljahr.split('/').map(Number);
    gefiltert = gefiltert.filter(e => {
      if (!e.datum) return false;
      const d = new Date(e.datum);
      const j = d.getFullYear(); const m = d.getMonth();
      return (j === 2000+von && m >= 7) || (j === 2000+bis && m < 7);
    });
  }
  if (sportart) gefiltert = gefiltert.filter(e => e.sportartId===sportart || e.sportartText===sportart);
  if (ebene) gefiltert = gefiltert.filter(e => e.ebene===ebene);

  if (!gefiltert.length) { toast('Keine Einträge zum Exportieren','warning'); return; }

  // CSV erstellen
  const header = ['Nr.','Datum','Titel','Meldungsart','Sportart','Disziplin','Wettbewerb','Ort','Ebene','Platzierung','Medaille','Ergebnis','Einheit','Athlet/Team','Status'];
  const zeilen = gefiltert.map(e => [
    e.erfolgNr||'',
    e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : '',
    e.titel||'',
    e.meldungsart||'',
    e.sportartText||'',
    e.disziplin||'',
    e.wettbewerbText||'',
    e.ort||'',
    e.ebene||'',
    e.platzierung||'',
    e.medaille||'',
    e.ergebnisWert||'',
    e.ergebnisEinheit||'',
    (e.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', '),
    e.status||'',
  ].map(v => `"${String(v).replace(/"/g,'""')}"`));

  const csv = [header.join(';'), ...zeilen.map(z=>z.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SLZB_Jahreschronik${schuljahr?'_'+schuljahr:''}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast(`${gefiltert.length} Einträge exportiert`, 'success');
}

// ══════════════════════════════════════════════════════════════
// QUICK-WIN 2: BILDVORSCHAU LIGHTBOX
// ══════════════════════════════════════════════════════════════
function zeigeLightbox(src, caption, creator) {
  // Entferne bestehende Lightbox
  document.getElementById('slzb-lightbox')?.remove();

  const lb = document.createElement('div');
  lb.id = 'slzb-lightbox';
  lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:zoom-out;padding:20px';
  lb.onclick = ()=>lb.remove();

  lb.innerHTML = `
    <button style="position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;line-height:1" onclick="document.getElementById('slzb-lightbox').remove()">✕</button>
    <img src="${esc(src)}" alt="${esc(caption||'')}"
      style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6)"
      onclick="event.stopPropagation()">
    ${caption||creator ? `<div style="margin-top:12px;text-align:center">
      ${caption?`<p style="color:#fff;font-size:1rem;margin:0 0 4px">${esc(caption)}</p>`:''}
      ${creator?`<p style="color:rgba(255,255,255,0.5);font-size:.8rem;margin:0">📷 ${esc(creator)}</p>`:''}
    </div>` : ''}`;

  document.body.appendChild(lb);

  // Tastatur: Escape schließt
  const onKey = (e) => { if(e.key==='Escape') { lb.remove(); document.removeEventListener('keydown',onKey); }};
  document.addEventListener('keydown', onKey);
}

// ══════════════════════════════════════════════════════════════
// KERNDATEN BEARBEITEN (Redaktion / ÖA / Admin)
// ══════════════════════════════════════════════════════════════
async function speichereKerndaten(erfolgId) {
  const titel = document.getElementById('edit-titel')?.value?.trim();
  if (!titel) { toast('Titel ist Pflichtfeld', 'warning'); return; }

  const sportartText = document.getElementById('edit-sportart')?.value?.trim() || '';
  const wettbewerbText = document.getElementById('edit-wettbewerb')?.value?.trim() || '';
  const disziplin = document.getElementById('edit-disziplin')?.value?.trim() || '';
  const datum = document.getElementById('edit-datum')?.value || null;
  const ort = document.getElementById('edit-ort')?.value?.trim() || '';
  const ebene = document.getElementById('edit-ebene')?.value || '';
  const platzierung = document.getElementById('edit-platzierung')?.value ? Number(document.getElementById('edit-platzierung').value) : null;
  const medaille = document.getElementById('edit-medaille')?.value || 'keine';
  const ergebnisWert = document.getElementById('edit-ergebnis-wert')?.value ? Number(document.getElementById('edit-ergebnis-wert').value) : null;
  const ergebnisEinheit = document.getElementById('edit-ergebnis-einheit')?.value?.trim() || '';
  const quelleUrl = document.getElementById('edit-quelle')?.value?.trim() || '';
  const athlet = document.getElementById('edit-athlet')?.value?.trim() || '';
  const kurzinfo = document.getElementById('edit-kurzinfo')?.value?.trim() || '';
  const textArtikel = document.getElementById('edit-artikel-text')?.value?.trim() || '';

  // Sportart-ID auflösen
  const sp = SLZB_DB.sportarten.find(s => s.name.toLowerCase() === sportartText.toLowerCase());

  // Wettbewerb auflösen oder anlegen
  let wettbewerbId = null;
  if (wettbewerbText) {
    try {
      const wb = await DB.getOderErstelleWettbewerb(wettbewerbText, datum);
      wettbewerbId = wb;
    } catch(e) { /* ignorieren */ }
  }

  const btn = document.querySelector('#tab-bearbeiten .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Wird gespeichert...'; }

  try {
    const updateData = {
      title: titel,
      sport_id: sp?.id || null,
      discipline: disziplin,
      competition_id: wettbewerbId,
      event_date: datum,
      location: ort,
      level: ebene,
      placement: platzierung,
      medal: medaille,
      result_value: ergebnisWert,
      result_unit: ergebnisEinheit,
      result_text: '',
      short_info: kurzinfo,
      source_url: quelleUrl,
      article_text: textArtikel,
      updated_at: new Date().toISOString(),
    };

    // Entferne null-Werte nicht – Supabase setzt sie auf NULL
    const { error } = await Backend.client
      .from('achievements')
      .update(updateData)
      .eq('id', erfolgId);

    if (error) throw new Error(error.message);

    // Athleten-Beteiligten aktualisieren wenn geändert
    if (athlet !== undefined) {
      // Bestehende Beteiligte löschen und neu anlegen
      await Backend.client.from('achievement_participants').delete().eq('achievement_id', erfolgId);
      if (athlet.trim()) {
        const namen = athlet.split(',').map(n=>n.trim()).filter(Boolean);
        for (const name of namen) {
          await Backend.client.from('achievement_participants').insert({
            achievement_id: erfolgId,
            student_id: null,
            participant_role: 'Athlet',
            consent_status: 'Nicht geprüft',
            anzeigename: name,
          }).catch(()=>{});
        }
      }
    }

    // Protokoll
    await DB.protokolliere(erfolgId, null, null,
      `Kerndaten bearbeitet durch ${Auth.name()}: Titel="${titel}", Sportart="${sportartText}", Athlet="${athlet}", Datum="${datum||''}"`);

    APP._erfolgeCache = null;
    toast('✅ Kerndaten erfolgreich gespeichert!', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: erfolgId });

  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Änderungen speichern'; }
  }
}

// ══════════════════════════════════════════════════════════════
// JAHRESCHRONIK POWERPOINT EXPORT (PptxGenJS)
// ══════════════════════════════════════════════════════════════
async function exportiereChronikPPTX() {
  // PptxGenJS dynamisch laden
  if (typeof PptxGenJS === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('PptxGenJS konnte nicht geladen werden'));
    });
  }

  toast('PowerPoint wird erstellt...', 'info');

  const alle = await ladeErfolge();
  const schuljahr = document.getElementById('chronik-schuljahr')?.value || '';
  const sportartFilter = document.getElementById('chronik-sportart')?.value || '';
  const ebeneFilter = document.getElementById('chronik-ebene')?.value || '';

  let gefiltert = alle.filter(e => ['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if (schuljahr) {
    const [von, bis] = schuljahr.split('/').map(Number);
    gefiltert = gefiltert.filter(e => {
      if (!e.datum) return false;
      const d = new Date(e.datum); const j = d.getFullYear(); const m = d.getMonth();
      return (j === 2000+von && m >= 7) || (j === 2000+bis && m < 7);
    });
  }
  if (sportartFilter) gefiltert = gefiltert.filter(e => e.sportartId===sportartFilter || e.sportartText===sportartFilter);
  if (ebeneFilter) gefiltert = gefiltert.filter(e => e.ebene===ebeneFilter);

  if (!gefiltert.length) { toast('Keine Einträge zum Exportieren','warning'); return; }

  // Statistiken berechnen
  const prio1 = gefiltert.filter(e => e.platzierung===1 || e.medaille==='Gold').length;
  const prio2 = gefiltert.filter(e => e.platzierung===2 || e.medaille==='Silber').length;
  const prio3 = gefiltert.filter(e => e.platzierung===3 || e.medaille==='Bronze').length;
  const sportarten = [...new Set(gefiltert.map(e => e.sportartText).filter(Boolean))];

  // Gruppiere nach Sportart
  const nachSportart = {};
  gefiltert.forEach(e => {
    const s = e.sportartText || 'Sonstige';
    if (!nachSportart[s]) nachSportart[s] = [];
    nachSportart[s].push(e);
  });

  // PptxGenJS Präsentation erstellen
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9

  // Farben
  const ROT = 'E2001A';
  const DUNKEL = '1B1C1F';
  const BLAU = '003366';
  const WEISS = 'FFFFFF';
  const GRAU = 'C9CCD2';
  const GOLD = 'C9A227';

  // ── Folie 1: Titelfolie ──────────────────────────────────────
  const slide1 = pptx.addSlide();
  slide1.background = { color: DUNKEL };
  slide1.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
  slide1.addShape(pptx.ShapeType.rect, { x:0, y:'95%', w:'40%', h:0.04, fill:{color:ROT} });
  slide1.addText('SLZB BERLIN', { x:0.5, y:1.2, w:9, h:0.5, fontSize:14, bold:true, color:ROT, charSpacing:8 });
  slide1.addText('Jahreschronik', { x:0.5, y:1.8, w:9, h:1.2, fontSize:60, bold:true, color:WEISS, fontFace:'Calibri' });
  slide1.addText(schuljahr ? `Schuljahr ${schuljahr}` : 'Alle Schuljahre', { x:0.5, y:3.1, w:9, h:0.6, fontSize:28, color:GRAU });
  slide1.addShape(pptx.ShapeType.rect, { x:0.5, y:3.8, w:1.2, h:0.06, fill:{color:ROT} });
  slide1.addText(`${gefiltert.length} Erfolge · ${sportarten.length} Sportarten`, { x:0.5, y:4.0, w:9, h:0.5, fontSize:16, color:GRAU });

  // ── Folie 2: Überblick KPIs ──────────────────────────────────
  const slide2 = pptx.addSlide();
  slide2.background = { color: DUNKEL };
  slide2.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
  slide2.addText('ÜBERBLICK', { x:0.5, y:0.2, w:9, h:0.3, fontSize:10, bold:true, color:ROT, charSpacing:6 });
  slide2.addText('Kennzahlen auf einen Blick', { x:0.5, y:0.55, w:9, h:0.7, fontSize:32, bold:true, color:WEISS });

  const kpis = [
    { val: String(gefiltert.length), label: 'Erfolge gesamt', icon: '🏆', x: 0.4 },
    { val: String(sportarten.length), label: 'Sportarten', icon: '⚽', x: 2.9 },
    { val: String(prio1), label: 'Gold-Medaillen', icon: '🥇', x: 5.4 },
    { val: String(prio2+prio3), label: 'Silber & Bronze', icon: '🥈', x: 7.9 },
  ];
  kpis.forEach(k => {
    slide2.addShape(pptx.ShapeType.roundRect, { x:k.x, y:1.5, w:2.3, h:2.8, fill:{color:'2A2C31'}, line:{color:ROT,pt:2}, rectRadius:0.1 });
    slide2.addText(k.val, { x:k.x, y:1.7, w:2.3, h:1.2, fontSize:52, bold:true, color:WEISS, align:'center' });
    slide2.addText(k.label, { x:k.x, y:2.9, w:2.3, h:0.5, fontSize:11, bold:true, color:ROT, align:'center', charSpacing:2 });
  });

  // ── Folie 3: Erfolge nach Sportart ───────────────────────────
  const slide3 = pptx.addSlide();
  slide3.background = { color: DUNKEL };
  slide3.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
  slide3.addText('SPORTARTEN', { x:0.5, y:0.2, w:9, h:0.3, fontSize:10, bold:true, color:ROT, charSpacing:6 });
  slide3.addText('Erfolge nach Sportart', { x:0.5, y:0.55, w:9, h:0.7, fontSize:32, bold:true, color:WEISS });

  const sportSorted = Object.entries(nachSportart).sort((a,b)=>b[1].length-a[1].length).slice(0,8);
  const maxVal = sportSorted[0]?.[1]?.length || 1;
  sportSorted.forEach(([sport, items], i) => {
    const y = 1.5 + i*0.6;
    const barW = (items.length/maxVal) * 7.5;
    slide3.addText(sport, { x:0.4, y, w:2.5, h:0.5, fontSize:11, color:GRAU, valign:'middle' });
    slide3.addShape(pptx.ShapeType.rect, { x:2.9, y:y+0.08, w:barW, h:0.35, fill:{color: i===0?ROT:BLAU} });
    slide3.addText(String(items.length), { x:2.9+barW+0.1, y, w:0.6, h:0.5, fontSize:11, bold:true, color:WEISS, valign:'middle' });
  });

  // ── Folien 4+: Detailliste nach Sportart (max 5 Sportarten) ──
  const topSportarten = Object.entries(nachSportart).sort((a,b)=>b[1].length-a[1].length).slice(0,5);
  topSportarten.forEach(([sport, items]) => {
    const slideN = pptx.addSlide();
    slideN.background = { color: DUNKEL };
    slideN.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
    slideN.addText(sport.toUpperCase(), { x:0.5, y:0.2, w:9, h:0.3, fontSize:10, bold:true, color:ROT, charSpacing:6 });
    slideN.addText(`${sport} – ${items.length} Erfolge`, { x:0.5, y:0.55, w:9, h:0.7, fontSize:28, bold:true, color:WEISS });

    // Tabellenkopf
    slideN.addShape(pptx.ShapeType.rect, { x:0.4, y:1.4, w:9.2, h:0.4, fill:{color:BLAU} });
    slideN.addText('Datum', { x:0.5, y:1.4, w:1.5, h:0.4, fontSize:10, bold:true, color:WEISS, valign:'middle' });
    slideN.addText('Titel', { x:2.1, y:1.4, w:4.5, h:0.4, fontSize:10, bold:true, color:WEISS, valign:'middle' });
    slideN.addText('Platz', { x:6.7, y:1.4, w:1.2, h:0.4, fontSize:10, bold:true, color:WEISS, valign:'middle' });
    slideN.addText('Medaille', { x:8.0, y:1.4, w:1.5, h:0.4, fontSize:10, bold:true, color:WEISS, valign:'middle' });

    items.slice(0,12).forEach((e, i) => {
      const ry = 1.85 + i*0.38;
      const bg = i%2===0 ? '2A2C31' : '222428';
      slideN.addShape(pptx.ShapeType.rect, { x:0.4, y:ry, w:9.2, h:0.36, fill:{color:bg} });
      const datStr = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '–';
      slideN.addText(datStr, { x:0.5, y:ry, w:1.5, h:0.36, fontSize:9, color:GRAU, valign:'middle' });
      slideN.addText((e.titel||'–').slice(0,55), { x:2.1, y:ry, w:4.5, h:0.36, fontSize:9, color:WEISS, valign:'middle' });
      slideN.addText(e.platzierung ? `${e.platzierung}.` : '–', { x:6.7, y:ry, w:1.2, h:0.36, fontSize:9, color:e.platzierung===1?GOLD:GRAU, bold:e.platzierung===1, valign:'middle' });
      const medFarbe = e.medaille==='Gold'?GOLD:e.medaille==='Silber'?'BFC8D2':e.medaille==='Bronze'?'C2783A':GRAU;
      slideN.addText(e.medaille&&e.medaille!=='keine'?e.medaille:'–', { x:8.0, y:ry, w:1.5, h:0.36, fontSize:9, color:medFarbe, bold:!!e.medaille&&e.medaille!=='keine', valign:'middle' });
    });
    if (items.length > 12) {
      slideN.addText(`... und ${items.length-12} weitere Einträge`, { x:0.5, y:6.4, w:9, h:0.3, fontSize:9, color:GRAU, italic:true });
    }
  });

  // ── Letzte Folie: Abschluss ──────────────────────────────────
  const slideEnd = pptx.addSlide();
  slideEnd.background = { color: DUNKEL };
  slideEnd.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
  slideEnd.addShape(pptx.ShapeType.rect, { x:0, y:'95%', w:'40%', h:0.04, fill:{color:ROT} });
  slideEnd.addText('#SLZBerlin', { x:0.5, y:2.5, w:9, h:1.5, fontSize:56, bold:true, italic:true, color:ROT, align:'center' });
  slideEnd.addText('Schul- und Leistungssportzentrum Berlin', { x:0.5, y:4.2, w:9, h:0.5, fontSize:16, color:GRAU, align:'center' });

  // Download
  const dateiname = `SLZB_Jahreschronik${schuljahr?'_'+schuljahr:''}_${new Date().toISOString().slice(0,10)}`;
  await pptx.writeFile({ fileName: dateiname });
  toast(`✅ PowerPoint "${dateiname}.pptx" heruntergeladen!`, 'success');
}


async function zeigeBildschirmModal(erfolgId) {
  toast('Bildschirm-Ausgabe wird vorbereitet...','info');
  try {
    const e = await DB.getErfolgById(erfolgId);
    if (!e) { toast('Erfolg nicht gefunden','danger'); return; }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>🖥️ Bildschirm-Ausgabe (SLZB-Poster-Stil)</h3>
        <button class="btn btn-ghost btn-sm close-x">✕</button>
      </div>
      <div class="modal-body" style="background:#111;padding:16px">
        <div class=\"tabs mb-3\" style=\"background:rgba(255,255,255,.08);border-radius:8px;padding:4px;display:flex;gap:4px;flex-wrap:wrap\">
          <button class=\"tab-btn active\" style=\"color:#fff;flex:1\" onclick=\"wechsleBildschirmFormat('hochformat')\">📱 Hochformat (4:5)</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('querformat')\">🖥️ Querformat (16:9)</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('tabelle')\">📊 Tabelle</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('infografik')\">📈 Infografik</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('portrait')\">👤 Porträt</button>
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('multierfolg')\">🏅 Multi-Erfolg</button>
        </div>
        <div style=\"text-align:center\">
          <canvas id=\"screen-canvas\" width=\"1080\" height=\"1350\"
            style=\"max-width:100%;max-height:65vh;display:block;margin:0 auto;border-radius:8px\"></canvas>
          <p class=\"text-xs mt-2\" style=\"color:#888\" id=\"screen-format-info\">1080×1350 px · Hochformat</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
        <button class="btn btn-primary dl-png">🖼️ PNG herunterladen</button>
      </div>`;
    modal.querySelector('.close-x').onclick = ()=>overlay.remove();
    modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
    modal.querySelector('.dl-png').onclick = ()=>exportPosterPNG(e,'screen-canvas');
    overlay.appendChild(modal);
    overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    // Modus-Select dynamisch einfügen
    const _infoEl = document.getElementById('screen-format-info');
    if (_infoEl) {
      const _sel = document.createElement('div');
      _sel.style.cssText='display:flex;gap:8px;align-items:center;margin-top:6px';
      _sel.innerHTML=`<span style="color:#888;font-size:.75rem">Hintergrund (ohne Foto):</span>
        <select id="screen-modus-select" onchange="setErsatzbildModus(this.value);wechsleBildschirmFormat(window._screenFormat||'hochformat')"
          style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 8px;font-size:.75rem">
          <option value="neutral">⚫ Neutral</option>
          <option value="farbig">🎨 Sportart-Farben</option>
        </select>`;
      _infoEl.parentNode.insertBefore(_sel, _infoEl.nextSibling);
    }
    window._screenErfolg = e;
    window._screenFormat = 'hochformat';
    setTimeout(()=>zeichneSLZBPoster('screen-canvas', e), 100);
  } catch(err) {
    toast('Fehler: '+err.message,'danger');
    console.error('Bildschirm Fehler:', err);
  }
}


async function zeigeSocialModal(erfolgId) {
  toast('Social-Media-Ausgabe wird vorbereitet...','info');
  try {
    const e = await DB.getErfolgById(erfolgId);
    if (!e) { toast('Erfolg nicht gefunden','danger'); return; }

    const anzBilder = (e.bilder||[]).filter(b=>b.signedUrl).length;
    const tab2 = anzBilder>=2 ? `<button class="tab-btn" onclick="wechsleSocialFormat('2bilder','${e.id}')">🖼️ 2 Bilder</button>` : '';
    const tab4 = anzBilder>=4 ? `<button class="tab-btn" onclick="wechsleSocialFormat('4bilder','${e.id}')">🖼️ 4 Bilder</button>` : '';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📱 Social-Media-Ausgabe</h3>
        <button class="btn btn-ghost btn-sm close-x">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-danger mb-3">
          <span class="alert-icon">🔒</span>
          <span><strong>Social Media ist standardmäßig gesperrt.</strong> Kein Auto-Posting.</span>
        </div>
        <div class="tabs mb-3" style="flex-wrap:wrap;gap:4px;display:flex">
          <button class="tab-btn active" onclick="wechsleSocialFormat('beitrag','${e.id}')">📸 Beitrag (1:1)</button>
          <button class="tab-btn" onclick="wechsleSocialFormat('story','${e.id}')">📱 Story/Reel (9:16)</button>
          ${tab2}${tab4}
          <button class="tab-btn" onclick="wechsleSocialFormat('portrait','${e.id}')">👤 Porträt</button>
          <button class="tab-btn" onclick="wechsleSocialFormat('multierfolg','${e.id}')">🏅 Multi</button>
        </div>
        <div style="text-align:center;background:#111;padding:16px;border-radius:8px">
          <canvas id="social-canvas" width="1080" height="1080"
            style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
          <p class="text-xs mt-2" style="color:#888" id="social-format-info">1080×1080 px · Beitrag</p>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <span style="color:#888;font-size:.75rem">Hintergrund (ohne Foto):</span>
            <select onchange="setErsatzbildModus(this.value);wechsleSocialFormat(window._socialFormat||'beitrag','')"
              style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:3px 8px;font-size:.75rem">
              <option value="neutral">⚫ Neutral</option>
              <option value="farbig">🎨 Sportart-Farben</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
        <button class="btn btn-primary dl-png">🖼️ PNG herunterladen</button>
      </div>`;

    modal.querySelector('.close-x').onclick = ()=>overlay.remove();
    modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
    modal.querySelector('.dl-png').onclick = ()=>exportPosterPNG(e,'social-canvas');
    overlay.appendChild(modal);
    overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    // Aktuelles Format merken
    window._socialErfolg = e;
    window._socialFormat = 'beitrag';
    setTimeout(()=>zeichneSocialFormat('social-canvas', e, 'beitrag'), 100);
  } catch(err) {
    toast('Fehler: '+err.message,'danger');
    console.error('Social Fehler:', err);
  }
}

async function wechsleBildschirmFormat(format) {
  // Ersatzbild-Modus aus Select lesen (falls vorhanden)
  const modusSelect = document.getElementById('screen-modus-select');
  if (modusSelect && typeof SLZB_ERSATZBILD_MODUS !== 'undefined') {
    try { eval('SLZB_ERSATZBILD_MODUS = "' + modusSelect.value + '"'); } catch(e) {}
  }
  const tabs = document.querySelectorAll('.modal .tabs .tab-btn');
  tabs.forEach(b => {
    const isActive = (format==='hochformat' && b.textContent.includes('Hochformat')) ||
                     (format==='querformat' && b.textContent.includes('Querformat'));
    b.classList.toggle('active', isActive);
    b.style.color = isActive ? '#fff' : '#aaa';
  });
  const info = document.getElementById('screen-format-info');
  const canvas = document.getElementById('screen-canvas');
  window._screenFormat = format;
  const e = window._screenErfolg;
  if (!e) return;
  if (format==='querformat') {
    if (canvas) { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='50vh'; }
    if (info) info.textContent='1920×1080 px · Querformat (16:9)';
    await zeichneBildschirmQuerformat('screen-canvas', e);
  } else if (format==='tabelle') {
    if (canvas) { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='50vh'; }
    if (info) info.textContent='1920×1080 px · Tabellen-Layout (Team/Staffel)';
    await zeichneTabellenLayout('screen-canvas', e);
  } else if (format==='infografik') {
    if (canvas) { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='50vh'; }
    if (info) info.textContent='1920×1080 px · Infografik-Layout (Bilanz)';
    await zeichneInfografikLayout('screen-canvas', e);
  } else if (format==='portrait') {
    if (canvas) { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='65vh'; }
    if (info) info.textContent='1080×1350 px · Porträt-Layout (Einzelperson)';
    await zeichnePortraitLayout('screen-canvas', e);
  } else if (format==='multierfolg') {
    if (canvas) { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='65vh'; }
    if (info) info.textContent='1080×1350 px · Multi-Erfolg-Layout';
    await zeichneMultiErfolgLayout('screen-canvas', e);
  } else {
    if (canvas) { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='65vh'; }
    if (info) info.textContent='1080×1350 px · Hochformat';
    await zeichneSLZBPoster('screen-canvas', e);
  }
}

async function wechsleSocialFormat(format, erfolgId) {
  // Tab-Buttons aktualisieren
  document.querySelectorAll('.modal .tabs .tab-btn').forEach(b=>{
    const txt = b.textContent.toLowerCase();
    let active = false;
    if (format==='beitrag') active = txt.includes('beitrag');
    else if (format==='story') active = txt.includes('story');
    else if (format==='2bilder') active = txt.includes('2 bilder');
    else if (format==='4bilder') active = txt.includes('4 bilder');
    else if (format==='portrait') active = txt.includes('porträt');
    else if (format==='multierfolg') active = txt.includes('multi');
    b.classList.toggle('active', active);
  });
  const canvas = document.getElementById('social-canvas');
  const info = document.getElementById('social-format-info');
  window._socialFormat = format;
  const e = window._socialErfolg;
  if (!e) return;

  if (format==='story') {
    canvas.width=1080; canvas.height=1920;
    canvas.style.maxHeight='70vh';
    if(info) info.textContent='1080×1920 px · Story/Reel';
    await zeichneSocialFormat('social-canvas', e, 'story');
  } else if (format==='2bilder') {
    canvas.width=1080; canvas.height=1080;
    canvas.style.maxHeight='60vh';
    if(info) info.textContent='1080×1080 px · 2 Bilder';
    await zeichnePoster2Bilder('social-canvas', e);
  } else if (format==='4bilder') {
    canvas.width=1080; canvas.height=1080;
    canvas.style.maxHeight='60vh';
    if(info) info.textContent='1080×1080 px · 4 Bilder';
    await zeichnePoster4Bilder('social-canvas', e);
  } else if (format==='portrait') {
    canvas.width=1080; canvas.height=1350;
    canvas.style.maxHeight='65vh';
    if(info) info.textContent='1080×1350 px · Porträt-Layout';
    await zeichnePortraitLayout('social-canvas', e);
  } else if (format==='multierfolg') {
    canvas.width=1080; canvas.height=1350;
    canvas.style.maxHeight='65vh';
    if(info) info.textContent='1080×1350 px · Multi-Erfolg-Layout';
    await zeichneMultiErfolgLayout('social-canvas', e);
  } else {
    // Beitrag (Standard)
    canvas.width=1080; canvas.height=1080;
    canvas.style.maxHeight='60vh';
    if(info) info.textContent='1080×1080 px · Beitrag';
    await zeichneSocialFormat('social-canvas', e, 'beitrag');
  }
}


async function wechsleA3Variante(nr) {
  document.querySelectorAll('#a3-canvas').length; // ensure modal open
  const tabs = document.querySelectorAll('.modal .tabs .tab-btn');
  tabs.forEach((b,i)=>{
    b.classList.toggle('active', i===nr-1);
    b.style.color = i===nr-1 ? '#fff' : '#aaa';
  });
  const labels = {
    1: 'Variante 1: Bild oben · A3 Querformat',
    2: 'Variante 2: Split (Bild links) · A3 Querformat',
    3: 'Variante 3: Vollbild · A3 Querformat',
    4: 'Variante 4: 2 Bilder · A3 Querformat',
    5: 'Variante 5: 4 Bilder · A3 Querformat',
    6: 'Variante 6: Tabellen-Layout (Team/Staffel) · 1920×1080',
    7: 'Variante 7: Porträt-Layout (Einzelperson) · 1080×1350',
  };
  const info = document.getElementById('a3-variante-info');
  if (info) info.textContent = labels[nr] || '';
  window._a3Variante = nr;
  const e = window._a3Erfolg;
  if (e) await zeichneA3Variante('a3-canvas', e, nr);
}

async function zeichneA3Variante(canvasId, e, nr) {
  // Kein QR-Code – Instagram-Hinweis direkt im Poster
  const eQR = {...e, _qrUrl: null};
  if (nr===1) await zeichneA3Druckfreundlich(canvasId, eQR);
  else if (nr===2) await zeichneA3Split(canvasId, eQR);
  else if (nr===3) await zeichneA3Vollbild(canvasId, eQR);
  else if (nr===4) await zeichnePoster2Bilder(canvasId, eQR);
  else if (nr===5) await zeichnePoster4Bilder(canvasId, eQR);
  else if (nr===6) await zeichneTabellenLayout(canvasId, eQR);
  else if (nr===7) await zeichnePortraitLayout(canvasId, eQR);
}


async function downloadJTFO(erfolgId, typ) {
  const e = await DB.getErfolgById(erfolgId); if(!e) return;
  const html = erzeugeJTFOHtml(e, typ);
  const blob = new Blob([html],{type:'text/html;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`SLZB_${typ}_${e.erfolgNr||'ERF'}_${new Date().toISOString().slice(0,10)}.html`;
  a.click(); URL.revokeObjectURL(url);
  toast('HTML heruntergeladen','success');
}

async function druckeJTFO(erfolgId) {
  const e = await DB.getErfolgById(erfolgId); if(!e) return;
  const html = erzeugeJTFOHtml(e, 'a3');
  const win = window.open('','_blank');
  if (win) { win.document.write(html); win.document.close(); setTimeout(()=>win.print(),800); }
}

// ── JTFO-HTML-Generator ──────────────────────────────────────
function erzeugeJTFOHtml(e, typ) {
  // Sportart: alle möglichen Quellen
  const sportart = e.sportartText ||
    SLZB_DB.getSportart(e.sportartId)?.name ||
    SLZB_DB.sportarten.find(s=>s.id===e.sportartId)?.name ||
    SLZB_DB.sportarten.find(s=>s.kuerzel===e.sportartId)?.name ||
    (e.sportartId && !e.sportartId.startsWith('SP') ? e.sportartId : '') || '';

  // Wettbewerb: alle möglichen Quellen
  const wettbewerb = e.wettbewerbText ||
    SLZB_DB.getWettbewerb(e.wettbewerbId)?.name ||
    (e.wettbewerbId && !e.wettbewerbId.startsWith('WB-') ? e.wettbewerbId : '') || '';

  // Titel bereinigt
  const titelSauber = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  const platz      = e.platzierung || '';
  const medaille   = e.medaille && e.medaille !== 'keine' ? e.medaille.toUpperCase() : '';
  const disziplin  = e.disziplin || '';
  const ergebnis   = e.ergebnisWert ? `${e.ergebnisWert} ${e.ergebnisEinheit||''}` : e.ergebnisText || '';
  const datum      = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

  // Platzierungstext
  const platzText = platz === 1 ? '1. PLATZ' : platz === 2 ? '2. PLATZ' : platz === 3 ? '3. PLATZ' : platz ? `${platz}. PLATZ` : '';

  // Medaillen-Farbe
  const medailleColor = medaille==='GOLD' ? '#FFD700' : medaille==='SILBER' ? '#C0C0C0' : medaille==='BRONZE' ? '#CD7F32' : '#003366';

  const platzLabel = platz === 1 ? (e.meldungsart==='Teamerfolg'?'BUNDESSIEGER':'SIEGER') :
                     platz === 2 ? 'VIZE-BUNDESSIEGER' :
                     platz === 3 ? 'BRONZE BEIM BUNDESFINALE' : platzText;

  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const w = typ==='social' ? '1080px' : typ==='screen' ? '960px' : '420mm';
  const h = typ==='social' ? '1080px' : typ==='screen' ? '1080px' : '297mm';

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>SLZB – ${esc(e.titel)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${w}; height:${h}; overflow:hidden;
    background:#0a0a1a;
    font-family:'Segoe UI',Arial,sans-serif;
    display:flex; flex-direction:column;
    color:#fff;
  }
  .header {
    background:rgba(0,0,0,.5);
    padding:${typ==='a3'?'8mm 12mm':'20px 30px'};
    display:flex; align-items:center; justify-content:space-between;
    border-bottom:3px solid #003366;
  }
  .header-left { display:flex; align-items:center; gap:12px; }
  .header-logo {
    background:#003366; border-radius:8px;
    padding:6px 12px; font-size:${typ==='a3'?'10pt':'14px'};
    font-weight:900; color:#fff; letter-spacing:.05em;
  }
  .header-title {
    font-size:${typ==='a3'?'9pt':'12px'};
    font-weight:700; opacity:.8; text-transform:uppercase;
    letter-spacing:.1em;
  }
  .header-sub {
    font-size:${typ==='a3'?'7pt':'10px'};
    opacity:.6; text-transform:uppercase; letter-spacing:.08em;
  }
  .header-hashtag {
    font-size:${typ==='a3'?'9pt':'13px'};
    font-weight:700; color:#4a9eff; letter-spacing:.05em;
  }
  .body {
    flex:1; display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    padding:${typ==='a3'?'10mm':'30px'};
    text-align:center; gap:${typ==='a3'?'6mm':'16px'};
    position:relative;
  }
  /* Hintergrund-Akzent */
  .body::before {
    content:'';
    position:absolute; inset:0;
    background:radial-gradient(ellipse at center, rgba(0,51,102,.4) 0%, transparent 70%);
    pointer-events:none;
  }
  .sport-label {
    font-size:${typ==='a3'?'14pt':'22px'};
    font-weight:900; text-transform:uppercase;
    letter-spacing:.15em; color:#4a9eff;
    position:relative;
  }
  .disziplin-label {
    font-size:${typ==='a3'?'10pt':'16px'};
    font-weight:600; opacity:.8; text-transform:uppercase;
    letter-spacing:.1em; position:relative;
  }
  .platz-number {
    font-size:${typ==='a3'?'120pt':'180px'};
    font-weight:900; line-height:.9;
    color:${medailleColor};
    text-shadow:0 0 60px ${medailleColor}66;
    position:relative;
  }
  .platz-text {
    font-size:${typ==='a3'?'18pt':'28px'};
    font-weight:900; text-transform:uppercase;
    letter-spacing:.2em; color:${medailleColor};
    position:relative;
  }
  .platz-label {
    font-size:${typ==='a3'?'11pt':'17px'};
    font-weight:700; text-transform:uppercase;
    letter-spacing:.15em; opacity:.9;
    position:relative;
  }
  .wettbewerb {
    font-size:${typ==='a3'?'9pt':'14px'};
    opacity:.7; text-transform:uppercase;
    letter-spacing:.08em; position:relative;
  }
  .ergebnis {
    font-size:${typ==='a3'?'11pt':'18px'};
    font-weight:600; color:#F5A800;
    position:relative;
  }
  .schule {
    font-size:${typ==='a3'?'9pt':'13px'};
    opacity:.7; position:relative;
  }
  .footer {
    background:rgba(0,0,0,.6);
    padding:${typ==='a3'?'5mm 12mm':'12px 30px'};
    display:flex; align-items:center; justify-content:space-between;
    border-top:2px solid rgba(255,255,255,.1);
    font-size:${typ==='a3'?'7pt':'10px'};
    opacity:.6;
  }
  
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="header-logo">SLZB</div>
      <div>
        <div class="header-title">${esc(wettbewerb||'Sportlicher Erfolg')}</div>
        <div class="header-sub">Schul- und Leistungssportzentrum Berlin</div>
      </div>
    </div>
    <div class="header-hashtag">#SLZBerlin</div>
  </div>

  <div class="body">
    ${hauptbild ? `<div style="position:absolute;inset:0;z-index:0;overflow:hidden">
      <img src="${hauptbild.signedUrl}" alt="${esc(hauptbild.altText||hauptbild.caption||'')}"
        style="width:100%;height:100%;object-fit:cover;opacity:.2;filter:blur(3px)">
    </div>` : ''}
    <div class="sport-label" style="position:relative">${esc(sportart || titelSauber)}</div>
    ${disziplin?`<div class="disziplin-label" style="position:relative">${esc(disziplin)}</div>`:''}
    ${platz?`<div class="platz-number" style="position:relative">${platz}</div>`:''}
    ${platzText?`<div class="platz-text" style="position:relative">${platzText}</div>`:''}
    ${platzLabel?`<div class="platz-label" style="position:relative">${esc(platzLabel)}</div>`:''}
    ${ergebnis?`<div class="ergebnis" style="position:relative">${esc(ergebnis)}</div>`:''}
    ${datum?`<div class="wettbewerb" style="position:relative">${esc(datum)}${e.ort?' · '+esc(e.ort):''}</div>`:''}
    <div class="schule" style="position:relative">Schul- und Leistungssportzentrum Berlin</div>
    ${hauptbild?`
    <div style="position:relative;margin-top:${typ==='a3'?'6mm':'16px'};max-width:${typ==='a3'?'160mm':'380px'}">
      <img src="${hauptbild.signedUrl}" alt="${esc(hauptbild.altText||hauptbild.caption||'')}"
        style="width:100%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.5)">
      ${hauptbild.caption?`<div style="font-size:${typ==='a3'?'7pt':'11px'};opacity:.8;margin-top:6px;font-style:italic;color:#fff">${esc(hauptbild.caption)}</div>`:''}
      <div style="font-size:${typ==='a3'?'6pt':'9px'};opacity:.5;margin-top:2px;color:#fff">© ${esc(hauptbild.creator||hauptbild.source||'')}</div>
    </div>`:''}
    ${e.kurzinfo?`<div style="font-size:${typ==='a3'?'9pt':'14px'};opacity:.85;margin-top:${typ==='a3'?'5mm':'14px'};max-width:${typ==='a3'?'180mm':'420px'};line-height:1.5;text-align:center;position:relative;color:#fff">${esc(e.kurzinfo)}</div>`:''}
  </div>

  <div class="footer">
    <span>SLZB-Erfolge · ${new Date().toLocaleDateString('de-DE')}</span>
    <span>${esc(e.erfolgNr||'')}</span>
  </div>
</body>
</html>`;
}

// ── Einwilligungen ───────────────────────────────────────────
function renderEinwilligungen() {
  return`<div class="page">
    <div class="page-header"><h1>🔒 Einwilligungsverwaltung</h1></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Schüler/in</th><th>Gültig bis</th><th>Foto</th><th>Print</th><th>Homepage</th><th>Dig.Sign.</th><th>Social</th><th>Einzel</th><th>Widerruf</th><th>Aktionen</th></tr></thead>
      <tbody>${SLZB_DB.schueler.map(s=>{
        const abgelaufen=s.ewGueltigBis&&new Date(s.ewGueltigBis)<new Date();
        return`<tr>
          <td>${esc(s.anzeigename)}<br><span class="text-xs text-muted">${esc(s.schuelerNr||s.id)}</span></td>
          <td class="text-sm">${fmt(s.ewGueltigBis)||'–'}${abgelaufen?'<br><span class="badge badge-danger">Abgelaufen</span>':''}</td>
          <td>${einwilligungIcon(s.ew?.foto)}</td><td>${einwilligungIcon(s.ew?.print)}</td>
          <td>${einwilligungIcon(s.ew?.homepage)}</td><td>${einwilligungIcon(s.ew?.digitalSignage)}</td>
          <td>${einwilligungIcon(s.ew?.socialMedia)}</td><td>${einwilligungIcon(s.ew?.einzeldarstellung)}</td>
          <td>${s.ewWiderruf?'<span class="badge badge-danger">Widerrufen</span>':'<span class="badge badge-success">Aktiv</span>'}</td>
          <td>${!s.ewWiderruf&&Auth.canDo('datenschutz')?`<button class="btn btn-danger btn-sm" onclick="widerrufEinwilligung('${s.id}','${esc(s.anzeigename)}')">Widerrufen</button>`:'–'}</td>
        </tr>`;}).join('')}
      </tbody>
    </table></div></div>
  </div>`;
}

function widerrufEinwilligung(schuelerId,name) {
  if(!confirm(`Einwilligung von ${name} wirklich widerrufen?`)) return;
  const s=SLZB_DB.getSchueler(schuelerId); if(!s) return;
  s.ewWiderruf=true; s.ewWiderrufDatum=new Date().toISOString();
  Object.keys(s.ew||{}).forEach(k=>s.ew[k]=false);
  SLZB_DB.erfolge.forEach(e=>{
    if(e.beteiligte?.some(b=>b.schuelerId===schuelerId)){
      if(['Veröffentlicht','Freigegeben'].includes(e.status)){
        SLZB_DB.statusWechsel(e.id,'Wegen Einwilligung gesperrt',Auth.name(),`Widerruf: ${name}`);
      }
    }
  });
  slzbSave(); toast(`Einwilligung von ${name} widerrufen.`,'warning');
  navigateTo('einwilligungen');
}

// ── Ausgaben ─────────────────────────────────────────────────

// ── Stammdaten ───────────────────────────────────────────────
function renderStammdaten() {
  return`<div class="page">
    <div class="page-header"><h1>⚙️ Stammdaten</h1></div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('sd-sportarten')">Sportarten (${SLZB_DB.sportarten.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-wettbewerbe')">Wettbewerbe (${SLZB_DB.wettbewerbe.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-schueler')">Schüler (${SLZB_DB.schueler.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-teams')">Teams (${SLZB_DB.teams.length})</button>
    </div>
    <div id="tab-sd-sportarten" class="tab-panel active">
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Kürzel</th><th>Name</th><th>Kategorie</th><th>Aktiv</th></tr></thead>
        <tbody>${SLZB_DB.sportarten.map(s=>`<tr><td><strong>${esc(s.kuerzel)}</strong></td><td>${esc(s.name)}</td><td>${esc(s.kategorie)}</td><td>${s.aktiv?'✅':'❌'}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>
    <div id="tab-sd-wettbewerbe" class="tab-panel">
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Veranstalter</th><th>Ort</th><th>Beginn</th><th>Ebene</th></tr></thead>
        <tbody>${SLZB_DB.wettbewerbe.map(w=>`<tr><td>${esc(w.name)}</td><td>${esc(w.veranstalter||'–')}</td><td>${esc(w.ort||'–')}</td><td>${fmt(w.beginn)}</td><td>${ebeneBadge(w.ebene)}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>
    <div id="tab-sd-schueler" class="tab-panel">
      <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span><span>Schülerdaten sind intern.</span></div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Nr.</th><th>Anzeigename</th><th>Klasse</th><th>Sportart</th><th>Foto</th><th>Print</th><th>Social</th></tr></thead>
        <tbody>${SLZB_DB.schueler.map(s=>{const sp=SLZB_DB.getSportart(s.sportartId);
          return`<tr><td class="text-xs text-muted">${esc(s.schuelerNr||s.id)}</td><td>${esc(s.anzeigename)}</td>
            <td>${esc(s.klasse||'–')}</td><td>${esc(sp?.name||'–')}</td>
            <td>${einwilligungIcon(s.ew?.foto)}</td><td>${einwilligungIcon(s.ew?.print)}</td><td>${einwilligungIcon(s.ew?.socialMedia)}</td>
          </tr>`;}).join('')}
        </tbody>
      </table></div></div>
    </div>
    <div id="tab-sd-teams" class="tab-panel">
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Sportart</th><th>Kategorie</th><th>Schuljahr</th></tr></thead>
        <tbody>${SLZB_DB.teams.map(t=>{const sp=SLZB_DB.getSportart(t.sportartId);
          return`<tr><td>${esc(t.name)}</td><td>${esc(sp?.name||'–')}</td><td>${esc(t.kategorie||'–')}</td><td>${esc(t.schuljahr||'–')}</td></tr>`;}).join('')}
        </tbody>
      </table></div></div>
    </div>
  </div>`;
}

// ── Import ───────────────────────────────────────────────────
function renderImport() {
  return`<div class="page">
    <div class="page-header"><h1>📥 Import</h1></div>
    <div class="card mb-3">
      <div class="card-header"><h2>Importvorlage</h2></div>
      <div class="card-body">
        <div class="alert alert-info"><span class="alert-icon">ℹ️</span>
          <span>Pflichtfelder: Titel, Sportart, Datum.</span></div>
        <button class="btn btn-outline mt-2" onclick="PDF.downloadImportvorlage()">⬇️ Vorlage herunterladen (CSV)</button>
      </div>
    </div>
  </div>`;
}

// ── Mein Profil ──────────────────────────────────────────────
function renderMeinProfil() {
  return`<div class="page">
    <div class="page-header"><h1>👤 Mein Profil</h1></div>
    <div class="grid grid-2 mb-4">
      <div class="card">
        <div class="card-header"><h2>Meine Daten</h2></div>
        <div class="card-body">
          <table style="width:100%;font-size:.85rem">
            <tr><td class="text-muted" style="padding:6px 0;width:40%">Name</td><td><strong>${esc(Auth.name())}</strong></td></tr>
            <tr><td class="text-muted" style="padding:6px 0">E-Mail</td><td>${esc(Auth.email())}</td></tr>
            <tr><td class="text-muted" style="padding:6px 0">Rolle</td><td><span class="badge badge-info">${esc({trainer:'Trainer/Melder',redaktion:'Redaktion',oea:'Öffentlichkeitsarbeit',datenschutz:'Datenschutz',admin:'Administrator'}[Auth.rolle()]||Auth.rolle())}</span></td></tr>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>🔑 Passwort ändern</h2></div>
        <div class="card-body">
          <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
            <span>Mindestens 12 Zeichen (Supabase-Anforderung).</span></div>
          <div class="form-group"><label>Neues Passwort <span class="required">*</span></label>
            <input type="password" id="pw-neu" placeholder="Mindestens 12 Zeichen" autocomplete="new-password"
              oninput="pruefePwStaerke(this.value)">
            <div id="pw-staerke-bar"><div id="pw-staerke-fill"></div></div>
            <div id="pw-staerke-text" class="form-hint"></div>
          </div>
          <div class="form-group"><label>Passwort bestätigen <span class="required">*</span></label>
            <input type="password" id="pw-bestaetigung" placeholder="Passwort wiederholen" autocomplete="new-password">
            <div id="pw-match-hint" class="form-hint"></div>
          </div>
          <div id="pw-fehler" style="display:none" class="alert alert-danger mb-3">
            <span class="alert-icon">❌</span><span id="pw-fehler-text"></span></div>
          <div id="pw-erfolg" style="display:none" class="alert alert-success mb-3">
            <span class="alert-icon">✅</span><span>Passwort erfolgreich geändert!</span></div>
          <button class="btn btn-primary w-full" onclick="speichereEigenesPasswort()" id="pw-speichern-btn">
            🔑 Passwort ändern
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Bild-Upload Modal ────────────────────────────────────────
function zeigeBildUploadModal(erfolgId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">
    <div class="modal-header"><h3>📷 Bild hochladen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <div class="modal-body">
      <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
        <span>Nur Bilder hochladen für die Sie die Nutzungsrechte besitzen. Urheber und Quelle sind Pflichtfelder.</span></div>
      <div class="form-group"><label>Datei <span class="required">*</span></label>
        <input type="file" id="upload-datei" accept="image/jpeg,image/png,image/webp"></div>
      <div class="form-group">
        <label>Fotograf / Urheber / Quelle <span class="required">*</span></label>
        <input type="text" id="upload-urheber" placeholder="z.B. Max Mustermann / SLZB-Archiv">
        <div class="form-hint">Name des Fotografen oder der Bildquelle</div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label>Bildunterschrift</label>
          <input type="text" id="upload-caption" placeholder="z.B. Die Staffel beim Start"></div>
        <div class="form-group"><label>Alternativtext</label>
          <input type="text" id="upload-alt" placeholder="Beschreibung für Barrierefreiheit"></div>
      </div>
      <div id="upload-error"></div>
      <div id="upload-progress" style="display:none" class="alert alert-info mt-2">
        <span class="alert-icon">⏳</span><span>Wird hochgeladen...</span></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" id="upload-btn" onclick="fuehreBildUploadDurch('${erfolgId}')">📤 Hochladen</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function fuehreBildUploadDurch(erfolgId) {
  const dateiInput = document.getElementById('upload-datei');
  const urheber    = document.getElementById('upload-urheber')?.value?.trim()||'';
  const quelle     = urheber; // Quelle = Urheber (ein Feld)
  const caption    = document.getElementById('upload-caption')?.value?.trim()||'';
  const altText    = document.getElementById('upload-alt')?.value?.trim()||'';
  const errEl      = document.getElementById('upload-error');
  const progEl     = document.getElementById('upload-progress');
  const btn        = document.getElementById('upload-btn');

  const zeigeErr = (msg) => {
    errEl.innerHTML = `<div class="alert alert-danger mt-2"><span class="alert-icon">❌</span><span>${esc(msg)}</span></div>`;
  };
  errEl.innerHTML = '';

  if (!dateiInput?.files?.length) { zeigeErr('Bitte Datei auswählen.'); return; }
  if (!urheber) { zeigeErr('Fotograf / Urheber / Quelle ist Pflichtfeld.'); return; }

  const datei = dateiInput.files[0];
  if (datei.size > 10 * 1024 * 1024) { zeigeErr('Datei zu groß (max. 10 MB).'); return; }

  btn.disabled = true;
  progEl.style.display = 'flex';

  try {
    // Session prüfen
    const session = await Backend.session();
    if (!session) throw new Error('Nicht angemeldet – bitte neu einloggen.');
    console.log('Session vorhanden:', session.user.id);

    // 1. Datei in Supabase Storage hochladen
    const userId    = Auth.id();
    const dateiname = `${Date.now()}_${datei.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const pfad      = `${userId}/${erfolgId}/${dateiname}`;

    const { data: uploadData, error: uploadError } = await Backend.client.storage
      .from('achievement-media')
      .upload(pfad, datei, {
        cacheControl: '3600',
        upsert: false,
        contentType: datei.type,
      });

    if (uploadError) {
      console.error('Storage Upload Fehler:', uploadError);
      throw new Error('Storage Upload: ' + uploadError.message);
    }
    console.log('Storage Upload OK:', uploadData);

    // 2. Metadaten in achievement_media speichern
    const metadaten = {
      achievement_id:   erfolgId,
      storage_path:     uploadData.path || pfad,
      original_name:    datei.name,
      mime_type:        datei.type,
      file_size:        datei.size || null,
      creator:          urheber,
      copyright_holder: urheber,
      source:           quelle,
      caption:          caption || null,
      alt_text:         altText || null,
      uploaded_by:      userId || null,
      created_at:       new Date().toISOString(),
    };
    console.log('Metadaten:', metadaten);

    const { error: metaError } = await Backend.client
      .from('achievement_media')
      .insert([metadaten]);

    if (metaError) {
      await Backend.client.storage.from('achievement-media').remove([pfad]);
      throw new Error('Metadaten-Fehler: ' + metaError.message);
    }

    // Erfolg
    document.querySelector('.modal-overlay')?.remove();
    toast('Bild erfolgreich hochgeladen! ✅', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: erfolgId });

  } catch(e) {
    debug('Bild-Upload Fehler: ' + e.message);
    zeigeErr(e.message);
    btn.disabled = false;
    progEl.style.display = 'none';
  }
}

function pruefePwStaerke(pw) {
  const fill=document.getElementById('pw-staerke-fill');
  const text=document.getElementById('pw-staerke-text');
  if(!fill||!text) return;
  if(!pw){fill.style.width='0%';text.textContent='';return;}
  let p=0;
  if(pw.length>=12) p++;
  if(pw.length>=16) p++;
  if(/[A-Z]/.test(pw)) p++;
  if(/[a-z]/.test(pw)) p++;
  if(/[0-9]/.test(pw)) p++;
  if(/[^A-Za-z0-9]/.test(pw)) p++;
  const stufen=[
    {min:0,max:1,label:'Sehr schwach',farbe:'#E8001D',breite:'15%'},
    {min:2,max:2,label:'Schwach',farbe:'#E67E00',breite:'30%'},
    {min:3,max:3,label:'Mittel',farbe:'#F5A800',breite:'55%'},
    {min:4,max:4,label:'Gut',farbe:'#1A7A3C',breite:'75%'},
    {min:5,max:6,label:'Stark',farbe:'#0D5C2E',breite:'100%'},
  ];
  const s=stufen.find(s=>p>=s.min&&p<=s.max)||stufen[0];
  fill.style.width=s.breite; fill.style.background=s.farbe;
  text.textContent=`Passwortstärke: ${s.label}`; text.style.color=s.farbe;
}

async function speichereEigenesPasswort() {
  const neu=document.getElementById('pw-neu')?.value||'';
  const best=document.getElementById('pw-bestaetigung')?.value||'';
  const btn=document.getElementById('pw-speichern-btn');
  const errEl=document.getElementById('pw-fehler');
  const errTxt=document.getElementById('pw-fehler-text');
  const okEl=document.getElementById('pw-erfolg');
  const zeigeErr=(msg)=>{errTxt.textContent=msg;errEl.style.display='flex';okEl.style.display='none';};
  if(neu.length<12){zeigeErr('Mindestens 12 Zeichen erforderlich.');return;}
  if(neu!==best){zeigeErr('Passwörter stimmen nicht überein.');return;}
  btn.disabled=true; btn.textContent='Wird gespeichert...';
  try {
    await Auth.aenderePasswort(neu);
    errEl.style.display='none'; okEl.style.display='flex';
    document.getElementById('pw-neu').value='';
    document.getElementById('pw-bestaetigung').value='';
    document.getElementById('pw-staerke-fill').style.width='0%';
    document.getElementById('pw-staerke-text').textContent='';
    toast('Passwort erfolgreich geändert!','success');
  } catch(e) {
    zeigeErr(e.message);
  } finally {
    btn.disabled=false; btn.textContent='🔑 Passwort ändern';
  }
}

// ── Jahreschronik ─────────────────────────────────────────────
async function renderJahreschronik() {
  const alle=await ladeErfolge();
  const schuljahre=[...new Set(alle.map(e=>SLZB_DB.getSchuljahr(e.datum)).filter(Boolean))].sort().reverse();
  const aktuellesSchuljahr=schuljahre[0]||'';
  return`<div class="page">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div><h1>📅 Jahreschronik</h1></div>
      <button class="btn btn-outline btn-sm" onclick="exportiereChronikCSVAktuell()" style="white-space:nowrap">
        ⬇️ CSV exportieren
      </button>
      <button class="btn btn-primary btn-sm" onclick="exportiereChronikPPTX()" style="white-space:nowrap">
        📊 PowerPoint exportieren
      </button>
    </div>
    <div class="card mb-3"><div class="card-body">
      <div class="form-row cols-4">
        <div class="form-group"><label>Schuljahr</label>
          <select id="chr-schuljahr" onchange="aktualisiereChronik()">
            <option value="">Alle Schuljahre</option>
            ${schuljahre.map(j=>`<option value="${j}"${j===aktuellesSchuljahr?' selected':''}>${j}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Sportart</label>
          <select id="chr-sportart" onchange="aktualisiereChronik()">
            <option value="">Alle</option>
            ${SLZB_DB.sportarten.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Ebene</label>
          <select id="chr-ebene" onchange="aktualisiereChronik()">
            <option value="">Alle</option>
            ${['Schulebene','Bezirk','Landesebene','Bundesebene','International'].map(e=>`<option>${e}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Typ</label>
          <select id="chr-typ" onchange="aktualisiereChronik()">
            <option value="">Alle</option>
            <option value="Einzelerfolg">Einzelerfolge</option>
            <option value="Teamerfolg">Teamerfolge</option>
          </select></div>
      </div>
      <div class="flex gap-2 mt-2">
        <button class="btn btn-outline btn-sm" onclick="druckeChronik()">🖨️ Drucken</button>
        <button class="btn btn-outline btn-sm" onclick="exportiereChronikCSV()">⬇️ CSV-Export</button>
      </div>
    </div></div>
    <div id="chronik-inhalt">${renderChronikInhalt(alle,aktuellesSchuljahr,'','','')}</div>
  </div>`;
}

function renderChronikInhalt(alle,schuljahr,sportartId,ebene,typ) {
  let gefiltert=alle.filter(e=>['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if(schuljahr) gefiltert=gefiltert.filter(e=>SLZB_DB.getSchuljahr(e.datum)===schuljahr);
  if(sportartId) gefiltert=gefiltert.filter(e=>e.sportartId===sportartId);
  if(ebene) gefiltert=gefiltert.filter(e=>e.ebene===ebene);
  if(typ) gefiltert=gefiltert.filter(e=>e.meldungsart===typ);
  gefiltert.sort((a,b)=>new Date(b.datum)-new Date(a.datum));
  if(!gefiltert.length) return`<div class="alert alert-info"><span class="alert-icon">ℹ️</span><span>Keine freigegebenen Erfolge für die gewählten Filter.</span></div>`;
  const goldCount=gefiltert.filter(e=>e.medaille==='Gold').length;
  const silberCount=gefiltert.filter(e=>e.medaille==='Silber').length;
  const bronzeCount=gefiltert.filter(e=>e.medaille==='Bronze').length;
  const gruppen={};
  gefiltert.forEach(e=>{const key=SLZB_DB.getSportart(e.sportartId)?.name||'Sonstige';if(!gruppen[key])gruppen[key]=[];gruppen[key].push(e);});
  const mi={Gold:'🥇',Silber:'🥈',Bronze:'🥉'};
  return`
    <div class="grid grid-4 mb-4">
      <div class="stat-card"><div class="stat-icon blue">🏆</div><div><div class="stat-value">${gefiltert.length}</div><div class="stat-label">Erfolge gesamt</div></div></div>
      <div class="stat-card"><div class="stat-icon gold">🥇</div><div><div class="stat-value">${goldCount}</div><div class="stat-label">Gold</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#F1F5F9;color:#475569">🥈</div><div><div class="stat-value">${silberCount}</div><div class="stat-label">Silber</div></div></div>
      <div class="stat-card"><div class="stat-icon orange">🥉</div><div><div class="stat-value">${bronzeCount}</div><div class="stat-label">Bronze</div></div></div>
    </div>
    <div id="chronik-druck">
      <div style="display:none" class="chronik-druckkopf">
        <h2 style="color:#003366">SLZB Berlin – Jahreschronik ${schuljahr||'Alle Jahre'}</h2>
        <p style="color:#6B7A99;font-size:.85rem">Erstellt am ${new Date().toLocaleDateString('de-DE')}</p>
        <hr style="margin:12px 0">
      </div>
      ${Object.entries(gruppen).map(([sportart,erfolge])=>`
        <div class="card mb-3">
          <div class="card-header" style="background:var(--slzb-light)">
            <h2>🏅 ${esc(sportart)}</h2>
            <span class="badge badge-info">${erfolge.length}</span>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Datum</th><th>Titel</th><th>Disziplin</th><th>Ebene</th><th>Platz</th><th>Medaille</th><th>Ergebnis</th></tr></thead>
            <tbody>${erfolge.map(e=>`<tr style="cursor:pointer" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
              <td class="text-sm">${fmt(e.datum)}</td>
              <td><strong>${esc(e.titel)}</strong></td>
              <td class="text-sm">${esc(e.disziplin||'–')}</td>
              <td>${ebeneBadge(e.ebene)}</td>
              <td class="text-sm font-bold">${e.platzierung?e.platzierung+'.':'–'}</td>
              <td>${e.medaille&&e.medaille!=='keine'?mi[e.medaille]+' '+e.medaille:'–'}</td>
              <td class="text-sm">${e.ergebnisWert?e.ergebnisWert+' '+esc(e.ergebnisEinheit||''):esc(e.ergebnisText||'–')}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>`).join('')}
    </div>`;
}

async function aktualisiereChronik() {
  const schuljahr=document.getElementById('chr-schuljahr')?.value||'';
  const sportartId=document.getElementById('chr-sportart')?.value||'';
  const ebene=document.getElementById('chr-ebene')?.value||'';
  const typ=document.getElementById('chr-typ')?.value||'';
  const alle=await ladeErfolge();
  const inhalt=document.getElementById('chronik-inhalt');
  if(inhalt) inhalt.innerHTML=renderChronikInhalt(alle,schuljahr,sportartId,ebene,typ);
}

function druckeChronik() {
  document.querySelectorAll('.chronik-druckkopf').forEach(el=>el.style.display='block');
  window.print();
  setTimeout(()=>document.querySelectorAll('.chronik-druckkopf').forEach(el=>el.style.display='none'),1000);
}

async function exportiereChronikCSV() {
  const schuljahr=document.getElementById('chr-schuljahr')?.value||'';
  const sportartId=document.getElementById('chr-sportart')?.value||'';
  const ebene=document.getElementById('chr-ebene')?.value||'';
  const typ=document.getElementById('chr-typ')?.value||'';
  const alle=await ladeErfolge();
  let gefiltert=alle.filter(e=>['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if(schuljahr) gefiltert=gefiltert.filter(e=>SLZB_DB.getSchuljahr(e.datum)===schuljahr);
  if(sportartId) gefiltert=gefiltert.filter(e=>e.sportartId===sportartId||e.sportartText===SLZB_DB.getSportart(sportartId)?.name);
  if(ebene) gefiltert=gefiltert.filter(e=>e.ebene===ebene);
  if(typ) gefiltert=gefiltert.filter(e=>e.meldungsart===typ);
  gefiltert.sort((a,b)=>new Date(b.datum)-new Date(a.datum));
  PDF.exportiereChronikCSV(gefiltert,schuljahr);
  toast('CSV-Export heruntergeladen','success');
}

// ══════════════════════════════════════════════════════════════
// GENERISCHER POSTER-BILD-UPLOAD (Variante 1: nur Storage)
// Kein achievement_media-Eintrag – nur Storage + Signed URL
// ══════════════════════════════════════════════════════════════
async function uploadPosterBild(dateiInput, kategorie='poster') {
  if (!dateiInput?.files?.length) return null;
  const datei = dateiInput.files[0];
  if (datei.size > 10*1024*1024) { toast('Datei zu groß (max. 10 MB)','warning'); return null; }
  const session = await Backend.session();
  if (!session) { toast('Nicht angemeldet','danger'); return null; }
  const userId = Auth.id();
  const dateiname = `${Date.now()}_${datei.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const pfad = `${userId}/${kategorie}/${dateiname}`;
  const { data: uploadData, error: uploadError } = await Backend.client.storage
    .from('achievement-media')
    .upload(pfad, datei, { cacheControl:'3600', upsert:false, contentType:datei.type });
  if (uploadError) { toast('Upload-Fehler: '+uploadError.message,'danger'); return null; }
  const { data: signed } = await Backend.client.storage
    .from('achievement-media').createSignedUrl(uploadData.path||pfad, 3600);
  return signed?.signedUrl || null;
}

// Hilfsfunktion: Datei-Input mit Vorschau-Thumbnail
function posterBildInputHTML(inputId, labelText='Hintergrundbild') {
  return `<div class="form-group" style="grid-column:1/-1">
    <label style="color:#fff">${esc(labelText)} <span style="color:#888;font-size:.75rem">(Upload oder URL)</span></label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input type="file" id="${inputId}-file" accept="image/*"
        style="flex:1;min-width:180px;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:6px"
        onchange="posterBildVorschau('${inputId}')">
      <span style="color:#888;font-size:.8rem">oder</span>
      <input type="text" id="${inputId}-url" placeholder="https://..."
        style="flex:2;min-width:180px;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
    </div>
    <div id="${inputId}-thumb" style="margin-top:6px;display:none">
      <img id="${inputId}-thumb-img" style="height:60px;border-radius:6px;object-fit:cover" alt="Vorschau">
    </div>
  </div>`;
}

function posterBildVorschau(inputId) {
  const file = document.getElementById(`${inputId}-file`)?.files?.[0];
  if (!file) return;
  const thumb = document.getElementById(`${inputId}-thumb`);
  const img = document.getElementById(`${inputId}-thumb-img`);
  if (thumb && img) {
    thumb.style.display='block';
    img.src = URL.createObjectURL(file);
  }
}

// Bild laden: erst File-Input, dann URL-Feld
async function posterBildLaden(inputId, kategorie='poster') {
  const fileInput = document.getElementById(`${inputId}-file`);
  const urlInput = document.getElementById(`${inputId}-url`);
  if (fileInput?.files?.length) {
    // Upload zu Supabase Storage
    const signedUrl = await uploadPosterBild(fileInput, kategorie);
    return signedUrl;
  }
  return urlInput?.value?.trim() || null;
}


// Ersatzbild-Modus umschalten (neutral / farbig)
function setErsatzbildModus(modus) {
  if (typeof SLZB_ERSATZBILD_MODUS !== 'undefined') {
    window.SLZB_ERSATZBILD_MODUS = modus;
    // Auch in poster.js setzen (globale Variable)
    if (typeof zeichneErsatzbild !== 'undefined') {
      // poster.js Variable direkt setzen
      eval('SLZB_ERSATZBILD_MODUS = "' + modus + '"');
    }
  }
}
// ══════════════════════════════════════════════════════════════
// FEATURE 1: HIGHLIGHTS-KARUSSELL MODAL
// ══════════════════════════════════════════════════════════════
async function zeigeHighlightsKarussell() {
  const alle = await ladeErfolge();
  const jetzt = new Date();
  const monat = jetzt.getMonth();
  const jahr = jetzt.getFullYear();

  // Vormonat berechnen
  const vormonat = monat === 0 ? 11 : monat - 1;
  const vormonatJahr = monat === 0 ? jahr - 1 : jahr;
  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  // Erfolge des Vormonats (freigegeben/veröffentlicht)
  const highlights = alle.filter(e => {
    if (!['Freigegeben','Veröffentlicht'].includes(e.status)) return false;
    const d = e.datum ? new Date(e.datum) : null;
    if (!d) return false;
    return d.getMonth() === vormonat && d.getFullYear() === vormonatJahr;
  }).slice(0, 10);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';

  const monatLabel = `${monatNamen[vormonat]} ${vormonatJahr}`;

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🎠 Highlights-Karussell – ${esc(monatLabel)}</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      ${highlights.length === 0 ? `<div class="alert alert-warning"><span class="alert-icon">⚠️</span><span>Keine freigegebenen Erfolge für ${esc(monatLabel)} gefunden.</span></div>` : `
      <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
        <span>${highlights.length} Erfolge gefunden. Jede Karte einzeln herunterladen.</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${highlights.map((_,i)=>`<button class="tab-btn ${i===0?'active':''}" onclick="highlightKarteZeigen(${i})">${i+1}</button>`).join('')}
      </div>
      <div style="text-align:center">
        <canvas id="highlight-canvas" width="1080" height="1080"
          style="max-width:100%;max-height:55vh;display:block;margin:0 auto;border-radius:8px"></canvas>
        <p class="text-xs mt-2" style="color:#888" id="highlight-info">Karte 1 von ${highlights.length}</p>
      </div>`}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Schließen</button>
      ${highlights.length>0?`
      <button class="btn btn-outline" onclick="highlightAlleHerunterladen()">⬇️ Alle herunterladen</button>
      <button class="btn btn-primary" onclick="highlightKarteHerunterladen()">🖼️ Diese Karte</button>`:''}
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  if (highlights.length > 0) {
    window._highlightErfolge = highlights;
    window._highlightAktuell = 0;
    window._highlightMonat = monatLabel;
    setTimeout(()=>highlightKarteZeigen(0), 100);
  }
}

async function highlightKarteZeigen(nr) {
  const erfolge = window._highlightErfolge || [];
  if (!erfolge[nr]) return;
  window._highlightAktuell = nr;
  const e = await DB.getErfolgById(erfolge[nr].id);
  document.querySelectorAll('.modal .tabs .tab-btn, .modal .tab-btn').forEach((b,i)=>{
    b.classList.toggle('active', i===nr);
  });
  const info = document.getElementById('highlight-info');
  if (info) info.textContent = `Karte ${nr+1} von ${erfolge.length} · ${e.titel||''}`;
  await zeichneHighlightKarte('highlight-canvas', e, nr+1, erfolge.length);
}

function highlightKarteHerunterladen() {
  const canvas = document.getElementById('highlight-canvas');
  if (!canvas) return;
  const nr = (window._highlightAktuell||0)+1;
  const monat = (window._highlightMonat||'highlights').replace(/\s/g,'-');
  const a = document.createElement('a');
  a.download = `SLZB_Highlight_${monat}_${nr}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

async function highlightAlleHerunterladen() {
  const erfolge = window._highlightErfolge || [];
  toast(`${erfolge.length} Karten werden generiert...`,'info');
  for (let i=0; i<erfolge.length; i++) {
    await highlightKarteZeigen(i);
    await new Promise(r=>setTimeout(r,300));
    highlightKarteHerunterladen();
    await new Promise(r=>setTimeout(r,200));
  }
  toast('Alle Karten heruntergeladen!','success');
}

// ══════════════════════════════════════════════════════════════
// FEATURE 2: NACHWUCHSSPORTLER-WAHL MODAL
// ══════════════════════════════════════════════════════════════
function zeigeNachwuchswahlModal() {
  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const jetzt = new Date();
  const aktMonat = monatNamen[jetzt.getMonth()];
  const aktJahr = jetzt.getFullYear();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>🏆 Nachwuchssportler-Wahl</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">

      <!-- Modus-Auswahl -->
      <div class="tabs mb-3" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="tab-btn active" id="nw-tab-monat" onclick="nwModusWechsel('monat')">📅 Monat</button>
        <button class="tab-btn" id="nw-tab-jahr" onclick="nwModusWechsel('jahr')">🏆 Jahr</button>
        <button class="tab-btn" id="nw-tab-sieger" onclick="nwModusWechsel('sieger')">🥇 Sieger melden</button>
      </div>

      <!-- Monat/Jahr-Felder -->
      <div id="nw-felder-wahl" class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="color:#fff" id="nw-zeitraum-label">Monat</label>
          <input type="text" id="nw-monat" value="${esc(aktMonat)}" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group" id="nw-link-gruppe">
          <label style="color:#fff">Abstimmungslink (optional)</label>
          <input type="text" id="nw-link" placeholder="z.B. slzb.de/wahl" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
      </div>

      <!-- Sieger-Felder (nur bei Modus sieger) -->
      <div id="nw-felder-sieger" style="display:none" class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="color:#fff">Sieger/in Name <span class="required">*</span></label>
          <input type="text" id="nw-sieger-name" placeholder="Vorname Nachname" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Sportart</label>
          <input type="text" id="nw-sieger-sport" placeholder="z.B. Leichtathletik" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Zeitraum (Monat/Jahr)</label>
          <input type="text" id="nw-sieger-zeitraum" placeholder="z.B. Oktober 2026" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px" value="${esc(aktMonat+' '+aktJahr)}">
        </div>
        ${posterBildInputHTML('nw-sieger-bild','Foto')}
        <div class="form-group" style="grid-column:1/-1">
          <label style="color:#fff">Erfolge (eine pro Zeile)</label>
          <textarea id="nw-sieger-erfolge" rows="4" placeholder="z.B.&#10;🥇 Berliner Meister 100m Sprint&#10;🥈 Deutsche Meisterschaft Staffel&#10;🏆 Schulrekord 200m" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;width:100%"></textarea>
        </div>
      </div>

      <!-- Kandidaten (Wahl-Modus) -->
      <div id="nw-kandidaten-bereich">
        <div id="nw-kandidaten">
          <div class="alert alert-info mb-2"><span class="alert-icon">ℹ️</span><span>Bis zu 3 Kandidaten. Fotos optional per URL.</span></div>
        </div>
        <button class="btn btn-ghost btn-sm mb-3" onclick="nwKandidatHinzu()">+ Kandidat/in hinzufügen</button>
      </div>

      <div style="text-align:center;background:#0a0a1e;padding:16px;border-radius:8px">
        <canvas id="nw-canvas" width="1080" height="1350"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline" onclick="nwVorschau()">👁️ Vorschau</button>
      <button class="btn btn-primary" onclick="nwHerunterladen()">🖼️ PNG herunterladen</button>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  window._nwModus = 'monat';
  window._nwKandidaten = [];
  nwKandidatHinzu();
}

function nwModusWechsel(modus) {
  window._nwModus = modus;
  ['monat','jahr','sieger'].forEach(m=>{
    const btn = document.getElementById(`nw-tab-${m}`);
    if (btn) btn.classList.toggle('active', m===modus);
  });
  const felder = document.getElementById('nw-felder-wahl');
  const sieger = document.getElementById('nw-felder-sieger');
  const kandidaten = document.getElementById('nw-kandidaten-bereich');
  const label = document.getElementById('nw-zeitraum-label');
  const linkGruppe = document.getElementById('nw-link-gruppe');
  const monatInput = document.getElementById('nw-monat');

  if (modus === 'sieger') {
    if (felder) felder.style.display = 'none';
    if (sieger) sieger.style.display = '';
    if (kandidaten) kandidaten.style.display = 'none';
  } else {
    if (felder) felder.style.display = '';
    if (sieger) sieger.style.display = 'none';
    if (kandidaten) kandidaten.style.display = '';
    if (modus === 'jahr') {
      if (label) label.textContent = 'Jahr';
      if (monatInput) monatInput.placeholder = 'z.B. 2026';
      if (linkGruppe) linkGruppe.style.display = '';
    } else {
      if (label) label.textContent = 'Monat';
      if (monatInput) monatInput.placeholder = '';
      if (linkGruppe) linkGruppe.style.display = '';
    }
  }
}

async function nwVorschau() {
  const modus = window._nwModus || 'monat';

  if (modus === 'sieger') {
    // Sieger-Poster
    const name = document.getElementById('nw-sieger-name')?.value||'';
    const sport = document.getElementById('nw-sieger-sport')?.value||'';
    const zeitraum = document.getElementById('nw-sieger-zeitraum')?.value||'';
    const erfolgeText = document.getElementById('nw-sieger-erfolge')?.value||'';
    const erfolge = erfolgeText.split('\n').map(s=>s.trim()).filter(Boolean);
    if (!name) { toast('Name ist Pflichtfeld','warning'); return; }
    const bildUrl = await posterBildLaden('nw-sieger-bild','poster-nachwuchs');
    await zeichneNachwuchsSiegerPoster('nw-canvas', {name, sport, zeitraum, bildUrl, erfolge});
  } else {
    // Wahl-Poster
    const monat = document.getElementById('nw-monat')?.value||'';
    const link = document.getElementById('nw-link')?.value||'';
    const kandidaten = [];
    document.querySelectorAll('.nw-kandidat').forEach((div)=>{
      const id = div.querySelector('[id^="nw-name-"]')?.id?.replace('nw-name-','');
      if (!id) return;
      const erfolgeRaw = document.getElementById(`nw-erfolge-${id}`)?.value||'';
      kandidaten.push({
        name: document.getElementById(`nw-name-${id}`)?.value||'',
        sportart: document.getElementById(`nw-sport-${id}`)?.value||'',
        bild: document.getElementById(`nw-bild-${id}`)?.value||null,
        erfolge: erfolgeRaw.split('\n').map(s=>s.trim()).filter(Boolean),
      });
    });
    const titel = modus==='jahr' ? `Nachwuchssportler/in des Jahres ${monat}` : null;
    await zeichneNachwuchswahlPoster('nw-canvas', {monat, kandidaten, abstimmungslink: link, titelOverride: titel});
  }
}

function nwHerunterladen() {
  const canvas = document.getElementById('nw-canvas');
  if (!canvas) return;
  const modus = window._nwModus||'monat';
  const zeitraum = modus==='sieger'
    ? (document.getElementById('nw-sieger-zeitraum')?.value||'sieger').replace(/\s/g,'-')
    : (document.getElementById('nw-monat')?.value||'wahl').replace(/\s/g,'-');
  const prefix = modus==='sieger' ? 'Sieger' : modus==='jahr' ? 'JahresSieger' : 'Wahl';
  const a = document.createElement('a');
  a.download = `SLZB_Nachwuchs${prefix}_${zeitraum}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ══════════════════════════════════════════════════════════════
// FEATURE 3: COUNTDOWN-POSTER MODAL
// ══════════════════════════════════════════════════════════════

function cdFormatWechsel(format) {
  window._cdFormat = format;
  document.querySelectorAll('.modal .tab-btn').forEach(b=>{
    const t=b.textContent.toLowerCase();
    b.classList.toggle('active',(format==='hochformat'&&t.includes('hochformat'))||(format==='querformat'&&t.includes('querformat'))||(format==='a3'&&t.includes('a3')));
  });
  const canvas = document.getElementById('cd-canvas');
  if (canvas) {
    if (format==='querformat') { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='45vh'; }
    else if (format==='a3') { canvas.width=1587; canvas.height=1123; canvas.style.maxHeight='45vh'; }
    else { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='60vh'; }
  }
}

async function cdVorschau() {
  const name = document.getElementById('cd-name')?.value||'';
  const datum = document.getElementById('cd-datum')?.value||'';
  const ort = document.getElementById('cd-ort')?.value||'';
  if (!name||!datum) { toast('Event-Name und Datum sind Pflichtfelder','warning'); return; }
  const format = window._cdFormat||'hochformat';
  cdFormatWechsel(format);
  const bildUrl = await posterBildLaden('cd-bild','poster-countdown');
  const sportartCd = document.getElementById('cd-sportart')?.value||'';
  const opts = { eventName:name, eventDatum:datum, ort, sportart:sportartCd, format: format==='a3'?'hochformat':format, hintergrundbild:bildUrl };
  if (format==='a3') {
    // A3-Druck: Countdown-Zahl + Event-Name im A3-Layout
    const canvas = document.getElementById('cd-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    await ladeMontserrat(); await ladeLogo();
    const W=canvas.width, H=canvas.height;
    const bild = bildUrl ? await ladeBild(bildUrl) : null;
    const eventDatum = datum ? new Date(datum) : null;
    const diff = eventDatum ? eventDatum - new Date() : 0;
    const tage = diff>0 ? Math.floor(diff/(1000*60*60*24)) : 0;
    const datumStr = eventDatum ? eventDatum.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : '';
    const karteOpts = {
      subtitle: 'COUNTDOWN',
      vorname: tage>0 ? `NOCH ${tage}` : 'HEUTE',
      nachname: tage===1?'TAG':'TAGE',
      titel: null,
      zusatz: [name, ort, datumStr].filter(Boolean).join(' · '),
      wettbewerb: name,
    };
    await zeichnePosterA3Allgemein(ctx, W, H, bild, karteOpts, 'gruen', datumStr);
  } else {
    await zeichneCountdownPoster('cd-canvas', opts);
  }
  // Countdown-Info
  const eventD = new Date(datum);
  const diff = eventD - new Date();
  const info = document.getElementById('cd-info');
  if (info) {
    if (diff<=0) info.textContent='Event hat bereits stattgefunden';
    else {
      const t=Math.floor(diff/(1000*60*60*24)), h=Math.floor((diff%(1000*60*60*24))/(1000*60*60));
      info.textContent=`Noch ${t} Tag(e) und ${h} Stunde(n) bis zum Event`;
    }
  }
}

function cdHerunterladen() {
  const canvas = document.getElementById('cd-canvas');
  if (!canvas) return;
  const name = (document.getElementById('cd-name')?.value||'countdown').replace(/\s/g,'-');
  const a = document.createElement('a');
  a.download = `SLZB_Countdown_${name}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ══════════════════════════════════════════════════════════════
// NAVIGIERBARE SEITEN für Highlights, Nachwuchswahl, Countdown
// ══════════════════════════════════════════════════════════════

function renderHighlightsSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>🎠 Highlights-Karussell</h1>
      <p>Monatliche Top-Erfolge als Social-Media-Karussell-Serie</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Es werden automatisch alle <strong>freigegebenen Erfolge des Vormonats</strong> geladen und als einzelne 1080×1080px Karten im SLZB-Stil erstellt.</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Jede Karte zeigt: Foto, Sportart, Titel, Platzierung und Karussell-Nummer (z.B. „3 / 7"). Ideal für Instagram-Karussell-Posts.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeHighlightsKarussell()" style="white-space:nowrap">
            🎠 Karussell erstellen
          </button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Hinweise</h2></div>
      <div class="card-body">
        <ul style="padding-left:20px;line-height:2">
          <li>Nur Erfolge mit Status <strong>Freigegeben</strong> oder <strong>Veröffentlicht</strong> werden berücksichtigt</li>
          <li>Bilder werden aus Supabase Storage geladen (Signed URLs)</li>
          <li>Jede Karte kann einzeln oder alle auf einmal heruntergeladen werden</li>
          <li>Kein automatisches Posting – Export als PNG</li>
        </ul>
      </div>
    </div>
  </div>`;
}

function renderNachwuchswahlSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>🏆 Nachwuchssportler/in des Monats</h1>
      <p>Abstimmungsaufruf für Social Media erstellen</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Erstelle ein Abstimmungsposter mit bis zu <strong>3 Kandidaten</strong> im SLZB-Stil (1080×1350px).</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Kandidaten mit Name, Sportart und optionalem Foto-Link eingeben. Abstimmungslink optional. Export als PNG.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeNachwuchswahlModal()" style="white-space:nowrap">
            🏆 Poster erstellen
          </button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Aufbau des Posters</h2></div>
      <div class="card-body">
        <ul style="padding-left:20px;line-height:2">
          <li>Blauer SLZB-Header mit Logo</li>
          <li>„JETZT ABSTIMMEN!" in weiß/blau</li>
          <li>Kandidaten-Fotos als Kreise mit blauem Rahmen</li>
          <li>Name und Sportart unter jedem Foto</li>
          <li>„Jetzt abstimmen!"-Button mit optionalem Link</li>
          <li>SLZB-Footer mit #SLZBerlin</li>
        </ul>
      </div>
    </div>
  </div>`;
}

function renderCountdownSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>⏳ Countdown-Poster</h1>
      <p>Countdown bis zu einem Event erstellen</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Erstelle ein Countdown-Poster für ein bevorstehendes Event – in <strong>Hochformat (4:5)</strong> oder <strong>Querformat (16:9)</strong>.</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Event-Name, Datum/Uhrzeit und Ort eingeben. Optionales Hintergrundbild per URL. Der Countdown wird automatisch berechnet.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeCountdownModal()" style="white-space:nowrap">
            ⏳ Countdown erstellen
          </button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Aufbau des Posters</h2></div>
      <div class="card-body">
        <ul style="padding-left:20px;line-height:2">
          <li>Blauer SLZB-Header mit Logo</li>
          <li>Große rote Countdown-Zahl (Tage / Stunden / Minuten)</li>
          <li>Event-Name zweizeilig weiß/rot</li>
          <li>Datum und Ort</li>
          <li>Optionales Hintergrundbild mit dunklem Overlay</li>
          <li>Am Event-Tag: „HEUTE!" statt Countdown</li>
        </ul>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// JUBILÄUMS-POSTER (Gold)
// ══════════════════════════════════════════════════════════════
function renderJubilaeumSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>🏅 Jubiläums-Poster</h1>
      <p>Festliche Poster für Jubiläen, Ehrungen und besondere Anlässe</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Goldener Akzent für Jubiläen, runde Geburtstage, Schuljubiläen und Festveranstaltungen.</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Titel, Untertitel, Datum und optionales Hintergrundbild. Export als PNG in Hoch- oder Querformat.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeJubilaeumModal()" style="white-space:nowrap;background:#C9A227;border-color:#C9A227">
            🏅 Poster erstellen
          </button>
        </div>
      </div>
    </div>
  </div>`;
}


function jubFormatWechsel(format) {
  window._jubFormat = format;
  document.querySelectorAll('.modal .tab-btn').forEach(b=>{
    const t=b.textContent.toLowerCase();
    b.classList.toggle('active',(format==='hochformat'&&t.includes('hochformat'))||(format==='querformat'&&t.includes('querformat'))||(format==='a3'&&t.includes('a3')));
  });
  const canvas = document.getElementById('jub-canvas');
  if (canvas) {
    if (format==='querformat') { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='45vh'; }
    else if (format==='a3') { canvas.width=1587; canvas.height=1123; canvas.style.maxHeight='45vh'; }
    else { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='60vh'; }
  }
}

async function jubVorschau() {
  const titel = document.getElementById('jub-titel')?.value||'';
  const untertitel = document.getElementById('jub-untertitel')?.value||'';
  const datum = document.getElementById('jub-datum')?.value||'';
  const ort = document.getElementById('jub-ort')?.value||'';
  if (!titel) { toast('Titel ist Pflichtfeld','warning'); return; }
  const format = window._jubFormat||'hochformat';
  jubFormatWechsel(format);
  const canvas = document.getElementById('jub-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  const W=canvas.width, H=canvas.height;
  const bildUrl = await posterBildLaden('jub-bild','poster-jubilaeum');
  const bild = bildUrl ? await ladeBild(bildUrl) : null;
  const datumStr = datum ? new Date(datum).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : '';
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  const karteOpts = { subtitle: untertitel||'JUBILÄUM', vorname: vorname||null, nachname, titel: teile.length===1?titel:null, zusatz:ort, wettbewerb:datumStr };
  if (format==='a3') {
    await zeichnePosterA3Allgemein(ctx, W, H, bild, karteOpts, 'gold', datumStr);
  } else {
    zeichneSlzbHintergrund(ctx, W, H, bild, 'gold');
    zeichneSlzbDeko(ctx, W, H);
    zeichneSlzbHeader(ctx, W, H, untertitel||'Jubiläum', datumStr, 'gold');
    zeichneSlzbKarte(ctx, W, H, karteOpts, 'gold');
    zeichneSlzbFooterNeu(ctx, W, H, 'gold');
  }
}

function jubHerunterladen() {
  const canvas = document.getElementById('jub-canvas');
  if (!canvas) return;
  const titel = (document.getElementById('jub-titel')?.value||'jubilaeum').replace(/\s/g,'-');
  const a = document.createElement('a');
  a.download = `SLZB_Jubilaeum_${titel}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ══════════════════════════════════════════════════════════════
// SCHULNACHRICHTEN-POSTER (Grau/Stahlblau)
// ══════════════════════════════════════════════════════════════
function renderSchulnachrichtenSeite() {
  return `<div class="page">
    <div class="page-header">
      <h1>📰 Schulnachrichten-Poster</h1>
      <p>Informationsplakate für schulinterne Mitteilungen und Ankündigungen</p>
    </div>
    <div class="card mb-3">
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Neutraler Stahlblau-Grau-Akzent für allgemeine Schulnachrichten, Ankündigungen und Informationen.</span></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Überschrift, Nachrichtentext, Datum und optionales Bild. Ideal für Digital Signage und Aushänge.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeSchulnachrichtModal()" style="white-space:nowrap;background:#8A9BB0;border-color:#8A9BB0">
            📰 Poster erstellen
          </button>
        </div>
      </div>
    </div>
  </div>`;
}


function snFormatWechsel(format) {
  window._snFormat = format;
  document.querySelectorAll('.modal .tab-btn').forEach(b=>{
    const t=b.textContent.toLowerCase();
    b.classList.toggle('active',(format==='hochformat'&&t.includes('hochformat'))||(format==='querformat'&&t.includes('querformat'))||(format==='a3'&&t.includes('a3')));
  });
  const canvas = document.getElementById('sn-canvas');
  if (canvas) {
    if (format==='querformat') { canvas.width=1920; canvas.height=1080; canvas.style.maxHeight='45vh'; }
    else if (format==='a3') { canvas.width=1587; canvas.height=1123; canvas.style.maxHeight='45vh'; }
    else { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='60vh'; }
  }
}

async function snVorschau() {
  const titel = document.getElementById('sn-titel')?.value||'';
  const kategorie = document.getElementById('sn-kategorie')?.value||'';
  const datum = document.getElementById('sn-datum')?.value||'';
  const text = document.getElementById('sn-text')?.value||'';
  if (!titel) { toast('Überschrift ist Pflichtfeld','warning'); return; }
  const format = window._snFormat||'hochformat';
  snFormatWechsel(format);
  const canvas = document.getElementById('sn-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  const W=canvas.width, H=canvas.height;
  const bildUrl = await posterBildLaden('sn-bild','poster-schulnachricht');
  const bild = bildUrl ? await ladeBild(bildUrl) : null;
  const datumStr = datum ? new Date(datum).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : '';
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  const karteOpts = { subtitle:kategorie||'INFORMATION', vorname:vorname||null, nachname, titel:teile.length===1?titel:null, zusatz:text?text.slice(0,80)+(text.length>80?'…':''):datumStr, wettbewerb:datumStr };
  if (format==='a3') {
    await zeichnePosterA3Allgemein(ctx, W, H, bild, karteOpts, 'grau', datumStr);
  } else {
    zeichneSlzbHintergrund(ctx, W, H, bild, 'grau');
    zeichneSlzbDeko(ctx, W, H);
    zeichneSlzbHeader(ctx, W, H, kategorie||'Schulnachricht', datumStr, 'grau');
    zeichneSlzbKarte(ctx, W, H, karteOpts, 'grau');
    zeichneSlzbFooterNeu(ctx, W, H, 'grau');
  }
}

function snHerunterladen() {
  const canvas = document.getElementById('sn-canvas');
  if (!canvas) return;
  const titel = (document.getElementById('sn-titel')?.value||'schulnachricht').replace(/\s/g,'-');
  const a = document.createElement('a');
  a.download = `SLZB_Nachricht_${titel}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ══════════════════════════════════════════════════════════════
// KALENDER-ANSICHT
// ══════════════════════════════════════════════════════════════
function kalenderFilter(key, value) {
  if (!window._kalenderState) window._kalenderState = {};
  window._kalenderState[key] = value;
  navigateTo('kalender');
}

function kalenderMonatSchnell(delta) {
  // Schnellnavigation: +1/-1 Monat, +12/-12 Jahr
  if (!window._kalenderState) window._kalenderState = {};
  let m = (window._kalenderState.monat||new Date().getMonth()) + delta;
  let j = window._kalenderState.jahr || new Date().getFullYear();
  while (m > 11) { m -= 12; j++; }
  while (m < 0)  { m += 12; j--; }
  window._kalenderState.monat = m;
  window._kalenderState.jahr = j;
  navigateTo('kalender');
}

function kalenderMonatNav(delta) {
  if (!window._kalenderState) window._kalenderState = {};
  let m = (window._kalenderState.monat||0) + delta;
  let j = window._kalenderState.jahr || new Date().getFullYear();
  if (m > 11) { m=0; j++; }
  if (m < 0) { m=11; j--; }
  window._kalenderState.monat = m;
  window._kalenderState.jahr = j;
  navigateTo('kalender');
}


// ══════════════════════════════════════════════════════════════
// KALENDER → COUNTDOWN: Direkt aus Kalendereintrag erstellen
// ══════════════════════════════════════════════════════════════
function kalenderCountdown(termin) {
  // Countdown-Modal öffnen
  zeigeCountdownModal();

  // Felder mit Kalender-Daten vorausfüllen
  setTimeout(() => {
    const nameEl = document.getElementById('cd-name');
    const datumEl = document.getElementById('cd-datum');
    const ortEl = document.getElementById('cd-ort');

    if (nameEl) nameEl.value = termin.veranstaltung || '';
    if (ortEl) ortEl.value = termin.ort || '';
    const sportartEl = document.getElementById('cd-sportart');
    if (sportartEl) sportartEl.value = termin.sportart || '';

    // Datum: aus "07.11.2026" oder "3.-11.11.2026" → datetime-local Format
    if (datumEl && termin.datum) {
      // termin.datum ist bereits ISO: "2026-11-07"
      datumEl.value = termin.datum + 'T10:00'; // Standard: 10:00 Uhr
    }

    // Vorschau automatisch generieren
    cdVorschau();
  }, 200);
}

// ══════════════════════════════════════════════════════════════
// DUBLETTEN-ZUSAMMENFÜHRUNG (Option A)
// Hauptmeldung behalten, Duplikat archivieren
// ══════════════════════════════════════════════════════════════
async function zeigeDublettenModal(erfolgId) {
  toast('Lade Dubletten-Vergleich...', 'info');
  try {
    const e = await DB.getErfolgById(erfolgId);
    if (!e) { toast('Meldung nicht gefunden', 'danger'); return; }

    // Alle anderen Meldungen mit Dublettenverdacht laden
    const alle = await ladeErfolge();
    const kandidaten = alle.filter(k =>
      k.id !== erfolgId &&
      (k.status === 'Dublettenverdacht' || k.dublettenhinweis) &&
      k.sportartText === e.sportartText
    );

    // Auch ähnliche Meldungen (gleiche Sportart + ähnliches Datum)
    const aehnliche = alle.filter(k => {
      if (k.id === erfolgId) return false;
      if (kandidaten.find(c => c.id === k.id)) return false;
      if (k.sportartText !== e.sportartText) return false;
      if (!k.datum || !e.datum) return false;
      const diff = Math.abs(new Date(k.datum) - new Date(e.datum));
      return diff < 7 * 24 * 60 * 60 * 1000; // ±7 Tage
    });

    const vergleichsKandidaten = [...kandidaten, ...aehnliche].slice(0, 10);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';

    const renderKarte = (m, istHaupt) => `
      <div class="card mb-2" style="border:2px solid ${istHaupt?'#E2001A':'#444'};position:relative">
        ${istHaupt?'<div style="position:absolute;top:-10px;left:12px;background:#E2001A;color:#fff;font-size:.7rem;font-weight:700;padding:2px 10px;border-radius:10px">DIESE MELDUNG</div>':''}
        <div class="card-body" style="padding:12px">
          <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div class="text-xs text-muted">${esc(m.erfolgNr||'–')}</div>
              <strong>${esc(m.titel)}</strong>
              <div class="text-sm text-muted mt-1">${esc(m.sportartText||'–')} · ${m.datum?new Date(m.datum).toLocaleDateString('de-DE'):''} · ${esc(m.ort||'–')}</div>
              <div class="text-sm mt-1">${esc(m.wettbewerbText||'–')} · Platz: ${m.platzierung||'–'}</div>
              <div class="mt-1">${statusBadge(m.status)}</div>
              <div class="text-xs text-muted mt-1">Melder: ${esc(m.melderName||'–')} · ${m.eingangsdatum?new Date(m.eingangsdatum).toLocaleDateString('de-DE'):''}</div>
            </div>
            ${!istHaupt?`<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <button class="btn btn-primary btn-sm" onclick="dubletteZusammenfuehren('${erfolgId}','${m.id}','haupt')">
                ⭐ Diese als Hauptmeldung
              </button>
              <button class="btn btn-outline btn-sm" onclick="dubletteZusammenfuehren('${m.id}','${erfolgId}','haupt')">
                🗄️ Aktuelle als Duplikat
              </button>
            </div>`:''}
          </div>
        </div>
      </div>`;

    modal.innerHTML = `
      <div class="modal-header">
        <h3>🔄 Dubletten-Verwaltung</h3>
        <button class="btn btn-ghost btn-sm close-x">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-info mb-3">
          <span class="alert-icon">ℹ️</span>
          <span><strong>Option A:</strong> Hauptmeldung behalten, Duplikat wird als „Archiviert" markiert und mit Hinweis versehen. Keine Daten werden gelöscht.</span>
        </div>

        <h3 style="margin-bottom:8px">Aktuelle Meldung</h3>
        ${renderKarte(e, true)}

        <h3 style="margin:16px 0 8px">Mögliche Dubletten (${vergleichsKandidaten.length})</h3>
        ${vergleichsKandidaten.length === 0
          ? '<div class="alert alert-success"><span class="alert-icon">✅</span><span>Keine ähnlichen Meldungen gefunden.</span></div>'
          : vergleichsKandidaten.map(k => renderKarte(k, false)).join('')}

        <div class="alert alert-warning mt-3">
          <span class="alert-icon">⚠️</span>
          <span>Die als Duplikat markierte Meldung wird <strong>nicht gelöscht</strong>, sondern auf Status „Archiviert" gesetzt und mit einem Duplikat-Hinweis versehen. Sie bleibt im System nachvollziehbar.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
      </div>`;

    modal.querySelector('.close-x').onclick = ()=>overlay.remove();
    modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
    overlay.appendChild(modal);
    overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);

  } catch(err) {
    toast('Fehler: '+err.message, 'danger');
    console.error(err);
  }
}

async function dubletteZusammenfuehren(hauptId, duplikatId, modus) {
  const msg = `Meldung als Duplikat archivieren?\n\nHauptmeldung: wird behalten (Status unverändert)\nDuplikat: wird auf "Archiviert" gesetzt + Duplikat-Hinweis`;
  if (!confirm(msg)) return;

  try {
    // 1. Duplikat auf "Archiviert" setzen + duplicate_flag + Hinweis
    const haupt = await DB.getErfolgById(hauptId);
    const hinweis = `Duplikat von ${haupt?.erfolgNr||hauptId} (${haupt?.titel||''}). Zusammengeführt am ${new Date().toLocaleDateString('de-DE')} durch ${Auth.name()}.`;

    const { error: updateErr } = await Backend.client
      .from('achievements')
      .update({
        status: 'Archiviert',
        duplicate_flag: true,
        duplicate_note: hinweis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', duplikatId);

    if (updateErr) throw new Error(updateErr.message);

    // 2. Statuswechsel protokollieren
    await DB.protokolliere(duplikatId, 'Dublettenverdacht', 'Archiviert',
      `Als Duplikat von ${haupt?.erfolgNr||hauptId} archiviert.`);

    // 3. Hauptmeldung: duplicate_flag entfernen, Status auf Redaktion
    const { error: hauptErr } = await Backend.client
      .from('achievements')
      .update({
        duplicate_flag: false,
        duplicate_note: '',
        status: haupt?.status === 'Dublettenverdacht' ? 'Redaktion' : haupt?.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hauptId);

    if (hauptErr) throw new Error(hauptErr.message);

    // Cache leeren
    APP._erfolgeCache = null;

    toast('✅ Zusammenführung abgeschlossen. Duplikat archiviert.', 'success');
    document.querySelector('.modal-overlay')?.remove();
    navigateTo('redaktion');

  } catch(err) {
    toast('Fehler: '+err.message, 'danger');
    console.error(err);
  }
}

// ══════════════════════════════════════════════════════════════
// VIDEO-INTEGRATION (YouTube / Vimeo)
// ══════════════════════════════════════════════════════════════

// URL validieren und Embed-ID extrahieren
function parseVideoUrl(url) {
  if (!url) return null;
  url = url.trim();

  // YouTube: verschiedene Formate
  // https://www.youtube.com/watch?v=ID
  // https://youtu.be/ID
  // https://www.youtube.com/embed/ID
  // https://youtube.com/shorts/ID
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) return { platform: 'youtube', id: m[1], embedUrl: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` };

  // Vimeo: https://vimeo.com/ID oder https://player.vimeo.com/video/ID
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { platform: 'vimeo', id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}?dnt=1` };

  return null; // Unbekanntes Format
}

// Video-Player HTML rendern
function renderVideoPlayer(url) {
  const info = parseVideoUrl(url);
  if (!info) return `<div class="alert alert-danger"><span class="alert-icon">❌</span><span>Ungültige Video-URL: ${esc(url)}</span></div>`;

  const plattformLabel = info.platform === 'youtube' ? '▶️ YouTube' : '🎬 Vimeo';
  const datenschutzHinweis = info.platform === 'youtube'
    ? 'YouTube (datenschutzfreundlicher Modus: youtube-nocookie.com)'
    : 'Vimeo (DNT=1 aktiviert)';

  return `
    <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#000">
      <iframe
        src="${esc(info.embedUrl)}"
        style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
        title="SLZB Video">
      </iframe>
    </div>
    <p class="text-xs text-muted mt-2">${plattformLabel} · ${datenschutzHinweis}</p>`;
}

// Video-URL Modal
function zeigeVideoModal(erfolgId, aktuelleUrl='') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '520px';

  const info = aktuelleUrl ? parseVideoUrl(aktuelleUrl) : null;

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🎬 Video verknüpfen</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info mb-3">
        <span class="alert-icon">ℹ️</span>
        <span>Unterstützt: <strong>YouTube</strong> und <strong>Vimeo</strong>. Das Video wird eingebettet, aber nicht auf SLZB-Servern gespeichert.</span>
      </div>
      <div class="form-group">
        <label>Video-URL <span class="required">*</span></label>
        <input type="url" id="video-url-input"
          value="${esc(aktuelleUrl)}"
          placeholder="https://www.youtube.com/watch?v=... oder https://vimeo.com/..."
          style="width:100%"
          oninput="videoUrlVorschau()">
        <div id="video-url-status" class="text-xs mt-1" style="min-height:20px"></div>
      </div>
      <div id="video-vorschau" style="margin-top:12px">
        ${info ? renderVideoPlayer(aktuelleUrl) : ''}
      </div>
      <div class="alert alert-warning mt-3">
        <span class="alert-icon">⚠️</span>
        <span><strong>Datenschutz:</strong> Nur Videos mit Einwilligung aller abgebildeten Personen verknüpfen. Bei YouTube: „Nicht gelistet" empfohlen.</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Abbrechen</button>
      <button class="btn btn-primary" id="video-speichern-btn" onclick="speichereVideoUrl('${erfolgId}')">
        🎬 Video speichern
      </button>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  // Vorschau sofort aktualisieren wenn URL vorhanden
  if (aktuelleUrl) setTimeout(videoUrlVorschau, 100);
}

function videoUrlVorschau() {
  const input = document.getElementById('video-url-input');
  const status = document.getElementById('video-url-status');
  const vorschau = document.getElementById('video-vorschau');
  const btn = document.getElementById('video-speichern-btn');
  if (!input || !status || !vorschau) return;

  const url = input.value.trim();
  if (!url) {
    status.innerHTML = '';
    vorschau.innerHTML = '';
    if (btn) btn.disabled = false;
    return;
  }

  const info = parseVideoUrl(url);
  if (info) {
    status.innerHTML = `<span style="color:#00a040">✅ ${info.platform === 'youtube' ? 'YouTube' : 'Vimeo'}-Video erkannt (ID: ${info.id})</span>`;
    vorschau.innerHTML = renderVideoPlayer(url);
    if (btn) btn.disabled = false;
  } else {
    status.innerHTML = `<span style="color:#E2001A">❌ Ungültige URL. Bitte YouTube- oder Vimeo-Link eingeben.</span>`;
    vorschau.innerHTML = '';
    if (btn) btn.disabled = true;
  }
}

async function speichereVideoUrl(erfolgId) {
  const input = document.getElementById('video-url-input');
  const url = input?.value?.trim() || '';

  if (url && !parseVideoUrl(url)) {
    toast('Ungültige Video-URL. Bitte YouTube- oder Vimeo-Link eingeben.', 'warning');
    return;
  }

  const btn = document.getElementById('video-speichern-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Wird gespeichert...'; }

  try {
    const { error } = await Backend.client
      .from('achievements')
      .update({ video_url: url || null, updated_at: new Date().toISOString() })
      .eq('id', erfolgId);

    if (error) throw new Error(error.message);

    // Protokoll
    await DB.protokolliere(erfolgId, null, null, url ? `Video verknüpft: ${url}` : 'Video entfernt');

    APP._erfolgeCache = null;
    document.querySelector('.modal-overlay')?.remove();
    toast(url ? '🎬 Video erfolgreich verknüpft!' : 'Video entfernt', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: erfolgId });

  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
    if (btn) { btn.disabled = false; btn.textContent = '🎬 Video speichern'; }
  }
}

async function loescheVideoUrl(erfolgId) {
  if (!confirm('Video-Verknüpfung entfernen?')) return;
  try {
    const { error } = await Backend.client
      .from('achievements')
      .update({ video_url: null, updated_at: new Date().toISOString() })
      .eq('id', erfolgId);
    if (error) throw new Error(error.message);
    await DB.protokolliere(erfolgId, null, null, 'Video-Verknüpfung entfernt');
    APP._erfolgeCache = null;
    toast('Video entfernt', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: erfolgId });
  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
  }
}

// ══════════════════════════════════════════════════════════════
// WOCHENVORSCHAU – Poster + Modal
// ══════════════════════════════════════════════════════════════
async function zeigeWochenvorschau() {
  const alleTermine = (typeof SLZB_TERMINE !== 'undefined') ? SLZB_TERMINE : [];
  const jetzt = new Date(); jetzt.setHours(0,0,0,0);

  // Aktuelle Woche: Montag bis Sonntag
  const tag = jetzt.getDay(); // 0=So, 1=Mo...
  const diffMo = tag === 0 ? -6 : 1 - tag;
  const montag = new Date(jetzt); montag.setDate(jetzt.getDate() + diffMo);
  const sonntag = new Date(montag); sonntag.setDate(montag.getDate() + 6);

  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const tagNamen = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  const wocheTermine = alleTermine.filter(t => {
    const d = new Date(t.datum);
    return d >= montag && d <= sonntag;
  }).sort((a,b) => a.datum.localeCompare(b.datum));

  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#666';
  const prioLabel = (p) => p===1?'🏆 Meisterschaft':p===2?'⚡ Wettkampf':p===3?'📋 Lehrgang':'📅 Regulär';

  const wocheLabel = `${montag.getDate()}. ${monatNamen[montag.getMonth()]} – ${sonntag.getDate()}. ${monatNamen[sonntag.getMonth()]} ${sonntag.getFullYear()}`;

  // Gruppiere nach Tag
  const nachTag = {};
  wocheTermine.forEach(t => {
    const d = new Date(t.datum);
    const key = t.datum;
    if (!nachTag[key]) nachTag[key] = { datum: d, termine: [] };
    nachTag[key].termine.push(t);
  });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>📅 Wochenvorschau – ${esc(wocheLabel)}</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body">
      ${wocheTermine.length === 0
        ? `<div class="alert alert-success"><span class="alert-icon">✅</span>
            <span>Diese Woche stehen keine Veranstaltungen an.</span></div>`
        : `<div class="alert alert-info mb-3">
            <span class="alert-icon">📅</span>
            <span><strong>${wocheTermine.length} Veranstaltung(en)</strong> diese Woche</span>
          </div>
          ${Object.entries(nachTag).map(([key, {datum, termine}]) => `
            <div class="card mb-3">
              <div class="card-header" style="background:rgba(0,51,102,0.08)">
                <h3 style="margin:0;font-size:1rem">
                  <span style="color:#003366;font-weight:800">${tagNamen[datum.getDay()]}, ${datum.getDate()}. ${monatNamen[datum.getMonth()]}</span>
                  <span class="badge badge-info ml-2">${termine.length}</span>
                </h3>
              </div>
              <div class="table-wrap"><table>
                <thead><tr>
                  <th>Sportart</th><th>Veranstaltung</th><th>Ort</th><th>Klasse</th><th>Priorität</th><th></th>
                </tr></thead>
                <tbody>${termine.map(t => `<tr>
                  <td class="text-sm">${esc(t.sportart)}</td>
                  <td><strong>${esc(t.veranstaltung)}</strong></td>
                  <td class="text-sm text-muted">${esc(t.ort||'–')}</td>
                  <td class="text-sm text-muted">${esc(t.klasse||'–')}</td>
                  <td><span style="color:${prioFarbe(t.prioritaet)};font-size:.75rem;font-weight:700">${prioLabel(t.prioritaet)}</span></td>
                  <td><button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 8px"
                    onclick="kalenderCountdown(${JSON.stringify(t).replace(/"/g,'&quot;')})">⏳</button></td>
                </tr>`).join('')}
                </tbody>
              </table></div>
            </div>`).join('')}`}
    </div>
    <div class="modal-footer" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline" onclick="wochenvorschauPoster()">🖼️ Poster (1:1)</button>
      <button class="btn btn-outline" onclick="wochenvorschauStories()">📱 Instagram Stories</button>
      <button class="btn btn-primary" onclick="navigateTo('kalender');document.querySelector('.modal-overlay')?.remove()">📅 Zum Kalender</button>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  // Wochentermine für Poster merken
  window._wocheTermine = wocheTermine;
  window._wocheLabel = wocheLabel;
}

// Wochenvorschau als Poster exportieren (1080×1350)
async function wochenvorschauPoster() {
  const termine = window._wocheTermine || [];
  const wocheLabel = window._wocheLabel || '';
  if (!termine.length) { toast('Keine Termine diese Woche','warning'); return; }

  // Canvas erstellen
  const canvas = document.createElement('canvas');
  canvas.width=1080; canvas.height=1350;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const W=1080, H=1350;
  const monatNamen = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const tagNamen = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  // Hintergrund
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0a0c1a'); grad.addColorStop(1,'#1B1C1F');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  // Deko
  zeichneSlzbDeko(ctx, W, H);

  // Header
  drawLogo(ctx, 40, 24, 55);
  ctx.fillStyle='#E2001A'; ctx.fillRect(120, 32, 2, 44);
  ctx.fillStyle='#fff'; ctx.font='bold 16px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('WOCHENVORSCHAU', 130, 30);
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='12px Montserrat, Arial, sans-serif';
  ctx.fillText(wocheLabel.toUpperCase(), 130, 52);

  // Titel
  ctx.fillStyle='#E2001A'; ctx.font='bold italic 48px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('DIESE WOCHE', W/2, 110);
  ctx.fillStyle='#fff'; ctx.font='bold italic 36px Montserrat, Arial, sans-serif';
  ctx.fillText('BEI UNS', W/2, 166);
  ctx.fillStyle='#E2001A'; ctx.fillRect((W-120)/2, 212, 120, 3);

  // Termine-Liste
  let y = 240;
  const ROW_H = 72;
  const PAD = 40;
  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#555';

  // Gruppiere nach Tag
  const nachTag = {};
  termine.forEach(t => {
    if (!nachTag[t.datum]) nachTag[t.datum] = [];
    nachTag[t.datum].push(t);
  });

  Object.entries(nachTag).forEach(([datum, tage]) => {
    const d = new Date(datum);
    const tagLabel = `${tagNamen[d.getDay()]}, ${d.getDate()}. ${monatNamen[d.getMonth()]}`;

    // Tag-Header
    if (y + 30 > H - 100) return;
    ctx.fillStyle='rgba(226,0,26,0.15)';
    ctx.fillRect(PAD, y, W-2*PAD, 28);
    ctx.fillStyle='#E2001A'; ctx.font='bold 13px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.letterSpacing='2px';
    ctx.fillText(tagLabel.toUpperCase(), PAD+10, y+14);
    ctx.letterSpacing='0px';
    y += 32;

    tage.forEach(t => {
      if (y + ROW_H > H - 100) return;
      // Zeilen-Hintergrund
      ctx.fillStyle='rgba(255,255,255,0.04)';
      ctx.fillRect(PAD, y, W-2*PAD, ROW_H-4);
      // Prioritäts-Akzent
      ctx.fillStyle=prioFarbe(t.prioritaet);
      ctx.fillRect(PAD, y, 3, ROW_H-4);
      // Sportart
      ctx.fillStyle=prioFarbe(t.prioritaet); ctx.font='bold 12px Montserrat, Arial, sans-serif';
      ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText(t.sportart.toUpperCase(), PAD+14, y+10);
      // Veranstaltung
      ctx.fillStyle='#fff'; ctx.font='bold 16px Montserrat, Arial, sans-serif';
      ctx.fillText(t.veranstaltung, PAD+14, y+28, W-2*PAD-80);
      // Ort + Klasse
      const info = [t.ort, t.klasse].filter(Boolean).join(' · ');
      if (info) {
        ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='12px Montserrat, Arial, sans-serif';
        ctx.fillText(info, PAD+14, y+50, W-2*PAD-80);
      }
      y += ROW_H;
    });
    y += 8;
  });

  // Footer
  zeichneSlzbFooterNeu(ctx, W, H);

  // Download
  const a = document.createElement('a');
  a.download = `SLZB_Wochenvorschau_${wocheLabel.replace(/[^a-zA-Z0-9]/g,'-')}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('Wochenvorschau-Poster heruntergeladen!', 'success');
}

// ══════════════════════════════════════════════════════════════
// WOCHENVORSCHAU – INSTAGRAM STORY EXPORT (1080×1920)
// Eine Story pro Wochentag mit Terminen
// ══════════════════════════════════════════════════════════════
async function wochenvorschauStories() {
  const termine = window._wocheTermine || [];
  const wocheLabel = window._wocheLabel || '';
  if (!termine.length) { toast('Keine Termine diese Woche', 'warning'); return; }

  await ladeMontserrat(); await ladeLogo();

  const monatNamen = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const tagNamen = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const tagKurz = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  // Gruppiere nach Tag
  const nachTag = {};
  termine.forEach(t => {
    if (!nachTag[t.datum]) nachTag[t.datum] = [];
    nachTag[t.datum].push(t);
  });

  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#888';
  const prioIcon = (p) => p===1?'🏆':p===2?'⚡':p===3?'📋':'📅';

  let storyNr = 0;
  const gesamt = Object.keys(nachTag).length + 1; // +1 für Titelkarte

  // ── Story 0: Titelkarte ──────────────────────────────────────
  await exportStoryKarte(async (ctx, W, H) => {
    // Hintergrund
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#0a0c1a'); grad.addColorStop(1,'#1B1C1F');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    zeichneSlzbDeko(ctx, W, H);

    // Deko-Kreis
    ctx.save(); ctx.globalAlpha=0.08; ctx.fillStyle='#E2001A';
    ctx.beginPath(); ctx.arc(W/2, H*0.38, 320, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Header
    drawLogo(ctx, 40, 40, 60);

    // Titel
    ctx.fillStyle='#E2001A'; ctx.font='bold 22px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top'; ctx.letterSpacing='6px';
    ctx.fillText('WOCHENVORSCHAU', W/2, H*0.28);
    ctx.letterSpacing='0px';
    ctx.fillStyle='#E2001A'; ctx.fillRect((W-100)/2, H*0.28+30, 100, 3);

    ctx.fillStyle='#fff'; ctx.font='bold italic 88px Montserrat, Arial, sans-serif';
    ctx.fillText('DIESE', W/2, H*0.34);
    ctx.fillStyle='#E2001A'; ctx.font='bold italic 88px Montserrat, Arial, sans-serif';
    ctx.fillText('WOCHE', W/2, H*0.34+96);

    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='20px Montserrat, Arial, sans-serif';
    ctx.fillText(wocheLabel, W/2, H*0.34+200);

    // Anzahl Termine
    ctx.fillStyle='rgba(226,0,26,0.15)';
    ctx.beginPath(); ctx.roundRect((W-280)/2, H*0.62, 280, 80, 40); ctx.fill();
    ctx.fillStyle='#E2001A'; ctx.font='bold italic 48px Montserrat, Arial, sans-serif';
    ctx.fillText(String(termine.length), W/2, H*0.62+40);
    ctx.fillStyle='#fff'; ctx.font='bold 18px Montserrat, Arial, sans-serif';
    ctx.fillText(termine.length===1?'VERANSTALTUNG':'VERANSTALTUNGEN', W/2, H*0.62+62);

    // Story-Nummer
    zeichneStoryNummer(ctx, W, H, 1, gesamt);
    zeichneSlzbFooterNeu(ctx, W, H);
  }, `SLZB_Woche_Story_01_Titel.png`);

  storyNr = 1;

  // ── Story pro Wochentag ──────────────────────────────────────
  for (const [datum, tage] of Object.entries(nachTag)) {
    storyNr++;
    const d = new Date(datum);
    const tagName = tagNamen[d.getDay()];
    const datumLabel = `${d.getDate()}. ${monatNamen[d.getMonth()]}`;

    await exportStoryKarte(async (ctx, W, H) => {
      // Hintergrund
      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,'#0a0c1a'); grad.addColorStop(1,'#1B1C1F');
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
      zeichneSlzbDeko(ctx, W, H);

      // Header
      drawLogo(ctx, 40, 40, 55);
      ctx.fillStyle='#E2001A'; ctx.fillRect(120, 48, 2, 40);
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='12px Montserrat, Arial, sans-serif';
      ctx.textAlign='left'; ctx.textBaseline='top'; ctx.letterSpacing='3px';
      ctx.fillText('WOCHENVORSCHAU', 130, 48);
      ctx.letterSpacing='0px';

      // Wochentag groß
      ctx.fillStyle='#E2001A'; ctx.font='bold 18px Montserrat, Arial, sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='top'; ctx.letterSpacing='4px';
      ctx.fillText(tagName.toUpperCase(), W/2, 140);
      ctx.letterSpacing='0px';
      ctx.fillStyle='#fff'; ctx.font='bold italic 72px Montserrat, Arial, sans-serif';
      ctx.fillText(datumLabel, W/2, 170);
      ctx.fillStyle='#E2001A'; ctx.fillRect((W-80)/2, 250, 80, 3);

      // Termine-Liste
      let y = 290;
      const ROW_H = Math.min(200, Math.floor((H - 290 - 120) / tage.length));

      tage.forEach((t, i) => {
        if (y + ROW_H > H - 120) return;

        // Karten-Hintergrund
        ctx.fillStyle='rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.roundRect(40, y, W-80, ROW_H-12, 12); ctx.fill();

        // Prioritäts-Akzent
        ctx.fillStyle=prioFarbe(t.prioritaet);
        ctx.beginPath(); ctx.roundRect(40, y, 4, ROW_H-12, [2,0,0,2]); ctx.fill();

        // Prioritäts-Icon
        ctx.font=`${Math.round(ROW_H*0.28)}px Arial`;
        ctx.textAlign='left'; ctx.textBaseline='top';
        ctx.fillText(prioIcon(t.prioritaet), 56, y+12);

        // Sportart
        ctx.fillStyle=prioFarbe(t.prioritaet);
        ctx.font=`bold 14px Montserrat, Arial, sans-serif`;
        ctx.letterSpacing='2px';
        ctx.fillText(t.sportart.toUpperCase(), 100, y+14);
        ctx.letterSpacing='0px';

        // Veranstaltung
        ctx.fillStyle='#fff'; ctx.font=`bold ${Math.min(22, Math.round(ROW_H*0.22))}px Montserrat, Arial, sans-serif`;
        ctx.fillText(t.veranstaltung, 100, y+36, W-160);

        // Ort + Klasse
        const info = [t.ort, t.klasse].filter(Boolean).join(' · ');
        if (info && ROW_H > 80) {
          ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='13px Montserrat, Arial, sans-serif';
          ctx.fillText(info, 100, y+64, W-160);
        }

        y += ROW_H;
      });

      // Story-Nummer
      zeichneStoryNummer(ctx, W, H, storyNr, gesamt);
      zeichneSlzbFooterNeu(ctx, W, H);
    }, `SLZB_Woche_Story_${String(storyNr).padStart(2,'0')}_${tagName}.png`);

    await new Promise(r=>setTimeout(r,150)); // kurze Pause zwischen Downloads
  }

  toast(`${storyNr} Story-Bilder heruntergeladen! 📱`, 'success');
}

// Hilfsfunktion: Story-Canvas erstellen und herunterladen
async function exportStoryKarte(drawFn, filename) {
  const canvas = document.createElement('canvas');
  canvas.width=1080; canvas.height=1920;
  const ctx = canvas.getContext('2d');
  await drawFn(ctx, 1080, 1920);
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
  await new Promise(r=>setTimeout(r,300));
}

// Story-Nummer oben rechts
function zeichneStoryNummer(ctx, W, H, nr, gesamt) {
  ctx.fillStyle='rgba(226,0,26,0.8)';
  ctx.beginPath(); ctx.roundRect(W-90, 36, 74, 36, 18); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 15px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(`${nr} / ${gesamt}`, W-53, 54);
}

// ══════════════════════════════════════════════════════════════
// QUICK-WIN 1: JAHRESCHRONIK CSV-EXPORT
// ══════════════════════════════════════════════════════════════
async function exportiereChronikCSVAktuell() {
  const alle = await ladeErfolge();
  // Aktuelle Filter aus der Jahreschronik-Seite lesen
  const schuljahr = document.getElementById('chronik-schuljahr')?.value || '';
  const sportart = document.getElementById('chronik-sportart')?.value || '';
  const ebene = document.getElementById('chronik-ebene')?.value || '';

  let gefiltert = alle.filter(e => ['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));

  if (schuljahr) {
    const [von, bis] = schuljahr.split('/').map(Number);
    gefiltert = gefiltert.filter(e => {
      if (!e.datum) return false;
      const d = new Date(e.datum);
      const j = d.getFullYear(); const m = d.getMonth();
      return (j === 2000+von && m >= 7) || (j === 2000+bis && m < 7);
    });
  }
  if (sportart) gefiltert = gefiltert.filter(e => e.sportartId===sportart || e.sportartText===sportart);
  if (ebene) gefiltert = gefiltert.filter(e => e.ebene===ebene);

  if (!gefiltert.length) { toast('Keine Einträge zum Exportieren','warning'); return; }

  // CSV erstellen
  const header = ['Nr.','Datum','Titel','Meldungsart','Sportart','Disziplin','Wettbewerb','Ort','Ebene','Platzierung','Medaille','Ergebnis','Einheit','Athlet/Team','Status'];
  const zeilen = gefiltert.map(e => [
    e.erfolgNr||'',
    e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : '',
    e.titel||'',
    e.meldungsart||'',
    e.sportartText||'',
    e.disziplin||'',
    e.wettbewerbText||'',
    e.ort||'',
    e.ebene||'',
    e.platzierung||'',
    e.medaille||'',
    e.ergebnisWert||'',
    e.ergebnisEinheit||'',
    (e.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', '),
    e.status||'',
  ].map(v => `"${String(v).replace(/"/g,'""')}"`));

  const csv = [header.join(';'), ...zeilen.map(z=>z.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SLZB_Jahreschronik${schuljahr?'_'+schuljahr:''}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast(`${gefiltert.length} Einträge exportiert`, 'success');
}

// ══════════════════════════════════════════════════════════════
// QUICK-WIN 2: BILDVORSCHAU LIGHTBOX
// ══════════════════════════════════════════════════════════════
function zeigeLightbox(src, caption, creator) {
  // Entferne bestehende Lightbox
  document.getElementById('slzb-lightbox')?.remove();

  const lb = document.createElement('div');
  lb.id = 'slzb-lightbox';
  lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:zoom-out;padding:20px';
  lb.onclick = ()=>lb.remove();

  lb.innerHTML = `
    <button style="position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;line-height:1" onclick="document.getElementById('slzb-lightbox').remove()">✕</button>
    <img src="${esc(src)}" alt="${esc(caption||'')}"
      style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6)"
      onclick="event.stopPropagation()">
    ${caption||creator ? `<div style="margin-top:12px;text-align:center">
      ${caption?`<p style="color:#fff;font-size:1rem;margin:0 0 4px">${esc(caption)}</p>`:''}
      ${creator?`<p style="color:rgba(255,255,255,0.5);font-size:.8rem;margin:0">📷 ${esc(creator)}</p>`:''}
    </div>` : ''}`;

  document.body.appendChild(lb);

  // Tastatur: Escape schließt
  const onKey = (e) => { if(e.key==='Escape') { lb.remove(); document.removeEventListener('keydown',onKey); }};
  document.addEventListener('keydown', onKey);
}

// ══════════════════════════════════════════════════════════════
// KERNDATEN BEARBEITEN (Redaktion / ÖA / Admin)
// ══════════════════════════════════════════════════════════════
async function speichereKerndaten(erfolgId) {
  const titel = document.getElementById('edit-titel')?.value?.trim();
  if (!titel) { toast('Titel ist Pflichtfeld', 'warning'); return; }

  const sportartText = document.getElementById('edit-sportart')?.value?.trim() || '';
  const wettbewerbText = document.getElementById('edit-wettbewerb')?.value?.trim() || '';
  const disziplin = document.getElementById('edit-disziplin')?.value?.trim() || '';
  const datum = document.getElementById('edit-datum')?.value || null;
  const ort = document.getElementById('edit-ort')?.value?.trim() || '';
  const ebene = document.getElementById('edit-ebene')?.value || '';
  const platzierung = document.getElementById('edit-platzierung')?.value ? Number(document.getElementById('edit-platzierung').value) : null;
  const medaille = document.getElementById('edit-medaille')?.value || 'keine';
  const ergebnisWert = document.getElementById('edit-ergebnis-wert')?.value ? Number(document.getElementById('edit-ergebnis-wert').value) : null;
  const ergebnisEinheit = document.getElementById('edit-ergebnis-einheit')?.value?.trim() || '';
  const quelleUrl = document.getElementById('edit-quelle')?.value?.trim() || '';
  const athlet = document.getElementById('edit-athlet')?.value?.trim() || '';
  const kurzinfo = document.getElementById('edit-kurzinfo')?.value?.trim() || '';
  const textArtikel = document.getElementById('edit-artikel-text')?.value?.trim() || '';

  // Sportart-ID auflösen
  const sp = SLZB_DB.sportarten.find(s => s.name.toLowerCase() === sportartText.toLowerCase());

  // Wettbewerb auflösen oder anlegen
  let wettbewerbId = null;
  if (wettbewerbText) {
    try {
      const wb = await DB.getOderErstelleWettbewerb(wettbewerbText, datum);
      wettbewerbId = wb;
    } catch(e) { /* ignorieren */ }
  }

  const btn = document.querySelector('#tab-bearbeiten .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Wird gespeichert...'; }

  try {
    const updateData = {
      title: titel,
      sport_id: sp?.id || null,
      discipline: disziplin,
      competition_id: wettbewerbId,
      event_date: datum,
      location: ort,
      level: ebene,
      placement: platzierung,
      medal: medaille,
      result_value: ergebnisWert,
      result_unit: ergebnisEinheit,
      result_text: '',
      short_info: kurzinfo,
      source_url: quelleUrl,
      article_text: textArtikel,
      updated_at: new Date().toISOString(),
    };

    // Entferne null-Werte nicht – Supabase setzt sie auf NULL
    const { error } = await Backend.client
      .from('achievements')
      .update(updateData)
      .eq('id', erfolgId);

    if (error) throw new Error(error.message);

    // Athleten-Beteiligten aktualisieren wenn geändert
    if (athlet !== undefined) {
      // Bestehende Beteiligte löschen und neu anlegen
      await Backend.client.from('achievement_participants').delete().eq('achievement_id', erfolgId);
      if (athlet.trim()) {
        const namen = athlet.split(',').map(n=>n.trim()).filter(Boolean);
        for (const name of namen) {
          await Backend.client.from('achievement_participants').insert({
            achievement_id: erfolgId,
            student_id: null,
            participant_role: 'Athlet',
            consent_status: 'Nicht geprüft',
            anzeigename: name,
          }).catch(()=>{});
        }
      }
    }

    // Protokoll
    await DB.protokolliere(erfolgId, null, null,
      `Kerndaten bearbeitet durch ${Auth.name()}: Titel="${titel}", Sportart="${sportartText}", Athlet="${athlet}", Datum="${datum||''}"`);

    APP._erfolgeCache = null;
    toast('✅ Kerndaten erfolgreich gespeichert!', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: erfolgId });

  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Änderungen speichern'; }
  }
}

// ══════════════════════════════════════════════════════════════
// JAHRESCHRONIK POWERPOINT EXPORT (PptxGenJS)
// ══════════════════════════════════════════════════════════════
async function exportiereChronikPPTX() {
  // PptxGenJS dynamisch laden
  if (typeof PptxGenJS === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('PptxGenJS konnte nicht geladen werden'));
    });
  }

  toast('PowerPoint wird erstellt...', 'info');

  const alle = await ladeErfolge();
  const schuljahr = document.getElementById('chronik-schuljahr')?.value || '';
  const sportartFilter = document.getElementById('chronik-sportart')?.value || '';
  const ebeneFilter = document.getElementById('chronik-ebene')?.value || '';

  let gefiltert = alle.filter(e => ['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if (schuljahr) {
    const [von, bis] = schuljahr.split('/').map(Number);
    gefiltert = gefiltert.filter(e => {
      if (!e.datum) return false;
      const d = new Date(e.datum); const j = d.getFullYear(); const m = d.getMonth();
      return (j === 2000+von && m >= 7) || (j === 2000+bis && m < 7);
    });
  }
  if (sportartFilter) gefiltert = gefiltert.filter(e => e.sportartId===sportartFilter || e.sportartText===sportartFilter);
  if (ebeneFilter) gefiltert = gefiltert.filter(e => e.ebene===ebeneFilter);

  if (!gefiltert.length) { toast('Keine Einträge zum Exportieren','warning'); return; }

  // Statistiken berechnen
  const prio1 = gefiltert.filter(e => e.platzierung===1 || e.medaille==='Gold').length;
  const prio2 = gefiltert.filter(e => e.platzierung===2 || e.medaille==='Silber').length;
  const prio3 = gefiltert.filter(e => e.platzierung===3 || e.medaille==='Bronze').length;
  const sportarten = [...new Set(gefiltert.map(e => e.sportartText).filter(Boolean))];

  // Gruppiere nach Sportart
  const nachSportart = {};
  gefiltert.forEach(e => {
    const s = e.sportartText || 'Sonstige';
    if (!nachSportart[s]) nachSportart[s] = [];
    nachSportart[s].push(e);
  });

  // PptxGenJS Präsentation erstellen
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9

  // Farben
  const ROT = 'E2001A';
  const DUNKEL = '1B1C1F';
  const BLAU = '003366';
  const WEISS = 'FFFFFF';
  const GRAU = 'C9CCD2';
  const GOLD = 'C9A227';

  // ── Folie 1: Titelfolie ──────────────────────────────────────
  const slide1 = pptx.addSlide();
  slide1.background = { color: DUNKEL };
  slide1.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
  slide1.addShape(pptx.ShapeType.rect, { x:0, y:'95%', w:'40%', h:0.04, fill:{color:ROT} });
  slide1.addText('SLZB BERLIN', { x:0.5, y:1.2, w:9, h:0.5, fontSize:14, bold:true, color:ROT, charSpacing:8 });
  slide1.addText('Jahreschronik', { x:0.5, y:1.8, w:9, h:1.2, fontSize:60, bold:true, color:WEISS, fontFace:'Calibri' });
  slide1.addText(schuljahr ? `Schuljahr ${schuljahr}` : 'Alle Schuljahre', { x:0.5, y:3.1, w:9, h:0.6, fontSize:28, color:GRAU });
  slide1.addShape(pptx.ShapeType.rect, { x:0.5, y:3.8, w:1.2, h:0.06, fill:{color:ROT} });
  slide1.addText(`${gefiltert.length} Erfolge · ${sportarten.length} Sportarten`, { x:0.5, y:4.0, w:9, h:0.5, fontSize:16, color:GRAU });

  // ── Folie 2: Überblick KPIs ──────────────────────────────────
  const slide2 = pptx.addSlide();
  slide2.background = { color: DUNKEL };
  slide2.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
  slide2.addText('ÜBERBLICK', { x:0.5, y:0.2, w:9, h:0.3, fontSize:10, bold:true, color:ROT, charSpacing:6 });
  slide2.addText('Kennzahlen auf einen Blick', { x:0.5, y:0.55, w:9, h:0.7, fontSize:32, bold:true, color:WEISS });

  const kpis = [
    { val: String(gefiltert.length), label: 'Erfolge gesamt', icon: '🏆', x: 0.4 },
    { val: String(sportarten.length), label: 'Sportarten', icon: '⚽', x: 2.9 },
    { val: String(prio1), label: 'Gold-Medaillen', icon: '🥇', x: 5.4 },
    { val: String(prio2+prio3), label: 'Silber & Bronze', icon: '🥈', x: 7.9 },
  ];
  kpis.forEach(k => {
    slide2.addShape(pptx.ShapeType.roundRect, { x:k.x, y:1.5, w:2.3, h:2.8, fill:{color:'2A2C31'}, line:{color:ROT,pt:2}, rectRadius:0.1 });
    slide2.addText(k.val, { x:k.x, y:1.7, w:2.3, h:1.2, fontSize:52, bold:true, color:WEISS, align:'center' });
    slide2.addText(k.label, { x:k.x, y:2.9, w:2.3, h:0.5, fontSize:11, bold:true, color:ROT, align:'center', charSpacing:2 });
  });

  // ── Folie 3: Erfolge nach Sportart ───────────────────────────
  const slide3 = pptx.addSlide();
  slide3.background = { color: DUNKEL };
  slide3.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
  slide3.addText('SPORTARTEN', { x:0.5, y:0.2, w:9, h:0.3, fontSize:10, bold:true, color:ROT, charSpacing:6 });
  slide3.addText('Erfolge nach Sportart', { x:0.5, y:0.55, w:9, h:0.7, fontSize:32, bold:true, color:WEISS });

  const sportSorted = Object.entries(nachSportart).sort((a,b)=>b[1].length-a[1].length).slice(0,8);
  const maxVal = sportSorted[0]?.[1]?.length || 1;
  sportSorted.forEach(([sport, items], i) => {
    const y = 1.5 + i*0.6;
    const barW = (items.length/maxVal) * 7.5;
    slide3.addText(sport, { x:0.4, y, w:2.5, h:0.5, fontSize:11, color:GRAU, valign:'middle' });
    slide3.addShape(pptx.ShapeType.rect, { x:2.9, y:y+0.08, w:barW, h:0.35, fill:{color: i===0?ROT:BLAU} });
    slide3.addText(String(items.length), { x:2.9+barW+0.1, y, w:0.6, h:0.5, fontSize:11, bold:true, color:WEISS, valign:'middle' });
  });

  // ── Folien 4+: Detailliste nach Sportart (max 5 Sportarten) ──
  const topSportarten = Object.entries(nachSportart).sort((a,b)=>b[1].length-a[1].length).slice(0,5);
  topSportarten.forEach(([sport, items]) => {
    const slideN = pptx.addSlide();
    slideN.background = { color: DUNKEL };
    slideN.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
    slideN.addText(sport.toUpperCase(), { x:0.5, y:0.2, w:9, h:0.3, fontSize:10, bold:true, color:ROT, charSpacing:6 });
    slideN.addText(`${sport} – ${items.length} Erfolge`, { x:0.5, y:0.55, w:9, h:0.7, fontSize:28, bold:true, color:WEISS });

    // Tabellenkopf
    slideN.addShape(pptx.ShapeType.rect, { x:0.4, y:1.4, w:9.2, h:0.4, fill:{color:BLAU} });
    slideN.addText('Datum', { x:0.5, y:1.4, w:1.5, h:0.4, fontSize:10, bold:true, color:WEISS, valign:'middle' });
    slideN.addText('Titel', { x:2.1, y:1.4, w:4.5, h:0.4, fontSize:10, bold:true, color:WEISS, valign:'middle' });
    slideN.addText('Platz', { x:6.7, y:1.4, w:1.2, h:0.4, fontSize:10, bold:true, color:WEISS, valign:'middle' });
    slideN.addText('Medaille', { x:8.0, y:1.4, w:1.5, h:0.4, fontSize:10, bold:true, color:WEISS, valign:'middle' });

    items.slice(0,12).forEach((e, i) => {
      const ry = 1.85 + i*0.38;
      const bg = i%2===0 ? '2A2C31' : '222428';
      slideN.addShape(pptx.ShapeType.rect, { x:0.4, y:ry, w:9.2, h:0.36, fill:{color:bg} });
      const datStr = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '–';
      slideN.addText(datStr, { x:0.5, y:ry, w:1.5, h:0.36, fontSize:9, color:GRAU, valign:'middle' });
      slideN.addText((e.titel||'–').slice(0,55), { x:2.1, y:ry, w:4.5, h:0.36, fontSize:9, color:WEISS, valign:'middle' });
      slideN.addText(e.platzierung ? `${e.platzierung}.` : '–', { x:6.7, y:ry, w:1.2, h:0.36, fontSize:9, color:e.platzierung===1?GOLD:GRAU, bold:e.platzierung===1, valign:'middle' });
      const medFarbe = e.medaille==='Gold'?GOLD:e.medaille==='Silber'?'BFC8D2':e.medaille==='Bronze'?'C2783A':GRAU;
      slideN.addText(e.medaille&&e.medaille!=='keine'?e.medaille:'–', { x:8.0, y:ry, w:1.5, h:0.36, fontSize:9, color:medFarbe, bold:!!e.medaille&&e.medaille!=='keine', valign:'middle' });
    });
    if (items.length > 12) {
      slideN.addText(`... und ${items.length-12} weitere Einträge`, { x:0.5, y:6.4, w:9, h:0.3, fontSize:9, color:GRAU, italic:true });
    }
  });

  // ── Letzte Folie: Abschluss ──────────────────────────────────
  const slideEnd = pptx.addSlide();
  slideEnd.background = { color: DUNKEL };
  slideEnd.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.06, fill:{color:ROT} });
  slideEnd.addShape(pptx.ShapeType.rect, { x:0, y:'95%', w:'40%', h:0.04, fill:{color:ROT} });
  slideEnd.addText('#SLZBerlin', { x:0.5, y:2.5, w:9, h:1.5, fontSize:56, bold:true, italic:true, color:ROT, align:'center' });
  slideEnd.addText('Schul- und Leistungssportzentrum Berlin', { x:0.5, y:4.2, w:9, h:0.5, fontSize:16, color:GRAU, align:'center' });

  // Download
  const dateiname = `SLZB_Jahreschronik${schuljahr?'_'+schuljahr:''}_${new Date().toISOString().slice(0,10)}`;
  await pptx.writeFile({ fileName: dateiname });
  toast(`✅ PowerPoint "${dateiname}.pptx" heruntergeladen!`, 'success');
}

// ══════════════════════════════════════════════════════════════
// KALENDER-GRID (Feature 5: klassische Monatsansicht)
// ══════════════════════════════════════════════════════════════
function renderKalenderGrid(state, gefiltertAlle, monatNamen) {
  const monat = state.monat;
  const jahr = state.jahr;
  const ersterTag = new Date(jahr, monat, 1);
  const letzterTag = new Date(jahr, monat+1, 0);
  const startWochentag = (ersterTag.getDay()+6)%7; // Mo=0
  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#555';

  // Termine des Monats
  const monatsTermine = gefiltertAlle.filter(t => {
    const d = new Date(t.datum);
    return d.getMonth()===monat && d.getFullYear()===jahr;
  });

  // Gruppiere nach Tag
  const nachTag = {};
  monatsTermine.forEach(t => {
    const tag = new Date(t.datum).getDate();
    if (!nachTag[tag]) nachTag[tag] = [];
    nachTag[tag].push(t);
  });

  const heute = new Date();
  const heuteTag = heute.getDate();
  const heuteMonat = heute.getMonth();
  const heuteJahr = heute.getFullYear();
  const istAktuellerMonat = monat===heuteMonat && jahr===heuteJahr;

  const tagNamen = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  let html = `<div class="card">
    <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="kalenderMonatSchnell(-12)">«</button>
        <button class="btn btn-ghost btn-sm" onclick="kalenderMonatNav(-1)">← Vorheriger</button>
      </div>
      <div style="text-align:center">
        <h2 style="margin:0">🗓️ ${monatNamen[monat]} ${jahr}</h2>
        <span class="text-xs text-muted">${monatsTermine.length} Termine</span>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="kalenderMonatNav(1)">Nächster →</button>
        <button class="btn btn-ghost btn-sm" onclick="kalenderMonatSchnell(12)">»</button>
        <button class="btn btn-outline btn-sm" onclick="window._kalenderState={monat:new Date().getMonth(),jahr:new Date().getFullYear()};navigateTo('kalender')">Heute</button>
      </div>
    </div>
    <div class="card-body" style="padding:8px">
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
        ${tagNamen.map(t=>`<div style="text-align:center;font-size:.75rem;font-weight:700;color:#888;padding:4px">${t}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">`;

  // Leere Zellen vor dem 1.
  for (let i=0; i<startWochentag; i++) {
    html += `<div style="min-height:80px;background:rgba(255,255,255,0.02);border-radius:4px"></div>`;
  }

  // Tage
  for (let tag=1; tag<=letzterTag.getDate(); tag++) {
    const termine = nachTag[tag] || [];
    const istHeute = istAktuellerMonat && tag===heuteTag;
    const wochentag = (startWochentag + tag - 1) % 7;
    const istWE = wochentag >= 5;
    html += `<div style="min-height:80px;background:${istHeute?'rgba(226,0,26,0.15)':istWE?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.05)'};border-radius:4px;padding:4px;border:${istHeute?'1px solid rgba(226,0,26,0.5)':'1px solid transparent'}">
      <div style="font-size:.8rem;font-weight:${istHeute?'800':'600'};color:${istHeute?'#E2001A':'#fff'};margin-bottom:2px">${tag}</div>
      ${termine.slice(0,3).map(t=>`<div onclick="zeigeTerminDetail(${JSON.stringify(t).replace(/"/g,'&quot;')})"
        style="font-size:.65rem;background:${prioFarbe(t.prioritaet)};color:#fff;border-radius:3px;padding:1px 4px;margin-bottom:1px;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"
        title="${esc(t.veranstaltung)}">${esc(t.veranstaltung.slice(0,18))}</div>`).join('')}
      ${termine.length>3?`<div style="font-size:.6rem;color:#888">+${termine.length-3} weitere</div>`:''}
    </div>`;
  }

  html += `</div></div></div>`;
  return html;
}

// ══════════════════════════════════════════════════════════════
// TERMIN-DETAIL-MODAL (Feature 8: Klick auf Termin)
// ══════════════════════════════════════════════════════════════
function zeigeTerminDetail(termin) {
  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#555';
  const prioLabel = (p) => p===1?'🏆 Meisterschaft/Olympia':p===2?'⚡ Wettkampf/Qualifikation':p===3?'📋 Lehrgang/Sichtung':'📅 Regulär';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '480px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>📅 ${esc(termin.veranstaltung)}</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:.9rem">
        <span class="text-muted">Datum</span><strong>${esc(termin.datumAnzeige)}</strong>
        <span class="text-muted">Sportart</span><strong>${esc(termin.sportart)}</strong>
        ${termin.ort?`<span class="text-muted">Ort</span><span>${esc(termin.ort)}</span>`:''}
        ${termin.klasse?`<span class="text-muted">Klasse</span><span>${esc(termin.klasse)}</span>`:''}
        <span class="text-muted">Teilnahme</span><span>${esc(termin.teilnahme||'–')}</span>
        <span class="text-muted">Priorität</span><span style="color:${prioFarbe(termin.prioritaet)};font-weight:700">${prioLabel(termin.prioritaet)}</span>
      </div>
    </div>
    <div class="modal-footer" style="gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline btn-sm" onclick="kalenderCountdown(${JSON.stringify(termin).replace(/"/g,'&quot;')});document.querySelector('.modal-overlay').remove()">⏳ Countdown-Poster</button>
    </div>`;
  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ══════════════════════════════════════════════════════════════
// iCAL EXPORT (Feature 6)
// ══════════════════════════════════════════════════════════════
function exportiereKalenderIcal() {
  const alleTermine = (typeof SLZB_TERMINE !== 'undefined') ? SLZB_TERMINE : [];
  const state = window._kalenderState || {};

  let gefiltert = alleTermine.filter(t => {
    if (state.sportart && t.sportart !== state.sportart) return false;
    if (state.prio && String(t.prioritaet) !== state.prio) return false;
    if (state.teilnahme && t.teilnahme !== state.teilnahme) return false;
    if (state.suche) {
      const s = state.suche.toLowerCase();
      const felder = [t.veranstaltung, t.ort, t.klasse, t.sportart].filter(Boolean).join(' ').toLowerCase();
      if (!felder.includes(s)) return false;
    }
    return true;
  });

  if (!gefiltert.length) { toast('Keine Termine zum Exportieren','warning'); return; }

  // iCal-Format generieren
  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SLZB Berlin//Veranstaltungskalender//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:SLZB Berlin Veranstaltungen',
    'X-WR-TIMEZONE:Europe/Berlin',
  ];

  gefiltert.forEach(t => {
    const datum = t.datum.replace(/-/g,'');
    const uid = `${datum}-${t.sportart.replace(/\s/g,'')}-${t.veranstaltung.slice(0,10).replace(/\s/g,'')}@slzb-berlin.de`;
    ical.push('BEGIN:VEVENT');
    ical.push(`UID:${uid}`);
    ical.push(`DTSTART;VALUE=DATE:${datum}`);
    ical.push(`DTEND;VALUE=DATE:${datum}`);
    ical.push(`SUMMARY:${t.sportart}: ${t.veranstaltung}`);
    if (t.ort) ical.push(`LOCATION:${t.ort}`);
    ical.push(`DESCRIPTION:Sportart: ${t.sportart}\\nKlasse: ${t.klasse||'–'}\\nTeilnahme: ${t.teilnahme||'–'}\\nPriorität: ${t.prioritaetText||'–'}`);
    ical.push(`CATEGORIES:${t.sportart}`);
    ical.push('END:VEVENT');
  });

  ical.push('END:VCALENDAR');

  const blob = new Blob([ical.join('\r\n')], {type:'text/calendar;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SLZB_Kalender${state.sportart?'_'+state.sportart:''}_2026-27.ics`;
  a.click();
  toast(`✅ ${gefiltert.length} Termine als iCal exportiert`, 'success');
}

// ══════════════════════════════════════════════════════════════
// NICHT-SPORT-MELDUNGEN: Einreichen in Redaktions-Workflow
// ══════════════════════════════════════════════════════════════

// Gemeinsame Funktion: Nicht-Sport-Ausgabe als Meldung einreichen
async function reicheNichtSportEin(meldungsart, daten) {
  try {
    const result = await DB.erstelleErfolg({
      meldungsart,
      titel: daten.titel || `${meldungsart} – ${new Date().toLocaleDateString('de-DE')}`,
      sportartId: null,
      sportartText: meldungsart,
      datum: daten.datum || new Date().toISOString().slice(0,10),
      ort: daten.ort || '',
      kurzinfo: daten.kurzinfo || daten.text || '',
      quelleUrl: daten.link || '',
      textArtikel: daten.text || '',
      status: 'Eingereicht',
      // Zusatzdaten als JSON im ai_draft-Feld
      aiDraft: JSON.stringify(daten),
    }, []);

    if (!result.ok) throw new Error(result.fehler || 'Unbekannter Fehler');
    APP._erfolgeCache = null;
    toast(`✅ ${meldungsart} eingereicht! Wartet auf Freigabe durch Redaktion.`, 'success');
    return result;
  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
    return null;
  }
}

// Jubiläum einreichen
async function jubEinreichen() {
  const titel = document.getElementById('jub-titel')?.value?.trim();
  const untertitel = document.getElementById('jub-untertitel')?.value?.trim() || '';
  const datum = document.getElementById('jub-datum')?.value || '';
  const ort = document.getElementById('jub-ort')?.value?.trim() || '';
  if (!titel) { toast('Titel ist Pflichtfeld', 'warning'); return; }

  const result = await reicheNichtSportEin('Jubiläum', { titel, untertitel, datum, ort });
  if (result) {
    // Felder leeren
    ['jub-titel','jub-untertitel','jub-ort'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.querySelector('.modal-overlay')?.remove();
    navigateTo('meine-meldungen');
  }
}

// Schulnachricht einreichen
async function snEinreichen() {
  const titel = document.getElementById('sn-titel')?.value?.trim();
  const kategorie = document.getElementById('sn-kategorie')?.value?.trim() || '';
  const datum = document.getElementById('sn-datum')?.value || '';
  const text = document.getElementById('sn-text')?.value?.trim() || '';
  if (!titel) { toast('Überschrift ist Pflichtfeld', 'warning'); return; }

  const result = await reicheNichtSportEin('Schulnachricht', { titel, kategorie, datum, text });
  if (result) {
    ['sn-titel','sn-kategorie','sn-text'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.querySelector('.modal-overlay')?.remove();
    navigateTo('meine-meldungen');
  }
}

// Countdown-Ankündigung einreichen
async function cdEinreichen() {
  const name = document.getElementById('cd-name')?.value?.trim();
  const datum = document.getElementById('cd-datum')?.value || '';
  const ort = document.getElementById('cd-ort')?.value?.trim() || '';
  const sportart = document.getElementById('cd-sportart')?.value?.trim() || '';
  if (!name || !datum) { toast('Event-Name und Datum sind Pflichtfelder', 'warning'); return; }

  const result = await reicheNichtSportEin('Countdown-Ankündigung', { titel: name, datum: datum.slice(0,10), ort, sportart });
  if (result) {
    document.querySelector('.modal-overlay')?.remove();
    navigateTo('meine-meldungen');
  }
}

// ══════════════════════════════════════════════════════════════
// VERANSTALTUNGS-GESAMTPOSTER
// ══════════════════════════════════════════════════════════════
async function zeigeVeranstaltungsPosterModal() {
  const select = document.getElementById('veranstaltungs-poster-select');
  const wettbewerbName = select?.value;
  if (!wettbewerbName) { toast('Bitte eine Veranstaltung auswählen', 'warning'); return; }

  toast('Lade Meldungen...', 'info');
  const alle = await ladeErfolge();
  const meldungen = alle.filter(e =>
    e.wettbewerbText === wettbewerbName &&
    ['Freigegeben','Veröffentlicht'].includes(e.status)
  ).sort((a,b) => (a.platzierung||99) - (b.platzierung||99));

  if (!meldungen.length) { toast('Keine freigegebenen Meldungen für diese Veranstaltung', 'warning'); return; }

  // Bilder laden
  for (const m of meldungen) {
    if (!m.bilder) {
      try { m.bilder = await DB.getBilder(m.id); } catch(e) { m.bilder = []; }
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';

  const datum = meldungen[0]?.datum ? new Date(meldungen[0].datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const ort = meldungen[0]?.ort || '';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🏆 Veranstaltungs-Gesamtposter – ${esc(wettbewerbName)}</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      <div class="alert alert-info mb-3">
        <span class="alert-icon">ℹ️</span>
        <span>${meldungen.length} freigegebene Meldungen · ${datum}${ort?' · '+ort:''}</span>
      </div>
      <div class="tabs mb-3" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="tab-btn active" onclick="vpFormatWechsel('hochformat')">📱 Hochformat (4:5)</button>
        <button class="tab-btn" onclick="vpFormatWechsel('querformat')">🖥️ Querformat (16:9)</button>
      </div>
      <div style="text-align:center">
        <canvas id="vp-canvas" width="1080" height="1350"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
        <p class="text-xs mt-2" style="color:#888" id="vp-info">1080×1350 px · Hochformat</p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-primary" onclick="vpHerunterladen('${esc(wettbewerbName)}')">🖼️ PNG herunterladen</button>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  window._vpMeldungen = meldungen;
  window._vpWettbewerb = wettbewerbName;
  window._vpFormat = 'hochformat';
  setTimeout(()=>zeichneVeranstaltungsPoster('vp-canvas', meldungen, wettbewerbName, datum, ort, 'hochformat'), 100);
}

function vpFormatWechsel(format) {
  window._vpFormat = format;
  document.querySelectorAll('.modal .tab-btn').forEach(b=>{
    b.classList.toggle('active', b.textContent.toLowerCase().includes(format==='hochformat'?'hochformat':'querformat'));
  });
  const canvas = document.getElementById('vp-canvas');
  const info = document.getElementById('vp-info');
  if (format==='querformat') {
    if(canvas){canvas.width=1920;canvas.height=1080;canvas.style.maxHeight='45vh';}
    if(info) info.textContent='1920×1080 px · Querformat';
  } else {
    if(canvas){canvas.width=1080;canvas.height=1350;canvas.style.maxHeight='60vh';}
    if(info) info.textContent='1080×1350 px · Hochformat';
  }
  const m=window._vpMeldungen, wb=window._vpWettbewerb;
  const datum=m[0]?.datum?new Date(m[0].datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
  zeichneVeranstaltungsPoster('vp-canvas', m, wb, datum, m[0]?.ort||'', format);
}

function vpHerunterladen(name) {
  const canvas = document.getElementById('vp-canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = `SLZB_Veranstaltung_${name.replace(/[^a-zA-Z0-9]/g,'-')}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// Canvas-Rendering: Veranstaltungs-Gesamtposter
async function zeichneVeranstaltungsPoster(canvasId, meldungen, wettbewerb, datum, ort, format='hochformat') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const querformat = format === 'querformat';
  const W = querformat ? 1920 : 1080;
  const H = querformat ? 1080 : 1350;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const prioFarbe = (m) => {
    if (m.medaille==='Gold') return SLZB_COLORS.gold;
    if (m.medaille==='Silber') return SLZB_COLORS.silver;
    if (m.medaille==='Bronze') return SLZB_COLORS.bronze;
    if (m.platzierung===1) return SLZB_COLORS.gold;
    if (m.platzierung===2) return SLZB_COLORS.silver;
    if (m.platzierung===3) return SLZB_COLORS.bronze;
    return SLZB_COLORS.red;
  };

  // Hintergrund
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0a0c1a'); grad.addColorStop(1,'#1B1C1F');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  zeichneSlzbDeko(ctx, W, H);

  // Header
  zeichneSlzbHeader(ctx, W, H, 'SLZB Berlin', datum);

  // Veranstaltungsname
  const HEADER_H = Math.round(H*0.095);
  let y = HEADER_H + Math.round(H*0.025);
  ctx.fillStyle=SLZB_COLORS.red; ctx.font=`bold ${Math.round(H*0.014)}px Montserrat, Arial, sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.letterSpacing='4px';
  ctx.fillText('ERGEBNISSE', W/2, y); y+=Math.round(H*0.022);
  ctx.letterSpacing='0px';
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect((W-80)/2, y, 80, 2); y+=Math.round(H*0.016);

  // Wettbewerbsname
  const wbSz = querTitelFontSize(wettbewerb, W-80, ctx);
  const wbWoerter = wettbewerb.toUpperCase().split(' ');
  const wbMid = wbWoerter.length>3 ? Math.ceil(wbWoerter.length/2) : wbWoerter.length;
  ctx.font=`bold italic ${wbSz}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle=SLZB_COLORS.white; ctx.textAlign='center';
  ctx.fillText(wbWoerter.slice(0,wbMid).join(' '), W/2, y, W-60); y+=wbSz+6;
  ctx.fillStyle=SLZB_COLORS.red;
  if (wbWoerter.slice(wbMid).length) { ctx.fillText(wbWoerter.slice(wbMid).join(' '), W/2, y, W-60); y+=wbSz+6; }

  // Datum + Ort
  if (datum||ort) {
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font=`${Math.round(H*0.016)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText([datum,ort].filter(Boolean).join(' · '), W/2, y, W-80); y+=Math.round(H*0.030);
  }

  y+=Math.round(H*0.010);

  // Ergebnisliste
  const FOOTER_H = Math.round(H*0.075);
  const verfH = H - y - FOOTER_H - Math.round(H*0.010);
  const maxZeilen = Math.min(meldungen.length, querformat ? 8 : 10);
  const ROW_H = Math.floor(verfH / maxZeilen);
  const PAD = Math.round(W*0.04);

  meldungen.slice(0, maxZeilen).forEach((m, i) => {
    const ry = y + i*ROW_H;
    const farbe = prioFarbe(m);
    const athlet = (m.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', ') || m.titel || '–';
    const sportart = m.sportartText || '';

    // Zeilen-Hintergrund
    ctx.fillStyle = i%2===0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(PAD, ry+2, W-2*PAD, ROW_H-4);

    // Farbiger Akzentbalken links
    ctx.fillStyle = farbe;
    ctx.fillRect(PAD, ry+2, 4, ROW_H-4);

    // Platzierungs-Oval
    const ovalW=Math.round(ROW_H*0.7), ovalH=Math.round(ROW_H*0.65);
    const ovalX=PAD+10, ovalY=ry+(ROW_H-ovalH)/2;
    ctx.fillStyle=farbe; slzbRoundRect(ctx,ovalX,ovalY,ovalW,ovalH,ovalH/2); ctx.fill();
    ctx.fillStyle='#000'; ctx.font=`bold italic ${Math.round(ovalH*0.55)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(m.platzierung?String(m.platzierung):'–', ovalX+ovalW/2, ovalY+ovalH/2);

    // Athletenname
    const textX = PAD+ovalW+20;
    const textW = W-textX-PAD-Math.round(W*0.15);
    ctx.fillStyle=SLZB_COLORS.white; ctx.font=`bold ${Math.round(ROW_H*0.38)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(athlet, textX, ry+ROW_H*0.38, textW);

    // Sportart + Disziplin
    const info = [sportart, m.disziplin].filter(Boolean).join(' · ');
    if (info) {
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font=`${Math.round(ROW_H*0.28)}px Montserrat, Arial, sans-serif`;
      ctx.fillText(info, textX, ry+ROW_H*0.72, textW);
    }

    // Medaille rechts
    if (m.medaille && m.medaille!=='keine') {
      ctx.fillStyle=farbe; ctx.font=`bold ${Math.round(ROW_H*0.30)}px Montserrat, Arial, sans-serif`;
      ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillText(m.medaille, W-PAD, ry+ROW_H/2);
    }
  });

  if (meldungen.length > maxZeilen) {
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font=`italic ${Math.round(H*0.014)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(`+ ${meldungen.length-maxZeilen} weitere Ergebnisse`, W/2, y+maxZeilen*ROW_H+8);
  }

  // Instagram-Hinweis + Footer
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font=`${Math.round(H*0.012)}px Montserrat, Arial, sans-serif`;
  ctx.textAlign='right'; ctx.textBaseline='bottom';
  ctx.fillText('📸 Folge uns auf Instagram: @slzberlin', W-Math.round(W*0.03), H-Math.round(H*0.025));
  zeichneSlzbFooterNeu(ctx, W, H);
}
