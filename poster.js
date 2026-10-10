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
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  // Hintergrund
  ctx.fillStyle = SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // Bild oben (55%)
  const fotoH = Math.round(H*0.55);
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,fotoH); ctx.clip();
  drawCover(ctx, bild, 0, 0, W, fotoH);
  ctx.restore();

  // Fade: startet bei 70% der Bildhöhe, läuft bis Canvas-Ende (deckt Text ab)
  const fadeGrad = ctx.createLinearGradient(0, fotoH*0.70, 0, H);
  fadeGrad.addColorStop(0, 'rgba(27,28,31,0)');
  fadeGrad.addColorStop(0.4, 'rgba(27,28,31,0.92)');
  fadeGrad.addColorStop(1, 'rgba(27,28,31,1)');
  ctx.fillStyle = fadeGrad; ctx.fillRect(0, fotoH*0.70, W, H - fotoH*0.70);

  // Textbereich unten
  zeichneTextbereich(ctx, e, W, H, fotoH, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
}

// Layout 2: Hochformat-Bild → Bild als Vollhintergrund, Text unten
async function zeichnePosterPortrait(ctx, e, bild, meta) {
  const W=1080, H=1350;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  // Hintergrund
  ctx.fillStyle = SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // Bild als Vollhintergrund (volle Höhe)
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip();
  drawCover(ctx, bild, 0, 0, W, H);
  ctx.restore();

  // Fade: startet bei 45% der Canvas-Höhe, läuft bis Canvas-Ende (deckt Text ab)
  const fadeGrad = ctx.createLinearGradient(0, H*0.45, 0, H);
  fadeGrad.addColorStop(0, 'rgba(27,28,31,0)');
  fadeGrad.addColorStop(0.2, 'rgba(226,0,26,0.12)');
  fadeGrad.addColorStop(0.5, 'rgba(27,28,31,0.92)');
  fadeGrad.addColorStop(1, 'rgba(27,28,31,1)');
  ctx.fillStyle = fadeGrad; ctx.fillRect(0, H*0.45, W, H*0.55);

  const fotoH = Math.round(H*0.65); // Textbereich beginnt bei 65%
  zeichneTextbereich(ctx, e, W, H, fotoH, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
}

// Layout 3: Kein Bild → Dunkles Poster
async function zeichnePosterKeinBild(ctx, e) {
  const W=1080, H=1350;
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0a0a1e'); grad.addColorStop(1,'#1B1C1F');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

  // Große Platzierungszahl als Hintergrund-Element
  if (platz) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = mColor;
    ctx.font = `bold italic 600px Montserrat, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(platz), W/2, H/2);
    ctx.restore();
  }

  zeichneTextbereich(ctx, e, W, H, H*0.35, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
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

// Fußzeile
function zeichneFusszeile(ctx, W, H) {
  ctx.fillStyle = SLZB_COLORS.bgDark; ctx.fillRect(0, H-80, W, 80);
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

  zeichneA3Footer(ctx, W, H, meta);
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

  zeichneA3Footer(ctx, W, H, meta);
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

  zeichneA3Footer(ctx, W, H, null);
}

function zeichneA3Footer(ctx, W, H, meta) {
  ctx.fillStyle='#F0F0F0'; ctx.fillRect(0, H-60, W, 60);
  ctx.fillStyle=SLZB_COLORS.blue; ctx.fillRect(0, H-60, W, 3);
  ctx.fillStyle='#333'; ctx.font='13px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  let footer = 'Schul- und Leistungssportzentrum Berlin · #SLZBerlin';
  if (meta?.creator) footer += ` · Foto: ${meta.creator}`;
  ctx.fillText(footer, W/2, H-30);
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
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  ctx.fillStyle=SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // Bild volle Breite, obere 55%
  const fotoH = Math.round(H*0.55);
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,fotoH); ctx.clip();
  drawCover(ctx, bild, 0, 0, W, fotoH); ctx.restore();

  // Fade: startet bei 70% der Bildhöhe, läuft bis Canvas-Ende (deckt Text ab)
  const fadeGrad = ctx.createLinearGradient(0, fotoH*0.70, 0, H);
  fadeGrad.addColorStop(0,'rgba(27,28,31,0)');
  fadeGrad.addColorStop(0.35,'rgba(27,28,31,0.92)');
  fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
  ctx.fillStyle=fadeGrad; ctx.fillRect(0, fotoH*0.70, W, H - fotoH*0.70);

  zeichneTextbereich(ctx, e, W, H, fotoH, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
}

// Social Beitrag: Hochformat-Bild (Vollhintergrund)
async function zeichneSocialBeitragPortrait(ctx, e, bild, meta, W, H) {
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  ctx.fillStyle=SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  // Bild als Vollhintergrund (volle Canvas-Höhe)
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip();
  drawCover(ctx, bild, 0, 0, W, H); ctx.restore();

  // Fade: startet bei 40% der Canvas-Höhe, läuft bis Canvas-Ende (deckt Text ab)
  const fadeGrad = ctx.createLinearGradient(0, H*0.40, 0, H);
  fadeGrad.addColorStop(0,'rgba(27,28,31,0)');
  fadeGrad.addColorStop(0.15,'rgba(226,0,26,0.12)');
  fadeGrad.addColorStop(0.45,'rgba(27,28,31,0.92)');
  fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
  ctx.fillStyle=fadeGrad; ctx.fillRect(0, H*0.40, W, H*0.60);

  zeichneTextbereich(ctx, e, W, H, H*0.65, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
}

// Social Beitrag: Kein Bild
async function zeichneSocialBeitragKeinBild(ctx, e, W, H) {
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0a0a1e'); grad.addColorStop(1,'#1B1C1F');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  if (platz) {
    ctx.save(); ctx.globalAlpha=0.06; ctx.fillStyle=mColor;
    ctx.font=`bold italic 600px Montserrat, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(platz), W/2, H/2); ctx.restore();
  }
  zeichneTextbereich(ctx, e, W, H, H*0.30, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
}

// Social Story/Reel (1080×1920)
async function zeichneSocialStory(ctx, e, bild, meta, W, H) {
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz = e.platzierung || '';
  const medaille = e.medaille && e.medaille!=='keine' ? e.medaille : '';
  const mColor = medailleColor(medaille);
  const titel = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');

  ctx.fillStyle=SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

  if (bild) {
    // Bild obere 65% der Canvas-Höhe
    const fotoH = Math.round(H*0.65);
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,fotoH); ctx.clip();
    drawCover(ctx, bild, 0, 0, W, fotoH); ctx.restore();
    // Fade: startet bei 70% der Bildhöhe, läuft bis Canvas-Ende (deckt Text ab)
    const fadeGrad = ctx.createLinearGradient(0, fotoH*0.70, 0, H);
    fadeGrad.addColorStop(0,'rgba(27,28,31,0)');
    fadeGrad.addColorStop(0.3,'rgba(27,28,31,0.92)');
    fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
    ctx.fillStyle=fadeGrad; ctx.fillRect(0, fotoH*0.70, W, H - fotoH*0.70);
    zeichneTextbereich(ctx, e, W, H, fotoH+10, mColor, sportart, platz, medaille, titel);
  } else {
    zeichneTextbereich(ctx, e, W, H, H*0.25, mColor, sportart, platz, medaille, titel);
  }

  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
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

  // Dunkler Hintergrund
  ctx.fillStyle = SLZB_COLORS.bg; ctx.fillRect(0,0,W,H);

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

  // Blauer Header
  ctx.fillStyle='rgba(0,51,102,0.92)'; ctx.fillRect(0,0,W,80);
  const lw = drawLogo(ctx, 16, 6, 68);
  ctx.fillStyle='#fff'; ctx.font='bold 18px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, 40);
  ctx.font='bold italic 18px Montserrat, Arial, sans-serif';
  ctx.textAlign='right'; ctx.fillStyle=SLZB_COLORS.pinkLight;
  ctx.fillText('#SLZBerlin', W-20, 40);

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

  // Footer
  ctx.fillStyle='rgba(0,51,102,0.88)'; ctx.fillRect(0, H-FOOTER_H, W, FOOTER_H);
  ctx.fillStyle='#fff'; ctx.font='13px Montserrat, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin · #SLZBerlin', W/2, H-FOOTER_H/2);
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
  let y = H*0.60;
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

  // Fade
  const fadeGrad = ctx.createLinearGradient(0, fotoH-100, 0, fotoH);
  fadeGrad.addColorStop(0,'rgba(27,28,31,0)'); fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
  ctx.fillStyle=fadeGrad; ctx.fillRect(0, fotoH-100, W, 100);

  zeichneTextbereich(ctx, e, W, H, fotoH, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
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

  // Fade
  const fadeGrad = ctx.createLinearGradient(0, gridH-80, 0, gridH);
  fadeGrad.addColorStop(0,'rgba(27,28,31,0)'); fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
  ctx.fillStyle=fadeGrad; ctx.fillRect(0, gridH-80, W, 80);

  zeichneTextbereich(ctx, e, W, H, gridH, mColor, sportart, platz, medaille, titel);
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
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
  ctx.fillStyle=SLZB_COLORS.white;
  ctx.font='bold 15px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  if (wettbewerb) ctx.fillText(wettbewerb.toUpperCase(), textX, HEADER_H - 50);
  ctx.fillStyle=SLZB_COLORS.red;
  ctx.font='bold 11px Montserrat, Arial, sans-serif';
  if (disziplin) ctx.fillText(disziplin.toUpperCase(), textX, HEADER_H - 28);

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
  ctx.fillStyle = 'rgba(18,19,21,0.95)'; ctx.fillRect(0, H-FH, W, FH);
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

  // Sportart + Trennlinie
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 20px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(sportart.toUpperCase(), TX, y); y+=28;
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
  ctx.fillText(sportart.toUpperCase(), 206, 64);

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
  ctx.fillText(sportart.toUpperCase()||'SLZB BERLIN', 194, 58);

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
    const fg = ctx.createLinearGradient(0, FOTO_H*0.65, 0, H);
    fg.addColorStop(0,'rgba(27,28,31,0)');
    fg.addColorStop(0.12,'rgba(226,0,26,0.12)');
    fg.addColorStop(0.35,'rgba(27,28,31,0.92)');
    fg.addColorStop(1,'rgba(27,28,31,1)');
    ctx.fillStyle=fg; ctx.fillRect(0, FOTO_H*0.65, W, H - FOTO_H*0.65);
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
  ctx.fillStyle=SLZB_COLORS.white; ctx.font='bold 15px Montserrat, Arial, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText(wettbewerb.toUpperCase()||sportart.toUpperCase(), 182, 32);
  ctx.fillStyle=SLZB_COLORS.red; ctx.font='bold 10px Montserrat, Arial, sans-serif';
  ctx.fillText('EHRUNG', 182, 56);

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
