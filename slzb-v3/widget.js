/**
 * SLZB-Erfolge Widget
 * Einbindung: <script src="widget.js"></script>
 *             <div id="slzb-sportnews"></div>
 * 
 * Optionen via data-Attribute:
 *   <div id="slzb-sportnews"
 *        data-limit="6"
 *        data-sportart=""
 *        data-theme="light">
 *   </div>
 */
(function() {
  'use strict';

  const SUPABASE_URL = 'https://yjzvmvgnpxbxmcjopqws.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqenZtdmducHhieG1jam9wcXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzY3MzksImV4cCI6MjEwNjc1MjczOX0.IKVaTqz1e7stm_M-dbkvRmuzwU2DTXVcy-YSlzSQkRo';

  async function ladeErfolge(limit, sportart) {
    let url = `${SUPABASE_URL}/rest/v1/achievements?select=id,title,sport_id,event_date,result_text,article_text,short_info,placement,medal,level&status=in.(Freigegeben,Ver%C3%B6ffentlicht)&deleted_at=is.null&order=event_date.desc&limit=${limit}`;
    if (sportart) url += `&sport_id=eq.${encodeURIComponent(sportart)}`;

    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) throw new Error('Fehler beim Laden');
    return res.json();
  }

  async function ladeBild(erfolgId) {
    const url = `${SUPABASE_URL}/rest/v1/achievement_media?achievement_id=eq.${erfolgId}&select=storage_path,alt_text&limit=1`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]?.storage_path) return null;

    // Versuche zuerst Public URL (wenn Bucket öffentlich)
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/achievement-media/${data[0].storage_path}`;
    try {
      const check = await fetch(publicUrl, { method: 'HEAD' });
      if (check.ok) return publicUrl;
    } catch(_) {}

    // Fallback: Signed URL (für privaten Bucket)
    try {
      const encodedPath = data[0].storage_path.split('/').map(encodeURIComponent).join('/');
      const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/achievement-media/${encodedPath}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiresIn: 3600 })
      });
      if (!signRes.ok) return null;
      const signData = await signRes.json();
      const path = signData?.signedURL || signData?.signedUrl || signData?.data?.signedUrl;
      if (!path) return null;
      return path.startsWith('http') ? path : `${SUPABASE_URL}/storage/v1${path}`;
    } catch(_) { return null; }
  }

  async function ladeAthlet(erfolgId) {
    const url = `${SUPABASE_URL}/rest/v1/achievement_participants?achievement_id=eq.${erfolgId}&select=participant_role&limit=5`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) return '';
    const data = await res.json();
    return (data||[]).map(b => b.participant_role).filter(Boolean).join(', ');
  }

  const MI = { Gold: '🥇', Silber: '🥈', Bronze: '🥉' };

  const SPORTART_FARBEN = {
    'SP01':'linear-gradient(135deg,#1a3a6b,#E2001A)', // Basketball
    'SP02':'linear-gradient(135deg,#0a4a2a,#f5a623)', // Beachvolleyball
    'SP03':'linear-gradient(135deg,#1a3a6b,#2ecc71)', // Bogenschießen
    'SP04':'linear-gradient(135deg,#7b0000,#E2001A)', // Boxen
    'SP05':'linear-gradient(135deg,#003366,#0099cc)', // Eishockey
    'SP06':'linear-gradient(135deg,#003366,#9b59b6)', // Eiskunstlauf
    'SP07':'linear-gradient(135deg,#003366,#1abc9c)', // Eisschnelllauf
    'SP08':'linear-gradient(135deg,#2c3e50,#e74c3c)', // Gewichtheben
    'SP09':'linear-gradient(135deg,#1a3a6b,#e67e22)', // Handball
    'SP10':'linear-gradient(135deg,#1a0a2e,#e74c3c)', // Judo
    'SP11':'linear-gradient(135deg,#1a3a6b,#27ae60)', // Leichtathletik
    'SP12':'linear-gradient(135deg,#003366,#0099ff)', // Para-Schwimmen
    'SP13':'linear-gradient(135deg,#1a2a1a,#f39c12)', // Radsport
    'SP14':'linear-gradient(135deg,#003366,#0099ff)', // Schwimmen
    'SP15':'linear-gradient(135deg,#1a0a2e,#e74c3c)', // Turnen
    'SP16':'linear-gradient(135deg,#0a4a2a,#f5a623)', // Volleyball
    'SP17':'linear-gradient(135deg,#003366,#0099ff)', // Wasserspringen
    'SP18':'linear-gradient(135deg,#1a3a6b,#27ae60)', // Fußball
  };
  const SPORTART_EMOJIS = {
    'SP01':'🏀','SP02':'🏐','SP03':'🏹','SP04':'🥊','SP05':'🏒',
    'SP06':'⛸️','SP07':'⛸️','SP08':'🏋️','SP09':'🤾','SP10':'🥋',
    'SP11':'🏃','SP12':'🏊','SP13':'🚴','SP14':'🏊','SP15':'🤸',
    'SP16':'🏐','SP17':'🤽','SP18':'⚽',
  };
  function getSportartFarbe(id) { return SPORTART_FARBEN[id] || 'linear-gradient(135deg,#003366,#E2001A)'; }
  function getSportartEmoji(id) { return SPORTART_EMOJIS[id] || '🏅'; }

  function formatDatum(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function injectStyles(theme) {
    if (document.getElementById('slzb-widget-styles')) return;
    const dark = theme === 'dark';
    const style = document.createElement('style');
    style.id = 'slzb-widget-styles';
    style.textContent = `
      .slzb-widget { font-family: 'Segoe UI', Arial, sans-serif; }
      .slzb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
      .slzb-card {
        background: ${dark ? '#1B1C1F' : '#fff'};
        border: 1px solid ${dark ? '#2A2C31' : '#e5e7eb'};
        border-radius: 12px; overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,${dark ? '0.3' : '0.08'});
        transition: transform .2s, box-shadow .2s;
        cursor: pointer;
      }
      .slzb-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,${dark ? '0.4' : '0.15'}); }
      .slzb-card-img { width: 100%; height: 200px; object-fit: cover; object-position: center 20%; display: block; background: ${dark ? '#2A2C31' : '#f3f4f6'}; transition: object-position .3s; }
      .slzb-card-img:hover { object-position: center 40%; }
      .slzb-card-img-placeholder { width: 100%; height: 200px; background: linear-gradient(135deg, #003366, #E2001A); display: flex; align-items: center; justify-content: center; font-size: 3rem; }
      .slzb-card-body { padding: 16px; }
      .slzb-card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
      .slzb-badge { background: #E2001A; color: #fff; font-size: .7rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; letter-spacing: .05em; }
      .slzb-badge-gold { background: #C9A227; }
      .slzb-badge-silber { background: #8A9BB0; }
      .slzb-badge-bronze { background: #C2783A; }
      .slzb-date { color: ${dark ? '#8A9BB0' : '#6b7280'}; font-size: .78rem; }
      .slzb-card-title { font-size: 1rem; font-weight: 700; color: ${dark ? '#fff' : '#111'}; margin: 0 0 6px; line-height: 1.3; }
      .slzb-card-athlet { color: ${dark ? '#C9CCD2' : '#374151'}; font-size: .85rem; margin-bottom: 6px; }
      .slzb-card-text { color: ${dark ? '#8A9BB0' : '#6b7280'}; font-size: .82rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .slzb-footer { text-align: center; margin-top: 20px; }
      .slzb-footer a { color: #E2001A; font-size: .8rem; text-decoration: none; font-weight: 600; }
      .slzb-loading { text-align: center; padding: 40px; color: ${dark ? '#8A9BB0' : '#6b7280'}; }
      .slzb-spinner { width: 32px; height: 32px; border: 3px solid ${dark ? '#2A2C31' : '#e5e7eb'}; border-top-color: #E2001A; border-radius: 50%; animation: slzb-spin .8s linear infinite; margin: 0 auto 12px; }
      @keyframes slzb-spin { to { transform: rotate(360deg); } }
      @media (max-width: 600px) { .slzb-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  async function render(container) {
    const limit = parseInt(container.dataset.limit || '6');
    const sportart = container.dataset.sportart || '';
    const theme = container.dataset.theme || 'light';
    const appUrl = container.dataset.appUrl || 'https://pfeiffse.github.io/slzb-erfolge/slzb-v3/';

    injectStyles(theme);

    container.innerHTML = `<div class="slzb-widget"><div class="slzb-loading"><div class="slzb-spinner"></div>Lade Sportnews...</div></div>`;

    try {
      const erfolge = await ladeErfolge(limit, sportart);
      if (!erfolge.length) {
        container.innerHTML = '<div class="slzb-widget"><p style="color:#6b7280;text-align:center">Keine Meldungen vorhanden.</p></div>';
        return;
      }

      // Bilder + Athleten parallel laden
      const [bilder, athleten] = await Promise.all([
        Promise.all(erfolge.map(e => ladeBild(e.id).catch(() => null))),
        Promise.all(erfolge.map(e => ladeAthlet(e.id).catch(() => '')))
      ]);

      const karten = erfolge.map((e, i) => {
        const bild = bilder[i];
        const athlet = athleten[i];
        const text = e.article_text || e.result_text || e.short_info || '';
        const medaille = e.medal && e.medal !== 'keine' ? e.medal : null;
        const medBadge = medaille ? `<span class="slzb-badge slzb-badge-${medaille.toLowerCase()}">${MI[medaille]||''} ${esc(medaille)}</span>` : '';
        const platzBadge = e.placement ? `<span class="slzb-badge">${e.placement}. Platz</span>` : '';

        return `
          <div class="slzb-card">
            ${bild
              ? `<img class="slzb-card-img" src="${esc(bild)}" alt="${esc(e.title)}" loading="lazy"
                  style="object-position: center 20%"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
              : ''}
            <div class="slzb-card-img-placeholder" style="${bild ? 'display:none' : ''};background:${getSportartFarbe(e.sport_id)}">
            <span style="font-size:2.5rem">${getSportartEmoji(e.sport_id)}</span>
          </div>
            <div class="slzb-card-body">
              <div class="slzb-card-meta">
                ${medBadge}${platzBadge}
                <span class="slzb-date">📅 ${formatDatum(e.event_date)}</span>
              </div>
              <h3 class="slzb-card-title">${esc(e.title)}</h3>
              ${athlet ? `<div class="slzb-card-athlet">👤 ${esc(athlet)}</div>` : ''}
              ${text ? `<p class="slzb-card-text">${esc(text)}</p>` : ''}
            </div>
          </div>`;
      }).join('');

      container.innerHTML = `
        <div class="slzb-widget">
          <div class="slzb-grid">${karten}</div>
          <div class="slzb-footer">
            <a href="${esc(appUrl)}" target="_blank">Alle Sportnews auf SLZB-Erfolge →</a>
          </div>
        </div>`;
    } catch(err) {
      container.innerHTML = `<div class="slzb-widget"><p style="color:#E2001A;text-align:center">Fehler beim Laden: ${esc(err.message)}</p></div>`;
    }
  }

  // Auto-Init: alle Container mit id="slzb-sportnews" oder class="slzb-sportnews"
  function init() {
    const containers = [
      ...document.querySelectorAll('#slzb-sportnews'),
      ...document.querySelectorAll('.slzb-sportnews')
    ];
    containers.forEach(c => render(c));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Globale API für manuelle Nutzung
  window.SLZBWidget = { render };
})();
