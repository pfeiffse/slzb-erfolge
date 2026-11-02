// SLZB-Erfolge – E-Mail-Benachrichtigung bei neuen Meldungen
// Edge Function: notify-new-meldung
// Wird aufgerufen nach DB-Trigger oder manuell aus der App

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: corsHeaders })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })
  if (req.method !== 'POST') return json({ error: 'Nur POST erlaubt.' }, 405)

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Auth prüfen
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Nicht angemeldet.' }, 401)

    const body = await req.json()
    const { erfolgId, erfolgNr, titel, meldungsart, melderName, status } = body

    if (!erfolgId || !titel) return json({ error: 'erfolgId und titel sind Pflichtfelder.' }, 400)

    // Empfänger: alle aktiven Redakteure, ÖA und Admins
    const { data: profiles, error: profileErr } = await admin
      .from('profiles')
      .select('user_id, display_name, role')
      .in('role', ['redaktion', 'oea', 'admin'])
      .eq('active', true)

    if (profileErr) throw profileErr

    // E-Mail-Adressen der Empfänger aus Auth laden
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]))

    const empfaenger = (profiles || [])
      .map(p => ({ name: p.display_name, email: emailMap.get(p.user_id), role: p.role }))
      .filter(e => e.email)

    if (empfaenger.length === 0) return json({ ok: true, sent: 0, message: 'Keine Empfänger gefunden.' })

    // Resend API Key aus Umgebungsvariablen
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) return json({ error: 'RESEND_API_KEY nicht konfiguriert.' }, 500)

    const appUrl = 'https://tinyurl.com/slzb-erfolge'
    const statusFarbe = status === 'Eingereicht' ? '#E2001A' : '#0B63CE'

    // HTML-E-Mail
    const htmlBody = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Montserrat,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr><td style="background:#003366;padding:24px 32px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;letter-spacing:1px">SLZB-Erfolge</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px">Schul- und Leistungssportzentrum Berlin</p>
        </td></tr>
        <!-- Akzentlinie -->
        <tr><td style="background:${statusFarbe};height:4px"></td></tr>
        <!-- Inhalt -->
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:18px">Neue Meldung eingegangen</h2>
          <p style="margin:0 0 24px;color:#666;font-size:14px">Eine neue Erfolgsmeldung wartet auf Prüfung.</p>
          <!-- Meldungs-Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;border-left:4px solid ${statusFarbe};margin-bottom:24px">
            <tr><td style="padding:20px">
              <p style="margin:0 0 4px;color:#888;font-size:12px;font-weight:700;letter-spacing:2px">MELDUNG</p>
              <h3 style="margin:0 0 12px;color:#1a1a2e;font-size:16px">${titel}</h3>
              <table cellpadding="0" cellspacing="0">
                <tr><td style="color:#888;font-size:13px;padding-right:12px">Nr.:</td><td style="color:#333;font-size:13px;font-weight:700">${erfolgNr || '–'}</td></tr>
                <tr><td style="color:#888;font-size:13px;padding-right:12px">Art:</td><td style="color:#333;font-size:13px">${meldungsart || '–'}</td></tr>
                <tr><td style="color:#888;font-size:13px;padding-right:12px">Melder:</td><td style="color:#333;font-size:13px">${melderName || '–'}</td></tr>
                <tr><td style="color:#888;font-size:13px;padding-right:12px">Status:</td><td style="color:${statusFarbe};font-size:13px;font-weight:700">${status || 'Eingereicht'}</td></tr>
              </table>
            </td></tr>
          </table>
          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:${statusFarbe};border-radius:8px">
              <a href="${appUrl}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:700;font-size:14px">
                → Zur Meldung in SLZB-Erfolge
              </a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f0f0f0;padding:16px 32px;border-top:1px solid #e0e0e0">
          <p style="margin:0;color:#888;font-size:12px;text-align:center">
            SLZB-Erfolge · Schul- und Leistungssportzentrum Berlin · Diese E-Mail wurde automatisch generiert.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    // Sende E-Mails über Resend
    let sent = 0
    const fehler: string[] = []

    for (const emp of empfaenger) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'SLZB-Erfolge <noreply@slzb-erfolge.de>',
            to: [emp.email],
            subject: `[SLZB-Erfolge] Neue Meldung: ${titel}`,
            html: htmlBody,
          }),
        })
        if (res.ok) sent++
        else {
          const err = await res.json()
          fehler.push(`${emp.email}: ${err.message || res.status}`)
        }
      } catch (e) {
        fehler.push(`${emp.email}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // Audit-Log
    await admin.from('audit_log').insert({
      actor_id: user.id,
      action: 'notify_new_meldung',
      entity_type: 'achievement',
      entity_id: erfolgId,
      details: { sent, fehler, empfaenger: empfaenger.length }
    }).catch(() => {})

    return json({ ok: true, sent, fehler, empfaenger: empfaenger.length })

  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
