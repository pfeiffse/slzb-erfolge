import { createClient } from 'npm:@supabase/supabase-js@2'

// CORS-Headers direkt definiert (kein fehlerhafter Import)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Role = 'trainer' | 'redaktion' | 'oea' | 'datenschutz' | 'admin'
const roles: Role[] = ['trainer', 'redaktion', 'oea', 'datenschutz', 'admin']

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: corsHeaders })

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') return json({ error: 'Nur POST ist erlaubt.' }, 405)

    // Admin-Client mit Service Role Key
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Aufrufer authentifizieren
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Kein Authorization-Header.' }, 401)

    const { data: { user: actor }, error: actorError } = await admin.auth.getUser(token)
    if (actorError || !actor) return json({ error: 'Nicht angemeldet.' }, 401)

    // Admin-Rolle prüfen
    const { data: actorProfile, error: profileError } = await admin
      .from('profiles')
      .select('role, active')
      .eq('user_id', actor.id)
      .single()

    if (profileError || !actorProfile) return json({ error: 'Profil nicht gefunden.' }, 403)
    if (actorProfile.role !== 'admin') return json({ error: 'Administratorrechte erforderlich.' }, 403)
    if (actorProfile.active !== true) return json({ error: 'Konto ist deaktiviert.' }, 403)

    // Request-Body lesen
    const body = await req.json()
    const action = String(body.action || '')

    // ── list ──────────────────────────────────────────────────
    if (action === 'list') {
      const [
        { data: authData, error: authError },
        { data: profiles, error: profilesError }
      ] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from('profiles').select('user_id, username, display_name, role, active, created_at')
      ])

      if (authError) throw authError
      if (profilesError) throw profilesError

      const byId = new Map((profiles || []).map(p => [p.user_id, p]))
      const users = (authData?.users || []).map(u => {
        const p = byId.get(u.id)
        return {
          id:           u.id,
          email:        u.email,
          username:     p?.username || '',
          displayName:  p?.display_name || '',
          role:         p?.role || 'trainer',
          active:       p?.active ?? false,
          createdAt:    u.created_at || p?.created_at,
          lastSignInAt: u.last_sign_in_at || null,
        }
      })
      return json({ users })
    }

    // ── create ────────────────────────────────────────────────
    if (action === 'create') {
      const username    = String(body.username    || '').trim().toLowerCase()
      const email       = String(body.email       || '').trim().toLowerCase()
      const displayName = String(body.displayName || '').trim()
      const password    = String(body.password    || '')
      const role        = String(body.role        || '') as Role

      if (!username || !email || !displayName || !password)
        return json({ error: 'Alle Felder sind Pflichtfelder.' }, 400)
      if (!roles.includes(role))
        return json({ error: `Ungültige Rolle: ${role}` }, 400)
      if (password.length < 12)
        return json({ error: 'Das Passwort muss mindestens 12 Zeichen haben.' }, 400)

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName, username },
      })
      if (createError) throw createError

      const { error: insertError } = await admin.from('profiles').insert({
        user_id:      created.user.id,
        username,
        display_name: displayName,
        role,
        active:       true,
      })
      if (insertError) {
        await admin.auth.admin.deleteUser(created.user.id)
        throw insertError
      }

      // Audit-Log (optional – kein Fehler wenn Tabelle fehlt)
      try {
        await admin.from('audit_log').insert({
          actor_id:    actor.id,
          action:      'user_create',
          entity_type: 'profile',
          entity_id:   created.user.id,
          details:     { username, email, role },
        })
      } catch(_) {}

      return json({ ok: true, userId: created.user.id })
    }

    // ── update ────────────────────────────────────────────────
    if (action === 'update') {
      const userId = String(body.userId || '')
      if (!userId) return json({ error: 'userId fehlt.' }, 400)

      // Eigenes Konto schützen
      if (userId === actor.id && (body.active === false || (body.role && body.role !== 'admin')))
        return json({ error: 'Das eigene Administratorkonto kann nicht deaktiviert oder herabgestuft werden.' }, 400)

      const patch: Record<string, unknown> = {}
      if ('role' in body) {
        if (!roles.includes(body.role)) return json({ error: 'Ungültige Rolle.' }, 400)
        patch.role = body.role
      }
      if ('active' in body)      patch.active       = Boolean(body.active)
      if ('displayName' in body) {
        const n = String(body.displayName).trim()
        if (!n) return json({ error: 'Anzeigename darf nicht leer sein.' }, 400)
        patch.display_name = n
      }

      const { error } = await admin.from('profiles').update(patch).eq('user_id', userId)
      if (error) throw error

      try {
        await admin.from('audit_log').insert({
          actor_id: actor.id, action: 'user_update',
          entity_type: 'profile', entity_id: userId, details: patch,
        })
      } catch(_) {}

      return json({ ok: true })
    }

    // ── reset-password ────────────────────────────────────────
    if (action === 'reset-password') {
      const userId   = String(body.userId   || '')
      const password = String(body.password || '')
      if (!userId)           return json({ error: 'userId fehlt.' }, 400)
      if (password.length < 12) return json({ error: 'Passwort muss mindestens 12 Zeichen haben.' }, 400)

      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) throw error

      try {
        await admin.from('audit_log').insert({
          actor_id: actor.id, action: 'password_reset',
          entity_type: 'profile', entity_id: userId, details: {},
        })
      } catch(_) {}

      return json({ ok: true })
    }

    return json({ error: `Unbekannte Aktion: ${action}` }, 400)

  } catch (error) {
    console.error('admin-user Fehler:', error)
    return json({
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})