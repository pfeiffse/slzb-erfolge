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

  // Edge Function aufrufen mit detailliertem Fehler-Logging
  async invoke(name, body) {
    const { data, error } = await this.client.functions.invoke(name, { body });
    if (error) {
      // Versuche den Response-Body zu lesen
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

  // Direkte DB-Abfragen
  async getProfile(userId) {
    const { data } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  },

  async updateProfile(userId, updates) {
    const { error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    if (error) throw new Error(error.message);
  },
};

// ── Auth-Wrapper ─────────────────────────────────────────────
const Auth = {
  _session: null,
  _profile: null,

  async init() {
    const session = await Backend.session();
    if (session) {
      this._session = session;
      this._profile = await Backend.getProfile(session.user.id);
    }
    // Session-Änderungen überwachen
    Backend.client.auth.onAuthStateChange(async (event, session) => {
      this._session = session;
      if (session) {
        this._profile = await Backend.getProfile(session.user.id);
      } else {
        this._profile = null;
      }
    });
    return !!session;
  },

  async login(email, password) {
    const { data, error } = await Backend.client.auth.signInWithPassword({
      email, password
    });
    if (error) return { ok: false, fehler: error.message };
    this._session = data.session;
    this._profile = await Backend.getProfile(data.user.id);
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
  rolle()       { return this._profile?.role || 'trainer'; },
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

  // Eigenes Passwort ändern
  async aenderePasswort(neuesPasswort) {
    const { error } = await Backend.client.auth.updateUser({ password: neuesPasswort });
    if (error) throw new Error(error.message);
  },
};

// ── UserAdmin (Edge Function) ────────────────────────────────
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

  // Fallback: Nutzer direkt aus profiles-Tabelle laden
  async loadFallback() {
    const { data, error } = await Backend.client
      .from('profiles')
      .select('*')
      .order('created_at');
    if (error) throw new Error(error.message);
    this.users = data || [];
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