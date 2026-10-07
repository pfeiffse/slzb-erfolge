
// SLZB-Erfolge v3 - Daten aus PostgreSQL/Supabase
const SLZB_DB={
 sportarten:[],wettbewerbe:[],schueler:[],teams:[],nutzer:[],erfolge:[],importauftraege:[],
 getSchueler(id){return this.schueler.find(x=>x.id===id)}, getSportart(id){return this.sportarten.find(x=>x.id===id)},
 getWettbewerb(id){return this.wettbewerbe.find(x=>x.id===id)}, getErfolg(id){return this.erfolge.find(x=>x.id===id)}, getNutzer(id){return this.nutzer.find(x=>x.id===id)},
 neueErfolgNr(){return 'TEMP-'+crypto.randomUUID()},
 getSchuljahr(datum){if(!datum)return'';const d=new Date(datum),j=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;return `${j}/${String(j+1).slice(2)}`},
 pruefeEinwilligung(sid,kanal){const s=this.getSchueler(sid);if(!s)return{ok:false,grund:'Schüler nicht gefunden'};if(s.ewWiderruf)return{ok:false,grund:'Einwilligung widerrufen'};if(s.ewGueltigBis&&new Date(s.ewGueltigBis)<new Date())return{ok:false,grund:'Einwilligung abgelaufen'};if(s.ew?.[kanal]===false)return{ok:false,grund:`Keine Freigabe für "${kanal}"`};return{ok:true}},
 pruefeDubletten(n){return this.erfolge.filter(e=>e.id!==n.id&&e.wettbewerbId===n.wettbewerbId&&e.datum===n.datum&&e.sportartId===n.sportartId&&e.disziplin===n.disziplin&&e.platzierung===n.platzierung&&e.status!=='Gelöscht/Anonymisiert')},
 validiereErfolg(d){const f=[];if(!d.titel?.trim())f.push('Titel ist Pflichtfeld');if(!d.sportartId&&!d.sportartText)f.push('Sportart ist Pflichtfeld');if(!d.datum)f.push('Datum ist Pflichtfeld');if(d.platzierung!=null&&d.platzierung<1)f.push('Platzierung muss mindestens 1 sein');if(d.meldungsart==='Minimalmeldung'&&!d.kurzinfo?.trim())f.push('Kurzinfo ist bei Minimalmeldung Pflichtfeld');return f},
 async load(){
   const [sports,competitions,students,teams,achievements,imports]=await Promise.all([
    Backend.requireOk(Backend.client.from('sports').select('*').order('name'),'Sportarten'),
    Backend.requireOk(Backend.client.from('competitions').select('*').order('starts_on',{ascending:false}),'Wettbewerbe'),
    Backend.requireOk(Backend.client.from('students').select('*,consents(*)').eq('active',true).order('display_name'),'Schüler'),
    Backend.requireOk(Backend.client.from('teams').select('*').order('name'),'Teams'),
    Backend.requireOk(Backend.client.from('achievements').select('*,achievement_participants(*),achievement_status_history(*)').order('submitted_at',{ascending:false}),'Erfolge'),
    Backend.requireOk(Backend.client.from('import_jobs').select('*').order('created_at',{ascending:false}),'Importe')
   ]);
   this.sportarten=sports.map(x=>({id:x.id,name:x.name,kuerzel:x.code,kategorie:x.category,aktiv:x.active,disziplinen:x.disciplines||[]}));
   this.wettbewerbe=competitions.map(x=>({id:x.id,name:x.name,veranstalter:x.organizer,ort:x.location,beginn:x.starts_on,ende:x.ends_on,ebene:x.level,sportartId:x.sport_id}));
   this.schueler=students.map(mapStudent); this.teams=teams.map(x=>({id:x.id,name:x.name,sportartId:x.sport_id,kategorie:x.category,schuljahr:x.school_year,aktiv:x.active}));
   this.erfolge=achievements.map(mapAchievement); this.importauftraege=imports.map(x=>({id:x.id,quelldateiName:x.source_filename,importDatum:x.created_at,gesamtZeilen:x.total_rows,erfolgreich:x.success_rows,fehler:x.error_rows,status:x.status,fehlerprotokoll:x.error_log}));
   await this.reloadUsers();
 },
 async reloadUsers(){const {data,error}=await Backend.client.from('profiles').select('user_id,username,display_name,role,active,created_at');if(error)throw error;this.nutzer=(data||[]).map(x=>({id:x.user_id,username:x.username,anzeigename:x.display_name,rolle:x.role,aktiv:x.active,created:x.created_at}))},
 statusWechsel(id,statusNeu,person,kommentar=''){
   const e=this.getErfolg(id);if(!e)return; const alt=e.status;e.status=statusNeu;e.protokoll=e.protokoll||[];e.protokoll.push({statusAlt:alt,statusNeu,zeitpunkt:new Date().toISOString(),person,kommentar});
   Backend.client.rpc('change_achievement_status',{p_achievement_id:id,p_new_status:statusNeu,p_comment:kommentar}).then(({error})=>{if(error){console.error(error);toast('Status konnte serverseitig nicht gespeichert werden','danger')}});
 }
};
function mapStudent(x){const c=Array.isArray(x.consents)?x.consents[0]:x.consents;return{id:x.id,schuelerNr:x.student_number,vorname:x.first_name,nachname:x.last_name,anzeigename:x.display_name,klasse:x.class_name,sportartId:x.sport_id,gruppe:x.group_name,aktiv:x.active,ew:{foto:c?.photo||false,print:c?.print||false,homepage:c?.homepage||false,digitalSignage:c?.digital_signage||false,socialMedia:c?.social_media||false,einzeldarstellung:c?.single_portrayal||false,klasse:c?.show_class||false},ewGueltigBis:c?.valid_until||null,ewWiderruf:c?.revoked_at!=null}}
function mapAchievement(x){return{id:x.id,erfolgNr:x.achievement_no,meldungsart:x.report_type,titel:x.title,sportartId:x.sport_id,disziplin:x.discipline,wettbewerbId:x.competition_id,datum:x.event_date,ort:x.location,ebene:x.level,platzierung:x.placement,medaille:x.medal||'keine',ergebnisWert:x.result_value,ergebnisEinheit:x.result_unit,ergebnisText:x.result_text,kurzinfo:x.short_info,quelleUrl:x.source_url,status:x.status,melderId:x.reporter_id,melderName:x.reporter_name,eingangsdatum:x.submitted_at,einwilligungGeprueft:x.consent_checked,textArtikel:x.article_text,textKIEntwurf:x.ai_draft,dublettenhinweis:x.duplicate_flag,dublettenhinweisText:x.duplicate_note,beteiligte:(x.achievement_participants||[]).map(p=>({schuelerId:p.student_id,rolle:p.participant_role,einwilligungsstatus:p.consent_status})),medien:[],protokoll:(x.achievement_status_history||[]).map(h=>({statusAlt:h.old_status||'',statusNeu:h.new_status,zeitpunkt:h.changed_at,person:h.changed_by_name||'System',kommentar:h.comment||''}))}}
async function slzbLoad(){await SLZB_DB.load()}
function slzbSave(){flushChangedData().catch(e=>console.error('Speichern fehlgeschlagen',e))}
async function slzbSaveUndSync(obj,typ){await persistObject(obj,typ)}
async function persistObject(obj,typ){
 if(typ==='erfolg'){
  const row={id:obj.id.startsWith('TEMP-')?undefined:obj.id,report_type:obj.meldungsart,title:obj.titel,sport_id:obj.sportartId,discipline:obj.disziplin||null,competition_id:obj.wettbewerbId||null,event_date:obj.datum,location:obj.ort||null,level:obj.ebene||null,placement:obj.platzierung,medal:obj.medaille,result_value:obj.ergebnisWert,result_unit:obj.ergebnisEinheit,result_text:obj.ergebnisText,short_info:obj.kurzinfo,source_url:obj.quelleUrl||null,status:obj.status,reporter_id:Auth.id(),reporter_name:Auth.name()};
  const {data,error}=await Backend.client.from('achievements').insert(row).select().single();if(error)throw error;obj.id=data.id;obj.erfolgNr=data.achievement_no;
  if(obj.beteiligte?.length){const parts=obj.beteiligte.map(b=>({achievement_id:data.id,student_id:b.schuelerId,participant_role:b.rolle,consent_status:b.einwilligungsstatus}));const r=await Backend.client.from('achievement_participants').insert(parts);if(r.error)throw r.error;}
 }
}
async function flushChangedData(){
 // Bestehende UI mutiert Arrays direkt. Diese Kompatibilitätsschicht gleicht Stammdaten ab.
 const students=SLZB_DB.schueler.map(s=>({id:s.id,student_number:s.schuelerNr,first_name:s.vorname,last_name:s.nachname,display_name:s.anzeigename,class_name:s.klasse,group_name:s.gruppe,sport_id:s.sportartId,active:s.aktiv}));
 if(students.length){const r=await Backend.client.from('students').upsert(students);if(r.error)throw r.error;}
 const competitions=SLZB_DB.wettbewerbe.map(w=>({id:w.id,name:w.name,organizer:w.veranstalter,location:w.ort,starts_on:w.beginn,ends_on:w.ende,level:w.ebene,sport_id:w.sportartId}));
 if(competitions.length){const r=await Backend.client.from('competitions').upsert(competitions);if(r.error)throw r.error;}
}
const Sync={verfuegbar:true,uploadErfolg:o=>persistObject(o,'erfolg'),uploadSchueler:async s=>{const r=await Backend.client.from('students').upsert({id:s.id,student_number:s.schuelerNr,first_name:s.vorname,last_name:s.nachname,display_name:s.anzeigename,class_name:s.klasse,group_name:s.gruppe,sport_id:s.sportartId,active:s.aktiv});if(r.error)throw r.error},uploadWettbewerb:async w=>{},uploadNutzer:async n=>{}};
