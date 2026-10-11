// ============================================================
// SLZB-Erfolge v3 – Poster-Generator (vollständig)
// ============================================================

const SLZB_COLORS = {
  bg:        '#1B1C1F',
  bgDark:    '#121315',
  red:       '#E2001A',
  blue:      '#003366',
  blueLight: '#0B63CE',
  white:     '#FFFFFF',
  gray1:     '#C9CCD2',
  gray2:     '#DDE0E4',
  gold:      '#E3B23C',
  silver:    '#BFC8D2',
  bronze:    '#C2783A',
  pinkLight: '#FFD2D6',
};

// ── Hilfsfunktionen ──────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// SLZB POSTER – HTML-DESIGN (Spieler des Jahres Stil)
// Gradient: schwarz oben → dunkelrot unten (wie HTML-Vorlage)
// ══════════════════════════════════════════════════════════════

// Gemeinsamer Hintergrund-Gradient (wie HTML: schwarz → dunkelrot)
// akzent: 'rot' (Standard), 'blau', 'gruen'
function zeichneSlzbHintergrund(ctx, W, H, bild, akzent='rot') {
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
  if (bild) {
    const scale = Math.max(W/bild.width, H/bild.height);
    const bW = bild.width*scale, bH = bild.height*scale;
    const bX = (W-bW)/2, bY = 0;
    ctx.drawImage(bild, bX, bY, bW, bH);
  }
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (akzent === 'blau') {
    grad.addColorStop(0,   'rgba(0,0,0,0.15)');
    grad.addColorStop(0.35,'rgba(0,0,0,0.20)');
    grad.addColorStop(0.65,'rgba(0,30,90,0.60)');
    grad.addColorStop(1,   'rgba(0,51,153,0.93)');
  } else if (akzent === 'gruen') {
    grad.addColorStop(0,   'rgba(0,0,0,0.15)');
    grad.addColorStop(0.35,'rgba(0,0,0,0.20)');
    grad.addColorStop(0.65,'rgba(0,80,30,0.60)');
    grad.addColorStop(1,   'rgba(0,120,50,0.93)');
  } else if (akzent === 'gold') {
    grad.addColorStop(0,   'rgba(0,0,0,0.15)');
    grad.addColorStop(0.35,'rgba(0,0,0,0.20)');
    grad.addColorStop(0.65,'rgba(80,55,0,0.60)');
    grad.addColorStop(1,   'rgba(130,85,0,0.93)');
  } else if (akzent === 'grau') {
    grad.addColorStop(0,   'rgba(0,0,0,0.15)');
    grad.addColorStop(0.35,'rgba(0,0,0,0.20)');
    grad.addColorStop(0.65,'rgba(40,50,65,0.60)');
    grad.addColorStop(1,   'rgba(20,30,50,0.93)');
  } else {
    // rot (Standard)
    grad.addColorStop(0,   'rgba(0,0,0,0.15)');
    grad.addColorStop(0.35,'rgba(0,0,0,0.20)');
    grad.addColorStop(0.65,'rgba(115,0,10,0.55)');
    grad.addColorStop(1,   'rgba(180,0,20,0.92)');
  }
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
}

// Obere Deko-Elemente (schräges Rechteck + Kreise)
function zeichneSlzbDeko(ctx, W, H) {
  // Schräges weißes Rechteck links
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#fff';
  ctx.translate(-Math.round(W*0.065), -Math.round(H*0.024));
  ctx.rotate(12 * Math.PI / 180);
  ctx.fillRect(0, 0, Math.round(W*0.13), Math.round(H*0.285));
  ctx.restore();
  // Kreis 1 rechts oben (groß)
  ctx.save(); ctx.globalAlpha=0.6; ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(W+Math.round(W*0.037), -Math.round(H*0.042), Math.round(W*0.088), 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // Kreis 2 rechts oben (klein)
  ctx.save(); ctx.globalAlpha=0.45; ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(W-Math.round(W*0.083), -Math.round(H*0.030), Math.round(W*0.069), 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// Header: Logo + rote Linie + Sportart + Datum
function zeichneSlzbHeader(ctx, W, H, sportart, datum, akzent='rot') {
  const pad = Math.round(W*0.026);
  const top = Math.round(H*0.021);
  const logoH = Math.round(H*0.076);
  const logoW = drawLogo(ctx, pad, top, logoH);
  const lineX = pad + logoW + Math.round(W*0.013);
  const akzentFarbe = akzent==='blau' ? '#0B63CE' : akzent==='gruen' ? '#00a040' : akzent==='gold' ? '#C9A227' : akzent==='grau' ? '#8A9BB0' : '#ff002f';
  ctx.fillStyle = akzentFarbe;
  ctx.fillRect(lineX, top+Math.round(H*0.002), 2, Math.round(H*0.038));
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${Math.round(H*0.026)}px Montserrat, Arial, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.letterSpacing = '2px';
  ctx.fillText((sportart||'SLZB').toUpperCase(), lineX+Math.round(W*0.013), top+Math.round(H*0.002));
  ctx.font = `700 ${Math.round(H*0.015)}px Montserrat, Arial, sans-serif`;
  ctx.fillText((datum||'').toUpperCase(), lineX+Math.round(W*0.013), top+Math.round(H*0.002)+Math.round(H*0.030));
  ctx.letterSpacing = '0px';
}

// Glasmorphismus-Karte mit Vorname/Nachname/Platz
function zeichneSlzbKarte(ctx, W, H, opts, akzent='rot') {
  // opts: { subtitle, vorname, nachname, platz, medaille, zusatz, wettbewerb }
  const cardPad = Math.round(W*0.030);
  const cardX = Math.round(W*0.026);
  const cardW = W - 2*cardX;
  const cardTop = Math.round(H*0.42);
  const FOOTER_H = Math.round(H*0.095); // Platz für Footer

  // ── Inhaltshöhe vorab berechnen (für dynamische Kartenhöhe) ──
  let _contentH = Math.round(H*0.045); // oberer Innenabstand
  if (opts.subtitle) _contentH += Math.round(H*0.030);
  if (opts.vorname)  _contentH += Math.round(H*0.062);
  if (opts.nachname) _contentH += Math.round(H*0.078);
  if (!opts.vorname && !opts.nachname && opts.titel) {
    const _w = opts.titel.toUpperCase().split(' ');
    const _zeilen = _w.length>3 ? 2 : 1;
    _contentH += _zeilen * (Math.round(H*0.072) + 8);
  }
  _contentH += Math.round(H*0.012); // Abstand vor Oval
  if (opts.platz || opts.wettbewerb) _contentH += Math.round(H*0.047) + Math.round(H*0.020);
  if (opts.zusatz) _contentH += Math.round(H*0.020);
  _contentH += Math.round(H*0.030); // unterer Innenabstand

  // Kartenhöhe: Inhalt + Mindesthöhe, aber nie über Footer
  const minCardH = Math.round(H*0.25);
  const maxCardH = H - cardTop - FOOTER_H;
  const cardH = Math.min(maxCardH, Math.max(minCardH, _contentH));

  // Glasmorphismus-Hintergrund (dynamische Höhe)
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  slzbRoundRect(ctx, cardX, cardTop, cardW, cardH, Math.round(W*0.017)); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  slzbRoundRect(ctx, cardX, cardTop, cardW, cardH, Math.round(W*0.017)); ctx.stroke();

  let y = cardTop + Math.round(H*0.045);
  const cx = W/2;

  // Subtitle (akzentfarbe, gesperrt)
  const _akzentFarbe = akzent==='blau' ? '#0B63CE' : akzent==='gruen' ? '#00a040' : akzent==='gold' ? '#C9A227' : akzent==='grau' ? '#8A9BB0' : '#ff163d';
  if (opts.subtitle) {
    ctx.fillStyle = _akzentFarbe;
    ctx.font = `800 ${Math.round(H*0.017)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.letterSpacing = '6px';
    ctx.fillText(opts.subtitle.toUpperCase(), cx, y);
    ctx.letterSpacing = '0px';
    y += Math.round(H*0.030);
  }

  // Vorname (weiß, groß, italic)
  if (opts.vorname) {
    ctx.fillStyle = '#fff';
    ctx.font = `800 italic ${Math.round(H*0.069)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(opts.vorname.toUpperCase(), cx, y, cardW-cardPad*2);
    y += Math.round(H*0.062);
  }

  // Nachname (akzentfarbe, größer, italic)
  if (opts.nachname) {
    ctx.fillStyle = akzent==='blau' ? '#1a7fff' : akzent==='gruen' ? '#00cc55' : akzent==='gold' ? '#e8b830' : akzent==='grau' ? '#a0b4cc' : '#ff0027';
    ctx.font = `900 italic ${Math.round(H*0.086)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(opts.nachname.toUpperCase(), cx, y, cardW-cardPad*2);
    y += Math.round(H*0.078);
  }

  // Wenn kein Vor/Nachname: Titel zweizeilig
  if (!opts.vorname && !opts.nachname && opts.titel) {
    const woerter = opts.titel.toUpperCase().split(' ');
    const mid = woerter.length>3 ? Math.ceil(woerter.length/2) : woerter.length;
    const tSz = Math.round(H*0.072);
    ctx.font = `800 italic ${tSz}px Montserrat, Arial, sans-serif`;
    ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(woerter.slice(0,mid).join(' '), cx, y, cardW-cardPad*2); y+=tSz+8;
    ctx.fillStyle = akzent==='blau' ? '#1a7fff' : akzent==='gruen' ? '#00cc55' : akzent==='gold' ? '#e8b830' : akzent==='grau' ? '#a0b4cc' : '#ff0027';
    if (woerter.slice(mid).length) { ctx.fillText(woerter.slice(mid).join(' '), cx, y, cardW-cardPad*2); y+=tSz+8; }
  }

  y += Math.round(H*0.012);

  // Info-Row: Goldenes Oval + Text
  if (opts.platz || opts.wettbewerb) {
    const mColor = opts.medaille ? medailleColor(opts.medaille) : '#efc54d';
    const ovalW=Math.round(W*0.067), ovalH=Math.round(H*0.047);
    const rowX = cx - Math.round(cardW*0.25);
    // Oval
    ctx.fillStyle = mColor;
    slzbRoundRect(ctx, rowX, y, ovalW, ovalH, ovalH/2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = `900 italic ${Math.round(H*0.024)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(opts.platz ? String(opts.platz) : '★', rowX+ovalW/2, y+ovalH/2);
    // Text rechts vom Oval
    const tx = rowX + ovalW + Math.round(W*0.017);
    ctx.fillStyle='#fff'; ctx.font=`800 italic ${Math.round(H*0.023)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='top';
    const pt = opts.platz===1?'1. PLATZ':opts.platz===2?'2. PLATZ':opts.platz===3?'3. PLATZ':opts.platz?`${opts.platz}. PLATZ`:'';
    ctx.fillText(pt||opts.wettbewerb||'', tx, y+Math.round(H*0.004), cardW-cardPad*2-ovalW-Math.round(W*0.017));
    if (opts.zusatz) {
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font=`700 ${Math.round(H*0.014)}px Montserrat, Arial, sans-serif`;
      ctx.letterSpacing='2px';
      ctx.fillText(opts.zusatz.toUpperCase(), tx, y+Math.round(H*0.004)+Math.round(H*0.028), cardW-cardPad*2-ovalW-Math.round(W*0.017));
      ctx.letterSpacing='0px';
    }
  }
}

// Footer: Schulname + Hashtag
function zeichneSlzbFooterNeu(ctx, W, H, akzent='rot') {
  const bot = Math.round(H*0.042);
  ctx.fillStyle='#fff'; ctx.font=`700 ${Math.round(H*0.021)}px Montserrat, Arial, sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, H-bot-Math.round(H*0.033));
  ctx.fillStyle='#fff'; ctx.font=`900 italic ${Math.round(H*0.033)}px Montserrat, Arial, sans-serif`;
  ctx.fillText('#SLZBerlin', W/2, H-bot);
}

function slzbRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function slzbWrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = []; let current = '';
  for (const word of words) {
    const test = current ? current+' '+word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current); current = word;
    } else { current = test; }
  }
  if (current) lines.push(current);
  return lines;
}

function medailleColor(m) {
  if (!m || m==='keine') return SLZB_COLORS.white;
  const ml = m.toLowerCase();
  if (ml==='gold') return SLZB_COLORS.gold;
  if (ml==='silber') return SLZB_COLORS.silver;
  if (ml==='bronze') return SLZB_COLORS.bronze;
  return SLZB_COLORS.white;
}

function medailleColorDruck(m) {
  if (!m || m==='keine') return SLZB_COLORS.blue;
  const ml = m.toLowerCase();
  if (ml==='gold') return '#B8860B';
  if (ml==='silber') return '#607080';
  if (ml==='bronze') return '#8B4513';
  return SLZB_COLORS.blue;
}

function platzLabel(platz, meldungsart) {
  if (platz===1) return meldungsart==='Teamerfolg' ? 'BUNDESSIEGER' : 'SIEGER';
  if (platz===2) return 'VIZE-BUNDESSIEGER';
  if (platz===3) return 'BRONZE';
  return '';
}

// ── Assets laden ─────────────────────────────────────────────
let _slzbLogo = null;
async function ladeLogo() {
  if (_slzbLogo) return _slzbLogo;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { _slzbLogo = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = 'slzb-logo.png';
  });
}


// Logo proportional zeichnen
function drawLogo(ctx, x, y, maxH) {
  if (!_slzbLogo) return 0;
  const ratio = _slzbLogo.width / _slzbLogo.height;
  const w = maxH * ratio;
  ctx.drawImage(_slzbLogo, x, y, w, maxH);
  return w;
}

async function ladeBild(url) {
  if (!url) return null;
  try {
    // Bild über fetch laden (nutzt Supabase Auth-Session, umgeht CORS)
    const response = await fetch(url, {
      headers: Backend.client ? {
        'Authorization': `Bearer ${(await Backend.session())?.access_token || ''}`,
        'apikey': window.SLZB_CONFIG?.supabaseAnonKey || '',
      } : {}
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { resolve(img); }
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
  } catch(e) {
    console.warn('Bild laden fehlgeschlagen:', e.message);
    // Fallback: direkt ohne Auth
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}

async function ladeMontserrat() {
  if (document.fonts) {
    try {
      await document.fonts.load('bold italic 60px Montserrat');
      await document.fonts.load('bold 60px Montserrat');
    } catch(e) {}
  }
}

// Bildformat ermitteln
function bildFormat(img) {
  if (!img) return 'none';
  const ratio = img.width / img.height;
  if (ratio > 1.4) return 'landscape'; // Querformat
  if (ratio < 0.8) return 'portrait';  // Hochformat
  return 'square';
}

// Bild cover-fit zeichnen
function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w/img.width, h/img.height);
  const sw = img.width*scale, sh = img.height*scale;
  ctx.drawImage(img, x+(w-sw)/2, y+(h-sh)/2, sw, sh);
}

// ── POSTER-GENERATOR (Social/Bildschirm) ─────────────────────
async function zeichneSLZBPoster(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  // Bild laden - mehrere Versuche
  let bild = null;
  if (hauptbild?.signedUrl) {
    bild = await ladeBild(hauptbild.signedUrl);
    console.log('[Poster] Bild geladen:', bild ? `${bild.width}x${bild.height}` : 'FEHLER');
  }
  const fmt = bildFormat(bild);
  console.log('[Poster] Format:', fmt);
  if (bild && fmt === 'landscape') await zeichnePosterLandscape(ctx, e, bild, hauptbild);
  else if (bild && fmt === 'portrait') await zeichnePosterPortrait(ctx, e, bild, hauptbild);
  else if (bild) await zeichnePosterPortrait(ctx, e, bild, hauptbild); // square → portrait-layout
  else await zeichnePosterKeinBild(ctx, e);
}

// Layout 1: Querformat-Bild → Bild oben, Text unten
async function zeichnePosterLandscape(ctx, e, bild, meta) {
  const W=1080, H=1350;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const datum = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  zeichneSlzbHintergrundMitFallback(ctx, W, H, bild, 'rot', sportart);
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, sportart, datum);
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  zeichneSlzbKarte(ctx, W, H, {
    subtitle: e.wettbewerbText || sportart,
    vorname: vorname || null, nachname,
    titel: teile.length===1 ? titel : null,
    platz, medaille,
    zusatz: [e.disziplin, e.ebene].filter(Boolean).join(' · '),
    wettbewerb: e.wettbewerbText,
  });
  zeichneSlzbFooterNeu(ctx, W, H);
}
// Layout 2: Hochformat-Bild → HTML-Design (Vollhintergrund)
async function zeichnePosterPortrait(ctx, e, bild, meta) {
  const W=1080, H=1350;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const datum = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  zeichneSlzbHintergrundMitFallback(ctx, W, H, bild, 'rot', sportart);
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, sportart, datum);
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  zeichneSlzbKarte(ctx, W, H, {
    subtitle: e.wettbewerbText || sportart,
    vorname: vorname || null, nachname,
    titel: teile.length===1 ? titel : null,
    platz, medaille,
    zusatz: [e.disziplin, e.ebene].filter(Boolean).join(' · '),
    wettbewerb: e.wettbewerbText,
  });
  zeichneSlzbFooterNeu(ctx, W, H);
}
// Layout 3: Kein Bild → HTML-Design ohne Foto
async function zeichnePosterKeinBild(ctx, e) {
  const W=1080, H=1350;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const datum = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

  zeichneSlzbHintergrundMitFallback(ctx, W, H, null, 'rot', sportart); // kein Bild → Ersatzbild
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, sportart, datum);

  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;

  zeichneSlzbKarte(ctx, W, H, {
    subtitle: e.wettbewerbText || sportart,
    vorname: vorname || null,
    nachname: nachname,
    titel: teile.length===1 ? titel : null,
    platz, medaille,
    zusatz: [e.disziplin, e.ebene].filter(Boolean).join(' · '),
    wettbewerb: e.wettbewerbText,
  });
  zeichneSlzbFooterNeu(ctx, W, H);
}

// Gemeinsamer Textbereich
function zeichneTextbereich(ctx, e, W, H, startY, mColor, sportart, platz, medaille, titel) {
  let y = startY + 20;

  // Kategorie
  ctx.fillStyle = SLZB_COLORS.red;
  ctx.font = 'bold 22px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(sportart.toUpperCase(), W/2, y); y += 36;

  // Titel zweizeilig
  const woerter = titel.toUpperCase().split(' ');
  const mid = Math.ceil(woerter.length/2);
  ctx.font = 'bold italic 68px Montserrat, Arial, sans-serif';
  ctx.fillStyle = SLZB_COLORS.white;
  ctx.fillText(woerter.slice(0,mid).join(' '), W/2, y, W-80); y += 78;
  ctx.fillStyle = SLZB_COLORS.red;
  if (woerter.slice(mid).length) {
    ctx.fillText(woerter.slice(mid).join(' '), W/2, y, W-80); y += 78;
  }

  // Platzierung
  if (platz) {
    const ovalW=110, ovalH=56, ovalX=W/2-ovalW/2-70, ovalY=y;
    ctx.fillStyle = mColor;
    slzbRoundRect(ctx, ovalX, ovalY, ovalW, ovalH, 28); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2;
    slzbRoundRect(ctx, ovalX, ovalY, ovalW, ovalH, 28); ctx.stroke();
    ctx.fillStyle = SLZB_COLORS.bgDark;
    ctx.font='bold italic 34px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), ovalX+ovalW/2, ovalY+ovalH/2);

    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    const pl = platzLabel(platz, e.meldungsart);
    ctx.fillStyle=SLZB_COLORS.white;
    ctx.font='bold italic 30px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(pt, ovalX+ovalW+18, ovalY+4);
    if (pl) {
      ctx.fillStyle=mColor; ctx.font='bold 14px Montserrat, Arial, sans-serif';
      ctx.fillText(pl, ovalX+ovalW+18, ovalY+38);
    }
    y += 80;
  }

  // Ergebnis
  if (e.ergebnisWert || e.ergebnisText) {
    const erg = e.ergebnisWert ? `${e.ergebnisWert} ${e.ergebnisEinheit||''}` : e.ergebnisText;
    ctx.fillStyle=SLZB_COLORS.gray1; ctx.font='20px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(erg, W/2, y); y += 32;
  }

  // Datum + Ort
  const datumStr = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const ortStr = [datumStr, e.ort, e.ebene].filter(Boolean).join(' · ');
  if (ortStr) {
    ctx.fillStyle='rgba(201,204,210,0.8)'; ctx.font='16px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(ortStr, W/2, y); y += 28;
  }

  // Kurzinfo
  if (e.kurzinfo) {
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='18px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top';
    const zeilen = slzbWrapText(ctx, e.kurzinfo, W-120);
    zeilen.slice(0,2).forEach(z => { ctx.fillText(z, W/2, y); y+=26; });
  }
}

// Kopfzeile (dunkel, mit Logo proportional)
function zeichneKopfzeile(ctx, wettbewerb, disziplin) {
  let logoW = 0;
  if (_slzbLogo) {
    logoW = drawLogo(ctx, 20, 15, 70) + 10;
  } else {
    ctx.fillStyle = SLZB_COLORS.red;
    slzbRoundRect(ctx, 20, 20, 110, 60, 6); ctx.fill();
    ctx.fillStyle = SLZB_COLORS.white;
    ctx.font='bold 24px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('SLZB', 75, 50);
    logoW = 120;
  }
  const lineX = 20 + logoW + 10;
  ctx.fillStyle = SLZB_COLORS.red; ctx.fillRect(lineX, 28, 3, 49);
  ctx.font='bold 17px Montserrat, Arial, sans-serif';
  ctx.fillStyle=SLZB_COLORS.white; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText((wettbewerb||'SLZB BERLIN').toUpperCase(), lineX+12, 24);
  ctx.font='bold 10.5px Montserrat, Arial, sans-serif';
  ctx.fillStyle=SLZB_COLORS.red;
  ctx.fillText((disziplin||'SCHUL- UND LEISTUNGSSPORTZENTRUM BERLIN').toUpperCase(), lineX+14, 54);
}

// Fußzeile – kein eigener Hintergrund, liegt auf dem Fade
function zeichneFusszeile(ctx, W, H) {
  // Kein fillRect – Fade läuft nahtlos bis ganz unten
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 18px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, H-68);
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect((W-360)/2, H-38, 360, 2);
  ctx.font='bold italic 28px Montserrat, Arial, sans-serif';
  ctx.fillStyle=SLZB_COLORS.white; ctx.textAlign='center'; ctx.textBaseline='top';
  const hw = ctx.measureText('#SLZB').width;
  const total = ctx.measureText('#SLZBerlin').width;
  ctx.fillText('#SLZB', W/2 - total/2 + hw/2, H-32);
  ctx.fillStyle=SLZB_COLORS.pinkLight; ctx.textAlign='left';
  ctx.fillText('erlin', W/2 - total/2 + hw, H-32);
}

// PNG-Export
function exportPosterPNG(e, canvasId='social-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) { toast('Canvas nicht gefunden','danger'); return; }
  const dateiname = `SLZB_Poster_${e.erfolgNr||'ERF'}_${new Date().toISOString().slice(0,10)}.png`;
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=dateiname; a.click();
    URL.revokeObjectURL(url);
    toast(`PNG: ${dateiname}`,'success');
  }, 'image/png');
}

// ── A3 DRUCKFREUNDLICH (3 Layouts) ───────────────────────────
async function zeichneA3Druckfreundlich(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  await ladeMontserrat(); await ladeLogo();
  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  let bild = null;
  if (hauptbild?.signedUrl) {
    bild = await ladeBild(hauptbild.signedUrl);
    console.log('[A3] Bild geladen:', bild ? `${bild.width}x${bild.height}` : 'FEHLER');
  }
  const fmt = bildFormat(bild);
  console.log('[A3] Format:', fmt);
  if (bild && fmt==='landscape') await zeichneA3Landscape(canvas, e, bild, hauptbild);
  else if (bild) await zeichneA3Portrait(canvas, e, bild, hauptbild);
  else await zeichneA3KeinBild(canvas, e);
}

// A3 Layout A: Querformat-Bild → Bild oben 55%, Text unten
async function zeichneA3Landscape(canvas, e, bild, meta) {
  const W=1587, H=1123;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColorDruck(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);

  // Blauer Header
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect(0,0,W,90);
  if (_slzbLogo) ctx.drawImage(_slzbLogo, 20, 8, 115, 74);
  ctx.fillStyle='#fff'; ctx.font='bold 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, 45);
  ctx.font='bold italic 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='right'; ctx.fillText('#SLZBerlin', W-30, 45);
  // Datum links im Header
  const _datumA3L = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  if (_datumA3L) {
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='13px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.fillText(_datumA3L, 20+115+20, 45);
  }

  // Bild oben (55%)
  const fotoH = Math.round((H-90-60)*0.55);
  ctx.save(); ctx.beginPath(); ctx.rect(0,90,W,fotoH); ctx.clip();
  drawCover(ctx, bild, 0, 90, W, fotoH); ctx.restore();

  // Textbereich
  let y = 90+fotoH+20;
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 14px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(sportart.toUpperCase(), W/2, y); y+=22;
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect((W-80)/2, y, 80, 3); y+=12;

  const woerter = titel.toUpperCase().split(' ');
  const mid = Math.ceil(woerter.length/2);
  ctx.font='bold italic 64px Montserrat, Arial, sans-serif';
  ctx.fillStyle=SLZB_COLORS.blue;
  ctx.fillText(woerter.slice(0,mid).join(' '), W/2, y, W-100); y+=72;
  ctx.fillStyle=SLZB_COLORS.red;
  if (woerter.slice(mid).length) { ctx.fillText(woerter.slice(mid).join(' '), W/2, y, W-100); y+=72; }

  if (platz) {
    const ovalW=100, ovalH=50, ovalX=W/2-ovalW/2-70, ovalY=y;
    ctx.fillStyle=mColor; slzbRoundRect(ctx,ovalX,ovalY,ovalW,ovalH,25); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold italic 30px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), ovalX+ovalW/2, ovalY+ovalH/2);
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle=SLZB_COLORS.blue; ctx.font='bold italic 26px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(pt, ovalX+ovalW+16, ovalY+8);
  }

  zeichneA3Footer(ctx, W, H, meta, e._qrUrl||null);
}

// A3 Layout B: Hochformat-Bild → Bild links, Text rechts
async function zeichneA3Portrait(canvas, e, bild, meta) {
  const W=1587, H=1123;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColorDruck(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect(0,0,W,90);
  if (_slzbLogo) ctx.drawImage(_slzbLogo, 20, 8, 115, 74);
  ctx.fillStyle='#fff'; ctx.font='bold 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, 45);
  ctx.font='bold italic 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='right'; ctx.fillText('#SLZBerlin', W-30, 45);

  // Bild links (45%)
  const fotoW = Math.round(W*0.45);
  const fotoH = H-90-60;
  ctx.save(); ctx.beginPath(); ctx.rect(0,90,fotoW,fotoH); ctx.clip();
  drawCover(ctx, bild, 0, 90, fotoW, fotoH); ctx.restore();

  // Blauer Streifen als Trenner
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect(fotoW, 90, 6, fotoH);

  // Text rechts
  const tx = fotoW+40, tw = W-tx-40;
  let y = 130;
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 14px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(sportart.toUpperCase(), tx, y); y+=22;
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect(tx, y, 60, 3); y+=14;

  const woerter = titel.toUpperCase().split(' ');
  const mid = Math.ceil(woerter.length/2);
  ctx.font='bold italic 72px Montserrat, Arial, sans-serif';
  ctx.fillStyle=SLZB_COLORS.blue;
  ctx.fillText(woerter.slice(0,mid).join(' '), tx, y, tw); y+=82;
  ctx.fillStyle=SLZB_COLORS.red;
  if (woerter.slice(mid).length) { ctx.fillText(woerter.slice(mid).join(' '), tx, y, tw); y+=82; }

  if (platz) {
    const ovalW=100, ovalH=50, ovalX=tx, ovalY=y;
    ctx.fillStyle=mColor; slzbRoundRect(ctx,ovalX,ovalY,ovalW,ovalH,25); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold italic 30px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), ovalX+ovalW/2, ovalY+ovalH/2);
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle=SLZB_COLORS.blue; ctx.font='bold italic 26px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(pt, ovalX+ovalW+16, ovalY+8); y+=70;
  }

  if (e.kurzinfo) {
    ctx.fillStyle='#444'; ctx.font='16px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    const zeilen = slzbWrapText(ctx, e.kurzinfo, tw);
    zeilen.slice(0,4).forEach(z => { ctx.fillText(z, tx, y); y+=22; });
  }

  zeichneA3Footer(ctx, W, H, meta, e._qrUrl||null);
}

// A3 Layout C: Kein Bild → Volltext
async function zeichneA3KeinBild(canvas, e) {
  const W=1587, H=1123;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColorDruck(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect(0,0,W,90);
  if (_slzbLogo) ctx.drawImage(_slzbLogo, 20, 8, 115, 74);
  ctx.fillStyle='#fff'; ctx.font='bold 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, 45);
  ctx.font='bold italic 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='right'; ctx.fillText('#SLZBerlin', W-30, 45);

  // Große Platzierungszahl als Hintergrund
  if (platz) {
    ctx.save(); ctx.globalAlpha=0.05; ctx.fillStyle=mColor;
    ctx.font=`bold italic 700px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), W/2, H/2+30); ctx.restore();
  }

  let y = 160;
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 18px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(sportart.toUpperCase(), W/2, y); y+=28;
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect((W-100)/2, y, 100, 4); y+=18;

  const woerter = titel.toUpperCase().split(' ');
  const mid = Math.ceil(woerter.length/2);
  ctx.font='bold italic 96px Montserrat, Arial, sans-serif';
  ctx.fillStyle=SLZB_COLORS.blue;
  ctx.fillText(woerter.slice(0,mid).join(' '), W/2, y, W-120); y+=108;
  ctx.fillStyle=SLZB_COLORS.red;
  if (woerter.slice(mid).length) { ctx.fillText(woerter.slice(mid).join(' '), W/2, y, W-120); y+=108; }

  if (platz) {
    const ovalW=130, ovalH=65, ovalX=W/2-ovalW/2-90, ovalY=y;
    ctx.fillStyle=mColor; slzbRoundRect(ctx,ovalX,ovalY,ovalW,ovalH,32); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold italic 40px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), ovalX+ovalW/2, ovalY+ovalH/2);
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle=SLZB_COLORS.blue; ctx.font='bold italic 34px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(pt, ovalX+ovalW+20, ovalY+12);
  }

  zeichneA3Footer(ctx, W, H, null, e._qrUrl||null);
}

function zeichneA3Footer(ctx, W, H, meta, qrUrl=null) {
  ctx.fillStyle='#F0F0F0'; ctx.fillRect(0, H-60, W, 60);
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect(0, H-60, W, 3);
  ctx.fillStyle='#333'; ctx.font='13px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  let footer = 'Schul- und Leistungssportzentrum Berlin · #SLZBerlin';
  if (meta?.creator) footer += ` · Foto: ${meta.creator}`;
  // QR-Code rechts im Footer
  const qrSize = 52;
  const qrX = W - qrSize - 8;
  const qrY = H - qrSize - 4;
  if (qrUrl) {
    zeichneQRCode(ctx, qrX, qrY, qrSize, qrUrl, '#F0F0F0', '#003366');
    ctx.fillStyle='#666'; ctx.font='9px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(qrUrl.includes('instagram')?'Instagram':'Website', qrX+qrSize/2, qrY+qrSize+2);
    ctx.fillText(footer, (W-qrSize-16)/2, H-30);
  } else {
    ctx.fillText(footer, W/2, H-30);
  }
}

// ── SOCIAL MEDIA MULTI-FORMAT ─────────────────────────────────
async function zeichneSocialFormat(canvasId, e, format) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  await ladeMontserrat(); await ladeLogo();
  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;
  const fmt = bildFormat(bild);

  // Dimensionen je Format
  const dims = {
    beitrag: [1080, 1080],
    story:   [1080, 1920],
    reel:    [1080, 1920],
  };
  const [W, H] = dims[format] || [1080, 1080];
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');

  if (format==='story' || format==='reel') {
    await zeichneSocialStory(ctx, e, bild, hauptbild, W, H);
  } else {
    // Beitrag: Layout je Bildformat
    if (fmt==='landscape') await zeichneSocialBeitragLandscape(ctx, e, bild, hauptbild, W, H);
    else if (fmt==='portrait') await zeichneSocialBeitragPortrait(ctx, e, bild, hauptbild, W, H);
    else await zeichneSocialBeitragKeinBild(ctx, e, W, H);
  }
}

// Social Beitrag: Querformat-Bild
async function zeichneSocialBeitragLandscape(ctx, e, bild, meta, W, H) {
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const datum = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  zeichneSlzbHintergrundMitFallback(ctx, W, H, bild, 'rot', sportart);
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, sportart, datum);
  zeichneSlzbKarte(ctx, W, H, { subtitle: e.wettbewerbText||sportart, vorname: vorname||null, nachname, titel: teile.length===1?titel:null, platz, medaille, zusatz:[e.disziplin,e.ebene].filter(Boolean).join(' · '), wettbewerb:e.wettbewerbText });
  zeichneSlzbFooterNeu(ctx, W, H);
}

// Social Beitrag: Hochformat-Bild (Vollhintergrund)
async function zeichneSocialBeitragPortrait(ctx, e, bild, meta, W, H) {
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const datum = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  zeichneSlzbHintergrundMitFallback(ctx, W, H, bild, 'rot', sportart);
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, sportart, datum);
  zeichneSlzbKarte(ctx, W, H, { subtitle: e.wettbewerbText||sportart, vorname: vorname||null, nachname, titel: teile.length===1?titel:null, platz, medaille, zusatz:[e.disziplin,e.ebene].filter(Boolean).join(' · '), wettbewerb:e.wettbewerbText });
  zeichneSlzbFooterNeu(ctx, W, H);
}

// Social Beitrag: Kein Bild
async function zeichneSocialBeitragKeinBild(ctx, e, W, H) {
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const datum = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  zeichneSlzbHintergrund(ctx, W, H, null);
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, sportart, datum);
  zeichneSlzbKarte(ctx, W, H, { subtitle: e.wettbewerbText||sportart, vorname: vorname||null, nachname, titel: teile.length===1?titel:null, platz, medaille, zusatz:[e.disziplin,e.ebene].filter(Boolean).join(' · '), wettbewerb:e.wettbewerbText });
  zeichneSlzbFooterNeu(ctx, W, H);
}

// Social Story/Reel (1080×1920) – gleiches Design, höheres Format
async function zeichneSocialStory(ctx, e, bild, meta, W, H) {
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const datum = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const teile = titel.trim().split(' ');
  const vorname = teile.length>1 ? teile.slice(0,-1).join(' ') : '';
  const nachname = teile.length>1 ? teile[teile.length-1] : titel;
  zeichneSlzbHintergrundMitFallback(ctx, W, H, bild, 'rot', sportart);
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, sportart, datum);
  zeichneSlzbKarte(ctx, W, H, { subtitle: e.wettbewerbText||sportart, vorname: vorname||null, nachname, titel: teile.length===1?titel:null, platz, medaille, zusatz:[e.disziplin,e.ebene].filter(Boolean).join(' · '), wettbewerb:e.wettbewerbText });
  zeichneSlzbFooterNeu(ctx, W, H);
}

// ── A3 VARIANTE 2: Split (Bild links, Text rechts) ───────────
async function zeichneA3Split(canvasId, e) {
  // Echtes Split-Layout: Bild links 55%, Text rechts – SLZB-Dunkelstil
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1587, H=1123;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const datum = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

  // Hintergrund (Basis-Funktion mit Fallback)
  zeichneSlzbHintergrundMitFallback(ctx, W, H, bild, 'rot', sportart);

  // Bild links 55%
  const FOTO_W = Math.round(W*0.55);
  if (bild) {
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,FOTO_W,H); ctx.clip();
    drawCover(ctx, bild, 0, 0, FOTO_W, H); ctx.restore();
    // Fade von ganz links der Bildkante nach rechts ins Bild
    const fg = ctx.createLinearGradient(FOTO_W-300, 0, FOTO_W+20, 0);
    fg.addColorStop(0,'rgba(27,28,31,0)');
    fg.addColorStop(1,'rgba(27,28,31,1)');
    ctx.fillStyle=fg; ctx.fillRect(FOTO_W-300, 0, 320, H);
    // Vignette oben/unten
    const fgT = ctx.createLinearGradient(0,0,0,100);
    fgT.addColorStop(0,'rgba(27,28,31,0.5)'); fgT.addColorStop(1,'rgba(27,28,31,0)');
    ctx.fillStyle=fgT; ctx.fillRect(0,0,FOTO_W,100);
    const fgB = ctx.createLinearGradient(0,H-100,0,H);
    fgB.addColorStop(0,'rgba(27,28,31,0)'); fgB.addColorStop(1,'rgba(27,28,31,0.6)');
    ctx.fillStyle=fgB; ctx.fillRect(0,H-100,FOTO_W,100);
  }

  // Header + Deko (Basis-Funktionen)
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, sportart, datum);

  // Text rechts
  const TX = FOTO_W + 50;
  const TW = W - TX - 50;
  const FOOTER_H = 60;
  const nutzH = H - 80 - FOOTER_H;
  const tSz = querTitelFontSize(titel, TW, ctx);
  const woerter = titel.toUpperCase().split(' ');
  const mid = woerter.length > 3 ? Math.ceil(woerter.length/2) : woerter.length;
  const z1 = woerter.slice(0,mid).join(' ');
  const z2 = woerter.slice(mid).join(' ');
  let blockH = 26+14 + tSz+12 + (z2?tSz+12:0) + (platz?70:0);
  let y = 80 + Math.round((nutzH - blockH)/2);
  if (y < 100) y = 100;

  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 20px Montserrat, Arial, sans-serif';
  ctx.fillText(sportart.toUpperCase(), TX, y); y+=26;
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect(TX, y, 80, 3); y+=14;
  ctx.font=`bold italic ${tSz}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle=SLZB_COLORS.white;
  ctx.fillText(z1, TX, y, TW); y+=tSz+12;
  if (z2) { ctx.fillStyle=SLZB_COLORS.red; ctx.fillText(z2, TX, y, TW); y+=tSz+12; }
  y+=8;
  if (platz) {
    const ow=110, oh=56;
    ctx.fillStyle=mColor; slzbRoundRect(ctx,TX,y,ow,oh,28); ctx.fill();
    ctx.fillStyle=SLZB_COLORS.bgDark; ctx.font=`bold italic 34px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), TX+ow/2, y+oh/2);
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle=SLZB_COLORS.white; ctx.font=`bold italic 28px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(pt, TX+ow+16, y+oh/2);
  }

  // Footer (Basis-Funktion)
  zeichneSlzbFooterNeu(ctx, W, H);
}

// ── A3 VARIANTE 3: Vollbild mit Overlay ──────────────────────
async function zeichneA3Vollbild(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1587, H=1123;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColorDruck(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  // Hintergrund
  ctx.fillStyle='#1B1C1F'; ctx.fillRect(0,0,W,H);

  // Vollbild-Foto
  if (bild) {
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip();
    drawCover(ctx, bild, 0, 0, W, H); ctx.restore();
    // Dunkles Overlay unten 40%
    const fadeGrad = ctx.createLinearGradient(0, H*0.55, 0, H);
    fadeGrad.addColorStop(0,'rgba(0,0,0,0)');
    fadeGrad.addColorStop(0.4,'rgba(0,0,30,0.7)');
    fadeGrad.addColorStop(1,'rgba(0,0,30,0.95)');
    ctx.fillStyle=fadeGrad; ctx.fillRect(0, H*0.55, W, H*0.45);
  }

  // Blauer Header (halbtransparent)
  ctx.fillStyle='rgba(0,51,102,0.88)'; ctx.fillRect(0,0,W,80);
  const lw = drawLogo(ctx, 16, 6, 68);
  ctx.fillStyle='rgba(226,0,26,1)'; ctx.fillRect(lw+26, 20, 3, 42);
  ctx.font='bold 18px Montserrat, Arial, sans-serif';
  ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText((e.wettbewerbText||'SLZB BERLIN').toUpperCase(), lw+38, 22);
  ctx.font='bold 11px Montserrat, Arial, sans-serif';
  ctx.fillStyle='#E2001A';
  ctx.fillText((e.disziplin||'SCHUL- UND LEISTUNGSSPORTZENTRUM BERLIN').toUpperCase(), lw+40, 50);
  ctx.font='bold italic 18px Montserrat, Arial, sans-serif';
  ctx.fillStyle='#fff'; ctx.textAlign='right';
  ctx.fillText('#SLZBerlin', W-20, 30);

  // Text unten links
  let y = H*0.20;
  ctx.fillStyle='#E2001A'; ctx.font='bold 16px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(sportart.toUpperCase(), 60, y); y+=24;
  ctx.fillStyle='rgba(226,0,26,0.8)'; ctx.fillRect(60, y, 60, 3); y+=14;

  const woerter = titel.toUpperCase().split(' ');
  const mid = Math.ceil(woerter.length/2);
  ctx.font='bold italic 80px Montserrat, Arial, sans-serif';
  ctx.fillStyle='#fff';
  ctx.fillText(woerter.slice(0,mid).join(' '), 60, y, W-120); y+=90;
  ctx.fillStyle='#E2001A';
  if (woerter.slice(mid).length) { ctx.fillText(woerter.slice(mid).join(' '), 60, y, W-120); y+=90; }

  if (platz) {
    const ovalW=110, ovalH=56, ovalX=60, ovalY=y;
    ctx.fillStyle=mColor; slzbRoundRect(ctx,ovalX,ovalY,ovalW,ovalH,28); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold italic 36px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), ovalX+ovalW/2, ovalY+ovalH/2);
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle='#fff'; ctx.font='bold italic 28px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(pt, ovalX+ovalW+16, ovalY+10);
  }

  // Footer
  ctx.fillStyle='rgba(0,51,102,0.85)'; ctx.fillRect(0, H-50, W, 50);
  ctx.fillStyle='#fff'; ctx.font='13px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin · #SLZBerlin', W/2, H-25);
}

// ── MULTI-BILD LAYOUTS ────────────────────────────────────────

// 2 Bilder: Collage (links groß, rechts klein oben+unten)
async function zeichnePoster2Bilder(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width=1080; canvas.height=1350;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  const bilder = (e.bilder||[]).filter(b=>b.signedUrl).slice(0,2);
  const imgs = await Promise.all(bilder.map(b=>ladeBild(b.signedUrl)));
  const W=1080, H=1350;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  ctx.fillStyle=SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  const fotoH = Math.round(H*0.55);
  if (imgs[0]) {
    // Bild 1: links 60%
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,Math.round(W*0.6),fotoH); ctx.clip();
    drawCover(ctx, imgs[0], 0, 0, Math.round(W*0.6), fotoH); ctx.restore();
  }
  if (imgs[1]) {
    // Bild 2: rechts 40%, mit 4px Abstand
    const rx = Math.round(W*0.6)+4;
    ctx.save(); ctx.beginPath(); ctx.rect(rx,0,W-rx,fotoH); ctx.clip();
    drawCover(ctx, imgs[1], rx, 0, W-rx, fotoH); ctx.restore();
  }
  // Trennlinie
  ctx.fillStyle=SLZB_COLORS.bg; ctx.fillRect(Math.round(W*0.6),0,4,fotoH);

  // Fade: startet bei 65% der Bildhöhe, läuft bis Canvas-Ende
  const fadeStart2 = Math.round(fotoH * 0.65);
  const fadeGrad = ctx.createLinearGradient(0, fadeStart2, 0, H);
  fadeGrad.addColorStop(0,'rgba(27,28,31,0)'); fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
  ctx.fillStyle=fadeGrad; ctx.fillRect(0, fadeStart2, W, H - fadeStart2);

  zeichneTextbereich(ctx, e, W, H, fotoH, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneSlzbFooterNeu(ctx, W, H);
}

// 4 Bilder: 2×2 Grid oben, Text unten
async function zeichnePoster4Bilder(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width=1080; canvas.height=1350;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();
  const bilder = (e.bilder||[]).filter(b=>b.signedUrl).slice(0,4);
  const imgs = await Promise.all(bilder.map(b=>ladeBild(b.signedUrl)));
  const W=1080, H=1350;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  ctx.fillStyle=SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // 2×2 Grid (obere 52%)
  const gridH = Math.round(H*0.52);
  const cellW = Math.round(W/2)-2, cellH = Math.round(gridH/2)-2;
  const positions = [[0,0],[cellW+4,0],[0,cellH+4],[cellW+4,cellH+4]];
  imgs.forEach((img,i) => {
    if (!img) return;
    const [gx,gy] = positions[i];
    ctx.save(); ctx.beginPath(); ctx.rect(gx,gy,cellW,cellH); ctx.clip();
    drawCover(ctx, img, gx, gy, cellW, cellH); ctx.restore();
  });

  // Fade: startet bei 65% der Grid-Höhe, läuft bis Canvas-Ende
  const fadeStart4 = Math.round(gridH * 0.65);
  const fadeGrad = ctx.createLinearGradient(0, fadeStart4, 0, H);
  fadeGrad.addColorStop(0,'rgba(27,28,31,0)'); fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
  ctx.fillStyle=fadeGrad; ctx.fillRect(0, fadeStart4, W, H - fadeStart4);

  zeichneTextbereich(ctx, e, W, H, gridH, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneSlzbFooterNeu(ctx, W, H);
}

// Bildschirm Querformat (1920×1080)
// ── QUERFORMAT 16:9 – optimiertes Layout ─────────────────────
// Hilfsfunktion: dynamische Schriftgröße je nach Titellänge
function querTitelFontSize(titel, maxW, ctx) {
  const sizes = [96, 80, 68, 56, 46, 38];
  for (const sz of sizes) {
    ctx.font = `bold italic ${sz}px Montserrat, Arial, sans-serif`;
    const w = ctx.measureText(titel.toUpperCase()).width;
    if (w <= maxW) return sz;
  }
  return 36;
}

// Hilfsfunktion: Textblock-Höhe berechnen (für vertikale Zentrierung)
function querTextblockHoehe(titel, platz, sportart, titelSize) {
  const zeilen = titel.split(' ').length > 3 ? 2 : 1;
  let h = 28 + 16; // Sportart + Linie
  h += zeilen * (titelSize + 12);
  if (platz) h += 70;
  h += 20; // Wettbewerb
  return h;
}

async function zeichneBildschirmQuerformat(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1920, H=1080;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const wettbewerb = e.wettbewerbText || '';
  const disziplin = e.disziplin || '';

  // Hintergrund
  ctx.fillStyle = SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // ── Bildaufteilung: adaptiv nach Bildformat ──────────────────
  let textX, textW;
  if (bild) {
    const fmt = bildFormat(bild);
    // Hochformat-Bild → schmalere Bildspalte (40%), mehr Textplatz
    // Querformat/Quadrat → breite Bildspalte (58%)
    const fotoW = fmt === 'portrait'
      ? Math.round(W * 0.40)
      : Math.round(W * 0.58);
    const bildSeite = fmt === 'portrait' ? 'rechts' : 'links';

    if (bildSeite === 'links') {
      // Bild links, Text rechts
      ctx.save(); ctx.beginPath(); ctx.rect(0,0,fotoW,H); ctx.clip();
      drawCover(ctx, bild, 0, 0, fotoW, H); ctx.restore();
      // Fade von ganz links der Bildkante nach rechts ins Bild (letzte 25%)
      const fadeW_q = Math.round(fotoW*0.25);
      const fg = ctx.createLinearGradient(fotoW-fadeW_q, 0, fotoW+20, 0);
      fg.addColorStop(0,'rgba(27,28,31,0)'); fg.addColorStop(1,'rgba(27,28,31,1)');
      ctx.fillStyle=fg; ctx.fillRect(fotoW-fadeW_q, 0, fadeW_q+20, H);
      // Leichter vertikaler Vignette-Fade oben/unten über dem Bild
      const fgTop = ctx.createLinearGradient(0,0,0,120);
      fgTop.addColorStop(0,'rgba(27,28,31,0.55)'); fgTop.addColorStop(1,'rgba(27,28,31,0)');
      ctx.fillStyle=fgTop; ctx.fillRect(0,0,fotoW,120);
      const fgBot = ctx.createLinearGradient(0,H-100,0,H);
      fgBot.addColorStop(0,'rgba(27,28,31,0)'); fgBot.addColorStop(1,'rgba(27,28,31,0.7)');
      ctx.fillStyle=fgBot; ctx.fillRect(0,H-100,fotoW,100);
      textX = fotoW + 60;
      textW = W - textX - 80;
    } else {
      // Hochformat-Bild rechts, Text links
      const bildX = W - fotoW;
      ctx.save(); ctx.beginPath(); ctx.rect(bildX,0,fotoW,H); ctx.clip();
      drawCover(ctx, bild, bildX, 0, fotoW, H); ctx.restore();
      // Fade von ganz rechts der Bildkante nach links ins Bild (erste 25% des Bildes)
      const fadeW_p = Math.round(fotoW*0.25);
      const fg = ctx.createLinearGradient(bildX-20, 0, bildX+fadeW_p, 0);
      fg.addColorStop(0,'rgba(27,28,31,1)'); fg.addColorStop(1,'rgba(27,28,31,0)');
      ctx.fillStyle=fg; ctx.fillRect(bildX-20, 0, fadeW_p+20, H);
      textX = 80;
      textW = bildX - 120;
    }
  } else {
    // Kein Bild: Vollflächiger Hintergrund mit Gradient
    const grad = ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,'#0a0a1e'); grad.addColorStop(1,'#1B1C1F');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    // Große Platzierungszahl als Hintergrund-Element
    if (platz) {
      ctx.save(); ctx.globalAlpha=0.05;
      ctx.fillStyle=mColor;
      ctx.font='bold italic 700px Montserrat, Arial, sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(platz), W/2, H/2);
      ctx.restore();
    }
    textX = 120; textW = W - 240;
  }

  // ── Textblock vertikal zentrieren ────────────────────────────
  const FOOTER_H = 70;
  const HEADER_H = 100; // Platz für Kopfzeile
  const nutzH = H - HEADER_H - FOOTER_H;

  // Dynamische Schriftgröße
  const titelSize = querTitelFontSize(titel, textW, ctx);
  const woerter = titel.toUpperCase().split(' ');
  // Zeilenumbruch: bei >3 Wörtern zwei Zeilen
  const mid = woerter.length > 3 ? Math.ceil(woerter.length/2) : woerter.length;
  const zeile1 = woerter.slice(0, mid).join(' ');
  const zeile2 = woerter.slice(mid).join(' ');
  const zeilenH = titelSize + 14;

  // Gesamthöhe des Textblocks berechnen
  let blockH = 28 + 14 + 6; // Sportart + Linie
  blockH += zeilenH; // Zeile 1
  if (zeile2) blockH += zeilenH;
  if (platz) blockH += 72;
  if (wettbewerb || disziplin) blockH += 36;

  // Startpunkt: vertikal zentriert in der Nutzfläche
  let y = HEADER_H + Math.round((nutzH - blockH) / 2);
  if (y < HEADER_H + 20) y = HEADER_H + 20;

  ctx.textAlign='left'; ctx.textBaseline='top';

  // Sportart-Label
  ctx.fillStyle=SLZB_COLORS.red;
  ctx.font=`bold 22px Montserrat, Arial, sans-serif`;
  ctx.fillText(sportart.toUpperCase(), textX, y); y+=28;

  // Rote Trennlinie
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect(textX, y, 80, 3); y+=14;

  // Titel Zeile 1 (weiß)
  ctx.font=`bold italic ${titelSize}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle=SLZB_COLORS.white;
  ctx.fillText(zeile1, textX, y, textW); y+=zeilenH;

  // Titel Zeile 2 (rot)
  if (zeile2) {
    ctx.fillStyle=SLZB_COLORS.red;
    ctx.fillText(zeile2, textX, y, textW); y+=zeilenH;
  }

  y += 10;

  // Platzierungs-Oval + Text
  if (platz) {
    const ovalW=110, ovalH=56;
    ctx.fillStyle=mColor;
    slzbRoundRect(ctx, textX, y, ovalW, ovalH, 28); ctx.fill();
    // Zahl im Oval
    ctx.fillStyle=SLZB_COLORS.bgDark;
    ctx.font=`bold italic 34px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), textX+ovalW/2, y+ovalH/2);
    // Platz-Text rechts
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle=SLZB_COLORS.white;
    ctx.font=`bold italic 30px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(pt, textX+ovalW+18, y+ovalH/2);
    y += ovalH + 16;
  }

  // Wettbewerb / Disziplin
  if (wettbewerb || disziplin) {
    ctx.fillStyle=SLZB_COLORS.gray1;
    ctx.font=`18px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='top';
    const wb = [wettbewerb, disziplin].filter(Boolean).join(' · ');
    ctx.fillText(wb, textX, y, textW);
  }

  // ── Kopfzeile (oben links, über dem Bild bei Bild-links-Layout) ──
  // Im Querformat: Kopfzeile in die Textspalte integrieren (oben)
  const _datumQF = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  ctx.fillStyle=SLZB_COLORS.white;
  ctx.font='bold 15px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  if (wettbewerb) ctx.fillText(wettbewerb.toUpperCase(), textX, HEADER_H - 50);
  ctx.fillStyle=SLZB_COLORS.red;
  ctx.font='bold 11px Montserrat, Arial, sans-serif';
  const kopfZeile2 = [disziplin, _datumQF].filter(Boolean).join(' · ');
  if (kopfZeile2) ctx.fillText(kopfZeile2.toUpperCase(), textX, HEADER_H - 28);

  // Logo oben links (immer sichtbar)
  drawLogo(ctx, 40, 24, 55);

  // ── Footer ───────────────────────────────────────────────────
  ctx.fillStyle='rgba(18,19,21,0.92)'; ctx.fillRect(0, H-FOOTER_H, W, FOOTER_H);
  // Rote Akzentlinie
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect(0, H-FOOTER_H, W, 2);
  ctx.fillStyle=SLZB_COLORS.white;
  ctx.font='bold 17px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, H-FOOTER_H+22);
  ctx.fillStyle=SLZB_COLORS.pinkLight;
  ctx.font='bold italic 20px Montserrat, Arial, sans-serif';
  ctx.fillText('#SLZBerlin', W/2, H-FOOTER_H+46);
}

// ══════════════════════════════════════════════════════════════
// NEUE LAYOUTS – 4 identifizierte Lücken
// ══════════════════════════════════════════════════════════════

// ── Hilfsfunktion: SLZB-Footer (wiederverwendbar) ────────────
function slzbFooterQuer(ctx, W, H) {
  const FH = 70;
  // Kein eigener Hintergrund – liegt auf dem Fade
  ctx.fillStyle = SLZB_COLORS.red; ctx.fillRect(0, H-FH, W, 2);
  ctx.fillStyle = SLZB_COLORS.white;
  ctx.font = 'bold 16px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, H-FH+22);
  ctx.fillStyle = SLZB_COLORS.pinkLight;
  ctx.font = 'bold italic 19px Montserrat, Arial, sans-serif';
  ctx.fillText('#SLZBerlin', W/2, H-FH+46);
}

// ── Hilfsfunktion: Medaillen-Oval ────────────────────────────
function zeichneOval(ctx, x, y, w, h, farbe, text) {
  ctx.fillStyle = farbe;
  slzbRoundRect(ctx, x, y, w, h, h/2); ctx.fill();
  ctx.fillStyle = SLZB_COLORS.bgDark;
  ctx.font = `bold italic ${Math.round(h*0.55)}px Montserrat, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(text), x+w/2, y+h/2);
}

// ══════════════════════════════════════════════════════════════
// FORMAT 1: TABELLEN-LAYOUT (Staffel/Team) – 1920×1080
// Bild links 45%, Ergebnistabelle rechts
// ══════════════════════════════════════════════════════════════
async function zeichneTabellenLayout(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1920, H=1080;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const wettbewerb = e.wettbewerbText || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);

  // Hintergrund
  ctx.fillStyle = SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // Bild links 45%
  const FOTO_W = Math.round(W*0.45);
  if (bild) {
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,FOTO_W,H); ctx.clip();
    drawCover(ctx, bild, 0, 0, FOTO_W, H); ctx.restore();
    // Fade rechts
    const fg = ctx.createLinearGradient(FOTO_W-180, 0, FOTO_W+20, 0);
    fg.addColorStop(0,'rgba(27,28,31,0)'); fg.addColorStop(1,'rgba(27,28,31,1)');
    ctx.fillStyle=fg; ctx.fillRect(FOTO_W-180, 0, 200, H);
  }

  // Rechte Spalte
  const TX = FOTO_W + 60;
  const TW = W - TX - 60;
  const FOOTER_H = 70;
  let y = 80;

  // Sportart + Datum + Trennlinie
  const _datumTL = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(sportart.toUpperCase(), TX, y); y+=28;
  if (_datumTL) {
    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='14px Montserrat, Arial, sans-serif';
    ctx.fillText(_datumTL, TX, y); y+=22;
  }
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect(TX, y, 80, 3); y+=12;

  // Titel (dynamische Größe)
  const tSz = querTitelFontSize(titel, TW, ctx);
  const woerter = titel.toUpperCase().split(' ');
  const mid = woerter.length > 3 ? Math.ceil(woerter.length/2) : woerter.length;
  ctx.font=`bold italic ${tSz}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle=SLZB_COLORS.white;
  ctx.fillText(woerter.slice(0,mid).join(' '), TX, y, TW); y+=tSz+10;
  if (woerter.slice(mid).length) {
    ctx.fillStyle=SLZB_COLORS.red;
    ctx.fillText(woerter.slice(mid).join(' '), TX, y, TW); y+=tSz+10;
  }

  // Platzierung
  if (platz) {
    zeichneOval(ctx, TX, y, 100, 50, mColor, platz);
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold italic 26px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(pt, TX+116, y+25); y+=62;
  }

  y += 10;

  // Teilnehmer-Tabelle aus achievement_participants
  const teilnehmer = (e.beteiligte||[]).filter(b=>b.anzeigename||b.schuelerId);
  if (teilnehmer.length > 0) {
    // Tabellenheader
    const ROW_H = 44;
    const COL_NAME = TX;
    const COL_ROLLE = TX + Math.round(TW*0.55);
    const COL_ERG = TX + Math.round(TW*0.80);
    const TABLE_W = TW;

    ctx.fillStyle='rgba(226,0,26,0.15)'; ctx.fillRect(TX, y, TABLE_W, ROW_H);
    ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 15px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('NAME', COL_NAME+10, y+ROW_H/2);
    ctx.fillText('ROLLE', COL_ROLLE, y+ROW_H/2);
    ctx.fillText('ERGEBNIS', COL_ERG, y+ROW_H/2);
    y += ROW_H;

    const maxZeilen = Math.min(teilnehmer.length, Math.floor((H - FOOTER_H - y - 10) / ROW_H));
    teilnehmer.slice(0, maxZeilen).forEach((b, i) => {
      const rowY = y + i*ROW_H;
      // Zebra-Streifen
      ctx.fillStyle = i%2===0 ? 'rgba(42,44,49,0.6)' : 'rgba(27,28,31,0.4)';
      ctx.fillRect(TX, rowY, TABLE_W, ROW_H);
      // Name
      ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 16px Montserrat, Arial, sans-serif';
      ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(b.anzeigename||'–', COL_NAME+10, rowY+ROW_H/2, COL_ROLLE-COL_NAME-20);
      // Rolle
      ctx.fillStyle=SLZB_COLORS.gray1; ctx.font='14px Montserrat, Arial, sans-serif';
      ctx.fillText(b.rolle||'–', COL_ROLLE, rowY+ROW_H/2, COL_ERG-COL_ROLLE-10);
      // Ergebnis (falls vorhanden)
      if (b.ergebnis) {
        ctx.fillStyle=mColor; ctx.font='bold 15px Montserrat, Arial, sans-serif';
        ctx.fillText(b.ergebnis, COL_ERG, rowY+ROW_H/2);
      }
    });
    if (teilnehmer.length > maxZeilen) {
      const restY = y + maxZeilen*ROW_H + 8;
      ctx.fillStyle=SLZB_COLORS.gray1; ctx.font='14px Montserrat, Arial, sans-serif';
      ctx.fillText(`+ ${teilnehmer.length-maxZeilen} weitere Teilnehmer`, TX+10, restY);
    }
  } else {
    // Kein Teilnehmer: Kurzinfo anzeigen
    if (e.kurzinfo || e.ergebnisText) {
      ctx.fillStyle=SLZB_COLORS.gray1; ctx.font='18px Montserrat, Arial, sans-serif';
      ctx.textAlign='left'; ctx.textBaseline='top';
      const info = e.kurzinfo || e.ergebnisText || '';
      ctx.fillText(info, TX, y, TW);
    }
  }

  // Logo + Footer
  drawLogo(ctx, 30, 20, 50);
  slzbFooterQuer(ctx, W, H);
}

// ══════════════════════════════════════════════════════════════
// FORMAT 2: MULTI-ERFOLG-LAYOUT (mehrere Disziplinen) – 1080×1350
// 3 Ergebnisblöcke untereinander, kein Hauptbild
// ══════════════════════════════════════════════════════════════
async function zeichneMultiErfolgLayout(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1080, H=1350;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const beteiligte = (e.beteiligte||[]).filter(b=>b.anzeigename);

  // Hintergrund: Dunkelgradient
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0d0e14'); grad.addColorStop(1,'#1B1C1F');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  // Dezente rote Diagonale als Hintergrund-Element
  ctx.save(); ctx.globalAlpha=0.04;
  ctx.fillStyle=SLZB_COLORS.red;
  ctx.beginPath(); ctx.moveTo(0,H*0.3); ctx.lineTo(W,0); ctx.lineTo(W,H*0.1); ctx.lineTo(0,H*0.5); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Kopfzeile
  drawLogo(ctx, 54, 36, 60);
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect(194, 44, 3, 49);
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 17px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText((e.wettbewerbText||'').toUpperCase(), 206, 40);
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 11px Montserrat, Arial, sans-serif';
  const _datumML = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  ctx.fillText([sportart, _datumML].filter(Boolean).join(' · ').toUpperCase(), 206, 64);

  // Haupttitel
  let y = 130;
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 14px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('MEHRFACH-ERFOLG', W/2, y); y+=22;
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect((W-80)/2, y, 80, 3); y+=14;

  const woerter = titel.toUpperCase().split(' ');
  const mid = Math.ceil(woerter.length/2);
  ctx.font='bold italic 64px Montserrat, Arial, sans-serif';
  ctx.fillStyle=SLZB_COLORS.white;
  ctx.fillText(woerter.slice(0,mid).join(' '), W/2, y, W-80); y+=76;
  if (woerter.slice(mid).length) {
    ctx.fillStyle=SLZB_COLORS.red;
    ctx.fillText(woerter.slice(mid).join(' '), W/2, y, W-80); y+=76;
  }

  y += 20;

  // Ergebnisblöcke: Haupterfolg + Beteiligte mit Einzelergebnissen
  const bloecke = [];

  // Block 1: Haupterfolg
  if (platz) {
    bloecke.push({ label: sportart, platz, medaille, mColor, extra: e.disziplin||'' });
  }

  // Blöcke 2+: Beteiligte mit Einzelergebnissen
  beteiligte.filter(b=>b.ergebnis||b.rolle).slice(0,4).forEach(b=>{
    bloecke.push({ label: b.anzeigename, platz: b.ergebnis||'', medaille:'', mColor: SLZB_COLORS.white, extra: b.rolle||'' });
  });

  // Fallback: 3 generische Blöcke wenn keine Daten
  if (bloecke.length === 0) {
    ['Gold','Silber','Bronze'].forEach((m,i)=>{
      bloecke.push({ label: sportart, platz: i+1, medaille: m, mColor: medailleColor(m), extra: e.disziplin||'' });
    });
  }

  const BLOCK_H = 140;
  const BLOCK_W = W - 108;
  const BLOCK_X = 54;

  bloecke.slice(0,4).forEach((bl, i) => {
    const by = y + i*(BLOCK_H+16);
    // Block-Hintergrund
    ctx.fillStyle='rgba(18,19,21,0.75)';
    slzbRoundRect(ctx, BLOCK_X, by, BLOCK_W, BLOCK_H, 12); ctx.fill();
    // Linke Akzentlinie
    ctx.fillStyle=bl.mColor; ctx.fillRect(BLOCK_X, by, 4, BLOCK_H);
    // Oval
    zeichneOval(ctx, BLOCK_X+20, by+BLOCK_H/2-28, 90, 56, bl.mColor, bl.platz||'–');
    // Label
    ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 22px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(bl.label, BLOCK_X+130, by+28, BLOCK_W-200);
    if (bl.extra) {
      ctx.fillStyle=SLZB_COLORS.gray1; ctx.font='16px Montserrat, Arial, sans-serif';
      ctx.fillText(bl.extra, BLOCK_X+130, by+58, BLOCK_W-200);
    }
    if (bl.medaille) {
      ctx.fillStyle=bl.mColor; ctx.font='bold italic 18px Montserrat, Arial, sans-serif';
      ctx.textAlign='right';
      ctx.fillText(bl.medaille.toUpperCase(), BLOCK_X+BLOCK_W-20, by+28);
    }
  });

  // Footer
  zeichneFusszeile(ctx, W, H);
}

// ══════════════════════════════════════════════════════════════
// FORMAT 3: INFOGRAFIK-LAYOUT (Jahresrückblick/Bilanz) – 1920×1080
// Gold/Silber/Bronze-Blöcke nebeneinander, große Zahlen
// ══════════════════════════════════════════════════════════════
async function zeichneInfografikLayout(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1920, H=1080;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);

  // Hintergrund
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#0a0a1e'); grad.addColorStop(0.5,'#1B1C1F'); grad.addColorStop(1,'#0d0e14');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  // Dezente Gitterlinien
  ctx.save(); ctx.globalAlpha=0.04; ctx.strokeStyle=SLZB_COLORS.white; ctx.lineWidth=1;
  for (let x=0; x<W; x+=120) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  ctx.restore();

  // Kopfzeile
  drawLogo(ctx, 54, 30, 55);
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect(180, 38, 3, 44);
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 16px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText((e.wettbewerbText||'JAHRESRÜCKBLICK').toUpperCase(), 194, 34);
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 11px Montserrat, Arial, sans-serif';
  const _datumIL = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  ctx.fillText([sportart||'SLZB BERLIN', _datumIL].filter(Boolean).join(' · ').toUpperCase(), 194, 58);

  // Haupttitel
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold italic 72px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  const woerter = titel.toUpperCase().split(' ');
  const mid = Math.ceil(woerter.length/2);
  ctx.fillText(woerter.slice(0,mid).join(' '), W/2, 110, W-200);
  ctx.fillStyle=SLZB_COLORS.red;
  if (woerter.slice(mid).length) ctx.fillText(woerter.slice(mid).join(' '), W/2, 190, W-200);

  // Rote Trennlinie
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect((W-200)/2, 280, 200, 3);

  // 3 Medaillen-Blöcke nebeneinander
  const medaillen = [
    { farbe: SLZB_COLORS.gold,   label: 'GOLD',   icon: '🥇', zahl: platz===1?1:0 },
    { farbe: SLZB_COLORS.silver, label: 'SILBER',  icon: '🥈', zahl: platz===2?1:0 },
    { farbe: SLZB_COLORS.bronze, label: 'BRONZE',  icon: '🥉', zahl: platz===3?1:0 },
  ];
  // Wenn Platzierung vorhanden, entsprechende Zahl auf 1 setzen
  if (medaille==='Gold') medaillen[0].zahl=1;
  else if (medaille==='Silber') medaillen[1].zahl=1;
  else if (medaille==='Bronze') medaillen[2].zahl=1;

  const BLOCK_W = Math.round(W/3) - 60;
  const BLOCK_H = 480;
  const BLOCK_Y = 310;
  const GAP = 30;

  medaillen.forEach((m, i) => {
    const bx = 30 + i*(BLOCK_W+GAP+30);
    // Block-Hintergrund
    ctx.fillStyle='rgba(18,19,21,0.7)';
    slzbRoundRect(ctx, bx, BLOCK_Y, BLOCK_W, BLOCK_H, 16); ctx.fill();
    // Farbige Oberkante
    ctx.fillStyle=m.farbe; ctx.fillRect(bx, BLOCK_Y, BLOCK_W, 5);
    // Große Zahl
    ctx.save(); ctx.globalAlpha=0.12; ctx.fillStyle=m.farbe;
    ctx.font='bold italic 320px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(m.zahl), bx+BLOCK_W/2, BLOCK_Y+BLOCK_H/2+20);
    ctx.restore();
    // Vordergrundzahl
    ctx.fillStyle=m.farbe; ctx.font='bold italic 180px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(m.zahl), bx+BLOCK_W/2, BLOCK_Y+BLOCK_H/2-20);
    // Label
    ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 28px Montserrat, Arial, sans-serif';
    ctx.textBaseline='bottom';
    ctx.fillText(m.label, bx+BLOCK_W/2, BLOCK_Y+BLOCK_H-20);
    // Kleine Beschriftung
    ctx.fillStyle=m.farbe; ctx.font='bold 16px Montserrat, Arial, sans-serif';
    ctx.textBaseline='top';
    ctx.fillText('MEDAILLE(N)', bx+BLOCK_W/2, BLOCK_Y+BLOCK_H-16);
  });

  // Gesamtbilanz unten
  const gesamt = medaillen.reduce((s,m)=>s+m.zahl,0);
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold italic 36px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText(`GESAMT: ${gesamt} MEDAILLE${gesamt!==1?'N':''}`, W/2, H-80);

  // Logo + Footer
  slzbFooterQuer(ctx, W, H);
}

// ══════════════════════════════════════════════════════════════
// FORMAT 4: PORTRÄT-LAYOUT (Einzelperson-Ehrung) – 1080×1350
// Foto oben 50%, Name sehr groß, Sportart klein
// ══════════════════════════════════════════════════════════════
async function zeichnePortraitLayout(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1080, H=1350;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const wettbewerb = e.wettbewerbText || '';

  // Athletenname aus Beteiligten oder Titel
  const athlet = (e.beteiligte||[]).find(b=>b.anzeigename);
  const name = athlet?.anzeigename || titel;
  const nameParts = name.split(' ');
  const vorname = nameParts.slice(0,-1).join(' ') || name;
  const nachname = nameParts.slice(-1)[0] || '';

  // Hintergrund
  ctx.fillStyle = SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // Foto oben 52% (Hochformat-Foto füllt gut)
  const FOTO_H = Math.round(H*0.52);
  if (bild) {
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,FOTO_H); ctx.clip();
    drawCover(ctx, bild, 0, 0, W, FOTO_H); ctx.restore();
    // Fade: startet bei 65% der Bildhöhe, läuft bis Canvas-Ende (deckt Text ab)
    // Fade: beginnt bei 65% der Bildhöhe, läuft ins Bild aus, endet bei H
    const fadeStart_p = Math.round(FOTO_H * 0.65);
    const fg = ctx.createLinearGradient(0, fadeStart_p, 0, H);
    fg.addColorStop(0,'rgba(27,28,31,0)');
    fg.addColorStop(1,'rgba(27,28,31,1)');
    ctx.fillStyle=fg; ctx.fillRect(0, fadeStart_p, W, H - fadeStart_p);
  } else {
    // Kein Bild: Initialen-Kreis
    ctx.fillStyle='rgba(226,0,26,0.15)';
    ctx.beginPath(); ctx.arc(W/2, FOTO_H/2, 200, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold italic 180px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText((vorname[0]||'')+(nachname[0]||''), W/2, FOTO_H/2);
  }

  // Kopfzeile über dem Foto
  drawLogo(ctx, 40, 28, 55);
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect(170, 36, 3, 44);
  const _datumPL = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 15px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(wettbewerb.toUpperCase()||sportart.toUpperCase(), 182, 32);
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 10px Montserrat, Arial, sans-serif';
  ctx.fillText(['EHRUNG', _datumPL].filter(Boolean).join(' · '), 182, 56);

  // Textbereich unter dem Foto
  let y = FOTO_H + 20;

  // Sportart-Label
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 18px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(sportart.toUpperCase(), W/2, y); y+=26;
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect((W-60)/2, y, 60, 3); y+=14;

  // Vorname (weiß, groß)
  const vSz = querTitelFontSize(vorname, W-80, ctx);
  ctx.font=`bold italic ${vSz}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle=SLZB_COLORS.white; ctx.textAlign='center';
  ctx.fillText(vorname.toUpperCase(), W/2, y, W-60); y+=vSz+8;

  // Nachname (rot, etwas kleiner)
  if (nachname) {
    const nSz = Math.round(vSz*0.85);
    ctx.font=`bold italic ${nSz}px Montserrat, Arial, sans-serif`;
    ctx.fillStyle=SLZB_COLORS.red;
    ctx.fillText(nachname.toUpperCase(), W/2, y, W-60); y+=nSz+20;
  }

  // Platzierungs-Oval zentriert
  if (platz) {
    const ovalW=120, ovalH=60;
    const ovalX=(W-ovalW)/2;
    zeichneOval(ctx, ovalX, y, ovalW, ovalH, mColor, platz);
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold italic 26px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(pt, W/2, y+ovalH+10); y+=ovalH+50;
  }

  // Wettbewerb
  if (wettbewerb) {
    ctx.fillStyle=SLZB_COLORS.gray1; ctx.font='18px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(wettbewerb, W/2, y, W-80);
  }

  // Footer
  zeichneFusszeile(ctx, W, H);
}

// ══════════════════════════════════════════════════════════════
// FEATURE 1: HIGHLIGHTS-KARUSSELL (Monatliche Social-Media-Serie)
// Einzelne Karte 1080×1080 mit Nummerierung (z.B. 1/5)
// ══════════════════════════════════════════════════════════════
async function zeichneHighlightKarte(canvasId, e, nr, gesamt) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1080, H=1080;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);

  // Hintergrund
  ctx.fillStyle = SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // Bild (obere 60%)
  if (bild) {
    const fotoH = Math.round(H*0.60);
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,fotoH); ctx.clip();
    drawCover(ctx, bild, 0, 0, W, fotoH); ctx.restore();
    // Fade
    const fg = ctx.createLinearGradient(0, fotoH*0.60, 0, H);
    fg.addColorStop(0,'rgba(27,28,31,0)'); fg.addColorStop(1,'rgba(27,28,31,1)');
    ctx.fillStyle=fg; ctx.fillRect(0, fotoH*0.60, W, H - fotoH*0.60);
  }

  // Karussell-Nummer oben rechts
  ctx.fillStyle='rgba(226,0,26,0.9)';
  slzbRoundRect(ctx, W-90, 16, 74, 36, 18); ctx.fill();
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 16px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(`${nr} / ${gesamt}`, W-53, 34);

  // Sportart + Datum
  const _datumHL = e.datum ? new Date(e.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 18px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText([sportart, _datumHL].filter(Boolean).join(' · ').toUpperCase(), W/2, 620);

  // Titel
  const tSz = querTitelFontSize(titel, W-80, ctx);
  const woerter = titel.toUpperCase().split(' ');
  const mid = woerter.length>3 ? Math.ceil(woerter.length/2) : woerter.length;
  ctx.font=`bold italic ${tSz}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle=SLZB_COLORS.white; ctx.textAlign='center';
  ctx.fillText(woerter.slice(0,mid).join(' '), W/2, 650, W-60);
  if (woerter.slice(mid).length) {
    ctx.fillStyle=SLZB_COLORS.red;
    ctx.fillText(woerter.slice(mid).join(' '), W/2, 650+tSz+8, W-60);
  }

  // Platzierung
  if (platz) {
    const ow=100, oh=50, ox=(W-ow)/2, oy=780;
    ctx.fillStyle=mColor; slzbRoundRect(ctx,ox,oy,ow,oh,25); ctx.fill();
    ctx.fillStyle=SLZB_COLORS.bgDark; ctx.font='bold italic 30px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), ox+ow/2, oy+oh/2);
    const pt = platz===1?'1. PLATZ':platz===2?'2. PLATZ':platz===3?'3. PLATZ':`${platz}. PLATZ`;
    ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold italic 22px Montserrat, Arial, sans-serif';
    ctx.textBaseline='top'; ctx.fillText(pt, W/2, oy+oh+8);
  }

  // Logo + Footer
  drawLogo(ctx, 20, 16, 48);
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 14px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, H-28);
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect((W-200)/2, H-22, 200, 2);
  ctx.fillStyle=SLZB_COLORS.pinkLight; ctx.font='bold italic 18px Montserrat, Arial, sans-serif';
  ctx.fillText('#SLZBerlin', W/2, H-4);
}

// ══════════════════════════════════════════════════════════════
// FEATURE 2: NACHWUCHSSPORTLER-WAHL (Abstimmungsaufruf)
// 1080×1350 mit 1-3 Kandidaten, blauer Akzent
// ══════════════════════════════════════════════════════════════
async function zeichneNachwuchswahlPoster(canvasId, opts) {
  // opts: { monat, kandidaten: [{name, sportart, bild}], abstimmungslink }
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1080, H=1350;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const kandidaten = (opts.kandidaten||[]).slice(0,3);
  const monat = opts.monat || '';
  const link = opts.abstimmungslink || '';

  // Hintergrund: blau (Personen-Stil)
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0a0c1a'); grad.addColorStop(0.5,'#0a1535'); grad.addColorStop(1,'#001a66');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  // Blauer Header
  ctx.fillStyle='rgba(0,51,102,0.95)'; ctx.fillRect(0,0,W,100);
  drawLogo(ctx, 20, 14, 72);
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 18px Montserrat, Arial, sans-serif';
  ctx.textAlign='right'; ctx.textBaseline='middle';
  ctx.fillText('SLZB BERLIN', W-24, 50);

  // Titel
  let y = 130;
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold italic 52px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('JETZT', W/2, y); y+=60;
  ctx.fillStyle='#0B63CE'; ctx.font='bold italic 52px Montserrat, Arial, sans-serif';
  ctx.fillText('ABSTIMMEN!', W/2, y); y+=68;
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 20px Montserrat, Arial, sans-serif';
  const nwTitelText = opts.titelOverride || `Nachwuchssportler/in des Monats ${monat}`;
  ctx.fillText(nwTitelText, W/2, y, W-80); y+=36;
  ctx.fillStyle='#0B63CE'; ctx.fillRect((W-120)/2, y, 120, 3); y+=20;

  // Kandidaten-Fotos
  if (kandidaten.length === 1) {
    // Einzeln zentriert
    const k = kandidaten[0];
    const bild = k.bild ? await ladeBild(k.bild) : null;
    const bW=500, bH=500, bX=(W-bW)/2;
    if (bild) {
      ctx.save(); ctx.beginPath();
      ctx.arc(bX+bW/2, y+bH/2, bW/2, 0, Math.PI*2); ctx.clip();
      drawCover(ctx, bild, bX, y, bW, bH); ctx.restore();
      ctx.strokeStyle='#0B63CE'; ctx.lineWidth=6;
      ctx.beginPath(); ctx.arc(bX+bW/2, y+bH/2, bW/2, 0, Math.PI*2); ctx.stroke();
    } else {
      ctx.fillStyle='rgba(11,99,206,0.2)';
      ctx.beginPath(); ctx.arc(bX+bW/2, y+bH/2, bW/2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#0B63CE'; ctx.font='bold italic 120px Montserrat, Arial, sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText((k.name||'?')[0].toUpperCase(), bX+bW/2, y+bH/2);
    }
    y+=bH+20;
    ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 32px Montserrat, Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(k.name||'', W/2, y); y+=40;
    ctx.fillStyle='#0B63CE'; ctx.font='bold 18px Montserrat, Arial, sans-serif';
    ctx.fillText((k.sportart||'').toUpperCase(), W/2, y);
  } else {
    // 2-3 Kandidaten nebeneinander
    const bW = kandidaten.length===2 ? 380 : 280;
    const bH = bW;
    const gap = (W - kandidaten.length*bW) / (kandidaten.length+1);
    const bilder = await Promise.all(kandidaten.map(k=>k.bild?ladeBild(k.bild):Promise.resolve(null)));
    kandidaten.forEach((k,i)=>{
      const bX = gap + i*(bW+gap);
      const bild = bilder[i];
      if (bild) {
        ctx.save(); ctx.beginPath();
        ctx.arc(bX+bW/2, y+bH/2, bW/2, 0, Math.PI*2); ctx.clip();
        drawCover(ctx, bild, bX, y, bW, bH); ctx.restore();
      } else {
        ctx.fillStyle='rgba(11,99,206,0.2)';
        ctx.beginPath(); ctx.arc(bX+bW/2, y+bH/2, bW/2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#0B63CE'; ctx.font=`bold italic ${Math.round(bW*0.35)}px Montserrat, Arial, sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText((k.name||'?')[0].toUpperCase(), bX+bW/2, y+bH/2);
      }
      ctx.strokeStyle='#0B63CE'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(bX+bW/2, y+bH/2, bW/2, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle=SLZB_COLORS.white; ctx.font=`bold ${Math.round(bW*0.1)}px Montserrat, Arial, sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(k.name||'', bX+bW/2, y+bH+10, bW+20);
      ctx.fillStyle='#0B63CE'; ctx.font=`bold ${Math.round(bW*0.07)}px Montserrat, Arial, sans-serif`;
      ctx.fillText((k.sportart||'').toUpperCase(), bX+bW/2, y+bH+10+Math.round(bW*0.12), bW+20);
      // Erfolge unter Sportart
      if (k.erfolge?.length) {
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font=`${Math.round(bW*0.055)}px Montserrat, Arial, sans-serif`;
        k.erfolge.slice(0,2).forEach((erf,ei)=>{
          ctx.fillText(erf, bX+bW/2, y+bH+10+Math.round(bW*0.12)+Math.round(bW*0.10)*(ei+1), bW+20);
        });
      }
    });
    y += bH + 80;
  }

  // Abstimmungs-Button
  y = Math.max(y, H-220);
  ctx.fillStyle='#0B63CE'; slzbRoundRect(ctx,(W-400)/2,y,400,70,35); ctx.fill();
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 22px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('👉 Jetzt abstimmen!', W/2, y+35);
  if (link) {
    ctx.fillStyle=SLZB_COLORS.gray1; ctx.font='14px Montserrat, Arial, sans-serif';
    ctx.textBaseline='top'; ctx.fillText(link, W/2, y+78, W-80);
  }

  // Footer
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 14px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, H-28);
  ctx.fillStyle=SLZB_COLORS.red; ctx.fillRect((W-200)/2, H-22, 200, 2);
  ctx.fillStyle=SLZB_COLORS.pinkLight; ctx.font='bold italic 18px Montserrat, Arial, sans-serif';
  ctx.fillText('#SLZBerlin', W/2, H-4);
}

// ══════════════════════════════════════════════════════════════
// FEATURE 3: COUNTDOWN-POSTER
// 1080×1350 oder 1920×1080 mit Tagen/Stunden bis Event
// ══════════════════════════════════════════════════════════════

// Hilfsfunktion: "BIS ZUM" / "BIS ZUR" / "BIS ZU DEN" automatisch bestimmen
function bisZumLabel(eventName) {
  if (!eventName) return 'BIS ZUM';
  const name = eventName.trim().toLowerCase();
  const woerter = name.split(/\s+/);
  const erstesWort = woerter[0];

  // Femininum → "BIS ZUR"
  const femininum = [
    'deutschen','deutsche','berliner','landesmeisterschaft','bundesmeisterschaft',
    'stadtmeisterschaft','kreismeisterschaft','schulmeisterschaft','vereinsmeisterschaft',
    'europameisterschaft','weltmeisterschaft','em','wm','dm','lm','bm',
    'qualifikation','sichtung','rangliste','bundesliga','regionalliga',
    'meisterschaft','championship','open','cup','trophy','challenge',
    'gala','veranstaltung','feier','ehrung','auszeichnung','verleihung',
  ];
  // Plural → "BIS ZU DEN"
  const plural = [
    'deutschen meisterschaften','berliner meisterschaften','landesmeisterschaften',
    'bundesmeisterschaften','stadtmeisterschaften','kreismeisterschaften',
    'schulmeisterschaften','europameisterschaften','weltmeisterschaften',
    'meisterschaften','championships','games','spielen','wettkämpfen',
    'olympischen','youth olympic','olympic',
  ];

  // Prüfe Plural zuerst (längere Matches)
  for (const p of plural) {
    if (name.includes(p)) return 'BIS ZU DEN';
  }

  // Prüfe Femininum
  for (const f of femininum) {
    if (erstesWort === f || name.startsWith(f + ' ') || name.includes(' ' + f)) {
      // Ausnahmen: "Cup", "Open", "Trophy" sind maskulin/neutral
      if (['cup','open','trophy','challenge','grand prix'].some(m => name.includes(m))) break;
      return 'BIS ZUR';
    }
  }

  // Spezifische Endungen
  if (name.endsWith('meisterschaft') || name.includes('meisterschaft ')) return 'BIS ZUR';
  if (name.endsWith('meisterschaften')) return 'BIS ZU DEN';
  if (name.endsWith('liga') || name.endsWith('runde')) return 'BIS ZUR';
  if (name.endsWith('cup') || name.endsWith('open') || name.endsWith('grand prix')) return 'BIS ZUM';
  if (name.endsWith('turnier') || name.endsWith('wettkampf') || name.endsWith('lehrgang')) return 'BIS ZUM';
  if (name.endsWith('games') || name.endsWith('spielen')) return 'BIS ZU DEN';

  // Standard: "BIS ZUM"
  return 'BIS ZUM';
}
async function zeichneCountdownPoster(canvasId, opts) {
  // opts: { eventName, eventDatum, ort, sportart, format:'hochformat'|'querformat', hintergrundbild }
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const querformat = opts.format === 'querformat';
  const W = querformat ? 1920 : 1080;
  const H = querformat ? 1080 : 1350;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const eventDatum = opts.eventDatum ? new Date(opts.eventDatum) : null;
  const jetzt = new Date();
  let tage=0, stunden=0, minuten=0;
  if (eventDatum && eventDatum > jetzt) {
    const diff = eventDatum - jetzt;
    tage = Math.floor(diff / (1000*60*60*24));
    stunden = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
    minuten = Math.floor((diff % (1000*60*60)) / (1000*60));
  }
  const vorbei = eventDatum && eventDatum <= jetzt;
  const sportart = opts.sportart || '';
  const datumStr = eventDatum ? eventDatum.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

  // 1. Hintergrund: zeichneSlzbHintergrund (grün, Foto oben sichtbar)
  const bild = opts.hintergrundbild ? await ladeBild(opts.hintergrundbild) : null;
  zeichneSlzbHintergrund(ctx, W, H, bild, 'gruen');

  // 2. Deko: schräges Rechteck + Kreise (wie Erfolgsposter)
  zeichneSlzbDeko(ctx, W, H);

  // 3. Header: zeichneSlzbHeader (kein opaker Balken, liegt auf Bild)
  zeichneSlzbHeader(ctx, W, H, sportart || 'Event', datumStr, 'gruen');

  // 4. Grüner Fade unten (startet bei 55% der Canvas-Höhe)
  const fadeStart = H * 0.55;
  const fadeGrad = ctx.createLinearGradient(0, fadeStart, 0, H);
  fadeGrad.addColorStop(0, 'rgba(0,30,10,0)');
  fadeGrad.addColorStop(1, 'rgba(0,30,10,1)');
  ctx.fillStyle = fadeGrad; ctx.fillRect(0, fadeStart, W, H - fadeStart);

  // 5. Countdown-Zahlen (proportionale Schriftgrößen)
  const CX = W/2;
  const CY = querformat ? H*0.38 : H*0.38;
  const zahlSz = Math.round(H * (querformat ? 0.11 : 0.12));
  const subSz  = Math.round(H * (querformat ? 0.022 : 0.022));

  // Hintergrund-Kreis (grün, dezent)
  ctx.save(); ctx.globalAlpha=0.10; ctx.fillStyle='#00cc55';
  ctx.beginPath(); ctx.arc(CX, CY, Math.round(H*0.20), 0, Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.textAlign='center';
  if (vorbei) {
    ctx.fillStyle='#00cc55'; ctx.font=`bold italic ${Math.round(H*0.072)}px Montserrat, Arial, sans-serif`;
    ctx.textBaseline='middle'; ctx.fillText('HEUTE!', CX, CY);
  } else if (tage > 0) {
    ctx.fillStyle='#00cc55'; ctx.font=`bold italic ${zahlSz}px Montserrat, Arial, sans-serif`;
    ctx.textBaseline='middle'; ctx.fillText(String(tage), CX, CY - Math.round(H*0.015));
    ctx.fillStyle=SLZB_COLORS.white; ctx.font=`bold ${subSz}px Montserrat, Arial, sans-serif`;
    ctx.textBaseline='top'; ctx.fillText(tage===1?'TAG NOCH':'TAGE NOCH', CX, CY + Math.round(H*0.068));
  } else {
    ctx.fillStyle='#00cc55'; ctx.font=`bold italic ${Math.round(H*0.075)}px Montserrat, Arial, sans-serif`;
    ctx.textBaseline='middle'; ctx.fillText(`${stunden}h ${minuten}m`, CX, CY);
    ctx.fillStyle=SLZB_COLORS.white; ctx.font=`bold ${subSz}px Montserrat, Arial, sans-serif`;
    ctx.textBaseline='top'; ctx.fillText('NOCH', CX, CY + Math.round(H*0.050));
  }

  // 6. Event-Name (im Fade-Bereich, proportionale Schriften)
  const textY = H * 0.62;
  const labelSz = Math.round(H*0.013);
  const evtSz = querTitelFontSize((opts.eventName||'EVENT'), W-80, ctx);

  // Sportart-Label über dem Event-Namen (wie beim Erfolgsposter)
  if (sportart) {
    ctx.fillStyle='#00cc55'; ctx.font=`bold ${Math.round(H*0.016)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='top'; ctx.letterSpacing='2px';
    ctx.fillText(sportart.toUpperCase(), CX, textY - Math.round(H*0.040));
    ctx.letterSpacing='0px';
    ctx.fillStyle='#00cc55'; ctx.fillRect(CX-40, textY - Math.round(H*0.016), 80, 2);
  }

  ctx.fillStyle='#00cc55'; ctx.font=`bold ${labelSz}px Montserrat, Arial, sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.letterSpacing='4px';
  ctx.fillText(bisZumLabel(opts.eventName||''), CX, textY);
  ctx.letterSpacing='0px';

  const evtWoerter = (opts.eventName||'EVENT').toUpperCase().split(' ');
  const evtMid = evtWoerter.length>2 ? Math.ceil(evtWoerter.length/2) : evtWoerter.length;
  ctx.font=`bold italic ${evtSz}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle=SLZB_COLORS.white;
  ctx.fillText(evtWoerter.slice(0,evtMid).join(' '), CX, textY+labelSz+10, W-80);
  ctx.fillStyle='#00cc55';
  if (evtWoerter.slice(evtMid).length) {
    ctx.fillText(evtWoerter.slice(evtMid).join(' '), CX, textY+labelSz+10+evtSz+8, W-80);
  }

  // 7. Datum + Ort (proportional)
  if (eventDatum) {
    const datLang = eventDatum.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
    const infoSz = Math.round(H*0.016);
    ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font=`${infoSz}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='top';
    const zeilen = evtWoerter.slice(evtMid).length ? 2 : 1;
    const ortY = textY + labelSz + 10 + evtSz*zeilen + 8 + 20;
    ctx.fillText(datLang, CX, ortY, W-80);
    if (opts.ort) { ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fillText(opts.ort, CX, ortY+infoSz+6, W-80); }
  }

  // 8. Footer: zeichneSlzbFooterNeu (grün)
  zeichneSlzbFooterNeu(ctx, W, H, 'gruen');
}

// ══════════════════════════════════════════════════════════════
// NACHWUCHS-SIEGER-POSTER (Blau, Einzelperson mit Erfolgen)
// ══════════════════════════════════════════════════════════════
async function zeichneNachwuchsSiegerPoster(canvasId, opts) {
  // opts: { name, sport, zeitraum, bildUrl, erfolge[] }
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const W=1080, H=1350;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  await ladeMontserrat(); await ladeLogo();

  const bild = opts.bildUrl ? await ladeBild(opts.bildUrl) : null;
  const nameParts = (opts.name||'').trim().split(' ');
  const vorname = nameParts.length>1 ? nameParts.slice(0,-1).join(' ') : opts.name;
  const nachname = nameParts.length>1 ? nameParts[nameParts.length-1] : '';
  const erfolge = (opts.erfolge||[]).slice(0,6);

  // Hintergrund blau
  zeichneSlzbHintergrund(ctx, W, H, bild, 'blau');
  zeichneSlzbDeko(ctx, W, H);
  zeichneSlzbHeader(ctx, W, H, opts.sport||'SLZB', opts.zeitraum||'', 'blau');

  // Glasmorphismus-Karte (etwas höher für Erfolge)
  const cardTop = Math.round(H*0.40);
  const cardX = Math.round(W*0.026);
  const cardW = W - 2*cardX;
  const cardH = H - cardTop - Math.round(H*0.06);
  ctx.fillStyle='rgba(0,0,0,0.50)';
  slzbRoundRect(ctx, cardX, cardTop, cardW, cardH, Math.round(W*0.017)); ctx.fill();
  ctx.strokeStyle='rgba(11,99,206,0.35)'; ctx.lineWidth=2;
  slzbRoundRect(ctx, cardX, cardTop, cardW, cardH, Math.round(W*0.017)); ctx.stroke();

  let y = cardTop + Math.round(H*0.030);
  const cx = W/2;

  // Subtitle
  ctx.fillStyle='#0B63CE'; ctx.font=`800 ${Math.round(H*0.016)}px Montserrat, Arial, sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.letterSpacing='5px';
  ctx.fillText('NACHWUCHSSPORTLER/IN DES ' + (opts.zeitraum?.match(/^\d{4}$/) ? 'JAHRES' : 'MONATS'), cx, y);
  ctx.letterSpacing='0px'; y+=Math.round(H*0.028);

  // Vorname weiß
  ctx.fillStyle='#fff'; ctx.font=`800 italic ${Math.round(H*0.065)}px Montserrat, Arial, sans-serif`;
  ctx.fillText(vorname.toUpperCase(), cx, y, cardW-40); y+=Math.round(H*0.058);

  // Nachname blau
  if (nachname) {
    ctx.fillStyle='#1a7fff'; ctx.font=`900 italic ${Math.round(H*0.080)}px Montserrat, Arial, sans-serif`;
    ctx.fillText(nachname.toUpperCase(), cx, y, cardW-40); y+=Math.round(H*0.072);
  }

  // Sportart
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font=`700 ${Math.round(H*0.018)}px Montserrat, Arial, sans-serif`;
  ctx.letterSpacing='3px';
  ctx.fillText((opts.sport||'').toUpperCase(), cx, y); y+=Math.round(H*0.030);
  ctx.letterSpacing='0px';

  // Trennlinie
  ctx.fillStyle='#0B63CE'; ctx.fillRect(cx-60, y, 120, 2); y+=Math.round(H*0.022);

  // Erfolge-Liste
  if (erfolge.length > 0) {
    ctx.textAlign='left'; ctx.textBaseline='top';
    const listX = cardX + Math.round(W*0.05);
    const listW = cardW - Math.round(W*0.10);
    erfolge.forEach((erf, i) => {
      const rowY = y + i*Math.round(H*0.052);
      // Hintergrund-Zeile
      ctx.fillStyle = i%2===0 ? 'rgba(11,99,206,0.12)' : 'rgba(0,0,0,0.15)';
      slzbRoundRect(ctx, listX-8, rowY-4, listW+16, Math.round(H*0.044), 8); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font=`600 ${Math.round(H*0.022)}px Montserrat, Arial, sans-serif`;
      ctx.fillText(erf, listX, rowY+Math.round(H*0.010), listW);
    });
    y += erfolge.length * Math.round(H*0.052) + Math.round(H*0.010);
  }

  // Zeitraum-Badge
  if (opts.zeitraum) {
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillStyle='rgba(11,99,206,0.25)';
    slzbRoundRect(ctx, cx-100, y, 200, Math.round(H*0.038), Math.round(H*0.019)); ctx.fill();
    ctx.fillStyle='#a0c4ff'; ctx.font=`700 ${Math.round(H*0.018)}px Montserrat, Arial, sans-serif`;
    ctx.fillText(opts.zeitraum, cx, y+Math.round(H*0.010));
  }

  // Footer
  zeichneSlzbFooterNeu(ctx, W, H, 'blau');
}

// ══════════════════════════════════════════════════════════════
// A3-DRUCK-LAYOUT FÜR NICHT-SPORT-POSTER (1587×1123, quer)
// Gemeinsame Funktion für Jubiläum, Schulnachricht, Countdown
// Druckfreundlich: weißer Hintergrund, blauer Header, wenig Farbe
// ══════════════════════════════════════════════════════════════
async function zeichnePosterA3Allgemein(ctx, W, H, bild, karteOpts, akzent='rot', datumStr='') {
  await ladeMontserrat(); await ladeLogo();

  const akzentFarbe = akzent==='blau' ? '#0B63CE' : akzent==='gruen' ? '#00a040' : akzent==='gold' ? '#C9A227' : akzent==='grau' ? '#8A9BB0' : '#E2001A';

  // Weißer Hintergrund (druckfreundlich)
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);

  // Blauer Header (SLZB-Standard für Druck)
  ctx.fillStyle = '#003366'; ctx.fillRect(0,0,W,90);
  if (_slzbLogo) {
    const logoH=70, logoW=_slzbLogo.width/(_slzbLogo.height/logoH);
    ctx.drawImage(_slzbLogo, 20, 10, logoW, logoH);
  }
  ctx.fillStyle='#fff'; ctx.font='bold 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, 45);
  ctx.font='bold italic 18px Montserrat, Arial, sans-serif';
  ctx.textAlign='right'; ctx.fillStyle=akzentFarbe;
  ctx.fillText('#SLZBerlin', W-30, 45);

  // Akzentlinie unter Header
  ctx.fillStyle=akzentFarbe; ctx.fillRect(0, 90, W, 4);

  // Bild (linke Hälfte, wenn vorhanden)
  const FOTO_W = bild ? Math.round(W*0.45) : 0;
  const FOTO_Y = 94;
  const FOTO_H = H - 94 - 60;

  if (bild) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, FOTO_Y, FOTO_W, FOTO_H); ctx.clip();
    drawCover(ctx, bild, 0, FOTO_Y, FOTO_W, FOTO_H); ctx.restore();
    // Trennlinie
    ctx.fillStyle=akzentFarbe; ctx.fillRect(FOTO_W, FOTO_Y, 4, FOTO_H);
  }

  // Textbereich (rechts oder volle Breite)
  const TX = bild ? FOTO_W + 40 : 60;
  const TW = W - TX - 40;
  let y = 130;

  // Subtitle
  if (karteOpts.subtitle) {
    ctx.fillStyle=akzentFarbe; ctx.font=`800 16px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='top'; ctx.letterSpacing='4px';
    ctx.fillText(karteOpts.subtitle.toUpperCase(), TX, y); y+=26;
    ctx.letterSpacing='0px';
    ctx.fillStyle=akzentFarbe; ctx.fillRect(TX, y, 80, 3); y+=14;
  }

  // Vorname (dunkel, groß)
  if (karteOpts.vorname) {
    const vSz = querTitelFontSize(karteOpts.vorname, TW, ctx);
    ctx.fillStyle='#1a1a2e'; ctx.font=`800 italic ${vSz}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(karteOpts.vorname.toUpperCase(), TX, y, TW); y+=vSz+8;
  }

  // Nachname (akzentfarbe, größer)
  if (karteOpts.nachname) {
    const nSz = Math.round(querTitelFontSize(karteOpts.nachname, TW, ctx)*1.1);
    ctx.fillStyle=akzentFarbe; ctx.font=`900 italic ${nSz}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(karteOpts.nachname.toUpperCase(), TX, y, TW); y+=nSz+16;
  }

  // Titel (wenn kein Vor/Nachname)
  if (!karteOpts.vorname && !karteOpts.nachname && karteOpts.titel) {
    const tSz = querTitelFontSize(karteOpts.titel, TW, ctx);
    const woerter = karteOpts.titel.toUpperCase().split(' ');
    const mid = woerter.length>3 ? Math.ceil(woerter.length/2) : woerter.length;
    ctx.fillStyle='#1a1a2e'; ctx.font=`800 italic ${tSz}px Montserrat, Arial, sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(woerter.slice(0,mid).join(' '), TX, y, TW); y+=tSz+8;
    ctx.fillStyle=akzentFarbe;
    if (woerter.slice(mid).length) { ctx.fillText(woerter.slice(mid).join(' '), TX, y, TW); y+=tSz+16; }
  }

  // Datum
  if (datumStr) {
    ctx.fillStyle='#444'; ctx.font='bold 16px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(datumStr, TX, y); y+=28;
  }

  // Zusatz-Info
  if (karteOpts.zusatz) {
    ctx.fillStyle='#666'; ctx.font='15px Montserrat, Arial, sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    // Zeilenumbruch bei langen Texten
    const zeilen = slzbWrapText(ctx, karteOpts.zusatz, TW);
    zeilen.slice(0,3).forEach(z=>{ ctx.fillText(z, TX, y); y+=22; });
  }

  // Footer
  ctx.fillStyle='#F0F0F0'; ctx.fillRect(0, H-60, W, 60);
  ctx.fillStyle=akzentFarbe; ctx.fillRect(0, H-60, W, 3);
  ctx.fillStyle='#333'; ctx.font='13px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin · #SLZBerlin', W/2, H-30);
}

// ══════════════════════════════════════════════════════════════
// QR-CODE GENERATOR (Canvas-basiert, kein externes CDN)
// Erzeugt einen einfachen QR-Code als Canvas-Zeichnung
// Für komplexe URLs wird qrcode.js verwendet (via CDN-Fallback)
// ══════════════════════════════════════════════════════════════

// QR-Code auf Canvas zeichnen (nutzt qrcode-generator wenn verfügbar)
async function zeichneQRCode(ctx, x, y, size, url, hintergrund='#fff', vordergrund='#000') {
  // Versuche qrcode-generator zu laden (falls nicht vorhanden: Fallback-Box)
  if (typeof qrcode === 'undefined') {
    // Fallback: Weißes Quadrat mit URL-Text
    ctx.fillStyle = hintergrund;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = vordergrund;
    ctx.font = `bold ${Math.round(size*0.08)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('QR', x+size/2, y+size/2);
    return;
  }
  try {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const moduleCount = qr.getModuleCount();
    const cellSize = size / moduleCount;
    ctx.fillStyle = hintergrund;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = vordergrund;
    for (let row=0; row<moduleCount; row++) {
      for (let col=0; col<moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            x + col*cellSize, y + row*cellSize,
            cellSize, cellSize
          );
        }
      }
    }
  } catch(e) {
    // Fallback
    ctx.fillStyle = hintergrund; ctx.fillRect(x,y,size,size);
    ctx.fillStyle = '#888'; ctx.font=`${Math.round(size*0.1)}px Arial`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('QR', x+size/2, y+size/2);
  }
}

// QR-Code-Konfiguration für SLZB
const SLZB_QR_URLS = {
  website:   'https://tinyurl.com/slzb-erfolge',
  instagram: 'https://www.instagram.com/slzb_berlin/',
};

// ══════════════════════════════════════════════════════════════
// ERSATZBILD-SYSTEM: Sportart-Gradient + SVG-Silhouette
// Wird verwendet wenn kein Foto hochgeladen wurde
// ══════════════════════════════════════════════════════════════

// Sportart-Farbkonfiguration
const SLZB_SPORT_FARBEN = {
  'Schwimmen':        { grad: ['#0a1a3a','#003366','#0066aa'], akzent: '#00aaff' },
  'Para-Schwimmen':   { grad: ['#0a1a3a','#003366','#0066aa'], akzent: '#00aaff' },
  'Wasserspringen':   { grad: ['#0a2a3a','#004466','#0088aa'], akzent: '#00ccff' },
  'Eishockey':        { grad: ['#0a1a2a','#1a3a5a','#2a5a8a'], akzent: '#88ccff' },
  'Eiskunstlaufen':   { grad: ['#1a0a3a','#3a1a6a','#6a3aaa'], akzent: '#cc88ff' },
  'Eisschnelllauf':   { grad: ['#0a1a3a','#1a3a6a','#3a6aaa'], akzent: '#88aaff' },
  'Leichtathletik':   { grad: ['#3a0a0a','#6a1a0a','#aa3a0a'], akzent: '#ff6600' },
  'Judo':             { grad: ['#1a0a0a','#3a1a0a','#6a2a0a'], akzent: '#cc4400' },
  'Boxen':            { grad: ['#2a0a0a','#5a0a0a','#8a1a0a'], akzent: '#ff2200' },
  'Gewichtheben':     { grad: ['#1a1a0a','#3a3a0a','#6a5a0a'], akzent: '#ccaa00' },
  'Basketball':       { grad: ['#2a1a0a','#5a2a0a','#aa5a0a'], akzent: '#ff8800' },
  'Handball':         { grad: ['#0a2a0a','#1a5a1a','#2a8a2a'], akzent: '#44cc44' },
  'Volleyball':       { grad: ['#0a1a3a','#1a3a6a','#2a5aaa'], akzent: '#4488ff' },
  'Volleyball / Beachvolleyball': { grad: ['#2a1a0a','#5a3a0a','#aa7a0a'], akzent: '#ffaa00' },
  'Bogenschießen':    { grad: ['#0a2a0a','#1a4a1a','#2a6a2a'], akzent: '#44aa44' },
  'Radsport':         { grad: ['#1a2a0a','#3a5a0a','#6a8a0a'], akzent: '#aacc00' },
  'Turnen':           { grad: ['#2a0a2a','#5a0a5a','#8a1a8a'], akzent: '#cc44cc' },
  'Gerätturnen männlich': { grad: ['#2a0a2a','#5a0a5a','#8a1a8a'], akzent: '#cc44cc' },
  'Gerätturnen weiblich': { grad: ['#3a0a2a','#6a0a4a','#aa1a7a'], akzent: '#ff44aa' },
  'Fechten':          { grad: ['#1a1a2a','#2a2a5a','#3a3a8a'], akzent: '#8888ff' },
  'default':          { grad: ['#1B1C1F','#2a2c31','#003366'], akzent: '#E2001A' },
};

// SVG-Silhouetten als Path-Daten (vereinfacht, skalierbar)
const SLZB_SPORT_SILHOUETTEN = {
  'schwimmen': `M 0.5 0.25 C 0.5 0.15 0.6 0.1 0.7 0.15 C 0.8 0.2 0.85 0.3 0.8 0.4
    L 0.6 0.55 L 0.3 0.5 L 0.1 0.6 L 0.05 0.5 L 0.25 0.4 L 0.4 0.35 Z`,
  'lauf': `M 0.55 0.1 C 0.55 0.05 0.6 0.02 0.65 0.05 C 0.7 0.08 0.7 0.15 0.65 0.18
    L 0.6 0.3 L 0.7 0.5 L 0.8 0.7 L 0.7 0.72 L 0.6 0.55 L 0.5 0.7 L 0.35 0.95
    L 0.25 0.92 L 0.4 0.65 L 0.3 0.45 L 0.2 0.6 L 0.1 0.55 L 0.15 0.45 L 0.3 0.35
    L 0.45 0.25 Z`,
  'kampf': `M 0.4 0.08 C 0.4 0.03 0.45 0 0.5 0.03 C 0.55 0.06 0.55 0.13 0.5 0.16
    L 0.45 0.3 L 0.6 0.25 L 0.75 0.35 L 0.65 0.45 L 0.5 0.4 L 0.55 0.6 L 0.6 0.8
    L 0.5 0.82 L 0.45 0.62 L 0.35 0.8 L 0.25 0.78 L 0.35 0.55 L 0.3 0.4 L 0.2 0.45
    L 0.15 0.35 L 0.3 0.25 L 0.42 0.28 Z`,
  'ball': `M 0.5 0.08 C 0.5 0.03 0.55 0 0.6 0.03 C 0.65 0.06 0.65 0.13 0.6 0.16
    L 0.55 0.28 L 0.7 0.22 L 0.8 0.35 L 0.65 0.42 L 0.55 0.45 L 0.6 0.65 L 0.55 0.9
    L 0.45 0.9 L 0.4 0.65 L 0.35 0.45 L 0.2 0.42 L 0.15 0.28 L 0.3 0.22 L 0.42 0.28 Z
    M 0.72 0.55 C 0.78 0.5 0.85 0.52 0.85 0.58 C 0.85 0.64 0.78 0.66 0.72 0.62 Z`,
  'eis': `M 0.5 0.06 C 0.5 0.01 0.56 -0.02 0.61 0.01 C 0.66 0.04 0.66 0.11 0.61 0.14
    L 0.55 0.28 L 0.7 0.2 L 0.78 0.32 L 0.62 0.42 L 0.58 0.58 L 0.7 0.72 L 0.78 0.88
    L 0.68 0.92 L 0.55 0.75 L 0.42 0.88 L 0.32 0.84 L 0.45 0.7 L 0.38 0.55 L 0.22 0.42
    L 0.18 0.3 L 0.3 0.22 L 0.44 0.28 Z`,
  'turnen': `M 0.5 0.06 C 0.5 0.01 0.56 -0.02 0.61 0.01 C 0.66 0.04 0.66 0.11 0.61 0.14
    L 0.55 0.25 L 0.75 0.15 L 0.8 0.25 L 0.6 0.38 L 0.65 0.55 L 0.8 0.65 L 0.75 0.75
    L 0.58 0.65 L 0.5 0.8 L 0.42 0.65 L 0.25 0.75 L 0.2 0.65 L 0.35 0.55 L 0.4 0.38
    L 0.2 0.25 L 0.25 0.15 L 0.45 0.25 Z`,
  'ziel': `M 0.3 0.45 L 0.1 0.42 L 0.1 0.38 L 0.3 0.35 L 0.55 0.25 L 0.6 0.1
    C 0.62 0.05 0.68 0.03 0.72 0.06 C 0.76 0.09 0.76 0.15 0.72 0.18
    L 0.65 0.3 L 0.55 0.4 L 0.55 0.6 L 0.65 0.8 L 0.55 0.85 L 0.45 0.65
    L 0.35 0.85 L 0.25 0.8 L 0.35 0.6 Z`,
  'wasser': `M 0.15 0.4 C 0.2 0.3 0.3 0.28 0.4 0.32 L 0.55 0.38 L 0.65 0.25
    C 0.68 0.2 0.75 0.18 0.8 0.22 C 0.85 0.26 0.85 0.33 0.8 0.37
    L 0.7 0.48 L 0.8 0.6 L 0.75 0.65 L 0.62 0.55 L 0.45 0.62 L 0.25 0.68
    L 0.1 0.62 L 0.08 0.52 Z`,
  'kraft': `M 0.5 0.08 C 0.5 0.03 0.56 0 0.61 0.03 C 0.66 0.06 0.66 0.13 0.61 0.16
    L 0.55 0.28 L 0.75 0.22 L 0.85 0.3 L 0.85 0.38 L 0.75 0.38 L 0.6 0.42
    L 0.6 0.62 L 0.65 0.85 L 0.55 0.88 L 0.5 0.65 L 0.45 0.88 L 0.35 0.85
    L 0.4 0.62 L 0.4 0.42 L 0.25 0.38 L 0.15 0.38 L 0.15 0.3 L 0.25 0.22 L 0.45 0.28 Z
    M 0.05 0.28 L 0.15 0.28 L 0.15 0.42 L 0.05 0.42 Z
    M 0.85 0.28 L 0.95 0.28 L 0.95 0.42 L 0.85 0.42 Z`,
  'ausdauer': `M 0.55 0.08 C 0.55 0.03 0.61 0 0.66 0.03 C 0.71 0.06 0.71 0.13 0.66 0.16
    L 0.6 0.25 L 0.7 0.2 L 0.75 0.28 L 0.62 0.38 L 0.58 0.5 L 0.65 0.65
    L 0.55 0.68 L 0.48 0.55 L 0.38 0.68 L 0.28 0.65 L 0.38 0.5 L 0.3 0.35
    L 0.15 0.42 L 0.1 0.32 L 0.28 0.25 L 0.45 0.28
    M 0.3 0.55 C 0.2 0.6 0.1 0.65 0.05 0.72 L 0.12 0.78 C 0.2 0.72 0.32 0.68 0.42 0.65 Z`,
};

// Kategorie-Zuordnung
const SLZB_SPORT_KATEGORIE = {
  'Schwimmen': 'wasser', 'Para-Schwimmen': 'wasser', 'Wasserspringen': 'wasser',
  'Eishockey': 'eis', 'Eiskunstlaufen': 'eis', 'Eisschnelllauf': 'eis',
  'Leichtathletik': 'lauf',
  'Judo': 'kampf', 'Boxen': 'kampf', 'Fechten': 'kampf',
  'Gewichtheben': 'kraft',
  'Basketball': 'ball', 'Handball': 'ball', 'Volleyball': 'ball',
  'Volleyball / Beachvolleyball': 'ball',
  'Bogenschießen': 'ziel',
  'Radsport': 'ausdauer',
  'Turnen': 'turnen', 'Gerätturnen männlich': 'turnen', 'Gerätturnen weiblich': 'turnen',
};

// Hauptfunktion: Ersatzbild zeichnen
function zeichneErsatzbild(ctx, W, H, sportartName) {
  const config = SLZB_SPORT_FARBEN[sportartName] || SLZB_SPORT_FARBEN['default'];
  const kategorie = SLZB_SPORT_KATEGORIE[sportartName] || 'lauf';
  const silhouette = SLZB_SPORT_SILHOUETTEN[kategorie] || SLZB_SPORT_SILHOUETTEN['lauf'];

  // 1. Hintergrund-Gradient (3 Farben, diagonal)
  const grad = ctx.createLinearGradient(0, 0, W*0.3, H);
  grad.addColorStop(0, config.grad[0]);
  grad.addColorStop(0.5, config.grad[1]);
  grad.addColorStop(1, config.grad[2]);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // 2. Dezente geometrische Muster (Kreise)
  ctx.save(); ctx.globalAlpha = 0.06;
  ctx.fillStyle = config.akzent;
  ctx.beginPath(); ctx.arc(W*0.85, H*0.15, W*0.35, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(W*0.1, H*0.8, W*0.25, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // 3. Akzentlinie diagonal
  ctx.save(); ctx.globalAlpha = 0.12;
  ctx.strokeStyle = config.akzent; ctx.lineWidth = W*0.015;
  ctx.beginPath(); ctx.moveTo(0, H*0.6); ctx.lineTo(W*0.7, 0); ctx.stroke();
  ctx.restore();

  // 4. Silhouette zeichnen (zentriert, groß)
  const silH = H * 0.55;
  const silW = silH * 0.8;
  const silX = (W - silW) / 2;
  const silY = H * 0.18;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = config.akzent;

  // SVG-Path skalieren und zeichnen
  const path2D = new Path2D();
  const pathStr = silhouette.replace(/(\d+\.?\d*)/g, (match, num) => {
    // Koordinaten sind 0-1, skalieren auf Canvas
    return num; // Wird unten per transform skaliert
  });

  ctx.save();
  ctx.translate(silX, silY);
  ctx.scale(silW, silH);

  // Path manuell zeichnen (Path2D mit SVG-Syntax)
  try {
    const p = new Path2D(silhouette);
    ctx.fill(p);
  } catch(e) {
    // Fallback: einfacher Kreis
    ctx.beginPath(); ctx.arc(0.5, 0.4, 0.3, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
  ctx.restore();

  // 5. Sportart-Text als großes Wasserzeichen
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold italic ${Math.round(W*0.12)}px Montserrat, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(sportartName.toUpperCase(), W/2, H*0.5);
  ctx.restore();
}

// Integration in zeichneSlzbHintergrund: Ersatzbild wenn kein Foto
const _origZeichneSlzbHintergrund = zeichneSlzbHintergrund;
// Überschreibe nicht – stattdessen neue Funktion für Poster-Layouts
function zeichneSlzbHintergrundMitFallback(ctx, W, H, bild, akzent, sportartName) {
  if (bild) {
    zeichneSlzbHintergrund(ctx, W, H, bild, akzent);
  } else {
    // Kein Bild: Sportart-Gradient + Silhouette
    // Reihenfolge: 1. Hintergrund, 2. Silhouette, 3. Fade (Fade muss oben liegen!)
    zeichneErsatzbild(ctx, W, H, sportartName || '');
    // Fade NACH der Silhouette zeichnen – immer rot (SLZB-Sporterfolg-Stil)
    const grad4 = ctx.createLinearGradient(0, 0, 0, H);
    grad4.addColorStop(0,   'rgba(0,0,0,0.15)');
    grad4.addColorStop(0.35,'rgba(0,0,0,0.20)');
    grad4.addColorStop(0.65,'rgba(115,0,10,0.55)');
    grad4.addColorStop(1,   'rgba(180,0,20,0.92)');
    ctx.fillStyle = grad4; ctx.fillRect(0, 0, W, H);
  }
}
