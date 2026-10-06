// ============================================================
// SLZB-Erfolge v2 – App-Logik Teil 2
// ============================================================

// ── Erfolg-Detail ────────────────────────────────────────────
function renderErfolgDetail() {
  const e=SLZB_DB.getErfolg(APP.currentErfolgId);
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
    ${e.dublettenhinweis?`<div class="datenschutz-warning"><h4>🔁 Dublettenverdacht</h4><p>${esc(e.dublettenhinweisText)}</p></div>`:''}

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('kerndaten')">Kerndaten</button>
      <button class="tab-btn" onclick="switchTab('beteiligte')">Beteiligte (${e.beteiligte?.length||0})</button>
      <button class="tab-btn" onclick="switchTab('texte')">Texte</button>
      <button class="tab-btn" onclick="switchTab('datenschutz')">Datenschutz</button>
      <button class="tab-btn" onclick="switchTab('ausgaben')">Ausgaben</button>
      <button class="tab-btn" onclick="switchTab('protokoll')">Protokoll (${e.protokoll?.length||0})</button>
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
      const ok=(f)=>s&&s.ew[f]&&!s.ewWiderruf&&!abgelaufen;
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
        <span><strong>Teamfoto-Regel:</strong> Fehlt für eine identifizierbare Person die Einwilligung, darf das Teamfoto nicht verwendet werden. Keine automatische Unkenntlichmachung.</span></div>
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
          {icon:'📄',label:'A3-Aushang',desc:'Druckbares PDF (neues Fenster)',fn:`zeigeA3Vorschau('${e.id}')`,cls:'primary'},
          {icon:'🖥️',label:'Bildschirm',desc:'960×1080 px HTML-Download',fn:`zeigeBildschirmModal('${e.id}')`,cls:'primary'},
          {icon:'📱',label:'Social-Media-Paket',desc:'Kein Auto-Posting. Nur Export.',fn:`zeigeSocialModal('${e.id}')`,cls:'warning'},
        ].map(a=>`<div class="card" style="border:2px solid var(--slzb-border)">
          <div class="card-body text-center">
            <div style="font-size:2rem">${a.icon}</div>
            <div class="font-bold mt-2">${a.label}</div>
            <div class="text-xs text-muted mt-1">${a.desc}</div>
            <button class="btn btn-${a.cls} btn-sm mt-3 w-full" onclick="${a.fn}" ${!kannAusgeben?'disabled':''}>Vorschau / Export</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── Statusaktionen ───────────────────────────────────────────
function getStatusAktionen(status,rolle) {
  const map={
    trainer:{
      'Entwurf':[{status:'Eingereicht',label:'📤 Einreichen',cls:'primary'}],
      'Rückfrage an Melder':[{status:'Eingereicht',label:'📤 Erneut einreichen',cls:'primary'}],
    },
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
        {status:'Freigabe Öffentlichkeitsarbeit',label:'📢 Zur ÖA-Freigabe',cls:'primary'},
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

function statusWechselUI(erfolgId,statusNeu) {
  const kommentar=document.getElementById('status-kommentar')?.value||'';
  SLZB_DB.statusWechsel(erfolgId,statusNeu,Auth.name(),kommentar);
  toast(`Status → ${statusNeu}`,'success');
  navigateTo('erfolg-detail',{currentErfolgId:erfolgId});
}

function speichereArtikeltext(erfolgId) {
  const e=SLZB_DB.getErfolg(erfolgId); if(!e) return;
  e.textArtikel=document.getElementById('edit-artikel')?.value||'';
  slzbSave(); toast('Artikeltext gespeichert','success');
}

function generiereKIText(erfolgId) {
  const e=SLZB_DB.getErfolg(erfolgId); if(!e) return;
  const wb=SLZB_DB.getWettbewerb(e.wettbewerbId);
  toast('KI-Entwurf wird generiert...','info');
  setTimeout(()=>{
    e.textKIEntwurf=`[KI-ENTWURF – NICHT VERÖFFENTLICHEN]\n\nÜberschrift: ${e.titel.replace('[SYNTHETISCH] ','')}\n\nKurzmeldung: Das SLZB Berlin freut sich über einen hervorragenden Erfolg bei ${wb?.name||'dem Wettbewerb'}. ${e.platzierung?`Platzierung: ${e.platzierung}. Platz.`:''} ${e.ergebnisWert?`Ergebnis: ${e.ergebnisWert} ${e.ergebnisEinheit||''}.`:''}\n\nHinweis: Keine erfundenen Fakten. Keine erfundenen Zitate. Menschliche Freigabe verpflichtend.`;
    slzbSave();
    toast('KI-Entwurf generiert – bitte prüfen','success');
    navigateTo('erfolg-detail',{currentErfolgId:erfolgId});
  },1500);
}

// ── Ausgabe-Modals ───────────────────────────────────────────
function zeigeA3Vorschau(erfolgId) {
  const e=SLZB_DB.getErfolg(erfolgId); if(!e) return;
  PDF.zeigeA3Vorschau(e, e.beteiligte||[]);
}

function zeigeBildschirmModal(erfolgId) {
  const e=SLZB_DB.getErfolg(erfolgId); if(!e) return;
  const sp=SLZB_DB.getSportart(e.sportartId);
  const mi={Gold:'🥇',Silber:'🥈',Bronze:'🥉'};
  const namen=(e.beteiligte||[]).filter(b=>SLZB_DB.pruefeEinwilligung(b.schuelerId,'digitalSignage').ok)
    .map(b=>SLZB_DB.getSchueler(b.schuelerId)?.anzeigename||b.schuelerId);
  const overlay=document.createElement('div'); overlay.className='modal-overlay';
  overlay.innerHTML=`<div class="modal">
    <div class="modal-header"><h3>🖥️ Bildschirm-Vorschau</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <div class="modal-body text-center">
      <div class="screen-preview">
        <div class="screen-header">🏫 SLZB Berlin</div>
        <div class="screen-body">
          <div class="screen-platz">${e.platzierung?e.platzierung+'.':'–'}</div>
          <div class="screen-medaille">${e.medaille&&e.medaille!=='keine'?mi[e.medaille]||'':''}</div>
          <div class="screen-sport">${esc(sp?.name||'')}${e.disziplin?' · '+esc(e.disziplin):''}</div>
          <div class="screen-titel">${esc(e.titel.replace('[SYNTHETISCH] ','').slice(0,60))}${e.titel.length>60?'…':''}</div>
          ${namen.length?`<div class="screen-name">👤 ${namen.slice(0,3).join(' · ')}${namen.length>3?' + '+(namen.length-3)+' weitere':''}</div>`:''}
          <div class="screen-name" style="margin-top:8px;font-size:.6rem;opacity:.7">${fmt(e.datum)} · ${esc(e.ort||'')}</div>
        </div>
        <div class="screen-footer">Anzeigedauer: 15 Sek.</div>
      </div>
      <p class="text-xs text-muted mt-3">Vorschau skaliert. Originalformat: 960×1080 px</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
      <button class="btn btn-primary" onclick="PDF.erzeugeScreenHTML(SLZB_DB.getErfolg('${e.id}'),SLZB_DB.getErfolg('${e.id}').beteiligte||[]);this.closest('.modal-overlay').remove();toast('HTML heruntergeladen','success')">🖥️ HTML herunterladen</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function zeigeSocialModal(erfolgId) {
  const e=SLZB_DB.getErfolg(erfolgId); if(!e) return;
  const smNok=(e.beteiligte||[]).filter(b=>!SLZB_DB.pruefeEinwilligung(b.schuelerId,'socialMedia').ok);
  const overlay=document.createElement('div'); overlay.className='modal-overlay';
  overlay.innerHTML=`<div class="modal modal-lg">
    <div class="modal-header"><h3>📱 Social-Media-Paket</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <div class="modal-body">
      <div class="alert alert-danger mb-3"><span class="alert-icon">🔒</span>
        <span><strong>Social Media ist standardmäßig gesperrt.</strong> Kein Auto-Posting. Nur Export-Paket. Freigabe darf niemals aus anderen Freigaben abgeleitet werden.</span></div>
      ${smNok.length?`<div class="datenschutz-warning mb-3"><h4>⚠️ Fehlende Social-Media-Freigaben</h4>
        <ul>${smNok.map(b=>{const s=SLZB_DB.getSchueler(b.schuelerId);return`<li>${esc(s?.anzeigename||b.schuelerId)}: Keine Social-Media-Freigabe</li>`}).join('')}</ul></div>`:''}
      <div class="alert alert-info"><span class="alert-icon">📦</span>
        <span>Das Paket enthält: text_lang.txt, text_kurz.txt, hashtags.txt, veroeffentlichungsnachweis.txt</span></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
      <button class="btn btn-warning" onclick="const r=PDF.erzeugeSocialMediaPaket(SLZB_DB.getErfolg('${e.id}'),SLZB_DB.getErfolg('${e.id}').beteiligte||[]);toast('Paket heruntergeladen ('+r.smNamen+' Personen freigegeben)','success');this.closest('.modal-overlay').remove()">📦 Paket herunterladen</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

// ── Einwilligungen ───────────────────────────────────────────
function renderEinwilligungen() {
  return`<div class="page">
    <div class="page-header"><h1>🔒 Einwilligungsverwaltung</h1><p>Nur für Datenschutzrolle und Admin.</p></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Schüler/in</th><th>Gültig bis</th><th>Foto</th><th>Print</th><th>Homepage</th><th>Dig.Sign.</th><th>Social</th><th>Einzel</th><th>Widerruf</th><th>Aktionen</th></tr></thead>
      <tbody>${SLZB_DB.schueler.map(s=>{
        const abgelaufen=s.ewGueltigBis&&new Date(s.ewGueltigBis)<new Date();
        return`<tr>
          <td>${esc(s.anzeigename)}<br><span class="text-xs text-muted">${esc(s.schuelerNr||s.id)}</span></td>
          <td class="text-sm">${fmt(s.ewGueltigBis)||'–'}${abgelaufen?'<br><span class="badge badge-danger">Abgelaufen</span>':''}</td>
          <td>${einwilligungIcon(s.ew.foto)}</td><td>${einwilligungIcon(s.ew.print)}</td>
          <td>${einwilligungIcon(s.ew.homepage)}</td><td>${einwilligungIcon(s.ew.digitalSignage)}</td>
          <td>${einwilligungIcon(s.ew.socialMedia)}</td><td>${einwilligungIcon(s.ew.einzeldarstellung)}</td>
          <td>${s.ewWiderruf?'<span class="badge badge-danger">Widerrufen</span>':'<span class="badge badge-success">Aktiv</span>'}</td>
          <td>${!s.ewWiderruf&&Auth.canDo('datenschutz')?`<button class="btn btn-danger btn-sm" onclick="widerrufEinwilligung('${s.id}','${esc(s.anzeigename)}')">Widerrufen</button>`:'–'}</td>
        </tr>`;}).join('')}
      </tbody>
    </table></div></div>
  </div>`;
}

function widerrufEinwilligung(schuelerId,name) {
  if(!confirm(`Einwilligung von ${name} wirklich widerrufen?\n\nDies sperrt alle betroffenen Meldungen sofort.`)) return;
  const s=SLZB_DB.getSchueler(schuelerId); if(!s) return;
  s.ewWiderruf=true; s.ewWiderrufDatum=new Date().toISOString();
  Object.keys(s.ew).forEach(k=>s.ew[k]=false);
  SLZB_DB.erfolge.forEach(e=>{
    if(e.beteiligte?.some(b=>b.schuelerId===schuelerId)){
      if(['Veröffentlicht','Freigegeben'].includes(e.status)){
        SLZB_DB.statusWechsel(e.id,'Wegen Einwilligung gesperrt',Auth.name(),`Widerruf Einwilligung: ${name}`);
      }
    }
  });
  slzbSave(); toast(`Einwilligung von ${name} widerrufen. Betroffene Meldungen gesperrt.`,'warning');
  navigateTo('einwilligungen');
}

// ── Ausgaben ─────────────────────────────────────────────────
function renderAusgaben() {
  const freigegebene=SLZB_DB.erfolge.filter(e=>['Freigegeben','Veröffentlicht'].includes(e.status));
  return`<div class="page">
    <div class="page-header"><h1>📤 Ausgaben & Freigaben</h1></div>
    <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
      <span>Ausgaben nur für Status <strong>Freigegeben</strong> oder <strong>Veröffentlicht</strong>.</span></div>
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
  
    <div id="tab-sd-wettbewerbe" class="tab-panel">
      <div class="card-header" style="padding:16px 20px;display:flex;align-items:center;gap:10px;background:#fff;border-radius:var(--radius-lg) var(--radius-lg) 0 0;border:1px solid var(--slzb-border);border-bottom:none">
        <h2 style="font-size:1rem;font-weight:700;color:var(--slzb-primary);flex:1">Wettbewerbe</h2>
        <button class="btn btn-outline btn-sm" onclick="zeigeNeuerWettbewerbModal()">+ Neu</button>
      </div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Veranstalter</th><th>Ort</th><th>Beginn</th><th>Ebene</th></tr></thead>
        <tbody>${SLZB_DB.wettbewerbe.map(w=>`<tr><td>${esc(w.name)}</td><td>${esc(w.veranstalter||'–')}</td><td>${esc(w.ort||'–')}</td><td>${fmt(w.beginn)}</td><td>${ebeneBadge(w.ebene)}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>
    <div id="tab-sd-schueler" class="tab-panel">
      <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span><span>Schülerdaten sind intern. Alle Daten hier sind synthetisch.</span></div>
      <div class="card-header" style="padding:16px 20px;display:flex;align-items:center;gap:10px;background:#fff;border-radius:var(--radius-lg) var(--radius-lg) 0 0;border:1px solid var(--slzb-border);border-bottom:none">
        <h2 style="font-size:1rem;font-weight:700;color:var(--slzb-primary);flex:1">Schüler</h2>
        <button class="btn btn-outline btn-sm" onclick="zeigeNeuerSchuelerModal()">+ Neu</button>
      </div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Nr.</th><th>Anzeigename</th><th>Klasse</th><th>Gruppe</th><th>Sportart</th><th>Foto</th><th>Print</th><th>Social</th></tr></thead>
        <tbody>${SLZB_DB.schueler.map(s=>{const sp=SLZB_DB.getSportart(s.sportartId);
          return`<tr><td class="text-xs text-muted">${esc(s.schuelerNr||s.id)}</td><td>${esc(s.anzeigename)}</td>
            <td>${esc(s.klasse||'–')}</td><td>${esc(s.gruppe||'–')}</td><td>${esc(sp?.name||'–')}</td>
            <td>${einwilligungIcon(s.ew.foto)}</td><td>${einwilligungIcon(s.ew.print)}</td><td>${einwilligungIcon(s.ew.socialMedia)}</td>
          </tr>`;}).join('')}
        </tbody>
      </table></div></div>
    </div>
    <div id="tab-sd-schueler-import" class="tab-panel">
      <div class="card mb-3">
        <div class="card-header"><h2>📥 Schüler aus Excel importieren</h2></div>
        <div class="card-body">
          <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
            <span>Erwartete Spalten: <strong>Schüler-ID | Name (Nachname) | Vorname | Status | Sportart | Klasse | Jahrgang</strong><br>
            Alle Einwilligungen werden auf <strong>true</strong> gesetzt (Opt-Out-Prinzip). Widersprüche separat über die Negativ-Liste eintragen.</span></div>
          <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
            <span>Nur Excel-Dateien (.xlsx) oder CSV. Keine echten Daten in der Demo-Umgebung testen.</span></div>
          <div class="form-group">
            <label>Excel- oder CSV-Datei hochladen</label>
            <input type="file" id="schueler-import-file" accept=".xlsx,.xls,.csv"
              onchange="schuelerImportDateiGewaehlt(this)">
          </div>
          <div id="schueler-import-preview"></div>
        </div>
      </div>
    </div>

    <div id="tab-sd-negativ" class="tab-panel">
      <div class="card mb-3">
        <div class="card-header"><h2>🚫 Negativ-Liste (Widersprüche)</h2></div>
        <div class="card-body">
          <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
            <span>Wer auf der Negativ-Liste steht hat <strong>widersprochen</strong>. Alle anderen Schüler haben alle Freigaben aktiv.<br>
            Spalten: <strong>Name | Vorname | Klasse | Widerspruch Namensveröffentlichung (Print/Presse/Homepage/Events/Social) | Widerspruch Fotoveröffentlichung (Print/Presse/Homepage/Events/Social)</strong></span></div>
          <div class="form-group">
            <label>Negativ-Liste hochladen (Excel oder CSV)</label>
            <input type="file" id="negativ-import-file" accept=".xlsx,.xls,.csv"
              onchange="negativImportDateiGewaehlt(this)">
          </div>
          <div id="negativ-import-preview"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Aktuelle Widersprüche</h2></div>
        <div class="card-body">
          ${SLZB_DB.schueler.filter(s=>s.ewWiderruf||Object.values(s.ew||{}).some(v=>!v)).length===0
            ? '<p class="text-muted">Keine Widersprüche erfasst.</p>'
            : `<div class="table-wrap"><table>
              <thead><tr><th>Schüler/in</th><th>Klasse</th><th>Foto</th><th>Print</th><th>Homepage</th><th>Social</th><th>Widerruf</th></tr></thead>
              <tbody>${SLZB_DB.schueler.filter(s=>s.ewWiderruf||!s.ew?.foto||!s.ew?.print||!s.ew?.homepage||!s.ew?.socialMedia).map(s=>`<tr>
                <td>${esc(s.anzeigename)}</td>
                <td>${esc(s.klasse||'–')}</td>
                <td>${einwilligungIcon(s.ew?.foto)}</td>
                <td>${einwilligungIcon(s.ew?.print)}</td>
                <td>${einwilligungIcon(s.ew?.homepage)}</td>
                <td>${einwilligungIcon(s.ew?.socialMedia)}</td>
                <td>${s.ewWiderruf?'<span class="badge badge-danger">Widerrufen</span>':'–'}</td>
              </tr>`).join('')}</tbody>
            </table></div>`}
        </div>
      </div>
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

// ── Stammdaten ───────────────────────────────────────────────
function renderStammdaten() {
  return`<div class="page">
    <div class="page-header"><h1>⚙️ Stammdaten</h1></div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('sd-sportarten')">Sportarten (${SLZB_DB.sportarten.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-wettbewerbe')">Wettbewerbe (${SLZB_DB.wettbewerbe.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-schueler')">Schüler (${SLZB_DB.schueler.length})</button>
      <button class="tab-btn" onclick="switchTab('sd-schueler-import')">📥 Excel-Import</button>
      <button class="tab-btn" onclick="switchTab('sd-negativ')">🚫 Negativ-Liste</button>
      <button class="tab-btn" onclick="switchTab('sd-teams')">Teams (${SLZB_DB.teams.length})</button>
    </div>

    <div id="tab-sd-sportarten" class="tab-panel active">
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Kürzel</th><th>Name</th><th>Kategorie</th><th>Aktiv</th></tr></thead>
        <tbody>${SLZB_DB.sportarten.map(s=>`<tr><td><strong>${esc(s.kuerzel)}</strong></td><td>${esc(s.name)}</td><td>${esc(s.kategorie)}</td><td>${s.aktiv?'✅':'❌'}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>

    <div id="tab-sd-wettbewerbe" class="tab-panel">
      <div style="padding:16px 20px;display:flex;align-items:center;gap:10px;background:#fff;border-radius:var(--radius-lg) var(--radius-lg) 0 0;border:1px solid var(--slzb-border);border-bottom:none">
        <h2 style="font-size:1rem;font-weight:700;color:var(--slzb-primary);flex:1">Wettbewerbe</h2>
        <button class="btn btn-outline btn-sm" onclick="zeigeNeuerWettbewerbModal()">+ Neu</button>
      </div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Veranstalter</th><th>Ort</th><th>Beginn</th><th>Ebene</th></tr></thead>
        <tbody>${SLZB_DB.wettbewerbe.map(w=>`<tr><td>${esc(w.name)}</td><td>${esc(w.veranstalter||'–')}</td><td>${esc(w.ort||'–')}</td><td>${fmt(w.beginn)}</td><td>${ebeneBadge(w.ebene)}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>

    <div id="tab-sd-schueler" class="tab-panel">
      <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span><span>Schülerdaten sind intern. Alle Daten hier sind synthetisch.</span></div>
      <div style="padding:16px 20px;display:flex;align-items:center;gap:10px;background:#fff;border-radius:var(--radius-lg) var(--radius-lg) 0 0;border:1px solid var(--slzb-border);border-bottom:none">
        <h2 style="font-size:1rem;font-weight:700;color:var(--slzb-primary);flex:1">Schüler</h2>
        <button class="btn btn-outline btn-sm" onclick="zeigeNeuerSchuelerModal()">+ Neu</button>
      </div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Nr.</th><th>Anzeigename</th><th>Klasse</th><th>Gruppe</th><th>Sportart</th><th>Foto</th><th>Print</th><th>Social</th></tr></thead>
        <tbody>${SLZB_DB.schueler.map(s=>{const sp=SLZB_DB.getSportart(s.sportartId);
          return`<tr><td class="text-xs text-muted">${esc(s.schuelerNr||s.id)}</td><td>${esc(s.anzeigename)}</td>
            <td>${esc(s.klasse||'–')}</td><td>${esc(s.gruppe||'–')}</td><td>${esc(sp?.name||'–')}</td>
            <td>${einwilligungIcon(s.ew?.foto)}</td><td>${einwilligungIcon(s.ew?.print)}</td><td>${einwilligungIcon(s.ew?.socialMedia)}</td>
          </tr>`;}).join('')}
        </tbody>
      </table></div></div>
    </div>

    <div id="tab-sd-schueler-import" class="tab-panel">
      <div class="card mb-3">
        <div class="card-header"><h2>📥 Schüler aus Excel/CSV importieren</h2></div>
        <div class="card-body">
          <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
            <span>Erwartete Spalten: <strong>Schüler-ID | Name (Nachname) | Vorname | Status | Sportart | Klasse | Jahrgang</strong><br>
            Alle Einwilligungen werden auf <strong>aktiv</strong> gesetzt (Opt-Out-Prinzip).</span></div>
          <div class="form-group">
            <label>CSV-Datei hochladen</label>
            <input type="file" id="schueler-import-file" accept=".csv"
              onchange="schuelerImportDateiGewaehlt(this)">
          </div>
          <div id="schueler-import-preview"></div>
        </div>
      </div>
    </div>

    <div id="tab-sd-negativ" class="tab-panel">
      <div class="card mb-3">
        <div class="card-header"><h2>🚫 Negativ-Liste (Widersprüche)</h2></div>
        <div class="card-body">
          <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
            <span>Wer auf der Negativ-Liste steht hat <strong>widersprochen</strong>.<br>
            Spalten: <strong>Name | Vorname | Klasse | Widerspruch Name (Print/Presse/Homepage/Events/Social) | Widerspruch Foto (Print/Presse/Homepage/Events/Social)</strong></span></div>
          <div class="form-group">
            <label>Negativ-Liste hochladen (CSV)</label>
            <input type="file" id="negativ-import-file" accept=".csv"
              onchange="negativImportDateiGewaehlt(this)">
          </div>
          <div id="negativ-import-preview"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Aktuelle Widersprüche</h2></div>
        <div class="card-body">
          ${SLZB_DB.schueler.filter(s=>s.ewWiderruf||!s.ew?.foto||!s.ew?.print||!s.ew?.homepage||!s.ew?.socialMedia).length===0
            ? '<p class="text-muted">Keine Widersprüche erfasst.</p>'
            : `<div class="table-wrap"><table>
              <thead><tr><th>Schüler/in</th><th>Klasse</th><th>Foto</th><th>Print</th><th>Homepage</th><th>Social</th></tr></thead>
              <tbody>${SLZB_DB.schueler.filter(s=>s.ewWiderruf||!s.ew?.foto||!s.ew?.print||!s.ew?.homepage||!s.ew?.socialMedia).map(s=>`<tr>
                <td>${esc(s.anzeigename)}</td><td>${esc(s.klasse||'–')}</td>
                <td>${einwilligungIcon(s.ew?.foto)}</td><td>${einwilligungIcon(s.ew?.print)}</td>
                <td>${einwilligungIcon(s.ew?.homepage)}</td><td>${einwilligungIcon(s.ew?.socialMedia)}</td>
              </tr>`).join('')}</tbody>
            </table></div>`}
        </div>
      </div>
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
          <span>Pflichtfelder: Titel, Sportart, Datum. Bilder können nicht per Import hochgeladen werden.</span></div>
        <button class="btn btn-outline mt-2" onclick="PDF.downloadImportvorlage()">⬇️ Vorlage herunterladen (CSV)</button>
      </div>
    </div>
    <div class="card mb-3">
      <div class="card-header"><h2>Datei hochladen</h2></div>
      <div class="card-body">
        <div class="form-group"><label>CSV-Datei</label>
          <input type="file" id="import-file" accept=".csv" onchange="importDateiGewaehlt(this)"></div>
        <div id="import-preview"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Bisherige Importaufträge</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Datei</th><th>Datum</th><th>Gesamt</th><th>OK</th><th>Fehler</th><th>Status</th></tr></thead>
        <tbody>${SLZB_DB.importauftraege.map(i=>`<tr>
          <td>${esc(i.quelldateiName)}</td><td class="text-sm">${fmtDT(i.importDatum)}</td>
          <td>${i.gesamtZeilen}</td>
          <td><span class="badge badge-success">${i.erfolgreich}</span></td>
          <td><span class="badge badge-danger">${i.fehler}</span></td>
          <td>${statusBadge(i.status)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  </div>`;
}

// ── Nutzerverwaltung ─────────────────────────────────────────
function renderNutzerverwaltung() {
  const rollenLabel={trainer:'Trainer/Melder',redaktion:'Redaktion',oea:'Öffentlichkeitsarbeit',datenschutz:'Datenschutz',admin:'Administrator'};
  return`<div class="page">
    <div class="page-header"><h1>👥 Nutzerverwaltung</h1></div>
    <div class="card mb-3">
      <div class="card-header"><h2>Neuen Nutzer anlegen</h2></div>
      <div class="card-body">
        <div class="form-row cols-4">
          <div class="form-group"><label>Benutzername <span class="required">*</span></label>
            <input type="text" id="nu-username" placeholder="trainer2"></div>
          <div class="form-group"><label>Anzeigename <span class="required">*</span></label>
            <input type="text" id="nu-anzeige" placeholder="M. Mustermann"></div>
          <div class="form-group"><label>Rolle <span class="required">*</span></label>
            <select id="nu-rolle">
              ${Object.entries(rollenLabel).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
            </select></div>
          <div class="form-group"><label>Passwort <span class="required">*</span></label>
            <input type="password" id="nu-passwort" placeholder="Mindestens 8 Zeichen"></div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="erstelleNutzer()">+ Nutzer anlegen</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Vorhandene Nutzer</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Benutzername</th><th>Anzeigename</th><th>Rolle</th><th>Aktiv</th><th>Aktionen</th></tr></thead>
        <tbody>${SLZB_DB.nutzer.map(n=>`<tr>
          <td><strong>${esc(n.username)}</strong></td>
          <td>${esc(n.anzeigename)}</td>
          <td><span class="badge badge-info">${esc(rollenLabel[n.rolle]||n.rolle)}</span></td>
          <td>${n.aktiv!==false?'✅':'❌'}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="zeigePasswortAendern('${n.id}','${esc(n.anzeigename)}')">🔑 Passwort</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  </div>`;
}

async function erstelleNutzer() {
  const username=document.getElementById('nu-username')?.value?.trim()||'';
  const anzeige=document.getElementById('nu-anzeige')?.value?.trim()||'';
  const rolle=document.getElementById('nu-rolle')?.value||'trainer';
  const passwort=document.getElementById('nu-passwort')?.value||'';
  if(!username||!anzeige||!passwort){toast('Alle Felder sind Pflichtfelder','warning');return;}
  if(passwort.length<8){toast('Passwort muss mindestens 8 Zeichen haben','warning');return;}
  const result=await Auth.erstelleNutzer(username,passwort,anzeige,rolle);
  if(!result.ok){toast('Fehler: '+result.fehler,'danger');return;}
  toast(`Nutzer ${username} angelegt!`,'success');
  navigateTo('nutzerverwaltung');
}

function zeigePasswortAendern(nutzerId,name) {
  const overlay=document.createElement('div'); overlay.className='modal-overlay';
  overlay.innerHTML=`<div class="modal" style="max-width:400px">
    <div class="modal-header"><h3>🔑 Passwort ändern: ${esc(name)}</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Neues Passwort <span class="required">*</span></label>
        <input type="password" id="pw-neu-admin" placeholder="Mindestens 8 Zeichen"></div>
      <div class="form-group"><label>Passwort wiederholen <span class="required">*</span></label>
        <input type="password" id="pw-wdh-admin" placeholder="Passwort wiederholen"></div>
      <div id="pw-admin-error"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="aenderePasswortAdmin('${nutzerId}')">Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function aenderePasswortAdmin(nutzerId) {
  const neu=document.getElementById('pw-neu-admin')?.value||'';
  const wdh=document.getElementById('pw-wdh-admin')?.value||'';
  const errEl=document.getElementById('pw-admin-error');
  if(neu.length<8){errEl.innerHTML='<div class="alert alert-danger mt-2"><span class="alert-icon">❌</span><span>Mindestens 8 Zeichen.</span></div>';return;}
  if(neu!==wdh){errEl.innerHTML='<div class="alert alert-danger mt-2"><span class="alert-icon">❌</span><span>Passwörter stimmen nicht überein.</span></div>';return;}
  await Auth.aenderePasswort(nutzerId,neu);
  toast('Passwort erfolgreich geändert!','success');
  document.querySelector('.modal-overlay')?.remove();
}

// ── Mein Profil ──────────────────────────────────────────────
function renderMeinProfil() {
  const u=Auth.currentUser;
  const rollenLabel={trainer:'Trainer/Melder',redaktion:'Redaktion',oea:'Öffentlichkeitsarbeit',datenschutz:'Datenschutz',admin:'Administrator'};
  const initials=u.anzeigename.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
  return`<div class="page">
    <div class="page-header"><h1>👤 Mein Profil</h1></div>
    <div class="grid grid-2 mb-4">
      <div class="card">
        <div class="card-header"><h2>Meine Daten</h2></div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
            <div style="width:60px;height:60px;border-radius:50%;background:var(--slzb-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;flex-shrink:0">${initials}</div>
            <div>
              <div style="font-size:1.1rem;font-weight:700">${esc(u.anzeigename)}</div>
              <div class="text-muted text-sm">${esc(u.username)}</div>
              <span class="badge badge-info mt-1">${esc(rollenLabel[u.rolle]||u.rolle)}</span>
            </div>
          </div>
          <table style="width:100%;font-size:.85rem">
            <tr><td class="text-muted" style="padding:6px 0;width:40%">Benutzername</td><td><strong>${esc(u.username)}</strong></td></tr>
            <tr><td class="text-muted" style="padding:6px 0">Anzeigename</td><td>${esc(u.anzeigename)}</td></tr>
            <tr><td class="text-muted" style="padding:6px 0">Rolle</td><td>${esc(rollenLabel[u.rolle]||u.rolle)}</td></tr>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>🔑 Passwort ändern</h2></div>
        <div class="card-body">
          <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
            <span>Wählen Sie ein sicheres Passwort mit mindestens 8 Zeichen.</span></div>
          <div class="form-group"><label>Aktuelles Passwort <span class="required">*</span></label>
            <input type="password" id="pw-aktuell" placeholder="Ihr aktuelles Passwort" autocomplete="current-password" oninput="clearPwFehler()"></div>
          <div class="form-group"><label>Neues Passwort <span class="required">*</span></label>
            <input type="password" id="pw-neu" placeholder="Mindestens 8 Zeichen" autocomplete="new-password" oninput="pruefePwStaerke(this.value);clearPwFehler()">
            <div id="pw-staerke-bar"><div id="pw-staerke-fill"></div></div>
            <div id="pw-staerke-text" class="form-hint"></div>
          </div>
          <div class="form-group"><label>Neues Passwort bestätigen <span class="required">*</span></label>
            <input type="password" id="pw-bestaetigung" placeholder="Passwort wiederholen" autocomplete="new-password" oninput="pruefePwUebereinstimmung();clearPwFehler()">
            <div id="pw-match-hint" class="form-hint"></div>
          </div>
          <div id="pw-fehler" style="display:none" class="alert alert-danger mb-3">
            <span class="alert-icon">❌</span><span id="pw-fehler-text"></span></div>
          <div id="pw-erfolg" style="display:none" class="alert alert-success mb-3">
            <span class="alert-icon">✅</span><span>Passwort erfolgreich geändert!</span></div>
          <button class="btn btn-primary w-full" onclick="speichereEigenesPasswort()" id="pw-speichern-btn">🔑 Passwort ändern</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>🔒 Sicherheitshinweise</h2></div>
      <div class="card-body">
        <div class="grid grid-3">
          <div style="display:flex;gap:12px;align-items:flex-start"><span style="font-size:1.5rem">🔐</span>
            <div><div class="font-bold text-sm">Sicheres Passwort</div>
              <div class="text-xs text-muted mt-1">Mindestens 8 Zeichen, Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen empfohlen.</div></div></div>
          <div style="display:flex;gap:12px;align-items:flex-start"><span style="font-size:1.5rem">🚫</span>
            <div><div class="font-bold text-sm">Nicht teilen</div>
              <div class="text-xs text-muted mt-1">Geben Sie Ihr Passwort niemals an andere Personen weiter.</div></div></div>
          <div style="display:flex;gap:12px;align-items:flex-start"><span style="font-size:1.5rem">⏻</span>
            <div><div class="font-bold text-sm">Abmelden</div>
              <div class="text-xs text-muted mt-1">Melden Sie sich nach der Nutzung ab, besonders auf gemeinsam genutzten Geräten.</div></div></div>
        </div>
      </div>
    </div>
  </div>`;
}

function pruefePwStaerke(pw) {
  const fill=document.getElementById('pw-staerke-fill');
  const text=document.getElementById('pw-staerke-text');
  if(!fill||!text) return;
  if(!pw){fill.style.width='0%';text.textContent='';return;}
  let p=0;
  if(pw.length>=8) p++;
  if(pw.length>=12) p++;
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

function pruefePwUebereinstimmung() {
  const neu=document.getElementById('pw-neu')?.value||'';
  const best=document.getElementById('pw-bestaetigung')?.value||'';
  const hint=document.getElementById('pw-match-hint');
  if(!hint||!best) return;
  if(neu===best){hint.textContent='✓ Passwörter stimmen überein';hint.style.color='var(--slzb-success)';}
  else{hint.textContent='✗ Passwörter stimmen nicht überein';hint.style.color='var(--slzb-danger)';}
}

function clearPwFehler() {
  const el=document.getElementById('pw-fehler');
  const ok=document.getElementById('pw-erfolg');
  if(el) el.style.display='none';
  if(ok) ok.style.display='none';
}

function zeigePwFehler(msg) {
  const el=document.getElementById('pw-fehler');
  const txt=document.getElementById('pw-fehler-text');
  if(el&&txt){txt.textContent=msg;el.style.display='flex';}
}

async function speichereEigenesPasswort() {
  const aktuell=document.getElementById('pw-aktuell')?.value||'';
  const neu=document.getElementById('pw-neu')?.value||'';
  const best=document.getElementById('pw-bestaetigung')?.value||'';
  const btn=document.getElementById('pw-speichern-btn');
  if(!aktuell){zeigePwFehler('Bitte aktuelles Passwort eingeben.');return;}
  if(!neu){zeigePwFehler('Bitte neues Passwort eingeben.');return;}
  if(neu.length<8){zeigePwFehler('Das neue Passwort muss mindestens 8 Zeichen haben.');return;}
  if(neu!==best){zeigePwFehler('Die Passwörter stimmen nicht überein.');return;}
  if(neu===aktuell){zeigePwFehler('Das neue Passwort muss sich vom aktuellen unterscheiden.');return;}
  btn.disabled=true; btn.textContent='Wird gespeichert...';
  const pruefung=await Auth.login(Auth.currentUser.username,aktuell);
  if(!pruefung.ok){
    btn.disabled=false; btn.textContent='🔑 Passwort ändern';
    zeigePwFehler('Das aktuelle Passwort ist falsch.');
    document.getElementById('pw-aktuell').value=''; return;
  }
  await Auth.aenderePasswort(Auth.currentUser.id,neu);
  btn.disabled=false; btn.textContent='🔑 Passwort ändern';
  document.getElementById('pw-aktuell').value='';
  document.getElementById('pw-neu').value='';
  document.getElementById('pw-bestaetigung').value='';
  document.getElementById('pw-staerke-fill').style.width='0%';
  document.getElementById('pw-staerke-text').textContent='';
  document.getElementById('pw-match-hint').textContent='';
  const ok2=document.getElementById('pw-erfolg'); if(ok2) ok2.style.display='flex';
  await Auth.login(Auth.currentUser.username,neu);
  toast('Passwort erfolgreich geändert!','success');
}

// ── Jahreschronik ─────────────────────────────────────────────
function renderJahreschronik() {
  const alle=SLZB_DB.erfolge;
  const schuljahre=[...new Set(alle.map(e=>SLZB_DB.getSchuljahr(e.datum)).filter(Boolean))].sort().reverse();
  const aktuellesSchuljahr=schuljahre[0]||'';
  return`<div class="page">
    <div class="page-header"><h1>📅 Jahreschronik</h1></div>
    <div class="card mb-3"><div class="card-body">
      <div class="form-row cols-4">
        <div class="form-group"><label>Schuljahr</label>
          <select id="chr-schuljahr" onchange="aktualisiereChronik()">
            <option value="">Alle Schuljahre</option>
            ${schuljahre.map(j=>`<option value="${j}"${j===aktuellesSchuljahr?' selected':''}>${j}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Sportart</label>
          <select id="chr-sportart" onchange="aktualisiereChronik()">
            <option value="">Alle Sportarten</option>
            ${SLZB_DB.sportarten.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Ebene</label>
          <select id="chr-ebene" onchange="aktualisiereChronik()">
            <option value="">Alle Ebenen</option>
            ${['Schulebene','Bezirk','Landesebene','Bundesebene','International','Weltmeisterschaft','Olympia'].map(e=>`<option>${e}</option>`).join('')}
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
        <p style="color:#6B7A99;font-size:.85rem">Erstellt am ${new Date().toLocaleDateString('de-DE')} · Nur freigegebene Erfolge</p>
        <hr style="margin:12px 0">
      </div>
      ${Object.entries(gruppen).map(([sportart,erfolge])=>`
        <div class="card mb-3 chronik-gruppe">
          <div class="card-header" style="background:var(--slzb-light)">
            <h2>🏅 ${esc(sportart)}</h2>
            <span class="badge badge-info">${erfolge.length} Erfolg${erfolge.length!==1?'e':''}</span>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Datum</th><th>Titel</th><th>Disziplin</th><th>Ebene</th><th>Platz</th><th>Medaille</th><th>Ergebnis</th></tr></thead>
            <tbody>${erfolge.map(e=>`<tr style="cursor:pointer" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
              <td class="text-sm">${fmt(e.datum)}</td>
              <td><strong>${esc(e.titel.replace('[SYNTHETISCH] ',''))}</strong><br><span class="text-xs text-muted">${esc(e.meldungsart)}</span></td>
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

function aktualisiereChronik() {
  const schuljahr=document.getElementById('chr-schuljahr')?.value||'';
  const sportartId=document.getElementById('chr-sportart')?.value||'';
  const ebene=document.getElementById('chr-ebene')?.value||'';
  const typ=document.getElementById('chr-typ')?.value||'';
  const inhalt=document.getElementById('chronik-inhalt');
  if(inhalt) inhalt.innerHTML=renderChronikInhalt(SLZB_DB.erfolge,schuljahr,sportartId,ebene,typ);
}

function druckeChronik() {
  document.querySelectorAll('.chronik-druckkopf').forEach(el=>el.style.display='block');
  window.print();
  setTimeout(()=>document.querySelectorAll('.chronik-druckkopf').forEach(el=>el.style.display='none'),1000);
}

function exportiereChronikCSV() {
  const schuljahr=document.getElementById('chr-schuljahr')?.value||'';
  const sportartId=document.getElementById('chr-sportart')?.value||'';
  const ebene=document.getElementById('chr-ebene')?.value||'';
  const typ=document.getElementById('chr-typ')?.value||'';
  let gefiltert=SLZB_DB.erfolge.filter(e=>['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if(schuljahr) gefiltert=gefiltert.filter(e=>SLZB_DB.getSchuljahr(e.datum)===schuljahr);
  if(sportartId) gefiltert=gefiltert.filter(e=>e.sportartId===sportartId);
  if(ebene) gefiltert=gefiltert.filter(e=>e.ebene===ebene);
  if(typ) gefiltert=gefiltert.filter(e=>e.meldungsart===typ);
  gefiltert.sort((a,b)=>new Date(b.datum)-new Date(a.datum));
  PDF.exportiereChronikCSV(gefiltert,schuljahr);
  toast('CSV-Export heruntergeladen','success');
}

// ── Stammdaten-Modals ─────────────────────────────────────────
function zeigeNeuerWettbewerbModal() {
  const overlay=document.createElement('div'); overlay.className='modal-overlay';
  overlay.innerHTML=`<div class="modal">
    <div class="modal-header"><h3>+ Neuer Wettbewerb</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Name <span class="required">*</span></label>
        <input type="text" id="wb-name" placeholder="z.B. Berliner Landesmeisterschaften 2027"></div>
      <div class="form-row cols-2">
        <div class="form-group"><label>Veranstalter</label><input type="text" id="wb-veranstalter"></div>
        <div class="form-group"><label>Ort</label><input type="text" id="wb-ort"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label>Beginn</label><input type="date" id="wb-beginn"></div>
        <div class="form-group"><label>Ende</label><input type="date" id="wb-ende"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label>Ebene</label>
          <select id="wb-ebene"><option value="">–</option>${ebeneOptions()}</select></div>
        <div class="form-group"><label>Sportart</label>
          <select id="wb-sportart"><option value="">–</option>
            ${SLZB_DB.sportarten.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="speichereWettbewerb()">Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function speichereWettbewerb() {
  const name=document.getElementById('wb-name')?.value?.trim()||'';
  if(!name){toast('Name ist Pflichtfeld','warning');return;}
  const id='WB'+Date.now();
  SLZB_DB.wettbewerbe.push({
    id,name,
    veranstalter:document.getElementById('wb-veranstalter')?.value||'',
    ort:document.getElementById('wb-ort')?.value||'',
    beginn:document.getElementById('wb-beginn')?.value||null,
    ende:document.getElementById('wb-ende')?.value||null,
    ebene:document.getElementById('wb-ebene')?.value||'',
    sportartId:document.getElementById('wb-sportart')?.value||null,
  });
  slzbSave(); toast(`Wettbewerb "${name}" angelegt!`,'success');
  document.querySelector('.modal-overlay')?.remove();
  navigateTo('stammdaten');
}

function zeigeNeuerSchuelerModal() {
  const overlay=document.createElement('div'); overlay.className='modal-overlay';
  overlay.innerHTML=`<div class="modal modal-lg">
    <div class="modal-header"><h3>+ Neuer Schüler / Neue Schülerin</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <div class="modal-body">
      <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
        <span>Nur Anzeigenamen eintragen, die gemäß Einwilligung verwendet werden dürfen.</span></div>
      <div class="form-row cols-3">
        <div class="form-group"><label>Vorname <span class="required">*</span></label><input type="text" id="sc-vorname"></div>
        <div class="form-group"><label>Nachname <span class="required">*</span></label><input type="text" id="sc-nachname"></div>
        <div class="form-group"><label>Anzeigename <span class="required">*</span></label>
          <input type="text" id="sc-anzeige" placeholder="z.B. M. Mustermann"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group"><label>Klasse</label><input type="text" id="sc-klasse" placeholder="z.B. 10a"></div>
        <div class="form-group"><label>Gruppe/Kader</label>
          <select id="sc-gruppe"><option value="">–</option>
            ${['Schüler','Jugend','Junioren','Kader A','Kader B','Kader C','Perspektivkader'].map(g=>`<option>${g}</option>`).join('')}</select></div>
        <div class="form-group"><label>Sportart</label>
          <select id="sc-sportart"><option value="">–</option>
            ${SLZB_DB.sportarten.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      </div>
      <hr class="divider">
      <div class="section-title">Einwilligungen</div>
      <div class="form-row cols-4">
        ${[['foto','Foto'],['print','Print'],['homepage','Homepage'],['digitalSignage','Digital Signage'],
           ['socialMedia','Social Media'],['einzeldarstellung','Einzeldarstellung'],['klasse','Klasse zeigen']].map(([id,label])=>`
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="sc-ew-${id}"> ${label}
            </label>
          </div>`).join('')}
      </div>
      <div class="form-group"><label>Einwilligung gültig bis</label>
        <input type="date" id="sc-ew-bis"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="speichereSchueler()">Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function speichereSchueler() {
  const vorname=document.getElementById('sc-vorname')?.value?.trim()||'';
  const nachname=document.getElementById('sc-nachname')?.value?.trim()||'';
  const anzeige=document.getElementById('sc-anzeige')?.value?.trim()||'';
  if(!vorname||!nachname||!anzeige){toast('Vorname, Nachname und Anzeigename sind Pflichtfelder','warning');return;}
  const letzteNr=SLZB_DB.schueler.length>0?
    parseInt(SLZB_DB.schueler[SLZB_DB.schueler.length-1].schuelerNr?.replace('SLZB-','')||'0')+1:1;
  const schuelerNr='SLZB-'+String(letzteNr).padStart(6,'0');
  SLZB_DB.schueler.push({
    id:schuelerNr, schuelerNr, vorname, nachname, anzeigename:anzeige,
    klasse:document.getElementById('sc-klasse')?.value||'',
    gruppe:document.getElementById('sc-gruppe')?.value||'',
    sportartId:document.getElementById('sc-sportart')?.value||null,
    aktiv:true,
    ew:{
      foto:document.getElementById('sc-ew-foto')?.checked||false,
      print:document.getElementById('sc-ew-print')?.checked||false,
      homepage:document.getElementById('sc-ew-homepage')?.checked||false,
      digitalSignage:document.getElementById('sc-ew-digitalSignage')?.checked||false,
      socialMedia:document.getElementById('sc-ew-socialMedia')?.checked||false,
      einzeldarstellung:document.getElementById('sc-ew-einzeldarstellung')?.checked||false,
      klasse:document.getElementById('sc-ew-klasse')?.checked||false,
    },
    ewGueltigBis:document.getElementById('sc-ew-bis')?.value||null,
    ewWiderruf:false,
  });
  slzbSave(); toast(`${anzeige} angelegt (${schuelerNr})!`,'success');
  document.querySelector('.modal-overlay')?.remove();
  navigateTo('stammdaten');
}
