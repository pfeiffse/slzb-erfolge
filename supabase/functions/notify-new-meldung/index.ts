import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: corsHeaders })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })
  if (req.method !== 'POST') return json({ error: 'Nur POST erlaubt' }, 405)

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { erfolgId, titel, melder, sportart, datum } = body

    if (!erfolgId || !titel) return json({ error: 'erfolgId und titel erforderlich' }, 400)

    // Empfänger: alle aktiven Redakteure, ÖEA und Admins
    const { data: empfaenger, error: empfErr } = await admin
      .from('profiles')
      .select('user_id, display_name, role')
      .in('role', ['redaktion', 'oea', 'admin'])
      .eq('active', true)

    if (empfErr) throw new Error(empfErr.message)
    if (!empfaenger?.length) return json({ ok: true, skipped: 'Keine Empfänger' })

    // E-Mail-Adressen der Empfänger laden
    const empfaengerIds = empfaenger.map(e => e.user_id)
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const emailMap: Record<string, string> = {}
    ;(authUsers?.users || []).forEach(u => {
      if (empfaengerIds.includes(u.id) && u.email) {
        emailMap[u.id] = u.email
      }
    })

    const empfaengerEmails = empfaenger
      .map(e => emailMap[e.user_id])
      .filter(Boolean)

    if (!empfaengerEmails.length) return json({ ok: true, skipped: 'Keine E-Mail-Adressen' })

    // Resend API Key
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) return json({ error: 'RESEND_API_KEY nicht konfiguriert' }, 500)

    // App-URL
    const appUrl = 'https://pfeiffse.github.io/slzb-erfolge/slzb-v3'
    const meldungUrl = `${appUrl}/?action=erfolg-detail&id=${erfolgId}`

    // E-Mail-HTML
    const htmlBody = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;background:#f5f7fb;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#003366,#001F4D);padding:24px;text-align:center">
      <div style="color:#fff;font-size:1.4rem;font-weight:700">SLZB-Erfolge</div>
      <div style="color:rgba(255,255,255,.7);font-size:.85rem">Schul- und Leistungssportzentrum Berlin</div>
    </div>
    <!-- Content -->
    <div style="padding:24px">
      <div style="background:#E2001A;color:#fff;display:inline-block;padding:4px 12px;border-radius:20px;font-size:.78rem;font-weight:700;margin-bottom:16px">
        📋 Neue Meldung eingereicht
      </div>
      <h2 style="color:#003366;margin:0 0 12px">${titel}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${melder ? `<tr><td style="padding:6px 0;color:#666;width:120px">Melder:</td><td style="padding:6px 0;font-weight:600">${melder}</td></tr>` : ''}
        ${sportart ? `<tr><td style="padding:6px 0;color:#666">Sportart:</td><td style="padding:6px 0;font-weight:600">${sportart}</td></tr>` : ''}
        ${datum ? `<tr><td style="padding:6px 0;color:#666">Datum:</td><td style="padding:6px 0;font-weight:600">${datum}</td></tr>` : ''}
      </table>
      <a href="${meldungUrl}" style="display:inline-block;background:#003366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
        → Meldung prüfen
      </a>
    </div>
    <!-- Footer -->
    <div style="background:#f5f7fb;padding:16px;text-align:center;font-size:.75rem;color:#888">
      SLZB-Erfolge · Automatische Benachrichtigung · <a href="${appUrl}" style="color:#003366">Zur App</a>
    </div>
  </div>
</body>
</html>`

    // E-Mails senden (einzeln für bessere Zustellbarkeit)
    let gesendet = 0
    const fehler: string[] = []

    for (const email of empfaengerEmails) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'SLZB-Erfolge <noreply@slzb.de>',
            to: [email],
            subject: `📋 Neue Meldung: ${titel}`,
            html: htmlBody,
          }),
        })
        if (res.ok) {
          gesendet++
        } else {
          const err = await res.json()
          fehler.push(`${email}: ${err.message || res.status}`)
        }
      } catch (e) {
        fehler.push(`${email}: ${e.message}`)
      }
    }

    // Benachrichtigung in DB speichern
    await admin.from('notifications').insert([{
      typ: 'neue_meldung',
      titel: `Neue Meldung: ${titel}`,
      nachricht: `${melder || 'Unbekannt'} hat eine neue Meldung eingereicht.`,
      link: `/erfolg-detail/${erfolgId}`,
      erstellt_von: null,
      erstellt_von_name: melder || 'System',
      gelesen: false,
    }]).catch(() => {}) // Tabelle existiert möglicherweise noch nicht

    return json({
      ok: true,
      gesendet,
      empfaenger: empfaengerEmails.length,
      fehler: fehler.length ? fehler : undefined,
    })

  } catch (e) {
    console.error('[notify-new-meldung]', e)
    return json({ error: e.message }, 500)
  }
})
