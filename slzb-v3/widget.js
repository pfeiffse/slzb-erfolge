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
    const url = `${SUPABASE_URL}/rest/v1/achievement_media?achievement_id=eq.${erfolgId}&select=storage_path,alt_text,creator,caption&limit=1`;
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
      if (check.ok) return { url: publicUrl, creator: data[0].creator||'', caption: data[0].caption||'' };
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
      const signedUrl = path.startsWith('http') ? path : `${SUPABASE_URL}/storage/v1${path}`;
      return { url: signedUrl, creator: data[0].creator||'', caption: data[0].caption||'' };
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
      .slzb-card { cursor: pointer; }
      .slzb-lightbox {
        position: fixed; inset: 0; background: rgba(0,0,0,0.92);
        z-index: 99999; display: flex; align-items: center; justify-content: center;
        padding: 20px; animation: slzb-fadein .2s ease;
      }
      @keyframes slzb-fadein { from { opacity:0 } to { opacity:1 } }
      .slzb-lightbox-inner {
        position: relative; max-width: 900px; width: 100%;
        background: #1B1C1F; border-radius: 16px; overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,.6);
      }
      .slzb-lightbox-img {
        width: 100%; max-height: 70vh; object-fit: contain;
        display: block; background: #000;
      }
      .slzb-lightbox-body { padding: 16px 20px; }
      .slzb-lightbox-title { color: #fff; font-size: 1.1rem; font-weight: 700; margin-bottom: 6px; }
      .slzb-lightbox-meta { color: rgba(255,255,255,0.5); font-size: .82rem; margin-bottom: 8px; }
      .slzb-lightbox-text { color: rgba(255,255,255,0.7); font-size: .85rem; line-height: 1.5; }
      .slzb-lightbox-close {
        position: absolute; top: 12px; right: 12px;
        background: rgba(0,0,0,0.6); border: none; color: #fff;
        width: 36px; height: 36px; border-radius: 50%; font-size: 1.1rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        z-index: 1;
      }
      .slzb-lightbox-close:hover { background: rgba(226,0,26,0.8); }
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
    // data-img-position: top=20%, center=50%, bottom=80%
    const imgPosMap = { top: '20%', center: '50%', bottom: '80%' };
    const imgPos = imgPosMap[container.dataset.imgPosition] || '20%';

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
              ? `<img class="slzb-card-img" src="${esc(bild.url||bild)}" alt="${esc(e.title)}" loading="lazy"
                  style="object-position: center ${imgPos}"
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

      // Lightbox: Klick auf Karte öffnet Vollbild
      container.querySelectorAll('.slzb-card').forEach((card, i) => {
        card.addEventListener('click', () => {
          const e = erfolge[i];
          const bild = bilder[i];
          const athlet = athleten[i];
          const text = e.article_text || e.result_text || e.short_info || '';
          const medaille = e.medal && e.medal !== 'keine' ? e.medal : null;
          const platzStr = e.placement ? `${e.placement}. Platz` : '';
          const medStr = medaille ? `${MI[medaille]||''} ${medaille}` : '';

          const lb = document.createElement('div');
          lb.className = 'slzb-lightbox';
          lb.innerHTML = `
            <div class="slzb-lightbox-inner">
              <button class="slzb-lightbox-close" onclick="this.closest('.slzb-lightbox').remove()">✕</button>
              ${bild ? `<img class="slzb-lightbox-img" src="${esc(bild.url||bild)}" alt="${esc(e.title)}">` : ''}
              <div class="slzb-lightbox-body">
                <div class="slzb-lightbox-meta">
                  ${medStr ? `<span style="margin-right:8px">${medStr}</span>` : ''}
                  ${platzStr ? `<span style="margin-right:8px">${platzStr}</span>` : ''}
                  <span>📅 ${formatDatum(e.event_date)}</span>
                  ${athlet ? `<span style="margin-left:8px">👤 ${esc(athlet)}</span>` : ''}
                </div>
                <div class="slzb-lightbox-title">${esc(e.title)}</div>
                ${text ? `<div class="slzb-lightbox-text" style="margin-bottom:10px">${esc(text)}</div>` : ''}
                <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:10px;margin-top:4px;display:flex;flex-wrap:wrap;gap:8px">
                  ${e.level ? `<span style="color:rgba(255,255,255,.4);font-size:.75rem">📍 ${esc(e.level)}</span>` : ''}
                  ${(bild && (bild.creator||bild.caption)) ? `
                    ${bild.caption ? `<span style="color:rgba(255,255,255,.4);font-size:.75rem">💬 ${esc(bild.caption)}</span>` : ''}
                    ${bild.creator ? `<span style="color:rgba(255,255,255,.35);font-size:.72rem">📸 ${esc(bild.creator)}</span>` : ''}
                  ` : ''}
                </div>
              </div>
            </div>`;
          lb.addEventListener('click', ev => { if (ev.target === lb) lb.remove(); });
          document.body.appendChild(lb);
        });
      });
    } catch(err) {
      container.innerHTML = `<div class="slzb-widget"><p style="color:#E2001A;text-align:center">Fehler beim Laden: ${esc(err.message)}</p></div>`;
    }
  }


  // ── Abstimmungs-Widget (Sportler des Monats) ─────────────────
  async function ladeAktiveAbstimmung() {
    const url = `${SUPABASE_URL}/rest/v1/voting_campaigns?select=id,titel,monat,end_at,status&status=eq.aktiv&order=erstellt_am.desc&limit=1`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  }

  async function ladeKandidaten(kampagneId) {
    const url = `${SUPABASE_URL}/rest/v1/voting_candidates?campaign_id=eq.${kampagneId}&select=id,name,sportart,erfolg,bild_url,klasse&order=reihenfolge`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) return [];
    return res.json();
  }

  async function ladeStimmen(kampagneId) {
    const url = `${SUPABASE_URL}/rest/v1/voting_votes?campaign_id=eq.${kampagneId}&select=candidate_id`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    (data||[]).forEach(v => { map[v.candidate_id] = (map[v.candidate_id]||0) + 1; });
    return map;
  }

  async function renderVoting(container) {
    const theme = container.dataset.theme || 'light';
    const voteUrl = container.dataset.voteUrl || '';
    const dark = theme === 'dark';

    injectStyles(theme);
    // Voting-spezifische Styles
    if (!document.getElementById('slzb-voting-styles')) {
      const s = document.createElement('style');
      s.id = 'slzb-voting-styles';
      s.textContent = `
        .slzb-voting { font-family: 'Segoe UI', Arial, sans-serif; }
        .slzb-voting-header { margin-bottom: 16px; }
        .slzb-voting-title { font-size: 1.2rem; font-weight: 800; color: ${dark?'#fff':'#003366'}; margin-bottom: 4px; }
        .slzb-voting-subtitle { font-size: .82rem; color: ${dark?'#8A9BB0':'#6b7280'}; }
        .slzb-voting-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .slzb-kandidat {
          background: ${dark?'#1B1C1F':'#fff'};
          border: 2px solid ${dark?'#2A2C31':'#e5e7eb'};
          border-radius: 12px; overflow: hidden; cursor: pointer;
          transition: transform .2s, box-shadow .2s, border-color .2s;
        }
        .slzb-kandidat:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.15); border-color: #E2001A; }
        .slzb-kandidat-img { width: 100%; height: 180px; object-fit: cover; object-position: center 20%; display: block; background: ${dark?'#2A2C31':'#f3f4f6'}; }
        .slzb-kandidat-placeholder { width: 100%; height: 180px; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: linear-gradient(135deg,#003366,#E2001A); }
        .slzb-kandidat-body { padding: 12px; }
        .slzb-kandidat-name { font-weight: 800; font-size: .95rem; color: ${dark?'#fff':'#111'}; margin-bottom: 3px; }
        .slzb-kandidat-sport { color: #E2001A; font-size: .75rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; margin-bottom: 6px; }
        .slzb-kandidat-erfolg { color: ${dark?'#C9CCD2':'#374151'}; font-size: .8rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .slzb-vote-btn {
          display: block; width: 100%; margin-top: 10px;
          background: #E2001A; color: #fff; border: none; border-radius: 8px;
          padding: 8px; font-size: .82rem; font-weight: 700; cursor: pointer;
          text-align: center; text-decoration: none; transition: background .15s;
        }
        .slzb-vote-btn:hover { background: #c0001a; }
        .slzb-voting-footer { text-align: center; margin-top: 16px; }
        .slzb-voting-footer a { color: #E2001A; font-size: .8rem; text-decoration: none; font-weight: 600; }
        .slzb-deadline { color: #E2001A; font-size: .78rem; font-weight: 600; margin-top: 4px; }
        /* Lightbox für Kandidaten */
        .slzb-kandidat-lb { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px; animation: slzb-fadein .2s ease; }
        .slzb-kandidat-lb-inner { position: relative; max-width: 600px; width: 100%; background: #1B1C1F; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
        .slzb-kandidat-lb-img { width: 100%; max-height: 60vh; object-fit: contain; display: block; background: #000; }
        .slzb-kandidat-lb-body { padding: 16px 20px; }
        .slzb-kandidat-lb-name { color: #fff; font-size: 1.2rem; font-weight: 800; margin-bottom: 4px; }
        .slzb-kandidat-lb-sport { color: #E2001A; font-size: .82rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
        .slzb-kandidat-lb-erfolg { color: rgba(255,255,255,.75); font-size: .88rem; line-height: 1.5; margin-bottom: 12px; }
        .slzb-kandidat-lb-close { position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,.6); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .slzb-kandidat-lb-close:hover { background: rgba(226,0,26,.8); }
      `;
      document.head.appendChild(s);
    }

    container.innerHTML = `<div class="slzb-voting"><div class="slzb-loading"><div class="slzb-spinner"></div>Lade Abstimmung...</div></div>`;

    try {
      const kampagne = await ladeAktiveAbstimmung();
      if (!kampagne) {
        container.innerHTML = `<div class="slzb-voting"><p style="color:${dark?'#8A9BB0':'#6b7280'};text-align:center">Aktuell läuft keine Abstimmung.</p></div>`;
        return;
      }

      const [kandidaten, stimmen] = await Promise.all([
        ladeKandidaten(kampagne.id),
        ladeStimmen(kampagne.id)
      ]);

      const gesamt = Object.values(stimmen).reduce((a,b)=>a+b,0);
      const endDatum = kampagne.end_at ? new Date(kampagne.end_at).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : '';
      const finalVoteUrl = voteUrl || `https://pfeiffse.github.io/slzb-erfolge/slzb-v3/vote.html`;

      const karten = kandidaten.map(k => {
        const bildUrl = k.bild_url || null;
        const anzStimmen = stimmen[k.id] || 0;
        const prozent = gesamt > 0 ? Math.round(anzStimmen/gesamt*100) : 0;
        return `
          <div class="slzb-kandidat" data-id="${esc(k.id)}" data-bild="${esc(bildUrl||'')}" data-name="${esc(k.name)}" data-sport="${esc(k.sportart||'')}" data-erfolg="${esc(k.erfolg||'')}" data-klasse="${esc(k.klasse||'')}">
            ${bildUrl
              ? `<img class="slzb-kandidat-img" src="${esc(bildUrl)}" alt="${esc(k.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
              : ''}
            <div class="slzb-kandidat-placeholder" style="${bildUrl?'display:none':''}">🏃</div>
            <div class="slzb-kandidat-body">
              <div class="slzb-kandidat-name">${esc(k.name)}</div>
              ${k.sportart ? `<div class="slzb-kandidat-sport">${esc(k.sportart)}</div>` : ''}
              ${k.erfolg ? `<div class="slzb-kandidat-erfolg">${esc(k.erfolg)}</div>` : ''}
              ${gesamt > 0 ? `<div style="margin-top:8px">
                <div style="background:${dark?'#2A2C31':'#f3f4f6'};border-radius:4px;height:6px;overflow:hidden">
                  <div style="background:#E2001A;height:100%;width:${prozent}%;transition:width .5s"></div>
                </div>
                <div style="font-size:.72rem;color:${dark?'#8A9BB0':'#6b7280'};margin-top:3px">${anzStimmen} Stimme${anzStimmen!==1?'n':''} (${prozent}%)</div>
              </div>` : ''}
              <a class="slzb-vote-btn" href="${esc(finalVoteUrl)}" target="_blank">👍 Jetzt abstimmen</a>
            </div>
          </div>`;
      }).join('');

      container.innerHTML = `
        <div class="slzb-voting">
          <div class="slzb-voting-header">
            <div class="slzb-voting-title">🏆 ${esc(kampagne.titel)}</div>
            ${endDatum ? `<div class="slzb-deadline">⏰ Abstimmung endet: ${endDatum}</div>` : ''}
          </div>
          <div class="slzb-voting-grid">${karten}</div>
          <div class="slzb-voting-footer">
            <a href="${esc(finalVoteUrl)}" target="_blank">Zur vollständigen Abstimmung →</a>
          </div>
        </div>`;

      // Lightbox: Klick auf Kandidat
      container.querySelectorAll('.slzb-kandidat').forEach(card => {
        card.addEventListener('click', (ev) => {
          if (ev.target.classList.contains('slzb-vote-btn')) return;
          const bild = card.dataset.bild;
          const name = card.dataset.name;
          const sport = card.dataset.sport;
          const erfolg = card.dataset.erfolg;
          const klasse = card.dataset.klasse;

          const lb = document.createElement('div');
          lb.className = 'slzb-kandidat-lb';
          lb.innerHTML = `
            <div class="slzb-kandidat-lb-inner">
              <button class="slzb-kandidat-lb-close" onclick="this.closest('.slzb-kandidat-lb').remove()">✕</button>
              ${bild ? `<img class="slzb-kandidat-lb-img" src="${esc(bild)}" alt="${esc(name)}">` : ''}
              <div class="slzb-kandidat-lb-body">
                <div class="slzb-kandidat-lb-name">${esc(name)}</div>
                ${sport ? `<div class="slzb-kandidat-lb-sport">${esc(sport)}${klasse?' · '+esc(klasse):''}</div>` : ''}
                ${erfolg ? `<div class="slzb-kandidat-lb-erfolg">${esc(erfolg)}</div>` : ''}
                <a class="slzb-vote-btn" href="${esc(finalVoteUrl)}" target="_blank">👍 Für ${esc(name.split(' ')[0])} abstimmen</a>
              </div>
            </div>`;
          lb.addEventListener('click', ev => { if (ev.target === lb) lb.remove(); });
          document.body.appendChild(lb);
        });
      });

    } catch(err) {
      container.innerHTML = `<div class="slzb-voting"><p style="color:#E2001A;text-align:center">Fehler: ${esc(err.message)}</p></div>`;
    }
  }

  // Auto-Init: alle Container mit id="slzb-sportnews" oder class="slzb-sportnews"
  function init() {
    const containers = [
      ...document.querySelectorAll('#slzb-sportnews'),
      ...document.querySelectorAll('.slzb-sportnews')
    ];
    containers.forEach(c => render(c));

    // Abstimmungs-Widget
    const votingContainers = [
      ...document.querySelectorAll('#slzb-abstimmung'),
      ...document.querySelectorAll('.slzb-abstimmung')
    ];
    votingContainers.forEach(c => renderVoting(c));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Globale API für manuelle Nutzung
  window.SLZBWidget = { render, renderVoting };
})();
