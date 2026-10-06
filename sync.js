// ============================================================
// SLZB-Erfolge v2 – Supabase Sync
// Strategie: Local-First, Supabase als Sync-Backend
// ============================================================

const SUPABASE_URL = 'https://yjzvmvgnpxbxmcjopqws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqenZtdmducHhieG1jam9wcXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzY3MzksImV4cCI6MjEwNjc1MjczOX0.IKVaTqz1e7stm_M-dbkvRmuzwU2DTXVcy-YSlzSQkRo';

// ── Supabase-Client (lazy init) ──────────────────────────────
let _sb = null;
function sb() {
  if (!_sb) {
    _sb = window.supabase
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;
  }
  return _sb;
}

// ── Sync-Status ──────────────────────────────────────────────
const Sync = {
  verfuegbar: false,   // Supabase erreichbar?
  letzterSync: null,
  syncLaeuft: false,

  // ── Verbindung testen ──────────────────────────────────────
  async teste() {
    if (!sb()) return false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const { error } = await sb()
        .from('slzb_nutzer')
        .select('id')
        .limit(1)
        .abortSignal(ctrl.signal);
      clearTimeout(timer);
      this.verfuegbar = !error;
      return this.verfuegbar;
    } catch(e) {
      this.verfuegbar = false;
      return false;
    }
  },

  // ── Vollständiger Download von Supabase ───────────────────
  async download() {
    if (!this.verfuegbar) return false;
    try {
      const [
        { data: nutzer },
        { data: schueler },
        { data: sportarten },
        { data: wettbewerbe },
        { data: teams },
        { data: erfolge },
        { data: beteiligungen },
        { data: protokoll },
      ] = await Promise.all([
        sb().from('slzb_nutzer').select('*').eq('aktiv', true),
        sb().from('slzb_schueler').select('*').eq('aktiv', true),
        sb().from('slzb_sportarten').select('*').eq('aktiv', true),
        sb().from('slzb_wettbewerbe').select('*').order('beginn', { ascending: false }),
        sb().from('slzb_teams').select('*').eq('aktiv', true),
        sb().from('slzb_erfolge').select('*').order('eingangsdatum', { ascending: false }),
        sb().from('slzb_beteiligungen').select('*'),
        sb().from('slzb_protokoll').select('*').order('zeitpunkt', { ascending: false }),
      ]);

      if (!erfolge) return false;

      // Beteiligungen und Protokoll zu Erfolgen zuordnen
      const erfolgeMitDaten = (erfolge || []).map(e => ({
        ...this._mapErfolg(e),
        beteiligte: (beteiligungen || [])
          .filter(b => b.erfolg_id === e.id)
          .map(b => this._mapBeteiligung(b)),
        protokoll: (protokoll || [])
          .filter(p => p.erfolg_id === e.id)
          .sort((a, b) => new Date(a.zeitpunkt) - new Date(b.zeitpunkt))
          .map(p => this._mapProtokoll(p)),
        medien: [],
      }));

      // Lokale DB aktualisieren
      if (nutzer?.length)     SLZB_DB.nutzer      = nutzer.map(n => this._mapNutzer(n));
      if (schueler?.length)   SLZB_DB.schueler    = schueler.map(s => this._mapSchueler(s));
      if (sportarten?.length) SLZB_DB.sportarten  = sportarten.map(s => this._mapSportart(s));
      if (wettbewerbe?.length)SLZB_DB.wettbewerbe = wettbewerbe.map(w => this._mapWettbewerb(w));
      if (teams?.length)      SLZB_DB.teams       = teams.map(t => this._mapTeam(t));
      SLZB_DB.erfolge = erfolgeMitDaten;

      slzbSave();
      this.letzterSync = new Date();
      this._zeigeSyncStatus('✅ Synchronisiert: ' + this.letzterSync.toLocaleTimeString('de-DE'));
      return true;
    } catch(e) {
      console.warn('Download-Fehler:', e.message);
      return false;
    }
  },

  // ── Erfolg hochladen ───────────────────────────────────────
  async uploadErfolg(erfolg) {
    if (!this.verfuegbar) return false;
    try {
      const row = this._unmapErfolg(erfolg);
      const { error } = await sb()
        .from('slzb_erfolge')
        .upsert([row], { onConflict: 'id' });
      if (error) { console.warn('Upload-Fehler Erfolg:', error.message); return false; }

      // Beteiligungen
      if (erfolg.beteiligte?.length) {
        await sb().from('slzb_beteiligungen').delete().eq('erfolg_id', erfolg.id);
        const betRows = erfolg.beteiligte.map(b => ({
          erfolg_id: erfolg.id,
          schueler_id: b.schuelerId,
          rolle: b.rolle,
          einwilligungsstatus: b.einwilligungsstatus,
        }));
        await sb().from('slzb_beteiligungen').insert(betRows);
      }

      // Protokoll (nur neue Einträge)
      if (erfolg.protokoll?.length) {
        const letzter = erfolg.protokoll[erfolg.protokoll.length - 1];
        await sb().from('slzb_protokoll').insert([{
          erfolg_id: erfolg.id,
          status_alt: letzter.statusAlt || '',
          status_neu: letzter.statusNeu,
          zeitpunkt: letzter.zeitpunkt,
          person: letzter.person,
          kommentar: letzter.kommentar || '',
        }]).onConflict('do nothing');
      }
      return true;
    } catch(e) {
      console.warn('Upload-Fehler:', e.message);
      return false;
    }
  },

  // ── Nutzer hochladen ───────────────────────────────────────
  async uploadNutzer(nutzer) {
    if (!this.verfuegbar) return false;
    try {
      const { error } = await sb().from('slzb_nutzer').upsert([{
        id: nutzer.id,
        username: nutzer.username,
        password_hash: nutzer.passwordHash,
        anzeigename: nutzer.anzeigename,
        rolle: nutzer.rolle,
        aktiv: nutzer.aktiv !== false,
      }], { onConflict: 'id' });
      return !error;
    } catch(e) { return false; }
  },

  // ── Schüler hochladen ──────────────────────────────────────
  async uploadSchueler(schueler) {
    if (!this.verfuegbar) return false;
    try {
      const { error } = await sb().from('slzb_schueler').upsert([
        this._unmapSchueler(schueler)
      ], { onConflict: 'id' });
      return !error;
    } catch(e) { return false; }
  },

  // ── Wettbewerb hochladen ───────────────────────────────────
  async uploadWettbewerb(wb) {
    if (!this.verfuegbar) return false;
    try {
      const { error } = await sb().from('slzb_wettbewerbe').upsert([{
        id: wb.id, name: wb.name,
        veranstalter: wb.veranstalter || '',
        ort: wb.ort || '',
        beginn: wb.beginn || null,
        ende: wb.ende || null,
        ebene: wb.ebene || '',
        sportart_id: wb.sportartId || null,
      }], { onConflict: 'id' });
      return !error;
    } catch(e) { return false; }
  },

  // ── Sync-Status-Anzeige ────────────────────────────────────
  _zeigeSyncStatus(text) {
    let el = document.getElementById('sync-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sync-status';
      el.style.cssText = 'position:fixed;bottom:8px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,51,102,.85);color:#fff;padding:4px 14px;border-radius:20px;' +
        'font-size:.72rem;z-index:8000;transition:opacity .5s;pointer-events:none';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  },

  // ── Mapping: Supabase → App ────────────────────────────────
  _mapNutzer(n) {
    return {
      id: n.id, username: n.username,
      passwordHash: n.password_hash,
      anzeigename: n.anzeigename,
      rolle: n.rolle, aktiv: n.aktiv,
      lastLogin: n.last_login,
    };
  },
  _mapSchueler(s) {
    return {
      id: s.id, schuelerNr: s.schueler_nr,
      vorname: s.vorname, nachname: s.nachname,
      anzeigename: s.anzeigename,
      klasse: s.klasse, sportartId: s.sportart_id,
      gruppe: s.gruppe, aktiv: s.aktiv,
      ew: {
        foto: s.ew_foto, print: s.ew_print,
        homepage: s.ew_homepage,
        digitalSignage: s.ew_digital_signage,
        socialMedia: s.ew_social_media,
        einzeldarstellung: s.ew_einzeldarstellung,
        klasse: s.ew_klasse,
      },
      ewGueltigBis: s.ew_gueltig_bis,
      ewWiderruf: s.ew_widerruf,
      ewWiderrufDatum: s.ew_widerruf_datum,
    };
  },
  _mapSportart(s) {
    return {
      id: s.id, name: s.name, kuerzel: s.kuerzel,
      kategorie: s.kategorie,
      disziplinen: s.disziplinen || [],
      aktiv: s.aktiv,
    };
  },
  _mapWettbewerb(w) {
    return {
      id: w.id, name: w.name,
      veranstalter: w.veranstalter,
      ort: w.ort, beginn: w.beginn, ende: w.ende,
      ebene: w.ebene, sportartId: w.sportart_id,
    };
  },
  _mapTeam(t) {
    return {
      id: t.id, name: t.name,
      sportartId: t.sportart_id,
      kategorie: t.kategorie,
      schuljahr: t.schuljahr, aktiv: t.aktiv,
    };
  },
  _mapErfolg(e) {
    return {
      id: e.id, erfolgNr: e.erfolg_nr,
      meldungsart: e.meldungsart, titel: e.titel,
      sportartId: e.sportart_id, disziplin: e.disziplin,
      wettbewerbId: e.wettbewerb_id,
      datum: e.datum, ort: e.ort, ebene: e.ebene,
      platzierung: e.platzierung, medaille: e.medaille,
      ergebnisWert: e.ergebnis_wert,
      ergebnisEinheit: e.ergebnis_einheit,
      ergebnisText: e.ergebnis_text,
      kurzinfo: e.kurzinfo,
      textArtikel: e.text_artikel,
      textKIEntwurf: e.text_ki_entwurf,
      quelleOriginal: e.quelle_original,
      quelleUrl: e.quelle_url,
      status: e.status,
      melderId: e.melder_id, melderName: e.melder_name,
      eingangsdatum: e.eingangsdatum || e.created_at,
      einwilligungGeprueft: e.einwilligung_geprueft,
      dublettenhinweis: e.dubletten_hinweis,
      dublettenhinweisText: e.dubletten_text,
    };
  },
  _mapBeteiligung(b) {
    return {
      schuelerId: b.schueler_id,
      rolle: b.rolle,
      einwilligungsstatus: b.einwilligungsstatus,
    };
  },
  _mapProtokoll(p) {
    return {
      statusAlt: p.status_alt,
      statusNeu: p.status_neu,
      zeitpunkt: p.zeitpunkt,
      person: p.person,
      kommentar: p.kommentar,
    };
  },

  // ── Mapping: App → Supabase ────────────────────────────────
  _unmapErfolg(e) {
    return {
      id: e.id, erfolg_nr: e.erfolgNr,
      meldungsart: e.meldungsart, titel: e.titel,
      sportart_id: e.sportartId, disziplin: e.disziplin,
      wettbewerb_id: e.wettbewerbId,
      datum: e.datum, ort: e.ort, ebene: e.ebene,
      platzierung: e.platzierung, medaille: e.medaille,
      ergebnis_wert: e.ergebnisWert,
      ergebnis_einheit: e.ergebnisEinheit,
      ergebnis_text: e.ergebnisText,
      kurzinfo: e.kurzinfo,
      text_artikel: e.textArtikel,
      text_ki_entwurf: e.textKIEntwurf,
      quelle_original: e.quelleOriginal,
      quelle_url: e.quelleUrl,
      status: e.status,
      melder_id: e.melderId, melder_name: e.melderName,
      eingangsdatum: e.eingangsdatum,
      einwilligung_geprueft: e.einwilligungGeprueft,
      dubletten_hinweis: e.dublettenhinweis,
      dubletten_text: e.dublettenhinweisText,
    };
  },
  _unmapSchueler(s) {
    return {
      id: s.id, schueler_nr: s.schuelerNr,
      vorname: s.vorname, nachname: s.nachname,
      anzeigename: s.anzeigename,
      klasse: s.klasse, sportart_id: s.sportartId,
      gruppe: s.gruppe, aktiv: s.aktiv,
      ew_foto: s.ew?.foto,
      ew_print: s.ew?.print,
      ew_homepage: s.ew?.homepage,
      ew_digital_signage: s.ew?.digitalSignage,
      ew_social_media: s.ew?.socialMedia,
      ew_einzeldarstellung: s.ew?.einzeldarstellung,
      ew_klasse: s.ew?.klasse,
      ew_gueltig_bis: s.ewGueltigBis,
      ew_widerruf: s.ewWiderruf,
      ew_widerruf_datum: s.ewWiderrufDatum,
    };
  },
};

// ── Supabase-Bibliothek laden (async, blockiert nicht) ────────
function ladeSuperbaseLib() {
  return new Promise((resolve) => {
    if (window.supabase) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// ── Hintergrund-Sync starten ──────────────────────────────────
async function startSync() {
  // Bibliothek laden (non-blocking)
  const geladen = await ladeSuperbaseLib();
  if (!geladen) {
    console.log('Supabase-Bibliothek nicht verfügbar – Offline-Modus');
    return;
  }

  // Verbindung testen (max. 3 Sekunden)
  let verbunden = false;
  try {
    const testPromise = Sync.teste();
    const timeout = new Promise(resolve => setTimeout(()=>resolve(false), 3000));
    verbunden = await Promise.race([testPromise, timeout]);
  } catch(e) { verbunden = false; }

  if (!verbunden) {
    console.log('Supabase nicht erreichbar – Offline-Modus');
    Sync._zeigeSyncStatus('📴 Offline-Modus – lokale Daten');
    return;
  }

  // Ersten Download durchführen (max. 8 Sekunden)
  Sync._zeigeSyncStatus('🔄 Synchronisiere...');
  let ok = false;
  try {
    const dlPromise = Sync.download();
    const dlTimeout = new Promise(resolve => setTimeout(()=>resolve(false), 8000));
    ok = await Promise.race([dlPromise, dlTimeout]);
  } catch(e) { ok = false; }
  if (ok) {
    // UI nur aktualisieren wenn kein Spinner läuft
    // (d.h. Seite ist bereits fertig gerendert)
    const main = document.getElementById('main-page');
    const hatSpinner = main?.querySelector('.spinner');
    if (!hatSpinner && APP.currentPage) {
      try { navigateTo(APP.currentPage); } catch(e) {}
    }
    // Alle 60 Sekunden neu synchronisieren
    setInterval(async () => {
      if (!Sync.syncLaeuft) {
        Sync.syncLaeuft = true;
        await Sync.download();
        // Nur aktualisieren wenn kein Spinner aktiv
        const m = document.getElementById('main-page');
        if (!m?.querySelector('.spinner') && APP.currentPage) {
          try { navigateTo(APP.currentPage); } catch(e) {}
        }
        Sync.syncLaeuft = false;
      }
    }, 60000);
  }
}