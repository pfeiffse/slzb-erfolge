import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

type Role = 'trainer'|'redaktion'|'oea'|'datenschutz'|'admin'
const roles: Role[]=['trainer','redaktion','oea','datenschutz','admin']
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:corsHeaders})

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return json({ok:true})
  try{
    if(req.method!=='POST') return json({error:'Nur POST ist erlaubt.'},405)
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{autoRefreshToken:false,persistSession:false}})
    const authHeader=req.headers.get('Authorization')||''
    const token=authHeader.replace(/^Bearer\s+/i,'')
    const {data:{user:actor},error:actorError}=await admin.auth.getUser(token)
    if(actorError||!actor) return json({error:'Nicht angemeldet.'},401)
    const {data:actorProfile,error:profileError}=await admin.from('profiles').select('role,active').eq('user_id',actor.id).single()
    if(profileError||actorProfile?.role!=='admin'||actorProfile?.active!==true) return json({error:'Administratorrechte erforderlich.'},403)
    const body=await req.json(); const action=String(body.action||'')

    if(action==='list'){
      const [{data:authData,error:authError},{data:profiles,error:profilesError}]=await Promise.all([admin.auth.admin.listUsers({page:1,perPage:1000}),admin.from('profiles').select('user_id,username,display_name,role,active,created_at')])
      if(authError) throw authError; if(profilesError) throw profilesError
      const byId=new Map((profiles||[]).map(p=>[p.user_id,p]))
      const users=authData.users.map(u=>{const p=byId.get(u.id);return{id:u.id,email:u.email,username:p?.username||'',displayName:p?.display_name||'',role:p?.role||'trainer',active:p?.active??false,createdAt:u.created_at||p?.created_at,lastSignInAt:u.last_sign_in_at||null}})
      return json({users})
    }

    if(action==='create'){
      const username=String(body.username||'').trim().toLowerCase(),email=String(body.email||'').trim().toLowerCase(),displayName=String(body.displayName||'').trim(),password=String(body.password||''),role=String(body.role||'') as Role
      if(!username||!email||!displayName||!password||!roles.includes(role)) return json({error:'Ungültige oder unvollständige Angaben.'},400)
      if(password.length<12) return json({error:'Das Passwort muss mindestens 12 Zeichen haben.'},400)
      const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:displayName}})
      if(createError) throw createError
      const {error:insertError}=await admin.from('profiles').insert({user_id:created.user.id,username,display_name:displayName,role,active:true})
      if(insertError){await admin.auth.admin.deleteUser(created.user.id);throw insertError}
      await admin.from('audit_log').insert({actor_id:actor.id,action:'user_create',entity_type:'profile',entity_id:created.user.id,details:{username,email,role}})
      return json({ok:true,userId:created.user.id})
    }

    if(action==='update'){
      const userId=String(body.userId||''); if(!userId) return json({error:'userId fehlt.'},400)
      if(userId===actor.id&&(body.active===false||('role' in body&&body.role!=='admin'))) return json({error:'Das eigene Administratorkonto kann nicht deaktiviert oder herabgestuft werden.'},400)
      const patch:Record<string,unknown>={}
      if('role' in body){if(!roles.includes(body.role))return json({error:'Ungültige Rolle.'},400);patch.role=body.role}
      if('active' in body)patch.active=Boolean(body.active)
      if('displayName' in body){const n=String(body.displayName).trim();if(!n)return json({error:'Anzeigename darf nicht leer sein.'},400);patch.display_name=n}
      const {error}=await admin.from('profiles').update(patch).eq('user_id',userId);if(error)throw error
      await admin.from('audit_log').insert({actor_id:actor.id,action:'user_update',entity_type:'profile',entity_id:userId,details:patch})
      return json({ok:true})
    }

    if(action==='reset-password'){
      const userId=String(body.userId||''),password=String(body.password||'');if(!userId||password.length<12)return json({error:'Benutzer und Passwort mit mindestens 12 Zeichen erforderlich.'},400)
      const {error}=await admin.auth.admin.updateUserById(userId,{password});if(error)throw error
      await admin.from('audit_log').insert({actor_id:actor.id,action:'password_reset',entity_type:'profile',entity_id:userId,details:{}})
      return json({ok:true})
    }
    return json({error:'Unbekannte Aktion.'},400)
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:String(error)},400)}
})
