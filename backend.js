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