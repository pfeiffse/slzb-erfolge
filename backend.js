// ============================================================
// SLZB-Erfolge v3 - bereinigtes Supabase-Backend
// Stand: Reparatur fuer Meldungsbearbeitung und Beteiligte
// ============================================================

const Backend = {
  client: null,

  async init() {
    const cfg = window.SLZB_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error('config.js fehlt oder ist nicht konfiguriert.');
    }
    if (!window.supabase?.createClient) {
      throw new Error('Die Supabase-Bibliothek wurde nicht geladen.');
    }
    this.client = window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
  },

  async session() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },

  async requireOk(promise, label = 'Backend') {
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
      } catch (_) {}
      console.error(`Edge Function ${name} Fehler:`, detail, error);
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getProfile(userId) {
    const { data, error } = await this.client
      .from('profiles').select('*').eq('user_id', userId).single();
    if (error) {
      console.warn('getProfile Fehler:', error.message);
      return null;
    }
    return data;
  },

  async updateProfile(userId, updates) {
    const { error } = await this.client
      .from('profiles').update(updates).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
};

// ---- Auth ----------------------------------------------------
const Auth = {
  _session: null,
  _profile: null,

  async init() {
    const session = await Backend.session();
    this._session = session;
    this._profile = session ? await Backend.getProfile(session.user.id) : null;
    if (session && !this._profile) {
      this._profile = {
        user_id: session.user.id,
        role: 'trainer',
        display_name: session.user.email,
        username: session.user.email,
      };
    }
    Backend.client.auth.onAuthStateChange(async (_event, nextSession) => {
      this._session = nextSession;
      this._profile = nextSession
        ? await Backend.getProfile(nextSession.user.id)
        : null;
      if (nextSession && !this._profile) {
        this._profile = {
          user_id: nextSession.user.id,
          role: 'trainer',
          display_name: nextSession.user.email,
          username: nextSession.user.email,
        };
      }
    });
    return !!session;
  },

  async login(email, password) {
    const { data, error } = await Backend.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    this._session = data.session;
    this._profile = await Backend.getProfile(data.user.id);
    if (this._profile && this._profile.active === false) {
      await Backend.client.auth.signOut();
      this._session = null;
      this._profile = null;
      throw new Error('Dieses Konto ist deaktiviert.');
    }
    return { ok: true };
  },

  async logout() {
    await Backend.client.auth.signOut();
    this._session = null;
    this._profile = null;
  },

  isLoggedIn() { return !!this._session; },
  id() { return this._session?.user?.id || null; },
  email() { return this._session?.user?.email || ''; },
  name() { return this._profile?.display_name || this._profile?.username || this.email(); },
  rolle() { return this._profile?.role || 'trainer'; },
  username() { return this._profile?.username || ''; },

  canDo(action) {
    const roles = {
      erfassen: ['trainer', 'mitarbeiter', 'schueler', 'redaktion', 'oea', 'admin'],
      bearbeiten: ['redaktion', 'oea', 'datenschutz', 'admin'],
      freigeben: ['oea', 'admin'],
      datenschutz: ['datenschutz', 'admin'],
      admin: ['admin'],
      ausgaben: ['redaktion', 'oea', 'admin'],
    };
    return (roles[action] || []).includes(this.rolle());
  },

  async aenderePasswort(neuesPasswort) {
    const { error } = await Backend.client.auth.updateUser({ password: neuesPasswort });
    if (error) throw new Error(error.message);
  },
};

// ---- Fachlicher Datenzugriff --------------------------------
const DB = {
  _isSchemaError(error) {
    const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    return text.includes('pgrst204') || text.includes('column') || text.includes('schema cache');
  },

  _clean(value) {
    return typeof value === 'string' ? value.trim() : value;
  },

  async naechsteErfolgNr() {
    const rpc = await Backend.client.rpc('next_achievement_no');
    if (!rpc.error && rpc.data) return String(rpc.data);

    const { data, error } = await Backend.client
      .from('achievements')
      .select('achievement_no')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`Erfolgsnummer: ${error.message}`);
    let max = 0;
    for (const row of data || []) {
      const n = Number(String(row.achievement_no || '').replace(/\D/g, ''));
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
    return `ERF-${String(max + 1).padStart(8, '0')}`;
  },

  async getErfolge(filter = {}) {
    let q = Backend.client.from('achievements').select('*').order('created_at', { ascending: false });
    if (filter.melderId) q = q.eq('reporter_id', filter.melderId);
    if (filter.status) q = q.eq('status', filter.status);
    if (filter.statusIn?.length) q = q.in('status', filter.statusIn);
    if (filter.sportartId) q = q.eq('sport_id', filter.sportartId);
    if (filter.ebene) q = q.eq('level', filter.ebene);
    if (filter.suche) q = q.ilike('title', `%${filter.suche}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []).map(row => this._mapErfolg(row));
  },

  async getErfolgById(id) {
    const { data, error } = await Backend.client
      .from('achievements')
      .select('*, competitions(name)')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Meldung laden:', error);
      return null;
    }

    const erfolg = this._mapErfolg(data);
    erfolg.beteiligte = await this.getBeteiligte(id);
    erfolg.protokoll = await this.getProtokoll(id);
    erfolg.bilder = await this.getBilder(id);
    erfolg.medien = erfolg.bilder;
    return erfolg;
  },

  async getBeteiligte(erfolgId) {
    const { data, error } = await Backend.client
      .from('achievement_participants')
      .select('*')
      .eq('achievement_id', erfolgId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Beteiligte laden: ${error.message}`);
    return (data || []).map(row => this._mapBeteiligter(row));
  },

  _mapBeteiligter(row) {
    const explicitName = row.student_name || row.display_name || row.participant_name || row.name || '';
    const roleField = row.rolle || row.role || row.participant_role || 'Athlet';
    const participantRoleContainsName = !explicitName && !row.student_id && row.participant_role;
    return {
      id: row.id,
      schuelerId: row.student_id || null,
      anzeigename: explicitName || (participantRoleContainsName ? row.participant_role : '') || '',
      rolle: participantRoleContainsName ? 'Athlet' : roleField,
      einwilligungsstatus: row.consent_status || 'Nicht geprüft',
      individuellesErgebnis: row.individual_result || '',
      _raw: row,
    };
  },

  async _insertParticipantWithCompatibility(base) {
    const variants = [
      {
        achievement_id: base.achievement_id,
        student_id: base.student_id,
        student_name: base.name,
        rolle: base.role,
        consent_status: base.consent_status,
      },
      {
        achievement_id: base.achievement_id,
        student_id: base.student_id,
        display_name: base.name,
        participant_role: base.role,
        consent_status: base.consent_status,
        individual_result: base.individual_result,
      },
      {
        achievement_id: base.achievement_id,
        student_id: base.student_id,
        participant_role: base.name,
        individual_result: base.individual_result,
        consent_status: base.consent_status,
      },
    ];

    let lastError = null;
    for (const row of variants) {
      const { data, error } = await Backend.client
        .from('achievement_participants')
        .insert([row])
        .select()
        .single();
      if (!error) return data;
      lastError = error;
      if (!this._isSchemaError(error)) break;
    }
    throw new Error(lastError?.message || 'Beteiligter konnte nicht gespeichert werden.');
  },

  async fuegeBeteiligtenHinzu(erfolgId, beteiligter) {
    const name = this._clean(beteiligter?.anzeigename || '');
    if (!name) return { ok: false, fehler: 'Bitte einen Namen eingeben.' };
    try {
      const data = await this._insertParticipantWithCompatibility({
        achievement_id: erfolgId,
        student_id: beteiligter.schuelerId || null,
        name,
        role: beteiligter.rolle || 'Athlet',
        consent_status: beteiligter.einwilligungsstatus || 'Nicht geprüft',
        individual_result: beteiligter.individuellesErgebnis || '',
      });
      return { ok: true, beteiligter: this._mapBeteiligter(data) };
    } catch (error) {
      return { ok: false, fehler: error.message };
    }
  },

  async aktualisiereBeteiligten(id, aenderungen) {
    const { data: existing, error: loadError } = await Backend.client
      .from('achievement_participants').select('*').eq('id', id).single();
    if (loadError) return { ok: false, fehler: loadError.message };

    const patch = {};
    if (aenderungen.anzeigename !== undefined) {
      const name = this._clean(aenderungen.anzeigename || '');
      if ('student_name' in existing) patch.student_name = name;
      else if ('display_name' in existing) patch.display_name = name;
      else if ('participant_name' in existing) patch.participant_name = name;
      else patch.participant_role = name;
    }
    if (aenderungen.rolle !== undefined) {
      if ('rolle' in existing) patch.rolle = aenderungen.rolle;
      else if ('role' in existing) patch.role = aenderungen.rolle;
      else if ('display_name' in existing || 'participant_name' in existing) {
        patch.participant_role = aenderungen.rolle;
      }
    }
    if (aenderungen.einwilligungsstatus !== undefined && 'consent_status' in existing) {
      patch.consent_status = aenderungen.einwilligungsstatus;
    }
    if (aenderungen.individuellesErgebnis !== undefined && 'individual_result' in existing) {
      patch.individual_result = aenderungen.individuellesErgebnis;
    }

    const { data, error } = await Backend.client
      .from('achievement_participants').update(patch).eq('id', id).select().single();
    return error
      ? { ok: false, fehler: error.message }
      : { ok: true, beteiligter: this._mapBeteiligter(data) };
  },

  async entferneBeteiligten(id) {
    const { error } = await Backend.client.from('achievement_participants').delete().eq('id', id);
    return error ? { ok: false, fehler: error.message } : { ok: true };
  },

  async ersetzeBeteiligte(erfolgId, beteiligte = []) {
    const { data: existing, error: loadError } = await Backend.client
      .from('achievement_participants').select('id').eq('achievement_id', erfolgId);
    if (loadError) return { ok: false, fehler: loadError.message };

    for (const row of existing || []) {
      const result = await this.entferneBeteiligten(row.id);
      if (!result.ok) return result;
    }
    const saved = [];
    for (const beteiligter of beteiligte) {
      const result = await this.fuegeBeteiligtenHinzu(erfolgId, beteiligter);
      if (!result.ok) return result;
      saved.push(result.beteiligter);
    }
    return { ok: true, beteiligte: saved };
  },

  async erstelleErfolg(daten, beteiligte = []) {
    const nr = await this.naechsteErfolgNr();
    const row = this._unmapErfolg({ ...daten, erfolgNr: nr }, true);
    const { data, error } = await Backend.client
      .from('achievements').insert([row]).select().single();
    if (error) return { ok: false, fehler: error.message };

    try {
      for (const beteiligter of beteiligte) {
        const result = await this.fuegeBeteiligtenHinzu(data.id, beteiligter);
        if (!result.ok) throw new Error(result.fehler);
      }
      await this.protokolliere(data.id, null, daten.status || 'Entwurf', 'Meldung erstellt');
      return { ok: true, id: data.id, nr };
    } catch (saveError) {
      // RLS erlaubt Trainern bewusst kein Hard-Delete. Der Fehler wird deshalb
      // sichtbar zurückgegeben, statt einen fehlgeschlagenen Rollback zu verbergen.
      console.error('Meldung angelegt, Folgeschritt fehlgeschlagen:', saveError);
      return {
        ok: false,
        id: data.id,
        nr,
        teilErfolg: true,
        fehler: `Meldung ${nr} wurde angelegt, aber Beteiligte/Protokoll konnten nicht vollständig gespeichert werden: ${saveError.message}`,
      };
    }
  },

  async aktualisiereErfolg(erfolgId, daten) {
    const patch = this._unmapErfolg(daten, false);
    const { data, error } = await Backend.client
      .from('achievements').update(patch).eq('id', erfolgId).select().single();
    return error
      ? { ok: false, fehler: error.message }
      : { ok: true, erfolg: this._mapErfolg(data) };
  },

  async aktualisiereErfolgMitBeteiligten(erfolgId, daten, beteiligte) {
    const updated = await this.aktualisiereErfolg(erfolgId, daten);
    if (!updated.ok) return updated;
    const participants = await this.ersetzeBeteiligte(erfolgId, beteiligte || []);
    if (!participants.ok) return participants;
    return { ok: true, erfolg: updated.erfolg, beteiligte: participants.beteiligte };
  },

  async statusWechsel(erfolgId, statusNeu, kommentar = '') {
    const alt = await this.getErfolgById(erfolgId);
    if (!alt) return { ok: false, fehler: 'Meldung nicht gefunden.' };
    const { error } = await Backend.client
      .from('achievements').update({ status: statusNeu }).eq('id', erfolgId);
    if (error) return { ok: false, fehler: error.message };
    const history = await this.protokolliere(erfolgId, alt.status || null, statusNeu, kommentar);
    return history.ok ? { ok: true } : history;
  },

  async protokolliere(erfolgId, statusAlt, statusNeu, kommentar = '') {
    const variants = [
      {
        achievement_id: erfolgId,
        old_status: statusAlt || null,
        new_status: statusNeu,
        changed_at: new Date().toISOString(),
        changed_by: Auth.id(),
        changed_by_name: Auth.name(),
        comment: kommentar,
      },
      {
        achievement_id: erfolgId,
        status_alt: statusAlt || null,
        status_neu: statusNeu,
        zeitpunkt: new Date().toISOString(),
        person: Auth.name(),
        person_id: Auth.id(),
        kommentar,
      },
    ];
    let lastError = null;
    for (const row of variants) {
      const { error } = await Backend.client.from('achievement_status_history').insert([row]);
      if (!error) return { ok: true };
      lastError = error;
      if (!this._isSchemaError(error)) break;
    }
    console.error('Protokoll speichern:', lastError);
    return { ok: false, fehler: lastError?.message || 'Protokoll konnte nicht gespeichert werden.' };
  },

  async getProtokoll(erfolgId) {
    const { data, error } = await Backend.client
      .from('achievement_status_history').select('*').eq('achievement_id', erfolgId);
    if (error) throw new Error(`Statusprotokoll laden: ${error.message}`);
    return (data || [])
      .map(row => ({
        id: row.id,
        statusAlt: row.old_status ?? row.status_alt ?? '',
        statusNeu: row.new_status ?? row.status_neu ?? '',
        zeitpunkt: row.changed_at ?? row.zeitpunkt ?? row.created_at,
        person: row.changed_by_name ?? row.person ?? '',
        personId: row.changed_by ?? row.person_id ?? null,
        kommentar: row.comment ?? row.kommentar ?? '',
      }))
      .sort((a, b) => new Date(a.zeitpunkt || 0) - new Date(b.zeitpunkt || 0));
  },

  async getBilder(erfolgId) {
    const { data, error } = await Backend.client
      .from('achievement_media')
      .select('*')
      .eq('achievement_id', erfolgId)
      .order('created_at');

    if (error) {
      console.error('[Bilder] Metadaten laden fehlgeschlagen:', error);
      return [];
    }
    if (!data?.length) return [];

    return Promise.all(data.map(async row => {
      // storage_path speichert nur den Pfad innerhalb des Buckets.
      const storagePath = String(row.storage_path || '')
        .trim()
        .replace(/^achievement-media\//, '')
        .replace(/^\/+/, '');

      let imageUrl = null;
      let urlSource = 'none';
      let loadError = null;

      if (!storagePath) {
        loadError = 'storage_path ist leer';
      } else {
        // Zuverlässigste Variante für private Buckets: authentifizierter Download.
        // Dadurch wird kein ablaufender Signatur-Link im Cache oder Poster verwendet.
        const downloaded = await Backend.client.storage
          .from('achievement-media')
          .download(storagePath);

        if (!downloaded.error && downloaded.data) {
          imageUrl = URL.createObjectURL(downloaded.data);
          urlSource = 'blob';
        } else {
          loadError = downloaded.error?.message || 'Storage-Download fehlgeschlagen';

          // Fallback, falls die Storage-Policy nur signierte URLs zulässt.
          const signed = await Backend.client.storage
            .from('achievement-media')
            .createSignedUrl(storagePath, 60 * 60);

          if (!signed.error && signed.data?.signedUrl) {
            imageUrl = signed.data.signedUrl;
            urlSource = 'signed';
            loadError = null;
          } else {
            loadError = signed.error?.message || loadError;
          }
        }
      }

      if (!imageUrl) {
        console.error('[Bilder] Datei nicht ladbar:', {
          mediaId: row.id,
          bucket: 'achievement-media',
          storagePath,
          fehler: loadError,
        });
      }

      return {
        id: row.id,
        storagePath,
        originalName: row.original_name,
        mimeType: row.mime_type,
        // Bestehende App und poster.js erwarten weiterhin signedUrl.
        signedUrl: imageUrl,
        imageUrl,
        urlSource,
        loadError,
        caption: row.caption || '',
        altText: row.alt_text || '',
        creator: row.creator || row.copyright_holder || '',
        source: row.source || '',
        fileSize: row.file_size,
        uploadedBy: row.uploaded_by,
      };
    }));
  },

  async speichereArtikeltext(erfolgId, text) {
    const { error } = await Backend.client
      .from('achievements').update({ article_text: text || '' }).eq('id', erfolgId);
    return error ? { ok: false, fehler: error.message } : { ok: true };
  },

  async speichereKIEntwurf(erfolgId, text) {
    const { error } = await Backend.client
      .from('achievements').update({ ai_draft: text || '' }).eq('id', erfolgId);
    return error ? { ok: false, fehler: error.message } : { ok: true };
  },

  async softDeleteErfolg(erfolgId) {
    const { error } = await Backend.client
      .from('achievements').update({ deleted_at: new Date().toISOString() }).eq('id', erfolgId);
    return error ? { ok: false, fehler: error.message } : { ok: true };
  },

  _mapErfolg(row) {
    return {
      id: row.id,
      erfolgNr: row.achievement_no,
      meldungsart: row.report_type,
      titel: row.title || '',
      sportartId: row.sport_id,
      sportartText: row.sport_name || row.sport || '',
      disziplin: row.discipline || '',
      wettbewerbId: row.competition_id,
      wettbewerbText: row.competitions?.name || row.competition_name || row.competition || '',
      datum: row.event_date,
      ort: row.location || '',
      ebene: row.level || '',
      platzierung: row.placement,
      medaille: row.medal || 'keine',
      ergebnisWert: row.result_value,
      ergebnisEinheit: row.result_unit || '',
      ergebnisText: row.result_text || '',
      kurzinfo: row.short_info || '',
      textArtikel: row.article_text || '',
      textKIEntwurf: row.ai_draft || '',
      quelleUrl: row.source_url || '',
      status: String(row.status || 'Entwurf'),
      melderId: row.reporter_id,
      melderName: row.reporter_name || '',
      eingangsdatum: row.submitted_at || row.created_at,
      einwilligungGeprueft: !!row.consent_checked,
      dublettenhinweis: !!row.duplicate_flag,
      dublettenhinweisText: row.duplicate_note || '',
      deletedAt: row.deleted_at || null,
      videoUrl: row.video_url || '',
      beteiligte: [],
      protokoll: [],
      bilder: [],
      medien: [],
    };
  },

  _unmapErfolg(erfolg, isNew) {
    const row = {
      report_type: erfolg.meldungsart,
      title: erfolg.titel || '',
      sport_id: erfolg.sportartId || erfolg.sportartText || null,
      discipline: erfolg.disziplin || '',
      competition_id: erfolg.wettbewerbId || null,
      event_date: erfolg.datum || null,
      location: erfolg.ort || '',
      level: erfolg.ebene || '',
      placement: erfolg.platzierung ?? null,
      medal: erfolg.medaille || 'keine',
      result_value: erfolg.ergebnisWert ?? null,
      result_unit: erfolg.ergebnisEinheit || '',
      result_text: erfolg.ergebnisText || '',
      short_info: erfolg.kurzinfo || '',
      article_text: erfolg.textArtikel || '',
      ai_draft: erfolg.textKIEntwurf || '',
      source_url: erfolg.quelleUrl || '',
    };
    if (erfolg.status !== undefined) row.status = erfolg.status;
    if (erfolg.videoUrl !== undefined) row.video_url = erfolg.videoUrl || null;
    if (isNew) {
      row.achievement_no = erfolg.erfolgNr;
      row.reporter_id = Auth.id();
      row.reporter_name = Auth.name();
      row.submitted_at = new Date().toISOString();
      row.consent_checked = false;
      row.duplicate_flag = false;
      row.duplicate_note = '';
    }
    return row;
  },
};

// ---- UserAdmin -----------------------------------------------
const UserAdmin = {
  users: [],

  async call(action, payload = {}) {
    return Backend.invoke('admin-user', { action, ...payload });
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
    this.users = (data || []).map(user => ({ ...user, id: user.user_id }));
    return this.users;
  },

  roleLabel(role) {
    return {
      trainer: 'Trainer/Melder',
      mitarbeiter: 'Mitarbeiter/in',
      schueler: 'Schüler/in',
      redaktion: 'Redaktion',
      oea: 'Öffentlichkeitsarbeit',
      datenschutz: 'Datenschutz',
      admin: 'Administrator',
    }[role] || role;
  },

  fmtDate(value) {
    return value
      ? new Date(value).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
      : 'Nie';
  },
};
