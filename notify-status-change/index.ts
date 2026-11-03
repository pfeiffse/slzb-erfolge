// ============================================================
// SLZB-Erfolge v3 – Edge Function: Push-Benachrichtigungen
// Deploy: npx supabase functions deploy notify-status-change
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

// Web Push via npm
const webpush = await import('npm:web-push');

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.default.setVapidDetails(
  'mailto:slzb@slzb.de',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, titel, status, erfolgId, kommentar } = await req.json();

    if (!userId || !status) {
      return new Response(JSON.stringify({ error: 'userId und status erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Supabase Admin-Client (Service Role für Zugriff auf alle Subscriptions)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Subscription des Nutzers laden
    const { data: sub, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (subErr || !sub) {
      return new Response(JSON.stringify({ ok: true, info: 'Kein Push-Abonnement' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Nachricht je nach Status
    const statusNachrichten: Record<string, { emoji: string; text: string }> = {
      'Freigegeben':                    { emoji: '✅', text: 'wurde freigegeben!' },
      'Veröffentlicht':                 { emoji: '🎉', text: 'wurde veröffentlicht!' },
      'Rückfrage an Melder':            { emoji: '💬', text: 'hat eine Rückfrage.' },
      'Wegen Einwilligung gesperrt':    { emoji: '🔒', text: 'wurde gesperrt (Einwilligung).' },
      'Archiviert':                     { emoji: '🗄️', text: 'wurde archiviert.' },
      'Redaktion':                      { emoji: '✏️', text: 'ist in der Redaktion.' },
      'Teilweise freigegeben':          { emoji: '⚡', text: 'wurde teilweise freigegeben.' },
    };

    const msg = statusNachrichten[status] || { emoji: '📋', text: `Status: ${status}` };
    const titelKurz = titel && titel.length > 40 ? titel.slice(0, 37) + '…' : (titel || 'Deine Meldung');

    const payload = JSON.stringify({
      title: `${msg.emoji} SLZB-Erfolge`,
      body: `"${titelKurz}" ${msg.text}${kommentar ? '\n' + kommentar : ''}`,
      url: `https://pfeiffse.github.io/slzb-erfolge/slzb-v3/?action=erfolg-detail&id=${erfolgId}`,
      icon: 'https://pfeiffse.github.io/slzb-erfolge/slzb-v3/icons/icon-192x192.png',
      badge: 'https://pfeiffse.github.io/slzb-erfolge/slzb-v3/icons/icon-72x72.png',
      tag: `slzb-${erfolgId}`,  // Ersetzt vorherige Notification für gleiche Meldung
    });

    // Push senden
    await webpush.default.sendNotification(
      JSON.parse(sub.subscription),
      payload
    );

    console.log(`[Push] Gesendet an ${userId}: ${status}`);
    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[Push] Fehler:', err);
    // 410 Gone = Subscription abgelaufen → aus DB löschen
    if (err.statusCode === 410) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      // userId aus Request nicht mehr verfügbar, aber Fehler loggen
      console.warn('[Push] Subscription abgelaufen (410)');
    }
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
