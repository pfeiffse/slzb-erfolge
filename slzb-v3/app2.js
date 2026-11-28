
// ── Modal-Schutz vor versehentlichem Außen-Klick ─────────────────────────────
// Für Formular-Modals: kein Schließen bei Außen-Klick, stattdessen Wackeln
function schutzeModalVorAussenklick(overlay, modal) {
  overlay.addEventListener('click', ev => {
    if (ev.target !== overlay) return;
    // Wackeln-Animation statt Schließen
    if (!document.getElementById('modal-shake-style')) {
      const s = document.createElement('style');
      s.id = 'modal-shake-style';
      s.textContent = `
        @keyframes modal-shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
        .modal-shake { animation: modal-shake 0.35s ease; }
      `;
      document.head.appendChild(s);
    }
    if (modal && !modal.classList.contains('modal-shake')) {
      modal.classList.add('modal-shake');
      setTimeout(() => modal.classList.remove('modal-shake'), 380);
    }
  });
}

// Einfaches Schließen bei Außen-Klick (für Info-Modals ohne Formulare)
function schliesseModalBeiAussenklick(overlay) {
  overlay.addEventListener('click', ev => {
    if (ev.target === overlay) overlay.remove();
  });
}

// ============================================================
// SLZB-Erfolge v3 – App-Logik Teil 2
// ============================================================

// ── Bearbeitungsrechte und Beteiligten-Helfer ─────────────────
const EDITIERBARE_TRAINER_STATUS = new Set(['Entwurf','Unvollständig','Eingereicht','Rückfrage an Melder']);

function kannErfolgBearbeiten(erfolg) {
  if (!erfolg) return false;
  if (Auth.canDo('bearbeiten')) return true;
  return erfolg.melderId === Auth.id() && EDITIERBARE_TRAINER_STATUS.has(erfolg.status);
}

function teilnehmerRollenOptionen(aktuell='Athlet') {
  return ['Athlet','Kapitän','Ersatz','Trainer','Betreuer','Sonstiges']
    .map(r=>`<option value="${esc(r)}" ${r===aktuell?'selected':''}>${esc(r)}</option>`).join('');
}

// ── Erfolg-Detail ────────────────────────────────────────────

// ── Status-Fortschrittsbalken ─────────────────────────────────

// ══════════════════════════════════════════════════════════════
// KANBAN DRAG & DROP
// ══════════════════════════════════════════════════════════════

// State
let _dndKarte = null;        // Aktuell gezogene Karte
let _dndUndo = null;         // Letzter Undo-State
let _dndUndoTimer = null;    // Undo-Toast-Timer

// CSS für Drag & Drop (einmalig injizieren)
function injectKanbanStyles() {
  if (document.getElementById('kanban-dnd-styles')) return;
  const style = document.createElement('style');
  style.id = 'kanban-dnd-styles';
  style.textContent = `
    .kanban-karte {
      transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease !important;
    }
    .kanban-karte:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,.2);
    }
    .kanban-karte.dragging {
      opacity: 0.45;
      transform: scale(0.97);
      cursor: grabbing !important;
      box-shadow: none !important;
    }
    .kanban-karte.drag-ghost {
      opacity: 0.9;
      transform: rotate(2deg) scale(1.03);
      box-shadow: 0 8px 24px rgba(0,0,0,.35) !important;
      cursor: grabbing !important;
    }
    .kanban-spalte.drag-over {
      background: rgba(11,99,206,0.06) !important;
      box-shadow: inset 0 0 0 2px #0B63CE;
    }
    .kanban-spalte.drag-over-invalid {
      background: rgba(226,0,26,0.06) !important;
      box-shadow: inset 0 0 0 2px #E2001A;
    }
    .kanban-drop-indicator {
      height: 3px;
      background: #0B63CE;
      border-radius: 2px;
      margin: 4px 0;
      animation: kanban-pulse .6s ease infinite alternate;
    }
    @keyframes kanban-pulse {
      from { opacity: 0.5; }
      to   { opacity: 1; }
    }
    .kanban-karte-moved {
      animation: kanban-land .3s ease;
    }
    @keyframes kanban-land {
      0%   { transform: scale(1.05); background: rgba(11,99,206,0.15); }
      100% { transform: scale(1);    background: var(--slzb-bg); }
    }
    .undo-toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #1B1C1F;
      color: #fff;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 10px;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 9999;
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
      animation: undo-slide .25s ease;
      white-space: nowrap;
    }
    @keyframes undo-slide {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
    }
    .undo-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: #0B63CE;
      border-radius: 0 0 10px 10px;
      animation: undo-countdown 8s linear forwards;
    }
    @keyframes undo-countdown {
      from { width: 100%; }
      to   { width: 0%; }
    }
  `;
  document.head.appendChild(style);
}

// ── Drag-Start ────────────────────────────────────────────────
function kanbanDragStart(event, el) {
  injectKanbanStyles();
  _dndKarte = {
    id:          el.dataset.id,
    altStatus:   el.dataset.status,
    titel:       el.dataset.titel,
    element:     el,
    spalte:      el.closest('.kanban-spalte'),
  };

  // Ghost-Image: leicht rotiert
  el.classList.add('drag-ghost');
  setTimeout(() => el.classList.remove('drag-ghost'), 0);
  el.classList.add('dragging');

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', el.dataset.id);
}

// ── Drag-End ──────────────────────────────────────────────────
function kanbanDragEnd(el) {
  el.classList.remove('dragging', 'drag-ghost');
  // Alle Spalten-Highlights entfernen
  document.querySelectorAll('.kanban-spalte').forEach(s => {
    s.classList.remove('drag-over', 'drag-over-invalid');
  });
  document.querySelectorAll('.kanban-drop-indicator').forEach(i => i.remove());
  _dndKarte = null;
}

// ── Drag-Over ─────────────────────────────────────────────────
function kanbanDragOver(event, spalte) {
  event.preventDefault();
  if (!_dndKarte) return;

  const zielStatus = spalte.dataset.zielStatus;
  const istGleiche = spalte === _dndKarte.spalte;

  // Visuelles Feedback
  document.querySelectorAll('.kanban-spalte').forEach(s => {
    s.classList.remove('drag-over', 'drag-over-invalid');
  });

  if (istGleiche) {
    // Gleiche Spalte: kein Highlight
    event.dataTransfer.dropEffect = 'none';
  } else {
    spalte.classList.add('drag-over');
    event.dataTransfer.dropEffect = 'move';

    // Drop-Indikator positionieren
    document.querySelectorAll('.kanban-drop-indicator').forEach(i => i.remove());
    const karten = spalte.querySelectorAll('.kanban-karte');
    const indicator = document.createElement('div');
    indicator.className = 'kanban-drop-indicator';

    // Finde Position basierend auf Maus-Y
    let eingefuegt = false;
    for (const karte of karten) {
      const rect = karte.getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        karte.parentNode.insertBefore(indicator, karte);
        eingefuegt = true;
        break;
      }
    }
    if (!eingefuegt) {
      const kartenContainer = spalte.querySelector('.kanban-karten');
      if (kartenContainer) kartenContainer.appendChild(indicator);
    }
  }
}

// ── Drag-Leave ────────────────────────────────────────────────
function kanbanDragLeave(spalte) {
  // Nur entfernen wenn wirklich die Spalte verlassen wird
  setTimeout(() => {
    if (!spalte.matches(':hover')) {
      spalte.classList.remove('drag-over', 'drag-over-invalid');
      spalte.querySelectorAll('.kanban-drop-indicator').forEach(i => i.remove());
    }
  }, 50);
}

// ── Drop ──────────────────────────────────────────────────────
async function kanbanDrop(event, spalte, neuerStatus) {
  event.preventDefault();
  document.querySelectorAll('.kanban-drop-indicator').forEach(i => i.remove());
  spalte.classList.remove('drag-over', 'drag-over-invalid');

  if (!_dndKarte) return;
  const { id, altStatus, titel } = _dndKarte;

  // Gleiche Spalte: nichts tun
  if (altStatus === neuerStatus || _dndKarte.spalte === spalte) return;

  // Undo-State speichern
  _dndUndo = { id, altStatus, neuerStatus, titel };

  // Optimistisches UI-Update: Karte sofort verschieben
  const karte = document.querySelector(`.kanban-karte[data-id="${id}"]`);
  if (karte) {
    const kartenContainer = spalte.querySelector('.kanban-karten');
    // Leere-Platzhalter entfernen
    kartenContainer?.querySelector('.kanban-leer')?.remove();
    // Karte verschieben
    karte.dataset.status = neuerStatus;
    kartenContainer?.appendChild(karte);
    karte.classList.add('kanban-karte-moved');
    setTimeout(() => karte.classList.remove('kanban-karte-moved'), 300);
    // Badge-Zähler aktualisieren
    kanbanAktualisiereBadges();
  }

  // Undo-Toast anzeigen
  zeigeUndoToast(titel, altStatus, neuerStatus);

  // Status in Supabase speichern
  try {
    await DB.statusWechsel(id, neuerStatus, `Kanban: ${altStatus} → ${neuerStatus}`);
  } catch(e) {
    toast('Fehler beim Speichern: ' + e.message, 'danger');
    // Rollback
    kanbanRollback(id, altStatus);
  }
}

// ── Undo-Toast ────────────────────────────────────────────────
function zeigeUndoToast(titel, altStatus, neuerStatus) {
  // Alten Toast entfernen
  document.querySelector('.undo-toast')?.remove();
  clearTimeout(_dndUndoTimer);

  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.innerHTML = `
    <span style="font-size:.85rem">
      <strong>${esc(titel?.slice(0,30) || 'Meldung')}</strong>
      → <span style="color:#0B63CE">${esc(neuerStatus)}</span>
    </span>
    <button onclick="kanbanUndo()" style="
      background:#0B63CE;color:#fff;border:none;border-radius:6px;
      padding:5px 12px;font-size:.8rem;font-weight:700;cursor:pointer;
      white-space:nowrap">
      ↩ Rückgängig
    </button>
    <button onclick="this.closest('.undo-toast').remove()" style="
      background:none;border:none;color:#888;cursor:pointer;font-size:1rem;
      padding:0 4px">✕</button>
    <div class="undo-progress"></div>`;

  document.body.appendChild(toast);

  // Auto-dismiss nach 8 Sekunden
  _dndUndoTimer = setTimeout(() => {
    toast.style.animation = 'undo-slide .25s ease reverse';
    setTimeout(() => toast.remove(), 250);
    _dndUndo = null;
  }, 8000);
}

// ── Undo ──────────────────────────────────────────────────────
async function kanbanUndo() {
  if (!_dndUndo) return;
  const { id, altStatus, neuerStatus } = _dndUndo;
  _dndUndo = null;
  clearTimeout(_dndUndoTimer);
  document.querySelector('.undo-toast')?.remove();

  // Karte zurückverschieben (optimistisch)
  const karte = document.querySelector(`.kanban-karte[data-id="${id}"]`);
  if (karte) {
    const alteSpalte = document.querySelector(`.kanban-spalte[data-ziel-status="${altStatus}"]`);
    if (alteSpalte) {
      const kartenContainer = alteSpalte.querySelector('.kanban-karten');
      kartenContainer?.querySelector('.kanban-leer')?.remove();
      karte.dataset.status = altStatus;
      kartenContainer?.appendChild(karte);
      karte.classList.add('kanban-karte-moved');
      setTimeout(() => karte.classList.remove('kanban-karte-moved'), 300);
      kanbanAktualisiereBadges();
    }
  }

  // Status zurücksetzen in Supabase
  try {
    await DB.statusWechsel(id, altStatus, `Kanban Undo: ${neuerStatus} → ${altStatus}`);
    toast('↩ Rückgängig gemacht', 'info');
  } catch(e) {
    toast('Fehler beim Rückgängig: ' + e.message, 'danger');
  }
}

// ── Rollback bei Fehler ───────────────────────────────────────
function kanbanRollback(id, altStatus) {
  const karte = document.querySelector(`.kanban-karte[data-id="${id}"]`);
  if (!karte) return;
  const alteSpalte = document.querySelector(`.kanban-spalte[data-ziel-status="${altStatus}"]`);
  if (alteSpalte) {
    const kartenContainer = alteSpalte.querySelector('.kanban-karten');
    kartenContainer?.querySelector('.kanban-leer')?.remove();
    karte.dataset.status = altStatus;
    kartenContainer?.appendChild(karte);
    kanbanAktualisiereBadges();
  }
}

// ── Badge-Zähler aktualisieren ────────────────────────────────
function kanbanAktualisiereBadges() {
  document.querySelectorAll('.kanban-spalte').forEach(spalte => {
    const anzahl = spalte.querySelectorAll('.kanban-karte').length;
    const badge = spalte.querySelector('.card-header span[style*="border-radius:12px"]');
    if (badge) badge.textContent = anzahl;

    // Leere-Platzhalter ein-/ausblenden
    const kartenContainer = spalte.querySelector('.kanban-karten');
    if (!kartenContainer) return;
    const hatKarten = kartenContainer.querySelectorAll('.kanban-karte').length > 0;
    let leer = kartenContainer.querySelector('.kanban-leer');
    if (!hatKarten && !leer) {
      leer = document.createElement('div');
      leer.className = 'kanban-leer';
      leer.style.cssText = 'padding:12px;color:#888;font-size:.78rem;text-align:center;font-style:italic;border:2px dashed var(--slzb-border);border-radius:8px;margin:4px';
      leer.textContent = 'Hierher ziehen';
      kartenContainer.appendChild(leer);
    } else if (hatKarten && leer) {
      leer.remove();
    }
  });
}

// Kanban-Styles beim Laden der Redaktionsseite initialisieren
document.addEventListener('DOMContentLoaded', injectKanbanStyles);


// ══════════════════════════════════════════════════════════════
// ZENTRALES BENACHRICHTIGUNGS-SYSTEM
// ══════════════════════════════════════════════════════════════

let _benachrichtigungenCache = null;
let _benachrichtigungenTimer = null;

async function ladeBenachrichtigungen() {
  try {
    const alle = await ladeErfolge();
    const heute = new Date(); heute.setHours(0,0,0,0);
    const in7 = new Date(heute); in7.setDate(heute.getDate() + 7);
    const vor3 = new Date(heute); vor3.setDate(heute.getDate() - 3);

    const benachrichtigungen = [];
    const r = Auth.rolle();

    // Trainer: Rückfragen
    if (['trainer','mitarbeiter','schueler'].includes(r)) {
      const rueckfragen = alle.filter(e =>
        e.status === 'Rückfrage an Melder' && e.melderId === Auth.id()
      );
      if (rueckfragen.length) {
        benachrichtigungen.push({
          typ: 'rueckfrage',
          prioritaet: 1,
          titel: `${rueckfragen.length} Rückfrage(n) warten auf Antwort`,
          text: rueckfragen.map(e => e.titel).slice(0,2).join(', '),
          icon: '&#128172;',
          farbe: '#E07000',
          aktion: () => navigateTo('rueckfragen'),
          aktionText: 'Jetzt antworten',
        });
      }
    }

    // Redaktion: Neue Meldungen
    if (['redaktion','oea','admin'].includes(r)) {
      const neu = alle.filter(e => e.status === 'Eingereicht');
      if (neu.length) {
        benachrichtigungen.push({
          typ: 'neue-meldungen',
          prioritaet: 1,
          titel: `${neu.length} neue Meldung(en) warten auf Prüfung`,
          text: neu.slice(0,2).map(e => e.titel).join(', '),
          icon: '&#128228;',
          farbe: '#0B63CE',
          aktion: () => navigateTo('redaktion'),
          aktionText: 'Zur Redaktion',
        });
      }

      // Freigabe ÖA
      const freigabe = alle.filter(e => e.status === 'Freigabe Öffentlichkeitsarbeit');
      if (freigabe.length) {
        benachrichtigungen.push({
          typ: 'freigabe',
          prioritaet: 2,
          titel: `${freigabe.length} Meldung(en) warten auf Freigabe`,
          text: freigabe.slice(0,2).map(e => e.titel).join(', '),
          icon: '&#9989;',
          farbe: '#C9A227',
          aktion: () => navigateTo('ausgaben'),
          aktionText: 'Freigeben',
        });
      }
    }

    // Alle: Bevorstehende Wettkämpfe (nächste 7 Tage, Prio 1+2)
    try {
      const eigene = await ladeKalenderEintraege();
      const alleT = [...((typeof SLZB_TERMINE!=='undefined')?SLZB_TERMINE:[]), ...eigene];
      const bald = alleT.filter(t => {
        if (!t.datum) return false;
        const p = t.datum.split('-');
        const d = new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
        return d >= heute && d <= in7 && (t.prioritaet===1||t.prioritaet===2);
      });
      if (bald.length) {
        benachrichtigungen.push({
          typ: 'wettkampf',
          prioritaet: 2,
          titel: `${bald.length} Wettkampf/Meisterschaft in den nächsten 7 Tagen`,
          text: bald.slice(0,2).map(t => t.veranstaltung).join(', '),
          icon: '&#127942;',
          farbe: '#4caf50',
          aktion: () => kalenderZeigeAktuell(),
          aktionText: 'Anzeigen',
        });
      }
    } catch(e) {}

    // Vergangene Wettkämpfe ohne Meldung (letzte 3 Tage)
    try {
      const eigene2 = await ladeKalenderEintraege();
      const alleT2 = [...((typeof SLZB_TERMINE!=='undefined')?SLZB_TERMINE:[]), ...eigene2];
      const vergangen = alleT2.filter(t => {
        if (!t.datum) return false;
        const p = t.datum.split('-');
        const d = new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
        return d >= vor3 && d < heute && (t.prioritaet===1||t.prioritaet===2);
      });
      if (vergangen.length && ['redaktion','oea','admin'].includes(r)) {
        benachrichtigungen.push({
          typ: 'vergangen',
          prioritaet: 3,
          titel: `${vergangen.length} Wettkampf/Meisterschaft ohne Meldung`,
          text: vergangen.slice(0,2).map(t => t.veranstaltung).join(', '),
          icon: '&#128221;',
          farbe: '#888',
          aktion: () => kalenderZeigeAktuell(),
          aktionText: 'Meldung erstellen',
        });
      }
    } catch(e) {}

    _benachrichtigungenCache = benachrichtigungen.sort((a,b) => a.prioritaet - b.prioritaet);
    aktualisiereGlocke();
    return _benachrichtigungenCache;
  } catch(e) {
    return [];
  }
}

function aktualisiereGlocke() {
  const n = _benachrichtigungenCache || [];
  const kritisch = n.filter(x => x.prioritaet === 1).length;
  const gesamt = n.length;

  // Glocken-Badge in der Topbar aktualisieren
  const badge = document.getElementById('benachrichtigungs-badge');
  if (badge) {
    badge.textContent = gesamt || '';
    badge.style.display = gesamt ? 'flex' : 'none';
    badge.style.background = kritisch ? '#E2001A' : '#C9A227';
  }
}

function zeigeBenachrichtigungen() {
  const n = _benachrichtigungenCache || [];
  if (!n.length) { toast('Keine neuen Benachrichtigungen', 'info'); return; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '480px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>&#128276; Benachrichtigungen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">&#10005;</button>
    </div>
    <div class="modal-body" style="padding:0">
      ${n.map(b => `
        <div style="padding:14px 16px;border-bottom:1px solid var(--slzb-border);
                    border-left:4px solid ${b.farbe}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="flex:1">
              <div style="font-weight:700;font-size:.9rem;margin-bottom:3px">
                ${b.icon} ${esc(b.titel)}
              </div>
              <div style="font-size:.78rem;color:var(--slzb-text-muted)">${esc(b.text)}</div>
            </div>
            <button class="btn btn-outline btn-sm" style="font-size:.75rem;flex-shrink:0"
              onclick="this.closest('.modal-overlay').remove();(${b.aktion.toString()})()">
              ${esc(b.aktionText)} →
            </button>
          </div>
        </div>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
      <button class="btn btn-ghost btn-sm" onclick="ladeBenachrichtigungen();this.closest('.modal-overlay').remove()">
        &#8635; Aktualisieren
      </button>
    </div>`;

  overlay.appendChild(modal);
  overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// Benachrichtigungen beim Start und alle 5 Minuten laden
function starteBenachrichtigungsTimer() {
  ladeBenachrichtigungen();
  clearInterval(_benachrichtigungenTimer);
  _benachrichtigungenTimer = setInterval(ladeBenachrichtigungen, 5 * 60 * 1000);
}

function renderStatusFortschritt(status) {
  const schritte = [
    { key: 'Entwurf',       label: 'Entwurf',    icon: '📝' },
    { key: 'Eingereicht',   label: 'Eingereicht', icon: '📤' },
    { key: 'Redaktion',     label: 'Prüfung',     icon: '✏️' },
    { key: 'Freigegeben',   label: 'Freigegeben', icon: '✅' },
    { key: 'Veröffentlicht',label: 'Veröffentlicht', icon: '🌐' },
  ];

  // Sonderstatus
  const sonderStatus = {
    'Rückfrage an Melder':    { step: 1, farbe: '#E07000', label: '💬 Rückfrage' },
    'Unvollständig':          { step: 1, farbe: '#E07000', label: '⚠️ Unvollständig' },
    'Dublettenverdacht':      { step: 2, farbe: '#E07000', label: '🔄 Dublette?' },
    'Einwilligungsprüfung':   { step: 2, farbe: '#0B63CE', label: '🔒 Einwilligung' },
    'Wegen Einwilligung gesperrt': { step: 2, farbe: '#E2001A', label: '🔒 Gesperrt' },
    'Archiviert':             { step: 4, farbe: '#888', label: '🗄️ Archiviert' },
  };

  const sonder = sonderStatus[status];
  const aktuellerSchritt = sonder ? sonder.step :
    schritte.findIndex(s => s.key === status);
  const farbe = sonder ? sonder.farbe : '#4caf50';

  return `<div style="margin:12px 0 16px">
    <div style="display:flex;align-items:center;gap:0;position:relative">
      <!-- Verbindungslinie -->
      <div style="position:absolute;top:14px;left:14px;right:14px;height:2px;background:var(--slzb-border);z-index:0"></div>
      <div style="position:absolute;top:14px;left:14px;height:2px;z-index:1;background:${farbe};
        width:${Math.max(0, Math.min(100, (aktuellerSchritt / (schritte.length-1)) * 100))}%;
        transition:width .5s ease"></div>
      ${schritte.map((s, i) => {
        const aktiv = i <= aktuellerSchritt && !sonder;
        const istAktuell = i === aktuellerSchritt && !sonder;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;z-index:2">
          <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
            font-size:.75rem;border:2px solid ${aktiv?farbe:'var(--slzb-border)'};
            background:${istAktuell?farbe:aktiv?'rgba(76,175,80,0.15)':'var(--slzb-bg-secondary)'};
            ${istAktuell?'box-shadow:0 0 0 3px rgba(76,175,80,0.25)':''}">
            ${aktiv ? s.icon : '<span style="color:#888">○</span>'}
          </div>
          <span style="font-size:.65rem;color:${aktiv?'var(--slzb-text)':'#888'};text-align:center;white-space:nowrap">
            ${s.label}
          </span>
        </div>`;
      }).join('')}
    </div>
    ${sonder ? `<div style="text-align:center;margin-top:8px">
      <span style="background:${sonder.farbe};color:#fff;padding:3px 12px;border-radius:12px;font-size:.78rem;font-weight:700">
        ${sonder.label}
      </span>
    </div>` : ''}
  </div>`;
}

// ── Inline-Hilfe ──────────────────────────────────────────────
function hilfeTooltip(text) {
  return `<span class="hilfe-tooltip" title="${esc(text)}" style="
    display:inline-flex;align-items:center;justify-content:center;
    width:16px;height:16px;border-radius:50%;background:rgba(11,99,206,0.15);
    color:#0B63CE;font-size:.7rem;font-weight:700;cursor:help;margin-left:4px;
    border:1px solid rgba(11,99,206,0.3)">?</span>`;
}

// ── Onboarding-Tour ───────────────────────────────────────────
function zeigeOnboardingTour(rolle) {
  // Prüfe ob Tour schon gesehen
  if (localStorage.getItem(`slzb_tour_${rolle}`)) return;

  const touren = {
    trainer: [
      { titel: '👋 Willkommen bei SLZB-Erfolge!', text: 'Diese App hilft dir, sportliche Erfolge deiner Schülerinnen und Schüler zu melden und zu veröffentlichen.', seite: null },
      { titel: '➕ Neue Meldung erstellen', text: 'Klicke auf "Neue Meldung" um einen Erfolg einzureichen. Wähle die passende Meldungsart: Einzelerfolg, Teamerfolg oder Sammelmeldung.', seite: 'neue-meldung' },
      { titel: '📋 Meine Meldungen', text: 'Hier siehst du alle deine eingereichten Meldungen und ihren aktuellen Status. Du wirst benachrichtigt wenn Rückfragen kommen.', seite: 'meine-meldungen' },
      { titel: '📅 Veranstaltungskalender', text: 'Im Kalender findest du alle anstehenden Wettkämpfe und Veranstaltungen. Du kannst direkt Countdown-Poster erstellen.', seite: 'kalender' },
      { titel: '✅ Fertig!', text: 'Du bist bereit! Starte mit deiner ersten Meldung. Bei Fragen wende dich an die Redaktion.', seite: null },
    ],
    redaktion: [
      { titel: '👋 Willkommen in der Redaktion!', text: 'Als Redakteur prüfst und gibst du Meldungen frei, erstellst Poster und verwaltest die Veröffentlichungen.', seite: null },
      { titel: '✏️ Redaktionsübersicht', text: 'Hier siehst du alle eingereichten Meldungen. Klicke auf eine Meldung um sie zu prüfen, zu bearbeiten und freizugeben.', seite: 'redaktion' },
      { titel: '✅ Freigaben & Ausgaben', text: 'Freigegebene Meldungen können hier als Poster, Bildschirm- oder Social-Media-Ausgabe exportiert werden.', seite: 'ausgaben' },
      { titel: '🎯 Event-Poster', text: 'Erstelle Athleten-Vorstellungen, Countdown-Poster und Foto-Karussells für Instagram und Digital Signage.', seite: 'ausgaben-events' },
      { titel: '✅ Fertig!', text: 'Du bist bereit! Starte mit der Redaktionsübersicht.', seite: null },
    ],
  };

  const tour = touren[rolle] || touren.trainer;
  let schritt = 0;

  function zeigeSchritt(i) {
    document.querySelector('.onboarding-overlay')?.remove();
    if (i >= tour.length) {
      localStorage.setItem(`slzb_tour_${rolle}`, '1');
      return;
    }

    const s = tour[i];
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';

    overlay.innerHTML = `
      <div style="background:var(--slzb-bg);border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">${s.titel.split(' ')[0]}</div>
        <h3 style="margin-bottom:12px;font-size:1.1rem">${esc(s.titel.slice(s.titel.indexOf(' ')+1))}</h3>
        <p style="color:var(--slzb-text-muted);font-size:.9rem;line-height:1.6;margin-bottom:20px">${esc(s.text)}</p>
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:20px">
          ${tour.map((_,j) => `<div style="width:8px;height:8px;border-radius:50%;background:${j===i?'#003366':'var(--slzb-border)'}"></div>`).join('')}
        </div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn btn-ghost btn-sm" onclick="document.querySelector('.onboarding-overlay').remove();localStorage.setItem('slzb_tour_${rolle}','1')">
            Überspringen
          </button>
          ${i > 0 ? `<button class="btn btn-ghost btn-sm" onclick="zeigeOnboardingSchritt(${i-1})">← Zurück</button>` : ''}
          <button class="btn btn-primary" onclick="zeigeOnboardingSchritt(${i+1})">
            ${i < tour.length-1 ? 'Weiter →' : '✅ Loslegen!'}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    if (s.seite) setTimeout(() => navigateTo(s.seite), 300);
  }

  window.zeigeOnboardingSchritt = zeigeSchritt;
  setTimeout(() => zeigeSchritt(0), 800);
}

// Tour zurücksetzen (für Hilfe-Menü)
function tourZuruecksetzen() {
  ['trainer','redaktion','oea','admin','mitarbeiter','schueler'].forEach(r => {
    localStorage.removeItem(`slzb_tour_${r}`);
  });
  toast('Tour zurückgesetzt – beim nächsten Login startet sie neu', 'info');
}


async function naechsteMeldungOeffnen(aktuelleId) {
  const alle = await ladeErfolge();
  const offen = alle.filter(e => ['Eingereicht','Redaktion','Datenprüfung'].includes(e.status));
  const idx = offen.findIndex(e => e.id === aktuelleId);
  const naechste = offen[idx + 1] || offen[0];
  if (naechste && naechste.id !== aktuelleId) {
    navigateTo('erfolg-detail', { currentErfolgId: naechste.id });
  } else {
    toast('✅ Alle Meldungen bearbeitet!', 'success');
    navigateTo('redaktion');
  }
}

async function renderErfolgDetail() {
  const e=await DB.getErfolgById(APP.currentErfolgId);
  if (!e) return `<div class="page"><div class="alert alert-danger"><span class="alert-icon">❌</span><span>Meldung nicht gefunden.</span></div></div>`;
  const sp=SLZB_DB.getSportart(e.sportartId);
  const wb=SLZB_DB.getWettbewerb(e.wettbewerbId);
  const r=Auth.rolle();
  const aktionen=getStatusAktionen(e.status,r);

  return `<div class="page">
    <!-- Status-Fortschrittsbalken -->
    <div class="card mb-3" style="padding:12px 16px">
      ${renderStatusFortschritt(e.status)}
    </div>
    <div class="page-header flex items-center gap-3">
      <button class="btn btn-ghost btn-sm" onclick="navigateTo('${Auth.canDo('bearbeiten')?'redaktion':'meine-meldungen'}')">← Zurück</button>
      <div style="flex:1">
        <h1>${esc(e.titel)}</h1>
        <p class="text-muted text-sm">${esc(e.erfolgNr||e.id)} · ${esc(e.meldungsart)} · ${fmtDT(e.eingangsdatum)}</p>
      </div>
      ${statusBadge(e.status)}
      ${Auth.canDo('bearbeiten') ? `
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-outline btn-sm" onclick="dupliziereMeldung('${e.id}')" title="Meldung duplizieren">📋 Duplizieren</button>
          <button class="btn btn-outline btn-sm" onclick="zeigeMeldungZusammenfassen('${e.id}')" title="Meldung duplizieren">🔗 Zusammenfassen</button>
          <button class="btn btn-danger btn-sm" onclick="loescheMeldung('${e.id}','${esc(e.titel)}')" style="background:#c0392b;border-color:#c0392b;color:#fff">🗑️ Löschen</button>
        </div>` : ''}
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
      ${kannErfolgBearbeiten(e)?`<button class="tab-btn" onclick="switchTab('bearbeiten')" style="color:#E2001A;font-weight:700">✏️ Bearbeiten</button>`:''}
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
                ['Wettbewerb',esc(e.wettbewerbText||wb?.name||'–')],
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
        <div class="card-body">${renderBeteiligteTabelle(e,{bearbeitbar:kannErfolgBearbeiten(e)})}</div>
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
                  <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                    ${b.signedUrl?`<button class=\"btn btn-ghost btn-sm\" style=\"font-size:.75rem\" onclick=\"zeigeLightbox('${b.signedUrl}','','')\" >&#128269; Vollbild</button>`:''}
                    ${Auth.canDo('erfassen')?`<button class=\"btn btn-sm\" style=\"font-size:.75rem;background:#c0392b;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer\" onclick=\"loescheBild('${b.id}','${b.storagePath||''}','${e.id}')\">🗑️ Löschen</button>`:''}
                  </div>
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

    ${kannErfolgBearbeiten(e)?`<div id="tab-bearbeiten" class="tab-panel">
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
            <div class="form-group"><label>Ebene ${hilfeTooltip('Auf welcher Ebene fand der Wettkampf statt? Z.B. Bundesebene = Deutsche Meisterschaft, International = EM/WM')}</label>
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
            <textarea id="edit-artikel-text" rows="6" style="width:100%">${esc(e.textArtikel||'')}</textarea></div>\n          <div id=\"autosave-hint\" style=\"font-size:.75rem;color:#888;text-align:right;margin-bottom:6px;opacity:0;transition:opacity .5s\"></div>\n          <div class=\"card-footer mt-3\" style=\"display:flex;align-items:center;gap:8px\">\n            <button class=\"btn btn-ghost\" onclick=\"switchTab('kerndaten')\">Abbrechen</button>\n            <span class=\"text-xs text-muted\" style=\"flex:1\">Tipp: Strg+S</span>\n            <button class=\"btn btn-primary\" onclick=\"speichereKerndaten('${e.id}')\">💾 Änderungen speichern</button>\n          </div>
          
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

function renderBeteiligteTabelle(input, optionen={}) {
  const e=Array.isArray(input)?{beteiligte:input}:input;
  const beteiligte=e?.beteiligte||[];
  const bearbeitbar=optionen.bearbeitbar===true;

  const zeilen=beteiligte.map(b=>{
    const s=b.schuelerId?SLZB_DB.getSchueler(b.schuelerId):null;
    const name=b.anzeigename||s?.anzeigename||b.schuelerId||'–';
    const abgelaufen=s?.ewGueltigBis&&new Date(s.ewGueltigBis)<new Date();
    const ok=(f)=>s&&s.ew?.[f]&&!s.ewWiderruf&&!abgelaufen;

    if(bearbeitbar){
      return `<tr data-beteiligter-id="${esc(b.id||'')}">
        <td><input class="bet-name" type="text" value="${esc(name==='–'?'':name)}" style="min-width:180px"></td>
        <td><select class="bet-rolle">${teilnehmerRollenOptionen(b.rolle||'Athlet')}</select></td>
        <td colspan="6" class="text-sm text-muted">${s?'Stammdatensatz verknüpft':'Freitext-Beteiligter'}</td>
        <td>
          <select class="bet-status">
            ${['Nicht geprüft','Geprüft','Freigegeben','Gesperrt'].map(x=>`<option ${x===(b.einwilligungsstatus||'Nicht geprüft')?'selected':''}>${x}</option>`).join('')}
          </select>
        </td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" onclick="speichereBeteiligtenAenderung('${b.id||''}')">💾</button>
          <button class="btn btn-danger btn-sm" onclick="entferneBeteiligten('${b.id||''}','${esc(name).replace(/'/g,"\\'")}')">✕</button>
        </td>
      </tr>`;
    }

    return `<tr>
      <td>${esc(name)}${b.schuelerId?`<br><span class="text-xs text-muted">${esc(b.schuelerId)}</span>`:''}</td>
      <td class="text-sm">${esc(b.rolle||'Athlet')}</td>
      <td>${s?einwilligungIcon(ok('foto')):'<span class="ew-warn">?</span>'}</td>
      <td>${s?einwilligungIcon(ok('print')):'<span class="ew-warn">?</span>'}</td>
      <td>${s?einwilligungIcon(ok('homepage')):'<span class="ew-warn">?</span>'}</td>
      <td>${s?einwilligungIcon(ok('digitalSignage')):'<span class="ew-warn">?</span>'}</td>
      <td>${s?einwilligungIcon(ok('socialMedia')):'<span class="ew-warn">?</span>'}</td>
      <td>${s?einwilligungIcon(ok('einzeldarstellung')):'<span class="ew-warn">?</span>'}</td>
      <td>${statusBadge(b.einwilligungsstatus||'Nicht geprüft')}${abgelaufen?'<br><span class="badge badge-danger text-xs">Abgelaufen</span>':''}${s?.ewWiderruf?'<br><span class="badge badge-danger text-xs">Widerrufen</span>':''}</td>
    </tr>`;
  }).join('');

  const tabelle=beteiligte.length?`<div style="overflow-x:auto"><table class="einwilligung-matrix">
    <thead><tr><th>Schüler/in</th><th>Rolle</th><th>Foto</th><th>Print</th><th>Homepage</th><th>Dig.Sign.</th><th>Social</th><th>Einzel</th><th>Status</th>${bearbeitbar?'<th>Aktionen</th>':''}</tr></thead>
    <tbody>${zeilen}</tbody></table></div>`:'<p class="text-muted">Keine Beteiligten erfasst.</p>';

  if(!bearbeitbar) return tabelle;
  return `${tabelle}
    <div class="card mt-3" style="border:1px solid var(--slzb-border)">
      <div class="card-header"><h3>➕ Beteiligten hinzufügen</h3></div>
      <div class="card-body">
        <div class="form-row cols-3">
          <div class="form-group"><label>Name</label><input id="bet-neu-name" type="text" placeholder="z. B. Max Mustermann"></div>
          <div class="form-group"><label>Rolle</label><select id="bet-neu-rolle">${teilnehmerRollenOptionen()}</select></div>
          <div class="form-group"><label>Einwilligung</label><select id="bet-neu-status"><option>Nicht geprüft</option><option>Geprüft</option><option>Freigegeben</option><option>Gesperrt</option></select></div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="fuegeBeteiligtenHinzu('${e?.id||APP.currentErfolgId}')">Hinzufügen</button>
      </div>
    </div>`;
}

async function fuegeBeteiligtenHinzu(erfolgId) {
  const name=document.getElementById('bet-neu-name')?.value?.trim()||'';
  const rolle=document.getElementById('bet-neu-rolle')?.value||'Athlet';
  const status=document.getElementById('bet-neu-status')?.value||'Nicht geprüft';
  if(!name){toast('Bitte einen Namen eingeben.','warning');return;}
  const result=await DB.fuegeBeteiligtenHinzu(erfolgId,{anzeigename:name,rolle,einwilligungsstatus:status,schuelerId:null});
  if(!result.ok){toast('Fehler: '+result.fehler,'danger');return;}
  APP._erfolgeCache=null;
  toast('Beteiligter hinzugefügt','success');
  navigateTo('erfolg-detail',{currentErfolgId:erfolgId});
  setTimeout(()=>switchTab('beteiligte'),150);
}

async function speichereBeteiligtenAenderung(id) {
  if(!id){toast('Teilnehmer-ID fehlt.','danger');return;}
  const row=document.querySelector(`[data-beteiligter-id="${CSS.escape(id)}"]`);
  if(!row){toast('Beteiligter wurde nicht gefunden.','danger');return;}
  const result=await DB.aktualisiereBeteiligten(id,{
    anzeigename:row.querySelector('.bet-name')?.value?.trim()||'',
    rolle:row.querySelector('.bet-rolle')?.value||'Athlet',
    einwilligungsstatus:row.querySelector('.bet-status')?.value||'Nicht geprüft',
  });
  if(!result.ok){toast('Fehler: '+result.fehler,'danger');return;}
  APP._erfolgeCache=null;
  toast('Beteiligter aktualisiert','success');
  navigateTo('erfolg-detail',{currentErfolgId:APP.currentErfolgId});
  setTimeout(()=>switchTab('beteiligte'),150);
}

async function entferneBeteiligten(id,name) {
  if(!id){toast('Teilnehmer-ID fehlt.','danger');return;}
  if(!confirm(`${name||'Diese Person'} wirklich entfernen?`)) return;
  const result=await DB.entferneBeteiligten(id);
  if(!result.ok){toast('Fehler: '+result.fehler,'danger');return;}
  APP._erfolgeCache=null;
  toast('Beteiligter entfernt','success');
  navigateTo('erfolg-detail',{currentErfolgId:APP.currentErfolgId});
  setTimeout(()=>switchTab('beteiligte'),150);
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
      ${renderBeteiligteTabelle(e,{bearbeitbar:false})}
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
  const html=`<div class="card">
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
      <div class=\"card mt-3\">
        <div class=\"card-header\"><h2>\ud83d\udcc2 Gespeicherte Poster-Entw\u00fcrfe</h2></div>
        <div class=\"card-body\" id=\"poster-entwuerfe-liste\"><p class=\"text-muted text-sm\">Wird geladen...</p></div>
      </div>
    </div>
  </div>`;
  setTimeout(()=>renderPosterEntwuerfeInTab(e.id),300);
  return html;
}

// ── Statusaktionen ───────────────────────────────────────────
function getStatusAktionen(status,rolle) {
  const map={
    
    redaktion:{
      'Eingereicht':[
        {status:'Freigegeben',label:'✅ Freigeben',cls:'success'},
        {status:'Rückfrage an Melder',label:'💬 Rückfrage',cls:'warning'},
        {status:'Unvollständig',label:'⚠️ Unvollständig',cls:'warning'},
        {status:'Dublettenverdacht',label:'🔁 Dublette',cls:'danger'},
      ],
      'Dublettenverdacht':[
        {status:'Freigegeben',label:'✅ Kein Duplikat – Freigeben',cls:'success'},
        {status:'Gelöscht/Anonymisiert',label:'🗑️ Als Duplikat löschen',cls:'danger'},
      ],
      'Unvollständig':[
        {status:'Rückfrage an Melder',label:'💬 Rückfrage senden',cls:'warning'},
        {status:'Freigegeben',label:'✅ Vollständig – Freigeben',cls:'success'},
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
        {status:'Freigegeben',label:'✅ Freigeben',cls:'success'},
        {status:'Rückfrage an Melder',label:'💬 Rückfrage',cls:'warning'},
        {status:'Dublettenverdacht',label:'🔁 Dublette',cls:'danger'},
      ],
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
  if(!result.ok){
    toast('Fehler beim Statuswechsel: '+(result.fehler||'Unbekannter Fehler'),'danger');
    return;
  }
  APP._erfolgeCache=null;
  toast(`Status → ${statusNeu}`,'success');

  // notify-status-change ist in diesem Supabase-Projekt nicht vorhanden.
  // Statuswechsel bleiben vollständig funktionsfähig, ohne eine nicht
  // bereitgestellte Edge Function aufzurufen.
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


// ── Datenschutz-Prüfung für Poster ───────────────────────────
async function pruefeAthletDatenschutz(athletenName, sportart) {
  if (!athletenName) return { gesperrt: false, einschraenkungen: [] };
  try {
    // Suche nach Vor- und Nachname (flexibel)
    const teile = athletenName.trim().split(/\s+/);
    const ersterTeil = teile[0] || '';
    const letzterTeil = teile[teile.length - 1] || '';

    let query = Backend.client
      .from('datenschutz_widerspruch')
      .select('*')
      .or(`nachname.ilike.%${ersterTeil}%,vorname.ilike.%${ersterTeil}%,nachname.ilike.%${letzterTeil}%,vorname.ilike.%${letzterTeil}%`)
      .limit(10);

    // Sportart-Filter wenn angegeben
    if (sportart) {
      query = query.or(`sportart.ilike.%${sportart}%,sportart.is.null`);
    }

    const { data } = await query;
    if (!data?.length) return { gesperrt: false, einschraenkungen: [] };

    const einschraenkungen = [];
    for (const e of data) {
      const name = `${e.vorname} ${e.nachname}`.trim();
      const details = [];
      if (e.foto_print)    details.push('Foto-Print');
      if (e.foto_presse)   details.push('Foto-Presse');
      if (e.foto_homepage) details.push('Foto-Homepage');
      if (e.foto_events)   details.push('Foto-Events');
      if (e.foto_social)   details.push('Foto-Social');
      if (e.name_print)    details.push('Name-Print');
      if (e.name_presse)   details.push('Name-Presse');
      if (e.name_homepage) details.push('Name-Homepage');
      if (e.name_events)   details.push('Name-Events');
      if (e.name_social)   details.push('Name-Social');
      if (details.length) {
        einschraenkungen.push(`${name}: ${details.join(', ')} gesperrt`);
      }
    }
    return { gesperrt: einschraenkungen.length > 0, einschraenkungen, eintraege: data };
  } catch(e) {
    return { gesperrt: false, einschraenkungen: [] };
  }
}

function zeigeDatenschutzWarnung(canvas, ctx) {
  const w = canvas.width, h = canvas.height;
  // Rotes Kreuz über das Poster
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = '#E2001A';
  ctx.lineWidth = Math.min(w, h) * 0.04;
  ctx.lineCap = 'round';
  const pad = Math.min(w, h) * 0.08;
  ctx.beginPath();
  ctx.moveTo(pad, pad); ctx.lineTo(w - pad, h - pad);
  ctx.moveTo(w - pad, pad); ctx.lineTo(pad, h - pad);
  ctx.stroke();
  // Warnung-Box
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#E2001A';
  const bh = h * 0.12, by = h * 0.44;
  ctx.fillRect(0, by, w, bh);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(bh * 0.45)}px Montserrat, Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚠ DATENSCHUTZ – NICHT VERÖFFENTLICHEN', w/2, by + bh/2);
  ctx.restore();
}

async function zeigeA3Vorschau(erfolgId) {
  toast('A3-Ausgabe wird vorbereitet...','info');
  try {
    const e = await DB.getErfolgById(erfolgId);
    if (!e) { toast('Erfolg nicht gefunden','danger'); return; }

    // Datenschutz-Prüfung
    const athletenName = e.athletenName || e.result_text || '';
    const dsCheck = await pruefeAthletDatenschutz(athletenName);
    if (dsCheck.gesperrt) {
      window._posterDsGesperrt = true;
      window._posterDsHinweise = dsCheck.einschraenkungen;
    } else {
      window._posterDsGesperrt = false;
      window._posterDsHinweise = [];
    }

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
        ${posterEditorHTML(e)}
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
      ${window._posterDsGesperrt ? `<div style="background:#E2001A;color:#fff;padding:10px 16px;font-weight:700;font-size:.85rem;text-align:center;border-radius:6px;margin:8px 16px">
        ⚠️ DATENSCHUTZ: ${(window._posterDsHinweise||[]).join(' · ')||'Einschränkungen vorhanden'} – Nicht veröffentlichen!
      </div>` : ''}
      <div class="modal-footer">
        <button class="btn btn-ghost close-btn">Schließen</button>
        <button class="btn btn-outline dl-png">🖼️ PNG herunterladen</button>\n        <button class=\"btn btn-primary ig-share\" style=\"background:#E1306C;border-color:#E1306C\">\xf0\x9f\x93\xb1 Instagram teilen</button>
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
    schutzeModalVorAussenklick(overlay, modal);
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

    // Datenschutz-Prüfung
    const athletenName = e.athletenName || e.result_text || '';
    const dsCheck = await pruefeAthletDatenschutz(athletenName);
    window._posterDsGesperrt = dsCheck.gesperrt;
    window._posterDsHinweise = dsCheck.einschraenkungen;
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
          <button class=\"tab-btn\" style=\"color:#aaa;flex:1\" onclick=\"wechsleBildschirmFormat('slzb-screen')\">📺 SLZB-Bildschirm</button>
        </div>
        ${posterEditorHTML(e)}
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
    schutzeModalVorAussenklick(overlay, modal);
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
    window._bsErfolg = e;
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

    // Datenschutz-Prüfung
    const athletenName = e.athletenName || e.result_text || '';
    const dsCheck = await pruefeAthletDatenschutz(athletenName);
    window._posterDsGesperrt = dsCheck.gesperrt;
    window._posterDsHinweise = dsCheck.einschraenkungen;

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
        ${posterEditorHTML(e)}
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
    // Instagram-Teilen-Button
    const igBtn = modal.querySelector('.ig-share');
    if (igBtn) igBtn.onclick = ()=>teileAufInstagram('social-canvas');
    overlay.appendChild(modal);
    schutzeModalVorAussenklick(overlay, modal);
    document.body.appendChild(overlay);

    // Aktuelles Format merken
    window._socialErfolg = e;
    window._smErfolg = e;
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
  const _eBaseBS = window._screenErfolg;
  if (!_eBaseBS) return;
  const e = document.getElementById('pe-titel') ? posterEditorWerte(_eBaseBS) : _eBaseBS;
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
  } else if (format==='slzb-screen') {
    if (canvas) { canvas.width=975; canvas.height=1065; canvas.style.maxHeight='60vh'; }
    if (info) info.textContent='975×1065 px · SLZB-Bildschirm (16,51×18,04 cm bei 150 DPI)';
    await zeichneSlzbBildschirmFormat('screen-canvas', e);
  } else {
    if (canvas) { canvas.width=1080; canvas.height=1350; canvas.style.maxHeight='65vh'; }
    if (info) info.textContent='1080×1350 px · Hochformat';
    await zeichneSLZBPoster('screen-canvas', e);
  }
  // Datenschutz-Warnung auf Canvas zeichnen wenn gesperrt
  if (window._posterDsGesperrt) {
    const dsCanvas = document.getElementById('screen-canvas');
    if (dsCanvas) zeigeDatenschutzWarnung(dsCanvas, dsCanvas.getContext('2d'));
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
  const _eBase = window._socialErfolg;
  if (!_eBase) return;
  // Editor-Werte verwenden wenn Poster-Editor geöffnet ist
  const e = document.getElementById('pe-titel') ? posterEditorWerte(_eBase) : _eBase;

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
  // Datenschutz-Warnung auf Canvas zeichnen wenn gesperrt
  if (window._posterDsGesperrt) {
    const dsCanvas = document.getElementById('social-canvas');
    if (dsCanvas) zeigeDatenschutzWarnung(dsCanvas, dsCanvas.getContext('2d'));
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
  // Datenschutz-Warnung auf Canvas zeichnen wenn gesperrt
  if (window._posterDsGesperrt) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      zeigeDatenschutzWarnung(canvas, ctx);
    }
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

// ── Negativliste → Einwilligungen überführen ─────────────────
async function zeigeNegativlisteUeberfuehren() {
  const { data: liste } = await Backend.client
    .from('datenschutz_widerspruch').select('*').order('nachname');
  if (!liste?.length) { toast('Keine Negativliste vorhanden', 'warning'); return; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal'; modal.style.maxWidth = '700px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>📋 Negativliste → Einwilligungen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
        <span>${liste.length} Einträge in der Negativliste. Diese werden als Datenschutz-Widersprüche in der App hinterlegt.</span>
      </div>
      <div style="max-height:300px;overflow-y:auto;border:1px solid var(--slzb-border);border-radius:8px">
        ${liste.map(e => `<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.08);font-size:.85rem">
          <strong>${esc(e.nachname)}, ${esc(e.vorname)}</strong>
          ${e.klasse ? ` · ${esc(e.klasse)}` : ''}
          <span style="color:#888;font-size:.75rem;margin-left:8px">
            ${[e.foto_print?'Foto-Print':'', e.foto_homepage?'Foto-Web':'', e.foto_social?'Foto-Social':'',
               e.name_print?'Name-Print':'', e.name_homepage?'Name-Web':''].filter(Boolean).join(', ')||'Keine Einschränkungen'}
          </span>
        </div>`).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="fuehreNegativlisteUeber()">✅ Überführen</button>
    </div>`;

  overlay.appendChild(modal);
  overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  window._dsListe = liste;
}

async function fuehreNegativlisteUeber() {
  // Nicht mehr nötig - Einwilligungsseite liest direkt aus datenschutz_widerspruch
  document.querySelector('.modal-overlay')?.remove();
  navigateTo('einwilligungen');
}

async function renderEinwilligungen() {
  // Negativliste aus Supabase laden
  const { data: negativliste } = await Backend.client
    .from('datenschutz_widerspruch')
    .select('*')
    .order('nachname');
  const dsListe = negativliste || [];

  const dsTabelle = dsListe.length ? `
    <div class="card mb-4">
      <div class="card-header">
        <h2>🚫 Datenschutz-Negativliste (${dsListe.length} Einträge)</h2>
        <span class="text-muted" style="font-size:.8rem">Importiert aus Excel – Widersprüche zur Veröffentlichung</span>
      </div>
      <div class="table-wrap">
        <table style="font-size:.82rem">
          <thead><tr>
            <th>Name</th><th>Klasse</th><th>Sportart</th>
            <th title="Name-Print">N-P</th>
            <th title="Name-Presse">N-Pr</th>
            <th title="Name-Homepage">N-H</th>
            <th title="Name-Events">N-E</th>
            <th title="Name-Social">N-S</th>
            <th title="Foto-Print">F-P</th>
            <th title="Foto-Presse">F-Pr</th>
            <th title="Foto-Homepage">F-H</th>
            <th title="Foto-Events">F-E</th>
            <th title="Foto-Social">F-S</th>
            <th>Schuljahr</th>
          </tr></thead>
          <tbody>
            ${dsListe.map(e => {
              const icon = (v) => v
                ? '<span style="color:#E2001A;font-weight:700">✗</span>'
                : '<span style="color:#4caf50">✓</span>';
              return `<tr>
                <td><strong>${esc(e.nachname)}</strong>, ${esc(e.vorname)}</td>
                <td>${esc(e.klasse||'–')}</td>
                <td>${esc(e.sportart||'–')}</td>
                <td>${icon(e.name_print)}</td>
                <td>${icon(e.name_presse)}</td>
                <td>${icon(e.name_homepage)}</td>
                <td>${icon(e.name_events)}</td>
                <td>${icon(e.name_social)}</td>
                <td>${icon(e.foto_print)}</td>
                <td>${icon(e.foto_presse)}</td>
                <td>${icon(e.foto_homepage)}</td>
                <td>${icon(e.foto_events)}</td>
                <td>${icon(e.foto_social)}</td>
                <td style="font-size:.75rem;color:#888">${esc(e.schuljahr||'–')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : `
    <div class="card mb-4">
      <div class="card-body">
        <p class="text-muted">Noch keine Negativliste importiert. Bitte unter <strong>Datenschutz → Negativliste importieren</strong> die Excel-Datei hochladen.</p>
      </div>
    </div>`;

  return `<div class="page">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div><h1>🔒 Einwilligungsverwaltung</h1></div>
      ${Auth.canDo('datenschutz') ? `<button class="btn btn-outline btn-sm" onclick="navigateTo('datenschutz_import')">📥 Negativliste importieren</button>` : ''}
    </div>

    ${dsTabelle}

    ${SLZB_DB.schueler.length ? `
    <div class="card">
      <div class="card-header"><h2>👤 Schüler-Einwilligungen (${SLZB_DB.schueler.length})</h2></div>
      <div class="table-wrap"><table>
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
      </table></div>
    </div>` : ''}
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

// ── Ausgaben: Meldungen-Poster ────────────────────────────────
async function renderAusgabenMeldungen() {
  const alle = await ladeErfolge();
  const freigegebene = alle.filter(e => ['Freigegeben','Veröffentlicht'].includes(e.status));
  return `<div class="page">
    <div class="page-header">
      <h1>🖼️ Poster aus Meldungen</h1>
      <p class="text-muted">Erstelle Poster, Bildschirm- und Social-Media-Ausgaben aus freigegebenen Meldungen.</p>
    </div>
    ${freigegebene.length === 0
      ? `<div class="alert alert-warning"><span class="alert-icon">⚠️</span>
          <span>Keine freigegebenen Meldungen vorhanden. Bitte zuerst Meldungen freigeben.</span></div>`
      : `<div class="card">
          <div class="card-header">
            <h2>✅ Freigegebene Meldungen (${freigegebene.length})</h2>
            <input type="text" placeholder="Suchen..." id="ausgaben-suche"
              oninput="ausgabenFilter(this.value)"
              style="max-width:200px;font-size:.85rem">
          </div>
          <div id="ausgaben-liste" class="table-wrap mobile-cards"><table>
            <thead><tr>
              <th>Titel</th><th>Sportart</th><th>Datum</th><th>Athlet</th><th>Ausgaben</th>
            </tr></thead>
            <tbody>${freigegebene.map(e => `<tr>
              <td data-label="Titel"><strong>${esc(e.titel||'–')}</strong></td>
              <td data-label="Sportart" class="text-sm">${esc(e.sportart||'–')}</td>
              <td data-label="Datum" class="text-sm">${fmt(e.datum)}</td>
              <td data-label="Athlet" class="text-sm">${esc(e.athletenName||'–')}</td>
              <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  <button class="btn btn-outline btn-sm" onclick="zeigeA3Vorschau('${e.id}')" title="A3-Aushang">🖨️ A3</button>
                  <button class="btn btn-outline btn-sm" onclick="zeigeBildschirmModal('${e.id}')" title="Bildschirm">🖥️</button>
                  <button class="btn btn-outline btn-sm" onclick="zeigeSocialModal('${e.id}')" title="Social Media">📱</button>
                </div>
              </td>
            </tr>`).join('')}
            </tbody>
          </table></div>
        </div>`}
  </div>`;
}

function ausgabenFilter(suchbegriff) {
  const rows = document.querySelectorAll('#ausgaben-liste tbody tr');
  const s = suchbegriff.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(s) ? '' : 'none';
  });
}

// ── Ausgaben: Event-Poster ────────────────────────────────────
function renderAusgabenEvents() {
  return `<div class="page">
    <div class="page-header">
      <h1>🎯 Event-Poster</h1>
      <p class="text-muted">Athleten-Vorstellungen, Countdowns, Jubiläen und Schulnachrichten.</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">

      <div class="card" style="cursor:pointer" onclick="zeigeAthletenVorstellung()">
        <div class="card-body" style="text-align:center;padding:24px">
          <div style="font-size:2.5rem;margin-bottom:8px">🏃</div>
          <h3 style="margin-bottom:6px">Athleten-Vorstellung</h3>
          <p class="text-muted" style="font-size:.85rem">Weltcup-Vorschau, Karriere-Poster, Carousel</p>
          <div style="display:flex;gap:6px;justify-content:center;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();zeigeAthletenVorstellung()">Erstellen</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();zeigeVeranstaltungsWorkspace()">📋 Gespeicherte</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();zeigeAthletenProfileVerwaltung()">👤 Profile</button>
          </div>
        </div>
      </div>

      <div class="card" style="cursor:pointer" onclick="navigateTo('countdown')">
        <div class="card-body" style="text-align:center;padding:24px">
          <div style="font-size:2.5rem;margin-bottom:8px">⏳</div>
          <h3 style="margin-bottom:6px">Countdown-Poster</h3>
          <p class="text-muted" style="font-size:.85rem">Vorfreude auf Wettkämpfe und Events</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="event.stopPropagation();navigateTo('countdown')">Erstellen</button>
        </div>
      </div>

      <div class="card" style="cursor:pointer" onclick="navigateTo('schulnachrichten')">
        <div class="card-body" style="text-align:center;padding:24px">
          <div style="font-size:2.5rem;margin-bottom:8px">📸</div>
          <h3 style="margin-bottom:6px">Foto-Karussell</h3>
          <p class="text-muted" style="font-size:.85rem">Events, Ausflüge, Schulveranstaltungen</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="event.stopPropagation();navigateTo('schulnachrichten')">Erstellen</button>
        </div>
      </div>

      <div class="card" style="cursor:pointer" onclick="navigateTo('jubilaeum')">
        <div class="card-body" style="text-align:center;padding:24px">
          <div style="font-size:2.5rem;margin-bottom:8px">🎖️</div>
          <h3 style="margin-bottom:6px">Jubiläums-Poster</h3>
          <p class="text-muted" style="font-size:.85rem">Ehrungen, Jubiläen, besondere Anlässe</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="event.stopPropagation();navigateTo('jubilaeum')">Erstellen</button>
        </div>
      </div>

      <div class="card" style="cursor:pointer" onclick="navigateTo('highlights')">
        <div class="card-body" style="text-align:center;padding:24px">
          <div style="font-size:2.5rem;margin-bottom:8px">🎠</div>
          <h3 style="margin-bottom:6px">Highlights-Karussell</h3>
          <p class="text-muted" style="font-size:.85rem">Monatsrückblick, Jahreshighlights</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="event.stopPropagation();navigateTo('highlights')">Erstellen</button>
        </div>
      </div>

      <div class="card" style="cursor:pointer" onclick="navigateTo('voting')">
        <div class="card-body" style="text-align:center;padding:24px">
          <div style="font-size:2.5rem;margin-bottom:8px">🏆</div>
          <h3 style="margin-bottom:6px">Sportler des Monats</h3>
          <p class="text-muted" style="font-size:.85rem">Abstimmung erstellen und verwalten</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="event.stopPropagation();navigateTo('voting')">Verwalten</button>
        </div>
      </div>

    </div>
  </div>`;
}

// ── Ausgaben: Social Media ────────────────────────────────────
async function renderAusgabenSocial() {
  const alle = await ladeErfolge();
  const freigegebene = alle.filter(e => ['Freigegeben','Veröffentlicht'].includes(e.status)).slice(0, 20);
  return `<div class="page">
    <div class="page-header">
      <h1>📱 Social Media</h1>
      <p class="text-muted">Instagram Stories, Beiträge, Reels und Twitter-Banner aus freigegebenen Meldungen.</p>
    </div>
    ${freigegebene.length === 0
      ? `<div class="alert alert-warning"><span class="alert-icon">⚠️</span>
          <span>Keine freigegebenen Meldungen vorhanden.</span></div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
          ${freigegebene.map(e => `
            <div class="card" style="overflow:hidden">
              <div style="background:var(--slzb-bg-secondary);padding:12px;border-bottom:1px solid var(--slzb-border)">
                <div style="font-weight:700;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.titel||'–')}</div>
                <div style="font-size:.75rem;color:#888;margin-top:2px">${esc(e.sportart||'–')} · ${fmt(e.datum)}</div>
              </div>
              <div style="padding:10px;display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" style="font-size:.75rem"
                  onclick="zeigeSocialModal('${e.id}')" title="Story/Reel/Beitrag">📱 Social</button>
                <button class="btn btn-ghost btn-sm" style="font-size:.75rem"
                  onclick="zeigeBildschirmModal('${e.id}')" title="Bildschirm-Format">🖥️ Screen</button>
              </div>
            </div>`).join('')}
        </div>`}
  </div>`;
}

// ── Freigaben (eigene Seite) ──────────────────────────────────
async function renderFreigaben() {
  const alle = await ladeErfolge();
  const zuFreigeben = alle.filter(e => e.status === 'Freigabe Öffentlichkeitsarbeit');
  const freigegebene = alle.filter(e => ['Freigegeben','Veröffentlicht'].includes(e.status));
  return `<div class="page">
    <div class="page-header"><h1>✅ Freigaben</h1></div>
    ${zuFreigeben.length > 0 ? `
    <div class="card mb-4">
      <div class="card-header"><h2>⏳ Warten auf Freigabe (${zuFreigeben.length})</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Titel</th><th>Sportart</th><th>Datum</th><th>Aktionen</th></tr></thead>
        <tbody>${zuFreigeben.map(e => `<tr>
          <td><strong>${esc(e.titel||'–')}</strong></td>
          <td class="text-sm">${esc(e.sportart||'–')}</td>
          <td class="text-sm">${fmt(e.datum)}</td>
          <td>
            <button class="btn btn-success btn-sm" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">Prüfen & Freigeben</button>
          </td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>` : `<div class="alert alert-success mb-4"><span class="alert-icon">✅</span>
      <span>Keine Meldungen warten auf Freigabe.</span></div>`}
    <div class="card">
      <div class="card-header">
        <h2>✅ Freigegebene Meldungen (${freigegebene.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('ausgaben-meldungen')">🖼️ Poster erstellen</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Titel</th><th>Sportart</th><th>Datum</th><th>Status</th><th>Aktionen</th></tr></thead>
        <tbody>${freigegebene.slice(0,15).map(e => `<tr>
          <td><strong>${esc(e.titel||'–')}</strong></td>
          <td class="text-sm">${esc(e.sportart||'–')}</td>
          <td class="text-sm">${fmt(e.datum)}</td>
          <td>${statusBadge(e.status)}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm" onclick="zeigeA3Vorschau('${e.id}')">🖨️</button>
              <button class="btn btn-ghost btn-sm" onclick="zeigeSocialModal('${e.id}')">📱</button>
            </div>
          </td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

async function renderAusgaben() {
  const alle=await ladeErfolge();
  const freigegebene=alle.filter(e=>['Freigegeben','Veröffentlicht'].includes(e.status));
  return`<div class="page">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div><h1>📤 Ausgaben & Freigaben</h1></div>
    </div>
    <div class="alert alert-warning mb-3"><span class="alert-icon">⚠️</span>
      <span>Ausgaben nur für Status <strong>Freigegeben</strong> oder <strong>Veröffentlicht</strong>.</span></div>

    <!-- Athleten-Vorstellung -->
    <div class="card mb-3">
      <div class="card-header"><h2>🏅 Athleten-Vorstellung</h2></div>
      <div class="card-body">
        <div class="alert alert-info mb-2"><span class="alert-icon">ℹ️</span>
          <span>Erstellt pro Athlet 2 Poster im SLZB-Stil: Porträt + Erfolge. Ideal für Weltcup-Vorschauen.</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="zeigeAthletenVorstellung()">
            🖼️ Athleten-Vorstellung erstellen
          </button>
          <button class="btn btn-outline" onclick="zeigeAthletenProfileVerwaltung()">
            👤 Athleten-Profile
          </button>
          <button class="btn btn-outline" onclick="zeigeVeranstaltungsWorkspace()">
            📋 Gespeicherte Veranstaltungen
          </button>
        </div>
      </div>
    </div>

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
              <optgroup label="📋 Aus Meldungen (freigegebene Erfolge)">
              ${[...new Map(freigegebene.filter(e=>e.wettbewerbText).map(e=>[e.wettbewerbText,e])).values()]
                .sort((a,b)=>a.wettbewerbText.localeCompare(b.wettbewerbText))
                .map(e=>`<option value="${esc(e.wettbewerbText)}">${esc(e.wettbewerbText)}${e.datum?' ('+new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+')':''}</option>`)
                .join('')}
              </optgroup>
              ${(typeof SLZB_TERMINE!=='undefined'&&SLZB_TERMINE.length)?`
              <optgroup label="📅 Aus Kalender (bevorstehende Veranstaltungen)">
              ${[...new Map(SLZB_TERMINE
                .filter(t=>t.datum>=new Date().toISOString().slice(0,10)&&t.prioritaet<=2)
                .map(t=>[t.veranstaltung,t])).values()]
                .sort((a,b)=>a.datum.localeCompare(b.datum))
                .slice(0,30)
                .map(t=>`<option value="${esc(t.veranstaltung)}" data-datum="${t.datum}" data-ort="${esc(t.ort||'')}" data-sportart="${esc(t.sportart||'')}">
                  ${esc(t.veranstaltung)} (${new Date(t.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})})
                </option>`)
                .join('')}
              </optgroup>`:''}
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
            <tr><td class="text-muted" style="padding:6px 0">Rolle</td><td><span class="badge badge-info">${esc({schueler:'Schüler/in',trainer:'Trainer/Melder',mitarbeiter:'Mitarbeiter',redaktion:'Redaktion',oea:'Öffentlichkeitsarbeit',datenschutz:'Datenschutz',admin:'Administrator'}[Auth.rolle()]||Auth.rolle())}</span></td></tr>
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
    <div class=\"card mt-4\">
      <div class=\"card-header\"><h2>\ud83d\udd14 Benachrichtigungen</h2></div>
      <div class=\"card-body\">
        <p class=\"text-sm text-muted mb-3\">Erhalte eine Push-Benachrichtigung auf diesem Ger\u00e4t wenn deine Meldungen freigegeben oder kommentiert werden.</p>
        <div style=\"display:flex;gap:12px;flex-wrap:wrap\">
          <button class=\"btn btn-primary btn-sm\" onclick=\"aktivierePush()\">\ud83d\udd14 Benachrichtigungen aktivieren</button>
          <button class=\"btn btn-ghost btn-sm\" onclick=\"deaktivierePush()\">\ud83d\udd15 Deaktivieren</button>
        </div>
        <p class=\"text-xs text-muted mt-2\">Hinweis: Auf dem iPhone nur in Safari m\u00f6glich, wenn die App zum Homescreen hinzugef\u00fcgt wurde.</p>
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
        <label>Fotograf / Urheber <span class="required">*</span>${hilfeTooltip('Wer hat das Foto gemacht? Z.B. "Max Mustermann" oder "SLZB Berlin". Pflichtfeld für Datenschutz.')}</label>
        <input type="text" id="upload-urheber" placeholder="z.B. Max Mustermann oder SLZB-Archiv">
        <div class="form-hint">Name des Fotografen – wird auf dem Poster angezeigt</div>
      </div>
      <div class="form-group">
        <label>Bildunterschrift <span class="text-muted text-xs">(optional)</span></label>
        <input type="text" id="upload-caption" placeholder="z.B. Die Staffel beim Start">
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

// ── Bild löschen ─────────────────────────────────────────────────────────────
async function loescheBild(bildId, storagePath, erfolgId) {
  if (!confirm('Bild wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
  try {
    // 1. Metadaten aus DB löschen
    const { error: dbErr } = await Backend.client
      .from('achievement_media')
      .delete()
      .eq('id', bildId);
    if (dbErr) throw new Error('DB: ' + dbErr.message);

    // 2. Datei aus Storage löschen (optional – kein Fehler wenn nicht vorhanden)
    if (storagePath) {
      const { error: storErr } = await Backend.client.storage
        .from('achievement-media')
        .remove([storagePath]);
      if (storErr) console.warn('Storage-Löschung:', storErr.message);
    }

    toast('✅ Bild gelöscht', 'success');

    // 3. Detailansicht neu laden
    if (erfolgId) {
      APP._erfolgeCache = null; // Cache invalidieren
      navigateTo('erfolg-detail', { currentErfolgId: erfolgId });
    }
  } catch(e) {
    toast('❌ Fehler: ' + e.message, 'danger');
    console.error('Bild löschen:', e);
  }
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
      <div><h1>📅 Chronik</h1></div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="exportiereChronikCSVAktuell()" style="white-space:nowrap">⬇️ CSV</button>
        <button class="btn btn-primary btn-sm" onclick="exportiereChronikPPTX()" style="white-space:nowrap">📊 PowerPoint</button>
      </div>
    </div>

    <!-- Zeitraum-Schnellauswahl -->
    <div class="card mb-3" style="background:rgba(0,51,102,0.06);border-color:rgba(0,51,102,0.2)">
      <div class="card-body" style="padding:12px">
        <div style="font-size:.78rem;color:#888;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Zeitraum</div>
        <div class="flex gap-2" style="flex-wrap:wrap">
          <select id="chr-monat-select" onchange="setChronikMonat(this.value)"
            style="background:var(--slzb-bg-secondary);color:var(--slzb-text);border:1px solid var(--slzb-border);border-radius:6px;padding:5px 10px;font-size:.82rem;cursor:pointer">
            <option value="">📅 Monat wählen...</option>
            ${(()=>{
              const opts=[];
              const jetzt=new Date();
              for(let i=0;i<12;i++){
                const d=new Date(jetzt.getFullYear(),jetzt.getMonth()-i,1);
                const val=d.toISOString().slice(0,7);
                const lbl=d.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
                opts.push(`<option value="${val}">${lbl}</option>`);
              }
              return opts.join('');
            })()}
          </select>
          <button id="chr-btn-quartal" class="btn btn-ghost btn-sm" onclick="setChronikZeitraum('quartal')">📆 Dieses Quartal</button>
          <button id="chr-btn-semester" class="btn btn-ghost btn-sm" onclick="setChronikZeitraum('semester')">🗓️ Dieses Semester</button>
          <button id="chr-btn-schuljahr" class="btn btn-primary btn-sm" onclick="setChronikZeitraum('schuljahr')">📚 Schuljahr</button>
          <button id="chr-btn-alle" class="btn btn-ghost btn-sm" onclick="setChronikZeitraum('alle')">🔍 Alle</button>
        </div>
        <div id="chr-zeitraum-label" style="font-size:.75rem;color:#888;margin-top:6px"></div>
      </div>
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
        <div class="form-group"><label>Ansicht</label>
          <select id="chr-ansicht" onchange="aktualisiereChronik()">
            <option value="tabelle">📋 Tabelle</option>
            <option value="karten">🖼️ Karten mit Bildern</option>
            <option value="timeline">📍 Timeline</option>
          </select></div>
      </div>
      <div class="flex gap-2 mt-2" style="flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="druckeChronik()">🖨️ Drucken</button>
        <button class="btn btn-outline btn-sm" onclick="exportiereChronikCSV()">⬇️ CSV</button>
        <button class="btn btn-primary btn-sm" onclick="starteChronikDiashow()" style="background:#003366;border-color:#003366">
          ▶️ Diashow (Mensa/Konferenz)
        </button>
      </div>
    </div></div>
    <div id="chronik-inhalt">${renderChronikInhalt(alle,aktuellesSchuljahr,'','','')}</div>
  </div>`;
}

function renderChronikInhalt(alle,schuljahr,sportartId,ebene,typ,ansicht='tabelle') {
  let gefiltert=alle.filter(e=>['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if(schuljahr) gefiltert=gefiltert.filter(e=>SLZB_DB.getSchuljahr(e.datum)===schuljahr);
  if(sportartId) gefiltert=gefiltert.filter(e=>e.sportartId===sportartId);
  if(ebene) gefiltert=gefiltert.filter(e=>e.ebene===ebene);
  if(typ) gefiltert=gefiltert.filter(e=>e.meldungsart===typ);
  // Zeitraum-Filter
  const zr = window._chrZeitraum || {};
  if(zr.von) gefiltert=gefiltert.filter(e=>e.datum && new Date(e.datum) >= zr.von);
  if(zr.bis) gefiltert=gefiltert.filter(e=>e.datum && new Date(e.datum) <= zr.bis);
  gefiltert.sort((a,b)=>new Date(b.datum)-new Date(a.datum));
  if(!gefiltert.length) return`<div class="alert alert-info"><span class="alert-icon">ℹ️</span><span>Keine freigegebenen Erfolge für die gewählten Filter.</span></div>`;
  const goldCount=gefiltert.filter(e=>e.medaille==='Gold').length;
  const silberCount=gefiltert.filter(e=>e.medaille==='Silber').length;
  const bronzeCount=gefiltert.filter(e=>e.medaille==='Bronze').length;
  const gruppen={};
  gefiltert.forEach(e=>{const key=SLZB_DB.getSportart(e.sportartId)?.name||'Sonstige';if(!gruppen[key])gruppen[key]=[];gruppen[key].push(e);});
  const mi={Gold:'🥇',Silber:'🥈',Bronze:'🥉'};

  // Karten-Ansicht mit Bildern
  const renderKarten = () => `
    ${Object.entries(gruppen).map(([sportart,erfolge])=>`
      <div class="card mb-3">
        <div class="card-header" style="background:var(--slzb-light)">
          <h2>🏅 ${esc(sportart)}</h2>
          <span class="badge badge-info">${erfolge.length}</span>
        </div>
        <div class="card-body">
          <div class="grid grid-3" style="gap:12px">
            ${erfolge.map(e=>{
              const bild = e.bilder?.[0]?.signedUrl || null;
              const athlet = (e.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', ');
              return `<div class="card" style="cursor:pointer;overflow:hidden;border:1.5px solid var(--slzb-border)" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
                ${bild ? `<div style="height:120px;overflow:hidden;background:#111">
                  <img src="${esc(bild)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"
                    onerror="this.parentNode.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;font-size:2rem;color:#666\'>🏅</div>'">
                </div>` : `<div style="height:80px;background:linear-gradient(135deg,#003366,#E2001A);display:flex;align-items:center;justify-content:center;font-size:2rem">🏅</div>`}
                <div class="card-body" style="padding:10px">
                  <div class="text-xs text-muted mb-1">${fmt(e.datum)}</div>
                  <div class="text-sm font-bold" style="line-height:1.3;margin-bottom:4px">${esc(e.titel)}</div>
                  ${athlet ? `<div class="text-xs text-muted">👤 ${esc(athlet)}</div>` : ''}
                  ${e.platzierung ? `<div class="text-xs mt-1">${mi[e.medaille]||''} ${e.platzierung}. Platz</div>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`).join('')}`;

  // Timeline-Ansicht
  const renderTimeline = () => `
    <div style="position:relative;padding-left:32px">
      <div style="position:absolute;left:12px;top:0;bottom:0;width:2px;background:var(--slzb-border)"></div>
      ${gefiltert.map(e=>{
        const athlet = (e.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', ');
        const farbe = e.medaille==='Gold'?'#C9A227':e.medaille==='Silber'?'#8A9BB0':e.medaille==='Bronze'?'#C2783A':'#003366';
        return `<div style="position:relative;margin-bottom:16px;cursor:pointer" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
          <div style="position:absolute;left:-26px;top:8px;width:12px;height:12px;border-radius:50%;background:${farbe};border:2px solid #fff;box-shadow:0 0 0 2px ${farbe}"></div>
          <div class="card" style="border-left:3px solid ${farbe}">
            <div class="card-body" style="padding:10px 14px">
              <div class="text-xs text-muted mb-1">${fmt(e.datum)} · ${esc(e.sportartText||'–')}</div>
              <div class="font-bold">${esc(e.titel)}</div>
              ${athlet ? `<div class="text-xs text-muted mt-1">👤 ${esc(athlet)}</div>` : ''}
              ${e.platzierung ? `<span class="badge" style="background:${farbe};color:#fff;margin-top:4px">${mi[e.medaille]||''} ${e.platzierung}. Platz</span>` : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  // Tabellen-Ansicht (Standard)
  const renderTabelle = () => `
    <div id="chronik-druck">
      <div style="display:none" class="chronik-druckkopf">
        <h2 style="color:#003366">SLZB Berlin – Chronik ${schuljahr||'Alle Jahre'}</h2>
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
            <thead><tr><th>Datum</th><th>Titel</th><th>Athlet</th><th>Ebene</th><th>Platz</th><th>Medaille</th></tr></thead>
            <tbody>${erfolge.map(e=>{
              const athlet=(e.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', ');
              return `<tr style="cursor:pointer" onclick="navigateTo('erfolg-detail',{currentErfolgId:'${e.id}'})">
                <td class="text-sm">${fmt(e.datum)}</td>
                <td><strong>${esc(e.titel)}</strong></td>
                <td class="text-sm">${esc(athlet||'–')}</td>
                <td>${ebeneBadge(e.ebene)}</td>
                <td class="text-sm font-bold">${e.platzierung?e.platzierung+'.':'–'}</td>
                <td>${e.medaille&&e.medaille!=='keine'?mi[e.medaille]+' '+e.medaille:'–'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>`).join('')}
    </div>`;

  return`
    <div class="grid grid-4 mb-4">
      <div class="stat-card"><div class="stat-icon blue">🏆</div><div><div class="stat-value">${gefiltert.length}</div><div class="stat-label">Erfolge gesamt</div></div></div>
      <div class="stat-card"><div class="stat-icon gold">🥇</div><div><div class="stat-value">${goldCount}</div><div class="stat-label">Gold</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:#F1F5F9;color:#475569">🥈</div><div><div class="stat-value">${silberCount}</div><div class="stat-label">Silber</div></div></div>
      <div class="stat-card"><div class="stat-icon orange">🥉</div><div><div class="stat-value">${bronzeCount}</div><div class="stat-label">Bronze</div></div></div>
    </div>
    ${ansicht==='karten' ? renderKarten() : ansicht==='timeline' ? renderTimeline() : renderTabelle()}`;
}

// ── Chronik Zeitraum-Schnellauswahl ──────────────────────────
window._chrZeitraum = { von: null, bis: null, modus: 'schuljahr' };

function setChronikMonat(val) {
  if (!val) return;
  const [j, m] = val.split('-').map(Number);
  const von = new Date(j, m-1, 1);
  const bis = new Date(j, m, 0);
  window._chrZeitraum = { von, bis, modus: 'monat' };
  // Alle Schnellauswahl-Buttons deaktivieren
  ['monat','quartal','semester','schuljahr','alle'].forEach(m2 => {
    const btn = document.getElementById(`chr-btn-${m2}`);
    if (btn) btn.className = 'btn btn-ghost btn-sm';
  });
  const lbl = document.getElementById('chr-zeitraum-label');
  if (lbl) lbl.textContent = von.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  aktualisiereChronik();
}

function setChronikZeitraum(modus) {
  const jetzt = new Date();
  const m = jetzt.getMonth(); // 0-11
  const j = jetzt.getFullYear();
  let von = null, bis = null, label = '';

  if (modus === 'monat') {
    von = new Date(j, m, 1);
    bis = new Date(j, m + 1, 0);
    label = jetzt.toLocaleDateString('de-DE', {month:'long', year:'numeric'});
  } else if (modus === 'quartal') {
    const q = Math.floor(m / 3);
    von = new Date(j, q * 3, 1);
    bis = new Date(j, q * 3 + 3, 0);
    label = `Q${q+1} ${j} (${von.toLocaleDateString('de-DE',{month:'short'})}–${bis.toLocaleDateString('de-DE',{month:'short',year:'numeric'})})`;
  } else if (modus === 'semester') {
    // Schuljahr: Semester 1 = Aug–Jan, Semester 2 = Feb–Jul
    if (m >= 7) { // Aug–Dez → 1. Semester
      von = new Date(j, 7, 1); bis = new Date(j+1, 0, 31);
      label = `1. Semester ${j}/${j+1} (Aug–Jan)`;
    } else { // Jan–Jul → 2. Semester
      von = new Date(j, 1, 1); bis = new Date(j, 6, 31);
      label = `2. Semester ${j-1}/${j} (Feb–Jul)`;
    }
  } else if (modus === 'schuljahr') {
    von = null; bis = null;
    label = 'Aktuelles Schuljahr';
    // Schuljahr-Select auf aktuelles setzen
    const sj = document.getElementById('chr-schuljahr');
    if (sj && sj.options.length > 1) sj.selectedIndex = 1;
  } else {
    von = null; bis = null; label = 'Alle Zeiträume';
    const sj = document.getElementById('chr-schuljahr');
    if (sj) sj.value = '';
  }

  window._chrZeitraum = { von, bis, modus };

  // Buttons aktualisieren
  ['monat','quartal','semester','schuljahr','alle'].forEach(m2 => {
    const btn = document.getElementById(`chr-btn-${m2}`);
    if (btn) btn.className = m2 === modus ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
  });

  const lbl = document.getElementById('chr-zeitraum-label');
  if (lbl) lbl.textContent = label;

  aktualisiereChronik();
}

async function aktualisiereChronik() {
  const schuljahr=document.getElementById('chr-schuljahr')?.value||'';
  const sportartId=document.getElementById('chr-sportart')?.value||'';
  const ebene=document.getElementById('chr-ebene')?.value||'';
  const ansicht=document.getElementById('chr-ansicht')?.value||'tabelle';
  const alle=await ladeErfolge();
  const inhalt=document.getElementById('chronik-inhalt');
  if(inhalt) inhalt.innerHTML=renderChronikInhalt(alle,schuljahr,sportartId,ebene,'',ansicht);
}

// ── Chronik-Diashow (Mensa / Gesamtkonferenz) ────────────────
async function starteChronikDiashow() {
  // Filter-Modal zuerst zeigen
  const overlay2 = document.createElement('div');
  overlay2.className = 'modal-overlay';
  const modal2 = document.createElement('div');
  modal2.className = 'modal';
  modal2.style.maxWidth = '480px';

  const jetzt = new Date();
  const monatOptionen = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(jetzt.getFullYear(), jetzt.getMonth() - i, 1);
    monatOptionen.push(`<option value="${d.toISOString().slice(0,7)}">${d.toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</option>`);
  }

  modal2.innerHTML = `
    <div class="modal-header">
      <h3>▶️ Diashow starten</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group mb-3">
        <label style="font-weight:600">Sportart</label>
        <select id="ds-sportart" style="width:100%">
          <option value="">Alle Sportarten</option>
          ${SLZB_DB.sportarten.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group mb-3">
        <label style="font-weight:600">Zeitraum</label>
        <select id="ds-zeitraum" style="width:100%" onchange="document.getElementById('ds-custom').style.display=this.value==='custom'?'grid':'none'">
          <option value="alle">Alle Zeiten</option>
          <option value="schuljahr" selected>Aktuelles Schuljahr</option>
          <option value="semester">Aktuelles Semester</option>
          <option value="quartal">Aktuelles Quartal</option>
          <option value="monat">Dieser Monat</option>
          <option value="custom">Eigener Zeitraum...</option>
        </select>
      </div>
      <div id="ds-custom" style="display:none;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="form-group">
          <label style="font-size:.8rem">Von</label>
          <input type="date" id="ds-von" style="width:100%">
        </div>
        <div class="form-group">
          <label style="font-size:.8rem">Bis</label>
          <input type="date" id="ds-bis" style="width:100%">
        </div>
      </div>
      <div class="form-group mb-3">
        <label style="font-weight:600">Geschwindigkeit</label>
        <select id="ds-speed" style="width:100%">
          <option value="3000">3 Sekunden pro Folie</option>
          <option value="5000" selected>5 Sekunden pro Folie</option>
          <option value="8000">8 Sekunden pro Folie</option>
          <option value="12000">12 Sekunden pro Folie</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="diaShowMitFilter()">▶️ Diashow starten</button>
    </div>`;

  overlay2.appendChild(modal2);
  overlay2.addEventListener('click', ev => { if(ev.target===overlay2) overlay2.remove(); });
  document.body.appendChild(overlay2);
}

async function diaShowMitFilter() {
  const sportartId = document.getElementById('ds-sportart')?.value || '';
  const zeitraumModus = document.getElementById('ds-zeitraum')?.value || 'alle';
  const speed = parseInt(document.getElementById('ds-speed')?.value || '5000');
  const dsVon = document.getElementById('ds-von')?.value;
  const dsBis = document.getElementById('ds-bis')?.value;

  // Zeitraum berechnen
  const jetzt = new Date();
  const m = jetzt.getMonth();
  const j = jetzt.getFullYear();
  let von = null, bis = null;

  if (zeitraumModus === 'monat') { von = new Date(j,m,1); bis = new Date(j,m+1,0); }
  else if (zeitraumModus === 'quartal') { const q=Math.floor(m/3); von=new Date(j,q*3,1); bis=new Date(j,q*3+3,0); }
  else if (zeitraumModus === 'semester') {
    if (m>=7) { von=new Date(j,7,1); bis=new Date(j+1,0,31); }
    else { von=new Date(j,1,1); bis=new Date(j,6,31); }
  } else if (zeitraumModus === 'schuljahr') {
    const sj = m>=7 ? `${j}/${j+1}` : `${j-1}/${j}`;
    // Schuljahr Aug–Jul
    von = m>=7 ? new Date(j,7,1) : new Date(j-1,7,1);
    bis = m>=7 ? new Date(j+1,6,31) : new Date(j,6,31);
  } else if (zeitraumModus === 'custom' && dsVon) {
    von = new Date(dsVon); bis = dsBis ? new Date(dsBis) : null;
  }

  // Daten laden
  const alle = await ladeErfolge();
  let gefiltert = alle.filter(e => ['Freigegeben','Veröffentlicht','Archiviert'].includes(e.status));
  if (sportartId) gefiltert = gefiltert.filter(e => e.sportartId === sportartId);
  if (von) gefiltert = gefiltert.filter(e => e.datum && new Date(e.datum) >= von);
  if (bis) gefiltert = gefiltert.filter(e => e.datum && new Date(e.datum) <= bis);
  gefiltert.sort((a,b) => new Date(a.datum) - new Date(b.datum)); // alt → neu

  // Filter-Modal schließen
  document.querySelector('.modal-overlay')?.remove();

  if (!gefiltert.length) { toast('Keine Erfolge für diese Filter', 'warning'); return; }

  // Beteiligte + Bilder für alle Erfolge nachladen
  toast(`⏳ Lade ${gefiltert.length} Erfolge...`, 'info');
  const bildCache = {};

  // Beteiligte laden (batch)
  try {
    const ids = gefiltert.map(e => e.id);
    const { data: betData } = await Backend.client
      .from('achievement_participants')
      .select('achievement_id, participant_role')
      .in('achievement_id', ids);
    const betMap = {};
    (betData||[]).forEach(b => {
      if (!betMap[b.achievement_id]) betMap[b.achievement_id] = [];
      if (b.participant_role) betMap[b.achievement_id].push({ anzeigename: b.participant_role });
    });
    gefiltert.forEach(e => { if (betMap[e.id]) e.beteiligte = betMap[e.id]; });
  } catch(_) {}

  // Bilder laden (batch)
  try {
    const ids = gefiltert.map(e => e.id);
    const { data: medData } = await Backend.client
      .from('achievement_media')
      .select('achievement_id, storage_path')
      .in('achievement_id', ids)
      .limit(ids.length);
    const medMap = {};
    for (const m of (medData||[])) {
      if (!medMap[m.achievement_id] && m.storage_path) {
        const { data: sd } = await Backend.client.storage
          .from('achievement-media').createSignedUrl(m.storage_path, 3600);
        if (sd?.signedUrl) medMap[m.achievement_id] = sd.signedUrl;
      }
    }
    gefiltert.forEach(e => {
      if (medMap[e.id]) e.bilder = [{ signedUrl: medMap[e.id] }];
    });
  } catch(_) {}

  // Erste 10 Bilder vorladen
  await Promise.all(gefiltert.slice(0,10).map(async e => {
    const url = e.bilder?.[0]?.signedUrl;
    if (url) {
      try {
        const img = await ladeBild(url);
        if (img) bildCache[e.id] = img;
      } catch(_) {}
    }
  }));

  // Diashow-Overlay
  const overlay = document.createElement('div');
  overlay.id = 'diashow-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Montserrat,sans-serif;';

  let aktuell = 0;
  let intervall = speed;
  const mi = {Gold:'🥇',Silber:'🥈',Bronze:'🥉'};

  function renderFolie(idx) {
    const e = gefiltert[idx];
    const athlet = (e.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean).join(', ');
    const bildImg = bildCache[e.id];
    const bildUrl = e.bilder?.[0]?.signedUrl;
    const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
    const medailleStr = e.medaille && e.medaille !== 'keine' ? `${mi[e.medaille]||''} ${e.medaille}` : '';
    const platzStr = e.platzierung ? `${e.platzierung}. Platz` : '';

    overlay.innerHTML = `
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,#0a0c1a 0%,#1B1C1F 100%)"></div>
      ${bildUrl ? `<div style="position:absolute;inset:0;background:url('${esc(bildUrl)}') center/cover no-repeat;opacity:0.2"></div>` : ''}
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,51,102,0.75) 100%)"></div>

      <div style="position:relative;z-index:1;text-align:center;padding:40px;max-width:1100px;width:100%">
        <div style="color:#E2001A;font-size:1.1rem;font-weight:800;letter-spacing:4px;text-transform:uppercase;margin-bottom:20px">${esc(sportart)}</div>

        ${bildUrl ? `<div style="width:260px;height:260px;border-radius:50%;overflow:hidden;margin:0 auto 28px;border:4px solid #E2001A;box-shadow:0 0 50px rgba(226,0,26,0.5)">
          <img src="${esc(bildUrl)}" style="width:100%;height:100%;object-fit:cover"
            onerror="this.parentNode.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;font-size:4rem\'>🏅</div>'">
        </div>` : `<div style="width:180px;height:180px;border-radius:50%;background:rgba(226,0,26,0.15);border:4px solid #E2001A;margin:0 auto 28px;display:flex;align-items:center;justify-content:center;font-size:4rem">🏅</div>`}

        <div style="color:#fff;font-size:clamp(1.4rem,3.5vw,2.8rem);font-weight:800;font-style:italic;line-height:1.15;margin-bottom:16px;text-shadow:0 2px 12px rgba(0,0,0,0.6)">${esc(e.titel)}</div>

        ${athlet ? `<div style="color:rgba(255,255,255,0.85);font-size:1.3rem;font-weight:600;margin-bottom:14px;text-shadow:0 1px 4px rgba(0,0,0,0.5)">👤 ${esc(athlet)}</div>` : ''}

        ${(platzStr || medailleStr) ? `<div style="display:inline-flex;align-items:center;gap:12px;background:rgba(226,0,26,0.25);border:2px solid #E2001A;border-radius:40px;padding:10px 28px;margin-bottom:14px">
          <span style="color:#fff;font-size:1.5rem;font-weight:800">${platzStr}</span>
          ${medailleStr ? `<span style="font-size:1.3rem">${medailleStr}</span>` : ''}
        </div>` : ''}

        <div style="color:rgba(255,255,255,0.55);font-size:.95rem;margin-top:6px">
          ${fmt(e.datum)}${e.wettbewerbText ? ' · ' + esc(e.wettbewerbText) : ''}${e.ebene ? ' · ' + esc(e.ebene) : ''}
        </div>
      </div>

      <div style="position:absolute;bottom:20px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:12px;z-index:2">
        <button onclick="window._dsVorige()" style="background:rgba(255,255,255,0.12);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:1.1rem;cursor:pointer">◀</button>
        <span style="color:rgba(255,255,255,0.4);font-size:.8rem">${idx+1} / ${gefiltert.length}</span>
        <button onclick="window._dsNaechste()" style="background:rgba(255,255,255,0.12);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:1.1rem;cursor:pointer">▶</button>
        <button onclick="window._dsPause()" id="ds-pause-btn" style="background:rgba(255,255,255,0.12);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:1.1rem;cursor:pointer">⏸</button>
        <button onclick="document.getElementById('diashow-overlay').remove();clearInterval(window._dsTimer)" style="background:rgba(226,0,26,0.35);border:1px solid #E2001A;color:#fff;border-radius:20px;padding:7px 16px;font-size:.82rem;cursor:pointer">✕ Beenden</button>
      </div>

      <div style="position:absolute;bottom:0;left:0;height:3px;background:#E2001A;z-index:3" id="ds-progress"></div>
      <div style="position:absolute;top:16px;right:20px;color:rgba(255,255,255,0.3);font-size:.7rem;font-weight:700;letter-spacing:2px">#SLZBerlin</div>
    `;

    // Fortschrittsbalken
    const prog = document.getElementById('ds-progress');
    if (prog) {
      prog.style.width = '0%'; prog.style.transition = 'none';
      setTimeout(() => { prog.style.transition = `width ${intervall}ms linear`; prog.style.width = '100%'; }, 50);
    }

    // Nächste Bilder vorladen
    const nextIdx = (idx + 1) % gefiltert.length;
    const nextE = gefiltert[nextIdx];
    if (nextE && !bildCache[nextE.id] && nextE.bilder?.[0]?.signedUrl) {
      ladeBild(nextE.bilder[0].signedUrl).then(img => { if(img) bildCache[nextE.id] = img; }).catch(()=>{});
    }
  }

  window._dsNaechste = () => { aktuell=(aktuell+1)%gefiltert.length; renderFolie(aktuell); clearInterval(window._dsTimer); window._dsTimer=setInterval(window._dsNaechste,intervall); };
  window._dsVorige  = () => { aktuell=(aktuell-1+gefiltert.length)%gefiltert.length; renderFolie(aktuell); clearInterval(window._dsTimer); window._dsTimer=setInterval(window._dsNaechste,intervall); };
  window._dsPause   = () => { const btn=document.getElementById('ds-pause-btn'); if(window._dsTimer){clearInterval(window._dsTimer);window._dsTimer=null;if(btn)btn.textContent='▶';}else{window._dsTimer=setInterval(window._dsNaechste,intervall);if(btn)btn.textContent='⏸';} };

  overlay.addEventListener('keydown', ev => {
    if(ev.key==='ArrowRight'||ev.key===' ') window._dsNaechste();
    if(ev.key==='ArrowLeft') window._dsVorige();
    if(ev.key==='Escape'){overlay.remove();clearInterval(window._dsTimer);}
  });
  overlay.setAttribute('tabindex','0');
  document.body.appendChild(overlay);
  overlay.focus();
  renderFolie(0);
  window._dsTimer = setInterval(window._dsNaechste, intervall);
  try { overlay.requestFullscreen?.(); } catch(_) {}
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
  // Public URL (Bucket ist öffentlich)
  const { data: pubData } = Backend.client.storage
    .from('achievement-media').getPublicUrl(uploadData.path||pfad);
  return pubData?.publicUrl || null;
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
    // DataURL statt Blob-URL (kein Memory-Leak, dauerhaft gültig)
    const reader = new FileReader();
    reader.onload = ev => {
      img.src = ev.target.result;
      thumb.style.display = 'block';
    };
    reader.readAsDataURL(file);
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
  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  // Monat-Auswahl: letzten 12 Monate anbieten
  const monatOptionen = [];
  for (let i = 1; i <= 12; i++) {
    let m = jetzt.getMonth() - i;
    let j = jetzt.getFullYear();
    if (m < 0) { m += 12; j--; }
    monatOptionen.push({ monat: m, jahr: j, label: `${monatNamen[m]} ${j}` });
  }
  // Auch aktuellen Monat anbieten
  monatOptionen.unshift({ monat: jetzt.getMonth(), jahr: jetzt.getFullYear(), label: `${monatNamen[jetzt.getMonth()]} ${jetzt.getFullYear()} (aktuell)` });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';

  modal.innerHTML = `
    <div class="modal-header" style="background:linear-gradient(135deg,#1B1C1F,#2A2C31)">
      <div>
        <h3 style="color:#fff">🎠 Monats-Highlights-Karussell</h3>
        <div style="font-size:.75rem;color:rgba(255,255,255,.5)">„Das war der SLZB-Monat" – Instagram-Karussell</div>
      </div>
      <button class="btn btn-ghost btn-sm close-x" style="color:#fff">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      <!-- Monat-Auswahl -->
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;background:rgba(255,255,255,.05);padding:12px;border-radius:8px">
        <div style="flex:1;min-width:200px">
          <label style="color:#aaa;font-size:.78rem;font-weight:700;display:block;margin-bottom:4px">Monat auswählen</label>
          <select id="highlight-monat-select" style="width:100%;background:#2A2C31;color:#fff;border:1px solid #444;border-radius:6px;padding:8px 10px;font-size:.88rem">
            ${monatOptionen.map((o,i) => `<option value="${i}">${esc(o.label)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="color:#aaa;font-size:.78rem;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="highlight-mit-deckblatt" checked style="width:16px;height:16px">
            <span>Deckblatt „Das war unser Monat"</span>
          </label>
        </div>
        <button class="btn btn-primary btn-sm" onclick="highlightMonatLaden()" style="white-space:nowrap">
          🔄 Laden
        </button>
      </div>

      <div id="highlight-inhalt">
        <div style="text-align:center;color:#888;padding:40px">
          ← Monat auswählen und auf „Laden" klicken
        </div>
      </div>
    </div>
    <div class="modal-footer" style="background:#1B1C1F;border-top:1px solid #333">
      <button class="btn btn-ghost close-btn" style="color:#aaa">Schließen</button>
      <div id="highlight-download-btns" style="display:none;gap:8px;display:flex">
        <button class="btn btn-outline" onclick="highlightAlleHerunterladen()" style="color:#fff;border-color:#555">⬇️ Alle herunterladen</button>
        <button class="btn btn-primary" onclick="highlightKarteHerunterladen()">🖼️ Diese Karte</button>
      </div>
    </div>`;

  modal.querySelector('.close-x').onclick = ()=>overlay.remove();
  modal.querySelector('.close-btn').onclick = ()=>overlay.remove();
  overlay.appendChild(modal);

  // Monat-Optionen im window speichern
  window._highlightMonatOptionen = monatOptionen;
  window._highlightAlleErfolge = alle;

  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

async function highlightMonatLaden() {
  const select = document.getElementById('highlight-monat-select');
  const mitDeckblatt = document.getElementById('highlight-mit-deckblatt')?.checked;
  const idx = parseInt(select?.value || '0');
  const opt = (window._highlightMonatOptionen || [])[idx];
  if (!opt) return;

  const alle = window._highlightAlleErfolge || [];
  const highlights = alle.filter(e => {
    if (!['Freigegeben','Veröffentlicht'].includes(e.status)) return false;
    const d = e.datum ? new Date(e.datum) : null;
    if (!d) return false;
    return d.getMonth() === opt.monat && d.getFullYear() === opt.jahr;
  }).slice(0, 10);

  const monatLabel = `${['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][opt.monat]} ${opt.jahr}`;
  window._highlightMonat = monatLabel;
  window._highlightMitDeckblatt = mitDeckblatt;

  const inhalt = document.getElementById('highlight-inhalt');
  const dlBtns = document.getElementById('highlight-download-btns');

  if (!highlights.length) {
    if (inhalt) inhalt.innerHTML = `<div class="alert alert-warning" style="margin:0"><span class="alert-icon">⚠️</span><span>Keine freigegebenen Erfolge für <strong>${esc(monatLabel)}</strong> gefunden.</span></div>`;
    if (dlBtns) dlBtns.style.display = 'none';
    return;
  }

  // Karten-Nummern: mit oder ohne Deckblatt
  const offset = mitDeckblatt ? 1 : 0;
  const gesamtKarten = highlights.length + offset;

  window._highlightErfolge = highlights;
  window._highlightAktuell = 0;

  if (inhalt) {
    inhalt.innerHTML = `
      <div class="alert alert-info mb-3" style="background:rgba(0,51,102,.2);border-color:rgba(0,51,102,.3)">
        <span class="alert-icon">ℹ️</span>
        <span style="color:#aaa">${gesamtKarten} Karten${mitDeckblatt?' (inkl. Deckblatt)':''} für <strong style="color:#fff">${esc(monatLabel)}</strong></span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${mitDeckblatt ? `<button class="tab-btn active" onclick="highlightKarteZeigenMitDeckblatt(-1)">🎠 Deckblatt</button>` : ''}
        ${highlights.map((_,i)=>`<button class="tab-btn ${!mitDeckblatt&&i===0?'active':''}" onclick="highlightKarteZeigenMitDeckblatt(${i})">${i+1+offset}</button>`).join('')}
      </div>
      <div style="text-align:center">
        <canvas id="highlight-canvas" width="1080" height="1080"
          style="max-width:100%;max-height:52vh;display:block;margin:0 auto;border-radius:8px"></canvas>
        <p style="color:#888;font-size:.78rem;margin-top:8px" id="highlight-info">Karte wird geladen...</p>
      </div>`;
  }
  if (dlBtns) dlBtns.style.display = 'flex';

  // Erste Karte anzeigen
  setTimeout(() => highlightKarteZeigenMitDeckblatt(mitDeckblatt ? -1 : 0), 100);
}

async function highlightKarteZeigenMitDeckblatt(nr) {
  // nr = -1 → Deckblatt, nr >= 0 → Erfolg-Karte
  const erfolge = window._highlightErfolge || [];
  const monatLabel = window._highlightMonat || '';
  const mitDeckblatt = window._highlightMitDeckblatt;
  const offset = mitDeckblatt ? 1 : 0;
  const gesamt = erfolge.length + offset;

  window._highlightAktuell = nr;

  // Tab-Buttons aktualisieren
  document.querySelectorAll('.modal .tab-btn').forEach((b, i) => {
    const btnNr = mitDeckblatt ? i - 1 : i;
    b.classList.toggle('active', btnNr === nr);
  });

  const info = document.getElementById('highlight-info');

  if (nr === -1) {
    // Deckblatt
    if (info) info.textContent = `Deckblatt · ${monatLabel}`;
    await zeichneMonatsDeckblatt('highlight-canvas', monatLabel, erfolge.length);
  } else {
    const e = await DB.getErfolgById(erfolge[nr].id);
    if (info) info.textContent = `Karte ${nr+1+offset} von ${gesamt} · ${e.titel||''}`;
    await zeichneHighlightKarte('highlight-canvas', e, nr+1+offset, gesamt);
  }
}

  // Ausblenden-Buttons per JS hinzufügen (vermeidet Template-String-Escaping-Probleme)
  setTimeout(() => {
    modal.querySelectorAll('tbody tr').forEach((row, i) => {
      const t = wocheTermine[i];
      if (!t) return;
      const termId = (t._id || t.veranstaltung + t.datum).replace(/[^a-z0-9]/gi, '_');
      const istAusgeblendet = ausgeblendetIds.has(termId);
      const lastTd = row.querySelector('td:last-child');
      if (!lastTd) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.style.cssText = `font-size:.7rem;padding:2px 6px;margin-left:4px;color:${istAusgeblendet?'#E2001A':'#888'}`;
      btn.title = istAusgeblendet ? 'Wieder einblenden' : 'Aus Poster ausblenden';
      btn.textContent = istAusgeblendet ? '👁️' : '🚫';
      btn.dataset.termId = termId;
      btn.onclick = () => {
        const ids = new Set(JSON.parse(localStorage.getItem('slzb_wv_ausgeblendet') || '[]'));
        if (ids.has(termId)) {
          ids.delete(termId);
          btn.textContent = '🚫'; btn.style.color = '#888';
          btn.title = 'Aus Poster ausblenden';
          toast('Termin wieder eingeblendet', 'info');
        } else {
          ids.add(termId);
          btn.textContent = '👁️'; btn.style.color = '#E2001A';
          btn.title = 'Wieder einblenden';
          toast('Termin aus Poster ausgeblendet', 'info');
        }
        localStorage.setItem('slzb_wv_ausgeblendet', JSON.stringify([...ids]));
      };
      lastTd.appendChild(btn);
    });
  }, 50);

  overlay.addEventListener('click', ev=>{ if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

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

// ── Highlight-Karte zeichnen (1080×1080 Instagram-Post) ──────────────────────
async function zeichneHighlightKarte(canvasId, e, nr, gesamt) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Bild laden
  let bild = null;
  if (e.bilder?.length) {
    const b = e.bilder.find(b => b.signedUrl) || e.bilder[0];
    if (b?.signedUrl) {
      try {
        bild = await new Promise((res, rej) => {
          const img = new Image(); img.crossOrigin = 'anonymous';
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = b.signedUrl;
        });
      } catch(e) { bild = null; }
    }
  }

  // Hintergrund
  ctx.fillStyle = '#1B1C1F';
  ctx.fillRect(0, 0, W, H);

  if (bild) {
    // Bild als Hintergrund mit Abdunkelung
    ctx.save();
    ctx.globalAlpha = 0.55;
    const scale = Math.max(W/bild.width, H/bild.height);
    const bw = bild.width * scale, bh = bild.height * scale;
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    ctx.drawImage(bild, bx, by, bw, bh);
    ctx.restore();
  } else {
    // Silhouette-Fallback
    const sportart = e.sportartText || e.sport_id || '';
    if (typeof zeichneSportartSilhouette === 'function') {
      zeichneSportartSilhouette(ctx, sportart, W/2, H*0.38, Math.min(W,H)*0.28, 'rgba(255,255,255,0.08)');
    }
  }

  // Roter Gradient unten
  const grad = ctx.createLinearGradient(0, H*0.45, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.4, 'rgba(180,0,20,0.55)');
  grad.addColorStop(1, 'rgba(226,0,26,0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Header: Logo + SLZB
  if (typeof zeichneSlzbHeader === 'function') {
    zeichneSlzbHeader(ctx, W, H, '', '');
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 90);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Montserrat, Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SLZB Berlin', 20, 55);
  }

  // Karussell-Nummer weggelassen – Instagram zeigt sie automatisch oben rechts an
  const monat = window._highlightMonat || '';

  // Sportart-Badge
  const sportartText = e.sportartText || '';
  if (sportartText) {
    ctx.fillStyle = '#E2001A';
    const badgeW = ctx.measureText(sportartText.toUpperCase()).width + 32;
    const badgeX = (W - badgeW) / 2;
    const badgeY = H * 0.52;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Montserrat, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sportartText.toUpperCase(), W/2, badgeY + 21);
  }

  // Platzierung / Medaille
  const platz = e.platzierung;
  const medaille = e.medaille && e.medaille !== 'keine' ? e.medaille : null;
  if (platz || medaille) {
    const medFarben = { Gold: '#C9A227', Silber: '#BFC8D2', Bronze: '#C2783A' };
    const farbe = medaille ? (medFarben[medaille] || '#E2001A') : '#fff';
    const platzText = medaille ? `🥇 ${medaille}` : `${platz}. Platz`;
    ctx.fillStyle = farbe;
    ctx.font = 'bold italic 52px Montserrat, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(platzText.replace('🥇','').replace('🥈','').replace('🥉','').trim(), W/2, H * 0.67);
    if (medaille) {
      const emojis = { Gold: '🥇', Silber: '🥈', Bronze: '🥉' };
      ctx.font = '44px Arial';
      ctx.fillText(emojis[medaille] || '', W/2 - ctx.measureText(platzText.replace('🥇','').replace('🥈','').replace('🥉','').trim()).width/2 - 30, H * 0.67);
    }
  }

  // Titel (mehrzeilig)
  const titel = e.titel || e.athletenName || '';
  if (titel) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 34px Montserrat, Arial';
    ctx.textAlign = 'center';
    // Zeilenumbruch bei langen Titeln
    const maxW = W * 0.85;
    const words = titel.split(' ');
    let lines = [], line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line); line = w;
      } else { line = test; }
    }
    if (line) lines.push(line);
    lines = lines.slice(0, 3);
    const lineH = 42;
    const startY = H * 0.74 - (lines.length - 1) * lineH / 2;
    lines.forEach((l, i) => ctx.fillText(l, W/2, startY + i * lineH));
  }

  // Athletenname
  const athlet = e.athletenName || '';
  if (athlet) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '22px Montserrat, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(athlet, W/2, H * 0.87);
  }

  // Footer
  if (typeof zeichneSlzbFooterNeu === 'function') {
    zeichneSlzbFooterNeu(ctx, W, H);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H - 70, W, 70);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Montserrat, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, H - 38);
    ctx.fillStyle = '#E2001A';
    ctx.font = 'bold italic 22px Montserrat, Arial';
    ctx.fillText('#SLZBerlin', W/2, H - 14);
  }
}

// ── Deckblatt für Monats-Karussell ───────────────────────────────────────────
async function zeichneMonatsDeckblatt(canvasId, monatLabel, anzahl) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Hintergrund
  ctx.fillStyle = '#1B1C1F';
  ctx.fillRect(0, 0, W, H);

  // Roter Gradient
  const grad = ctx.createLinearGradient(0, H*0.3, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(226,0,26,0.9)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Header
  if (typeof zeichneSlzbHeader === 'function') {
    zeichneSlzbHeader(ctx, W, H, '', '');
  }

  // Haupttext: "DAS WAR"
  ctx.fillStyle = '#fff';
  ctx.font = 'bold italic 72px Montserrat, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('DAS WAR', W/2, H * 0.42);

  // "UNSER MONAT"
  ctx.fillStyle = '#E2001A';
  ctx.font = 'bold italic 72px Montserrat, Arial';
  ctx.fillText('UNSER MONAT', W/2, H * 0.52);

  // Monat-Name
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px Montserrat, Arial';
  ctx.fillText(monatLabel.toUpperCase(), W/2, H * 0.64);

  // Anzahl Erfolge
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '24px Montserrat, Arial';
  ctx.fillText(`${anzahl} sportliche Erfolge`, W/2, H * 0.73);

  // Swipe-Hinweis
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '18px Montserrat, Arial';
  ctx.fillText('→ Wische für alle Highlights', W/2, H * 0.82);

  // Footer
  if (typeof zeichneSlzbFooterNeu === 'function') {
    zeichneSlzbFooterNeu(ctx, W, H);
  }
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
  schutzeModalVorAussenklick(overlay, modal);
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
function nwBildVorschau(id, input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('nw-bild-preview-'+id);
    const img = document.getElementById('nw-bild-img-'+id);
    if (preview && img) { img.src = e.target.result; preview.style.display = 'block'; }
  };
  reader.readAsDataURL(file);
}

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
        <label style=\"color:#aaa;font-size:.75rem\">Foto hochladen (optional)</label>
        <input type=\"file\" id=\"nw-bild-${id}\" accept=\"image/jpeg,image/png,image/webp\" onchange=\"nwBildVorschau(${id},this)\" style=\"width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:6px;font-size:.8rem\"><div id=\"nw-bild-preview-${id}\" style=\"margin-top:4px;display:none\"><img id=\"nw-bild-img-${id}\" style=\"max-height:60px;border-radius:6px;object-fit:cover\"></div>
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
    const kandidatenRaw = [];
    document.querySelectorAll('.nw-kandidat').forEach((div)=>{
      const id = div.querySelector('[id^="nw-name-"]')?.id?.replace('nw-name-','');
      if (!id) return;
      const erfolgeRaw = document.getElementById(`nw-erfolge-${id}`)?.value||'';
      const bildInput = document.getElementById(`nw-bild-${id}`);
      kandidatenRaw.push({
        name: document.getElementById(`nw-name-${id}`)?.value||'',
        sportart: document.getElementById(`nw-sport-${id}`)?.value||'',
        bildInput,
        erfolge: erfolgeRaw.split('\n').map(s=>s.trim()).filter(Boolean),
      });
    });
    // Bilder als DataURLs laden (dauerhaft gültig, kein Revoke-Problem)
    const kandidatenMitBild = await Promise.all(kandidatenRaw.map(async k => {
      let bild = null;
      if (k.bildInput?.files?.[0]) {
        // Neues Bild: als DataURL laden
        bild = await new Promise(res => {
          const reader = new FileReader();
          reader.onload = ev => res(ev.target.result);
          reader.onerror = () => res(null);
          reader.readAsDataURL(k.bildInput.files[0]);
        });
      } else if (k.bildInput?.dataset?.vorhandeneUrl) {
        // Vorhandene URL aus Supabase direkt verwenden
        bild = k.bildInput.dataset.vorhandeneUrl;
      }
      return { ...k, bild };
    }));
    const titel = modus==='jahr' ? `Nachwuchssportler/in des Jahres ${monat}` : null;
    await zeichneNachwuchswahlPoster('nw-canvas', {monat, kandidaten: kandidatenMitBild, abstimmungslink: link, titelOverride: titel});
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
          <input type="text" id="cd-ort" placeholder="z.B. Schwimmhalle Landsberger Allee" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px"
            oninput="const f=document.getElementById('cd-flagge-override');const p=document.getElementById('cd-flagge-preview');const l=document.getElementById('cd-land')?.value||'';if(!f?.value)p.textContent=ortZuFlagge(l||this.value)||'🌍'">
        </div>
        <div class="form-group">
          <label style="color:#fff">Sportart (optional)</label>
          <input type="text" id="cd-sportart" placeholder="z.B. Schwimmen" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
        </div>
        <div class="form-group">
          <label style="color:#fff">Link zur Veranstaltung / Livestream <span style="font-size:.72rem;color:#888">(optional)</span></label>
          <input type="url" id="cd-link" placeholder="https://..." style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px">
          <div style="font-size:.72rem;color:#888;margin-top:3px">Erscheint als QR-Code oder Kurzlink auf dem Poster</div>
        </div>
        <div class="form-group">
          <label style="color:#fff">Land <span style="font-size:.72rem;color:#888">(für Flagge, optional)</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" id="cd-land" placeholder="z.B. Kanada, Österreich..."
              style="flex:1;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px"
              oninput="const v=this.value||document.getElementById('cd-ort')?.value||'';const f=ortZuFlagge(v)||'🌍';document.getElementById('cd-flagge-preview').textContent=document.getElementById('cd-flagge-override')?.value||f">
            <span id="cd-flagge-preview" style="font-size:2rem;min-width:44px;text-align:center">🌍</span>
            <input type="text" id="cd-flagge-override" placeholder="✏️ Eigene" maxlength="4"
              style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:6px 8px;width:72px;font-size:1.2rem;text-align:center"
              oninput="document.getElementById('cd-flagge-preview').textContent=this.value||(ortZuFlagge(document.getElementById('cd-land')?.value||document.getElementById('cd-ort')?.value||'')||'🌍')">
          </div>
          <div style="font-size:.7rem;color:#666;margin-top:3px">Wird automatisch aus Ort/Land erkannt · Emoji direkt eingeben zum Überschreiben</div>
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
  schutzeModalVorAussenklick(overlay, modal);
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

async 
// ── Flagge als HTML-Overlay über Canvas (CORS-sicher, draggable) ──────────────
// Wird nach dem Canvas-Rendering aufgerufen
// canvasId: ID des Canvas-Elements
// flagge: Flaggen-Emoji (z.B. '🇦🇹')
// land: ISO-Code oder Land-Name
// opts: { x, y, w, removable, draggable }
function slzbZeigeFlaggeAlsOverlay(canvasId, flagge, land, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !flagge || flagge === '🌍') return;

  // Bestehende Flagge entfernen
  const existingFlag = document.getElementById(canvasId + '-flagge');
  if (existingFlag) existingFlag.remove();

  const isoCode = typeof flagEmojiZuIso === 'function' ? flagEmojiZuIso(flagge) : null;
  if (!isoCode) return;

  // Canvas-Position und -Größe
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;

  // Standard-Position: oben links
  const defaultX = opts.x !== undefined ? opts.x : (canvas.width * 0.025);
  const defaultY = opts.y !== undefined ? opts.y : (canvas.height * 0.24);
  const flagW = opts.w || (canvas.width * 0.09);
  const flagH = flagW * 0.67;

  // HTML-Overlay erstellen
  const wrapper = document.createElement('div');
  wrapper.id = canvasId + '-flagge';
  wrapper.style.cssText = `
    position: absolute;
    left: ${defaultX * scaleX}px;
    top: ${defaultY * scaleY}px;
    width: ${flagW * scaleX}px;
    height: ${flagH * scaleY}px;
    z-index: 10;
    cursor: ${opts.draggable !== false ? 'grab' : 'default'};
    user-select: none;
    border-radius: 3px;
    overflow: hidden;
    box-shadow: 2px 2px 8px rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.25);
    transition: box-shadow .15s;
  `;

  // Flaggen-Bild
  const img = document.createElement('img');
  img.src = `https://flagcdn.com/w${Math.round(flagW * scaleX * 2)}/${isoCode}.png`;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;pointer-events:none';
  img.onerror = () => {
    // Fallback: Emoji-Text
    wrapper.innerHTML = '';
    wrapper.style.background = 'rgba(0,0,0,0.5)';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.fontSize = `${flagW * scaleX * 0.6}px`;
    wrapper.textContent = flagge;
  };
  wrapper.appendChild(img);

  // Entfernen-Button (erscheint bei Hover)
  if (opts.removable !== false) {
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.title = 'Flagge entfernen';
    removeBtn.style.cssText = `
      position: absolute; top: -8px; right: -8px;
      width: 20px; height: 20px;
      background: #E2001A; color: #fff; border: none;
      border-radius: 50%; font-size: 10px; font-weight: 700;
      cursor: pointer; display: none; align-items: center;
      justify-content: center; z-index: 20; line-height: 1;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      wrapper.remove();
      // Merke dass Flagge entfernt wurde
      window[canvasId + '_flaggeEntfernt'] = true;
    };
    wrapper.addEventListener('mouseenter', () => { removeBtn.style.display = 'flex'; });
    wrapper.addEventListener('mouseleave', () => { removeBtn.style.display = 'none'; });
    wrapper.appendChild(removeBtn);
  }

  // Drag-and-Drop
  if (opts.draggable !== false) {
    let isDragging = false, startX, startY, startLeft, startTop;

    wrapper.addEventListener('mousedown', (e) => {
      if (e.target === wrapper.querySelector('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(wrapper.style.left) || 0;
      startTop = parseInt(wrapper.style.top) || 0;
      wrapper.style.cursor = 'grabbing';
      wrapper.style.boxShadow = '4px 4px 16px rgba(0,0,0,0.6)';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      wrapper.style.left = (startLeft + dx) + 'px';
      wrapper.style.top = (startTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        wrapper.style.cursor = 'grab';
        wrapper.style.boxShadow = '2px 2px 8px rgba(0,0,0,0.4)';
      }
    });

    // Touch-Support
    wrapper.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      isDragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      startLeft = parseInt(wrapper.style.left) || 0;
      startTop = parseInt(wrapper.style.top) || 0;
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      wrapper.style.left = (startLeft + touch.clientX - startX) + 'px';
      wrapper.style.top = (startTop + touch.clientY - startY) + 'px';
    });

    document.addEventListener('touchend', () => { isDragging = false; });
  }

  // Canvas-Container muss position:relative haben
  const container = canvas.parentElement;
  if (container) {
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(wrapper);
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
  const cdLink = document.getElementById('cd-link')?.value?.trim() || '';
  const cdLand = document.getElementById('cd-land')?.value?.trim() || '';
  const cdFlaggeOverride = document.getElementById('cd-flagge-override')?.value?.trim() || '';
  const cdFlagge = cdFlaggeOverride || (typeof ortZuFlagge === 'function' ? ortZuFlagge(cdLand || ort) : null);
  const opts = { eventName:name, eventDatum:datum, ort, land:cdLand, sportart:sportartCd, format: format==='a3'?'hochformat':format, hintergrundbild:bildUrl, link: cdLink, flagge: cdFlagge };
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
  schutzeModalVorAussenklick(overlay, modal);
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

// ── Foto-Karussell ────────────────────────────────────────────
function zeigeFotoKarussellModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.style.maxWidth = '700px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>📸 Foto-Karussell erstellen</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      <div class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="color:#fff">Titel <span class="required">*</span></label>
          <input type="text" id="fk-titel" placeholder="z.B. Frühstück der Champions 2026"
            style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;width:100%">
        </div>
        <div class="form-group">
          <label style="color:#fff">Untertitel / Kategorie</label>
          <input type="text" id="fk-untertitel" placeholder="z.B. SLZB Berlin · November 2026"
            style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;width:100%">
        </div>
        <div class="form-group">
          <label style="color:#fff">Datum</label>
          <input type="date" id="fk-datum"
            style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;width:100%">
        </div>
        <div class="form-group">
          <label style="color:#fff">Akzentfarbe</label>
          <select id="fk-akzent" style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;width:100%">
            <option value="grau">⚪ Grau (Schulnachrichten)</option>
            <option value="rot">🔴 Rot (Sporterfolge)</option>
            <option value="blau">🔵 Blau (Personen/Events)</option>
            <option value="gruen">🟢 Grün (Events/Termine)</option>
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label style="color:#fff">Deckblatt-Hintergrundbild (optional)</label>
          <input type="file" id="fk-deckbild" accept="image/jpeg,image/png,image/webp"
            style="width:100%;font-size:.85rem" onchange="fkDeckbildVorschau(this)">
          <img id="fk-deckbild-preview" src="" alt="Vorschau"
            style="display:none;max-height:80px;max-width:100%;margin-top:6px;border-radius:6px;object-fit:cover">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label style="color:#fff">📸 Fotos hochladen (mehrere möglich)</label>
          <input type="file" id="fk-fotos" accept="image/jpeg,image/png,image/webp"
            multiple style="width:100%;font-size:.85rem" onchange="fkFotosVorschau(this)">
          <div id="fk-fotos-preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
          <div class="form-hint">Jedes Foto wird eine eigene Karussell-Folie. Reihenfolge = Upload-Reihenfolge.</div>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label style="color:#fff">Bildunterschrift (gilt für alle Fotos, optional)</label>
          <input type="text" id="fk-caption" placeholder="z.B. Frühstück der Champions · SLZB Berlin"
            style="background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;width:100%">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost close-btn">Abbrechen</button>
      <button class="btn btn-primary" onclick="erstelleFotoKarussell()">📸 Karussell erstellen & herunterladen</button>
    </div>`;

  modal.querySelector('.close-x').onclick = () => overlay.remove();
  modal.querySelector('.close-btn').onclick = () => overlay.remove();
  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  // Heutiges Datum vorausfüllen
  const heute = new Date().toISOString().slice(0,10);
  document.getElementById('fk-datum').value = heute;
}

function fkDeckbildVorschau(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('fk-deckbild-preview');
    if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
    window._fkDeckbildDataUrl = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function fkFotosVorschau(input) {
  const files = [...(input?.files || [])];
  const container = document.getElementById('fk-fotos-preview');
  if (!container) return;
  container.innerHTML = '';
  window._fkFotoDataUrls = [];

  files.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = ev => {
      window._fkFotoDataUrls[i] = ev.target.result;
      // Vorschau-Thumbnail
      const img = document.createElement('img');
      img.src = ev.target.result;
      img.style.cssText = 'height:60px;width:60px;object-fit:cover;border-radius:4px;border:2px solid #444';
      img.title = file.name;
      container.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

async function erstelleFotoKarussell() {
  const titel      = document.getElementById('fk-titel')?.value.trim();
  const untertitel = document.getElementById('fk-untertitel')?.value.trim() || '';
  const datum      = document.getElementById('fk-datum')?.value || '';
  const akzent     = document.getElementById('fk-akzent')?.value || 'grau';
  const caption    = document.getElementById('fk-caption')?.value.trim() || '';

  if (!titel) { toast('Bitte Titel eingeben', 'warning'); return; }

  const fotoUrls = window._fkFotoDataUrls?.filter(Boolean) || [];
  if (!fotoUrls.length) { toast('Bitte mindestens ein Foto hochladen', 'warning'); return; }

  document.querySelector('.modal-overlay')?.remove();

  // Deckbild laden
  let deckbild = null;
  if (window._fkDeckbildDataUrl) {
    deckbild = await new Promise(res => {
      const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null);
      img.src = window._fkDeckbildDataUrl;
    });
  }

  // Fotos laden
  const fotoImgs = await Promise.all(fotoUrls.map(url => new Promise(res => {
    const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null);
    img.src = url;
  })));

  // Datum formatieren
  const datumText = datum ? new Date(datum + 'T12:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric'
  }) : '';

  // Optionen speichern
  window._fkOpts = { titel, untertitel, datum: datumText, akzent, caption };
  window._fkDeckbild = deckbild;
  window._fkFotoImgs = fotoImgs;
  window._fkBildSettings = fotoImgs.map(() => ({ x: 0.5, y: 0.5, zoom: 1.0 }));
  // Deckbild-Settings separat
  window._fkDeckbildSettings = { x: 0.5, y: 0.5, zoom: 1.0 };
  // Individuelle Captions pro Foto (leer = Standard-Caption)
  window._fkCaptions = fotoImgs.map(() => '');

  // Vorschau-Modal öffnen (0 = Deckblatt, 1..n = Fotos)
  await zeigeFotoKarussellVorschau();
}

async function zeigeFotoKarussellVorschau() {
  const opts    = window._fkOpts;
  const fotos   = window._fkFotoImgs;
  const gesamt  = fotos.length + 1;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.style.maxWidth = '900px';

  // Tab-Labels: Deckblatt + Foto 1..n
  const tabs = ['Deckblatt', ...fotos.map((_,i) => `Foto ${i+1}`)];

  modal.innerHTML = `
    <div class="modal-header">
      <h3>📸 Vorschau & Bildausschnitt</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove();zeigeFotoKarussellModal()">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      <div id="fkv-tabs" class="tabs mb-3" style="flex-wrap:wrap;gap:4px;display:flex">
        ${tabs.map((t,i) => `<button class="tab-btn ${i===0?'active':''}" onclick="fkvWechsle(${i})">${t}</button>`).join('')}
      </div>
      <div style="text-align:center;margin-bottom:12px">
        <canvas id="fkv-canvas" width="540" height="675"
          style="max-width:100%;max-height:55vh;display:block;margin:0 auto;border-radius:8px;background:#000"></canvas>
      </div>
      <div id="fkv-editor" style="background:rgba(255,255,255,.06);border-radius:8px;padding:12px">
        <div style="font-size:.78rem;color:#888;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Bildausschnitt</div>
        <div style="margin-bottom:10px">
          <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:4px;font-size:.82rem">
            <span>🔍 Zoom</span><span id="fkv-zoom-lbl" style="color:#E2001A">100%</span>
          </label>
          <input type="range" id="fkv-zoom" min="30" max="300" step="5" value="100"
            style="width:100%;accent-color:#E2001A" oninput="fkvAktualisiere()">
        </div>
        <div style="margin-bottom:10px">
          <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:4px;font-size:.82rem">
            <span>↔ Horizontal</span><span id="fkv-ox-lbl" style="color:#888">50%</span>
          </label>
          <input type="range" id="fkv-ox" min="0" max="100" value="50"
            style="width:100%;accent-color:#003366" oninput="fkvAktualisiere()">
        </div>
        <div style="margin-bottom:10px">
          <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:4px;font-size:.82rem">
            <span>↕ Vertikal</span><span id="fkv-oy-lbl" style="color:#888">50%</span>
          </label>
          <input type="range" id="fkv-oy" min="0" max="100" value="50"
            style="width:100%;accent-color:#003366" oninput="fkvAktualisiere()">
        </div>
        <div class="flex gap-2" style="flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="fkvEinpassen()">⊡ Einpassen</button>
          <button class="btn btn-ghost btn-sm" onclick="fkvPreset(50,20,100)">↑ Gesicht oben</button>
          <button class="btn btn-ghost btn-sm" onclick="fkvPreset(50,50,100)">⊙ Zentrieren</button>
          <button class="btn btn-ghost btn-sm" onclick="fkvPreset(50,30,150)">🔍 Zoom Gesicht</button>
        </div>
        <div id="fkv-caption-wrap" style="margin-top:12px;display:none">
          <label style="font-weight:600;font-size:.82rem;color:#ccc;display:block;margin-bottom:4px">
            💬 Bildunterschrift für dieses Foto
          </label>
          <input type="text" id="fkv-caption-einzeln"
            placeholder="z.B. Ehrengäste beim Frühstück der Champions"
            maxlength="80"
            style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:7px 10px;font-size:.85rem"
            oninput="fkvCaptionSpeichern();fkvCaptionZaehler(this)">
          <div style="display:flex;justify-content:space-between;margin-top:3px">
            <span style="font-size:.72rem;color:#666">Leer lassen = Standard-Bildunterschrift verwenden</span>
            <span id="fkv-caption-zaehler" style="font-size:.72rem;color:#666">0/80</span>
          </div>
          <div id="fkv-caption-hinweis" style="font-size:.72rem;margin-top:2px;display:none"></div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove();zeigeFotoKarussellModal()">← Zurück</button>
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="fkvStarteDownload()">📥 Alle herunterladen</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  window._fkvAktuellerIdx = 0;

  // Globale Editor-Funktionen
  window.fkvWechsle = async (idx) => {
    // Aktuelle Settings + Caption speichern
    fkvSpeichereSettings(window._fkvAktuellerIdx);
    fkvCaptionSpeichern();
    window._fkvAktuellerIdx = idx;
    // Tabs aktualisieren
    document.querySelectorAll('#fkv-tabs .tab-btn').forEach((b,i) => b.classList.toggle('active', i===idx));
    // Regler auf gespeicherte Werte setzen
    fkvLadeSettings(idx);
    // Caption-Feld: nur bei Fotos (nicht Deckblatt)
    const captionWrap = document.getElementById('fkv-caption-wrap');
    const captionInput = document.getElementById('fkv-caption-einzeln');
    if (captionWrap) captionWrap.style.display = idx === 0 ? 'none' : 'block';
    if (captionInput && idx > 0) {
      captionInput.value = window._fkCaptions?.[idx-1] || '';
      captionInput.placeholder = window._fkOpts?.caption
        ? `Standard: "${window._fkOpts.caption}"`
        : 'z.B. Ehrengäste beim Frühstück der Champions';
    }
    await fkvRenderVorschau(idx);
  };

  window.fkvCaptionSpeichern = () => {
    const idx = window._fkvAktuellerIdx;
    if (idx === 0) return;
    const val = document.getElementById('fkv-caption-einzeln')?.value || '';
    if (!window._fkCaptions) window._fkCaptions = [];
    window._fkCaptions[idx-1] = val;
  };

  window.fkvCaptionZaehler = (input) => {
    const len = input.value.length;
    const zaehler = document.getElementById('fkv-caption-zaehler');
    const hinweis = document.getElementById('fkv-caption-hinweis');
    if (!zaehler) return;
    zaehler.textContent = `${len}/80`;
    // Farbliche Warnung
    if (len > 70) {
      zaehler.style.color = '#E2001A';
      if (hinweis) {
        hinweis.style.display = 'block';
        hinweis.style.color = '#E2001A';
        hinweis.textContent = len > 50
          ? '⚠️ Langer Text wird auf 2 Zeilen umgebrochen – Lesbarkeit prüfen'
          : '';
      }
    } else if (len > 50) {
      zaehler.style.color = '#C9A227';
      if (hinweis) {
        hinweis.style.display = 'block';
        hinweis.style.color = '#C9A227';
        hinweis.textContent = '💡 Text wird auf 2 Zeilen umgebrochen';
      }
    } else {
      zaehler.style.color = '#4caf50';
      if (hinweis) hinweis.style.display = 'none';
    }
  };

  window.fkvAktualisiere = async () => {
    const x    = parseInt(document.getElementById('fkv-ox')?.value||50)/100;
    const y    = parseInt(document.getElementById('fkv-oy')?.value||50)/100;
    const zoom = parseInt(document.getElementById('fkv-zoom')?.value||100)/100;
    document.getElementById('fkv-zoom-lbl').textContent = Math.round(zoom*100)+'%';
    document.getElementById('fkv-ox-lbl').textContent   = Math.round(x*100)+'%';
    document.getElementById('fkv-oy-lbl').textContent   = Math.round(y*100)+'%';
    fkvSpeichereSettings(window._fkvAktuellerIdx);
    await fkvRenderVorschau(window._fkvAktuellerIdx);
  };

  window.fkvPreset = async (ox, oy, zoom) => {
    document.getElementById('fkv-ox').value   = ox;
    document.getElementById('fkv-oy').value   = oy;
    document.getElementById('fkv-zoom').value = zoom;
    await fkvAktualisiere();
  };

  window.fkvEinpassen = async () => {
    // Berechne optimalen Zoom damit das Bild vollständig sichtbar ist
    const idx  = window._fkvAktuellerIdx;
    const bild = idx === 0 ? window._fkDeckbild : window._fkFotoImgs?.[idx-1];
    if (!bild) return;
    const canvas = document.getElementById('fkv-canvas');
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const bildRatio   = bild.width / bild.height;
    const canvasRatio = W / H;
    let fitZoom;
    if (bildRatio > canvasRatio) {
      // Querformat: Breite passt, Höhe wird abgeschnitten → rauszoomen
      fitZoom = Math.round(canvasRatio / bildRatio * 100);
    } else {
      // Hochformat: passt bereits bei 100%
      fitZoom = 100;
    }
    fitZoom = Math.max(30, Math.min(300, fitZoom));
    document.getElementById('fkv-ox').value   = 50;
    document.getElementById('fkv-oy').value   = 50;
    document.getElementById('fkv-zoom').value = fitZoom;
    await fkvAktualisiere();
  };

  window.fkvStarteDownload = async () => {
    fkvSpeichereSettings(window._fkvAktuellerIdx);
    await fkvDownloadAlle();
  };

  // Caption-Feld initial ausblenden (Deckblatt hat keine Caption)
  const captionWrapInit = document.getElementById('fkv-caption-wrap');
  if (captionWrapInit) captionWrapInit.style.display = 'none';

  await fkvRenderVorschau(0);
}

function fkvSpeichereSettings(idx) {
  const x    = parseInt(document.getElementById('fkv-ox')?.value||50)/100;
  const y    = parseInt(document.getElementById('fkv-oy')?.value||50)/100;
  const zoom = parseInt(document.getElementById('fkv-zoom')?.value||100)/100;
  if (idx === 0) {
    window._fkDeckbildSettings = { x, y, zoom };
  } else {
    window._fkBildSettings[idx-1] = { x, y, zoom };
  }
}

function fkvLadeSettings(idx) {
  const s = idx === 0
    ? (window._fkDeckbildSettings || { x:0.5, y:0.5, zoom:1.0 })
    : (window._fkBildSettings?.[idx-1] || { x:0.5, y:0.5, zoom:1.0 });
  document.getElementById('fkv-ox').value   = Math.round(s.x*100);
  document.getElementById('fkv-oy').value   = Math.round(s.y*100);
  document.getElementById('fkv-zoom').value = Math.round(s.zoom*100);
  document.getElementById('fkv-zoom-lbl').textContent = Math.round(s.zoom*100)+'%';
  document.getElementById('fkv-ox-lbl').textContent   = Math.round(s.x*100)+'%';
  document.getElementById('fkv-oy-lbl').textContent   = Math.round(s.y*100)+'%';
}

async function fkvRenderVorschau(idx) {
  const canvas = document.getElementById('fkv-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const opts   = window._fkOpts;
  const fotos  = window._fkFotoImgs;
  const gesamt = fotos.length + 1;

  const s = idx === 0
    ? (window._fkDeckbildSettings || { x:0.5, y:0.5, zoom:1.0 })
    : (window._fkBildSettings?.[idx-1] || { x:0.5, y:0.5, zoom:1.0 });

  // Automatisch "Fit"-Zoom berechnen wenn Bild Querformat ist
  // und noch kein manueller Zoom gesetzt wurde
  const bild = idx === 0 ? window._fkDeckbild : fotos[idx-1];
  let zoom = s.zoom;
  if (bild && zoom === 1.0) {
    const bildRatio = bild.width / bild.height;
    const canvasRatio = W / H; // 1080/1350 = 0.8
    if (bildRatio > canvasRatio) {
      // Querformat: Zoom so setzen dass Bild vollständig sichtbar ist
      zoom = canvasRatio / bildRatio;
      // Settings aktualisieren
      if (idx === 0) {
        window._fkDeckbildSettings = { ...s, zoom };
      } else {
        window._fkBildSettings[idx-1] = { ...s, zoom };
      }
      // Regler aktualisieren
      const zoomEl = document.getElementById('fkv-zoom');
      const zoomLbl = document.getElementById('fkv-zoom-lbl');
      if (zoomEl) zoomEl.value = Math.round(zoom*100);
      if (zoomLbl) zoomLbl.textContent = Math.round(zoom*100)+'%';
    }
  }

  window._bildOffset = { x: s.x, y: s.y };
  window._bildZoom   = zoom;

  if (idx === 0) {
    await zeichneFotoKarussellDeckblatt(ctx, W, H, {
      ...opts, bild: window._fkDeckbild, gesamt
    });
  } else {
    const vorschauCaption = window._fkCaptions?.[idx-1] || opts.caption || '';
    await zeichneFotoKarussellFolie(ctx, W, H, {
      bild: fotos[idx-1], akzent: opts.akzent, caption: vorschauCaption,
      nr: idx+1, gesamt
    });
  }
}

async function fkvDownloadAlle() {
  const opts   = window._fkOpts;
  const fotos  = window._fkFotoImgs;
  const gesamt = fotos.length + 1;

  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  toast('⏳ Karussell wird erstellt...', 'info');

  // Deckblatt
  const ds = window._fkDeckbildSettings || { x:0.5, y:0.5, zoom:1.0 };
  window._bildOffset = { x: ds.x, y: ds.y };
  window._bildZoom   = ds.zoom;
  await zeichneFotoKarussellDeckblatt(ctx, W, H, {
    ...opts, bild: window._fkDeckbild, gesamt
  });
  await fkvDownloadCanvas(canvas, '01_Deckblatt.png');

  // Foto-Folien
  for (let i = 0; i < fotos.length; i++) {
    ctx.clearRect(0,0,W,H);
    const s = window._fkBildSettings?.[i] || { x:0.5, y:0.5, zoom:1.0 };
    window._bildOffset = { x: s.x, y: s.y };
    window._bildZoom   = s.zoom;
    // Individuelle Caption oder Standard-Caption
    const fotoCaption = window._fkCaptions?.[i] || opts.caption || '';
    await zeichneFotoKarussellFolie(ctx, W, H, {
      bild: fotos[i], akzent: opts.akzent, caption: fotoCaption,
      nr: i+2, gesamt
    });
    const nr = String(i+2).padStart(2,'0');
    await fkvDownloadCanvas(canvas, `${nr}_Foto_${i+1}.png`);
    await new Promise(r => setTimeout(r, 200));
  }

  window._bildOffset = { x:0.5, y:0.5 }; window._bildZoom = 1.0;
  toast(`✅ ${gesamt} Folien heruntergeladen!`, 'success');
}

async function fkvDownloadCanvas(canvas, dateiname) {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = dateiname;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); resolve(); }, 300);
    }, 'image/png');
  });
}

async function canvasToDataUrl(canvas) {
  return new Promise(res => canvas.toBlob(blob => {
    const reader = new FileReader();
    reader.onload = ev => res(ev.target.result);
    reader.readAsDataURL(blob);
  }, 'image/png'));
}

async function downloadAlsZip(dateien, zipName) {
  for (const datei of dateien) {
    await new Promise(res => setTimeout(res, 300));
    const a = document.createElement('a');
    a.href = datei.url; a.download = datei.name;
    document.body.appendChild(a); a.click(); a.remove();
  }
}

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

    <div class="card mb-3">
      <div class="card-header"><h2>📸 Foto-Karussell</h2></div>
      <div class="card-body">
        <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
          <span>Deckblatt + mehrere Fotos als Instagram-Karussell. Ideal für Events wie Frühstück der Champions, Schulveranstaltungen, Ausflüge.</span>
        </div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <p class="text-sm text-muted">Deckblatt mit Titel und Datum, dann jedes Foto einzeln mit Header und Footer im SLZB-Stil. Download als ZIP.</p>
          </div>
          <button class="btn btn-primary" onclick="zeigeFotoKarussellModal()" style="white-space:nowrap;background:#8A9BB0;border-color:#8A9BB0">
            📸 Karussell erstellen
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
  schutzeModalVorAussenklick(overlay, modal);
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
// ══════════════════════════════════════════════════════════════
// KALENDER-VERWALTUNG
// ══════════════════════════════════════════════════════════════

// Benutzerdefinierte Kalender-Einträge aus Supabase laden
async function ladeKalenderEintraege() {
  try {
    const { data, error } = await Backend.client
      .from('kalender_eintraege')
      .select('*')
      .order('datum');
    if (error) { console.warn('Kalender laden:', error.message); return []; }
    return (data||[]).map(e => ({
      datum: e.datum,
      datumBis: e.datum_bis || null,
      datumAnzeige: e.datum_anzeige || new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}),
      sportart: e.sportart,
      veranstaltung: e.veranstaltung,
      ort: e.ort || '',
      klasse: e.klasse || '',
      teilnahme: e.teilnahme || 'Ja',
      prioritaet: e.prioritaet || 4,
      prioritaetText: e.prioritaet_text || '4 – Regulär',
      _id: e.id,
      _eigener: e.erstellt_von === Auth.id(),
    }));
  } catch(e) { return []; }
}

// Neuen Kalender-Eintrag erstellen / bearbeiten
function zeigeKalenderEintragModal(eintrag = null) {
  const istNeu = !eintrag;
  const istSlzbTermin = eintrag && !eintrag._eigener && !eintrag._id;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '560px';

  const sportartOptionen = SLZB_DB.sportarten.map(s =>
    `<option value="${esc(s.name)}" ${eintrag?.sportart===s.name?'selected':''}>${esc(s.name)}</option>`
  ).join('');

  const prioOptionen = [
    {v:1, t:'1 – Meisterschaft / Olympia / Finale'},
    {v:2, t:'2 – Wettkampf / Qualifikation / Rangliste'},
    {v:3, t:'3 – Lehrgang / Sichtung / Trainingslager'},
    {v:4, t:'4 – Regulär'},
  ].map(p => `<option value="${p.v}" ${eintrag?.prioritaet==p.v?'selected':''}>${p.t}</option>`).join('');

  modal.innerHTML = `
    <div class="modal-header">
      <h3>${istNeu ? '➕ Neuer Kalender-Eintrag' : '✏️ Eintrag bearbeiten'}</h3>
      ${istSlzbTermin ? '<div style="font-size:.75rem;color:rgba(255,255,255,.6);margin-top:2px">Wird als eigener Eintrag gespeichert</div>' : ''}
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row cols-2">
        <div class="form-group">
          <label style="font-weight:600">Datum <span class="required">*</span></label>
          <input type="date" id="ke-datum" value="${eintrag?.datum||''}" style="width:100%">
          <input type="hidden" id="ke-original-name" value="${eintrag?.veranstaltung||''}">
          <input type="hidden" id="ke-ist-slzb-termin" value="${istSlzbTermin?'1':'0'}">
        </div>
        <div class="form-group">
          <label style="font-weight:600">Datum bis <span class="text-muted text-xs">(optional)</span></label>
          <input type="date" id="ke-datum-bis" value="${eintrag?.datumBis||''}" style="width:100%">
        </div>
        <div class="form-group">
          <label style="font-weight:600">Sportart <span class="required">*</span></label>
          <select id="ke-sportart" style="width:100%">
            <option value="">– wählen –</option>
            ${sportartOptionen}
          </select>
        </div>
        <div class="form-group">
          <label style="font-weight:600">Priorität</label>
          <select id="ke-prio" style="width:100%">${prioOptionen}</select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label style="font-weight:600">Veranstaltungsname <span class="required">*</span></label>
          <input type="text" id="ke-veranstaltung" value="${esc(eintrag?.veranstaltung||'')}" placeholder="z.B. Deutsche Meisterschaften" style="width:100%">
        </div>
        <div class="form-group">
          <label style="font-weight:600">Ort</label>
          <input type="text" id="ke-ort" value="${esc(eintrag?.ort||'')}" placeholder="z.B. Berlin" style="width:100%">
        </div>
        <div class="form-group">
          <label style="font-weight:600">Klasse / Kader</label>
          <input type="text" id="ke-klasse" value="${esc(eintrag?.klasse||'')}" placeholder="z.B. U20 Kader" style="width:100%">
        </div>
        <div class="form-group">
          <label style="font-weight:600">Land <span style="font-size:.72rem;color:var(--slzb-text-muted)">(für Flagge)</span></label>
          <input type="text" id="ke-land" value="${esc(eintrag?.land||'')}" placeholder="z.B. Kanada, Österreich, USA..."
            style="width:100%"
            oninput="const f=document.getElementById('ke-flagge-preview');if(f)f.textContent=(typeof ortZuFlagge==='function'?ortZuFlagge(this.value||document.getElementById('ke-ort')?.value||'')||'🌍':'🌍')">
          <div id="ke-flagge-preview" style="font-size:1.8rem;margin-top:4px">${typeof ortZuFlagge==='function'?ortZuFlagge(eintrag?.land||eintrag?.ort||'')||'':''}
          </div>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label style="font-weight:600">Link zur Veranstaltung / Livestream <span style="font-size:.72rem;color:var(--slzb-text-muted)">(optional)</span></label>
          <input type="url" id="ke-link" value="${esc(eintrag?.link||'')}" placeholder="https://..." style="width:100%">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      ${!istNeu && eintrag ? `<button class="btn btn-outline btn-sm" onclick="kalenderZuMeldung(${JSON.stringify(eintrag).replace(/"/g,'&quot;')});this.closest('.modal-overlay').remove()" title="Meldung aus diesem Termin erstellen">⚡ Meldung erstellen</button>` : ''}
      <button class="btn btn-primary" onclick="speichereKalenderEintrag('${eintrag?._id||''}')">💾 Speichern</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

// Kalender-Eintrag → Meldung erstellen (Vorausfüllung)
function kalenderZuMeldung(eintrag) {
  if (!eintrag) return;
  // Felder vorausfüllen
  window._kalenderVorausfuellung = {
    sportartText: eintrag.sportart || '',
    wettbewerbText: eintrag.veranstaltung || '',
    datum: eintrag.datum || '',
    ort: eintrag.ort || '',
    titel: eintrag.veranstaltung || '',
  };
  // Zur Meldungsart-Auswahl navigieren
  if (typeof zeigeSportmeldungsartAuswahl === 'function') {
    zeigeSportmeldungsartAuswahl();
    toast('Felder aus Kalender-Eintrag vorausgefüllt', 'info');
  }
}

async function speichereKalenderEintrag(id) {
  const datum = document.getElementById('ke-datum')?.value;
  const datumBis = document.getElementById('ke-datum-bis')?.value || null;
  const sportart = document.getElementById('ke-sportart')?.value;
  const veranstaltung = document.getElementById('ke-veranstaltung')?.value.trim();
  const ort = document.getElementById('ke-ort')?.value.trim();
  const klasse = document.getElementById('ke-klasse')?.value.trim();
  const link = document.getElementById('ke-link')?.value.trim() || null;
  const land = document.getElementById('ke-land')?.value.trim() || null;
  const prio = parseInt(document.getElementById('ke-prio')?.value || '4');

  if (!datum || !sportart || !veranstaltung) {
    toast('Datum, Sportart und Veranstaltungsname sind Pflichtfelder', 'warning'); return;
  }

  const prioTexte = {1:'1 – Meisterschaft / Olympia / Finale',2:'2 – Wettkampf / Qualifikation / Rangliste',3:'3 – Lehrgang / Sichtung / Trainingslager',4:'4 – Regulär'};

  // Datum-Anzeige berechnen
  let datumAnzeige = new Date(datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
  if (datumBis && datumBis !== datum) {
    const bis = new Date(datumBis);
    const von = new Date(datum);
    if (von.getMonth() === bis.getMonth()) {
      datumAnzeige = `${von.getDate().toString().padStart(2,'0')}.–${bis.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}`;
    } else {
      datumAnzeige = `${von.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}.–${bis.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}`;
    }
  }

  const originalName = document.getElementById('ke-original-name')?.value || '';
  const istSlzbTerminSpeichern = document.getElementById('ke-ist-slzb-termin')?.value === '1';

  const daten = {
    datum, datum_bis: datumBis, datum_anzeige: datumAnzeige,
    sportart, veranstaltung, ort, klasse, link, land,
    prioritaet: prio, prioritaet_text: prioTexte[prio] || '4 – Regulär',
    erstellt_von: Auth.id(), geaendert_am: new Date().toISOString(),
    // Bei SLZB_TERMINE-Überschreibung: Original-Name speichern zum Filtern
    ...(istSlzbTerminSpeichern && originalName ? { ueberschreibt: originalName } : {}),
  };

  let error;
  if (id) {
    ({ error } = await Backend.client.from('kalender_eintraege').update(daten).eq('id', id));
  } else {
    ({ error } = await Backend.client.from('kalender_eintraege').insert([daten]));
  }

  if (error) { toast('Fehler: ' + error.message, 'danger'); return; }

  document.querySelector('.modal-overlay')?.remove();
  toast('✅ Eintrag gespeichert', 'success');
  navigateTo('kalender');
}

async function loescheKalenderEintrag(id, name) {
  if (!confirm(`Eintrag "${name}" wirklich löschen?`)) return;
  const { error } = await Backend.client.from('kalender_eintraege').delete().eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'danger'); return; }
  toast('✅ Eintrag gelöscht', 'success');
  navigateTo('kalender');
}

async function loescheKalenderEintragSicher(id, name, istEigen) {
  if (!id || id === 'undefined') {
    // SLZB_TERMINE-Eintrag: kann nicht direkt gelöscht werden
    // Stattdessen: als "ausgeblendet" markieren (eigener Eintrag mit speziellem Flag)
    const ok = await slzbConfirm(
      `"${name}" ist ein Standard-Termin und kann nicht dauerhaft gelöscht werden.\n\nSoll er stattdessen ausgeblendet werden?`,
      { titel: 'Termin ausblenden', icon: '🙈', bestaetigenText: 'Ausblenden', typ: 'default' }
    );
    if (!ok) return;
    // Speichere als "ausgeblendet" in kalender_eintraege
    const { error } = await Backend.client.from('kalender_eintraege').insert([{
      datum: '2000-01-01', // Dummy-Datum
      sportart: 'AUSGEBLENDET',
      veranstaltung: name,
      prioritaet: 4,
      erstellt_von: Auth.id(),
      ueberschreibt: name,
      ausgeblendet: true,
    }]);
    if (error) { toast('Fehler: ' + error.message, 'danger'); return; }
    toast('✅ Termin ausgeblendet', 'success');
    navigateTo('kalender');
    return;
  }
  // Eigener Eintrag: direkt löschen
  const ok = await slzbConfirm(
    `Eintrag "${name}" wirklich löschen?`,
    { titel: 'Eintrag löschen', icon: '🗑️', bestaetigenText: 'Löschen', typ: 'danger' }
  );
  if (!ok) return;
  const { error } = await Backend.client.from('kalender_eintraege').delete().eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'danger'); return; }
  toast('✅ Eintrag gelöscht', 'success');
  navigateTo('kalender');
}


// ── Kalender: Bald & Aktuell Ansicht ─────────────────────────────
async function kalenderZeigeAktuell() {
  const eigene = await ladeKalenderEintraege();
  const alle = [...((typeof SLZB_TERMINE !== 'undefined') ? SLZB_TERMINE : []), ...eigene];

  const heute = new Date(); heute.setHours(0,0,0,0);
  // Konfigurierbare Zeitfenster (Standard: 3 Tage zurück, 7 Tage voraus)
  const tageZurueck = parseInt(localStorage.getItem('slzb_bald_zurueck') || '3');
  const tageVoraus  = parseInt(localStorage.getItem('slzb_bald_voraus')  || '7');
  const inN  = new Date(heute); inN.setDate(heute.getDate() + tageVoraus);
  const vorN = new Date(heute); vorN.setDate(heute.getDate() - tageZurueck);

  const bald = alle.filter(t => {
    if (!t.datum) return false;
    const parts = t.datum.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    return d >= vorN && d <= inN;
  }).sort((a,b) => a.datum.localeCompare(b.datum));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.style.maxWidth = '700px';

  const prioFarbe = p => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#888';
  const prioLabel = p => p===1?'🏆 Meisterschaft':p===2?'⚡ Wettkampf':p===3?'📋 Lehrgang':'📅 Regulär';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>&#128205; Bald & Aktuell</h3>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:.75rem;color:var(--slzb-text-muted)">
          <input type="number" id="bald-zurueck" value="${tageZurueck}" min="0" max="30"
            style="width:40px;text-align:center;background:var(--slzb-bg-secondary);border:1px solid var(--slzb-border);border-radius:4px;padding:2px 4px;font-size:.75rem"
            onchange="localStorage.setItem('slzb_bald_zurueck',this.value);kalenderZeigeAktuell()"> Tage zurück /
          <input type="number" id="bald-voraus" value="${tageVoraus}" min="1" max="90"
            style="width:40px;text-align:center;background:var(--slzb-bg-secondary);border:1px solid var(--slzb-border);border-radius:4px;padding:2px 4px;font-size:.75rem"
            onchange="localStorage.setItem('slzb_bald_voraus',this.value);kalenderZeigeAktuell()"> Tage voraus
        </span>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
    </div>
    <div class="modal-body" style="padding:0">
      ${bald.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">📅</div><h3>Keine Termine in den nächsten 14 Tagen</h3></div>'
        : bald.map(t => {
            const parts = t.datum.split('-');
            const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
            const istHeute = d.toDateString() === heute.toDateString();
            const istVergangen = d < heute;
            const tageDiff = Math.round((d - heute) / 86400000);
            const wann = istHeute ? '🔴 HEUTE' : istVergangen ? `vor ${-tageDiff} Tag(en)` : `in ${tageDiff} Tag(en)`;
            return `<div style="padding:14px 16px;border-bottom:1px solid var(--slzb-border);
                      ${istHeute?'background:rgba(226,0,26,.06)':''}
                      ${istVergangen?'opacity:.7':''}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <span style="font-weight:700;font-size:.88rem">${esc(t.veranstaltung)}</span>
                    <span style="font-size:.72rem;font-weight:700;color:${prioFarbe(t.prioritaet)}">${prioLabel(t.prioritaet)}</span>
                  </div>
                  <div style="font-size:.78rem;color:var(--slzb-text-muted)">
                    📅 ${esc(t.datumAnzeige||t.datum)}
                    ${t.ort?'· 📍 '+esc(t.ort):''}
                    ${t.sportart?'· '+esc(t.sportart):''}
                    ${t.klasse?'· '+esc(t.klasse):''}
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
                  <span style="font-size:.75rem;font-weight:700;
                    color:${istHeute?'#E2001A':istVergangen?'#888':'#0B63CE'}">${wann}</span>
                  <div style="display:flex;gap:4px">
                    ${istVergangen ? `
                      <button class="btn btn-primary btn-sm" style="font-size:.72rem"
                        onclick="this.closest('.modal-overlay').remove();kalenderMeldungErstellen(${JSON.stringify(t).replace(/"/g,'&quot;')})">
                        &#128221; Meldung
                      </button>` : `
                      <button class="btn btn-outline btn-sm" style="font-size:.72rem"
                        onclick="this.closest('.modal-overlay').remove();kalenderCountdown(${JSON.stringify(t).replace(/"/g,'&quot;')})">
                        &#9203; Countdown
                      </button>
                      <button class="btn btn-outline btn-sm" style="font-size:.72rem"
                        onclick="this.closest('.modal-overlay').remove();kalenderAthletenvorschau(${JSON.stringify(t).replace(/"/g,'&quot;')})">
                        &#127939; Vorschau
                      </button>`}
                    <button class="btn btn-ghost btn-sm" style="font-size:.72rem"
                      onclick="this.closest('.modal-overlay').remove();zeigeKalenderEintragModal(${JSON.stringify(t).replace(/"/g,'&quot;')})">
                      ✏️
                    </button>
                  </div>
                </div>
              </div>
            </div>`;
          }).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

// Meldung aus Kalender-Termin erstellen

// Athletenvorschau direkt aus Kalender-Termin erstellen
function kalenderAthletenvorschau(termin) {
  // Öffne Athletenvorstellungs-Formular mit vorausgefüllten Daten
  window._avGespeicherteDaten = null;
  zeigeAthletenVorstellung();
  setTimeout(() => {
    const veranstEl = document.getElementById('av-veranstaltung');
    const ortEl = document.getElementById('av-ort');
    const sportartEl = document.getElementById('av-sportart');
    if (veranstEl) veranstEl.value = termin.veranstaltung || '';
    if (ortEl) ortEl.value = termin.ort || '';
    if (sportartEl) sportartEl.value = termin.sportart || '';
    toast('&#127939; Athletenvorschau für "' + (termin.veranstaltung||'') + '" vorbereitet – Athleten hinzufügen!', 'info');
  }, 400);
}

async function kalenderMeldungErstellen(termin) {
  // Suche passende gespeicherte Veranstaltung
  const veranstaltungen = ladeGespeicherteVeranstaltungen();
  const passend = veranstaltungen.find(v =>
    v.veranstaltung?.toLowerCase().includes(termin.veranstaltung?.toLowerCase().slice(0,10)) ||
    termin.veranstaltung?.toLowerCase().includes(v.veranstaltung?.toLowerCase().slice(0,10))
  );

  if (passend && passend.athleten?.length) {
    // Zeige Auswahl: Einzelmeldung oder Ergebnis-Update
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '460px';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📝 Meldung für ${esc(termin.veranstaltung)}</h3>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-info mb-3">
          <span class="alert-icon">✅</span>
          <span>Gespeicherte Veranstaltung gefunden: <strong>${esc(passend.veranstaltung)}</strong>
          mit ${passend.athleten.length} Athlet(en)</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();zeigeErgebnisUpdateModal('${passend.id}')">
            🏆 Ergebnis-Update (schnell, mit Poster)
          </button>
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove();kalenderMeldungFormular(${JSON.stringify(termin).replace(/"/g,'&quot;')})">
            📋 Neue Meldung (Formular)
          </button>
        </div>
      </div>`;
    overlay.appendChild(modal);
    overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  } else {
    // Direkt Formular öffnen
    kalenderMeldungFormular(termin);
  }
}

function kalenderMeldungFormular(termin) {
  navigateTo('neue-meldung');
  setTimeout(async () => {
    const titelEl = document.getElementById('f-titel');
    const sportEl = document.getElementById('f-sportart-text');
    const wbEl = document.getElementById('f-wettbewerb-text');
    const datumEl = document.getElementById('f-datum');
    const ortEl = document.getElementById('f-ort');
    if (titelEl) titelEl.value = `Erfolg bei ${termin.veranstaltung}`;
    if (sportEl) sportEl.value = termin.sportart || '';
    if (wbEl) wbEl.value = termin.veranstaltung || '';
    if (datumEl) datumEl.value = termin.datum || '';
    if (ortEl) ortEl.value = termin.ort || '';

    // Athleten aus Profil vorschlagen wenn Sportart bekannt
    if (termin.sportart && typeof ladeAthletenProfile === 'function') {
      try {
        const profile = await ladeAthletenProfile('', false);
        const passende = profile.filter(p => p.sportart === termin.sportart);
        if (passende.length === 1) {
          // Genau ein Athlet dieser Sportart → automatisch eintragen
          const schuelerEl = document.getElementById('f-schueler-text');
          if (schuelerEl && !schuelerEl.value) {
            schuelerEl.value = passende[0].name;
            window._letzteProfilId = passende[0].id;
          }
        }
      } catch(e) {}
    }
    toast(`✅ Formular mit "${termin.veranstaltung}" vorausgefüllt`, 'info');
  }, 400);
}

async function renderKalender() {
  const jetzt = new Date();
  const eigeneEintraege = await ladeKalenderEintraege();
  const aktMonat = jetzt.getMonth();
  const aktJahr = jetzt.getFullYear();

  // Termine aus SLZB_TERMINE (termine.js)
  // Eigene Einträge die SLZB_TERMINE überschreiben
  const ueberschriebeneNamen = new Set(
    (eigeneEintraege || [])
      .filter(e => e.ueberschreibt)
      .map(e => e.ueberschreibt)
  );

  const alleTermine = [
    // SLZB_TERMINE ohne überschriebene Einträge
    ...((typeof SLZB_TERMINE !== 'undefined') ? SLZB_TERMINE.filter(t => !ueberschriebeneNamen.has(t.veranstaltung)) : []),
    // Eigene Einträge
    ...(eigeneEintraege || [])
  ];

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
      <button class=\"btn btn-outline btn-sm\" onclick=\"kalenderZeigeAktuell()\" style=\"margin-right:6px\">\xf0\x9f\x93\x8d Bald</button>
      <button class=\"btn btn-primary btn-sm\" onclick=\"zeigeKalenderEintragModal()\">➕ Neuer Eintrag</button>
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
            return `<tr style="${_istHeuteN?'background:rgba(226,0,26,0.12);':''}border-left:4px solid ${typeof sportartFarbe==='function'?sportartFarbe(t.sportart):'#003366'}">\
            <td class="text-sm"><strong>${esc(t.datumAnzeige)}</strong>${_istHeuteN?'<span class="badge badge-danger ml-1" style="font-size:.65rem">HEUTE</span>':''}</td>
            <td class=\"text-sm\" style=\"border-left:3px solid ${typeof sportartFarbe==='function'?sportartFarbe(t.sportart):'#003366'};padding-left:8px\">${esc(t.sportart)}</td>\

            <td><strong>${esc(t.veranstaltung)}</strong></td>
            <td class=\"text-sm text-muted\">${typeof ortZuFlagge==='function'&&(t.land||t.ort)?`<span class=\"flagge-inline\" style=\"font-size:.85rem\">${ortZuFlagge(t.land||t.ort)||''}</span>`:''}${esc(t.ort||'–')}${t.link?`<a href=\"${esc(t.link)}\" target=\"_blank\" style=\"margin-left:4px;color:var(--slzb-primary);font-size:.72rem\" title=\"Veranstaltungsseite\">🔗</a>`:''}</td>

            <td class="text-sm text-muted">${esc(t.klasse||'–')}</td>
            <td><span style="color:${prioFarbe(t.prioritaet)};font-size:.75rem;font-weight:700">${prioLabel(t.prioritaet)}</span></td>
            <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 8px" onclick="kalenderCountdown(${JSON.stringify(t).replace(/"/g,'&quot;')})">⏳</button>
              ${(Auth.canDo('bearbeiten') || t._eigener) ? `<button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 6px" title="Bearbeiten" onclick="zeigeKalenderEintragModal(${JSON.stringify(t).replace(/\"/g,'&quot;')})">✏️</button>` : ''}
              ${t._eigener ? `<button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 6px;color:#E2001A" title="Löschen" onclick="loescheKalenderEintrag('${t._id}')">🗑️</button>` : ''}
            </td>
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
          <td class=\"text-sm\" style=\"border-left:3px solid ${typeof sportartFarbe==='function'?sportartFarbe(t.sportart):'#003366'};padding-left:8px\">${esc(t.sportart)}</td>\

          <td>${esc(t.veranstaltung)}</td>
          <td class=\"text-sm text-muted\">${typeof ortZuFlagge==='function'&&(t.land||t.ort)?`<span class=\"flagge-inline\" style=\"font-size:.85rem\">${ortZuFlagge(t.land||t.ort)||''}</span>`:''}${esc(t.ort||'–')}${t.link?`<a href=\"${esc(t.link)}\" target=\"_blank\" style=\"margin-left:4px;color:var(--slzb-primary);font-size:.72rem\" title=\"Veranstaltungsseite\">🔗</a>`:''}</td>

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
            <td class=\"text-sm\" style=\"border-left:3px solid ${typeof sportartFarbe==='function'?sportartFarbe(t.sportart):'#003366'};padding-left:8px\">${esc(t.sportart)}</td>\

            <td><strong>${esc(t.veranstaltung)}</strong></td>
            <td class=\"text-sm text-muted\">${typeof ortZuFlagge==='function'&&(t.land||t.ort)?`<span class=\"flagge-inline\" style=\"font-size:.85rem\">${ortZuFlagge(t.land||t.ort)||''}</span>`:''}${esc(t.ort||'–')}${t.link?`<a href=\"${esc(t.link)}\" target=\"_blank\" style=\"margin-left:4px;color:var(--slzb-primary);font-size:.72rem\" title=\"Veranstaltungsseite\">🔗</a>`:''}</td>

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
    schutzeModalVorAussenklick(overlay, modal);
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
  schutzeModalVorAussenklick(overlay, modal);
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

function wvAusgeblendetZuruecksetzen() {
  localStorage.removeItem('slzb_wv_ausgeblendet');
  toast('Alle Termine wieder eingeblendet', 'success');
  document.querySelector('.modal-overlay')?.remove();
}

async function zeigeWochenvorschau(wochen = 1) {
  const _eigene = await ladeKalenderEintraege();
  const alleTermine = [...((typeof SLZB_TERMINE !== 'undefined') ? SLZB_TERMINE : []), ..._eigene];
  const jetzt = new Date(); jetzt.setHours(0,0,0,0);

  // Zeitraum: ab HEUTE bis Ende der gewählten Wochen-Anzahl
  const heute = new Date(jetzt); heute.setHours(0,0,0,0);
  const tag = jetzt.getDay(); // 0=So, 1=Mo...
  const diffMo = tag === 0 ? -6 : 1 - tag;
  const montag = new Date(jetzt); montag.setDate(jetzt.getDate() + diffMo); montag.setHours(0,0,0,0);
  // Sonntag = Ende der letzten gewählten Woche
  const sonntag = new Date(montag); sonntag.setDate(montag.getDate() + (wochen * 7) - 1); sonntag.setHours(23,59,59,999);

  const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const tagNamen = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  // Ausgeblendete Termine (vom Nutzer deaktiviert, gespeichert in localStorage)
  const ausgeblendetIds = new Set(JSON.parse(localStorage.getItem('slzb_wv_ausgeblendet') || '[]'));

  const wocheTermine = alleTermine.filter(t => {
    if (!t.datum) return false;
    // Datum normalisieren: YYYY-MM-DD → Date ohne Zeitzone-Probleme
    const parts = t.datum.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    d.setHours(0,0,0,0);
    // Ab heute (nicht ab Montag) bis Sonntag
    return d >= heute && d <= sonntag;
  }).sort((a,b) => (a.datum||'').localeCompare(b.datum||''));

  const prioFarbe = (p) => p===1?'#E2001A':p===2?'#E07000':p===3?'#0B63CE':'#666';
  const prioLabel = (p) => p===1?'🏆 Meisterschaft':p===2?'⚡ Wettkampf':p===3?'📋 Lehrgang':'📅 Regulär';

  const wocheLabel = `${montag.getDate()}. ${monatNamen[montag.getMonth()]} – ${sonntag.getDate()}. ${monatNamen[sonntag.getMonth()]} ${sonntag.getFullYear()}`;
  const wocheLabelHeute = heute > montag
    ? `${heute.getDate()}. ${monatNamen[heute.getMonth()]} – ${sonntag.getDate()}. ${monatNamen[sonntag.getMonth()]} ${sonntag.getFullYear()}`
    : wocheLabel;
  const zeitraumLabel = wochen > 1 ? `${wochen}-Wochen-Vorschau` : 'Wochenvorschau';

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
      <h3>📅 ${esc(zeitraumLabel)} – ${esc(wocheLabelHeute)}</h3>
      <button class="btn btn-ghost btn-sm close-x">✕</button>
    </div>
    <div class="modal-body">
      ${wocheTermine.length === 0
        ? `<div class="alert alert-success"><span class="alert-icon">✅</span>
            <span>Diese Woche stehen keine Veranstaltungen an.</span></div>`
        : `<div class="alert alert-info mb-3">
            <span class="alert-icon">📅</span>
            <span><strong>${wocheTermine.length} Veranstaltung(en)</strong> diese Woche
              ${ausgeblendetIds.size > 0 ? `<span style="color:#888;font-size:.8rem"> · ${ausgeblendetIds.size} ausgeblendet</span>` : ''}
            </span>
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
                  <td class=\"text-sm\" style=\"border-left:3px solid ${typeof sportartFarbe==='function'?sportartFarbe(t.sportart):'#003366'};padding-left:8px\">${esc(t.sportart)}</td>\

                  <td><strong>${esc(t.veranstaltung)}</strong></td>
                  <td class="text-sm text-muted">
                    ${typeof ortZuFlagge === 'function' && (t.land||t.ort) ? `<span class="flagge-inline">${ortZuFlagge(t.land||t.ort)||''}</span>` : ''}${esc(t.ort||'–')}
                    ${t.link ? `<a href="${esc(t.link)}" target="_blank" style="margin-left:6px;font-size:.7rem;color:var(--slzb-primary)" title="Veranstaltungsseite">🔗</a>` : ''}
                  </td>
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
      ${ausgeblendetIds.size > 0 ? `<button class="btn btn-ghost btn-sm" onclick="wvAusgeblendetZuruecksetzen()" style="color:#888;font-size:.8rem">↺ Alle einblenden</button>` : ''}
      <div style="display:flex;gap:4px;align-items:center">
        <span style="font-size:.75rem;color:#888">Zeitraum:</span>
        <button class="btn btn-ghost btn-sm ${wochen===1?'active':''}" onclick="document.querySelector('.modal-overlay')?.remove();zeigeWochenvorschau(1)" style="font-size:.75rem;padding:3px 8px">1W</button>
        <button class="btn btn-ghost btn-sm ${wochen===2?'active':''}" onclick="document.querySelector('.modal-overlay')?.remove();zeigeWochenvorschau(2)" style="font-size:.75rem;padding:3px 8px">2W</button>
        <button class="btn btn-ghost btn-sm ${wochen===4?'active':''}" onclick="document.querySelector('.modal-overlay')?.remove();zeigeWochenvorschau(4)" style="font-size:.75rem;padding:3px 8px">4W</button>
      </div>
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
  // Eigene Einträge nachladen und mit window._wocheTermine zusammenführen
  const _eigene = await ladeKalenderEintraege();
  const _statisch = window._wocheTermine || [];
  // Eigene Einträge die in dieser Woche liegen hinzufügen
  const _wocheLabel = window._wocheLabel || '';
  // Woche aus Label extrahieren oder neu berechnen
  const jetzt2 = new Date(); jetzt2.setHours(0,0,0,0);
  const tag2 = jetzt2.getDay();
  const diffMo2 = tag2 === 0 ? -6 : 1 - tag2;
  const montag2 = new Date(jetzt2); montag2.setDate(jetzt2.getDate() + diffMo2);
  const sonntag2 = new Date(montag2); sonntag2.setDate(montag2.getDate() + 6);
  const heute2 = new Date(jetzt2); heute2.setHours(0,0,0,0);
  const eigeneWoche = _eigene.filter(t => {
    if (!t.datum) return false;
    const parts = t.datum.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    d.setHours(0,0,0,0);
    // Ab heute (nicht ab Montag)
    return d >= heute2 && d <= sonntag2;
  });
  // Zusammenführen und Duplikate vermeiden
  const vorhandeneIds = new Set(_statisch.map(t => t._id).filter(Boolean));
  const neueEigene = eigeneWoche.filter(t => !vorhandeneIds.has(t._id));
  const alleTermineWoche = [..._statisch, ...neueEigene].sort((a,b) => (a.datum||'').localeCompare(b.datum||''));
  // Ausgeblendete Termine herausfiltern
  const ausgeblendetPoster = new Set(JSON.parse(localStorage.getItem('slzb_wv_ausgeblendet') || '[]'));
  const termine = alleTermineWoche.filter(t => {
    const termId = (t._id || t.veranstaltung + t.datum).replace(/[^a-z0-9]/gi, '_');
    return !ausgeblendetPoster.has(termId);
  });
  const wocheLabel = _wocheLabel;
  if (!termine.length) { toast('Keine sichtbaren Termine diese Woche','warning'); return; }

  // Canvas erstellen
  const canvas = document.createElement('canvas');
  canvas.width=1080; canvas.height=1350;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const W=1080, H=1350;
  const monatNamen = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const tagNamen = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  // Hintergrund mit rotem Fade unten
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0a0c1a');
  grad.addColorStop(0.55,'#1B1C1F');
  grad.addColorStop(0.78,'rgba(80,0,10,0.85)');
  grad.addColorStop(1,'rgba(140,0,20,0.97)');
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
  // Dynamische Zeilenhöhe: bei vielen Terminen kleiner
  const anzahlTermine = termine.length;
  const ROW_H = anzahlTermine > 12 ? 52 : anzahlTermine > 8 ? 62 : 72;
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
      // Schriftgrößen und Positionen relativ zu ROW_H
      const sportSz = Math.max(9, Math.round(ROW_H * 0.18));
      const veranstSz = Math.max(11, Math.round(ROW_H * 0.26));
      const infoSz = Math.max(9, Math.round(ROW_H * 0.18));
      const y1 = y + Math.round(ROW_H * 0.12);  // Sportart
      const y2 = y + Math.round(ROW_H * 0.38);  // Veranstaltung
      const y3 = y + Math.round(ROW_H * 0.68);  // Info
      // Sportart
      ctx.fillStyle=prioFarbe(t.prioritaet); ctx.font=`bold ${sportSz}px Montserrat, Arial, sans-serif`;
      ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText(t.sportart.toUpperCase(), PAD+14, y1);
      // Veranstaltung (mit Zeitraum wenn mehrtägig)
      const zeitraum = t.datumBis && t.datumBis !== t.datum
        ? formatDatumZeitraum(t.datum, t.datumBis) : null;
      const veranstText = zeitraum
        ? `${t.veranstaltung} (${zeitraum})`
        : t.veranstaltung;
      ctx.fillStyle='#fff'; ctx.font=`bold ${veranstSz}px Montserrat, Arial, sans-serif`;
      ctx.fillText(veranstText, PAD+14, y2, W-2*PAD-80);
      // Ort + Klasse
      const info = [t.ort, t.klasse].filter(Boolean).join(' · ');
      if (info && ROW_H >= 60) {
        ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font=`${infoSz}px Montserrat, Arial, sans-serif`;
        ctx.fillText(info, PAD+14, y3, W-2*PAD-80);
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
        ctx.fillText(veranstTextS || t.veranstaltung, 100, y+36, W-160);

        // Ort + Klasse
        const zeitraumS = t.datumBis && t.datumBis !== t.datum ? formatDatumZeitraum(t.datum, t.datumBis) : null;
        const info = [t.ort, t.klasse].filter(Boolean).join(' · ');
        const veranstTextS = zeitraumS ? `${t.veranstaltung} (${zeitraumS})` : t.veranstaltung;
        if (info && ROW_H > 80) {
          ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='13px Montserrat, Arial, sans-serif';
          ctx.fillText(info, 100, y+64, W-160);
        }

        y += ROW_H;
      });
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
  const aktuell=await DB.getErfolgById(erfolgId);
  if(!aktuell){toast('Meldung nicht gefunden.','danger');return;}
  if(!kannErfolgBearbeiten(aktuell)){toast('Diese Meldung darf nicht bearbeitet werden.','danger');return;}

  const titel=document.getElementById('edit-titel')?.value?.trim()||'';
  if(!titel){toast('Titel ist Pflichtfeld','warning');return;}

  const sportartText=document.getElementById('edit-sportart')?.value?.trim()||'';
  const wettbewerbText=document.getElementById('edit-wettbewerb')?.value?.trim()||'';
  const athlet=document.getElementById('edit-athlet')?.value?.trim()||'';
  const sp=SLZB_DB.sportarten.find(s=>s.name.toLowerCase()===sportartText.toLowerCase());

  let wettbewerbId=aktuell.wettbewerbId||null;
  if(wettbewerbText && wettbewerbText!==aktuell.wettbewerbText){
    try{
      wettbewerbId=await DB.getOderErstelleWettbewerb(wettbewerbText,document.getElementById('edit-datum')?.value||null);
    }catch(err){console.warn('Wettbewerb konnte nicht aufgelöst werden:',err.message);}
  }

  const daten={
    meldungsart:aktuell.meldungsart,
    titel,
    sportartId:sp?.id||aktuell.sportartId||null,
    sportartText,
    disziplin:document.getElementById('edit-disziplin')?.value?.trim()||'',
    wettbewerbId,
    wettbewerbText,
    datum:document.getElementById('edit-datum')?.value||null,
    ort:document.getElementById('edit-ort')?.value?.trim()||'',
    ebene:document.getElementById('edit-ebene')?.value||'',
    platzierung:document.getElementById('edit-platzierung')?.value?Number(document.getElementById('edit-platzierung').value):null,
    medaille:document.getElementById('edit-medaille')?.value||'keine',
    ergebnisWert:document.getElementById('edit-ergebnis-wert')?.value?Number(document.getElementById('edit-ergebnis-wert').value):null,
    ergebnisEinheit:document.getElementById('edit-ergebnis-einheit')?.value?.trim()||'',
    ergebnisText:aktuell.ergebnisText||'',
    kurzinfo:document.getElementById('edit-kurzinfo')?.value?.trim()||'',
    quelleUrl:document.getElementById('edit-quelle')?.value?.trim()||'',
    textArtikel:document.getElementById('edit-artikel-text')?.value?.trim()||'',
    textKIEntwurf:aktuell.textKIEntwurf||'',
    videoUrl:aktuell.videoUrl||'',
    status:aktuell.status,
  };

  const btn=document.querySelector('#tab-bearbeiten .btn-primary');
  if(btn){btn.disabled=true;btn.textContent='Wird gespeichert...';}
  try{
    const update=await DB.aktualisiereErfolg(erfolgId,daten);
    if(!update.ok) throw new Error(update.fehler||'Kerndaten konnten nicht gespeichert werden.');

    // Das Sammelfeld im Bearbeiten-Tab bleibt kompatibel: kommaseparierte Namen
    // werden als Beteiligtenliste gespeichert. Die Detailtabelle erlaubt danach
    // einzelne Änderungen ohne die gesamte Liste zu löschen.
    const namen=athlet.split(',').map(n=>n.trim()).filter(Boolean);
    const bisher=(aktuell.beteiligte||[]).map(b=>b.anzeigename||'').filter(Boolean);
    if(JSON.stringify(namen)!==JSON.stringify(bisher)){
      const ersatz=await DB.ersetzeBeteiligte(erfolgId,namen.map(name=>({
        anzeigename:name,rolle:'Athlet',einwilligungsstatus:'Nicht geprüft',schuelerId:null,
      })));
      if(!ersatz.ok) throw new Error(ersatz.fehler||'Beteiligte konnten nicht gespeichert werden.');
    }

    await DB.protokolliere(erfolgId,aktuell.status,aktuell.status,`Kerndaten bearbeitet: Titel="${titel}"`);
    APP._erfolgeCache=null;
    toast('Änderungen gespeichert','success');
    navigateTo('erfolg-detail',{currentErfolgId:erfolgId});
  }catch(err){
    toast('Fehler beim Speichern: '+err.message,'danger');
    if(btn){btn.disabled=false;btn.textContent='💾 Änderungen speichern';}
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
async function exportiereKalenderIcal() {
  const _eigene = await ladeKalenderEintraege();
  const alleTermine = [...((typeof SLZB_TERMINE !== 'undefined') ? SLZB_TERMINE : []), ..._eigene];
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

  // Kalender-Daten aus data-Attributen lesen (wenn aus Kalender gewählt)
  const selectedOption = select.options[select.selectedIndex];
  const kalenderDatum = selectedOption?.dataset?.datum || '';
  const kalenderOrt = selectedOption?.dataset?.ort || '';
  const kalenderSportart = selectedOption?.dataset?.sportart || '';

  toast('Lade Meldungen...', 'info');
  const alle = await ladeErfolge();
  const meldungen = alle.filter(e =>
    e.wettbewerbText === wettbewerbName &&
    ['Freigegeben','Veröffentlicht'].includes(e.status)
  ).sort((a,b) => (a.platzierung||99) - (b.platzierung||99));

  // Wenn keine Meldungen aber aus Kalender: Countdown-Poster anbieten
  if (!meldungen.length) {
    if (kalenderDatum) {
      const antwort = confirm(`Keine freigegebenen Meldungen für "${wettbewerbName}".

Möchten Sie stattdessen ein Countdown-Poster erstellen?`);
      if (antwort) {
        zeigeCountdownModal();
        setTimeout(()=>{
          const nameEl=document.getElementById('cd-name'); if(nameEl) nameEl.value=wettbewerbName;
          const datumEl=document.getElementById('cd-datum'); if(datumEl) datumEl.value=kalenderDatum+'T10:00';
          const ortEl=document.getElementById('cd-ort'); if(ortEl) ortEl.value=kalenderOrt;
          const sportEl=document.getElementById('cd-sportart'); if(sportEl) sportEl.value=kalenderSportart;
          cdVorschau();
        }, 200);
      }
    } else {
      toast('Keine freigegebenen Meldungen für diese Veranstaltung', 'warning');
    }
    return;
  }

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

  // Datum/Ort: aus Meldungen oder Kalender-Fallback
  const _mDatum = meldungen[0]?.datum || kalenderDatum;
  const datum = _mDatum ? new Date(_mDatum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const ort = meldungen[0]?.ort || kalenderOrt || '';

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
    <div class="modal-footer" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn-ghost close-btn">Schließen</button>
      <button class="btn btn-outline" onclick="vpHerunterladen('${esc(wettbewerbName)}')">🖼️ PNG herunterladen</button>
      <button class="btn btn-outline" onclick="vpPdfHerunterladen('${esc(wettbewerbName)}','a4')">📄 PDF A4</button>
      <button class="btn btn-primary" onclick="vpPdfHerunterladen('${esc(wettbewerbName)}','a3')">📄 PDF A3</button>
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

// ══════════════════════════════════════════════════════════════
// PDF-EXPORT FÜR POSTER (jsPDF, druckoptimiert)
// ══════════════════════════════════════════════════════════════

// jsPDF dynamisch laden
async function ladejsPDF() {
  if (typeof jspdf !== 'undefined' && jspdf.jsPDF) return jspdf.jsPDF;
  if (typeof jsPDF !== 'undefined') return jsPDF;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = () => resolve(jspdf?.jsPDF || jsPDF);
    s.onerror = () => reject(new Error('jsPDF konnte nicht geladen werden'));
    document.head.appendChild(s);
  });
}

// Veranstaltungs-Poster als PDF exportieren
async function vpPdfHerunterladen(name, format='a4') {
  toast('PDF wird erstellt...', 'info');
  try {
    const JsPDF = await ladejsPDF();
    const m = window._vpMeldungen;
    const wb = window._vpWettbewerb;
    if (!m || !wb) { toast('Keine Daten vorhanden', 'warning'); return; }

    const datum = m[0]?.datum ? new Date(m[0].datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
    const ort = m[0]?.ort || '';

    // Druckauflösung: 300 DPI
    // A4: 210×297mm → bei 300dpi = 2480×3508px
    // A3: 297×420mm → bei 300dpi = 3508×4961px
    // Wir nutzen 2× Skalierung für gute Qualität ohne zu viel RAM
    const DPI_SCALE = 2; // 2× = ~150dpi effektiv, guter Kompromiss

    let canvasW, canvasH, pdfW, pdfH, orientation;
    if (format === 'a3') {
      canvasW = 1587 * DPI_SCALE; // A3 quer: 1587px × 2 = 3174px
      canvasH = 1123 * DPI_SCALE;
      pdfW = 420; pdfH = 297;
      orientation = 'landscape';
    } else {
      // A4 Hochformat
      canvasW = 1080 * DPI_SCALE; // 1080px × 2 = 2160px
      canvasH = 1350 * DPI_SCALE; // 1350px × 2 = 2700px
      pdfW = 210; pdfH = 297;
      orientation = 'portrait';
    }

    // Temporäres Canvas in hoher Auflösung
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvasW;
    tmpCanvas.height = canvasH;
    tmpCanvas.id = 'vp-pdf-canvas';
    tmpCanvas.style.display = 'none';
    document.body.appendChild(tmpCanvas);

    // Poster in hoher Auflösung zeichnen
    const posterFormat = format === 'a3' ? 'querformat' : 'hochformat';
    await zeichneVeranstaltungsPoster('vp-pdf-canvas', m, wb, datum, ort, posterFormat);

    // Canvas → PNG → PDF
    const imgData = tmpCanvas.toDataURL('image/png', 1.0);
    tmpCanvas.remove();

    const pdf = new JsPDF({
      orientation,
      unit: 'mm',
      format: format === 'a3' ? 'a3' : 'a4',
      compress: true,
    });

    // Bild auf volle Seite (randlos)
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, '', 'FAST');

    // Metadaten
    pdf.setProperties({
      title: `SLZB – ${wb}`,
      subject: 'Veranstaltungs-Ergebnisse',
      author: 'Schul- und Leistungssportzentrum Berlin',
      creator: 'SLZB-Erfolge v3',
    });

    const dateiname = `SLZB_${wb.replace(/[^a-zA-Z0-9]/g,'-')}_${format.toUpperCase()}.pdf`;
    pdf.save(dateiname);
    toast(`✅ PDF "${dateiname}" heruntergeladen!`, 'success');

  } catch(err) {
    toast('PDF-Fehler: ' + err.message, 'danger');
    console.error(err);
  }
}

// Allgemeine PDF-Export-Funktion für beliebige Canvas-Elemente
async function exportCanvasAlsPDF(canvasId, dateiname='SLZB_Poster', format='a4', orientation='portrait') {
  toast('PDF wird erstellt...', 'info');
  try {
    const JsPDF = await ladejsPDF();
    const canvas = document.getElementById(canvasId);
    if (!canvas) { toast('Canvas nicht gefunden', 'danger'); return; }

    // Hochauflösende Kopie erstellen
    const DPI_SCALE = 2;
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvas.width * DPI_SCALE;
    tmpCanvas.height = canvas.height * DPI_SCALE;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.scale(DPI_SCALE, DPI_SCALE);
    tmpCtx.drawImage(canvas, 0, 0);

    const imgData = tmpCanvas.toDataURL('image/png', 1.0);

    // Seitenmaße
    const formatMap = {
      'a4': [210, 297], 'a3': [297, 420],
      'a4-quer': [297, 210], 'a3-quer': [420, 297],
    };
    const [pdfW, pdfH] = formatMap[format] || [210, 297];

    const pdf = new JsPDF({ orientation, unit: 'mm', format, compress: true });
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, '', 'FAST');
    pdf.setProperties({ title: dateiname, author: 'SLZB Berlin', creator: 'SLZB-Erfolge v3' });
    pdf.save(`${dateiname}.pdf`);
    toast(`✅ PDF heruntergeladen!`, 'success');

  } catch(err) {
    toast('PDF-Fehler: ' + err.message, 'danger');
  }
}

// ══════════════════════════════════════════════════════════════
// MELDUNG LÖSCHEN
// ══════════════════════════════════════════════════════════════
async function loescheMeldung(erfolgId, titel) {
  const r = Auth.rolle();
  const istAdmin = r === 'admin';
  const istRedaktion = ['redaktion', 'oea'].includes(r);
  const istTrainer = ['trainer', 'mitarbeiter'].includes(r);

  // Grund abfragen
  const grund = prompt(
    `Meldung in den Papierkorb verschieben?\n\n"${titel}"\n\n` +
    (istAdmin
      ? 'Als Admin kannst du danach im Papierkorb endgültig löschen oder wiederherstellen.'
      : 'Die Meldung wird in den Papierkorb verschoben und kann von einem Admin wiederhergestellt werden.') +
    '\n\nGrund (optional):'
  );
  if (grund === null) return; // Abbrechen

  try {
    await DB.softDelete(erfolgId, grund);
    APP._erfolgeCache = null;
    toast('🗑️ Meldung in Papierkorb verschoben', 'success');
    const ziel = Auth.canDo('bearbeiten') ? 'redaktion' : 'meine-meldungen';
    navigateTo(ziel);
  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
  }
}

// Wiederherstellen aus Papierkorb (Admin)
async function wiederherstellenMeldung(erfolgId) {
  if (!confirm('Meldung wiederherstellen?')) return;
  try {
    await DB.wiederherstellen(erfolgId);
    APP._erfolgeCache = null;
    toast('✅ Meldung wiederhergestellt', 'success');
    navigateTo('papierkorb');
  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
  }
}

// Endgültig löschen (nur Admin)
async function endgueltigLoeschen(erfolgId, titel) {
  if (!confirm(`Meldung ENDGÜLTIG löschen?\n\n"${titel}"\n\n⚠️ Dieser Vorgang kann NICHT rückgängig gemacht werden!\nAlle Daten werden dauerhaft gelöscht.`)) return;
  try {
    await DB.hardDelete(erfolgId);
    APP._erfolgeCache = null;
    toast('🗑️ Meldung endgültig gelöscht', 'success');
    navigateTo('papierkorb');
  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
  }
}

// Papierkorb-Ansicht (nur Admin)
async function renderPapierkorb() {
  if (Auth.rolle() !== 'admin') return '<div class="page"><div class="alert alert-danger">Kein Zugriff.</div></div>';
  const alle = await DB.getErfolge({ nurGeloescht: true });
  return `<div class="page">
    <div class="page-header"><h1>🗑️ Papierkorb</h1>
      <p class="text-muted">Soft-gelöschte Meldungen – können wiederhergestellt oder endgültig gelöscht werden.</p>
    </div>
    ${!alle.length ? '<div class="alert alert-info"><span class="alert-icon">ℹ️</span><span>Papierkorb ist leer.</span></div>' :
    `<div class="card">
      <div class="card-body">
        <table style="width:100%;font-size:.85rem">
          <thead><tr>
            <th>Titel</th><th>Sportart</th><th>Gelöscht am</th><th>Von</th><th>Grund</th><th>Aktionen</th>
          </tr></thead>
          <tbody>${alle.map(e=>`<tr>
            <td><strong>${esc(e.titel)}</strong><br><span class="text-xs text-muted">${esc(e.erfolgNr||e.id)}</span></td>
            <td>${esc(e.sportartText||'–')}</td>
            <td>${fmtDT(e.deletedAt)}</td>
            <td>${esc(e.deletedByName||'–')}</td>
            <td>${esc(e.deleteReason||'–')}</td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-outline btn-sm" onclick="wiederherstellenMeldung('${e.id}')">↩️ Wiederherstellen</button>
                <button class="btn btn-danger btn-sm" onclick="endgueltigLoeschen('${e.id}','${esc(e.titel)}')" style="background:#c0392b;border-color:#c0392b;color:#fff">🗑️ Endgültig löschen</button>
              </div>
            </td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`}
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// MELDUNG DUPLIZIEREN
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// MELDUNGEN ZUSAMMENFASSEN
// ══════════════════════════════════════════════════════════════
async function zeigeMeldungZusammenfassen(erfolgId) {
  // Alle eigenen/sichtbaren Meldungen laden
  const alle = await ladeErfolge();
  const aktuelle = alle.find(e=>e.id===erfolgId);
  if (!aktuelle) { toast('Meldung nicht gefunden', 'danger'); return; }

  // Andere Meldungen: zuerst gleiche Veranstaltung, dann gleiche Sportart
  const gleicheVeranstaltung = alle.filter(e =>
    e.id !== erfolgId &&
    !e.deleted_at &&
    aktuelle.wettbewerbText &&
    e.wettbewerbText === aktuelle.wettbewerbText
  );
  const gleicheSportart = alle.filter(e =>
    e.id !== erfolgId &&
    !e.deleted_at &&
    !gleicheVeranstaltung.find(v => v.id === e.id) &&
    (e.sportartText === aktuelle.sportartText || !aktuelle.sportartText)
  );
  const kandidaten = [...gleicheVeranstaltung, ...gleicheSportart].slice(0, 50);
  const hatGleicheVeranstaltung = gleicheVeranstaltung.length > 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '600px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🔗 Meldungen zusammenfassen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
        <span>Wähle Meldungen aus, die mit <strong>${esc(aktuelle.titel)}</strong> zusammengefasst werden sollen.</span></div>

      <div style="margin-bottom:12px">
        <label style="font-weight:600;display:block;margin-bottom:6px">Zusammenfassungs-Typ:</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="zf-typ" value="mehrtitel" checked> 🏆 Mehrtitel-Athlet
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="zf-typ" value="bilanz"> 🏟️ Veranstaltungs-Bilanz
          </label>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-weight:600;font-size:.85rem">Meldungen auswählen:</div>
        ${hatGleicheVeranstaltung ? `<button class="btn btn-ghost btn-sm" onclick="zfAlleVeranstaltungWaehlen()" style="font-size:.72rem">✓ Alle von dieser Veranstaltung (${gleicheVeranstaltung.length})</button>` : ''}
      </div>
      <div style="max-height:300px;overflow-y:auto;border:1px solid rgba(255,255,255,.1);border-radius:8px">
        <!-- Aktuelle Meldung (immer dabei) -->
        <div style="padding:10px 12px;background:rgba(226,0,26,0.1);border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px">
          <input type="checkbox" checked disabled style="accent-color:#E2001A">
          <div>
            <div style="font-weight:600;font-size:.85rem">${esc(aktuelle.titel)}</div>
            <div style="font-size:.75rem;color:#888">${esc(aktuelle.sportartText||'–')} · ${aktuelle.datum?new Date(aktuelle.datum).toLocaleDateString('de-DE'):''} · ${esc(aktuelle.beteiligte?.[0]?.anzeigename||'–')}</div>
          </div>
          <span style="margin-left:auto;font-size:.7rem;color:#E2001A">Aktuelle Meldung</span>
        </div>
        ${hatGleicheVeranstaltung ? `<div style="padding:6px 12px;background:rgba(0,51,102,0.15);font-size:.72rem;font-weight:700;color:#7eb3ff;text-transform:uppercase;letter-spacing:.05em">📅 Gleiche Veranstaltung: ${esc(aktuelle.wettbewerbText)}</div>` : ''}
        ${kandidaten.length ? kandidaten.map((e,i)=>`
        ${i === gleicheVeranstaltung.length && gleicheVeranstaltung.length > 0 && i < kandidaten.length ? '<div style="padding:6px 12px;background:rgba(255,255,255,0.05);font-size:.72rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em">Andere Meldungen</div>' : ''}
        <div style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px">
          <input type="checkbox" class="zf-check" value="${e.id}" ${i < gleicheVeranstaltung.length ? 'checked' : ''} style="accent-color:#0B63CE">
          <div>
            <div style="font-weight:600;font-size:.85rem">${esc(e.titel)}</div>
            <div style="font-size:.75rem;color:#888">${esc(e.sportartText||'–')} · ${e.datum?new Date(e.datum).toLocaleDateString('de-DE'):''} · ${esc(e.beteiligte?.[0]?.anzeigename||'–')}</div>
          </div>
        </div>`).join('') : '<div style="padding:16px;text-align:center;color:#888;font-size:.85rem">Keine weiteren Meldungen gefunden.</div>'}
      </div>

      <div style="margin-top:12px">
        <label style="font-weight:600;display:block;margin-bottom:4px;font-size:.85rem">Titel der zusammengefassten Meldung:</label>
        <input type="text" id="zf-titel" value="${esc(aktuelle.wettbewerbText||aktuelle.titel)}"
          style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:8px 10px;font-size:.85rem">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="fuehreMeldungenZusammen('${erfolgId}')">🔗 Zusammenfassen</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

function zfAlleVeranstaltungWaehlen() {
  // Alle Checkboxen der gleichen Veranstaltung auswählen
  document.querySelectorAll('.zf-check').forEach(cb => {
    // Prüfe ob diese Meldung zur gleichen Veranstaltung gehört
    // (die ersten N Checkboxen sind von der gleichen Veranstaltung)
    cb.checked = true;
  });
  toast('Alle Meldungen dieser Veranstaltung ausgewählt', 'info');
}

async function fuehreMeldungenZusammen(hauptId) {
  const typ = document.querySelector('input[name="zf-typ"]:checked')?.value || 'mehrtitel';
  const titel = document.getElementById('zf-titel')?.value.trim();
  const gewaehlteIds = [...document.querySelectorAll('.zf-check:checked')].map(cb=>cb.value);

  if (!gewaehlteIds.length) { toast('Bitte mindestens eine weitere Meldung auswählen.', 'warning'); return; }
  if (!titel) { toast('Bitte einen Titel eingeben.', 'warning'); return; }

  const alle = await ladeErfolge();
  const hauptMeldung = alle.find(e=>e.id===hauptId);
  const weitereIds = gewaehlteIds;
  const weitereIds_set = new Set(weitereIds);
  const weitere = alle.filter(e=>weitereIds_set.has(e.id));
  const alleMeldungen = [hauptMeldung, ...weitere].filter(Boolean);

  // Alle Beteiligten sammeln
  const alleBeteiligte = [];
  const seenNames = new Set();
  for (const m of alleMeldungen) {
    for (const b of (m.beteiligte||[])) {
      if (b.anzeigename && !seenNames.has(b.anzeigename)) {
        seenNames.add(b.anzeigename);
        alleBeteiligte.push(b);
      }
    }
  }

  // Ergebnis-Text aus allen Meldungen
  const erfolgListe = alleMeldungen.map(m => {
    const _bArr = m.beteiligte || [];
    const athlet = _bArr.map(b => b.anzeigename || b.name || '').filter(Boolean).join(', ') || '–';
    const platz = m.platzierung ? m.platzierung + '. Platz – ' : '';
    return `${athlet}: ${platz}${m.titel}`;
  }).join(' | ');
  const bestePlatz = Math.min(...alleMeldungen.map(m=>m.platzierung||99).filter(p=>p<99));
  const medaille = bestePlatz===1?'Gold':bestePlatz===2?'Silber':bestePlatz===3?'Bronze':'keine';
  const erste = alleMeldungen[0];

  // Neue zusammengefasste Meldung erstellen
  const res = await DB.erstelleErfolg({
    meldungsart: typ === 'bilanz' ? 'Teamerfolg' : 'Einzelerfolg',
    titel,
    sportartId: erste.sportartId||null,
    sportartText: erste.sportartText||'',
    wettbewerbText: erste.wettbewerbText||'',
    datum: erste.datum,
    ort: erste.ort||'',
    ebene: erste.ebene||'',
    platzierung: bestePlatz < 99 ? bestePlatz : null,
    medaille,
    ergebnisText: erfolgListe,
    status: 'Eingereicht',
  }, alleBeteiligte);

  if (!res?.ok) { toast('Fehler: ' + (res?.fehler||'Unbekannt'), 'danger'); return; }

  // Originalmeldungen in Papierkorb (optional)
  const loeschen = confirm(`Zusammengefasste Meldung erstellt!\n\nSollen die ${alleMeldungen.length} Original-Meldungen in den Papierkorb verschoben werden?`);
  if (loeschen) {
    for (const m of alleMeldungen) {
      try { await DB.softDelete(m.id, 'Zusammengefasst in: ' + titel); } catch(_) {}
    }
  }

  document.querySelector('.modal-overlay')?.remove();
  APP._erfolgeCache = null;
  toast('✅ Meldungen zusammengefasst!', 'success');
  navigateTo('meine-meldungen');
}

async function dupliziereMeldung(erfolgId) {
  if (!confirm('Meldung duplizieren?\n\nEs wird eine Kopie als Entwurf erstellt.')) return;

  try {
    // Original laden
    const original = await DB.getErfolgById(erfolgId);
    if (!original) throw new Error('Meldung nicht gefunden');

    // Neue Meldung anlegen (ohne ID, ohne Erfolgsnummer – wird automatisch generiert)
    const { data: neu, error } = await Backend.client
      .from('achievements')
      .insert([{
        report_type:    original.meldungsart,
        title:          'Kopie: ' + original.titel,
        sport_id:       original.sportartId || null,
        discipline:     original.disziplin || null,
        competition_id: original.wettbewerbId || null,
        event_date:     original.datum || null,
        location:       original.ort || null,
        level:          original.ebene || null,
        placement:      original.platzierung || null,
        medal:          original.medaille || 'keine',
        result_value:   original.ergebnisWert || null,
        result_unit:    original.ergebnisEinheit || null,
        short_info:     original.kurzinfo || null,
        source_url:     original.quelleUrl || null,
        article_text:   original.textArtikel || null,
        status:         'Entwurf',
        reporter_id:    Auth.id(),
        reporter_name:  Auth.name(),
        submitted_at:   new Date().toISOString(),
        consent_checked: false,
      }])
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Beteiligte kopieren
    if (original.beteiligte?.length) {
      for (const b of original.beteiligte) {
        await Backend.client.from('achievement_participants').insert({
          achievement_id:   neu.id,
          student_id:       b.schuelerId || null,
          participant_role: b.anzeigename || b.rolle || 'Athlet',
          consent_status:   'Nicht geprüft',
        });
      }
    }

    // Protokoll
    await DB.protokolliere(neu.id, 'Entwurf', 'Entwurf', `Dupliziert von Meldung ${erfolgId}`);

    APP._erfolgeCache = null;
    toast('✅ Meldung dupliziert – Entwurf geöffnet', 'success');
    navigateTo('erfolg-detail', { currentErfolgId: neu.id });
  } catch(err) {
    toast('Fehler beim Duplizieren: ' + err.message, 'danger');
  }
}

// ══════════════════════════════════════════════════════════════
// UX-VERBESSERUNGEN
// ══════════════════════════════════════════════════════════════

// ── 1. KEYBOARD SHORTCUTS ─────────────────────────────────────
(function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Escape: Modal schließen
    if (e.key === 'Escape') {
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) { overlay.remove(); return; }
    }
    // Strg+S: Formular speichern
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const saveBtn = document.querySelector('#tab-bearbeiten .btn-primary');
      if (saveBtn && !saveBtn.disabled) { saveBtn.click(); return; }
      // Fallback: Einreichen-Button
      const submitBtn = document.querySelector('.btn-primary[onclick*="speichereErfolg"]') ||
                        document.querySelector('.btn-primary[onclick*="speichereTeam"]');
      if (submitBtn) submitBtn.click();
    }
    // Strg+Enter: Meldung einreichen
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const einreichenBtn = document.querySelector('[onclick*="Eingereicht"]');
      if (einreichenBtn) einreichenBtn.click();
    }
  });
})();

// ── 2. LEERE ZUSTÄNDE ─────────────────────────────────────────
function renderLeerZustand(icon, titel, text, btnLabel, btnAction) {
  return `<div style="text-align:center;padding:60px 20px;color:var(--slzb-text-muted)">
    <div style="font-size:3rem;margin-bottom:16px">${icon}</div>
    <h3 style="margin-bottom:8px;color:var(--slzb-text)">${titel}</h3>
    <p style="margin-bottom:24px;max-width:400px;margin-left:auto;margin-right:auto">${text}</p>
    ${btnLabel ? `<button class="btn btn-primary" onclick="${btnAction}">${btnLabel}</button>` : ''}
  </div>`;
}

// ── 3. ZEICHEN-ZÄHLER ─────────────────────────────────────────
function initZeichenZaehler() {
  // Für alle Textareas mit data-maxlength
  document.querySelectorAll('textarea[data-maxlength]').forEach(ta => {
    const max = parseInt(ta.dataset.maxlength);
    let counter = ta.nextElementSibling;
    if (!counter || !counter.classList.contains('char-counter')) {
      counter = document.createElement('div');
      counter.className = 'char-counter';
      counter.style.cssText = 'font-size:.75rem;text-align:right;margin-top:2px;color:var(--slzb-text-muted)';
      ta.parentNode.insertBefore(counter, ta.nextSibling);
    }
    const update = () => {
      const len = ta.value.length;
      counter.textContent = `${len} / ${max} Zeichen`;
      counter.style.color = len > max * 0.9 ? '#E2001A' : len > max * 0.75 ? '#E07000' : 'var(--slzb-text-muted)';
    };
    ta.addEventListener('input', update);
    update();
  });
}

// Zeichen-Zähler nach jedem Seitenwechsel initialisieren
// navigateTo-Override entfernt – Initialisierung erfolgt direkt in switchTab

// ── 4. FILTERSTATUS MERKEN ────────────────────────────────────
const FilterState = {
  _state: {},
  save(page, filters) {
    this._state[page] = { ...filters, _ts: Date.now() };
  },
  load(page) {
    const s = this._state[page];
    if (!s) return null;
    // Filter nach 30 Minuten vergessen
    if (Date.now() - s._ts > 30 * 60 * 1000) { delete this._state[page]; return null; }
    return s;
  },
  apply(page) {
    const s = this.load(page);
    if (!s) return;
    setTimeout(() => {
      Object.entries(s).forEach(([key, val]) => {
        if (key === '_ts') return;
        const el = document.getElementById(key);
        if (el) el.value = val;
      });
      // Filter auslösen
      if (page === 'archiv' && typeof filterArchiv === 'function') filterArchiv();
    }, 100);
  }
};

// Archiv-Filter speichern
function filterArchivMitState() {
  FilterState.save('archiv', {
    'archiv-suche':   document.getElementById('archiv-suche')?.value || '',
    'archiv-sportart': document.getElementById('archiv-sportart')?.value || '',
    'archiv-status':  document.getElementById('archiv-status')?.value || '',
    'archiv-ebene':   document.getElementById('archiv-ebene')?.value || '',
  });
  if (typeof filterArchiv === 'function') filterArchiv();
}

// ── 5. ÄNDERUNGSINDIKATOR (kein Autosave – manuell speichern) ─
function initAutosave() {
  // Zeigt "Nicht gespeicherte Änderungen" wenn Felder geändert werden
  const bearbeitenTab = document.getElementById('tab-bearbeiten');
  if (!bearbeitenTab || !APP.currentErfolgId) return;
  if (bearbeitenTab.dataset.autosaveInit === APP.currentErfolgId) return;
  bearbeitenTab.dataset.autosaveInit = APP.currentErfolgId;

  const felder = bearbeitenTab.querySelectorAll('input, textarea, select');
  if (!felder.length) return;

  felder.forEach(el => el.addEventListener('input', () => {
    const hint = document.getElementById('autosave-hint');
    if (hint) { hint.textContent = '✏️ Nicht gespeicherte Änderungen'; hint.style.opacity = '0.7'; }
    // Speichern-Button hervorheben
    const btn = document.querySelector('#tab-bearbeiten .btn-primary');
    if (btn) btn.style.animation = 'pulse 1s ease';
  }));
}

// ── FORMULAR-VALIDIERUNG ──────────────────────────────────────
function initFormValidierung() {
  document.querySelectorAll('input[required], textarea[required]').forEach(el => {
    el.addEventListener('blur', () => {
      if (!el.value.trim()) {
        el.style.borderColor = '#E2001A';
        el.style.boxShadow = '0 0 0 2px rgba(226,0,26,0.15)';
      } else {
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }
    });
    el.addEventListener('input', () => {
      if (el.value.trim()) {
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }
    });
  });
}

// ── TOAST MIT RÜCKGÄNGIG ──────────────────────────────────────
function toastMitRueckgaengig(msg, undoFn, timeout=5000) {
  const t = document.createElement('div');
  t.className = 'alert alert-success';
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;max-width:420px;' +
    'box-shadow:0 4px 20px rgba(0,0,0,.2);display:flex;align-items:center;gap:12px;animation:slideUp .2s ease';
  t.innerHTML = `<span class="alert-icon">✅</span><span style="flex:1">${esc(msg)}</span>` +
    `<button class="btn btn-ghost btn-sm" style="white-space:nowrap;border:1px solid rgba(255,255,255,.3)">↩️ Rückgängig</button>`;
  const btn = t.querySelector('button');
  let undone = false;
  btn.onclick = () => {
    undone = true;
    t.remove();
    if (undoFn) undoFn();
  };
  document.body.appendChild(t);
  setTimeout(() => { if (!undone) t.remove(); }, timeout);
}

// ══════════════════════════════════════════════════════════════
// POSTER-EDITOR: Editierbare Felder für Ausgabe-Modals
// ══════════════════════════════════════════════════════════════

// Gibt das HTML für die editierbaren Poster-Felder zurück
function posterEditorHTML(e) {
  const athlet = (e.beteiligte||[]).map(b=>b.anzeigename||'').filter(n=>n&&n!=='–'&&n!=='Athlet').join(', ');
  const medailleOptionen = ['keine','Gold','Silber','Bronze'].map(m=>
    `<option value="${m}" ${(e.medaille||'keine')===m?'selected':''}>${m==='keine'?'–':m}</option>`
  ).join('');
  const ebeneOptionen = ['','Schulebene','Bezirk','Landesebene','Bundesebene','International','Weltmeisterschaft','Olympia'].map(eb=>
    `<option value="${eb}" ${(e.ebene||'')===eb?'selected':''}>${eb||'–'}</option>`
  ).join('');

  return `<div id="poster-editor" style="background:rgba(255,255,255,.06);border-radius:8px;padding:12px;margin-bottom:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="color:#fff;font-size:.8rem;font-weight:700">✏️ Poster-Inhalte anpassen</span>
      <button class="btn btn-ghost btn-sm" onclick="posterEditorAktualisieren()" style="color:#E2001A;border-color:#E2001A;font-size:.75rem">🔄 Vorschau aktualisieren</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div>
        <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Titel</label>
        <input id="pe-titel" type="text" value="${esc(e.titel||'')}"
          style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem">
      </div>
      <div>
        <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Athlet / Team</label>
        <input id="pe-athlet" type="text" value="${esc(athlet)}"
          style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem"
          placeholder="Name des Athleten">
      </div>
      <div>
        <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Wettbewerb</label>
        <input id="pe-wettbewerb" type="text" value="${esc(e.wettbewerbText||'')}"
          style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem">
      </div>
      <div>
        <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Datum</label>
        <input id="pe-datum" type="date" value="${e.datum||''}"
          style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem">
      </div>
      <div>
        <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Ort</label>
        <input id="pe-ort" type="text" value="${esc(e.ort||'')}"
          style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem"
          placeholder="z.B. Berlin">
      </div>
      <div>
        <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Platzierung</label>
        <input id="pe-platz" type="number" min="1" max="99" value="${e.platzierung||''}"
          style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem"
          placeholder="z.B. 1">
      </div>
      <div>
        <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Medaille</label>
        <select id="pe-medaille" style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem">
          ${medailleOptionen}
        </select>
      </div>
      <div>
        <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Ebene</label>
        <select id="pe-ebene" style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem">
          ${ebeneOptionen}
        </select>
      </div>
    </div>
    <div style="margin-top:8px">
      <label style="color:#aaa;font-size:.72rem;display:block;margin-bottom:2px">Sportart</label>
      <input id="pe-sportart" type="text" value="${esc(e.sportartText||'')}"
        style="width:100%;background:#222;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 8px;font-size:.8rem"
        placeholder="z.B. Judo">
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1)">
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="zeigeBildPositionEditor()" style="font-size:.75rem">🖼️ Bildausschnitt</button>
        <p style="color:#666;font-size:.7rem;margin:0;align-self:center">💡 Nur für diese Ausgabe</p>
      </div>
      <button id="pe-save-btn" class="btn btn-outline btn-sm" onclick="posterEntwurfSpeichern(window._a3Erfolg?'a3':window._bsErfolg?'bildschirm':'social')" style="color:#C9A227;border-color:#C9A227;font-size:.75rem">💾 Entwurf speichern</button>
    </div>
  </div>`;
}

// Liest die Editor-Felder aus und gibt ein modifiziertes Erfolg-Objekt zurück
function posterEditorWerte(e) {
  const athlet = document.getElementById('pe-athlet')?.value?.trim() || '';
  return {
    ...e,
    titel:        document.getElementById('pe-titel')?.value?.trim()     || e.titel,
    wettbewerbText: document.getElementById('pe-wettbewerb')?.value?.trim() || e.wettbewerbText,
    datum:        document.getElementById('pe-datum')?.value             || e.datum,
    ort:          document.getElementById('pe-ort')?.value?.trim()       || e.ort,
    platzierung:  parseInt(document.getElementById('pe-platz')?.value)   || e.platzierung,
    medaille:     document.getElementById('pe-medaille')?.value          || e.medaille,
    ebene:        document.getElementById('pe-ebene')?.value             || e.ebene,
    sportartText: document.getElementById('pe-sportart')?.value?.trim()  || e.sportartText,
    // Athletenname als Beteiligter überschreiben
    beteiligte: athlet
      ? [{ anzeigename: athlet, rolle: 'Athlet', schuelerId: null, einwilligungsstatus: 'Nicht geprüft' }]
      : e.beteiligte,
  };
}

// Aktualisiert die aktive Vorschau mit den Editor-Werten
async function posterEditorAktualisieren() {
  const e = window._a3Erfolg || window._bsErfolg || window._smErfolg;
  if (!e) return;

  // Validierung: Warnungen bei fehlenden Feldern
  const warnungen = [];
  const titel = document.getElementById('pe-titel')?.value?.trim();
  const athlet = document.getElementById('pe-athlet')?.value?.trim();
  const datum = document.getElementById('pe-datum')?.value;
  const wettbewerb = document.getElementById('pe-wettbewerb')?.value?.trim();

  if (!titel) warnungen.push('⚠️ Kein Titel eingetragen');
  if (!athlet) warnungen.push('ℹ️ Kein Athletenname – Poster zeigt nur Titel/Platzierung');
  if (!datum) warnungen.push('ℹ️ Kein Datum eingetragen');
  if (!wettbewerb) warnungen.push('ℹ️ Kein Veranstaltungsname eingetragen');

  // Warnungen im Editor anzeigen
  let warnEl = document.getElementById('pe-warnungen');
  if (!warnEl) {
    warnEl = document.createElement('div');
    warnEl.id = 'pe-warnungen';
    warnEl.style.cssText = 'margin-top:8px;font-size:.72rem;';
    const editor = document.getElementById('poster-editor');
    if (editor) editor.appendChild(warnEl);
  }
  if (warnungen.length) {
    warnEl.innerHTML = warnungen.map(w =>
      `<div style="color:${w.startsWith('⚠️')?'#E2001A':'#888'};margin-bottom:2px">${w}</div>`
    ).join('');
  } else {
    warnEl.innerHTML = '<div style="color:#00c853;font-size:.72rem">✅ Alle Felder ausgefüllt</div>';
  }
  const eNeu = posterEditorWerte(e);

  // Welches Modal ist aktiv?
  if (window._a3Erfolg) {
    window._a3Erfolg = eNeu;
    await zeichneA3Variante('a3-canvas', eNeu, window._a3Variante || 1);
  } else if (window._bsErfolg) {
    window._bsErfolg = eNeu;
    await wechsleBildschirmFormat(window._bsFormat || 'hochformat', eNeu.id);
  } else if (window._smErfolg) {
    window._smErfolg = eNeu;
    await wechsleSocialFormat(window._smFormat || 'beitrag', eNeu.id);
  }
  toast('✅ Vorschau aktualisiert', 'success');
  // Flagge als HTML-Overlay (CORS-sicher, verschiebbar)
  const _cdFlaggeAktuell = document.getElementById('cd-flagge-override')?.value?.trim() ||
    (typeof ortZuFlagge === 'function' ? ortZuFlagge(
      document.getElementById('cd-land')?.value ||
      document.getElementById('cd-ort')?.value || '') : null);
  if (_cdFlaggeAktuell && _cdFlaggeAktuell !== '\ud83c\udf0d' && !window['cd-canvas_flaggeEntfernt']) {
    setTimeout(() => {
      if (typeof slzbZeigeFlaggeAlsOverlay === 'function') {
        slzbZeigeFlaggeAlsOverlay('cd-canvas', _cdFlaggeAktuell, '', { draggable: true, removable: true });
      }
    }, 200);
  }
}

// ══════════════════════════════════════════════════════════════
// POSTER-ENTWÜRFE SPEICHERN & LADEN
// ══════════════════════════════════════════════════════════════

// Entwurf speichern (Parameter + optional PNG)
async function posterEntwurfSpeichern(typ, variante, format) {
  const e = window._a3Erfolg || window._bsErfolg || window._smErfolg;
  if (!e) { toast('Kein aktiver Entwurf', 'warning'); return; }
  const werte = posterEditorWerte(e);
  const notiz = prompt('Optionale Notiz (z.B. "Finale Version"):');
  if (notiz === null) return;
  const btn = document.getElementById('pe-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Wird gespeichert...'; }
  try {
    const vorhandene = await ladePosterEntwuerfe(e.id, typ);
    const neueVersion = vorhandene.length > 0 ? (vorhandene[0].version||vorhandene.length) + 1 : 1;
    const letzteId = vorhandene.length > 0 ? vorhandene[0].id : null;
    // Max 5 Versionen: älteste löschen
    if (vorhandene.length >= 5) {
      for (const alt of vorhandene.slice(4)) {
        if (alt.storage_path) await Backend.client.storage.from('poster-exports').remove([alt.storage_path]);
        await Backend.client.from('poster_drafts').delete().eq('id', alt.id);
      }
    }
    const draft = {
      achievement_id: e.id, typ,
      variante: variante || window._a3Variante || 1,
      format: format || window._screenFormat || window._socialFormat || 'hochformat',
      version: neueVersion, parent_id: letzteId,
      titel: werte.titel || null,
      athlet: (werte.beteiligte||[]).map(b=>b.anzeigename||'').filter(n=>n&&n!=='–'&&n!=='Athlet').join(', ') || null,
      wettbewerb: werte.wettbewerbText || null,
      datum: werte.datum || null,
      ort: werte.ort || null,
      platzierung: werte.platzierung || null,
      medaille: werte.medaille || 'keine',
      ebene: werte.ebene || null,
      sportart: werte.sportartText || null,
      notiz: notiz || null,
      erstellt_von: Auth.id(),
      erstellt_von_name: Auth.name(),
    };
    // PNG hochladen
    const cId = typ==='a3'?'a3-canvas':typ==='bildschirm'?'screen-canvas':'social-canvas';
    const cv = document.getElementById(cId);
    if (cv) {
      try {
        const blob = await new Promise(r => cv.toBlob(r, 'image/png', 0.92));
        const pfad = Auth.id()+'/'+e.id+'_'+typ+'_v'+neueVersion+'_'+Date.now()+'.png';
        const { error: upErr } = await Backend.client.storage.from('poster-exports').upload(pfad, blob, { contentType: 'image/png' });
        if (!upErr) draft.storage_path = pfad;
        else console.warn('PNG-Upload:', upErr.message);
      } catch(pe) { console.warn('PNG:', pe.message); }
    }
    const { error } = await Backend.client.from('poster_drafts').insert([draft]);
    if (error) throw new Error(error.message);
    toast('\u2705 Version '+neueVersion+' gespeichert'+(draft.storage_path?' (inkl. PNG)':'')+'!', 'success');
    await renderPosterEntwuerfeInTab(e.id);
  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\ud83d\udcbe Entwurf speichern'; }
  }
}


// Alle Entwürfe einer Meldung laden (optional nach Typ filtern)
async function ladePosterEntwuerfe(erfolgId, typ) {
  let q = Backend.client
    .from('poster_drafts')
    .select('*')
    .eq('achievement_id', erfolgId)
    .order('version', { ascending: false });
  if (typ) q = q.eq('typ', typ);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

// Entwurf öffnen (Parameter in Editor laden + Poster zeichnen)
async function posterEntwurfOeffnen(draftId) {
  const { data: draft, error } = await Backend.client
    .from('poster_drafts').select('*').eq('id', draftId).single();
  if (error || !draft) { toast('Entwurf nicht gefunden', 'danger'); return; }

  if (draft.typ === 'a3') await zeigeA3Vorschau(draft.achievement_id);
  else if (draft.typ === 'bildschirm') await zeigeBildschirmModal(draft.achievement_id);
  else await zeigeSocialModal(draft.achievement_id);

  setTimeout(() => {
    const felder = {
      'pe-titel': draft.titel||'', 'pe-athlet': draft.athlet||'',
      'pe-wettbewerb': draft.wettbewerb||'', 'pe-datum': draft.datum||'',
      'pe-ort': draft.ort||'', 'pe-platz': draft.platzierung||'',
      'pe-medaille': draft.medaille||'keine', 'pe-ebene': draft.ebene||'',
      'pe-sportart': draft.sportart||'',
    };
    Object.entries(felder).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    posterEditorAktualisieren();
    toast('📂 Version ' + (draft.version||'?') + ' geladen', 'success');
  }, 600);
}

// Entwurf löschen
async function posterEntwurfLoeschen(draftId, erfolgId) {
  if (!confirm('Entwurf löschen?')) return;
  try {
    const { data: draft } = await Backend.client
      .from('poster_drafts').select('storage_path').eq('id', draftId).single();
    if (draft?.storage_path) {
      await Backend.client.storage.from('poster-exports').remove([draft.storage_path]);
    }
    await Backend.client.from('poster_drafts').delete().eq('id', draftId);
    toast('🗑️ Entwurf gelöscht', 'success');
    await renderPosterEntwuerfeInTab(erfolgId);
  } catch(err) {
    toast('Fehler: ' + err.message, 'danger');
  }
}

// Entwurfs-Liste mit Versions-Timeline im Ausgaben-Tab rendern
async function renderPosterEntwuerfeInTab(erfolgId) {
  const container = document.getElementById('poster-entwuerfe-liste');
  if (!container) return;
  container.innerHTML = '<p class="text-muted text-sm">⏳ Lade Entwürfe...</p>';
  try {
    const drafts = await ladePosterEntwuerfe(erfolgId);
    if (!drafts.length) {
      container.innerHTML = '<p class="text-muted text-sm">Noch keine gespeicherten Entwürfe. Öffne eine Ausgabe und klicke auf "💾 Entwurf speichern".</p>';
      return;
    }
    const typLabel = { a3: '📄 A3', bildschirm: '🖥️ Bildschirm', social: '📱 Social' };
    const typFarbe = { a3: '#003366', bildschirm: '#0B63CE', social: '#E07000' };

    // Gruppiere nach Typ
    const nachTyp = {};
    drafts.forEach(d => {
      if (!nachTyp[d.typ]) nachTyp[d.typ] = [];
      nachTyp[d.typ].push(d);
    });

    let html = '';
    for (const [typ, versionen] of Object.entries(nachTyp)) {
      html += `<div style="margin-bottom:16px">
        <div style="font-weight:700;color:${typFarbe[typ]||'#333'};margin-bottom:8px;font-size:.85rem">
          ${typLabel[typ]||typ} – ${versionen.length} Version${versionen.length!==1?'en':''}
        </div>
        <div style="border-left:3px solid ${typFarbe[typ]||'#ccc'};padding-left:12px">`;

      versionen.forEach((d, idx) => {
        const istNeueste = idx === 0;
        html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.06)">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:${istNeueste?typFarbe[typ]||'#003366':'#e0e0e0'};
            color:${istNeueste?'#fff':'#666'};display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700">
            v${d.version||'?'}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:.82rem;font-weight:${istNeueste?'700':'400'}">
              ${esc(d.notiz||'Kein Kommentar')}
              ${istNeueste?'<span style="background:#00c853;color:#fff;font-size:.65rem;padding:1px 6px;border-radius:10px;margin-left:6px">Aktuell</span>':''}
            </div>
            <div style="font-size:.72rem;color:#888;margin-top:2px">
              ${fmtDT(d.erstellt_am)} · ${esc(d.erstellt_von_name||'–')}
              ${d.storage_path?'· <span style="color:#00c853">PNG ✓</span>':''}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-outline btn-sm" onclick="posterEntwurfOeffnen('${d.id}')"
              style="font-size:.72rem;padding:3px 8px">📂 Öffnen</button>
            <button class="btn btn-ghost btn-sm" onclick="posterEntwurfLoeschen('${d.id}','${erfolgId}')"
              style="font-size:.72rem;padding:3px 8px;color:#c0392b">🗑️</button>
          </div>
        </div>`;
      });

      html += '</div></div>';
    }
    container.innerHTML = html;
  } catch(err) {
    container.innerHTML = `<p class="text-muted text-sm">Fehler: ${esc(err.message)}</p>`;
  }
}

// ══════════════════════════════════════════════════════════════
// PUSH AN REDAKTION: Neue Meldung eingereicht
// ══════════════════════════════════════════════════════════════
async function sendeRedaktionsPush(erfolgId, titel) {
  // Bewusst deaktiviert: Die Edge Function notify-status-change ist nicht
  // bereitgestellt. Diese No-op-Funktion erhält bestehende Aufrufe, löst aber
  // keine fehlgeschlagenen Netzwerkrequests aus.
  console.info('[Push] Übersprungen:', { erfolgId, titel });
  return { ok: true, skipped: true };
}

// ══════════════════════════════════════════════════════════════
// SPORTLER/IN DES MONATS – ABSTIMMUNG
// ══════════════════════════════════════════════════════════════

// ── Abstimmungs-Verwaltung (Admin/Redaktion) ──────────────────
async function renderVotingVerwaltung() {
  const { data: kampagnen } = await Backend.client
    .from('voting_campaigns').select('*').order('erstellt_am', { ascending: false });

  // Stimmenanzahl laden
  const stimmenMap = {};
  if (kampagnen?.length) {
    const { data: stimmen } = await Backend.client.from('voting_votes').select('campaign_id');
    (stimmen||[]).forEach(s => { stimmenMap[s.campaign_id] = (stimmenMap[s.campaign_id]||0)+1; });
  }

  const statusBadge = (s) => ({
    entwurf: '<span class=\"badge badge-entwurf\">📝 Entwurf</span>',
    aktiv:   '<span class=\"badge badge-freigegeben\">🗳️ Aktiv</span>',
    beendet: '<span class=\"badge badge-archiviert\">✅ Beendet</span>',
  }[s] || s);

  const karte = (k) => {
    const st = stimmenMap[k.id] || 0;
    const abgelaufen = k.end_at && new Date(k.end_at) < new Date() && k.status === 'aktiv';
    const farbe = k.status==='aktiv'?'#00c853':k.status==='entwurf'?'#888':'#003366';
    return `<div class=\"card\" style=\"border-left:4px solid ${farbe}\">
      <div class=\"card-body\">
        <div class=\"flex items-center gap-2 mb-1\">${statusBadge(k.status)}
          ${abgelaufen?'<span class=\"badge\" style=\"background:#E2001A;color:#fff\">⏰ Abgelaufen</span>':''}
        </div>
        <div style=\"font-weight:700;margin-bottom:4px\">${esc(k.titel)}</div>
        <div class=\"text-sm text-muted mb-1\">${k.start_at?`${new Date(k.start_at).toLocaleDateString('de-DE')} – ${new Date(k.end_at).toLocaleDateString('de-DE')}`:'Kein Zeitraum'}</div>
        <div class=\"text-sm mb-3\" style=\"color:var(--slzb-primary);font-weight:600\">${st} Stimme${st!==1?'n':''}</div>
        <div class=\"flex gap-2\" style=\"flex-wrap:wrap\">
          <button class=\"btn btn-outline btn-sm\" onclick=\"zeigeVotingAbstimmung('${k.id}')\">🗳️ Öffnen</button>
          <button class=\"btn btn-ghost btn-sm\" onclick=\"zeigeVotingLink('${k.id}')\">🔗 Link</button>
          <button class=\"btn btn-ghost btn-sm\" onclick=\"zeigeVotingAushang('${k.id}')\">📢 Poster</button>
          ${(Auth.canDo('bearbeiten')||Auth.canDo('voting'))?`
            <button class=\"btn btn-ghost btn-sm\" onclick=\"bearbeiteVotingKampagne('${k.id}')\">✏️ Bearbeiten</button>
            <button class=\"btn btn-ghost btn-sm\" onclick=\"zeigeVotingErgebnis('${k.id}')\">📊 Ergebnis</button>
            <button class=\"btn btn-ghost btn-sm\" onclick=\"toggleVotingStatus('${k.id}','${k.status}')\">
              ${k.status==='aktiv'?'⏹️ Beenden':k.status==='entwurf'?'▶️ Aktivieren':'🔄 Reaktivieren'}
            </button>
            <button class=\"btn btn-ghost btn-sm\" onclick=\"loescheVotingKampagne('${k.id}','${esc(k.titel)}')\" style=\"color:#c0392b\">🗑️ Löschen</button>
          `:''}
        </div>
      </div>
    </div>`;
  };

  const aktive   = (kampagnen||[]).filter(k=>k.status==='aktiv');
  const entwuerfe= (kampagnen||[]).filter(k=>k.status==='entwurf');
  const beendete = (kampagnen||[]).filter(k=>k.status==='beendet');

  return `<div class=\"page\">
    <div class=\"page-header flex items-center gap-3\">
      <h1>🏆 Sportler/in des Monats</h1>
      ${Auth.canDo('voting')?`<button class=\"btn btn-primary btn-sm\" onclick=\"zeigeVotingErstellen()\">+ Neue Abstimmung</button>`:''}
      ${Auth.canDo('voting')?`<button class=\"btn btn-primary btn-sm\" onclick=\"zeigeJahreswahl()\">🏆 Sportler des Jahres</button>`:''}
    </div>
    ${!kampagnen?.length?`<div class=\"alert alert-info\"><span class=\"alert-icon\">ℹ️</span><span>Noch keine Abstimmungen.</span></div>`:''}
    ${aktive.length?`<h3 style=\"margin-bottom:12px;color:#00c853\">🗳️ Aktive Abstimmung</h3><div class=\"grid grid-2 mb-4\">${aktive.map(karte).join('')}</div>`:''}
    ${entwuerfe.length?`<h3 style=\"margin-bottom:12px;color:#888\">📝 Entwürfe</h3><div class=\"grid grid-2 mb-4\">${entwuerfe.map(karte).join('')}</div>`:''}
    ${beendete.length?`<details><summary style=\"cursor:pointer;font-weight:700;margin-bottom:12px;color:var(--slzb-muted)\">✅ Beendete Abstimmungen (${beendete.length})</summary><div class=\"grid grid-2 mb-4\" style=\"margin-top:12px\">${beendete.map(karte).join('')}</div></details>`:''}
  </div>`;
}


// ── Neue Abstimmung erstellen ─────────────────────────────────

// ── Sportler des Jahres ──────────────────────────────────────
async function zeigeJahreswahl() {
  const { data: kampagnen } = await Backend.client
    .from('voting_campaigns').select('id,titel,monat,status')
    .in('status', ['beendet','aktiv']).order('monat');
  if (!kampagnen?.length) { toast('Keine abgeschlossenen Monats-Abstimmungen gefunden', 'warning'); return; }
  const ids = kampagnen.map(k => k.id);
  const { data: alleKandidaten } = await Backend.client
    .from('voting_candidates').select('*').in('campaign_id', ids).order('reihenfolge');
  if (!alleKandidaten?.length) { toast('Keine Kandidaten gefunden', 'warning'); return; }
  const { data: alleStimmen } = await Backend.client
    .from('voting_votes').select('candidate_id,campaign_id').in('campaign_id', ids);
  const stimmenMap = {};
  (alleStimmen||[]).forEach(s => { stimmenMap[s.candidate_id] = (stimmenMap[s.candidate_id]||0) + 1; });
  const siegerIds = new Set();
  kampagnen.forEach(k => {
    const kk = alleKandidaten.filter(c => c.campaign_id === k.id);
    if (!kk.length) return;
    const sieger = kk.reduce((b,c) => (stimmenMap[c.id]||0) > (stimmenMap[b.id]||0) ? c : b);
    siegerIds.add(sieger.id);
  });
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal'; modal.style.maxWidth = '700px';
  const jahr = new Date().getFullYear();
  const kandidatenHTML = alleKandidaten.map(k => {
    const istSieger = siegerIds.has(k.id);
    const kp = kampagnen.find(kp => kp.id === k.campaign_id);
    const ml = kp && kp.monat ? new Date(kp.monat+'-01').toLocaleDateString('de-DE',{month:'long',year:'numeric'}) : '';
    return '<div style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px">'
      + '<input type="checkbox" class="jahres-check" value="'+k.id+'"'
      + ' data-name="'+esc(k.name)+'" data-sport="'+esc(k.sportart||'')+'"'
      + ' data-erfolg="'+esc(k.erfolg||'')+'" data-bild="'+esc(k.bild_url||'')+'"'
      + (istSieger ? ' checked' : '') + ' style="accent-color:#E2001A">'
      + '<div>'
      + '<div style="font-weight:600;font-size:.85rem">'+esc(k.name)+'</div>'
      + '<div style="font-size:.75rem;color:#888">'+esc(k.sportart||'')+' · '+ml+(istSieger ? ' · 🏆 Monats-Sieger' : '')+'</div>'
      + '</div></div>';
  }).join('');
  modal.innerHTML = '<div class="modal-header">'
    + '<h3>🏆 Sportler/in des Jahres '+jahr+'</h3>'
    + '<button class="btn btn-ghost btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">✕</button>'
    + '</div><div class="modal-body">'
    + '<div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>'
    + '<span>Monats-Sieger werden automatisch vorgeschlagen. Auswahl anpassbar.</span></div>'
    + '<div style="max-height:300px;overflow-y:auto;border:1px solid var(--slzb-border);border-radius:8px">'
    + kandidatenHTML + '</div>'
    + '<div class="form-row cols-2 mt-3">'
    + '<div class="form-group"><label style="font-weight:600">Titel</label>'
    + '<input type="text" id="jahres-titel" value="Sportler/in des Jahres '+jahr+'" style="width:100%"></div>'
    + '<div class="form-group"><label style="font-weight:600">Ende</label>'
    + '<input type="datetime-local" id="jahres-end" style="width:100%"></div>'
    + '</div></div>'
    + '<div class="modal-footer">'
    + '<button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">Abbrechen</button>'
    + '<button class="btn btn-outline" onclick="erstelleJahreswahl(\'entwurf\')">💾 Entwurf</button>'
    + '<button class="btn btn-primary" onclick="erstelleJahreswahl(\'aktiv\')">▶️ Aktivieren</button>'
    + '</div>';
  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

async function erstelleJahreswahl(status) {
  const titel = document.getElementById('jahres-titel')?.value.trim();
  const end = document.getElementById('jahres-end')?.value || null;
  const gewaehlte = [...document.querySelectorAll('.jahres-check:checked')];
  if (!titel) { toast('Bitte Titel eingeben', 'warning'); return; }
  if (!gewaehlte.length) { toast('Bitte mindestens einen Kandidaten auswählen', 'warning'); return; }
  const jahr = new Date().getFullYear();
  const { data: kampagne, error: kErr } = await Backend.client
    .from('voting_campaigns')
    .insert([{ titel, monat: jahr+'-01', status, end_at: end, erstellt_von: Auth.id() }])
    .select('id').single();
  if (kErr) { toast('Fehler: ' + kErr.message, 'danger'); return; }
  const kandidaten = gewaehlte.map((cb, i) => ({
    campaign_id: kampagne.id, name: cb.dataset.name,
    sportart: cb.dataset.sport, erfolg: cb.dataset.erfolg,
    bild_url: cb.dataset.bild || null, reihenfolge: i+1, erstellt_von: Auth.id(),
  }));
  const { error: cErr } = await Backend.client.from('voting_candidates').insert(kandidaten);
  if (cErr) { toast('Fehler: ' + cErr.message, 'danger'); return; }
  document.querySelector('.modal-overlay')?.remove();
  toast('✅ Jahreswahl "'+titel+'" erstellt!', 'success');
  navigateTo('sportler-des-monats');
}


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
  schutzeModalVorAussenklick(overlay, modal);
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

function zeigeVotingErstellen() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  const heute = new Date().toISOString().slice(0,16);
  const inEinerWoche = new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,16);

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🏆 Neue Abstimmung erstellen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group mb-3">
        <label>Titel <span class="required">*</span></label>
        <input type="text" id="v-titel" value="Sportler/in des Monats ${new Date().toLocaleDateString('de-DE',{month:'long',year:'numeric'})}"
          style="width:100%">
      </div>
      <div class="form-row cols-2 mb-3">
        <div class="form-group">
          <label>Start</label>
          <input type="datetime-local" id="v-start" value="${heute}" style="width:100%">
        </div>
        <div class="form-group">
          <label>Ende</label>
          <input type="datetime-local" id="v-end" value="${inEinerWoche}" style="width:100%">
        </div>
      </div>
      <div class="form-group mb-4">
        <label>Beschreibung (optional)</label>
        <textarea id="v-beschreibung" rows="2" style="width:100%" placeholder="z.B. Wähle deinen Favoriten für November 2026"></textarea>
      </div>

      <h3 style="margin-bottom:8px">👤 Kandidaten (max. 3)</h3>
      <div class="alert alert-info mb-3" style="display:flex;align-items:center;gap:12px">
        <span class="alert-icon">💡</span>
        <span>Kandidaten manuell eintragen oder aus freigegebenen Meldungen auswählen.</span>
        <button class="btn btn-outline btn-sm" style="white-space:nowrap;flex-shrink:0" onclick="zeigeVotingKandidatenAuswahl()">📋 Aus Meldungen wählen</button>
      </div>
      ${[1,2,3,4,5,6,7].map(i => `
        <div class="card mb-3" style="border:2px solid var(--slzb-border)">
          <div class="card-body">
            <div style="font-weight:700;margin-bottom:10px;color:var(--slzb-primary)">Kandidat ${i}</div>
            <div class="form-row cols-2">
              <div class="form-group">
                <label>Name ${i===1?'<span class="required">*</span>':''}</label>
                <input type="text" id="v-name-${i}" placeholder="z.B. Max Mustermann" style="width:100%">
              </div>
              <div class="form-group">
                <label>Sportart</label>
                <input type="text" id="v-sport-${i}" placeholder="z.B. Judo" style="width:100%">
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label>Erfolg <span class="text-muted text-xs">(kurz, max. 100 Zeichen)</span></label>
                <input type="text" id="v-erfolg-${i}" placeholder="z.B. 🥇 1. Platz Berliner Meisterschaft" style="width:100%" maxlength="100">
              </div>
              <div class="form-group">
                <label>Klasse</label>
                <input type="text" id="v-klasse-${i}" placeholder="z.B. 10a" style="width:100%">
              </div>
              <div class="form-group">
                <label>Foto <span class="text-muted text-xs">(optional)</span></label>
                <input type="file" id="v-bild-${i}" accept="image/jpeg,image/png,image/webp"
                  style="width:100%;background:#f8f9fa;border:1px solid var(--slzb-border);border-radius:6px;padding:6px">
                <div id="v-bild-preview-${i}" style="margin-top:6px;display:none">
                  <img id="v-bild-img-${i}" style="max-height:80px;border-radius:6px;object-fit:cover">
                </div>
              </div>
            </div>
          </div>
        </div>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-outline" onclick="speichereVoting('entwurf')">💾 Als Entwurf</button>
      <button class="btn btn-primary" onclick="speichereVoting('aktiv')">▶️ Sofort aktivieren</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  // Bild-Vorschau für alle 7 Kandidaten
  [1,2,3,4,5,6,7].forEach(i => {
    const input = document.getElementById(`v-bild-${i}`);
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const preview = document.getElementById(`v-bild-preview-${i}`);
        const img = document.getElementById(`v-bild-img-${i}`);
        if (preview && img) { img.src = e.target.result; preview.style.display = 'block'; }
      };
      reader.readAsDataURL(file);
    });
  });
}

async function speichereVoting(status) {
  const titel = document.getElementById('v-titel')?.value?.trim();
  const name1 = document.getElementById('v-name-1')?.value?.trim();
  if (!titel || !name1) { toast('Titel und mindestens Kandidat 1 sind Pflicht', 'warning'); return; }

  try {
    // Kampagne anlegen
    const { data: kampagne, error: kErr } = await Backend.client
      .from('voting_campaigns')
      .insert([{
        titel,
        monat: new Date().toISOString().slice(0,7),
        beschreibung: document.getElementById('v-beschreibung')?.value?.trim() || null,
        status,
        start_at: document.getElementById('v-start')?.value || null,
        end_at:   document.getElementById('v-end')?.value   || null,
        erstellt_von: Auth.id(),
      }])
      .select('id').single();
    if (kErr) throw new Error(kErr.message);

    // Kandidaten anlegen
    for (let i = 1; i <= 7; i++) {
      const name = document.getElementById(`v-name-${i}`)?.value?.trim();
      if (!name) continue;
      // Bild hochladen in öffentlichen Bucket (für vote.html ohne Login)
      let bildUrl = null;
      const bildInput = document.getElementById(`v-bild-${i}`);

      if (bildInput?.files?.[0]) {
        // Neues Bild hochgeladen
        try {
          const file = bildInput.files[0];
          const pfad = `voting/${kampagne.id}_${i}_${Date.now()}.${file.name.split('.').pop()}`;
          const { error: upErr } = await Backend.client.storage
            .from('poster-exports')
            .upload(pfad, file, { contentType: file.type, upsert: true });
          if (!upErr) {
            const { data: urlData } = Backend.client.storage.from('poster-exports').getPublicUrl(pfad);
            bildUrl = urlData?.publicUrl || null;
          } else { console.warn('Bild-Upload:', upErr.message); }
        } catch(imgErr) { console.warn('Bild-Upload:', imgErr.message); }
      } else if (bildInput?.dataset?.storagePath) {
        // Bild aus Meldung: Signed URL (achievement-media ist privat)
        const sp = bildInput.dataset.storagePath;
        const bucket = bildInput.dataset.storageBucket || 'achievement-media';
        if (bucket === 'achievement-media') {
          // Privater Bucket → Signed URL mit langer Gültigkeit (1 Jahr)
          const { data: signedData } = await Backend.client.storage
            .from(bucket).createSignedUrl(sp, 365 * 24 * 3600);
          bildUrl = signedData?.signedUrl || null;
        } else {
          // Öffentlicher Bucket (poster-exports) → Public URL
          const { data: pubData } = Backend.client.storage.from(bucket).getPublicUrl(sp);
          bildUrl = pubData?.publicUrl || null;
        }
      } else if (bildInput?.dataset?.vorhandeneUrl) {
        bildUrl = bildInput.dataset.vorhandeneUrl;
      }
      // storage_path für spätere Signed URL Generierung
      const storagePath = bildInput?.dataset?.storagePath || null;
      const storageBucket = bildInput?.dataset?.storageBucket || 'achievement-media';
      const { error: insErr } = await Backend.client.from('voting_candidates').insert([{
        campaign_id: kampagne.id,
        name,
        sportart: document.getElementById(`v-sport-${i}`)?.value?.trim() || null,
        erfolg:   document.getElementById(`v-erfolg-${i}`)?.value?.trim() || '',
        klasse:   document.getElementById(`v-klasse-${i}`)?.value?.trim() || null,
        bild_url: bildUrl,
        storage_path: storagePath,
        storage_bucket: storageBucket,
        reihenfolge: i,
      }]);
      if (insErr) throw new Error(`Kandidat ${i}: ${insErr.message}`);
    }

    document.querySelector('.modal-overlay')?.remove();
    toast(`✅ Abstimmung ${status==='aktiv'?'gestartet':'gespeichert'}!`, 'success');
    navigateTo('voting');
  } catch(e) {
    toast('Fehler: ' + e.message, 'danger');
  }
}

// ── Abstimmungsseite (für SuS) ────────────────────────────────
async function zeigeVotingAbstimmung(kampagneId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.innerHTML = '<div class="modal-body" style="text-align:center;padding:40px"><div class="spinner"></div><p>Lade Abstimmung...</p></div>';
  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  try {
    const { data: k } = await Backend.client.from('voting_campaigns').select('*').eq('id', kampagneId).single();
    const { data: kandidaten } = await Backend.client.from('voting_candidates')
      .select('*').eq('campaign_id', kampagneId).order('reihenfolge');
    const { count: gesamtStimmen } = await Backend.client.from('voting_votes')
      .select('*', { count: 'exact', head: true }).eq('campaign_id', kampagneId);

    // Prüfe ob bereits abgestimmt
    const voterToken = getVoterToken();
    const { data: meineStimme } = await Backend.client.from('voting_votes')
      .select('candidate_id').eq('campaign_id', kampagneId).eq('voter_token', voterToken).maybeSingle();

    const istBeendet = k.status === 'beendet' || (k.end_at && new Date(k.end_at) < new Date());
    const zeigeErgebnis = istBeendet || k.ergebnis_sichtbar || meineStimme;

    // Entwurf: nur für Trainer gesperrt, Schüler/Mitarbeiter/Redaktion/Admin dürfen sehen
    const darfEntwurfSehen = ['schueler','mitarbeiter','redaktion','oea','admin'].includes(Auth.rolle());
    if (k.status === 'entwurf' && !darfEntwurfSehen) {
      modal.innerHTML = `<div class="modal-header" style="background:var(--slzb-primary);color:#fff">
        <h3 style="color:#fff;margin:0">🔒 Noch nicht aktiv</h3>
        <button class="btn btn-ghost btn-sm" style="color:#fff" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body"><div class="alert alert-warning">
        <span class="alert-icon">⚠️</span>
        <span>Diese Abstimmung ist noch ein Entwurf und noch nicht für alle sichtbar.</span>
      </div></div>`;
      return;
    }

    // Stimmen pro Kandidat laden wenn Ergebnis sichtbar
    let stimmenMap = {};
    if (zeigeErgebnis) {
      const { data: stimmen } = await Backend.client.from('voting_votes')
        .select('candidate_id').eq('campaign_id', kampagneId);
      (stimmen||[]).forEach(s => { stimmenMap[s.candidate_id] = (stimmenMap[s.candidate_id]||0) + 1; });
    }

    const maxStimmen = Math.max(...Object.values(stimmenMap), 1);

    modal.innerHTML = `
      <div class="modal-header" style="background:var(--slzb-primary);color:#fff">
        <div>
          <h3 style="color:#fff;margin:0">🏆 ${esc(k.titel)}</h3>
          ${k.beschreibung ? `<p style="color:rgba(255,255,255,.8);font-size:.85rem;margin:4px 0 0">${esc(k.beschreibung)}</p>` : ''}
          ${k.end_at && !istBeendet ? `<p style="color:#E2001A;font-size:.8rem;margin:4px 0 0">⏰ Endet: ${fmtDT(k.end_at)}</p>` : ''}
          ${istBeendet ? '<p style="color:#C9A227;font-size:.8rem;margin:4px 0 0">✅ Abstimmung beendet</p>' : ''}
        </div>
        <button class="btn btn-ghost btn-sm" style="color:#fff" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        ${meineStimme ? `<div class="alert alert-success mb-3"><span class="alert-icon">✅</span>
          <span>Du hast bereits abgestimmt. ${zeigeErgebnis ? 'Hier ist das aktuelle Ergebnis:' : 'Das Ergebnis wird nach Ende der Abstimmung bekannt gegeben.'}</span></div>` : ''}
        ${istBeendet ? `<div class="alert alert-info mb-3"><span class="alert-icon">🏆</span>
          <span>Die Abstimmung ist beendet. Insgesamt ${gesamtStimmen||0} Stimmen abgegeben.</span></div>` : ''}

        <div class="grid grid-3" style="gap:16px">
          ${(kandidaten||[]).map(k2 => {
            const stimmen = stimmenMap[k2.id] || 0;
            const prozent = gesamtStimmen ? Math.round(stimmen/gesamtStimmen*100) : 0;
            const istGewinner = zeigeErgebnis && stimmen === maxStimmen && stimmen > 0;
            const meineWahl = meineStimme?.candidate_id === k2.id;

            return `<div class="card" style="border:2px solid ${meineWahl?'var(--slzb-primary)':istGewinner&&zeigeErgebnis?'#C9A227':'var(--slzb-border)'};
              position:relative;overflow:hidden;transition:transform .2s"
              ${!meineStimme && !istBeendet ? `onclick="abstimmen('${kampagneId}','${k2.id}')" style="cursor:pointer"` : ''}>
              ${istGewinner && zeigeErgebnis ? '<div style="position:absolute;top:8px;right:8px;font-size:1.5rem">🏆</div>' : ''}
              ${meineWahl ? '<div style="position:absolute;top:8px;left:8px;background:var(--slzb-primary);color:#fff;font-size:.7rem;padding:2px 8px;border-radius:10px">Deine Wahl</div>' : ''}
              <div style="height:180px;background:#f0f4f8;overflow:hidden">
                ${k2.bild_url
                  ? `<img src="${esc(k2.bild_url)}" style="width:100%;height:100%;object-fit:contain;background:#f0f4f8" onerror="this.parentNode.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem\\'>🏃</div>'">`
                  : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem">🏃</div>'}
              </div>
              <div class="card-body">
                <div style="font-weight:700;font-size:1rem;margin-bottom:4px">${esc(k2.name)}</div>
                ${k2.sportart ? `<div style="font-size:.78rem;color:var(--slzb-primary);font-weight:600;margin-bottom:4px">${esc(k2.sportart)}${k2.klasse?' · '+esc(k2.klasse):''}</div>` : ''}
                <div style="font-size:.82rem;color:#444;margin-bottom:10px">${esc(k2.erfolg)}</div>
                ${zeigeErgebnis ? `
                  <div style="background:#f0f4f8;border-radius:6px;overflow:hidden;height:8px;margin-bottom:4px">
                    <div style="height:100%;background:${istGewinner?'#C9A227':'var(--slzb-primary)'};width:${prozent}%;transition:width 1s ease;border-radius:6px"></div>
                  </div>
                  <div style="font-size:.78rem;color:var(--slzb-muted)">${stimmen} Stimme${stimmen!==1?'n':''} (${prozent}%)</div>
                ` : (!meineStimme && !istBeendet ? `
                  <button class="btn btn-primary w-full btn-sm" onclick="abstimmen('${kampagneId}','${k2.id}')">
                    👍 Für ${esc(k2.name.split(' ')[0])} stimmen
                  </button>` : '')}
              </div>
            </div>`;
          }).join('')}
        </div>

        ${!meineStimme && !istBeendet ? `
          <p class="text-muted text-xs text-center mt-3">
            Du kannst einmal abstimmen. Die Abstimmung ist anonym.
          </p>` : ''}
      </div>`;

  } catch(e) {
    modal.innerHTML = `<div class="modal-body"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

// ── Abstimmen ─────────────────────────────────────────────────
async function abstimmen(kampagneId, kandidatId) {
  const voterToken = getVoterToken();
  try {
    const { error } = await Backend.client.from('voting_votes').insert([{
      campaign_id:  kampagneId,
      candidate_id: kandidatId,
      voter_token:  voterToken,
    }]);
    if (error) {
      if (error.code === '23505') { toast('Du hast bereits abgestimmt!', 'warning'); }
      else throw new Error(error.message);
      return;
    }
    toast('✅ Stimme abgegeben! Danke für deine Teilnahme.', 'success');
    // Modal neu laden mit Ergebnis
    document.querySelector('.modal-overlay')?.remove();
    setTimeout(() => zeigeVotingAbstimmung(kampagneId), 300);
  } catch(e) {
    toast('Fehler: ' + e.message, 'danger');
  }
}

// ── Ergebnis anzeigen (Admin) ─────────────────────────────────
async function zeigeVotingErgebnis(kampagneId) {
  const { data: k } = await Backend.client.from('voting_campaigns').select('*').eq('id', kampagneId).single();
  const { data: kandidaten } = await Backend.client.from('voting_candidates')
    .select('*').eq('campaign_id', kampagneId).order('reihenfolge');
  const { data: stimmen } = await Backend.client.from('voting_votes')
    .select('candidate_id, abgestimmt_am').eq('campaign_id', kampagneId);

  const stimmenMap = {};
  (stimmen||[]).forEach(s => { stimmenMap[s.candidate_id] = (stimmenMap[s.candidate_id]||0) + 1; });
  const gesamt = stimmen?.length || 0;
  const sorted = [...(kandidaten||[])].sort((a,b) => (stimmenMap[b.id]||0) - (stimmenMap[a.id]||0));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.style.maxWidth = '680px';

  const farben = ['#C9A227','#BFC8D2','#C2783A','#0B63CE','#00a040'];

  modal.innerHTML = `
    <div class="modal-header" style="background:var(--slzb-primary);color:#fff">
      <div>
        <h3 style="color:#fff;margin:0">📊 Ergebnis: ${esc(k.titel)}</h3>
        <p style="color:rgba(255,255,255,.7);font-size:.82rem;margin:4px 0 0">${gesamt} Stimmen abgegeben</p>
      </div>
      <button class="btn btn-ghost btn-sm" style="color:#fff" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">

      <!-- Balkendiagramm -->
      <div style="margin-bottom:24px">
        <canvas id="voting-chart" height="200"></canvas>
      </div>

      <!-- Detaillierte Ergebnisse -->
      <div style="margin-bottom:20px">
        ${sorted.map((k2, idx) => {
          const s = stimmenMap[k2.id] || 0;
          const pct = gesamt ? Math.round(s/gesamt*100) : 0;
          const medal = idx===0?'🥇':idx===1?'🥈':'🥉';
          return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;
            padding:12px;border-radius:10px;background:${idx===0?'rgba(201,162,39,0.1)':'var(--slzb-bg)'}">
            ${k2.bild_url?`<img src="${esc(k2.bild_url)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0">`
              :'<div style="width:48px;height:48px;border-radius:8px;background:#f0f4f8;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">🏃</div>'}
            <div style="flex:1;min-width:0">
              <div style="font-weight:700">${medal} ${esc(k2.name)}</div>
              ${k2.sportart?`<div style="font-size:.78rem;color:var(--slzb-primary)">${esc(k2.sportart)}</div>`:''}
              <div style="background:#f0f4f8;border-radius:4px;height:8px;margin-top:6px;overflow:hidden">
                <div style="height:100%;border-radius:4px;width:${pct}%;background:${farben[idx]||'#888'};transition:width 1s ease"></div>
              </div>
              <div style="font-size:.75rem;color:var(--slzb-muted);margin-top:3px">${s} Stimme${s!==1?'n':''} · ${pct}%</div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Aktionen -->
      <div class="flex gap-2" style="flex-wrap:wrap;border-top:1px solid var(--slzb-border);padding-top:16px">
        <button class="btn btn-outline btn-sm" onclick="toggleErgebnisSichtbar('${kampagneId}',${!k.ergebnis_sichtbar})">
          ${k.ergebnis_sichtbar ? '🔒 Ergebnis verbergen' : '👁️ Ergebnis veröffentlichen'}
        </button>
        <button class="btn btn-outline btn-sm" onclick="exportiereVotingCSV('${kampagneId}')">
          📥 CSV Export
        </button>
        <button class="btn btn-outline btn-sm" onclick="exportiereVotingPDF('${kampagneId}')">
          🖨️ PDF Export
        </button>
        ${sorted[0] ? `
          <button class="btn btn-primary btn-sm" onclick="zeigeVotingSiegerAusgaben('${sorted[0].id}','${kampagneId}')">
            🏆 Sieger-Ausgaben erstellen
          </button>` : ''}
      </div>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  // Chart.js Balkendiagramm
  setTimeout(() => {
    const canvas = document.getElementById('voting-chart');
    if (!canvas || !window.Chart) {
      // Chart.js laden
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3/dist/chart.min.js';
      script.onload = () => zeichneVotingChart(canvas, sorted, stimmenMap, gesamt, farben);
      document.head.appendChild(script);
    } else {
      zeichneVotingChart(canvas, sorted, stimmenMap, gesamt, farben);
    }
  }, 100);
}

function zeichneVotingChart(canvas, sorted, stimmenMap, gesamt, farben) {
  if (!canvas) return;
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(k => k.name),
      datasets: [{
        label: 'Stimmen',
        data: sorted.map(k => stimmenMap[k.id] || 0),
        backgroundColor: sorted.map((_, i) => farben[i] || '#888'),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = gesamt ? Math.round(ctx.raw/gesamt*100) : 0;
              return `${ctx.raw} Stimmen (${pct}%)`;
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

// CSV Export
async function exportiereVotingCSV(kampagneId) {
  const { data: k } = await Backend.client.from('voting_campaigns').select('*').eq('id', kampagneId).single();
  const { data: kandidaten } = await Backend.client.from('voting_candidates').select('*').eq('campaign_id', kampagneId);
  const { data: stimmen } = await Backend.client.from('voting_votes').select('candidate_id, abgestimmt_am').eq('campaign_id', kampagneId);

  const stimmenMap = {};
  (stimmen||[]).forEach(s => { stimmenMap[s.candidate_id] = (stimmenMap[s.candidate_id]||0)+1; });
  const gesamt = stimmen?.length || 0;
  const sorted = [...(kandidaten||[])].sort((a,b) => (stimmenMap[b.id]||0)-(stimmenMap[a.id]||0));
  let csv = 'Abstimmung;' + k.titel + '\n';
  csv += 'Datum;' + new Date().toLocaleDateString('de-DE') + '\n';
  csv += 'Gesamt Stimmen;' + gesamt + '\n\n';
  csv += 'Platz;Name;Sportart;Stimmen;Prozent\n';
  sorted.forEach((k2, idx) => {
    const s = stimmenMap[k2.id] || 0;
    const pct = gesamt ? Math.round(s/gesamt*100) : 0;
    csv += `${idx+1};${k2.name};${k2.sportart||''};${s};${pct}%
`;
  });

  const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SLZB_Abstimmung_${k.monat}_Ergebnis.csv`;
  a.click();
  toast('📥 CSV heruntergeladen', 'success');
}

// PDF Export (via Canvas → PNG → jsPDF)
async function exportiereVotingPDF(kampagneId) {
  const { data: k } = await Backend.client.from('voting_campaigns').select('*').eq('id', kampagneId).single();
  const { data: kandidaten } = await Backend.client.from('voting_candidates').select('*').eq('campaign_id', kampagneId);
  const { data: stimmen } = await Backend.client.from('voting_votes').select('candidate_id').eq('campaign_id', kampagneId);

  const stimmenMap = {};
  (stimmen||[]).forEach(s => { stimmenMap[s.candidate_id] = (stimmenMap[s.candidate_id]||0)+1; });
  const gesamt = stimmen?.length || 0;
  const sorted = [...(kandidaten||[])].sort((a,b) => (stimmenMap[b.id]||0)-(stimmenMap[a.id]||0));

  // Canvas-Ergebnis-Poster erstellen
  const canvas = document.createElement('canvas');
  canvas.width = 1587; canvas.height = 1123;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  // Hintergrund
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,1587,1123);
  ctx.fillStyle = '#003366'; ctx.fillRect(0,0,1587,120);

  // Logo
  if (_slzbLogo) {
    const r = _slzbLogo.width/_slzbLogo.height;
    ctx.drawImage(_slzbLogo, 60, 15, 90*r, 90);
  }

  // Titel
  ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Montserrat, Arial';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', 200, 50);
  ctx.fillStyle = '#E2001A'; ctx.font = 'bold 20px Montserrat, Arial';
  ctx.fillText(`🏆 ${k.titel} · Ergebnis`, 200, 85);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '14px Montserrat, Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${gesamt} Stimmen · ${new Date().toLocaleDateString('de-DE')}`, 1527, 60);

  // Balken
  const farben = ['#C9A227','#BFC8D2','#C2783A','#0B63CE'];
  const maxS = Math.max(...sorted.map(k2 => stimmenMap[k2.id]||0), 1);
  const barW = 1467; const barH = 120; const startY = 180;

  sorted.forEach((k2, idx) => {
    const s = stimmenMap[k2.id] || 0;
    const pct = gesamt ? Math.round(s/gesamt*100) : 0;
    const y = startY + idx * (barH + 20);
    const medal = idx===0?'🥇':idx===1?'🥈':'🥉';

    // Hintergrund
    ctx.fillStyle = idx===0?'rgba(201,162,39,0.1)':'#f8f9fa';
    ctx.fillRect(60, y, barW, barH);

    // Balken
    const fillW = Math.round(barW * s / maxS);
    ctx.fillStyle = farben[idx]||'#888';
    ctx.fillRect(60, y+barH-20, fillW, 20);

    // Text
    ctx.fillStyle = '#1B1C1F'; ctx.font = 'bold 22px Montserrat, Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`${medal} ${k2.name}`, 80, y+12);
    ctx.fillStyle = '#003366'; ctx.font = '16px Montserrat, Arial';
    ctx.fillText(k2.sportart||'', 80, y+42);
    ctx.fillStyle = '#333'; ctx.font = 'bold 32px Montserrat, Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${s} Stimmen (${pct}%)`, 1520, y+12);
  });

  // Footer
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 1063, 1587, 60);
  ctx.fillStyle = '#003366'; ctx.fillRect(0, 1063, 1587, 3);
  ctx.fillStyle = '#333'; ctx.font = '14px Montserrat, Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin · #SLZBerlin', 793, 1093);

  // Download
  const a = document.createElement('a');
  a.download = `SLZB_Abstimmung_${k.monat}_Ergebnis.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('🖨️ Ergebnis-Grafik heruntergeladen', 'success');
}

// Sieger-Ausgaben (A3, Bildschirm, Social)
async function zeigeVotingSiegerAusgaben(kandidatId, kampagneId) {
  const { data: k2 } = await Backend.client.from('voting_candidates').select('*').eq('id', kandidatId).single();
  const { data: kamp } = await Backend.client.from('voting_campaigns').select('*').eq('id', kampagneId).single();
  const { data: stimmen } = await Backend.client.from('voting_votes').select('candidate_id').eq('campaign_id', kampagneId);
  const stimmenMap = {};
  (stimmen||[]).forEach(s => { stimmenMap[s.candidate_id] = (stimmenMap[s.candidate_id]||0)+1; });
  const gesamt = stimmen?.length || 0;
  const siegerStimmen = stimmenMap[kandidatId] || 0;
  const pct = gesamt ? Math.round(siegerStimmen/gesamt*100) : 0;

  // Fake-Erfolg-Objekt für Poster-Funktionen
  const fakeErfolg = {
    id: kandidatId,
    titel: `${kamp.titel} – Sieger/in`,
    sportartText: k2.sportart || '',
    wettbewerbText: kamp.titel,
    beteiligte: [{ anzeigename: k2.name }],
    bilder: k2.bild_url ? [{ signedUrl: k2.bild_url }] : [],
    datum: new Date().toISOString().slice(0,10),
    kurzinfo: `${siegerStimmen} Stimmen · ${pct}% · ${gesamt} Stimmen gesamt`,
    platzierung: 1,
    medaille: 'Gold',
    ebene: 'Schulebene',
  };

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-header"><h3>🏆 Sieger-Ausgaben: ${esc(k2.name)}</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <p class="text-muted mb-3">Erstelle Ausgaben für den Sieger der Abstimmung.</p>
      <!-- Sieger-Info -->
      <div style="background:linear-gradient(135deg,rgba(201,162,39,.15),rgba(201,162,39,.05));border:1px solid rgba(201,162,39,.3);border-radius:10px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
        ${k2.bild_url ? `<img src="${esc(k2.bild_url)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #C9A227">` : '<div style="width:60px;height:60px;border-radius:50%;background:#C9A227;display:flex;align-items:center;justify-content:center;font-size:1.8rem">🏆</div>'}
        <div>
          <div style="font-weight:800;font-size:1.1rem">${esc(k2.name)}</div>
          <div style="font-size:.82rem;color:var(--slzb-text-muted)">${esc(k2.sportart||'')}${k2.klasse?' · '+esc(k2.klasse):''}</div>
          <div style="font-size:.78rem;color:#C9A227;font-weight:700;margin-top:3px">🥇 ${siegerStimmen} Stimmen (${pct}%) von ${gesamt} gesamt</div>
        </div>
      </div>

      <!-- Ausgaben-Optionen -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px">
        <button class="btn btn-outline" style="height:64px;flex-direction:column;gap:4px"
          onclick="this.closest('.modal-overlay').remove();zeigeVotingSiegerPoster('a3')">
          <span style="font-size:1.3rem">📄</span><span style="font-size:.8rem">A3-Aushang</span>
        </button>
        <button class="btn btn-outline" style="height:64px;flex-direction:column;gap:4px"
          onclick="this.closest('.modal-overlay').remove();zeigeVotingSiegerPoster('social')">
          <span style="font-size:1.3rem">📱</span><span style="font-size:.8rem">Social Media</span>
        </button>
        <button class="btn btn-outline" style="height:64px;flex-direction:column;gap:4px"
          onclick="this.closest('.modal-overlay').remove();zeigeVotingSiegerPoster('bildschirm')">
          <span style="font-size:1.3rem">🖥️</span><span style="font-size:.8rem">Bildschirm</span>
        </button>
        <button class="btn btn-primary" style="height:64px;flex-direction:column;gap:4px"
          onclick="this.closest('.modal-overlay').remove();erstelleVotingSiegerMeldung('${kandidatId}','${kampagneId}')">
          <span style="font-size:1.3rem">📋</span><span style="font-size:.8rem">Als Meldung speichern</span>
        </button>
      </div>
      <div style="font-size:.75rem;color:var(--slzb-text-muted);text-align:center">
        „Als Meldung speichern" erstellt einen Eintrag in der Redaktionsübersicht
      </div>
    </div>`;

  // Sieger-Daten für Poster-Funktionen vorbereiten
  window._votingSieger = fakeErfolg;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

// Voting-Sieger als echte Meldung in der Datenbank speichern
async function erstelleVotingSiegerMeldung(kandidatId, kampagneId) {
  try {
    const { data: k } = await Backend.client.from('voting_candidates').select('*').eq('id', kandidatId).single();
    const { data: kamp } = await Backend.client.from('voting_campaigns').select('*').eq('id', kampagneId).single();
    const { data: stimmen } = await Backend.client.from('voting_votes').select('candidate_id').eq('campaign_id', kampagneId);
    const stimmenMap = {};
    (stimmen||[]).forEach(s => { stimmenMap[s.candidate_id] = (stimmenMap[s.candidate_id]||0)+1; });
    const gesamt = stimmen?.length || 0;
    const siegerStimmen = stimmenMap[kandidatId] || 0;
    const pct = gesamt ? Math.round(siegerStimmen/gesamt*100) : 0;

    const monatNamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    const jetzt = new Date();
    const monatLabel = kamp.monat
      ? `${monatNamen[parseInt(kamp.monat.split('-')[1])-1]} ${kamp.monat.split('-')[0]}`
      : `${monatNamen[jetzt.getMonth()]} ${jetzt.getFullYear()}`;

    const titel = `${esc(k.name)} – Sportler/in des Monats ${monatLabel}`;
        const kurzinfo = k.name + ' wurde mit ' + siegerStimmen + ' Stimmen (' + pct + '% von ' + gesamt + ' Stimmen) zur/zum Sportler/in des Monats ' + monatLabel + ' gewählt.' + (k.erfolg ? '\n\nErfolg: ' + k.erfolg : '');

    const beteiligte = [{ schuelerId: null, anzeigename: k.name, rolle: 'Athlet', einwilligungsstatus: 'Nicht geprüft' }];

    const result = await DB.erstelleErfolg({
      titel,
      sportartText: k.sportart || '',
      sportartId: null,
      wettbewerbText: kamp.titel,
      wettbewerbId: null,
      datum: jetzt.toISOString().slice(0,10),
      ort: '',
      ebene: 'Schulebene',
      platzierung: 1,
      medaille: 'Gold',
      ergebnisText: `${siegerStimmen} Stimmen · ${pct}%`,
      kurzinfo,
      quelleUrl: '',
      videoUrl: null,
      meldungsart: 'Einzelerfolg',
    }, beteiligte);

    if (!result.ok) throw new Error(result.fehler || 'Unbekannter Fehler');

    // Bild aus Voting übernehmen wenn vorhanden
    if (k.bild_url) {
      await Backend.client.from('achievement_media').insert([{
        achievement_id: result.id,
        storage_path: k.storage_path || k.bild_url,
        original_name: 'voting_bild.jpg',
        mime_type: 'image/jpeg',
        creator: 'SLZB-Abstimmung',
        source: 'Sportler-des-Monats-Wahl',
        uploaded_by: Auth.id(),
        created_at: new Date().toISOString(),
      }]).catch(() => {}); // Fehler ignorieren wenn kein storage_path
    }

    toast(`✅ Meldung "${titel}" erstellt (${result.nr})`, 'success');
    APP._erfolgeCache = null; // Cache leeren
    navigateTo('erfolg-detail', { currentErfolgId: result.id });
  } catch(e) {
    toast('Fehler: ' + e.message, 'danger');
  }
}


// ── Hilfsfunktionen ───────────────────────────────────────────
function getVoterToken() {
  let token = localStorage.getItem('slzb_voter_token');
  if (!token) {
    token = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('slzb_voter_token', token);
  }
  return token;
}

async function toggleVotingStatus(kampagneId, aktuellerStatus) {
  const neuerStatus = aktuellerStatus === 'aktiv' ? 'beendet' : 'aktiv';
  if (!confirm(`Abstimmung ${neuerStatus === 'aktiv' ? 'aktivieren' : 'beenden'}?`)) return;

  // Beim Aktivieren: andere aktive Abstimmungen automatisch beenden
  if (neuerStatus === 'aktiv') {
    const { data: aktive } = await Backend.client
      .from('voting_campaigns')
      .select('id,titel')
      .eq('status', 'aktiv')
      .neq('id', kampagneId);
    if (aktive?.length) {
      const namen = aktive.map(k => `"${k.titel}"`).join(', ');
      if (!confirm(`⚠️ Folgende Abstimmungen werden automatisch beendet:\n${namen}\n\nTrotzdem aktivieren?`)) return;
      await Backend.client.from('voting_campaigns')
        .update({ status: 'beendet' })
        .eq('status', 'aktiv')
        .neq('id', kampagneId);
    }
  }

  await Backend.client.from('voting_campaigns').update({ status: neuerStatus }).eq('id', kampagneId);
  toast(`Abstimmung ${neuerStatus === 'aktiv' ? 'gestartet' : 'beendet'}`, 'success');
  navigateTo('voting');
}

async function toggleErgebnisSichtbar(kampagneId, sichtbar) {
  await Backend.client.from('voting_campaigns').update({ ergebnis_sichtbar: sichtbar }).eq('id', kampagneId);
  toast(sichtbar ? '👁️ Ergebnis ist jetzt öffentlich sichtbar' : '🔒 Ergebnis verborgen', 'success');
  document.querySelector('.modal-overlay')?.remove();
}

// Sieger-Poster aus Voting-Kandidat erstellen
async function zeigeNachwuchsSiegerPosterFuerVoting(kandidatId) {
  const { data: k } = await Backend.client.from('voting_candidates').select('*').eq('id', kandidatId).single();
  if (!k) return;
  // Nachwuchssportler-Sieger-Poster mit Kandidaten-Daten
  const fakeErfolg = {
    id: kandidatId,
    titel: k.name,
    sportartText: k.sportart || '',
    beteiligte: [{ anzeigename: k.name }],
    bilder: k.bild_url ? [{ signedUrl: k.bild_url }] : [],
    datum: new Date().toISOString().slice(0,10),
    kurzinfo: k.erfolg,
  };
  // Öffne Nachwuchswahl-Sieger-Modal
  window._nwSiegerKandidat = fakeErfolg;
  zeigeNachwuchswahlModal();
}

// ══════════════════════════════════════════════════════════════
// VOTING: Kandidaten aus Meldungen auswählen
// ══════════════════════════════════════════════════════════════
async function zeigeVotingKandidatenAuswahl() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '10000'; // Über dem Erstellen-Modal
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.innerHTML = '<div class="modal-body" style="text-align:center;padding:40px"><div class="spinner"></div><p>Lade Meldungen...</p></div>';
  overlay.appendChild(modal);
  // Kein Schließen bei Klick auf Overlay (verhindert versehentliches Schließen)
  document.body.appendChild(overlay);

  try {
    // Freigegebene Meldungen der letzten 90 Tage laden
    const seit = new Date(Date.now() - 90*24*60*60*1000).toISOString();
    const { data: meldungen } = await Backend.client
      .from('achievements')
      .select('id, title, sport_id, placement, medal, event_date, reporter_name, deleted_at')
      .in('status', ['Freigegeben', 'Veröffentlicht'])
      .gte('event_date', seit.slice(0,10))
      .is('deleted_at', null)
      .order('event_date', { ascending: false })
      .limit(50);

    // Beteiligte laden
    const ids = (meldungen||[]).map(m => m.id);
    const { data: beteiligte } = ids.length ? await Backend.client
      .from('achievement_participants')
      .select('achievement_id, participant_role')
      .in('achievement_id', ids) : { data: [] };

    const betMap = {};
    (beteiligte||[]).forEach(b => {
      if (!betMap[b.achievement_id]) betMap[b.achievement_id] = [];
      if (b.participant_role && b.participant_role !== 'Athlet') betMap[b.achievement_id].push(b.participant_role);
    });

    // Bilder laden
    const { data: medien } = ids.length ? await Backend.client
      .from('achievement_media')
      .select('achievement_id, storage_path')
      .in('achievement_id', ids)
      .limit(ids.length) : { data: [] };

    const medienMap = {};
    const storagePathMap = {};
    for (const m of (medien||[])) {
      if (!medienMap[m.achievement_id] && m.storage_path) {
        // achievement-media ist privat → Signed URL (1 Jahr gültig)
        const { data: signedData } = await Backend.client.storage
          .from('achievement-media').createSignedUrl(m.storage_path, 365 * 24 * 3600);
        medienMap[m.achievement_id] = signedData?.signedUrl || null;
        storagePathMap[m.achievement_id] = m.storage_path;
      }
    }

    // Ausgewählte Kandidaten tracken
    window._votingAuswahl = [];

    const medailleText = (m) => ({Gold:'🥇',Silber:'🥈',Bronze:'🥉'}[m]||'');
    const platzText = (p) => p ? `${p}. Platz` : '';

    modal.innerHTML = `
      <div class="modal-header">
        <div>
          <h3>📋 Kandidaten aus Meldungen wählen</h3>
          <p style="font-size:.82rem;color:var(--slzb-muted);margin:4px 0 0">Wähle bis zu 3 Kandidaten aus freigegebenen Meldungen der letzten 90 Tage.</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div id="voting-auswahl-zaehler" style="background:var(--slzb-primary);color:#fff;padding:8px 16px;border-radius:8px;margin-bottom:12px;font-weight:700">
          0 von 3 ausgewählt
        </div>
        ${!meldungen?.length ? '<div class="alert alert-warning">Keine freigegebenen Meldungen der letzten 90 Tage gefunden.</div>' :
        `<div style="display:flex;flex-direction:column;gap:8px">
          ${meldungen.map(m => {
            const athleten = betMap[m.id]?.join(', ') || '–';
            const sport = SLZB_DB.getSportart(m.sport_id)?.name || '';
            const erfolg = [medailleText(m.medal), platzText(m.placement)].filter(Boolean).join(' ') || 'Teilnahme';
            const bildUrl = medienMap[m.id] || null;
            const datum = m.event_date ? new Date(m.event_date).toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'}) : '';

            return `<div class="card voting-kandidat-card" id="vk-${m.id}"
              style="cursor:pointer;border:2px solid var(--slzb-border);transition:all .15s"
              onclick="toggleVotingKandidat('${m.id}','${esc(athleten)}','${esc(sport)}','${esc(m.title||'')}','${esc(erfolg)}','${esc(bildUrl||'')}')">
              <div class="card-body" style="display:flex;align-items:center;gap:12px;padding:12px">
                <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#f0f4f8">
                  ${bildUrl
                    ? `<img src="${esc(bildUrl)}" style="width:100%;height:100%;object-fit:cover">`
                    : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem">🏃</div>'}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:.9rem">${esc(athleten)}</div>
                  <div style="font-size:.78rem;color:var(--slzb-primary)">${esc(sport)}${datum?' · '+datum:''}</div>
                  <div style="font-size:.78rem;color:#444">${esc(m.title||'')} – ${erfolg}</div>
                </div>
                <div id="vk-check-${m.id}" style="width:24px;height:24px;border-radius:50%;border:2px solid var(--slzb-border);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.8rem"></div>
              </div>
            </div>`;
          }).join('')}
        </div>`}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="uebernehmeVotingKandidaten()">✅ Auswahl übernehmen</button>
      </div>`;

  } catch(e) {
    modal.innerHTML = `<div class="modal-body"><div class="alert alert-danger">${esc(e.message)}</div></div>`;
  }
}

function toggleVotingKandidat(id, name, sport, titel, erfolg, bildUrl, storagePath, storageBucket) {
  const auswahl = window._votingAuswahl || [];
  const idx = auswahl.findIndex(k => k.id === id);
  const card = document.getElementById(`vk-${id}`);
  const check = document.getElementById(`vk-check-${id}`);

  if (idx >= 0) {
    // Abwählen
    auswahl.splice(idx, 1);
    if (card) card.style.borderColor = 'var(--slzb-border)';
    if (check) { check.textContent = ''; check.style.background = ''; check.style.borderColor = 'var(--slzb-border)'; }
  } else {
    if (auswahl.length >= 7) { toast('Maximal 7 Kandidaten auswählbar', 'warning'); return; }
    auswahl.push({ id, name, sport, titel, erfolg, bildUrl, storagePath, storageBucket });
    if (card) card.style.borderColor = 'var(--slzb-primary)';
    if (check) { check.textContent = '✓'; check.style.background = 'var(--slzb-primary)'; check.style.color = '#fff'; check.style.borderColor = 'var(--slzb-primary)'; }
  }

  window._votingAuswahl = auswahl;
  const zaehler = document.getElementById('voting-auswahl-zaehler');
  if (zaehler) zaehler.textContent = `${auswahl.length} von 7 ausgewählt`;
}

function uebernehmeVotingKandidaten() {
  const auswahl = window._votingAuswahl || [];
  if (!auswahl.length) { toast('Bitte mindestens einen Kandidaten auswählen', 'warning'); return; }

  // Debug: Prüfe ob Felder vorhanden sind
  const testEl = document.getElementById('v-name-1');
  console.log('[Voting] v-name-1 vorhanden:', !!testEl, 'Auswahl:', auswahl.length);
  if (!testEl) {
    toast('❌ Erstellen-Modal nicht gefunden – bitte neu öffnen', 'danger');
    return;
  }

  auswahl.forEach((k, i) => {
    const nr = i + 1;
    const nameEl   = document.getElementById(`v-name-${nr}`);
    const sportEl  = document.getElementById(`v-sport-${nr}`);
    const erfolgEl = document.getElementById(`v-erfolg-${nr}`);
    // Bild-URL in ein verstecktes Feld schreiben (wird beim Speichern genutzt)
    const bildEl   = document.getElementById(`v-bild-${nr}`);

    if (nameEl)   nameEl.value   = k.name !== '–' ? k.name : '';
    if (sportEl)  sportEl.value  = k.sport || '';
    if (erfolgEl) erfolgEl.value = k.titel ? `${k.titel} – ${k.erfolg}` : k.erfolg;

    // Bild-URL als data-Attribut speichern (da input[type=file] keine URL akzeptiert)
    if (bildEl && k.bildUrl) {
      bildEl.dataset.vorhandeneUrl = k.bildUrl;
      // storage_path für direkte Signed URL Generierung
      if (k.storagePath) {
        bildEl.dataset.storagePath = k.storagePath;
        bildEl.dataset.storageBucket = k.storageBucket || 'achievement-media';
      }
      // Vorschau anzeigen
      const preview = document.getElementById(`v-bild-preview-${nr}`);
      const img = document.getElementById(`v-bild-img-${nr}`);
      if (preview && img) { img.src = k.bildUrl; preview.style.display = 'block'; }
    }
  });

  // Nur das Auswahl-Modal entfernen (nicht das Erstellen-Modal)
  const alleOverlays = document.querySelectorAll('.modal-overlay');
  alleOverlays.forEach(o => { if (o.style.zIndex === '10000') o.remove(); });
  toast(`✅ ${auswahl.length} Kandidaten übernommen`, 'success');
}

// ── Voting: Link & QR-Code anzeigen ──────────────────────────
function zeigeVotingLink(kampagneId) {
  const BASE = 'https://pfeiffse.github.io/slzb-erfolge/slzb-v3/vote.html';
  const link = `${BASE}?id=${kampagneId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}&bgcolor=003366&color=ffffff&margin=10`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '420px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>🔗 Abstimmungslink teilen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body" style="text-align:center">
      <p class="text-muted text-sm mb-3">Teile diesen Link mit den Schülern – kein Login nötig!</p>

      <!-- QR-Code -->
      <div style="background:#003366;padding:16px;border-radius:12px;display:inline-block;margin-bottom:16px">
        <img src="${qrUrl}" alt="QR-Code" style="width:200px;height:200px;display:block;border-radius:8px">
      </div>

      <!-- Link -->
      <div style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:10px 14px;margin-bottom:16px;word-break:break-all;font-size:.8rem;text-align:left;font-family:monospace">
        ${link}
      </div>

      <div class="flex gap-2" style="justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${link}').then(()=>toast('✅ Link kopiert!','success'))">
          📋 Link kopieren
        </button>
        <a href="${link}" target="_blank" class="btn btn-outline btn-sm">
          🔗 Link öffnen
        </a>
        <button class="btn btn-ghost btn-sm" onclick="
          const a=document.createElement('a');
          a.href='${qrUrl.replace('200x200','400x400')}';
          a.download='SLZB-Abstimmung-QR.png';
          a.click()">
          ⬇️ QR herunterladen
        </button>
      </div>

      <p class="text-muted text-xs mt-3">
        💡 QR-Code ausdrucken und aushängen – Schüler scannen und stimmen direkt ab.
      </p>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

// ── Voting-Kampagne löschen ───────────────────────────────────

// ── Abstimmung bearbeiten ─────────────────────────────────────
async function bearbeiteVotingKampagne(kampagneId) {
  // Cache-Buster: Supabase-Client neu initialisieren um gecachte Daten zu vermeiden
  const { data: k } = await Backend.client.from('voting_campaigns').select('*').eq('id', kampagneId).single();
  const { data: kandidatenRaw } = await Backend.client.from('voting_candidates')
    .select('*').eq('campaign_id', kampagneId).order('reihenfolge');

  // Bilder: Signed URL für poster-exports, Public URL für achievement-media
  const kandidaten = await Promise.all((kandidatenRaw||[]).map(async k2 => {
    const bucket = k2.storage_bucket || 'achievement-media';
    const sp = k2.storage_path;
    if (sp) {
      if (bucket === 'poster-exports') {
        // poster-exports ist privat → Signed URL
        const { data: sd } = await Backend.client.storage.from(bucket).createSignedUrl(sp, 3600);
        if (sd?.signedUrl) return { ...k2, bild_url: sd.signedUrl };
      } else {
        // achievement-media ist öffentlich → Public URL
        const { data: pubData } = Backend.client.storage.from(bucket).getPublicUrl(sp);
        if (pubData?.publicUrl) return { ...k2, bild_url: pubData.publicUrl };
      }
    }
    if (!sp && k2.bild_url) {
      const parts = k2.bild_url.split('/object/');
      if (parts.length > 1) {
        const rest = parts[1].replace(/^(sign|public)\//, '');
        const bucketEnd = rest.indexOf('/');
        if (bucketEnd > 0) {
          const exBucket = rest.slice(0, bucketEnd);
          const exPath = rest.slice(bucketEnd+1).split('?')[0];
          if (exBucket === 'poster-exports') {
            const { data: sd } = await Backend.client.storage.from(exBucket).createSignedUrl(exPath, 3600);
            if (sd?.signedUrl) return { ...k2, bild_url: sd.signedUrl, storage_path: exPath, storage_bucket: exBucket };
          } else {
            const { data: pubData } = Backend.client.storage.from(exBucket).getPublicUrl(exPath);
            if (pubData?.publicUrl) return { ...k2, bild_url: pubData.publicUrl, storage_path: exPath, storage_bucket: exBucket };
          }
        }
      }
    }
    return k2;
  }));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '700px';

  const startVal = k.start_at ? k.start_at.slice(0,16) : '';
  const endVal   = k.end_at   ? k.end_at.slice(0,16)   : '';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>✏️ Abstimmung bearbeiten</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group mb-3">
        <label style="font-weight:600">Titel <span class="required">*</span></label>
        <input type="text" id="ve-titel" value="${esc(k.titel||'')}" style="width:100%">
      </div>
      <div class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="font-weight:600">Start</label>
          <input type="datetime-local" id="ve-start" value="${startVal}" style="width:100%">
        </div>
        <div class="form-group">
          <label style="font-weight:600">Ende</label>
          <input type="datetime-local" id="ve-end" value="${endVal}" style="width:100%">
        </div>
      </div>
      <div style="font-weight:600;margin-bottom:8px">Kandidaten:</div>
      ${kandidaten.map((k2,i) => `
        <div class="card mb-2" style="border:1px solid var(--slzb-border)">
          <div class="card-body" style="padding:10px">
            <div style="font-weight:700;color:var(--slzb-primary);margin-bottom:8px">Kandidat ${i+1}</div>
            <div class="form-row cols-2">
              <div class="form-group">
                <label style="font-size:.8rem">Name</label>
                <input type="text" id="ve-name-${k2.id}" value="${esc(k2.name||'')}" style="width:100%;font-size:.85rem">
              </div>
              <div class="form-group">
                <label style="font-size:.8rem">Sportart</label>
                <input type="text" id="ve-sport-${k2.id}" value="${esc(k2.sportart||'')}" style="width:100%;font-size:.85rem">
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label style="font-size:.8rem">Erfolg</label>
                <input type="text" id="ve-erfolg-${k2.id}" value="${esc(k2.erfolg||'')}" style="width:100%;font-size:.85rem">
              </div>
              <div class="form-group">
                <label style="font-size:.8rem">Klasse</label>
                <input type="text" id="ve-klasse-${k2.id}" value="${esc(k2.klasse||'')}" style="width:100%;font-size:.85rem">
              </div>
              <div class="form-group">
                <label style="font-size:.8rem">Bild</label>
                ${k2.bild_url ? `<div style="margin-bottom:6px"><img src="${esc(k2.bild_url)}" style="max-height:60px;border-radius:6px;object-fit:cover"></div>` : ''}
                <input type="file" id="ve-bild-${k2.id}" accept="image/jpeg,image/png,image/webp"
                  style="width:100%;font-size:.8rem">
                <div style="font-size:.7rem;color:#888;margin-top:2px">Neues Bild hochladen um bestehendes zu ersetzen</div>
              </div>
            </div>
          </div>
        </div>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class=\"btn btn-primary\" onclick=\"speichereVotingBearbeitung('${kampagneId}')\">💾 Speichern</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
  // IDs für speichereVotingBearbeitung merken
  window._veKandidatenIds = kandidaten.map(k2 => k2.id);
}

async function speichereVotingBearbeitung(kampagneId) {
  const ids = Array.isArray(window._veKandidatenIds) ? window._veKandidatenIds : [];
  const titelEl = document.getElementById('ve-titel');
  const titel = titelEl?.value?.trim();
  if (!titel) { toast('Titel darf nicht leer sein', 'warning'); return; }

  // Kampagne aktualisieren
  const { error: kErr } = await Backend.client.from('voting_campaigns').update({
    titel,
    start_at: document.getElementById('ve-start')?.value || null,
    end_at:   document.getElementById('ve-end')?.value   || null,
  }).eq('id', kampagneId);
  if (kErr) { toast('Fehler beim Speichern: ' + kErr.message, 'danger'); return; }

  // Kandidaten aktualisieren
  for (const kid of ids) {
    const name   = document.getElementById('ve-name-'+kid)?.value?.trim() || '';
    const sport  = document.getElementById('ve-sport-'+kid)?.value?.trim() || '';
    const erfolg = document.getElementById('ve-erfolg-'+kid)?.value?.trim() || '';
    const klasse = document.getElementById('ve-klasse-'+kid)?.value?.trim() || '';
    const bildInput = document.getElementById('ve-bild-'+kid);
    if (!name) continue;

    const updateData = { name, sportart: sport, erfolg, klasse };

    // Neues Bild hochladen wenn vorhanden
    if (bildInput?.files?.[0]) {
      const file = bildInput.files[0];
      const pfad = 'voting/'+kampagneId+'_'+kid+'_'+Date.now()+'.'+file.name.split('.').pop();
      const { error: upErr } = await Backend.client.storage
        .from('poster-exports').upload(pfad, file, { contentType: file.type, upsert: true });
      if (!upErr) {
        const { data: urlData } = Backend.client.storage.from('poster-exports').getPublicUrl(pfad);
        if (urlData?.publicUrl) {
          updateData.bild_url = urlData.publicUrl;
          updateData.storage_path = pfad;
          updateData.storage_bucket = 'poster-exports';
        }
      } else {
        toast('Bild-Upload Fehler: ' + upErr.message, 'warning');
      }
    }

      const { error: updErr } = await Backend.client
      .from('voting_candidates').update(updateData).eq('id', kid);
    if (updErr) {
          toast('Fehler bei Kandidat ' + name + ': ' + updErr.message, 'danger');
      return;
    }
    }

  document.querySelector('.modal-overlay')?.remove();
  toast('✅ Abstimmung gespeichert', 'success');
  navigateTo('sportler-des-monats');
}

// ══════════════════════════════════════════════════════════════
// ATHLETEN-VORSTELLUNG (Weltcup / Turnier)
// ══════════════════════════════════════════════════════════════


let _avCounter = 0;
function avResetBildCache() {
  // Alle gespeicherten Bild-Objekte löschen
  for (let i = 1; i <= _avCounter + 10; i++) {
    delete window[`_avBildObj_${i}`];
  }
}
function avAthletHinzu() {
  const liste = document.getElementById('av-athleten-liste');
  if (!liste) return;
  const id = ++_avCounter;
  const div = document.createElement('div');
  div.id = `av-athlet-${id}`;
  div.style.cssText = 'border:1px solid var(--slzb-border);border-radius:8px;padding:12px;margin-bottom:10px';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:600;color:var(--slzb-primary)">Athlet ${id}</div>
      <button onclick="document.getElementById('av-athlet-${id}').remove()" style="background:none;border:none;color:#E2001A;cursor:pointer;font-size:1rem">✕</button>
    </div>
    <div class="form-row cols-2">
      <div class="form-group">
        <label style="font-size:.8rem">Vorname</label>
        <input type="text" id="av-vorname-${id}" placeholder="Max" style="width:100%;font-size:.85rem">
      </div>
      <div class="form-group">
        <label style="font-size:.8rem">Nachname</label>
        <input type="text" id="av-nachname-${id}" placeholder="Mustermann" style="width:100%;font-size:.85rem">
      </div>
      <div class="form-group">
        <label style="font-size:.8rem">Kader / Klasse</label>
        <input type="text" id="av-kader-${id}" placeholder="z.B. Nationalkader U20" style="width:100%;font-size:.85rem">
      </div>
      <div class="form-group">
        <label style="font-size:.8rem">Ziel / Motto</label>
        <input type="text" id="av-ziel-${id}" placeholder="z.B. Top 5 beim Weltcup" style="width:100%;font-size:.85rem">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label style="font-size:.8rem">Bisherige Erfolge (kommagetrennt)</label>
        <input type="text" id="av-erfolge-${id}" placeholder="z.B. 1. Platz DM 2025, 3. Platz EM 2024" style="width:100%;font-size:.85rem">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label style="font-size:.8rem">🏁 Anstehende Starts / Rennen (ein Eintrag pro Zeile)</label>
        <textarea id="av-starts-${id}" rows="3"
          placeholder="z.B. 15.12.2026 – Junioren-Weltcup Innsbruck&#10;22.01.2027 – Deutsche Meisterschaft Berlin"
          style="width:100%;font-size:.85rem;resize:vertical;padding:6px 8px;border:1px solid var(--slzb-border);border-radius:6px;background:var(--slzb-bg-secondary);color:var(--slzb-text)"></textarea>
        <div class="form-hint">Format: Datum – Veranstaltung (optional)</div>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label style=\"font-size:.8rem;display:flex;justify-content:space-between;align-items:center\">Bild hochladen<button type=\"button\" class=\"btn btn-ghost btn-sm\" style=\"font-size:.72rem;padding:2px 8px\" onclick=\"zeigeAthletenBildarchiv(${id})\">📂 Aus Archiv</button></label>
        <input type="file" id="av-bild-${id}" accept="image/jpeg,image/png,image/webp"
          style="width:100%;font-size:.8rem"
          onchange="avBildVorschau(${id}, this)">
        <img id="av-bild-preview-${id}" src="" alt="Vorschau"
          style="display:none;max-height:80px;max-width:100%;margin-top:6px;border-radius:6px;object-fit:cover">
      </div>
    </div>`;
  liste.appendChild(div);
}

function zeigeAthletenVorstellung() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '680px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🏅 Athleten-Vorstellung erstellen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
        <span>Erstellt pro Athlet 2 Poster im SLZB-Stil: Porträt + Erfolge. Ideal für Weltcup-Vorschauen.</span>
      </div>
      <div class="form-row cols-2 mb-3">
        <div class="form-group">
          <label style="font-weight:600">Veranstaltung <span class="required">*</span></label>
          <input type="text" id="av-veranstaltung" placeholder="z.B. Junioren-Weltcup Eisschnelllauf" style="width:100%">
        </div>
        <div class="form-group">
          <label style="font-weight:600">Ort / Stadt</label>
          <input type="text" id="av-ort" placeholder="z.B. Innsbruck, Österreich" style="width:100%">
        </div>
        <div class="form-group">
          <label style="font-weight:600">Sportart</label>
          <input type="text" id="av-sportart" list="av-sportarten-list" placeholder="z.B. Eisschnelllauf" style="width:100%">
          <datalist id="av-sportarten-list">${SLZB_DB.sportarten.map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist>
        </div>
      </div>

      <div style="font-weight:600;margin-bottom:8px">Athleten:</div>
      <div id="av-athleten-liste"></div>
      <button class="btn btn-ghost btn-sm mt-2" onclick="avAthletHinzu()">+ Athlet hinzufügen</button>

      <div style=\"margin-top:16px;border-top:1px solid var(--slzb-border);padding-top:12px\">
        <div style=\"font-weight:600;margin-bottom:8px\">📸 Teamfoto (optional – für Deck- und Abschlussfolie):</div>
        <input type=\"file\" id=\"av-teamfoto\" accept=\"image/jpeg,image/png,image/webp\"
          style=\"width:100%;font-size:.85rem;margin-bottom:6px\"
          onchange=\"avTeamfotoVorschau(this)\">
        <img id=\"av-teamfoto-preview\" src=\"\" alt=\"Teamfoto-Vorschau\"
          style=\"display:none;max-height:100px;max-width:100%;margin-top:6px;border-radius:6px;object-fit:cover\">
        <div style=\"font-size:.75rem;color:#888\">Erscheint als Hintergrundbild auf Deckblatt und Abschluss-Slide.</div>
      </div>
    </div>
    <div class="modal-footer">
      <div class="form-group" style="flex:1;min-width:180px;margin:0">
        <select id="av-format" style="width:100%;background:var(--slzb-bg-secondary);color:var(--slzb-text);border:1px solid var(--slzb-border);border-radius:6px;padding:7px 10px">
          <option value="carousel">📱 Carousel (Story-Format + Deckblatt)</option>
          <option value="quadrat">⬛ Quadrat 1080×1080 (Instagram-Post)</option>
          <option value="story">📱 Story 1080×1920</option>
          <option value="twitter">🐦 Twitter/X-Banner 1500×500</option>
        </select>
      </div>
      <button class=\"btn btn-ghost btn-sm\" onclick=\"zeigeVeranstaltungsWorkspace()\" title=\"Gespeicherte Veranstaltungen laden\">📋 Gespeicherte</button>\n      <button class=\"btn btn-ghost btn-sm\" onclick=\"zeigeAthletenProfileVerwaltung()\" title=\"Athleten-Profile verwalten\">👤 Profile</button>\n      <button class=\"btn btn-ghost\" onclick=\"this.closest(\\'.modal-overlay\\').remove()\">Abbrechen</button>\n      <button class=\"btn btn-primary\" onclick=\"erstelleAthletenVorstellung()\">🖼️ Erstellen & herunterladen</button>\n    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  // Bild-Cache leeren (außer wenn Zurück-Navigation)
  if (!window._avGespeicherteDaten) avResetBildCache();
  // Ersten Athleten direkt hinzufügen
  avAthletHinzu();
}


// Bild-Vorschau im Athleten-Formular

// Teamfoto-Vorschau

// ── Athleten-Bildarchiv ───────────────────────────────────────
// Lädt alle Bilder eines Athleten aus bestehenden Meldungen
async function ladeAthletenBilder(athletenName) {
  if (!athletenName || athletenName.length < 2) return [];
  try {
    // Suche Meldungen mit diesem Athleten
    const teile = athletenName.trim().split(/\s+/);
    const suchbegriff = teile[0]; // Nachname oder erster Name
    const { data: teilnahmen } = await Backend.client
      .from('achievement_participants')
      .select('achievement_id, participant_role')
      .ilike('participant_role', `%${suchbegriff}%`)
      .limit(20);
    if (!teilnahmen?.length) return [];

    const erfolgIds = [...new Set(teilnahmen.map(t => t.achievement_id))];

    // Bilder zu diesen Meldungen laden
    const { data: bilder } = await Backend.client
      .from('achievement_media')
      .select('id, achievement_id, storage_path, original_name, caption, alt_text')
      .in('achievement_id', erfolgIds)
      .limit(30);
    if (!bilder?.length) return [];

    // Public URLs generieren
    return bilder.map(b => {
      const { data } = Backend.client.storage
        .from('achievement-media')
        .getPublicUrl(b.storage_path);
      return {
        id: b.id,
        url: data?.publicUrl || null,
        storagePath: b.storage_path,
        caption: b.caption || b.alt_text || '',
        erfolgId: b.achievement_id,
      };
    }).filter(b => b.url);
  } catch(e) {
    console.warn('[Athleten-Archiv]', e.message);
    return [];
  }
}

// Zeigt Bildarchiv-Picker für einen Athleten
async function zeigeAthletenBildarchiv(athletenId) {
  const nameEl = document.getElementById(`av-vorname-${athletenId}`);
  const nachnameEl = document.getElementById(`av-nachname-${athletenId}`);
  const vorname = nameEl?.value.trim() || '';
  const nachname = nachnameEl?.value.trim() || '';
  const name = `${vorname} ${nachname}`.trim();

  if (!name) { toast('Bitte zuerst den Athletennamen eingeben', 'warning'); return; }

  toast('⏳ Suche Bilder...', 'info');
  const bilder = await ladeAthletenBilder(name);

  if (!bilder.length) {
    toast(`Keine Bilder für "${name}" in Meldungen gefunden`, 'info');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '700px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>📸 Bildarchiv: ${esc(name)}</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <p class="text-muted mb-3" style="font-size:.85rem">${bilder.length} Bild(er) aus bestehenden Meldungen gefunden. Klicke auf ein Bild um es zu verwenden.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">
        ${bilder.map((b,i) => `
          <div style="cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid transparent;transition:border-color .2s"
            onclick="avBildAusArchivWaehlen(${athletenId}, '${esc(b.url)}', this)">
            <img src="${esc(b.url)}" alt="${esc(b.caption)}"
              style="width:100%;height:120px;object-fit:cover;display:block"
              onerror="this.parentNode.style.display='none'">
            ${b.caption ? `<div style="font-size:.7rem;padding:4px 6px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.caption)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

async function avBildAusArchivWaehlen(athletenId, url, el) {
  // Bild als DataURL laden und cachen
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const dataUrl = await new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res(ev.target.result);
      reader.readAsDataURL(blob);
    });
    const img = new Image();
    img.onload = () => {
      window[`_avBildObj_${athletenId}`] = img;
      // Vorschau aktualisieren
      const preview = document.getElementById(`av-bild-preview-${athletenId}`);
      if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
      toast('✅ Bild aus Archiv übernommen', 'success');
      document.querySelector('.modal-overlay')?.remove();
    };
    img.src = dataUrl;
  } catch(e) {
    toast('Fehler beim Laden: ' + e.message, 'danger');
  }
}

function avTeamfotoVorschau(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('av-teamfoto-preview');
    if (preview) {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    }
    // DataURL für spätere Verwendung cachen
    window._avTeamfotoDataUrl = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function avBildVorschau(id, input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById(`av-bild-preview-${id}`);
    if (preview) {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    }
    // Bild-Objekt sofort laden und cachen
    const img = new Image();
    img.onload = () => { window[`_avBildObj_${id}`] = img; };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}



function avBildVorschau(id, input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById(`av-bild-preview-${id}`);
    if (preview) {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    }
    // Bild-Objekt sofort laden und cachen
    const img = new Image();
    img.onload = () => { window[`_avBildObj_${id}`] = img; };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}




// ── Athletenvorstellung mit gespeicherten Daten wiederherstellen ──

// ── Veranstaltungs-Workspace ──────────────────────────────────
// Gespeicherte Veranstaltungen für Athletenvorstellung


// ══════════════════════════════════════════════════════════════
// ATHLETEN-PROFILE (Supabase)
// ══════════════════════════════════════════════════════════════

async function ladeAthletenProfile(suchbegriff = '') {
  try {
    let query = Backend.client
      .from('athleten_profile')
      .select('*')
      .eq('aktiv', true)
      .order('name');
    if (suchbegriff) {
      query = query.or(`name.ilike.%${suchbegriff}%,vorname.ilike.%${suchbegriff}%,nachname.ilike.%${suchbegriff}%,sportart.ilike.%${suchbegriff}%`);
    }
    const { data, error } = await query.limit(50);
    if (error) throw new Error(error.message);
    return data || [];
  } catch(e) {
    console.warn('[Athleten-Profile]', e.message);
    return [];
  }
}

async function speichereAthletProfil(profil) {
  const { data, error } = await Backend.client
    .from('athleten_profile')
    .upsert([{ ...profil, erstellt_von: Auth.id(), aktualisiert_am: new Date().toISOString() }])
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function loescheAthletProfil(id) {
  const { error } = await Backend.client
    .from('athleten_profile')
    .update({ aktiv: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// Athleten-Profile Verwaltung
async function zeigeAthletenProfileVerwaltung() {
  const profile = await ladeAthletenProfile();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.style.maxWidth = '800px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>👤 Athleten-Profile</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info mb-3"><span class="alert-icon">ℹ️</span>
        <span>Athleten-Profile speichern Name, Sportart und Standardbild dauerhaft. Beim Erstellen einer Athletenvorstellung können Profile direkt geladen werden.</span>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input type="text" id="ap-suche" placeholder="Athlet suchen..." style="flex:1"
          oninput="apSuche(this.value)">
        <button class="btn btn-primary btn-sm" onclick="zeigeAthletProfilFormular()">+ Neues Profil</button>
      </div>
      <div id="ap-liste">
        ${profile.length === 0 ? '<p class="text-muted">Noch keine Profile angelegt.</p>' :
          `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
            ${profile.map(p => `
              <div style="border:1px solid var(--slzb-border);border-radius:10px;overflow:hidden;cursor:pointer"
                onclick="apProfilWaehlen(${JSON.stringify(p).replace(/"/g,'&quot;')})">
                <div style="height:120px;background:var(--slzb-bg-secondary);overflow:hidden">
                  ${p.bild_url
                    ? `<img src="${esc(p.bild_url)}" style="width:100%;height:100%;object-fit:cover;object-position:center 20%"
                        onerror="this.style.display='none'">`
                    : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:2.5rem">🏃</div>`}
                </div>
                <div style="padding:10px">
                  <div style="font-weight:700;font-size:.9rem">${esc(p.name)}</div>
                  <div style="font-size:.78rem;color:#888;margin-top:2px">${esc(p.sportart||'–')}${p.klasse?' · '+esc(p.klasse):''}</div>
                  ${p.kader ? `<div style="font-size:.72rem;color:#666">${esc(p.kader)}</div>` : ''}
                  <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                    <button class="btn btn-primary btn-sm" style="font-size:.72rem;width:100%;margin-bottom:4px"
                      onclick="event.stopPropagation();apZurVeranstaltungHinzu(${JSON.stringify(p).replace(/\"/g,'&quot;')})">➕ Zur Veranstaltung</button>
                    <button class="btn btn-ghost btn-sm" style="font-size:.72rem;flex:1"
                      onclick="event.stopPropagation();zeigeAthletProfilFormular(${JSON.stringify(p).replace(/"/g,'&quot;')})">✏️ Bearbeiten</button>
                    <button class="btn btn-outline btn-sm" style="font-size:.72rem;width:100%;margin-top:4px"
                      onclick="event.stopPropagation();zeigeSchnellMeldungAusProfil(${JSON.stringify(p).replace(/\"/g,'&quot;')})">⚡ Schnell-Meldung</button>
                    <button class="btn btn-ghost btn-sm" style="font-size:.72rem;color:#E2001A"
                      onclick="event.stopPropagation();apLoeschen('${p.id}')">🗑️</button>
                  </div>
                </div>
              </div>`).join('')}
          </div>`}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

async function apSuche(suchbegriff) {
  const profile = await ladeAthletenProfile(suchbegriff);
  const liste = document.getElementById('ap-liste');
  if (!liste) return;
  if (!profile.length) { liste.innerHTML = '<p class="text-muted">Keine Profile gefunden.</p>'; return; }
  liste.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
    ${profile.map(p => `
      <div style="border:1px solid var(--slzb-border);border-radius:10px;overflow:hidden;cursor:pointer"
        onclick="apProfilWaehlen(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        <div style="height:100px;background:var(--slzb-bg-secondary);overflow:hidden">
          ${p.bild_url ? `<img src="${esc(p.bild_url)}" style="width:100%;height:100%;object-fit:cover">` : '<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem">🏃</div>'}
        </div>
        <div style="padding:8px">
          <div style="font-weight:700;font-size:.88rem">${esc(p.name)}</div>
          <div style="font-size:.75rem;color:#888">${esc(p.sportart||'–')}</div>
        </div>
      </div>`).join('')}
  </div>`;
}

function zeigeAthletProfilFormular(profil = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '500px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>${profil ? '✏️ Profil bearbeiten' : '+ Neues Athleten-Profil'}</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row cols-2">
        <div class="form-group">
          <label>Vorname <span class="required">*</span></label>
          <input type="text" id="ap-vorname" value="${esc(profil?.vorname||'')}" placeholder="Max">
        </div>
        <div class="form-group">
          <label>Nachname <span class="required">*</span></label>
          <input type="text" id="ap-nachname" value="${esc(profil?.nachname||'')}" placeholder="Mustermann">
        </div>
        <div class="form-group">
          <label>Sportart</label>
          <input type="text" id="ap-sportart" value="${esc(profil?.sportart||'')}" list="ap-sportarten-list" placeholder="z.B. Eisschnelllauf">
          <datalist id="ap-sportarten-list">${(typeof SLZB_DB !== 'undefined' ? SLZB_DB.sportarten : []).map(s=>`<option value="${esc(s.name)}">`).join('')}</datalist>
        </div>
        <div class="form-group">
          <label>Klasse / Jahrgang</label>
          <input type="text" id="ap-klasse" value="${esc(profil?.klasse||'')}" placeholder="z.B. 11b">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Kader / Kategorie</label>
          <input type="text" id="ap-kader" value="${esc(profil?.kader||'')}" placeholder="z.B. Nationalkader U20">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Standardbild</label>
          <input type="file" id="ap-bild" accept="image/jpeg,image/png,image/webp"
            onchange="apBildVorschau(this)">
          ${profil?.bild_url ? `<img src="${esc(profil.bild_url)}" id="ap-bild-preview"
            style="max-height:80px;max-width:100%;margin-top:6px;border-radius:6px;object-fit:cover">` :
            `<img id="ap-bild-preview" src="" style="display:none;max-height:80px;max-width:100%;margin-top:6px;border-radius:6px;object-fit:cover">`}
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Notizen</label>
          <textarea id="ap-notizen" rows="2" placeholder="Interne Notizen..."
            style="width:100%;resize:vertical">${esc(profil?.notizen||'')}</textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="apSpeichern('${profil?.id||''}')">💾 Speichern</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

function apBildVorschau(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('ap-bild-preview');
    if (preview) { preview.src = ev.target.result; preview.style.display = 'block'; }
    window._apBildDataUrl = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function apSpeichern(existingId) {
  const vorname = document.getElementById('ap-vorname')?.value.trim();
  const nachname = document.getElementById('ap-nachname')?.value.trim();
  // Schema-Validierung
  const fehler = typeof validiereNachSchema === 'function' && typeof VALIDIERUNGSREGELN !== 'undefined'
    ? validiereNachSchema({ vorname, nachname }, VALIDIERUNGSREGELN.athletenProfil || {})
    : (!vorname || !nachname ? ['Vor- und Nachname sind Pflichtfelder'] : []);
  if (fehler.length) { toast(fehler[0], 'warning'); return; }

  const name = `${vorname} ${nachname}`.trim();
  let bildUrl = null;
  let storagePath = null;

  // Bild hochladen wenn vorhanden
  if (window._apBildDataUrl) {
    try {
      const response = await fetch(window._apBildDataUrl);
      const blob = await response.blob();
      const dateiname = `${Auth.id()}/${name.replace(/\s+/g,'_')}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadErr } = await Backend.client.storage
        .from('achievement-media')
        .upload(dateiname, blob, { contentType: 'image/jpeg', upsert: true });
      if (!uploadErr) {
        storagePath = uploadData.path;
        const { data: pubData } = Backend.client.storage
          .from('achievement-media').getPublicUrl(storagePath);
        bildUrl = pubData?.publicUrl || null;
      }
    } catch(e) { console.warn('Bild-Upload:', e.message); }
    window._apBildDataUrl = null;
  }

  const profil = {
    ...(existingId ? { id: existingId } : {}),
    name,
    vorname,
    nachname,
    sportart: document.getElementById('ap-sportart')?.value.trim() || null,
    klasse: document.getElementById('ap-klasse')?.value.trim() || null,
    kader: document.getElementById('ap-kader')?.value.trim() || null,
    notizen: document.getElementById('ap-notizen')?.value.trim() || null,
    ...(bildUrl ? { bild_url: bildUrl, storage_path: storagePath } : {}),
  };

  try {
    await speichereAthletProfil(profil);
    toast(`✅ Profil "${name}" gespeichert`, 'success');
    document.querySelector('.modal-overlay')?.remove();
    window._apBildDataUrl = null;
  } catch(e) {
    toast('Fehler: ' + e.message, 'danger');
  }
}

async function apLoeschen(id) {
  if (!confirm('Profil wirklich löschen?')) return;
  try {
    await loescheAthletProfil(id);
    toast('Profil gelöscht', 'info');
    document.querySelector('.modal-overlay')?.remove();
    zeigeAthletenProfileVerwaltung();
  } catch(e) { toast('Fehler: ' + e.message, 'danger'); }
}

// Profil in Athletenvorstellung laden

// ── Profil zu Veranstaltung hinzufügen (Mehrfachauswahl) ─────
function apZurVeranstaltungHinzu(erstesProfilJson) {
  ladeAthletenProfile().then(alleProfile => {
    const veranstaltungen = ladeGespeicherteVeranstaltungen();
    const erstesProfilObj = typeof erstesProfilJson === 'string'
      ? JSON.parse(erstesProfilJson.replace(/&quot;/g,'"'))
      : erstesProfilJson;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '540px';

    window._apAuswahl = new Set([erstesProfilObj.id]);
    window._apAlleProfile = alleProfile;

    modal.innerHTML = `
      <div class="modal-header">
        <h3>➕ Profile zu Veranstaltung</h3>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="font-size:.78rem;font-weight:700;color:var(--slzb-text-muted);
                    text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
          Athleten auswählen <span style="font-weight:400;text-transform:none">(Mehrfachauswahl)</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          ${alleProfile.map(p => `
            <div onclick="apToggleAuswahl('${p.id}',this)"
              style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;
                     border:2px solid ${p.id===erstesProfilObj.id?'#003366':'var(--slzb-border)'};
                     background:${p.id===erstesProfilObj.id?'rgba(0,51,102,.1)':'var(--slzb-bg-secondary)'};
                     cursor:pointer;transition:all .15s;user-select:none" data-selected="${p.id===erstesProfilObj.id?'1':'0'}">
              ${p.bild_url
                ? `<img src="${esc(p.bild_url)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0">`
                : `<div style="width:32px;height:32px;border-radius:50%;background:#003366;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.8rem;flex-shrink:0">${esc(p.name.slice(0,2).toUpperCase())}</div>`}
              <div>
                <div style="font-weight:700;font-size:.85rem">${esc(p.name)}</div>
                <div style="font-size:.72rem;color:var(--slzb-text-muted)">${esc(p.sportart||'–')}</div>
              </div>
              <div id="ap-check-${p.id}" style="margin-left:auto;font-size:1.1rem">${p.id===erstesProfilObj.id?'✅':'○'}</div>
            </div>`).join('')}
        </div>
        <div style="font-size:.78rem;font-weight:700;color:var(--slzb-text-muted);
                    text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Ziel-Veranstaltung</div>
        ${veranstaltungen.map(v => `
          <div onclick="apFuegeAuswahlZuVeranstaltungHinzu('${v.id}')"
            style="border:1px solid var(--slzb-border);border-radius:8px;padding:10px 14px;
                   margin-bottom:6px;cursor:pointer;transition:border-color .15s"
            onmouseover="this.style.borderColor='#003366'" onmouseout="this.style.borderColor='var(--slzb-border)'">
            <div style="font-weight:700;font-size:.88rem">${esc(v.veranstaltung)}</div>
            <div style="font-size:.75rem;color:var(--slzb-text-muted)">${v.sportart?esc(v.sportart)+' · ':''}${(v.athleten||[]).length} Athlet(en)</div>
          </div>`).join('')}
        <button class="btn btn-outline" style="width:100%;margin-top:8px"
          onclick="apFuegeAuswahlZuNeuerVeranstaltung()">✨ Neue Veranstaltung erstellen</button>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
        <span id="ap-auswahl-count" style="font-size:.82rem;color:var(--slzb-text-muted);align-self:center">1 ausgewählt</span>
      </div>`;

    overlay.appendChild(modal);
    overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  });
}

function apToggleAuswahl(profilId, el) {
  if (!window._apAuswahl) window._apAuswahl = new Set();
  const check = document.getElementById('ap-check-'+profilId);
  if (window._apAuswahl.has(profilId)) {
    window._apAuswahl.delete(profilId);
    el.style.borderColor = 'var(--slzb-border)';
    el.style.background = 'var(--slzb-bg-secondary)';
    if (check) check.textContent = '○';
  } else {
    window._apAuswahl.add(profilId);
    el.style.borderColor = '#003366';
    el.style.background = 'rgba(0,51,102,.1)';
    if (check) check.textContent = '✅';
  }
  const cnt = document.getElementById('ap-auswahl-count');
  if (cnt) cnt.textContent = window._apAuswahl.size + ' ausgewählt';
}

async function apFuegeAuswahlZuVeranstaltungHinzu(veranstaltungsId) {
  const profile = (window._apAlleProfile||[]).filter(p => (window._apAuswahl||new Set()).has(p.id));
  if (!profile.length) { toast('Bitte mindestens ein Profil auswählen', 'warning'); return; }
  document.querySelectorAll('.modal-overlay').forEach(o => o.remove());
  const liste = ladeGespeicherteVeranstaltungen();
  const v = liste.find(x => x.id === veranstaltungsId);
  if (!v) return;
  window._avGespeicherteDaten = {
    veranstaltung: v.veranstaltung, ort: v.ort||'', sportart: v.sportart||'',
    format: v.format||'carousel', teamfotoUrl: v.teamfotoUrl||null,
    athleten: (v.athleten||[]).map(a => ({...a, erfolgeStr: a.erfolge?.join(', ')||'', startsStr: a.starts?.join('\n')||'', bildUrl: a.bildUrl||null, bildObj: null}))
  };
  zeigeAthletenVorstellungMitDaten();
  setTimeout(async () => {
    for (const p of profile) {
      await apProfilWaehlen(p, false); // false = Modal nicht schließen
      await new Promise(r=>setTimeout(r,300));
    }
    toast('✅ '+profile.length+' Athlet(en) zu "'+v.veranstaltung+'" hinzugefügt', 'success');
  }, 800);
}

async function apFuegeAuswahlZuNeuerVeranstaltung() {
  const profile = (window._apAlleProfile||[]).filter(p => (window._apAuswahl||new Set()).has(p.id));
  if (!profile.length) { toast('Bitte mindestens ein Profil auswählen', 'warning'); return; }
  document.querySelectorAll('.modal-overlay').forEach(o => o.remove());
  window._avGespeicherteDaten = null;
  zeigeAthletenVorstellung();
  setTimeout(async () => {
    for (const p of profile) { await apProfilWaehlen(p, false); await new Promise(r=>setTimeout(r,300)); }
    toast('✅ '+profile.length+' Athlet(en) hinzugefügt – bitte Veranstaltungsname eingeben', 'info');
    setTimeout(() => {
      const el = document.getElementById('av-veranstaltung');
      if (el) { el.focus(); el.select(); }
    }, 200);
  }, 800);
}

// ── Schnell-Meldung direkt aus Profil ────────────────────────────
function zeigeSchnellMeldungAusProfil(profil) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '480px';

  const mi = {1:'🥇',2:'🥈',3:'🥉'};

  modal.innerHTML = `
    <div class="modal-header" style="background:linear-gradient(135deg,#003366,#001F4D);color:#fff;border-radius:14px 14px 0 0">
      <div>
        <h3 style="color:#fff">⚡ Schnell-Meldung</h3>
        <div style="font-size:.78rem;color:rgba(255,255,255,.6)">${esc(profil.name)} · ${esc(profil.sportart||'')}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()" style="color:#fff">✕</button>
    </div>
    <div class="modal-body" style="padding:16px">
      <div class="form-group mb-3">
        <label style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em;color:var(--slzb-text-muted)">Wettbewerb / Veranstaltung</label>
        <input type="text" id="sm-wettbewerb" placeholder="z.B. Deutsche Meisterschaft"
          style="width:100%;margin-top:4px" list="sm-wb-list">
        <datalist id="sm-wb-list">
          ${ladeGespeicherteVeranstaltungen().map(v => `<option value="${esc(v.veranstaltung)}">`).join('')}
        </datalist>
      </div>
      <div class="form-group mb-3">
        <label style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em;color:var(--slzb-text-muted)">Platzierung</label>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
          ${[1,2,3,4,5,6,7,8].map(p => `
            <button onclick="smSetPlatz(${p},this)"
              style="flex:1;min-width:44px;padding:10px 4px;border-radius:8px;border:2px solid var(--slzb-border);
                     background:var(--slzb-bg-secondary);font-size:.95rem;font-weight:800;cursor:pointer;font-family:inherit">
              ${mi[p]||p+'.'}</button>`).join('')}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="form-group">
          <label style="font-size:.78rem;font-weight:700;color:var(--slzb-text-muted)">Disziplin</label>
          <input type="text" id="sm-disziplin" placeholder="z.B. 1000m" style="width:100%;margin-top:4px">
        </div>
        <div class="form-group">
          <label style="font-size:.78rem;font-weight:700;color:var(--slzb-text-muted)">Datum</label>
          <input type="date" id="sm-datum" value="${new Date().toISOString().slice(0,10)}" style="width:100%;margin-top:4px">
        </div>
      </div>
      <div id="sm-vorschau" style="background:var(--slzb-bg-secondary);border-radius:8px;padding:10px 14px;
           font-size:.82rem;color:var(--slzb-text-muted);border:1px solid var(--slzb-border)">
        ← Wettbewerb und Platz wählen
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-outline" onclick="smEinreichen(false, ${JSON.stringify(profil).replace(/"/g,'&quot;')})">📋 Nur Meldung</button>
      <button class="btn btn-primary" onclick="smEinreichen(true, ${JSON.stringify(profil).replace(/"/g,'&quot;')})">🖼️ Meldung + Poster</button>
    </div>`;

  window._smPlatz = null;
  window._smProfil = profil;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);
}

function smSetPlatz(platz, btn) {
  window._smPlatz = platz;
  const farben = {1:'#C9A227',2:'#8A9BB0',3:'#C2783A'};
  document.querySelectorAll('[onclick^="smSetPlatz"]').forEach(b => {
    b.style.borderColor = 'var(--slzb-border)';
    b.style.background = 'var(--slzb-bg-secondary)';
  });
  const f = farben[platz] || '#003366';
  btn.style.borderColor = f;
  btn.style.background = f;
  btn.style.color = platz <= 3 ? '#000' : '#fff';
  // Vorschau
  const wb = document.getElementById('sm-wettbewerb')?.value.trim();
  const disziplin = document.getElementById('sm-disziplin')?.value.trim();
  const mi = {1:'🥇',2:'🥈',3:'🥉'};
  const vorschau = document.getElementById('sm-vorschau');
  if (vorschau && wb) {
    vorschau.innerHTML = `✅ <strong>${esc(window._smProfil?.name)}</strong> · ${mi[platz]||platz+'.'} Platz${disziplin?' – '+esc(disziplin):''} bei ${esc(wb)}`;
    vorschau.style.color = 'var(--slzb-text)';
    vorschau.style.borderColor = '#4caf50';
  }
}

async function smEinreichen(mitPoster, profilJson) {
  const profil = typeof profilJson === 'string' ? JSON.parse(profilJson.replace(/&quot;/g,'"')) : profilJson;
  const platz = window._smPlatz;
  const wb = document.getElementById('sm-wettbewerb')?.value.trim();
  const disziplin = document.getElementById('sm-disziplin')?.value.trim();
  const datum = document.getElementById('sm-datum')?.value;

  if (!wb) { toast('Bitte Wettbewerb eingeben', 'warning'); return; }
  if (!platz) { toast('Bitte Platzierung wählen', 'warning'); return; }

  document.querySelector('.modal-overlay')?.remove();
  toast('⏳ Meldung wird eingereicht...', 'info');

  try {
    const sportartObj = (typeof SLZB_DB !== 'undefined')
      ? SLZB_DB.sportarten.find(s => s.name === profil.sportart)
      : null;

    const meldungsDaten = {
      meldungsart:  'Einzelerfolg',
      titel:        `${platz}. Platz${disziplin?' – '+disziplin:''} bei ${wb}`,
      sportartId:   sportartObj?.id || null,
      sportartText: profil.sportart || '',
      disziplin:    disziplin || '',
      wettbewerbText: wb,
      datum:        datum || new Date().toISOString().slice(0,10),
      platzierung:  platz,
      medaille:     platz===1?'Gold':platz===2?'Silber':platz===3?'Bronze':'keine',
      status:       'Eingereicht',
    };
    const beteiligte = [{ schuelerId: null, anzeigename: profil.name, rolle: 'Athlet',
                          einwilligungsstatus: 'Nicht geprüft', profilId: profil.id }];

    const result = await DB.erstelleErfolg(meldungsDaten, beteiligte);
    if (!result.ok) throw new Error(result.fehler);

    APP._erfolgeCache = null;
    toast(`✅ Meldung ${result.nr} eingereicht!`, 'success');

    if (mitPoster) {
      // Poster erstellen
      const W = 1080, H = 1350;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      window._bildOffset = { x:0.5, y:0.2 }; window._bildZoom = 1.0;
      let bild = null;
      if (profil.bild_url) {
        bild = await new Promise(res => {
          const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null);
          img.src = profil.bild_url;
        });
      }
      await zeichneAthletPortrait(ctx, W, H, {
        name: profil.name, vorname: profil.vorname, nachname: profil.nachname,
        sportart: profil.sportart || '', veranstaltung: wb, kader: disziplin || '',
        erfolge: [`${platz}. Platz${disziplin?' – '+disziplin:''}`],
        bild, akzent: 'rot',
      });
      const a = document.createElement('a');
      a.download = `SLZB_${profil.name.replace(/\s+/g,'_')}_${datum||'heute'}.png`;
      canvas.toBlob(blob => { a.href = URL.createObjectURL(blob); a.click(); }, 'image/png');
      toast('✅ Poster heruntergeladen!', 'success');
    }
  } catch(e) {
    toast('Fehler: ' + e.message, 'danger');
  }
}
async function apProfilWaehlen(profil) {
  document.querySelector('.modal-overlay')?.remove();
  // Finde den nächsten freien Athleten-Slot oder füge neuen hinzu
  const liste = document.getElementById('av-athleten-liste');
  if (!liste) { toast('Bitte zuerst das Athletenvorstellungs-Formular öffnen', 'warning'); return; }

  avAthletHinzu();
  const id = _avCounter;
  setTimeout(async () => {
    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el && val) el.value = val; };
    setVal(`av-vorname-${id}`, profil.vorname || profil.name.split(' ')[0]);
    setVal(`av-nachname-${id}`, profil.nachname || profil.name.split(' ').slice(1).join(' '));
    setVal(`av-kader-${id}`, profil.kader);
    // Profil-ID für spätere Aktualisierung speichern
    const profilIdEl = document.getElementById(`av-athlet-${id}`);
    if (profilIdEl && profil.id) profilIdEl.dataset.profilId = profil.id;
    if (profil.bild_url) {
      const preview = document.getElementById(`av-bild-preview-${id}`);
      if (preview) { preview.src = profil.bild_url; preview.style.display = 'block'; }
      // Bild als DataURL laden
      try {
        const res = await fetch(profil.bild_url);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = ev => {
          const img = new Image();
          img.onload = () => { window[`_avBildObj_${id}`] = img; };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(blob);
      } catch(e) { console.warn('Profil-Bild:', e.message); }
    }
    toast(`✅ ${profil.name} hinzugefügt`, 'success');
  }, 100);
}

// ══════════════════════════════════════════════════════════════
// ERGEBNIS-UPDATE AUS WORKSPACE
// ══════════════════════════════════════════════════════════════

function zeigeErgebnisUpdateModal(veranstaltungsId) {
  const liste = ladeGespeicherteVeranstaltungen();
  const v = liste.find(x => x.id === veranstaltungsId);
  if (!v) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '560px';

  // Schnell-Platz-Buttons
  const platzButtons = [1,2,3,4,5,6,7,8].map(p => {
    const farben = {1:'#C9A227',2:'#8A9BB0',3:'#C2783A'};
    const emojis = {1:'🥇',2:'🥈',3:'🥉'};
    return `<button onclick="euSetPlatz(${p})" id="eu-platz-btn-${p}"
      style="flex:1;min-width:48px;padding:12px 4px;border-radius:8px;border:2px solid var(--slzb-border);
             background:var(--slzb-bg-secondary);color:var(--slzb-text);font-size:1rem;font-weight:800;
             cursor:pointer;transition:all .15s;font-family:inherit"
      onmouseover="this.style.borderColor='${farben[p]||'#003366'}'"
      onmouseout="if(window._euPlatz!==${p})this.style.borderColor='var(--slzb-border)'">
      ${emojis[p]||p+'.'}</button>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal-header" style="background:linear-gradient(135deg,#003366,#001F4D);color:#fff;border-radius:14px 14px 0 0">
      <div>
        <h3 style="color:#fff;margin-bottom:2px">🏆 Ergebnis-Update</h3>
        <div style="font-size:.78rem;color:rgba(255,255,255,.6)">${esc(v.veranstaltung)}${v.ort?' · '+esc(v.ort):''}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()" style="color:#fff">✕</button>
    </div>
    <div class="modal-body" style="padding:16px">

      <!-- Athlet wählen -->
      <div class="form-group mb-3">
        <label style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em;color:var(--slzb-text-muted)">Athlet</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          ${(v.athleten||[]).map(a => {
            const name = a.name || (a.vorname+' '+a.nachname).trim();
            return `<button onclick="euWaehleAthlet('${esc(name)}',this)"
              style="padding:8px 14px;border-radius:20px;border:2px solid var(--slzb-border);
                     background:var(--slzb-bg-secondary);cursor:pointer;font-size:.85rem;
                     font-weight:600;font-family:inherit;transition:all .15s"
              onmouseover="this.style.borderColor='#003366'"
              onmouseout="if(window._euAthlet!=='${esc(name)}')this.style.borderColor='var(--slzb-border)'">
              ${esc(name)}</button>`;
          }).join('')}
          <button onclick="euWaehleAthlet('__alle__',this)"
            style="padding:8px 14px;border-radius:20px;border:2px solid var(--slzb-border);
                   background:var(--slzb-bg-secondary);cursor:pointer;font-size:.85rem;
                   font-weight:600;font-family:inherit">
            👥 Alle</button>
        </div>
      </div>

      <!-- Platz wählen (große Buttons) -->
      <div class="form-group mb-3">
        <label style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.05em;color:var(--slzb-text-muted)">Platzierung</label>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
          ${platzButtons}
        </div>
      </div>

      <!-- Disziplin + Ergebnis (kompakt) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="form-group">
          <label style="font-size:.78rem;font-weight:700;color:var(--slzb-text-muted)">Disziplin</label>
          <input type="text" id="eu-disziplin" placeholder="z.B. 500m Sprint"
            style="width:100%;margin-top:4px" oninput="euAktualisierePoster()">
        </div>
        <div class="form-group">
          <label style="font-size:.78rem;font-weight:700;color:var(--slzb-text-muted)">Zeit / Ergebnis</label>
          <input type="text" id="eu-ergebnis" placeholder="z.B. 38,42 Sek."
            style="width:100%;margin-top:4px" oninput="euAktualisierePoster()">
        </div>
      </div>

      <!-- Zusatzinfo -->
      <div class="form-group mb-3">
        <input type="text" id="eu-zusatz" placeholder="💬 Zusatzinfo (optional): z.B. Neuer Schulrekord"
          style="width:100%" oninput="euAktualisierePoster()">
      </div>

      <!-- Foto mit Zoom-Editor -->
      <div class="form-group mb-3">
        <label style="font-size:.78rem;font-weight:700;color:var(--slzb-text-muted)">📸 Foto (optional)</label>
        <input type="file" id="eu-bild" accept="image/jpeg,image/png,image/webp"
          onchange="euBildVorschau(this)" style="width:100%;margin-top:4px">
        <div id="eu-bild-editor" style="display:none;margin-top:8px;background:var(--slzb-bg-secondary);border-radius:8px;padding:10px">
          <img id="eu-bild-preview" src="" style="max-height:80px;border-radius:6px;display:block;margin:0 auto 8px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <label style="font-size:.72rem;color:var(--slzb-text-muted);white-space:nowrap">Zoom:</label>
            <input type="range" id="eu-bild-zoom" min="50" max="200" value="100" step="5"
              style="flex:1;min-width:80px" oninput="euBildZoomAktualisieren()">
            <span id="eu-bild-zoom-val" style="font-size:.72rem;color:var(--slzb-text-muted);min-width:35px">100%</span>
            <label style="font-size:.72rem;color:var(--slzb-text-muted);white-space:nowrap">Pos Y:</label>
            <input type="range" id="eu-bild-pos-y" min="0" max="100" value="20" step="5"
              style="flex:1;min-width:80px" oninput="euBildZoomAktualisieren()">
            <button class="btn btn-ghost btn-sm" onclick="euBildEntfernen()" style="font-size:.72rem">✕ Entfernen</button>
          </div>
        </div>
      </div>

      <!-- Live-Vorschau als Canvas-Poster -->\
      <div id=\"eu-vorschau-wrap\" style=\"margin-top:8px\">\
        <div style=\"font-size:.72rem;font-weight:700;color:var(--slzb-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px\">🖼️ Poster-Vorschau</div>\
        <canvas id=\"eu-preview-canvas\" width=\"540\" height=\"675\"\
          style=\"max-width:100%;max-height:260px;display:block;margin:0 auto;border-radius:6px;background:#111\"></canvas>\
      </div>\
      <div id=\"eu-vorschau\" style=\"background:var(--slzb-bg-secondary);border-radius:8px;padding:8px 14px;\
           font-size:.78rem;color:var(--slzb-text-muted);min-height:32px;border:1px solid var(--slzb-border);margin-top:6px\">\
        ← Athlet und Platz wählen für Vorschau\
      </div>\
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-outline" onclick="euErstellePoster('${veranstaltungsId}', false)">🖼️ Nur Poster</button>
      <button class="btn btn-primary" onclick="euErstellePoster('${veranstaltungsId}', true)">📤 Poster + Meldung</button>
    </div>`;

  // State
  window._euPlatz = null;
  window._euAthlet = null;
  window._euVeranstaltungsId = veranstaltungsId;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  // Keyboard-Shortcuts: 1-8 für Platz
  const keyHandler = e => {
    if (!document.querySelector('.modal-overlay')) { document.removeEventListener('keydown', keyHandler); return; }
    const n = parseInt(e.key);
    if (n >= 1 && n <= 8) {
      const btn = document.getElementById(`eu-platz-btn-${n}`);
      if (btn) btn.click();
    }
  };
  document.addEventListener('keydown', keyHandler);
}

// Athlet wählen
function euWaehleAthlet(name, btn) {
  window._euAthlet = name;
  document.querySelectorAll('[onclick^="euWaehleAthlet"]').forEach(b => {
    b.style.borderColor = 'var(--slzb-border)';
    b.style.background = 'var(--slzb-bg-secondary)';
    b.style.color = 'var(--slzb-text)';
  });
  btn.style.borderColor = '#003366';
  btn.style.background = '#003366';
  btn.style.color = '#fff';
  euAktualisierePoster();
}

// Platz wählen
function euSetPlatz(platz) {
  window._euPlatz = platz;
  const farben = {1:'#C9A227',2:'#8A9BB0',3:'#C2783A'};
  document.querySelectorAll('[id^="eu-platz-btn-"]').forEach(b => {
    b.style.borderColor = 'var(--slzb-border)';
    b.style.background = 'var(--slzb-bg-secondary)';
    b.style.color = 'var(--slzb-text)';
  });
  const btn = document.getElementById(`eu-platz-btn-${platz}`);
  if (btn) {
    const f = farben[platz] || '#003366';
    btn.style.borderColor = f;
    btn.style.background = f;
    btn.style.color = platz <= 3 ? '#000' : '#fff';
  }
  euAktualisierePoster();
}

// Live-Vorschau aktualisieren
async function euAktualisierePoster() {
  const vorschau = document.getElementById('eu-vorschau');
  const vorschauWrap = document.getElementById('eu-vorschau-wrap');
  if (!vorschau) return;
  const athlet = window._euAthlet;
  const platz = window._euPlatz;
  const disziplin = document.getElementById('eu-disziplin')?.value.trim();
  const ergebnis = document.getElementById('eu-ergebnis')?.value.trim();
  const zusatz = document.getElementById('eu-zusatz')?.value.trim();

  if (!athlet || !platz) {
    vorschau.textContent = '← Athlet und Platz wählen für Vorschau';
    if (vorschauWrap) vorschauWrap.style.display = 'none';
    return;
  }

  const mi = {1:'🥇',2:'🥈',3:'🥉'};
  const platzText = `${mi[platz]||''} ${platz}. Platz`;
  const parts = [
    athlet !== '__alle__' ? `<strong>${esc(athlet)}</strong>` : '<strong>Alle Athleten</strong>',
    platzText,
    disziplin ? `in ${esc(disziplin)}` : '',
    ergebnis ? `(${esc(ergebnis)})` : '',
    zusatz ? `· ${esc(zusatz)}` : '',
  ].filter(Boolean);

  vorschau.innerHTML = `✅ ${parts.join(' ')}`;
  vorschau.style.color = 'var(--slzb-text)';
  vorschau.style.borderColor = '#4caf50';

  // Canvas-Vorschau zeichnen
  const canvas = document.getElementById('eu-preview-canvas');
  if (!canvas || typeof zeichneAthletPortrait !== 'function') return;

  if (vorschauWrap) vorschauWrap.style.display = 'block';

  // Zoom-Controls anzeigen wenn Bild vorhanden
  const zoomControls = document.getElementById('eu-zoom-controls');
  if (zoomControls) zoomControls.style.display = window._euBildDataUrl ? 'block' : 'none';

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Bild laden
  let bild = null;
  if (window._euBildDataUrl) {
    try {
      bild = await new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = window._euBildDataUrl;
      });
      // Zoom/Position anwenden
      if (bild) {
        window._bildZoom = window._euBildZoom || 1.0;
        window._bildOffset = { x: 0.5, y: window._euBildPosY || 0.2 };
      }
    } catch(e) { bild = null; }
  }

  // Veranstaltung aus Workspace
  const v = window._euVeranstaltungsId
    ? (ladeGespeicherteVeranstaltungen() || []).find(x => x.id === window._euVeranstaltungsId)
    : null;

  const athletName = athlet === '__alle__' ? (v?.veranstaltung || 'Alle') : athlet;
  const nameParts = athletName.trim().split(' ');

  await zeichneAthletPortrait(ctx, W, H, {
    vorname: nameParts.slice(0, -1).join(' ') || athletName,
    nachname: nameParts.length > 1 ? nameParts[nameParts.length-1] : '',
    sportart: v?.sportart || '',
    veranstaltung: v?.veranstaltung || '',
    ort: v?.ort || '',
    kader: disziplin || '',
    erfolge: [
      `${platz}. Platz${disziplin ? ' – ' + disziplin : ''}${ergebnis ? ' (' + ergebnis + ')' : ''}`,
      ...(zusatz ? [zusatz] : []),
    ],
    bild,
    akzent: 'rot',
  });
}



// ── Instagram Teilen ──────────────────────────────────────────
async function teileAufInstagram(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) { toast('Kein Poster gefunden', 'warning'); return; }

  // Poster als Blob
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  const dateiname = `SLZB_${new Date().toISOString().slice(0,10)}.png`;

  // Methode 1: Web Share API (Mobile - öffnet direkt Instagram)
  if (navigator.share && navigator.canShare?.({ files: [new File([blob], dateiname, {type:'image/png'})] })) {
    try {
      await navigator.share({
        files: [new File([blob], dateiname, { type: 'image/png' })],
        title: 'SLZB-Erfolge',
      });
      toast('✅ Teilen-Dialog geöffnet', 'success');
      return;
    } catch(e) {
      if (e.name !== 'AbortError') console.warn('Share:', e.message);
    }
  }

  // Methode 2: Clipboard API (Desktop)
  if (navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast('📋 Bild in Zwischenablage kopiert! Jetzt Instagram öffnen und einfügen.', 'success', 6000);
      // Instagram öffnen
      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank');
      }, 1500);
      return;
    } catch(e) {
      console.warn('Clipboard:', e.message);
    }
  }

  // Methode 3: Download + Instagram-Link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = dateiname;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 300);

  // Instagram-Hinweis
  zeigeInstagramHinweis(dateiname);
}

function zeigeInstagramHinweis(dateiname) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '400px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>📱 Auf Instagram teilen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:3rem;margin-bottom:12px">📥</div>
        <p style="font-weight:700;margin-bottom:8px">Bild wurde heruntergeladen!</p>
        <p style="font-size:.85rem;color:var(--slzb-text-muted);line-height:1.6;margin-bottom:16px">
          <strong>Auf dem Smartphone:</strong><br>
          1. Instagram App öffnen<br>
          2. Neuer Beitrag → Bild aus Galerie wählen<br>
          3. „${esc(dateiname)}" auswählen
        </p>
        <p style="font-size:.85rem;color:var(--slzb-text-muted);line-height:1.6">
          <strong>Auf dem Desktop:</strong><br>
          1. instagram.com öffnen<br>
          2. Neuer Beitrag → Bild hochladen
        </p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
      <button class="btn btn-primary" onclick="window.open('https://www.instagram.com/','_blank');this.closest('.modal-overlay').remove()">
        📱 Instagram öffnen
      </button>
    </div>`;
  overlay.appendChild(modal);
  overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function euBildVorschau(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('eu-bild-preview');
    const editor = document.getElementById('eu-bild-editor');
    if (preview) { preview.src = ev.target.result; }
    if (editor) editor.style.display = 'block';
    window._euBildDataUrl = ev.target.result;
    // Zoom zurücksetzen
    const zoom = document.getElementById('eu-bild-zoom');
    const posY = document.getElementById('eu-bild-pos-y');
    if (zoom) zoom.value = 100;
    if (posY) posY.value = 20;
    euBildZoomAktualisieren();
  };
  reader.readAsDataURL(file);
}

function euBildZoomAktualisieren() {
  const zoom = parseInt(document.getElementById('eu-bild-zoom')?.value || 100);
  const posY = parseInt(document.getElementById('eu-bild-pos-y')?.value || 20);
  const zoomVal = document.getElementById('eu-bild-zoom-val');
  if (zoomVal) zoomVal.textContent = zoom + '%';
  // Speichere Zoom/Position für Poster-Rendering
  window._euBildZoom = zoom / 100;
  window._euBildPosY = posY / 100;
  // Vorschau-Bild aktualisieren
  const preview = document.getElementById('eu-bild-preview');
  if (preview) {
    preview.style.objectFit = 'cover';
    preview.style.objectPosition = `center ${posY}%`;
    preview.style.transform = `scale(${zoom/100})`;
    preview.style.transformOrigin = `center ${posY}%`;
  }
  euAktualisierePoster();
}

function euBildEntfernen() {
  window._euBildDataUrl = null;
  window._euBildZoom = 1.0;
  window._euBildPosY = 0.2;
  const preview = document.getElementById('eu-bild-preview');
  const editor = document.getElementById('eu-bild-editor');
  const input = document.getElementById('eu-bild');
  if (preview) { preview.src = ''; }
  if (editor) editor.style.display = 'none';
  if (input) input.value = '';
  euAktualisierePoster();
}

async function euErstellePoster(veranstaltungsId, mitMeldung) {
  const liste = ladeGespeicherteVeranstaltungen();
  const v = liste.find(x => x.id === veranstaltungsId);
  if (!v) return;

  const athletName = document.getElementById('eu-athlet')?.value;
  const disziplin  = document.getElementById('eu-disziplin')?.value.trim();
  const platz      = parseInt(document.getElementById('eu-platz')?.value) || null;
  const ergebnis   = document.getElementById('eu-ergebnis')?.value.trim();
  const zusatz     = document.getElementById('eu-zusatz')?.value.trim();

  if (!athletName) { toast('Bitte Athleten auswählen', 'warning'); return; }
  if (!platz) { toast('Bitte Platzierung wählen', 'warning'); return; }

  document.querySelector('.modal-overlay')?.remove();
  toast('⏳ Poster wird erstellt...', 'info');

  // Bild laden (mit Zoom/Position)
  let bild = null;
  if (window._euBildDataUrl) {
    bild = await new Promise(res => {
      const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null);
      img.src = window._euBildDataUrl;
    });
    // Zoom und Position für Canvas übernehmen
    window._bildZoom = window._euBildZoom || 1.0;
    window._bildOffset = { x: 0.5, y: window._euBildPosY || 0.2 };
    // NICHT zurücksetzen - damit Bild beim nächsten Mal noch da ist
  }

  // Athlet-Daten aus Workspace
  const athlet = athletName === '__alle__'
    ? { name: v.veranstaltung, vorname: '', nachname: '' }
    : (v.athleten||[]).find(a => (a.name||a.vorname+' '+a.nachname) === athletName) || { name: athletName };

  // Poster erstellen
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  window._bildOffset = { x: 0.5, y: 0.2 };
  window._bildZoom = 1.0;

  await zeichneAthletPortrait(ctx, W, H, {
    ...athlet,
    sportart: v.sportart || '',
    veranstaltung: v.veranstaltung,
    ort: v.ort || '',
    kader: disziplin || athlet.kader || '',
    ziel: ergebnis ? `${platz ? platz+'. Platz' : ''} ${ergebnis}`.trim() : zusatz || '',
    erfolge: [
      ...(platz ? [`${platz}. Platz${disziplin?' – '+disziplin:''}${ergebnis?' ('+ergebnis+')':''}`] : []),
      ...(zusatz ? [zusatz] : []),
    ],
    bild,
    akzent: 'rot',
  });

  // Download
  const a = document.createElement('a');
  a.download = `SLZB_Update_${(athlet.name||'').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.png`;
  canvas.toBlob(blob => { a.href = URL.createObjectURL(blob); a.click(); }, 'image/png');

  // Optional: Meldung erstellen
  if (mitMeldung && platz) {
    toast('✅ Poster heruntergeladen! Meldung wird vorbereitet...', 'success');
    setTimeout(() => {
      navigateTo('neue-meldung');
      setTimeout(() => {
        const titelEl = document.getElementById('f-titel');
        const sportEl = document.getElementById('f-sportart-text');
        const schuelerEl = document.getElementById('f-schueler-text');
        if (titelEl) titelEl.value = `${platz}. Platz${disziplin?' – '+disziplin:''} bei ${v.veranstaltung}`;
        if (sportEl) sportEl.value = v.sportart || '';
        if (schuelerEl) schuelerEl.value = athlet.name || '';
      }, 300);
    }, 1000);
  } else {
    toast('✅ Poster heruntergeladen!', 'success');
  }
}

function ladeGespeicherteVeranstaltungen() {
  return JSON.parse(localStorage.getItem('slzb_av_veranstaltungen') || '[]');
}

function speichereVeranstaltung(daten) {
  const liste = ladeGespeicherteVeranstaltungen();
  const id = 'av_' + Date.now();
  const eintrag = { id, ...daten, gespeichertAm: new Date().toISOString() };
  liste.unshift(eintrag); // Neueste zuerst
  // Maximal 10 gespeicherte Veranstaltungen
  localStorage.setItem('slzb_av_veranstaltungen', JSON.stringify(liste.slice(0, 10)));
  return id;
}

function loescheGespeicherteVeranstaltung(id) {
  const liste = ladeGespeicherteVeranstaltungen().filter(v => v.id !== id);
  localStorage.setItem('slzb_av_veranstaltungen', JSON.stringify(liste));
}


function avSpeichereWorkspace() {
  // Daten aus Formular-Feldern lesen (falls noch kein Vorschau-Modal geöffnet war)
  let opts = window._avOptsBase;
  let athleten = window._avAthleten;

  // Fallback: direkt aus Formular lesen
  if (!opts) {
    const veranstaltung = document.getElementById('av-veranstaltung')?.value.trim();
    const ort = document.getElementById('av-ort')?.value.trim() || '';
    const sportart = document.getElementById('av-sportart')?.value.trim() || '';
    if (!veranstaltung) { toast('Bitte zuerst Veranstaltungsname eingeben', 'warning'); return; }
    opts = { veranstaltung, ort, sportart, teamfoto: null };
  }
  if (!athleten?.length) {
    // Athleten aus Formular lesen
    const divs = [...document.querySelectorAll('[id^="av-athlet-"]')];
    athleten = divs.map(div => {
      const idMatch = div.id.match(/av-athlet-(\d+)/);
      if (!idMatch) return null;
      const id = idMatch[1];
      const vorname = document.getElementById()?.value.trim() || '';
      const nachname = document.getElementById()?.value.trim() || '';
      if (!vorname && !nachname) return null;
      return { vorname, nachname, name: (vorname+" "+nachname).trim(),
               kader: document.getElementById(`av-kader-${id}`)?.value.trim() || '',
               bildUrl: window[`_avBildObj_${id}`]?.src || null };
    }).filter(Boolean);
  }
  if (!opts?.veranstaltung) { toast('Bitte Veranstaltungsname eingeben', 'warning'); return; }
  if (!athleten?.length) { toast('Bitte mindestens einen Athleten hinzufügen', 'warning'); return; }

  const daten = {
    veranstaltung: opts.veranstaltung,
    ort: opts.ort || '',
    sportart: opts.sportart || '',
    format: window._avFormat || 'carousel',
    teamfotoUrl: opts.teamfoto?.src || null,
    athleten: athleten.map((a, i) => ({
      vorname: a.vorname,
      nachname: a.nachname,
      name: a.name,
      kader: a.kader,
      ziel: a.ziel,
      erfolge: a.erfolge,
      starts: a.starts,
      erfolgeStr: a.erfolge?.join(', ') || '',
      startsStr: a.starts?.join('\n') || '',
      bildUrl: a.bild?.src || null, // DataURL
    }))
  };

  speichereVeranstaltung(daten);
  toast('✅ Veranstaltung gespeichert – unter "📋 Gespeicherte Veranstaltungen" abrufbar', 'success');
}

function zeigeVeranstaltungsWorkspace() {
  const liste = ladeGespeicherteVeranstaltungen();
  console.log('[Workspace] Gespeicherte Veranstaltungen:', liste.length, liste.map(v=>v.veranstaltung));
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '650px';

  modal.innerHTML = `
    <div class="modal-header">
      <h3>📋 Gespeicherte Veranstaltungen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      ${!liste.length ? '<p class="text-muted">Noch keine Veranstaltungen gespeichert. Erstelle eine Athletenvorstellung und speichere sie für spätere Updates.</p>' :
        liste.map(v => `
          <div style="border:1px solid var(--slzb-border);border-radius:8px;padding:12px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-weight:700;font-size:.95rem">${esc(v.veranstaltung)}</div>
                <div style="font-size:.8rem;color:#888;margin-top:2px">
                  ${v.sportart ? esc(v.sportart) + ' · ' : ''}
                  ${v.ort ? '📍 ' + esc(v.ort) + ' · ' : ''}
                  ${v.athleten?.length || 0} Athlet(en) · 
                  ${new Date(v.gespeichertAm).toLocaleDateString('de-DE')}
                </div>
                <div style="font-size:.78rem;color:#666;margin-top:4px">
                  ${(v.athleten||[]).map(a => esc(a.name||a.vorname+' '+a.nachname)).join(', ')}
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;margin-left:12px">
                <button class="btn btn-primary btn-sm" onclick="ladeVeranstaltungWorkspace('${v.id}')">
                  ▶ Laden
                </button>
                <button class="btn btn-outline btn-sm" onclick="zeigeErgebnisUpdateModal('${v.id}')"
                  title="Ergebnis eintragen und Poster erstellen">
                  🏆 Update
                </button>
                <button class="btn btn-ghost btn-sm" style="color:#E2001A"
                  onclick="loescheGespeicherteVeranstaltung('${v.id}');this.closest('.modal-overlay').remove();zeigeVeranstaltungsWorkspace()">
                  🗑️
                </button>
              </div>
            </div>
          </div>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
    </div>`;

  overlay.appendChild(modal);
  overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function ladeVeranstaltungWorkspace(id) {
  const liste = ladeGespeicherteVeranstaltungen();
  const v = liste.find(x => x.id === id);
  if (!v) return;
  document.querySelector('.modal-overlay')?.remove();

  // Daten in _avGespeicherteDaten laden und Modal öffnen
  window._avGespeicherteDaten = {
    veranstaltung: v.veranstaltung,
    ort: v.ort || '',
    sportart: v.sportart || '',
    format: v.format || 'carousel',
    teamfotoUrl: v.teamfotoUrl || null,
    athleten: (v.athleten || []).map(a => ({
      ...a,
      erfolgeStr: a.erfolge?.join(', ') || '',
      startsStr: a.starts?.join('\n') || '',
      bildUrl: a.bildUrl || null,
      bildObj: null,
    }))
  };
  zeigeAthletenVorstellungMitDaten();
  toast('✅ Veranstaltung geladen – Bilder bitte neu hochladen', 'info');
}

function zeigeAthletenVorstellungMitDaten() {
  // Öffne das Modal und stelle die Daten wieder her
  zeigeAthletenVorstellung();
  // Nach kurzem Delay (DOM muss aufgebaut sein) Daten einfüllen
  setTimeout(() => {
    const gespeichert = window._avGespeicherteDaten;
    if (!gespeichert) return;

    // Veranstaltung + Sportart wiederherstellen
    const veranstEl = document.getElementById('av-veranstaltung');
    const sportartEl = document.getElementById('av-sportart');
    const formatEl = document.getElementById('av-format');
    if (veranstEl && gespeichert.veranstaltung) veranstEl.value = gespeichert.veranstaltung;
    if (sportartEl && gespeichert.sportart) sportartEl.value = gespeichert.sportart;
    if (formatEl && gespeichert.format) formatEl.value = gespeichert.format;

    // Athleten wiederherstellen
    // Teamfoto-Vorschau wiederherstellen
    if (gespeichert.teamfotoUrl) {
      const tfPreview = document.getElementById('av-teamfoto-preview');
      if (tfPreview) {
        tfPreview.src = gespeichert.teamfotoUrl;
        tfPreview.style.display = 'block';
      }
      window._avTeamfotoDataUrl = gespeichert.teamfotoUrl;
    }

    if (gespeichert.athleten?.length) {
      // Bestehende Athleten-Divs entfernen
      const liste = document.getElementById('av-athleten-liste');
      if (liste) liste.innerHTML = '';
      _avCounter = 0;

      for (const athlet of gespeichert.athleten) {
        avAthletHinzu();
        const id = _avCounter;
        const setVal = (elId, val) => {
          const el = document.getElementById(elId);
          if (el && val) el.value = val;
        };
        setVal('av-ort', gespeichert.ort);
        setVal(`av-vorname-${id}`, athlet.vorname);
        setVal(`av-nachname-${id}`, athlet.nachname);
        setVal(`av-kader-${id}`, athlet.kader);
        setVal(`av-ziel-${id}`, athlet.ziel);
        setVal(`av-erfolge-${id}`, athlet.erfolgeStr);
        setVal(`av-starts-${id}`, athlet.startsStr);

        // Bild aus DataURL wiederherstellen (DataURL ist dauerhaft gültig)
        if (athlet.bildUrl) {
          const preview = document.getElementById(`av-bild-preview-${id}`);
          if (preview) {
            preview.src = athlet.bildUrl;
            preview.style.display = 'block';
          }
          // Bild-Objekt aus DataURL neu laden (sicher und dauerhaft)
          const imgEl = new Image();
          imgEl.onload = () => { window[`_avBildObj_${id}`] = imgEl; };
          imgEl.src = athlet.bildUrl;
        }
      }
    }
  }, 150);
}


// Athletenvorstellung-Daten speichern (ohne Download)
function speichereAthletenVorstellungDaten() {
  const veranstaltung = document.getElementById('av-veranstaltung')?.value?.trim();
  const ort = document.getElementById('av-ort')?.value?.trim();
  const sportart = document.getElementById('av-sportart')?.value?.trim();
  const format = document.getElementById('av-format')?.value;

  if (!veranstaltung) {
    toast('Bitte Veranstaltungsname eingeben', 'warning');
    document.getElementById('av-veranstaltung')?.focus();
    return;
  }

  // Athleten-Daten sammeln
  const athleten = [];
  let i = 1;
  while (document.getElementById(`av-vorname-${i}`)) {
    const vorname = document.getElementById(`av-vorname-${i}`)?.value?.trim();
    const nachname = document.getElementById(`av-nachname-${i}`)?.value?.trim();
    const kader = document.getElementById(`av-kader-${i}`)?.value?.trim();
    const erfolge = document.getElementById(`av-erfolge-${i}`)?.value?.trim();
    const starts = document.getElementById(`av-starts-${i}`)?.value?.trim();
    const bildDataUrl = window[`_avBildDataUrl_${i}`] || null;
    const bildObj = window[`_avBildObj_${i}`] ? true : false;

    if (vorname || nachname) {
      athleten.push({ vorname, nachname, kader, erfolge, starts, hatBild: bildObj });
    }
    i++;
  }

  // In localStorage speichern
  const daten = {
    veranstaltung, ort, sportart, format,
    athleten,
    gespeichertAm: new Date().toISOString(),
  };
  localStorage.setItem('slzb_av_entwurf', JSON.stringify(daten));
  window._avGespeicherteDaten = daten;

  toast(`✅ Entwurf gespeichert: ${veranstaltung} (${athleten.length} Athlet${athleten.length!==1?'en':''})`, 'success');
}

async function erstelleAthletenVorstellung() {
  const veranstaltung = document.getElementById('av-veranstaltung')?.value.trim();
  const ort = document.getElementById('av-ort')?.value.trim() || '';
  const sportart = document.getElementById('av-sportart')?.value.trim();
  const format = document.getElementById('av-format')?.value || 'carousel';
  if (!veranstaltung) { toast('Bitte Veranstaltungsname eingeben', 'warning'); return; }

  const athletenDivs = [...document.querySelectorAll('[id^="av-athlet-"]')];
  if (!athletenDivs.length) { toast('Bitte mindestens einen Athleten hinzufügen', 'warning'); return; }

  // Athleten-Daten sammeln
  const athleten = [];
  for (const div of athletenDivs) {
    const idMatch = div.id.match(/av-athlet-(\d+)/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const vorname  = document.getElementById(`av-vorname-${id}`)?.value.trim() || '';
    const nachname = document.getElementById(`av-nachname-${id}`)?.value.trim() || '';
    if (!vorname && !nachname) continue;
    const kader    = document.getElementById(`av-kader-${id}`)?.value.trim() || '';
    const ziel     = document.getElementById(`av-ziel-${id}`)?.value.trim() || '';
    const erfolgeStr = document.getElementById(`av-erfolge-${id}`)?.value.trim() || '';
    const erfolge  = erfolgeStr ? erfolgeStr.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const startsStr = document.getElementById(`av-starts-${id}`)?.value.trim() || '';
    const starts   = startsStr ? startsStr.split('\n').map(s=>s.trim()).filter(Boolean) : [];
    const bildInput = document.getElementById(`av-bild-${id}`);
    let bild = null;
    // Prüfe zuerst ob ein gespeichertes Bild-Objekt vorhanden ist (nach Zurück-Navigation)
    if (window[`_avBildObj_${id}`]) {
      bild = window[`_avBildObj_${id}`];
    } else if (bildInput?.files?.[0]) {
      // Neues Bild laden - als DataURL speichern (bleibt dauerhaft gültig)
      const file = bildInput.files[0];
      bild = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = ev.target.result; // DataURL - dauerhaft gültig
        };
        reader.onerror = () => res(null);
        reader.readAsDataURL(file);
      });
      // Bild-Objekt für spätere Verwendung (Zurück-Navigation) speichern
      if (bild) window[`_avBildObj_${id}`] = bild;
    }
    athleten.push({ vorname, nachname, name: `${vorname} ${nachname}`.trim(), kader, ziel, erfolge, starts, bild });
  }

  if (!athleten.length) { toast('Keine gültigen Athleten', 'warning'); return; }

  document.querySelector('.modal-overlay')?.remove();

  // Teamfoto laden (ZUERST, bevor _avGespeicherteDaten gesetzt wird)
  let teamfoto = null;
  const teamfotoInput = document.getElementById('av-teamfoto');
  if (teamfotoInput?.files?.[0]) {
    // Als DataURL laden (dauerhaft gültig, kein Revoke-Problem)
    teamfoto = await new Promise(res => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = ev.target.result;
      };
      reader.onerror = () => res(null);
      reader.readAsDataURL(teamfotoInput.files[0]);
    });
  } else if (window._avTeamfotoDataUrl || window._avGespeicherteDaten?.teamfotoUrl) {
    // Teamfoto aus gecachter DataURL laden (nach Zurück-Navigation)
    const dataUrl = window._avTeamfotoDataUrl || window._avGespeicherteDaten.teamfotoUrl;
    teamfoto = await new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = dataUrl;
    });
  }

  // Daten für Zurück-Funktion speichern (NACH dem Teamfoto-Laden)
  window._avGespeicherteDaten = {
    veranstaltung,
    ort,
    sportart,
    format,
    teamfotoUrl: teamfoto?.src || null,  // DataURL des Teamfotos
    athleten: athleten.map((a, i) => ({
      ...a,
      erfolgeStr: a.erfolge?.join(', ') || '',
      startsStr: a.starts?.join('\n') || '',
      bildUrl: a.bild?.src || null,  // DataURL - dauerhaft gültig
      bildObj: a.bild || null,
    }))
  };

  const opts_base = { veranstaltung, ort, sportart, akzent: 'blau', teamfoto };
  await zeigeAthletenVorschau(athleten, opts_base, format);
}

async function zeigeAthletenVorschau(athleten, opts_base, format) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';
  modal.style.maxWidth = '900px';

  // Aktuell bearbeiteter Athlet
  let aktuellerIdx = 0;
  // Pro Athlet: eigener Offset + Zoom
  const bildSettings = athleten.map(() => ({ x: 0.5, y: 0.5, zoom: 1.0 }));

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🖼️ Vorschau & Bearbeitung</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body" style="background:#111;padding:16px">
      <!-- Athleten-Tabs -->
      <div id="av-tabs" class="tabs mb-3" style="flex-wrap:wrap;gap:4px;display:flex">
        ${athleten.map((a,i) => `<button class="tab-btn ${i===0?'active':''}" onclick="avWechsleAthlet(${i})">${a.vorname||a.name}</button>`).join('')}
      </div>
      <!-- Vorschau-Canvas -->
      <div style="text-align:center;margin-bottom:12px">
        <canvas id="av-preview-canvas" width="540" height="675"
          style="max-width:100%;max-height:55vh;display:block;margin:0 auto;border-radius:8px;background:#000"></canvas>
      </div>
      <!-- Bildausschnitt-Editor -->
      <div id="av-editor" style="background:rgba(255,255,255,.06);border-radius:8px;padding:12px">
        <div style="font-size:.78rem;color:#888;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Bildausschnitt</div>
        <div style="margin-bottom:10px">
          <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:4px;font-size:.82rem">
            <span>🔍 Zoom</span><span id="av-zoom-lbl" style="color:#E2001A">100%</span>
          </label>
          <input type="range" id="av-zoom" min="30" max="300" step="5" value="100"
            style="width:100%;accent-color:#E2001A" oninput="avAktualisiere()">
        </div>
        <div style="margin-bottom:10px">
          <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:4px;font-size:.82rem">
            <span>↔ Horizontal</span><span id="av-ox-lbl" style="color:#888">50%</span>
          </label>
          <input type="range" id="av-ox" min="0" max="100" value="50"
            style="width:100%;accent-color:#003366" oninput="avAktualisiere()">
        </div>
        <div style="margin-bottom:10px">
          <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:4px;font-size:.82rem">
            <span>↕ Vertikal</span><span id="av-oy-lbl" style="color:#888">50%</span>
          </label>
          <input type="range" id="av-oy" min="0" max="100" value="50"
            style="width:100%;accent-color:#003366" oninput="avAktualisiere()">
        </div>
        <div class="flex gap-2" style="flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="avPreset(50,20,100)">↑ Gesicht oben</button>
          <button class="btn btn-ghost btn-sm" onclick="avPreset(50,50,100)">⊙ Zentrieren</button>
          <button class="btn btn-ghost btn-sm" onclick="avPreset(50,30,150)">🔍 Zoom Gesicht</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove();zeigeAthletenVorstellungMitDaten()">← Zurück</button>
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-outline btn-sm" onclick="avSpeichereWorkspace()" title="Veranstaltung für spätere Updates speichern">💾 Speichern</button>
      <button class="btn btn-primary" onclick="avStarteDownload()">📥 Alle herunterladen</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  // Globale Variablen für den Editor
  window._avAthleten = athleten;
  window._avOptsBase = opts_base;
  window._avFormat = format;
  window._avBildSettings = bildSettings;
  window._avAktuellerIdx = 0;

  // Erste Vorschau rendern
  await avRenderVorschau(0);

  window.avWechsleAthlet = async (idx) => {
    // Aktuelle Einstellungen speichern
    window._avBildSettings[window._avAktuellerIdx] = {
      x: parseInt(document.getElementById('av-ox')?.value||50)/100,
      y: parseInt(document.getElementById('av-oy')?.value||50)/100,
      zoom: parseInt(document.getElementById('av-zoom')?.value||100)/100,
    };
    window._avAktuellerIdx = idx;
    // Tabs aktualisieren
    document.querySelectorAll('#av-tabs .tab-btn').forEach((b,i) => b.classList.toggle('active', i===idx));
    // Regler auf gespeicherte Werte setzen
    const s = window._avBildSettings[idx];
    document.getElementById('av-ox').value = Math.round(s.x*100);
    document.getElementById('av-oy').value = Math.round(s.y*100);
    document.getElementById('av-zoom').value = Math.round(s.zoom*100);
    document.getElementById('av-zoom-lbl').textContent = Math.round(s.zoom*100)+'%';
    document.getElementById('av-ox-lbl').textContent = Math.round(s.x*100)+'%';
    document.getElementById('av-oy-lbl').textContent = Math.round(s.y*100)+'%';
    await avRenderVorschau(idx);
  };

  window.avAktualisiere = async () => {
    const x = parseInt(document.getElementById('av-ox')?.value||50)/100;
    const y = parseInt(document.getElementById('av-oy')?.value||50)/100;
    const zoom = parseInt(document.getElementById('av-zoom')?.value||100)/100;
    document.getElementById('av-zoom-lbl').textContent = Math.round(zoom*100)+'%';
    document.getElementById('av-ox-lbl').textContent = Math.round(x*100)+'%';
    document.getElementById('av-oy-lbl').textContent = Math.round(y*100)+'%';
    window._avBildSettings[window._avAktuellerIdx] = { x, y, zoom };
    await avRenderVorschau(window._avAktuellerIdx);
  };

  window.avPreset = async (ox, oy, zoom) => {
    document.getElementById('av-ox').value = ox;
    document.getElementById('av-oy').value = oy;
    document.getElementById('av-zoom').value = zoom;
    await window.avAktualisiere();
  };

  window.avStarteDownload = async () => {
    // Letzte Einstellungen speichern
    window._avBildSettings[window._avAktuellerIdx] = {
      x: parseInt(document.getElementById('av-ox')?.value||50)/100,
      y: parseInt(document.getElementById('av-oy')?.value||50)/100,
      zoom: parseInt(document.getElementById('av-zoom')?.value||100)/100,
    };
    document.querySelector('.modal-overlay')?.remove();
    toast(`⏳ Erstelle Poster...`, 'info');
    await avDownloadAlle(window._avAthleten, window._avOptsBase, window._avFormat, window._avBildSettings);
  };
}

async function avRenderVorschau(idx) {
  const canvas = document.getElementById('av-preview-canvas');
  if (!canvas) return;
  const athlet = window._avAthleten?.[idx];
  if (!athlet) return;
  const s = window._avBildSettings?.[idx] || { x:0.5, y:0.5, zoom:1.0 };

  // Globale Offset/Zoom für drawCover setzen
  window._bildOffset = { x: s.x, y: s.y };
  window._bildZoom = s.zoom;

  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  await zeichneAthletQuadrat(ctx, W, H, { ...window._avOptsBase, ...athlet });
}

async function avDownloadAlle(athleten, opts_base, format, bildSettings) {
  async function downloadCanvas(canvas, dateiname) {
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = dateiname;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); resolve(); }, 300);
      }, 'image/png');
    });
  }

  let W = 1080, H = 1350;
  if (format === 'quadrat') H = 1080;
  else if (format === 'story') H = 1920;
  else if (format === 'twitter') { W = 1500; H = 500; }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  let posterCount = 0;

  if (format === 'carousel') {
    const gesamt = athleten.length + 2;
    // Deckblatt
    const ctx = canvas.getContext('2d');
    window._bildOffset = { x:0.5, y:0.5 }; window._bildZoom = 1.0;
    await zeichneCarouselDeckblatt(ctx, W, H, { ...opts_base, gesamt, bild: opts_base.teamfoto || null });
    await downloadCanvas(canvas, `01_Deckblatt.png`);
    posterCount++;

    for (let i = 0; i < athleten.length; i++) {
      const s = bildSettings[i] || { x:0.5, y:0.5, zoom:1.0 };
      window._bildOffset = { x: s.x, y: s.y };
      window._bildZoom = s.zoom;
      ctx.clearRect(0,0,W,H);
      await zeichneAthletQuadrat(ctx, W, H, { ...opts_base, ...athleten[i], nr: i+2, gesamt });
      const nr = String(i+2).padStart(2,'0');
      await downloadCanvas(canvas, `${nr}_${athleten[i].name.replace(/\s/g,'_')}.png`);
      posterCount++;
      await new Promise(r => setTimeout(r, 200));
    }

    ctx.clearRect(0,0,W,H);
    window._bildOffset = { x:0.5, y:0.5 }; window._bildZoom = 1.0;
    await zeichneCarouselAbschluss(ctx, W, H, { ...opts_base, gesamt, bild: opts_base.teamfoto || null });
    await downloadCanvas(canvas, `${String(gesamt).padStart(2,'0')}_Abschluss.png`);
    posterCount++;

  } else {
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < athleten.length; i++) {
      const s = bildSettings[i] || { x:0.5, y:0.5, zoom:1.0 };
      window._bildOffset = { x: s.x, y: s.y };
      window._bildZoom = s.zoom;
      ctx.clearRect(0,0,W,H);
      if (format === 'twitter') {
        await zeichneTwitterBanner(ctx, W, H, { ...opts_base, ...athleten[i], athleten: athleten.map(a=>a.name) });
      } else {
        await zeichneAthletQuadrat(ctx, W, H, { ...opts_base, ...athleten[i] });
      }
      const nr = String(i+1).padStart(2,'0');
      await downloadCanvas(canvas, `${nr}_${athleten[i].name.replace(/\s/g,'_')}.png`);
      posterCount++;
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Offset zurücksetzen
  window._bildOffset = { x:0.5, y:0.5 }; window._bildZoom = 1.0;
  toast(`✅ ${posterCount} Poster heruntergeladen!`, 'success');
}

async function _avDownloadPlaceholder() {
  toast(`⏳ Erstelle Poster...`, 'info');

  const opts_base = { veranstaltung, sportart, akzent: 'blau' };

  // Hilfsfunktion: Canvas → Download
  async function downloadCanvas(canvas, dateiname) {
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = dateiname;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); resolve(); }, 200);
      }, 'image/png');
    });
  }

  let posterCount = 0;

  if (format === 'carousel') {
    // ── Carousel: Deckblatt + Athleten + Abschluss ──
    const gesamt = athleten.length + 2;
    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;

    // 1. Deckblatt
    const ctx0 = canvas.getContext('2d');
    await zeichneCarouselDeckblatt(ctx0, W, H, { ...opts_base, gesamt });
    await downloadCanvas(canvas, `01_Deckblatt_${veranstaltung.replace(/[^a-zA-Z0-9]/g,'-')}.png`);
    posterCount++;

    // 2. Athleten
    for (let i = 0; i < athleten.length; i++) {
      const a = athleten[i];
      ctx0.clearRect(0,0,W,H);
      await zeichneAthletQuadrat(ctx0, W, H, { ...opts_base, ...a, nr: i+2, gesamt });
      const nr = String(i+2).padStart(2,'0');
      await downloadCanvas(canvas, `${nr}_${a.name.replace(/\s/g,'_')}.png`);
      posterCount++;
      await new Promise(r => setTimeout(r, 150));
    }

    // 3. Abschluss
    ctx0.clearRect(0,0,W,H);
    await zeichneCarouselAbschluss(ctx0, W, H, { ...opts_base, gesamt });
    const nr = String(gesamt).padStart(2,'0');
    await downloadCanvas(canvas, `${nr}_Abschluss.png`);
    posterCount++;

  } else if (format === 'quadrat') {
    // ── Quadrat 1080×1080 ──
    const W = 1080, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < athleten.length; i++) {
      ctx.clearRect(0,0,W,H);
      await zeichneAthletQuadrat(ctx, W, H, { ...opts_base, ...athleten[i] });
      const nr = String(i+1).padStart(2,'0');
      await downloadCanvas(canvas, `${nr}_${athleten[i].name.replace(/\s/g,'_')}_Quadrat.png`);
      posterCount++;
      await new Promise(r => setTimeout(r, 150));
    }

  } else if (format === 'story') {
    // ── Story 1080×1920 ──
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < athleten.length; i++) {
      ctx.clearRect(0,0,W,H);
      await zeichneAthletPortrait(ctx, W, H, { ...opts_base, ...athleten[i] });
      const nr = String(i+1).padStart(2,'0');
      await downloadCanvas(canvas, `${nr}_${athleten[i].name.replace(/\s/g,'_')}_Story.png`);
      posterCount++;
      await new Promise(r => setTimeout(r, 150));
    }

  } else if (format === 'twitter') {
    // ── Twitter/X-Banner 1500×500 ──
    const W = 1500, H = 500;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    await zeichneTwitterBanner(ctx, W, H, {
      ...opts_base,
      athleten: athleten.map(a => a.name),
      bild: athleten[0]?.bild || null,
    });
    await downloadCanvas(canvas, `Twitter_Banner_${veranstaltung.replace(/[^a-zA-Z0-9]/g,'-')}.png`);
    posterCount++;
  }

  toast(`✅ ${posterCount} Poster heruntergeladen!`, 'success');
}

async function loescheVotingKampagne(kampagneId, titel) {
  if (!confirm(`Abstimmung "${titel}" wirklich löschen?\n\nAlle Kandidaten und Stimmen werden ebenfalls gelöscht.`)) return;
  try {
    // Stimmen löschen
    await Backend.client.from('voting_votes').delete().eq('campaign_id', kampagneId);
    // Kandidaten löschen
    await Backend.client.from('voting_candidates').delete().eq('campaign_id', kampagneId);
    // Kampagne löschen
    const { error } = await Backend.client.from('voting_campaigns').delete().eq('id', kampagneId);
    if (error) throw new Error(error.message);
    toast('🗑️ Abstimmung gelöscht', 'success');
    navigateTo('voting');
  } catch(e) {
    toast('Fehler: ' + e.message, 'danger');
  }
}

// ── Voting-Sieger Poster-Ausgaben ─────────────────────────────
async function zeigeVotingSiegerPoster(typ) {
  const sieger = window._votingSieger;
  if (!sieger) { toast('Kein Sieger-Objekt gefunden', 'danger'); return; }

  // Temporären Eintrag in achievements simulieren für Poster-Funktionen
  // Wir nutzen DB.getErfolgById-Ersatz über window-Variable
  const fakeId = 'voting-sieger-' + Date.now();

  // Poster-Funktionen mit fake Erfolg aufrufen
  if (typ === 'a3') {
    // Direkt A3-Canvas zeichnen
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📄 A3-Aushang – ${esc(sieger.beteiligte[0]?.anzeigename||'Sieger')}</h3>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="background:#111;padding:16px">
        <canvas id="sieger-a3-canvas" width="1587" height="1123"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
        <button class="btn btn-primary" onclick="exportPosterPNG(window._votingSieger,'sieger-a3-canvas')">📥 PNG herunterladen</button>
      </div>`;
    overlay.appendChild(modal);
    schutzeModalVorAussenklick(overlay, modal);
    document.body.appendChild(overlay);
    window._a3Erfolg = sieger;
    setTimeout(async () => {
      await ladeMontserrat(); await ladeLogo();
      const canvas = document.getElementById('sieger-a3-canvas');
      if (canvas) await zeichneA3Variante('sieger-a3-canvas', sieger, 1);
    }, 100);

  } else if (typ === 'bildschirm') {
    window._screenErfolg = sieger;
    window._bsErfolg = sieger;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>🖥️ Bildschirm – ${esc(sieger.beteiligte[0]?.anzeigename||'Sieger')}</h3>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="background:#111;padding:16px">
        <canvas id="sieger-bs-canvas" width="1080" height="1350"
          style="max-width:100%;max-height:65vh;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
        <button class="btn btn-primary" onclick="exportPosterPNG(window._votingSieger,'sieger-bs-canvas')">📥 PNG herunterladen</button>
      </div>`;
    overlay.appendChild(modal);
    schutzeModalVorAussenklick(overlay, modal);
    document.body.appendChild(overlay);
    setTimeout(async () => {
      await ladeMontserrat(); await ladeLogo();
      await zeichneSLZBPoster('sieger-bs-canvas', sieger);
    }, 100);

  } else if (typ === 'social') {
    window._socialErfolg = sieger;
    window._smErfolg = sieger;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal modal-xl';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>📱 Social Media – ${esc(sieger.beteiligte[0]?.anzeigename||'Sieger')}</h3>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="background:#111;padding:16px">
        <canvas id="sieger-sm-canvas" width="1080" height="1080"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
        <button class="btn btn-primary" onclick="exportPosterPNG(window._votingSieger,'sieger-sm-canvas')">📥 PNG herunterladen</button>
      </div>`;
    overlay.appendChild(modal);
    schutzeModalVorAussenklick(overlay, modal);
    document.body.appendChild(overlay);
    setTimeout(async () => {
      await ladeMontserrat(); await ladeLogo();
      await zeichneSocialFormat('sieger-sm-canvas', sieger, 'beitrag');
    }, 100);
  }
}

// ── Abstimmungs-Poster (Aushang + Social) ────────────────────
async function zeigeVotingAushang(kampagneId) {
  const { data: k } = await Backend.client.from('voting_campaigns').select('*').eq('id', kampagneId).single();
  const { data: kandidatenRaw } = await Backend.client.from('voting_candidates')
    .select('*').eq('campaign_id', kampagneId).order('reihenfolge');

  // Bilder: Signed URL für poster-exports, Public URL für achievement-media
  const kandidaten = await Promise.all((kandidatenRaw||[]).map(async k2 => {
    const sp = k2.storage_path;
    const bucket = k2.storage_bucket || 'achievement-media';
    if (sp) {
      if (bucket === 'poster-exports') {
        const { data: sd } = await Backend.client.storage.from(bucket).createSignedUrl(sp, 3600);
        if (sd?.signedUrl) return { ...k2, bild_url: sd.signedUrl };
      } else {
        const { data: pubData } = Backend.client.storage.from(bucket).getPublicUrl(sp);
        if (pubData?.publicUrl) return { ...k2, bild_url: pubData.publicUrl };
      }
    }
    return k2;
  }));

  // Modal mit Canvas öffnen
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal modal-xl';

  modal.innerHTML = `
    <div class="modal-header" style="background:var(--slzb-primary);color:#fff">
      <h3 style="color:#fff;margin:0">📢 Abstimmungs-Ausgaben</h3>
      <button class="btn btn-ghost btn-sm" style="color:#fff" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div class="tabs mb-3" style="display:flex;gap:8px">
        <button class="tab-btn active" onclick="switchVotingAushangTab('a3',this)">📄 A3 Aushang</button>
        <button class="tab-btn" onclick="switchVotingAushangTab('social',this)">📱 Social Media</button>
        <button class="tab-btn" onclick="switchVotingAushangTab('bildschirm',this)">🖥️ Bildschirm</button>
      </div>
      <div style="text-align:center;background:#111;padding:16px;border-radius:8px">
        <canvas id="voting-aushang-canvas" width="1587" height="1123"
          style="max-width:100%;max-height:60vh;display:block;margin:0 auto;border-radius:8px"></canvas>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
      <button class="btn btn-outline" onclick="zeigeVotingBildausschnitt()">🖼️ Bildausschnitt</button>
      <button class="btn btn-primary" onclick="downloadVotingAushang()">📥 PNG herunterladen</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  window._votingAushangKampagne = k;
  window._votingAushangKandidaten = kandidaten;
  window._votingAushangFormat = 'a3';
  window._bildOffset = { x: 0.5, y: 0.5 };
  window._bildZoom = 1.0;

  setTimeout(() => zeichneVotingAushang('a3'), 100);
}

// Bildausschnitt-Editor für Voting-Aushang
function zeigeVotingBildausschnitt() {
  // Bildoffset/Zoom zurücksetzen
  window._bildOffset = window._bildOffset || { x: 0.5, y: 0.5 };
  window._bildZoom   = window._bildZoom   || 1.0;
  // Öffne den Standard-Bildausschnitt-Editor
  zeigeBildPositionEditor();
  // Nach "Anwenden" soll der Voting-Aushang neu gezeichnet werden
  // Wir überschreiben posterEditorAktualisieren temporär
  const _orig = window._votingBildRefresh;
  window._votingBildRefresh = true;
}

// Override: aktualisiereBildOffset ruft bei Voting-Modus den Aushang neu
const _origAktualisiereBildOffset = window.aktualisiereBildOffset;
window.aktualisiereBildOffset = function() {
  const x    = parseInt(document.getElementById('bild-offset-x')?.value ?? 50) / 100;
  const y    = parseInt(document.getElementById('bild-offset-y')?.value ?? 50) / 100;
  const zoom = parseInt(document.getElementById('bild-zoom')?.value ?? 100) / 100;
  window._bildOffset = { x, y };
  window._bildZoom   = zoom;
  const zoomLbl = document.getElementById('bild-zoom-label');
  const oxLbl   = document.getElementById('bild-ox-label');
  const oyLbl   = document.getElementById('bild-oy-label');
  if (zoomLbl) zoomLbl.textContent = Math.round(zoom * 100) + '%';
  if (oxLbl)   oxLbl.textContent   = Math.round(x * 100) + '%';
  if (oyLbl)   oyLbl.textContent   = Math.round(y * 100) + '%';
  _bildVorschauAktualisieren();
  // Voting-Aushang neu zeichnen wenn aktiv
  if (window._votingBildRefresh && window._votingAushangKampagne) {
    zeichneVotingAushang(window._votingAushangFormat || 'a3');
  } else if (!window._votingBildRefresh) {
    posterEditorAktualisieren();
  }
};

function switchVotingAushangTab(format, btn) {
  document.querySelectorAll('.modal .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  window._votingAushangFormat = format;
  const canvas = document.getElementById('voting-aushang-canvas');
  if (canvas) {
    if (format === 'a3') { canvas.width=1587; canvas.height=1123; canvas.style.maxHeight='55vh'; }
    else if (format === 'social') { canvas.width=1080; canvas.height=1080; canvas.style.maxHeight='60vh'; }
    else { canvas.width=960; canvas.height=1080; canvas.style.maxHeight='55vh'; }
  }
  zeichneVotingAushang(format);
}

async function zeichneVotingAushang(format) {
  const k = window._votingAushangKampagne;
  const kandidaten = window._votingAushangKandidaten || [];
  const canvas = document.getElementById('voting-aushang-canvas');
  if (!canvas || !k) return;

  await ladeMontserrat(); await ladeLogo();
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Hintergrund
  ctx.fillStyle = '#003366'; ctx.fillRect(0,0,W,H);
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#003366'); grad.addColorStop(1,'#001a33');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

  // Dekorative Kreise
  ctx.save(); ctx.globalAlpha=0.06;
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(W*0.85,H*0.15,H*0.4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(W*0.1,H*0.85,H*0.3,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Header
  const HEADER_H = format==='bildschirm' ? 80 : 100;
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(0,0,W,HEADER_H);
  if (_slzbLogo) {
    const r = _slzbLogo.width/_slzbLogo.height;
    const lh = HEADER_H*0.75;
    ctx.drawImage(_slzbLogo, 40, (HEADER_H-lh)/2, lh*r, lh);
  }
  ctx.fillStyle='#fff'; ctx.font=`bold ${Math.round(HEADER_H*0.28)}px Montserrat, Arial`;
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', HEADER_H*1.8, HEADER_H*0.4);
  ctx.fillStyle='#E2001A'; ctx.font=`bold ${Math.round(HEADER_H*0.2)}px Montserrat, Arial`;
  ctx.fillText('#SLZBerlin', HEADER_H*1.8, HEADER_H*0.72);

  // Titel
  const titleY = HEADER_H + (format==='bildschirm'?30:50);
  ctx.fillStyle='#fff'; ctx.font=`800 ${Math.round(W*0.045)}px Montserrat, Arial`;
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('🏆 WÄHLE DEINEN FAVORITEN!', W/2, titleY);

  ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font=`bold ${Math.round(W*0.022)}px Montserrat, Arial`;
  ctx.fillText(k.titel.toUpperCase(), W/2, titleY + Math.round(W*0.055));

  if (k.end_at) {
    const endDatum = new Date(k.end_at).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'});
    ctx.fillStyle='#E2001A'; ctx.font=`bold ${Math.round(W*0.018)}px Montserrat, Arial`;
    ctx.fillText(`⏰ Abstimmung endet: ${endDatum}`, W/2, titleY + Math.round(W*0.085));
  }

  // Kandidaten-Karten
  const cardStartY = titleY + Math.round(W*0.115);
  const cardCount = kandidaten.length || 1;
  const cardW = Math.round((W - 80 - (cardCount-1)*20) / cardCount);
  const cardH = H - cardStartY - (format==='bildschirm'?60:80);

  for (let i = 0; i < kandidaten.length; i++) {
    const k2 = kandidaten[i];
    const cx = 40 + i*(cardW+20);

    // Karten-Hintergrund
    ctx.fillStyle='rgba(255,255,255,0.1)';
    slzbRoundRect(ctx, cx, cardStartY, cardW, cardH, 16); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
    slzbRoundRect(ctx, cx, cardStartY, cardW, cardH, 16); ctx.stroke();

    // Bild laden via ladeBild() (bewährte Methode aus poster.js)
    const imgH = Math.round(cardH*0.55);
    if (k2.bild_url) {
      const imgEl = await ladeBild(k2.bild_url);
      if (imgEl) {
        ctx.save();
        slzbRoundRect(ctx, cx, cardStartY, cardW, imgH, [16,16,0,0]); ctx.clip();
        const scale = Math.max(cardW/imgEl.naturalWidth, imgH/imgEl.naturalHeight);
        const sw = imgEl.naturalWidth*scale, sh = imgEl.naturalHeight*scale;
        ctx.drawImage(imgEl, cx+(cardW-sw)/2, cardStartY+(imgH-sh)/2, sw, sh);
        ctx.restore();
      } else {
        ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(cx, cardStartY, cardW, imgH);
        ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font=`${Math.round(cardW*0.3)}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('🏃', cx+cardW/2, cardStartY+imgH/2);
      }
    } else {
      ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(cx, cardStartY, cardW, imgH);
      ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font=`${Math.round(cardW*0.3)}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🏃', cx+cardW/2, cardStartY+imgH/2);
    }

    // Gradient über Bild
    const fadeG = ctx.createLinearGradient(0, cardStartY+imgH*0.5, 0, cardStartY+imgH);
    fadeG.addColorStop(0,'rgba(0,26,51,0)'); fadeG.addColorStop(1,'rgba(0,26,51,0.8)');
    ctx.fillStyle=fadeG; ctx.fillRect(cx, cardStartY, cardW, imgH);

    // Name
    const textY = cardStartY + imgH + 16;
    ctx.fillStyle='#fff'; ctx.font=`bold ${Math.round(cardW*0.09)}px Montserrat, Arial`;
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(k2.name, cx+cardW/2, textY, cardW-20);

    // Sportart
    if (k2.sportart) {
      ctx.fillStyle='#E2001A'; ctx.font=`bold ${Math.round(cardW*0.065)}px Montserrat, Arial`;
      ctx.fillText(k2.sportart.toUpperCase(), cx+cardW/2, textY+Math.round(cardW*0.1), cardW-20);
    }

    // Erfolg
    if (k2.erfolg) {
      ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font=`${Math.round(cardW*0.055)}px Montserrat, Arial`;
      const erfolgY = textY + Math.round(cardW*0.18);
      // Zeilenumbruch
      const words = k2.erfolg.split(' ');
      let line = ''; let ly = erfolgY;
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > cardW-24 && line) {
          ctx.fillText(line.trim(), cx+cardW/2, ly, cardW-20);
          line = word + ' '; ly += Math.round(cardW*0.07);
        } else { line = test; }
      }
      if (line) ctx.fillText(line.trim(), cx+cardW/2, ly, cardW-20);
    }
  }

  // QR-Code Hinweis
  const footerY = H - (format==='bildschirm'?55:70);
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(0, footerY, W, H-footerY);
  ctx.fillStyle='#fff'; ctx.font=`bold ${Math.round(W*0.018)}px Montserrat, Arial`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('📱 Jetzt abstimmen: tinyurl.com/slzb-erfolge → Sportler/in des Monats', W/2, footerY+(H-footerY)/2);
}

function downloadVotingAushang() {
  const canvas = document.getElementById('voting-aushang-canvas');
  if (!canvas) return;
  const k = window._votingAushangKampagne;
  const format = window._votingAushangFormat || 'a3';
  const a = document.createElement('a');
  a.download = `SLZB_Abstimmung_${k?.monat||'2026'}_${format}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('📥 Poster heruntergeladen', 'success');
}

// ══════════════════════════════════════════════════════════════
// DATENSCHUTZ-NEGATIVLISTE
// ══════════════════════════════════════════════════════════════

// ── Excel-Import ──────────────────────────────────────────────
async function renderDatenschutzImport() {
  const { data: eintraege } = await Backend.client
    .from('datenschutz_widerspruch')
    .select('*')
    .order('nachname');

  const anzahl = eintraege?.length || 0;

  return `<div class="page">
    <div class="page-header">
      <h1>🔒 Datenschutz-Negativliste</h1>
      <p class="text-muted">Schüler/innen mit Widerspruch zur Veröffentlichung – Import aus Excel</p>
    </div>

    <div class="card mb-4">
      <div class="card-header"><h2>📥 Excel-Datei importieren</h2></div>
      <div class="card-body">
        <div class="alert alert-warning mb-3">
          <span class="alert-icon">⚠️</span>
          <span><strong>Datenschutz:</strong> Diese Daten sind vertraulich. Nur Datenschutzbeauftragte und Admins haben Zugriff.</span>
        </div>
        <div class="form-group mb-3">
          <label>Excel-Datei (.xlsx) <span class="required">*</span></label>
          <input type="file" id="ds-excel-datei" accept=".xlsx,.xls,.csv">
          <div class="form-hint">Format: Name | Vorname | Klasse | Name-Print | Name-Presse | Name-Homepage | Name-Events | Name-Social | Foto-Print | Foto-Presse | Foto-Homepage | Foto-Events | Foto-Social</div>
        </div>
        <div class="form-group mb-3">
          <label>Schuljahr</label>
          <input type="text" id="ds-schuljahr" value="2026/27" style="max-width:120px">
        </div>
        <div class="alert alert-info mb-3">
          <span class="alert-icon">ℹ️</span>
          <span>X oder x in einer Zelle = Widerspruch. Leere Zelle = keine Einschränkung.</span>
        </div>
        <button class="btn btn-primary" onclick="importiereDatenschutzExcel()">📥 Importieren</button>
        <button class="btn btn-danger btn-sm ml-2" onclick="loescheDatenschutzListe()" style="margin-left:8px">🗑️ Liste leeren</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>📋 Aktuelle Liste (${anzahl} Einträge)</h2>
        <button class="btn btn-ghost btn-sm" onclick="navigateTo('einwilligungen')">↻ Aktualisieren</button>
      </div>
      <div class="card-body">
        ${!anzahl ? '<p class="text-muted">Noch keine Einträge. Bitte Excel-Datei importieren.</p>' :
        `<div class="table-wrap"><table style="font-size:.82rem">
          <thead><tr>
            <th>Name</th><th>Klasse</th>
            <th title="Name-Print">N-P</th><th title="Name-Presse">N-Pr</th>
            <th title="Name-Homepage">N-H</th><th title="Name-Events">N-E</th>
            <th title="Name-Social">N-S</th>
            <th title="Foto-Print">F-P</th><th title="Foto-Presse">F-Pr</th>
            <th title="Foto-Homepage">F-H</th><th title="Foto-Events">F-E</th>
            <th title="Foto-Social">F-S</th>
          </tr></thead>
          <tbody>
            ${eintraege.map(e => `<tr>
              <td><strong>${esc(e.nachname)}</strong>, ${esc(e.vorname)}</td>
              <td>${esc(e.klasse||'–')}</td>
              ${['name_print','name_presse','name_homepage','name_events','name_social',
                 'foto_print','foto_presse','foto_homepage','foto_events','foto_social']
                .map(f => `<td style="text-align:center">${e[f]?'<span style="color:#E2001A;font-weight:700">✗</span>':'<span style="color:#888">–</span>'}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table></div>`}
      </div>
    </div>
  </div>`;
}

async function importiereDatenschutzExcel() {
  const datei = document.getElementById('ds-excel-datei')?.files?.[0];
  const schuljahr = document.getElementById('ds-schuljahr')?.value || '2026/27';
  if (!datei) { toast('Bitte Excel-Datei auswählen', 'warning'); return; }

  toast('⏳ Wird verarbeitet...', 'info');

  try {
    // SheetJS für Excel + CSV
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const arrayBuffer = await datei.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const istX = (v) => {
      if (!v && v !== 0) return false;
      const s = String(v).trim().toLowerCase();
      return s === 'x' || s === '1' || s === 'ja' || s === 'yes' || s === 'true';
    };

    // ── Automatische Spaltenerkennung ──────────────────────────
    // Suche die Header-Zeile (enthält "Name" oder "Nachname")
    // und erkenne ob eine Nummerierungsspalte vorhanden ist
    let headerZeile = 0;
    let colOffset = 0; // 0 = keine Nummerierungsspalte, 1 = Nummerierungsspalte vorhanden

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i].map(c => String(c||'').trim().toLowerCase());
      // Prüfe ob diese Zeile eine Header-Zeile ist
      const hasName = row.some(c => c === 'name' || c === 'nachname' || c === 'familienname');
      if (hasName) {
        headerZeile = i;
        // Prüfe ob erste Spalte eine Nummerierung ist (Nr., lfd., #, Nummer)
        const firstCol = row[0];
        // Nummerierungsspalte erkennen: nur wenn explizit Nr./lfd. oder Zahl
        // NICHT bei leerer erster Spalte (könnte auch Nachname-Spalte ohne Header sein)
        if (firstCol === 'nr' || firstCol === 'nr.' || firstCol === 'lfd' || firstCol === '#' ||
            firstCol === 'nummer' || firstCol === 'lfd.' || firstCol === 'no' ||
            /^\d+$/.test(firstCol)) {
          colOffset = 1;
        }
        break;
      }
    }

    // Spalten-Mapping basierend auf Header-Zeile
    const headerRow = rows[headerZeile].map(c => String(c||'').trim().toLowerCase());
    const findCol = (...namen) => {
      for (const name of namen) {
        const idx = headerRow.findIndex(h => h.includes(name));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    // Spalten-Indizes ermitteln (mit Fallback auf feste Positionen + Offset)
    const COL = {
      nachname:      findCol('nachname', 'name', 'familienname') >= 0 ? findCol('nachname', 'name', 'familienname') : (0 + colOffset),
      vorname:       findCol('vorname', 'firstname') >= 0 ? findCol('vorname', 'firstname') : (1 + colOffset),
      klasse:        findCol('klasse', 'class') >= 0 ? findCol('klasse', 'class') : (2 + colOffset),
      name_print:    findCol('name-print', 'name print', 'n-print') >= 0 ? findCol('name-print', 'name print', 'n-print') : (3 + colOffset),
      name_presse:   findCol('name-presse', 'name presse', 'n-presse') >= 0 ? findCol('name-presse', 'name presse', 'n-presse') : (4 + colOffset),
      name_homepage: findCol('name-homepage', 'name homepage', 'n-homepage') >= 0 ? findCol('name-homepage', 'name homepage', 'n-homepage') : (5 + colOffset),
      name_events:   findCol('name-events', 'name events', 'n-events') >= 0 ? findCol('name-events', 'name events', 'n-events') : (6 + colOffset),
      name_social:   findCol('name-social', 'name social', 'n-social') >= 0 ? findCol('name-social', 'name social', 'n-social') : (7 + colOffset),
      foto_print:    findCol('foto-print', 'foto print', 'f-print') >= 0 ? findCol('foto-print', 'foto print', 'f-print') : (8 + colOffset),
      foto_presse:   findCol('foto-presse', 'foto presse', 'f-presse') >= 0 ? findCol('foto-presse', 'foto presse', 'f-presse') : (9 + colOffset),
      foto_homepage: findCol('foto-homepage', 'foto homepage', 'f-homepage') >= 0 ? findCol('foto-homepage', 'foto homepage', 'f-homepage') : (10 + colOffset),
      foto_events:   findCol('foto-events', 'foto events', 'f-events') >= 0 ? findCol('foto-events', 'foto events', 'f-events') : (11 + colOffset),
      foto_social:   findCol('foto-social', 'foto social', 'f-social') >= 0 ? findCol('foto-social', 'foto social', 'f-social') : (12 + colOffset),
      sportart:      findCol('sportart', 'sport', 'disziplin') >= 0 ? findCol('sportart', 'sport', 'disziplin') : -1,
    };

    const daten = [];
    // Starte ab der Zeile NACH der Header-Zeile
    for (let i = headerZeile + 1; i < rows.length; i++) {
      const cols = rows[i].map(c => String(c||'').trim());
      const nachname = cols[COL.nachname] || '';
      const vorname  = cols[COL.vorname]  || '';

      // Leerzeilen überspringen
      if (!nachname || !vorname) continue;
      // Weitere Header-Zeilen überspringen
      if (nachname.toLowerCase().includes('name') || nachname.toLowerCase().includes('nachname')) continue;
      // Trennzeichen überspringen
      if (nachname === '-' || nachname === '–' || nachname === '/' || nachname.length < 2) continue;
      // Reine Zahlen (Nummerierungen) überspringen
      if (/^\d+$/.test(nachname)) continue;
      // Komplett leere Zeilen überspringen
      if (cols.every(c => !c || c === '-' || c === '–' || c === '/' || c === ' ')) continue;
      // Vorname darf keine reine Zahl sein
      if (/^\d+$/.test(vorname)) continue;
      // Vorname muss mindestens 2 Zeichen haben
      if (vorname.length < 2) continue;

      daten.push({
        nachname,
        vorname,
        klasse:         cols[COL.klasse] || null,
        name_print:     istX(cols[COL.name_print]),
        name_presse:    istX(cols[COL.name_presse]),
        name_homepage:  istX(cols[COL.name_homepage]),
        name_events:    istX(cols[COL.name_events]),
        name_social:    istX(cols[COL.name_social]),
        foto_print:     istX(cols[COL.foto_print]),
        foto_presse:    istX(cols[COL.foto_presse]),
        foto_homepage:  istX(cols[COL.foto_homepage]),
        foto_events:    istX(cols[COL.foto_events]),
        foto_social:    istX(cols[COL.foto_social]),
        sportart:       COL.sportart >= 0 ? (cols[COL.sportart] || null) : null,
        schuljahr,
        importiert_von: Auth.id(),
      });
    }

    if (!daten.length) { toast('Keine gültigen Daten gefunden', 'warning'); return; }

    // Alte Einträge für dieses Schuljahr löschen
    await Backend.client.from('datenschutz_widerspruch').delete().eq('schuljahr', schuljahr);

    // Neue Einträge einfügen (in Batches)
    const BATCH = 50;
    for (let i = 0; i < daten.length; i += BATCH) {
      const { error } = await Backend.client.from('datenschutz_widerspruch').insert(daten.slice(i, i+BATCH));
      if (error) throw new Error(error.message);
    }

    toast(`✅ ${daten.length} Einträge importiert`, 'success');
    APP._dsCache = null; // Cache leeren
    navigateTo('einwilligungen');
  } catch(e) {
    toast('Fehler: ' + e.message, 'danger');
  }
}

async function loescheDatenschutzListe() {
  const schuljahr = document.getElementById('ds-schuljahr')?.value || '2026/27';
  if (!confirm(`Alle Datenschutz-Einträge für ${schuljahr} löschen?`)) return;
  await Backend.client.from('datenschutz_widerspruch').delete().eq('schuljahr', schuljahr);
  toast('🗑️ Liste geleert', 'success');
  APP._dsCache = null;
  navigateTo('einwilligungen');
}

// ── Datenschutz-Prüfung beim Anlegen ─────────────────────────
let _dsCache = null;
let _dsCacheTime = 0;

async function ladeDatenschutzListe() {
  const jetzt = Date.now();
  if (_dsCache && (jetzt - _dsCacheTime) < 5 * 60 * 1000) return _dsCache;
  try {
    const { data } = await Backend.client.from('datenschutz_widerspruch').select('*');
    _dsCache = data || [];
    _dsCacheTime = jetzt;
    return _dsCache;
  } catch(e) {
    return _dsCache || [];
  }
}

async function pruefeDatenschutz(athletenNamen) {
  // athletenNamen: Array von Strings ["Max Mustermann", "Lisa Müller"]
  if (!athletenNamen?.length) return [];
  const liste = await ladeDatenschutzListe();
  const warnungen = [];

  for (const name of athletenNamen) {
    const teile = name.trim().split(' ');
    if (teile.length < 2) continue;
    const vorname = teile.slice(0, -1).join(' ').toLowerCase();
    const nachname = teile[teile.length - 1].toLowerCase();

    // Suche in Negativliste (Fuzzy-Match)
    const treffer = liste.find(e =>
      e.nachname.toLowerCase() === nachname &&
      e.vorname.toLowerCase().startsWith(vorname.slice(0, 3))
    );

    if (!treffer) continue;

    const einschraenkungen = [];
    if (treffer.name_print)    einschraenkungen.push('Name in Print');
    if (treffer.name_presse)   einschraenkungen.push('Name in Presse');
    if (treffer.name_homepage) einschraenkungen.push('Name auf Homepage');
    if (treffer.name_events)   einschraenkungen.push('Name bei Events');
    if (treffer.name_social)   einschraenkungen.push('Name auf Social Media');
    if (treffer.foto_print)    einschraenkungen.push('Foto in Print');
    if (treffer.foto_presse)   einschraenkungen.push('Foto in Presse');
    if (treffer.foto_homepage) einschraenkungen.push('Foto auf Homepage');
    if (treffer.foto_events)   einschraenkungen.push('Foto bei Events');
    if (treffer.foto_social)   einschraenkungen.push('Foto auf Social Media');

    if (einschraenkungen.length) {
      warnungen.push({
        name: `${treffer.vorname} ${treffer.nachname}`,
        klasse: treffer.klasse,
        einschraenkungen,
        // Welche Ausgaben sind betroffen?
        keinSocial: treffer.name_social || treffer.foto_social,
        keinPrint:  treffer.name_print  || treffer.foto_print,
        keinHomepage: treffer.name_homepage || treffer.foto_homepage,
      });
    }
  }
  return warnungen;
}

// Warnung anzeigen wenn Datenschutz-Einschränkungen gefunden
async function zeigeDatenschutzWarnung(athletenNamen, onWeiter) {
  const warnungen = await pruefeDatenschutz(athletenNamen);
  if (!warnungen.length) { onWeiter(); return; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '500px';

  modal.innerHTML = `
    <div class="modal-header" style="background:#E2001A;color:#fff">
      <h3 style="color:#fff;margin:0">🔒 Datenschutz-Hinweis</h3>
    </div>
    <div class="modal-body">
      <div class="alert alert-danger mb-3">
        <span class="alert-icon">⚠️</span>
        <span>Für folgende Person(en) liegen Datenschutz-Widersprüche vor:</span>
      </div>
      ${warnungen.map(w => `
        <div style="background:#fff3f3;border:1px solid #fcc;border-radius:8px;padding:12px;margin-bottom:10px">
          <div style="font-weight:700;margin-bottom:6px">👤 ${esc(w.name)}${w.klasse?' ('+esc(w.klasse)+')':''}</div>
          <div style="font-size:.85rem">
            ${w.einschraenkungen.map(e => `<span style="background:#E2001A;color:#fff;padding:2px 8px;border-radius:10px;margin:2px;display:inline-block;font-size:.78rem">✗ ${esc(e)}</span>`).join('')}
          </div>
        </div>`).join('')}
      <div class="alert alert-warning mt-3">
        <span class="alert-icon">ℹ️</span>
        <span>Die Meldung kann trotzdem gespeichert werden. Beachte die Einschränkungen bei der Veröffentlichung.</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-warning" onclick="this.closest('.modal-overlay').remove();(${onWeiter.toString()})()">
        ⚠️ Trotzdem speichern
      </button>
    </div>`;

  overlay.appendChild(modal);
  overlay.addEventListener('click', ev => { if(ev.target===overlay) overlay.remove(); });
  document.body.appendChild(modal);
  document.body.appendChild(overlay);
}

// Datenschutz-Badge für Ausgaben
function datenschutzBadgeHTML(warnungen) {
  if (!warnungen?.length) return '';
  const hatSocial = warnungen.some(w => w.keinSocial);
  const hatPrint = warnungen.some(w => w.keinPrint);
  return `<div class="alert alert-danger" style="margin-bottom:8px">
    <span class="alert-icon">🔒</span>
    <span><strong>Datenschutz:</strong>
    ${hatSocial ? '<span style="background:#E2001A;color:#fff;padding:1px 8px;border-radius:10px;margin:0 4px">✗ Social Media</span>' : ''}
    ${hatPrint ? '<span style="background:#E2001A;color:#fff;padding:1px 8px;border-radius:10px;margin:0 4px">✗ Print</span>' : ''}
    </span>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// BILD-POSITION ANPASSEN (Crop/Pan)
// ══════════════════════════════════════════════════════════════

// Bild-Offset und Zoom für aktuelles Poster
window._bildOffset = { x: 0.5, y: 0.5 }; // 0-1, Mittelpunkt des sichtbaren Bereichs
window._bildZoom = 1.0; // 1.0 = normal, >1 = hineingezoomt

function zeigeBildPositionEditor() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '10001';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'max-width:520px;width:95vw';

  const zoomPct = Math.round((window._bildZoom ?? 1.0) * 100);
  const oxPct   = Math.round((window._bildOffset?.x ?? 0.5) * 100);
  const oyPct   = Math.round((window._bildOffset?.y ?? 0.5) * 100);

  modal.innerHTML = `
    <div class="modal-header">
      <h3>🖼️ Bildausschnitt anpassen</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body" style="padding-bottom:8px">

      <!-- Live-Vorschau -->
      <div style="margin-bottom:16px;text-align:center">
        <div style="font-weight:600;font-size:.8rem;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Live-Vorschau</div>
        <div style="position:relative;display:inline-block;border:2px solid #E2001A;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.25)">
          <canvas id="bild-vorschau-canvas"
            style="display:block;max-width:100%;height:auto;background:#1B1C1F"
            width="360" height="270"></canvas>
          <div id="bild-vorschau-spinner"
            style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);font-size:1.5rem">
            ⏳
          </div>
        </div>
        <div style="font-size:.7rem;color:#888;margin-top:4px">Aktualisiert sich beim Verschieben der Regler</div>
      </div>

      <!-- Zoom -->
      <div style="margin-bottom:14px">
        <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:6px">
          <span>🔍 Zoom</span>
          <span id="bild-zoom-label" style="color:#E2001A;font-size:.85rem">${zoomPct}%</span>
        </label>
        <input type="range" id="bild-zoom" min="30" max="300" step="5" value="${zoomPct}"
          style="width:100%;accent-color:#E2001A" oninput="aktualisiereBildOffset()">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;color:#888">
          <span>Normal (100%)</span><span>Mittel (200%)</span><span>Max (300%)</span>
        </div>
      </div>

      <!-- Horizontal -->
      <div style="margin-bottom:14px">
        <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:6px">
          <span>↔ Horizontal</span>
          <span id="bild-ox-label" style="color:#888;font-size:.85rem">${oxPct}%</span>
        </label>
        <input type="range" id="bild-offset-x" min="0" max="100" value="${oxPct}"
          style="width:100%;accent-color:#003366" oninput="aktualisiereBildOffset()">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;color:#888">
          <span>Links</span><span>Mitte</span><span>Rechts</span>
        </div>
      </div>

      <!-- Vertikal -->
      <div style="margin-bottom:14px">
        <label style="font-weight:600;display:flex;justify-content:space-between;margin-bottom:6px">
          <span>↕ Vertikal</span>
          <span id="bild-oy-label" style="color:#888;font-size:.85rem">${oyPct}%</span>
        </label>
        <input type="range" id="bild-offset-y" min="0" max="100" value="${oyPct}"
          style="width:100%;accent-color:#003366" oninput="aktualisiereBildOffset()">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;color:#888">
          <span>Oben</span><span>Mitte</span><span>Unten</span>
        </div>
      </div>

      <!-- Schnellauswahl -->
      <div style="margin-bottom:8px">
        <div style="font-size:.75rem;color:#888;margin-bottom:6px;font-weight:600">Schnellauswahl:</div>
        <div class="flex gap-2" style="flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="_bildEditorReset()">⊙ Zurücksetzen</button>
          <button class="btn btn-ghost btn-sm" onclick="_bildEditorPreset(50,20,100)">↑ Gesicht oben</button>
          <button class="btn btn-ghost btn-sm" onclick="_bildEditorPreset(50,35,100)">↑ Oberes Drittel</button>
          <button class="btn btn-ghost btn-sm" onclick="_bildEditorPreset(50,50,150)">🔍 Zoom Mitte</button>
          <button class="btn btn-ghost btn-sm" onclick="_bildEditorPreset(50,25,175)">🔍 Gesicht nah</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
      <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();posterEditorAktualisieren()">✅ Auf Poster anwenden</button>
    </div>`;

  overlay.appendChild(modal);
  schutzeModalVorAussenklick(overlay, modal);
  document.body.appendChild(overlay);

  // Vorschau sofort laden
  setTimeout(() => _bildVorschauAktualisieren(), 100);
}

// Schnellauswahl-Preset setzen
function _bildEditorPreset(ox, oy, zoom) {
  const xEl = document.getElementById('bild-offset-x');
  const yEl = document.getElementById('bild-offset-y');
  const zEl = document.getElementById('bild-zoom');
  if (xEl) xEl.value = ox;
  if (yEl) yEl.value = oy;
  if (zEl) zEl.value = zoom;
  aktualisiereBildOffset();
}

// Alles zurücksetzen
function _bildEditorReset() {
  _bildEditorPreset(50, 50, 100);
}

// Live-Vorschau im Editor-Canvas zeichnen
async function _bildVorschauAktualisieren() {
  const canvas = document.getElementById('bild-vorschau-canvas');
  const spinner = document.getElementById('bild-vorschau-spinner');
  if (!canvas) return;

  // Bild aus aktuellem Erfolg holen
  const e = window._a3Erfolg || window._bsErfolg || window._smErfolg;
  if (!e) { if (spinner) spinner.style.display = 'none'; return; }

  const bildUrl = (e.bilder && e.bilder.length > 0) ? e.bilder[0].signedUrl : null;
  if (!bildUrl) {
    if (spinner) spinner.style.display = 'none';
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1B1C1F';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#555';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Kein Bild vorhanden', canvas.width/2, canvas.height/2);
    return;
  }

  try {
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => res(i); i.onerror = rej;
      i.src = bildUrl;
    });

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bild mit aktuellen Offset/Zoom-Werten zeichnen
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.clip();
    drawCover(ctx, img, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Rahmen-Overlay: zeigt den "sicheren" Textbereich unten
    const safeH = Math.round(canvas.height * 0.38);
    const grad = ctx.createLinearGradient(0, canvas.height - safeH, 0, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, canvas.height - safeH, canvas.width, safeH);

    // Hinweis-Text
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼ Textbereich', canvas.width/2, canvas.height - 8);

    if (spinner) spinner.style.display = 'none';
  } catch(err) {
    if (spinner) spinner.style.display = 'none';
    console.warn('Vorschau-Fehler:', err);
  }
}

function aktualisiereBildOffset() {
  const x    = parseInt(document.getElementById('bild-offset-x')?.value ?? 50) / 100;
  const y    = parseInt(document.getElementById('bild-offset-y')?.value ?? 50) / 100;
  const zoom = parseInt(document.getElementById('bild-zoom')?.value ?? 100) / 100;

  window._bildOffset = { x, y };
  window._bildZoom   = zoom;

  // Labels aktualisieren
  const zoomLbl = document.getElementById('bild-zoom-label');
  const oxLbl   = document.getElementById('bild-ox-label');
  const oyLbl   = document.getElementById('bild-oy-label');
  if (zoomLbl) zoomLbl.textContent = Math.round(zoom * 100) + '%';
  if (oxLbl)   oxLbl.textContent   = Math.round(x * 100) + '%';
  if (oyLbl)   oyLbl.textContent   = Math.round(y * 100) + '%';

  // Live-Vorschau im Editor aktualisieren (leichtgewichtig, kein volles Poster)
  _bildVorschauAktualisieren();
}
