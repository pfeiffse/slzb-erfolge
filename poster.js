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

  // Fade unten am Bildrand
  const fadeGrad = ctx.createLinearGradient(0, fotoH-120, 0, fotoH);
  fadeGrad.addColorStop(0, 'rgba(27,28,31,0)');
  fadeGrad.addColorStop(1, 'rgba(27,28,31,1)');
  ctx.fillStyle = fadeGrad; ctx.fillRect(0, fotoH-120, W, 120);

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

  // Bild als Vollhintergrund (obere 75%)
  const fotoH = Math.round(H*0.75);
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,fotoH); ctx.clip();
  drawCover(ctx, bild, 0, 0, W, fotoH);
  ctx.restore();

  // Starker Fade erst ganz unten
  const fadeGrad = ctx.createLinearGradient(0, fotoH-200, 0, fotoH);
  fadeGrad.addColorStop(0, 'rgba(27,28,31,0)');
  fadeGrad.addColorStop(0.5, 'rgba(226,0,26,0.3)');
  fadeGrad.addColorStop(1, 'rgba(27,28,31,1)');
  ctx.fillStyle = fadeGrad; ctx.fillRect(0, fotoH-200, W, 200);

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

  // Bild oben 50%
  const fotoH = Math.round(H*0.50);
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,fotoH); ctx.clip();
  drawCover(ctx, bild, 0, 0, W, fotoH); ctx.restore();

  // Fade NUR ganz unten am Bildrand (letzte 15%)
  const fadeStart = fotoH - fotoH*0.15;
  const fadeGrad = ctx.createLinearGradient(0, fadeStart, 0, fotoH);
  fadeGrad.addColorStop(0,'rgba(27,28,31,0)');
  fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
  ctx.fillStyle=fadeGrad; ctx.fillRect(0, fadeStart, W, fotoH-fadeStart);

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

  // Bild als Vollhintergrund
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip();
  drawCover(ctx, bild, 0, 0, W, H); ctx.restore();

  // Fade NUR ganz unten (letzte 30%)
  const fadeStart = H*0.70;
  const fadeGrad = ctx.createLinearGradient(0, fadeStart, 0, H-80);
  fadeGrad.addColorStop(0,'rgba(27,28,31,0)');
  fadeGrad.addColorStop(0.5,'rgba(226,0,26,0.25)');
  fadeGrad.addColorStop(1,'rgba(27,28,31,0.95)');
  ctx.fillStyle=fadeGrad; ctx.fillRect(0, fadeStart, W, H-80-fadeStart);

  zeichneTextbereich(ctx, e, W, H, fadeStart+20, mColor, sportart, platz, medaille, titel);
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
    // Bild obere 65%
    const fotoH = Math.round(H*0.65);
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,fotoH); ctx.clip();
    drawCover(ctx, bild, 0, 0, W, fotoH); ctx.restore();
    // Fade ganz unten am Bildrand
    const fadeStart = fotoH - fotoH*0.12;
    const fadeGrad = ctx.createLinearGradient(0, fadeStart, 0, fotoH);
    fadeGrad.addColorStop(0,'rgba(27,28,31,0)');
    fadeGrad.addColorStop(1,'rgba(27,28,31,1)');
    ctx.fillStyle=fadeGrad; ctx.fillRect(0, fadeStart, W, fotoH-fadeStart);
    zeichneTextbereich(ctx, e, W, H, fotoH+10, mColor, sportart, platz, medaille, titel);
  } else {
    zeichneTextbereich(ctx, e, W, H, H*0.25, mColor, sportart, platz, medaille, titel);
  }

  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx, W, H);
}

// ── A3 VARIANTE 2: Split (Bild links, Text rechts) ───────────
async function zeichneA3Split(canvasId, e) {
  // Alias für Portrait-Layout
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  await ladeMontserrat(); await ladeLogo();
  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;
  await zeichneA3Portrait(canvas, e, bild, hauptbild);
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
