// SLZB-Erfolge v3 - vollständige Benutzerverwaltung
// Diese Datei nach app2.js laden.
const UserAdmin = {
  users: [],
  busy: false,
  async call(action, payload={}) {
    const {data,error}=await Backend.client.functions.invoke('admin-user',{body:{action,...payload}});
    if(error) {
      let message=error.message;
      try { const ctx=await error.context?.json(); message=ctx?.error||message; } catch(_) {}
      throw new Error(message);
    }
    if(data?.error) throw new Error(data.error);
    return data;
  },
  async load() {
    const result=await this.call('list');
    this.users=result.users||[];
    return this.users;
  },
  roleLabel(role){return {trainer:'Trainer/Melder',redaktion:'Redaktion',oea:'Öffentlichkeitsarbeit',datenschutz:'Datenschutz',admin:'Administrator'}[role]||role;},
  fmtDate(value){return value?new Date(value).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}):'Nie';}
};

function renderNutzerverwaltung() {
  return `<div class="page">
    <div class="page-header"><h1>👥 Nutzerverwaltung</h1><p>Konten, Rollen, Aktivierung und Passwortverwaltung.</p></div>
    <div class="card mb-3">
      <div class="card-header"><h2>Neuen Nutzer anlegen</h2></div>
      <div class="card-body">
        <div class="alert alert-info"><span class="alert-icon">ℹ️</span><span>Die E-Mail-Adresse dient der Anmeldung bei Supabase. Der Benutzername kann zusätzlich im Login verwendet werden.</span></div>
        <div class="form-row cols-3">
          <div class="form-group"><label>Benutzername <span class="required">*</span></label><input type="text" id="nu-username" placeholder="trainer1"></div>
          <div class="form-group"><label>E-Mail <span class="required">*</span></label><input type="email" id="nu-email" placeholder="trainer1@slzb.de"></div>
          <div class="form-group"><label>Anzeigename <span class="required">*</span></label><input type="text" id="nu-anzeige" placeholder="Vorname Nachname"></div>
          <div class="form-group"><label>Rolle <span class="required">*</span></label><select id="nu-rolle">
            <option value="trainer">Trainer/Melder</option><option value="redaktion">Redaktion</option><option value="oea">Öffentlichkeitsarbeit</option><option value="datenschutz">Datenschutz</option><option value="admin">Administrator</option>
          </select></div>
          <div class="form-group"><label>Initialpasswort <span class="required">*</span></label><input type="password" id="nu-passwort" placeholder="Mindestens 12 Zeichen"></div>
        </div>
        <button class="btn btn-primary btn-sm" id="nu-create-btn" onclick="erstelleNutzerV3()">+ Nutzer anlegen</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>Vorhandene Nutzer</h2><button class="btn btn-ghost btn-sm" onclick="ladeNutzerverwaltung()">↻ Aktualisieren</button></div>
      <div id="nutzerverwaltung-liste" class="card-body"><div class="flex items-center gap-2"><div class="spinner"></div><span>Lade Nutzer...</span></div></div>
    </div>
  </div>`;
}

async function ladeNutzerverwaltung(){
  const el=document.getElementById('nutzerverwaltung-liste'); if(!el)return;
  el.innerHTML='<div class="flex items-center gap-2"><div class="spinner"></div><span>Lade Nutzer...</span></div>';
  try{
    const users=await UserAdmin.load();
    el.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Benutzer</th><th>E-Mail</th><th>Rolle</th><th>Status</th><th>Letzte Anmeldung</th><th>Erstellt</th><th>Aktionen</th></tr></thead><tbody>${users.map(u=>`<tr>
      <td><strong>${esc(u.displayName||'–')}</strong><br><span class="text-xs text-muted">${esc(u.username||'–')}</span></td>
      <td class="text-sm">${esc(u.email||'–')}</td>
      <td><select id="role-${u.id}" ${u.id===Auth.id()?'disabled':''}>${['trainer','redaktion','oea','datenschutz','admin'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${UserAdmin.roleLabel(r)}</option>`).join('')}</select></td>
      <td>${u.active?'<span class="badge badge-success">Aktiv</span>':'<span class="badge badge-danger">Deaktiviert</span>'}</td>
      <td class="text-sm">${UserAdmin.fmtDate(u.lastSignInAt)}</td><td class="text-sm">${UserAdmin.fmtDate(u.createdAt)}</td>
      <td><div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="speichereNutzerRolle('${u.id}')" ${u.id===Auth.id()?'disabled title="Eigene Adminrolle kann hier nicht geändert werden"':''}>Rolle speichern</button>
        <button class="btn btn-ghost btn-sm" onclick="zeigePasswortAendernV3('${u.id}','${esc(u.displayName||u.username)}')">🔑 Passwort</button>
        <button class="btn btn-${u.active?'danger':'success'} btn-sm" onclick="setzeNutzerAktiv('${u.id}',${!u.active})" ${u.id===Auth.id()?'disabled title="Eigenes Konto kann nicht deaktiviert werden"':''}>${u.active?'Deaktivieren':'Aktivieren'}</button>
      </div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="alert alert-danger"><span class="alert-icon">❌</span><span>${esc(e.message)}</span></div>`;}
}

async function erstelleNutzerV3(){
  const username=document.getElementById('nu-username')?.value.trim().toLowerCase();
  const email=document.getElementById('nu-email')?.value.trim().toLowerCase();
  const displayName=document.getElementById('nu-anzeige')?.value.trim();
  const role=document.getElementById('nu-rolle')?.value;
  const password=document.getElementById('nu-passwort')?.value;
  if(!username||!email||!displayName||!role||!password){toast('Alle Felder sind Pflichtfelder','warning');return;}
  if(password.length<12){toast('Das Initialpasswort muss mindestens 12 Zeichen haben','warning');return;}
  const btn=document.getElementById('nu-create-btn'); btn.disabled=true;
  try{await UserAdmin.call('create',{username,email,displayName,role,password});toast(`Nutzer ${username} wurde angelegt`,'success');['nu-username','nu-email','nu-anzeige','nu-passwort'].forEach(id=>document.getElementById(id).value='');await ladeNutzerverwaltung();}
  catch(e){toast(e.message,'danger');}finally{btn.disabled=false;}
}
async function speichereNutzerRolle(userId){try{const role=document.getElementById(`role-${userId}`).value;await UserAdmin.call('update',{userId,role});toast('Rolle gespeichert','success');await ladeNutzerverwaltung();}catch(e){toast(e.message,'danger');}}
async function setzeNutzerAktiv(userId,active){if(!confirm(`Konto wirklich ${active?'aktivieren':'deaktivieren'}?`))return;try{await UserAdmin.call('update',{userId,active});toast(`Konto ${active?'aktiviert':'deaktiviert'}`,'success');await ladeNutzerverwaltung();}catch(e){toast(e.message,'danger');}}
function zeigePasswortAendernV3(userId,name){const overlay=document.createElement('div');overlay.className='modal-overlay';overlay.innerHTML=`<div class="modal" style="max-width:420px"><div class="modal-header"><h3>🔑 Passwort setzen: ${esc(name)}</h3><button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button></div><div class="modal-body"><div class="alert alert-warning"><span class="alert-icon">⚠️</span><span>Die Änderung wird sofort wirksam.</span></div><div class="form-group"><label>Neues Passwort</label><input type="password" id="admin-new-password" placeholder="Mindestens 12 Zeichen"></div></div><div class="modal-footer"><button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button><button class="btn btn-primary" onclick="setzeNutzerPasswort('${userId}')">Speichern</button></div></div>`;document.body.appendChild(overlay);}
async function setzeNutzerPasswort(userId){const password=document.getElementById('admin-new-password')?.value||'';if(password.length<12){toast('Mindestens 12 Zeichen erforderlich','warning');return;}try{await UserAdmin.call('reset-password',{userId,password});document.querySelector('.modal-overlay')?.remove();toast('Passwort wurde geändert','success');}catch(e){toast(e.message,'danger');}}

// Nach dem Rendern der Seite Daten asynchron laden.
const _navigateToUserAdmin=navigateTo;
navigateTo=function(page,params={}){_navigateToUserAdmin(page,params);if(page==='nutzerverwaltung')setTimeout(ladeNutzerverwaltung,0);};
