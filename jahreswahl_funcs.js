// Sportler des Jahres
async function zeigeJahreswahl() {
  const { data: kampagnen } = await Backend.client
    .from('voting_campaigns').select('id,titel,monat,status')
    .in('status', ['beendet','aktiv']).order('monat');
  const ids = (kampagnen||[]).map(k=>k.id);
  const { data: alleKandidaten } = ids.length ? await Backend.client
    .from('voting_candidates').select('*').in('campaign_id', ids).order('reihenfolge')
    : { data: [] };
  const { data: alleStimmen } = ids.length ? await Backend.client
    .from('voting_votes').select('candidate_id,campaign_id').in('campaign_id', ids)
    : { data: [] };
  const stimmenMap = {};
  (alleStimmen||[]).forEach(s => { stimmenMap[s.candidate_id] = (stimmenMap[s.candidate_id]||0) + 1; });

  // Option B: Deduplizierung – pro Name nur bester Monat
  const siegerIds = new Set();
  const siegerNamen = new Map();
  (kampagnen||[]).forEach(k => {
    const kk = (alleKandidaten||[]).filter(c => c.campaign_id === k.id);
    if (!kk.length) return;
    const sieger = kk.reduce((b,c) => (stimmenMap[c.id]||0) > (stimmenMap[b.id]||0) ? c : b);
    const nameKey = sieger.name.toLowerCase().trim();
    const bisherig = siegerNamen.get(nameKey);
    if (!bisherig || (stimmenMap[sieger.id]||0) > (stimmenMap[bisherig.id]||0)) {
      if (bisherig) siegerIds.delete(bisherig.id);
      siegerIds.add(sieger.id);
      siegerNamen.set(nameKey, sieger);
    }
  });

  // Option C: Monats-Übersicht
  const monatsSummary = (kampagnen||[]).map(k => {
    const ml = k.monat ? new Date(k.monat+'-01').toLocaleDateString('de-DE',{month:'long',year:'numeric'}) : k.titel;
    const kk = (alleKandidaten||[]).filter(c => c.campaign_id === k.id);
    const sieger = kk.length ? kk.reduce((b,c) => (stimmenMap[c.id]||0) > (stimmenMap[b.id]||0) ? c : b) : null;
    return ml + ': ' + (sieger ? sieger.name : '–');
  }).join('\n');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal'; modal.style.maxWidth = '720px';
  const jahr = new Date().getFullYear();

  // Kandidaten-Liste HTML
  const listDiv = document.createElement('div');
  listDiv.style.cssText = 'max-height:280px;overflow-y:auto;border:1px solid var(--slzb-border);border-radius:8px';
  if (!(alleKandidaten||[]).length) {
    listDiv.innerHTML = '<div style="padding:16px;text-align:center;color:#888">Keine Kandidaten aus Monats-Abstimmungen</div>';
  } else {
    (alleKandidaten||[]).forEach(k => {
      const istSieger = siegerIds.has(k.id);
      const kp = (kampagnen||[]).find(kp => kp.id === k.campaign_id);
      const ml = kp && kp.monat ? new Date(kp.monat+'-01').toLocaleDateString('de-DE',{month:'long',year:'numeric'}) : '';
      const row = document.createElement('div');
      row.style.cssText = 'padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'jahres-check'; cb.value = k.id;
      cb.dataset.name = k.name; cb.dataset.sport = k.sportart||'';
      cb.dataset.erfolg = k.erfolg||''; cb.dataset.bild = k.bild_url||'';
      cb.checked = istSieger; cb.style.accentColor = '#E2001A';
      const info = document.createElement('div'); info.style.flex = '1';
      info.innerHTML = '<div style="font-weight:600;font-size:.85rem">'+esc(k.name)+'</div>'
        + '<div style="font-size:.75rem;color:#888">'+esc(k.sportart||'')+' · '+esc(ml)+(istSieger?' · 🏆 Monats-Sieger':'')+'</div>';
      const stimmen = document.createElement('span');
      stimmen.style.cssText = 'font-size:.72rem;color:#888';
      stimmen.textContent = (stimmenMap[k.id]||0)+' Stimmen';
      row.appendChild(cb); row.appendChild(info); row.appendChild(stimmen);
      listDiv.appendChild(row);
    });
  }

  // Modal aufbauen
  modal.innerHTML = '<div class="modal-header">'
    + '<h3>🏆 Sportler/in des Jahres '+jahr+'</h3>'
    + '<button class="btn btn-ghost btn-sm" id="jahres-close-btn">✕</button>'
    + '</div><div class="modal-body" id="jahres-body"></div>'
    + '<div class="modal-footer">'
    + '<button class="btn btn-ghost" id="jahres-abbrechen">Abbrechen</button>'
    + '<button class="btn btn-outline" id="jahres-entwurf">💾 Entwurf</button>'
    + '<button class="btn btn-primary" id="jahres-aktivieren">▶️ Aktivieren</button>'
    + '</div>';

  const body = modal.querySelector('#jahres-body');

  // Option C: Monats-Übersicht
  if (monatsSummary) {
    const details = document.createElement('details');
    details.style.cssText = 'margin-bottom:12px;border:1px solid var(--slzb-border);border-radius:8px;padding:0';
    details.innerHTML = '<summary style="padding:8px 12px;cursor:pointer;font-size:.8rem;font-weight:600;color:var(--slzb-primary)">📅 Monats-Übersicht</summary>'
      + '<div style="padding:8px 12px;font-size:.78rem;color:#888;white-space:pre-line">'+esc(monatsSummary)+'</div>';
    body.appendChild(details);
  }

  const hint = document.createElement('div');
  hint.className = 'alert alert-info mb-2';
  hint.style.fontSize = '.82rem';
  hint.innerHTML = '<span class="alert-icon">ℹ️</span><span>Monats-Sieger vorausgewählt (dedupliziert). Auswahl anpassbar.</span>';
  body.appendChild(hint);
  body.appendChild(listDiv);

  // Option A: Manuelle Ergänzung
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-ghost btn-sm'; addBtn.style.marginTop = '10px';
  addBtn.textContent = '➕ Kandidat manuell hinzufügen';
  const manuellDiv = document.createElement('div'); manuellDiv.id = 'jahres-manuell';
  addBtn.onclick = () => jahreswahlKandidatHinzu();
  body.appendChild(addBtn); body.appendChild(manuellDiv);

  // Formular
  const form = document.createElement('div');
  form.className = 'form-row cols-2 mt-3';
  form.innerHTML = '<div class="form-group"><label style="font-weight:600">Titel</label>'
    + '<input type="text" id="jahres-titel" value="Sportler/in des Jahres '+jahr+'" style="width:100%"></div>'
    + '<div class="form-group"><label style="font-weight:600">Ende</label>'
    + '<input type="datetime-local" id="jahres-end" style="width:100%"></div>';
  body.appendChild(form);

  overlay.appendChild(modal);
  modal.querySelector('#jahres-close-btn').onclick = () => overlay.remove();
  modal.querySelector('#jahres-abbrechen').onclick = () => overlay.remove();
  modal.querySelector('#jahres-entwurf').onclick = () => erstelleJahreswahl('entwurf');
  modal.querySelector('#jahres-aktivieren').onclick = () => erstelleJahreswahl('aktiv');
  overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

let _jahresZaehler = 0;
function jahreswahlKandidatHinzu() {
  const container = document.getElementById('jahres-manuell');
  if (!container) return;
  const id = 'manuell-'+(++_jahresZaehler);
  const div = document.createElement('div');
  div.id = id; div.style.cssText = 'border:1px solid var(--slzb-border);border-radius:8px;padding:10px;margin-top:8px';
  div.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    + '<div style="font-weight:600;font-size:.82rem;color:var(--slzb-primary)">Manueller Kandidat</div>'
    + '<button onclick="document.getElementById(\''+id+'\').remove()" style="background:none;border:none;color:#E2001A;cursor:pointer">✕</button>'
    + '</div><div class="form-row cols-2">'
    + '<div class="form-group"><label style="font-size:.78rem">Name *</label>'
    + '<input type="text" id="'+id+'-name" placeholder="Vorname Nachname" style="width:100%;font-size:.82rem"></div>'
    + '<div class="form-group"><label style="font-size:.78rem">Sportart</label>'
    + '<input type="text" id="'+id+'-sport" placeholder="z.B. Schwimmen" style="width:100%;font-size:.82rem"></div>'
    + '<div class="form-group" style="grid-column:1/-1"><label style="font-size:.78rem">Erfolg</label>'
    + '<input type="text" id="'+id+'-erfolg" placeholder="z.B. 3x Monats-Sieger" style="width:100%;font-size:.82rem"></div>'
    + '</div>';
  container.appendChild(div);
}

async function erstelleJahreswahl(status) {
  const titel = document.getElementById('jahres-titel')?.value.trim();
  const end = document.getElementById('jahres-end')?.value || null;
  const gewaehlte = [...document.querySelectorAll('.jahres-check:checked')];
  const manuell = [];
  document.querySelectorAll('[id^="manuell-"]').forEach(div => {
    const id = div.id;
    const name = document.getElementById(id+'-name')?.value.trim();
    if (name) manuell.push({
      name, sportart: document.getElementById(id+'-sport')?.value.trim()||'',
      erfolg: document.getElementById(id+'-erfolg')?.value.trim()||'',
    });
  });
  if (!titel) { toast('Bitte Titel eingeben', 'warning'); return; }
  if (!gewaehlte.length && !manuell.length) { toast('Bitte mindestens einen Kandidaten auswählen', 'warning'); return; }
  const jahr = new Date().getFullYear();
  const { data: kampagne, error: kErr } = await Backend.client
    .from('voting_campaigns')
    .insert([{ titel, monat: jahr+'-01', status, end_at: end, erstellt_von: Auth.id() }])
    .select('id').single();
  if (kErr) { toast('Fehler: ' + kErr.message, 'danger'); return; }
  const kandidaten = [
    ...gewaehlte.map((cb,i) => ({
      campaign_id: kampagne.id, name: cb.dataset.name,
      sportart: cb.dataset.sport, erfolg: cb.dataset.erfolg,
      bild_url: cb.dataset.bild||null, reihenfolge: i+1, erstellt_von: Auth.id(),
    })),
    ...manuell.map((m,i) => ({
      campaign_id: kampagne.id, name: m.name,
      sportart: m.sportart, erfolg: m.erfolg,
      bild_url: null, reihenfolge: gewaehlte.length+i+1, erstellt_von: Auth.id(),
    })),
  ];
  const { error: cErr } = await Backend.client.from('voting_candidates').insert(kandidaten);
  if (cErr) { toast('Fehler: ' + cErr.message, 'danger'); return; }
  document.querySelector('.modal-overlay')?.remove();
  toast('✅ Jahreswahl "'+titel+'" mit '+kandidaten.length+' Kandidaten erstellt!', 'success');
  navigateTo('sportler-des-monats');
}
