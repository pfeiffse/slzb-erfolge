
// SLZB-Erfolge v3 - servergestützte Anmeldung mit Supabase Auth
const Auth = {
  currentUser: null,
  async _loadProfile(user) {
    if (!user) { this.currentUser=null; return null; }
    const {data,error}=await Backend.client.from('profiles').select('user_id,username,display_name,role,active').eq('user_id',user.id).single();
    if(error) throw new Error('Profil konnte nicht geladen werden: '+error.message);
    if(data.active===false) { await Backend.client.auth.signOut(); throw new Error('Konto ist deaktiviert.'); }
    this.currentUser={id:data.user_id,username:data.username||user.email,anzeigename:data.display_name,rolle:data.role,aktiv:data.active,email:user.email};
    return this.currentUser;
  },
  async login(username, passwort) {
    const value=username.trim().toLowerCase();
    let email=value;
    if(!value.includes('@')) {
      const {data,error}=await Backend.client.rpc('email_for_username',{p_username:value});
      if(error || !data) return {ok:false,fehler:'Benutzername oder Passwort falsch.'};
      email=data;
    }
    const {data,error}=await Backend.client.auth.signInWithPassword({email,password:passwort});
    if(error) return {ok:false,fehler:'Benutzername oder Passwort falsch.'};
    try { await this._loadProfile(data.user); return {ok:true,user:this.currentUser}; }
    catch(e){ return {ok:false,fehler:e.message}; }
  },
  async logout() { await Backend.client.auth.signOut(); this.currentUser=null; },
  async restore() {
    const session=await Backend.session();
    if(!session) return null;
    return await this._loadProfile(session.user);
  },
  isLoggedIn(){return !!this.currentUser;},
  rolle(){return this.currentUser?.rolle||null;}, name(){return this.currentUser?.anzeigename||'';}, id(){return this.currentUser?.id||null;},
  canDo(action){
    const roles={erfassen:['trainer','redaktion','admin'],bearbeiten:['redaktion','admin'],freigeben:['oea','admin'],datenschutz:['datenschutz','admin'],admin:['admin'],ausgaben:['redaktion','oea','admin']};
    return (roles[action]||[]).includes(this.rolle());
  },
  async aenderePasswort(nutzerId,neuesPasswort){
    if(nutzerId===this.id()) {
      const {error}=await Backend.client.auth.updateUser({password:neuesPasswort});
      if(error) throw error; return true;
    }
    if(!this.canDo('admin')) throw new Error('Keine Berechtigung.');
    await Backend.invoke('admin-user',{action:'reset-password',userId:nutzerId,password:neuesPasswort});
    return true;
  },
  async erstelleNutzer(username,passwort,anzeigename,rolle){
    try{
      const data=await Backend.invoke('admin-user',{action:'create',username,email:`${username}@slzb.local`,password:passwort,displayName:anzeigename,role:rolle});
      await SLZB_DB.reloadUsers(); return {ok:true,id:data.userId};
    }catch(e){return {ok:false,fehler:e.message};}
  }
};
