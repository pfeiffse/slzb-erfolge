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
    ${e.dublettenhinweis?`<div class="datenschutz-warning"><h4>🔁 Dublettenverdacht</h4><p>${esc(e.dublettenhinweisText)}</p></div>`:''}

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('kerndaten')">Kerndaten</button>
      

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

    <div id="tab-medien" class="tab-panel">
      <div class="card">
        <div class="card-header"><h2>📷 Medien</h2>
          ${Auth.canDo('erfassen')?`<button class="btn btn-outline btn-sm" onclick="zeigeBildUploadModal('${e.id}')">+ Bild hochladen</button>`:''}
        </div>
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
                  ${b.signedUrl?`<a href="${esc(b.signedUrl)}" target="_blank" class="btn btn-ghost btn-sm mt-2" style="font-size:.75rem">🔍 Vollbild</a>`:''}
                </div>
              </div>`).join('')}</div>`}
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
    const html = erzeugeJTFOHtml(e, 'a3');
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.target = '_blank'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
    toast('A3-Ausgabe geöffnet – im neuen Tab drucken (Strg+P)','success');
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
    const html    = erzeugeJTFOHtml(e, 'screen');
    const blobUrl = htmlZuBlobUrl(html);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    // Overlay direkt aufbauen ohne innerHTML (vermeidet Escape-Probleme)
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>🖥️ Bildschirm-Ausgabe (JTFO-Stil)</h3>
        <button class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div class="modal-body" style="padding:0;background:#000">
        <iframe src="${blobUrl}" style="width:100%;height:500px;border:none"></iframe>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
        <button class="btn btn-outline dl-btn">🖥️ HTML herunterladen</button>
      </div>`;
    modal.querySelector('.btn-ghost.close-btn, .btn-ghost:first-child').onclick = () => overlay.remove();
    modal.querySelectorAll('.btn-ghost').forEach(b => { if(b.textContent.includes('✕')||b.textContent.includes('Schließen')) b.onclick = ()=>overlay.remove(); });
    modal.querySelector('.dl-btn').onclick = () => downloadJTFO(erfolgId,'screen');
    overlay.appendChild(modal);
    overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
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
    const html    = erzeugeJTFOHtml(e, 'social');
    const blobUrl = htmlZuBlobUrl(html);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-lg';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📱 Social-Media-Ausgabe (JTFO-Stil)</h3>
        <button class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-danger mb-3">
          <span class="alert-icon">🔒</span>
          <span><strong>Social Media ist standardmäßig gesperrt.</strong> Kein Auto-Posting. Nur Export-Paket.</span>
        </div>
        <div style="background:#000;border-radius:12px;overflow:hidden;max-width:400px;margin:0 auto">
          <iframe src="${blobUrl}" style="width:100%;height:400px;border:none"></iframe>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
        <button class="btn btn-warning dl-btn">📦 HTML herunterladen</button>
      </div>`;
    modal.querySelectorAll('.btn-ghost').forEach(b=>b.onclick=()=>overlay.remove());
    modal.querySelector('.dl-btn').onclick = ()=>{ downloadJTFO(erfolgId,'social'); overlay.remove(); };
    overlay.appendChild(modal);
    overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  } catch(err) {
    toast('Fehler: '+err.message,'danger');
    console.error('Social Fehler:', err);
  }
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
      <div class="form-row cols-2">
        <div class="form-group"><label>Urheber <span class="required">*</span></label>
          <input type="text" id="upload-urheber" placeholder="Name des Fotografen"></div>
        <div class="form-group"><label>Quelle <span class="required">*</span></label>
          <input type="text" id="upload-quelle" placeholder="z.B. SLZB-Archiv"></div>
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
  const quelle     = document.getElementById('upload-quelle')?.value?.trim()||'';
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
  if (!urheber) { zeigeErr('Urheber ist Pflichtfeld.'); return; }
  if (!quelle)  { zeigeErr('Quelle ist Pflichtfeld.'); return; }

  const datei = dateiInput.files[0];
  if (datei.size > 10 * 1024 * 1024) { zeigeErr('Datei zu groß (max. 10 MB).'); return; }

  btn.disabled = true;
  progEl.style.display = 'flex';

  try {
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

    if (uploadError) throw new Error('Upload fehlgeschlagen: ' + uploadError.message);

    

    const { error: metaError } = await Backend.client
      .from('achievement_media')
      .insert([metadaten]);

    if (metaError) {
      console.error('Metadaten-Fehler Details:', metaError);
      // Bild aus Storage löschen wenn Metadaten-Insert fehlschlägt
      await Backend.client.storage.from('achievement-media').remove([pfad]);
      throw new Error('Metadaten: ' + metaError.message + ' | Code: ' + metaError.code + ' | Details: ' + JSON.stringify(metaError.details));
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