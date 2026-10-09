// ============================================================
// SLZB-Erfolge v3 – Poster-Generator
// Format: 1080×1350px (4:5 Hochformat)
// Stil: SLZB Sport-Erfolgsposter (Montserrat Bold Italic)
// ============================================================

// ── Farben ───────────────────────────────────────────────────
const SLZB_COLORS = {
  bg:        '#1B1C1F',   // Grundfläche Anthrazit
  bgDark:    '#121315',   // Dunkle Überlagerungen
  bgMid:     '#2A2C31',   // Dezente Abstufungen
  red:       '#E2001A',   // Hauptakzent Rot
  white:     '#FFFFFF',   // Haupttext
  gray1:     '#C9CCD2',   // Sekundärtext
  gray2:     '#DDE0E4',   // Sekundärtext hell
  gold:      '#E3B23C',   // Gold
  silver:    '#BFC8D2',   // Silber
  bronze:    '#C2783A',   // Bronze
  blue:      '#0B63CE',   // Blauer Themenakzent
  pinkLight: '#FFD2D6',   // Heller Akzent
};

const W = 1080, H = 1350; // 4:5 Hochformat

// ── Schrift laden ────────────────────────────────────────────
async function ladeMontserrat() {
  if (document.fonts) {
    try {
      await document.fonts.load('bold italic 60px Montserrat');
      await document.fonts.load('bold 60px Montserrat');
      await document.fonts.load('60px Montserrat');
    } catch(e) { console.warn('Montserrat nicht geladen:', e.message); }
  }
}

// ── Hilfsfunktionen ──────────────────────────────────────────
function slzbRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

function slzbText(ctx, text, x, y, font, color, align='center', maxWidth=null) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

function slzbWrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function medailleColor(medaille) {
  if (!medaille || medaille === 'keine') return SLZB_COLORS.white;
  const m = medaille.toLowerCase();
  if (m === 'gold') return SLZB_COLORS.gold;
  if (m === 'silber') return SLZB_COLORS.silver;
  if (m === 'bronze') return SLZB_COLORS.bronze;
  return SLZB_COLORS.white;
}

// ── Bild laden ───────────────────────────────────────────────
async function ladeBild(url) {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ── Kopfzeile ────────────────────────────────────────────────
function zeichneKopfzeile(ctx, wettbewerb, disziplin) {
  // Logo-Box
  ctx.fillStyle = SLZB_COLORS.red;
  slzbRoundRect(ctx, 54, 28, 130, 65, 6);
  ctx.fill();
  ctx.fillStyle = SLZB_COLORS.white;
  ctx.font = 'bold 26px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SLZB', 119, 61);

  // Senkrechte Akzentlinie
  ctx.fillStyle = SLZB_COLORS.red;
  ctx.fillRect(200, 36, 3, 49);

  // Veranstaltungsname
  ctx.font = 'bold 17px Montserrat, Arial, sans-serif';
  ctx.fillStyle = SLZB_COLORS.white;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText((wettbewerb || 'SLZB BERLIN').toUpperCase(), 218, 32);

  // Unterzeile
  ctx.font = 'bold 10.5px Montserrat, Arial, sans-serif';
  ctx.fillStyle = SLZB_COLORS.red;
  ctx.fillText((disziplin || 'SCHUL- UND LEISTUNGSSPORTZENTRUM BERLIN').toUpperCase(), 220, 62);
}

// ── Fußzeile ─────────────────────────────────────────────────
function zeichneFusszeile(ctx) {
  // Dunkler Fußbereich
  ctx.fillStyle = SLZB_COLORS.bgDark;
  ctx.fillRect(0, 1128, W, H - 1128);

  // Schulname
  ctx.font = 'bold 18px Montserrat, Arial, sans-serif';
  ctx.fillStyle = SLZB_COLORS.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Schul- und Leistungssportzentrum Berlin', W/2, 1224);

  // Rote Akzentlinie
  ctx.fillStyle = SLZB_COLORS.red;
  ctx.fillRect((W - 360) / 2, 1272, 360, 2);

  // Hashtag: #SLZB weiß, erlin rosa
  ctx.font = 'bold italic 30px Montserrat, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const hashY = 1282;
  const hashText = '#SLZBerlin';
  const totalW = ctx.measureText(hashText).width;
  const startX = W/2 - totalW/2;

  ctx.fillStyle = SLZB_COLORS.white;
  ctx.fillText('#SLZB', startX + ctx.measureText('#SLZB').width/2, hashY);

  const slzbW = ctx.measureText('#SLZB').width;
  ctx.fillStyle = SLZB_COLORS.pinkLight;
  ctx.textAlign = 'left';
  ctx.fillText('erlin', startX + slzbW, hashY);
}

// ── Foto-Ergebnisposter (Hauptvorlage) ───────────────────────
async function zeichneErgebnisposter(ctx, e, hauptbild) {
  const sportart  = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const platz     = e.platzierung || '';
  const medaille  = e.medaille && e.medaille !== 'keine' ? e.medaille : '';
  const mColor    = medailleColor(medaille);
  const titelSauber = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const ergebnis  = e.ergebnisWert ? `${e.ergebnisWert} ${e.ergebnisEinheit||''}` : '';

  // ── Grundfläche ──────────────────────────────────────────
  ctx.fillStyle = SLZB_COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // ── Foto (obere 70%) ─────────────────────────────────────
  if (hauptbild) {
    const fotoH = Math.round(H * 0.70);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, fotoH);
    ctx.clip();
    const scale = Math.max(W/hauptbild.width, fotoH/hauptbild.height);
    const sw = hauptbild.width*scale, sh = hauptbild.height*scale;
    ctx.drawImage(hauptbild, (W-sw)/2, (fotoH-sh)/2, sw, sh);
    ctx.restore();

    // Roter Transparenzverlauf über Foto (unten)
    const grad = ctx.createLinearGradient(0, 604, 0, 1128);
    grad.addColorStop(0,   'rgba(226,0,26,0)');
    grad.addColorStop(0.3, 'rgba(226,0,26,0.30)');
    grad.addColorStop(1,   'rgba(226,0,26,0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 604, W, 1128 - 604);
  } else {
    // Kein Foto: Gradient-Hintergrund
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1B1C1F');
    grad.addColorStop(1, '#0a0a14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Transparente Ergebnisfläche ───────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.52;
  ctx.fillStyle = SLZB_COLORS.bgDark;
  slzbRoundRect(ctx, 48, 631, 984, 346, 12);
  ctx.fill();
  ctx.restore();

  // Dünner weißer Rahmen
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.strokeStyle = SLZB_COLORS.white;
  ctx.lineWidth = 1.5;
  slzbRoundRect(ctx, 48, 631, 984, 346, 12);
  ctx.stroke();
  ctx.restore();

  // ── Kategorie (klein, rot) ────────────────────────────────
  ctx.font = 'bold 13px Montserrat, Arial, sans-serif';
  ctx.fillStyle = SLZB_COLORS.red;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(sportart.toUpperCase(), W/2, 648);

  // ── Titel zweizeilig (weiß / rot) ─────────────────────────
  // Titel aufteilen: erste Hälfte weiß, zweite rot
  const titelWoerter = titelSauber.toUpperCase().split(' ');
  const mid = Math.ceil(titelWoerter.length / 2);
  const zeile1 = titelWoerter.slice(0, mid).join(' ');
  const zeile2 = titelWoerter.slice(mid).join(' ');

  ctx.font = 'bold italic 50px Montserrat, Arial, sans-serif';
  ctx.fillStyle = SLZB_COLORS.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(zeile1, W/2, 685);

  if (zeile2) {
    ctx.fillStyle = SLZB_COLORS.red;
    ctx.fillText(zeile2, W/2, 754);
  }

  // ── Platzierungsabzeichen ─────────────────────────────────
  if (platz) {
    const ovalY = 870;
    const ovalW = 120, ovalH = 60;
    const ovalX = W/2 - ovalW/2 - 80;

    // Oval
    ctx.fillStyle = mColor;
    slzbRoundRect(ctx, ovalX, ovalY, ovalW, ovalH, 30);
    ctx.fill();

    // Weißer Rahmen
    ctx.strokeStyle = SLZB_COLORS.white;
    ctx.lineWidth = 2;
    slzbRoundRect(ctx, ovalX, ovalY, ovalW, ovalH, 30);
    ctx.stroke();

    // Rangzahl im Oval
    ctx.font = 'bold italic 36px Montserrat, Arial, sans-serif';
    ctx.fillStyle = SLZB_COLORS.bgDark;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(platz), ovalX + ovalW/2, ovalY + ovalH/2);

    // Platzierungstext rechts
    const platzText = platz === 1 ? '1. PLATZ' : platz === 2 ? '2. PLATZ' : platz === 3 ? '3. PLATZ' : `${platz}. PLATZ`;
    const platzLabel = platz === 1 ? 'BUNDESSIEGER' : platz === 2 ? 'VIZE-BUNDESSIEGER' : platz === 3 ? 'BRONZE' : '';

    ctx.font = 'bold italic 27px Montserrat, Arial, sans-serif';
    ctx.fillStyle = SLZB_COLORS.white;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(platzText, ovalX + ovalW + 20, ovalY + 4);

    if (platzLabel) {
      ctx.font = 'bold 12px Montserrat, Arial, sans-serif';
      ctx.fillStyle = mColor;
      ctx.fillText(platzLabel, ovalX + ovalW + 20, ovalY + 38);
    }

    if (ergebnis) {
      ctx.font = '16px Montserrat, Arial, sans-serif';
      ctx.fillStyle = SLZB_COLORS.gray1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(ergebnis, W/2, 942);
    }
  }

  // ── Kopfzeile ─────────────────────────────────────────────
  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);

  // ── Fußzeile ──────────────────────────────────────────────
  zeichneFusszeile(ctx);
}

// ── Dunkle Übersichtsfolie (ohne Foto) ───────────────────────
async function zeichneUebersichtsfolie(ctx, e) {
  const sportart = e.sportartText || SLZB_DB.getSportart(e.sportartId)?.name || '';
  const titelSauber = (e.titel||'').replace('[SYNTHETISCH] ','').replace('[Aus Artikel] ','');
  const kurzinfo = e.kurzinfo || '';

  // Grundfläche
  ctx.fillStyle = SLZB_COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Roter Verlauf unten
  const grad = ctx.createLinearGradient(0, 900, 0, 1128);
  grad.addColorStop(0, 'rgba(226,0,26,0)');
  grad.addColorStop(1, 'rgba(226,0,26,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 900, W, 228);

  // Kategorie
  ctx.font = 'bold 13px Montserrat, Arial, sans-serif';
  ctx.fillStyle = SLZB_COLORS.red;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(sportart.toUpperCase(), W/2, 300);

  // Titel
  const titelWoerter = titelSauber.toUpperCase().split(' ');
  const mid = Math.ceil(titelWoerter.length / 2);
  ctx.font = 'bold italic 54px Montserrat, Arial, sans-serif';
  ctx.fillStyle = SLZB_COLORS.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(titelWoerter.slice(0, mid).join(' '), W/2, 340);
  ctx.fillStyle = SLZB_COLORS.red;
  ctx.fillText(titelWoerter.slice(mid).join(' '), W/2, 420);

  // Kurzinfo
  if (kurzinfo) {
    ctx.font = '16px Montserrat, Arial, sans-serif';
    ctx.fillStyle = SLZB_COLORS.gray1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const zeilen = slzbWrapText(ctx, kurzinfo, W - 120);
    zeilen.slice(0,4).forEach((z,i) => ctx.fillText(z, W/2, 560 + i*28));
  }

  zeichneKopfzeile(ctx, e.wettbewerbText, e.disziplin);
  zeichneFusszeile(ctx);
}

// ── Haupt-Zeichenfunktion ────────────────────────────────────
async function zeichneSLZBPoster(canvasId, e) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  await ladeMontserrat();

  const hauptbild = (e.bilder||[]).find(b=>b.signedUrl) || null;
  const bild = hauptbild ? await ladeBild(hauptbild.signedUrl) : null;

  if (bild) {
    await zeichneErgebnisposter(ctx, e, bild);
  } else {
    await zeichneUebersichtsfolie(ctx, e);
  }
}

// ── PNG-Export ───────────────────────────────────────────────
function exportPosterPNG(e, canvasId='social-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) { toast('Canvas nicht gefunden','danger'); return; }
  const dateiname = `SLZB_Poster_${e.erfolgNr||'ERF'}_${new Date().toISOString().slice(0,10)}.png`;
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = dateiname; a.click();
    URL.revokeObjectURL(url);
    toast(`PNG heruntergeladen: ${dateiname}`,'success');
  }, 'image/png');
}