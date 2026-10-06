// ============================================================
// SLZB-Erfolge v2 – Authentifizierung (lokal, kein Server)
// ============================================================

const Auth = {
  currentUser: null,

  // SHA-256 Hash im Browser
  async hashPasswort(passwort) {
    const encoder = new TextEncoder();
    const data = encoder.encode(passwort);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
  },

  async login(username, passwort) {
    const hash = await this.hashPasswort(passwort);
    const nutzer = SLZB_DB.nutzer.find(n=>
      n.username === username.toLowerCase().trim() &&
      n.passwordHash === hash &&
      n.aktiv !== false
    );
    if (!nutzer) return { ok:false, fehler:'Benutzername oder Passwort falsch.' };
    nutzer.lastLogin = new Date().toISOString();
    this.currentUser = nutzer;
    sessionStorage.setItem('slzb_user', JSON.stringify(nutzer));
    slzbSave();
    return { ok:true, user:nutzer };
  },

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('slzb_user');
  },

  restore() {
    const raw = sessionStorage.getItem('slzb_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        // Prüfen ob Nutzer noch in DB aktiv
        const dbUser = SLZB_DB.nutzer.find(n=>n.id===u.id&&n.aktiv!==false);
        if (dbUser) { this.currentUser = dbUser; return dbUser; }
      } catch(e) {}
    }
    return null;
  },

  isLoggedIn() { return !!this.currentUser; },
  rolle()      { return this.currentUser?.rolle || null; },
  name()       { return this.currentUser?.anzeigename || ''; },
  id()         { return this.currentUser?.id || null; },

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

  // Passwort ändern
  async aenderePasswort(nutzerId, neuesPasswort) {
    const hash = await this.hashPasswort(neuesPasswort);
    const nutzer = SLZB_DB.nutzer.find(n=>n.id===nutzerId);
    if (!nutzer) return false;
    nutzer.passwordHash = hash;
    slzbSave();
    return true;
  },

  // Neuen Nutzer anlegen
  async erstelleNutzer(username, passwort, anzeigename, rolle) {
    if (SLZB_DB.nutzer.find(n=>n.username===username.toLowerCase().trim()))
      return { ok:false, fehler:'Benutzername bereits vergeben.' };
    const hash = await this.hashPasswort(passwort);
    const id = 'USR-' + Date.now();
    SLZB_DB.nutzer.push({
      id, username:username.toLowerCase().trim(),
      passwordHash:hash, anzeigename, rolle, aktiv:true,
      created: new Date().toISOString(),
    });
    slzbSave();
    return { ok:true, id };
  },
};