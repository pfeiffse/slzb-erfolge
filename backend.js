// ============================================================
// SLZB-Erfolge v3 – Supabase Backend
// ============================================================
const Backend = {
  client: null,

  async init() {
    const cfg = window.SLZB_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error('config.js fehlt oder ist nicht konfiguriert.');
    }
    this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  },

  async session() {
    const { data } = await this.client.auth.getSession();
    return data.session;
  },

  async requireOk(promise, label='Backend') {
    const { data, error } = await promise;
    if (error) throw new Error(`${label}: ${error.message}`);
    return data;
  },

  async invoke(name, body) {
    const { data, error } = await this.client.functions.invoke(name, { body });
    if (error) {
      let detail = error.message;
      try {
        if (error.context) {
          const ctx = await error.context.json();
          detail = ctx?.error || ctx?.message || JSON.stringify(ctx);
        }
      } catch(_) {}
      console.error(`Edge Function ${name} Fehler:`, detail, error);
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getProfile(userId) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      console.warn('getProfile Fehler:', error.message);
      return null;
    }
    return data;
  },

  async updateProfile(userId, updates) {
    const { error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
};

// ── Auth ─────────────────────────────────────────────────────
const Auth = {
  _session: null,
  _profile: null,

  async init() {
    const session = await Backend.session();
    if (session) {
      this._session = session;
      this._profile = await Backend.getProfile(session.user.id);
      if (typeof debug === 'function') debug(`Session OK: ${session.user.email}, Profil: ${JSON.stringify(this._profile)}`);
      // Fallback wenn kein Profil gefunden
      if (!this._profile) {
        if (typeof debug === 'function') debug('Kein Profil gefunden – Fallback auf E-Mail');
        this._profile = {
          user_id: session.user.id,
          role: 'trainer',
          display_name: session.user.email,
          username: session.user.email,
        };
      }
    }
    Backend.client.auth.onAuthStateChange(async (event, session) => {
      this._session = session;
      if (session) {
        this._profile = await Backend.getProfile(session.user.id);
        if (!this._profile) {
          this._profile = {
            user_id: session.user.id,
            role: 'trainer',
            display_name: session.user.email,
            username: session.user.email,
          };
        }
      } else {
        this._profile = null;
      }
    });
    return !!session;
  },

  async login(email, password) {
    if (typeof debug === 'function') debug(`Login-Versuch: ${email}`);
    const { data, error } = await Backend.client.auth.signInWithPassword({ email, password });
    if (error) {
      if (typeof debug === 'function') debug(`Login Fehler: ${error.message}`);
      return { ok: false, fehler: error.message };
    }
    if (typeof debug === 'function') debug(`Login OK: ${data.user.id}`);
    this._session = data.session;
    this._profile = await Backend.getProfile(data.user.id);
    if (typeof debug === 'function') debug(`Profil: ${JSON.stringify(this._profile)}`);
    // Fallback wenn kein Profil
    if (!this._profile) {
      if (typeof debug === 'function') debug('Kein Profil – Fallback');
      this._profile = {
        user_id: data.user.id,
        role: 'trainer',
        display_name: data.user.email,
        username: data.user.email,
      };
    }
    return { ok: true };
  },

  async logout() {
    await Backend.client.auth.signOut();
    this._session = null;
    this._profile = null;
  },

  isLoggedIn()  { return !!this._session; },
  id()          { return this._session?.user?.id || null; },
  email()       { return this._session?.user?.email || ''; },
  name()        { return this._profile?.display_name || this._profile?.username || this.email(); },
  rolle()       { return String(this._profile?.role || 'trainer'); },
  username()    { return this._profile?.username || ''; },

  canDo(action) {
    const r = this.rolle();
    const perms = {
      erfassen:    ['trainer','redaktion','admin'],
      bearbeiten:  ['redaktion','admin'],
      freigeben:   ['oea','admin'],
      datenschutz: ['datenschutz','admin'],
      admin:       ['admin'],
      ausgaben:    ['redaktion','oea','admin'],
    };
    return (perms[action]||[]).includes(r);
  },

  async aenderePasswort(neuesPasswort) {
    const { error } = await Backend.client.auth.updateUser({ password: neuesPasswort });
    if (error) throw new Error(error.message);
  },
};

// ── Erfolge (Supabase) ───────────────────────────────────────
const DB = {

  // Nächste Erfolg-Nummer via PostgreSQL-Sequenz (garantiert eindeutig)
  async naechsteErfolgNr() {
    const { data, error } = await Backend.client
      .rpc('next_achievement_no');
    if (error || !data) {
      // Fallback: Timestamp-basierte ID (immer eindeutig)
      return 'ERF-' + Date.now().toString().slice(-8);
    }
    return data;
  },

  // Alle Erfolge laden
  async getErfolge(filter = {}) {
    let q = Backend.client
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: false });
    if (filter.melderId)  q = q.eq('melder_id', filter.melderId);
    if (filter.status)    q = q.eq('status', filter.status);
    if (filter.statusIn)  q = q.in('status', filter.statusIn);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []).map(e => this._mapErfolg(e));
  },

  // Einzelnen Erfolg laden
  async getErfolgById(id) {
    const { data, error } = await Backend.client
      .from('achievements')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    const erfolg = this._mapErfolg(data);

    // Beteiligungen laden
    const { data: bet } = await Backend.client
      .from('achievement_participants')
      .select('*')
      .eq('achievement_id', id);
    erfolg.beteiligte = (bet || []).map(b => ({
      schuelerId:          b.student_id,
      anzeigename:         b.student_id, // kein student_name in der Tabelle
      rolle:               b.participant_role || 'Athlet',
      einwilligungsstatus: b.consent_status || 'Nicht geprüft',
    }));

    // Protokoll laden
    const { data: prot } = await Backend.client
      .from('achievement_status_history')
      .select('*')
      .eq('achievement_id', id)
      .order('changed_at', { ascending: true });

    erfolg.protokoll = (prot || []).map(p => ({
      statusAlt: p.old_status      || '',
      statusNeu: p.new_status      || '',
      zeitpunkt: p.changed_at      || new Date().toISOString(),
      person:    p.changed_by_name || '',
      kommentar: p.comment         || '',
    }));

    return erfolg;
  },

  // Erfolg erstellen
  async erstelleErfolg(daten, beteiligte = []) {
    const nr = await this.naechsteErfolgNr();
    const row = this._unmapErfolg({ ...daten, erfolgNr: nr });
    const { data, error } = await Backend.client
      .from('achievements')
      .insert([row])
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Beteiligungen speichern
    if (beteiligte.length > 0) {
      const betRows = beteiligte.map(b => ({
        achievement_id:   data.id,
        student_id:       b.schuelerId,
        participant_role: b.rolle || 'Athlet',
        consent_status:   b.einwilligungsstatus || 'Nicht geprüft',
      }));
      const { error: betError } = await Backend.client
        .from('achievement_participants')
        .insert(betRows);
      if (betError) console.warn('Beteiligungen speichern:', betError.message);
    }

    // Protokolleintrag
    await this.protokolliere(data.id, '', daten.status || 'Entwurf', 'Meldung erstellt');

    return { ok: true, id: data.id, nr };
  },

  // Status wechseln
  async statusWechsel(erfolgId, statusNeu, kommentar = '') {
    const alt = await this.getErfolgById(erfolgId);
    if (!alt) return { ok: false };
    const { error } = await Backend.client
      .from('achievements')
      .update({ status: statusNeu })
      .eq('id', erfolgId);
    if (error) return { ok: false, fehler: error.message };
    await this.protokolliere(erfolgId, alt.status, statusNeu, kommentar);
    return { ok: true };
  },

  // Protokolleintrag
  async protokolliere(erfolgId, statusAlt, statusNeu, kommentar = '') {
    const { error } = await Backend.client
      .from('achievement_status_history')
      .insert([{
        achievement_id:  erfolgId,
        old_status:      statusAlt || '',
        new_status:      statusNeu,
        changed_at:      new Date().toISOString(),
        changed_by:      Auth.id(),
        changed_by_name: Auth.name(),
        comment:         kommentar || '',
      }]);
    if (error) console.warn('Protokoll speichern:', error.message);
  },

  // Artikeltext speichern
  async speichereArtikeltext(erfolgId, text) {
    const { error } = await Backend.client
      .from('achievements')
      .update({ article_text: text })
      .eq('id', erfolgId);
    return !error;
  },

  // KI-Entwurf speichern
  async speichereKIEntwurf(erfolgId, text) {
    const { error } = await Backend.client
      .from('achievements')
      .update({ ai_draft: text })
      .eq('id', erfolgId);
    return !error;
  },

  // Dashboard-Statistiken
  async getDashboardStats() {
    const { data } = await Backend.client
      .from('achievements')
      .select('status');
    if (!data) return {};
    const count = (stati) => data.filter(e => stati.includes(String(e.status))).length;
    return {
      gesamt:         data.length,
      freigegeben:    count(['Freigegeben', 'Veröffentlicht']),
      offen:          count(['Eingereicht', 'Datenprüfung', 'Redaktion', 'Einwilligungsprüfung', 'Dublettenverdacht']),
      unvollstaendig: count(['Unvollständig']),
      gesperrt:       count(['Wegen Einwilligung gesperrt']),
      rueckfragen:    count(['Rückfrage an Melder']),
      freigabeOea:    count(['Freigabe Öffentlichkeitsarbeit']),
    };
  },

  // Dubletten prüfen
  async pruefeDubletten(daten) {
    if (!daten.datum) return [];
    const sportName = daten.sportartText || SLZB_DB.getSportart(daten.sportartId)?.name || '';
    const { data } = await Backend.client
      .from('achievements')
      .select('id, achievement_no, title')
      .eq('event_date', daten.datum)
      .eq('sport_id', sportName)
      .eq('placement', daten.platzierung)
      .not('status', 'eq', 'Gelöscht/Anonymisiert');
    return data || [];
  },

  // Mapping: Supabase → App (englische Spaltennamen → deutsche App-Namen)
  _mapErfolg(e) {
    return {
      id:                   e.id,
      erfolgNr:             e.achievement_no,
      meldungsart:          e.report_type,
      titel:                e.title,
      sportartId:           e.sport_id,
      sportartText:         e.sport_id,          // wird als Freitext genutzt
      disziplin:            e.discipline,
      wettbewerbId:         e.competition_id,
      wettbewerbText:       e.competition_id,    // wird als Freitext genutzt
      datum:                e.event_date,
      ort:                  e.location,
      ebene:                e.level,
      platzierung:          e.placement,
      medaille:             e.medal,
      ergebnisWert:         e.result_value,
      ergebnisEinheit:      e.result_unit,
      ergebnisText:         e.result_text,
      kurzinfo:             e.short_info,
      textArtikel:          e.article_text,
      textKIEntwurf:        e.ai_draft,
      quelleUrl:            e.source_url,
      status:               String(e.status || 'Entwurf'),
      melderId:             e.reporter_id,
      melderName:           e.reporter_name,
      eingangsdatum:        e.submitted_at || e.updated_at,
      einwilligungGeprueft: e.consent_checked,
      dublettenhinweis:     e.duplicate_flag,
      dublettenhinweisText: e.duplicate_note,
      beteiligte:           [],
      protokoll:            [],
      medien:               [],
    };
  },

  // Mapping: App → Supabase (deutsche App-Namen → englische Spaltennamen)
  _unmapErfolg(e) {
    const sportName = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
    const wbName    = e.wettbewerbText || SLZB_DB.getWettbewerb(e.wettbewerbId)?.name || '';
    return {
      achievement_no:  e.erfolgNr,
      report_type:     e.meldungsart,
      title:           e.titel,
      sport_id:        sportName,        // Sportart als Freitext in sport_id
      discipline:      e.disziplin || '',
      competition_id:  wbName,           // Wettbewerb als Freitext in competition_id
      event_date:      e.datum || null,
      location:        e.ort || '',
      level:           e.ebene || '',
      placement:       e.platzierung || null,
      medal:           e.medaille || 'keine',
      result_value:    e.ergebnisWert || null,
      result_unit:     e.ergebnisEinheit || '',
      result_text:     e.ergebnisText || '',
      short_info:      e.kurzinfo || '',
      article_text:    e.textArtikel || '',
      ai_draft:        e.textKIEntwurf || '',
      source_url:      e.quelleUrl || '',
      status:          e.status || 'Entwurf',
      reporter_id:     Auth.id(),
      reporter_name:   Auth.name(),
      submitted_at:    new Date().toISOString(),
      consent_checked: false,
      duplicate_flag:  false,
      duplicate_note:  '',
    };
  },
};

// ── UserAdmin ────────────────────────────────────────────────
const UserAdmin = {
  users: [],

  async call(action, payload={}) {
    return await Backend.invoke('admin-user', { action, ...payload });
  },

  async load() {
    const result = await this.call('list');
    this.users = result.users || result || [];
    return this.users;
  },

  async loadFallback() {
    const { data, error } = await Backend.client
      .from('profiles')
      .select('user_id, username, display_name, role, active, created_at')
      .order('created_at');
    if (error) throw new Error(error.message);
    this.users = (data||[]).map(u=>({...u, id: u.user_id}));
    return this.users;
  },

  roleLabel(role) {
    return {
      trainer:'Trainer/Melder', redaktion:'Redaktion',
      oea:'Öffentlichkeitsarbeit', datenschutz:'Datenschutz', admin:'Administrator'
    }[role] || role;
  },

  fmtDate(value) {
    return value
      ? new Date(value).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'})
      : 'Nie';
  },
};