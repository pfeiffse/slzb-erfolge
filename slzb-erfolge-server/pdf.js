// ============================================================
// SLZB-Erfolge v2 – PDF & Export (kein CDN nötig)
// ============================================================

const PDF = {

  // ── A3-Aushang (HTML-basiert, druckbar) ──────────────────
  zeigeA3Vorschau(erfolg, beteiligte) {
    const sp  = SLZB_DB.getSportart(erfolg.sportartId);
    const wb  = SLZB_DB.getWettbewerb(erfolg.wettbewerbId);
    const mi  = {Gold:'🥇',Silber:'🥈',Bronze:'🥉'};
    const fmt = (d)=>d?new Date(d).toLocaleDateString('de-DE'):'–';

    const freigegebeneNamen = (beteiligte||[])
      .filter(b=>SLZB_DB.pruefeEinwilligung(b.schuelerId,'print').ok)
      .map(b=>SLZB_DB.getSchueler(b.schuelerId)?.anzeigename||b.schuelerId);
    const gesperrte = (beteiligte||[])
      .filter(b=>!SLZB_DB.pruefeEinwilligung(b.schuelerId,'print').ok);

    const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8">
<title>A3-Aushang – ${erfolg.titel}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; background:#fff; }
  .a3 { width:297mm; min-height:420mm; padding:15mm; }
  .header { background:#003366; color:#fff; padding:16mm 12mm; border-radius:8px 8px 0 0; }
  .logo { font-size:11pt; opacity:.8; margin-bottom:4mm; }
  .titel { font-size:22pt; font-weight:800; line-height:1.2; }
  .sub { font-size:12pt; opacity:.85; margin-top:3mm; }
  .result-box { background:#F5A800; border-radius:8px; padding:10mm; text-align:center; margin:8mm 0; }
  .platz { font-size:60pt; font-weight:900; color:#003366; line-height:1; }
  .medaille { font-size:24pt; }
  .ergebnis { font-size:14pt; color:#003366; font-weight:600; margin-top:3mm; }
  .info-row { display:flex; gap:8mm; flex-wrap:wrap; margin:6mm 0; font-size:10pt; color:#555; }
  .namen { font-size:13pt; font-weight:700; color:#003366; margin:4mm 0; }
  .kurzinfo { font-size:10pt; color:#666; margin-top:4mm; }
  .footer { background:#F4F6FA; padding:6mm 12mm; display:flex; justify-content:space-between; font-size:8pt; color:#999; border-radius:0 0 8px 8px; margin-top:8mm; }
  .datenschutz-warn { background:#FEF2F2; border:1px solid #FECACA; border-radius:6px; padding:6mm; margin:4mm 0; font-size:9pt; color:#991B1B; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
<div class="a3">
  <div class="header">
    <div class="logo">🏫 Schul- und Leistungssportzentrum Berlin</div>
    <div class="titel">${erfolg.titel.replace('[SYNTHETISCH] ','')}</div>
    <div class="sub">${sp?.name||''}${erfolg.disziplin?' · '+erfolg.disziplin:''}</div>
  </div>
  <div style="padding:0 0 8mm">
    ${gesperrte.length?`<div class="datenschutz-warn">⚠️ Datenschutzhinweis: ${gesperrte.length} Person(en) ohne Print-Freigabe wurden nicht namentlich genannt.</div>`:''}
    <div class="result-box">
      <div class="platz">${erfolg.platzierung?erfolg.platzierung+'.':'–'}</div>
      <div class="medaille">${erfolg.medaille&&erfolg.medaille!=='keine'?mi[erfolg.medaille]||'':''}</div>
      <div class="ergebnis">${erfolg.ergebnisWert?erfolg.ergebnisWert+' '+(erfolg.ergebnisEinheit||''):erfolg.ergebnisText||''}</div>
    </div>
    <div class="info-row">
      <span>📍 <strong>Wettbewerb:</strong> ${wb?.name||'–'}</span>
      <span>📅 <strong>Datum:</strong> ${fmt(erfolg.datum)}</span>
      <span>🏟 <strong>Ort:</strong> ${erfolg.ort||'–'}</span>
      <span>🏆 <strong>Ebene:</strong> ${erfolg.ebene||'–'}</span>
    </div>
    ${freigegebeneNamen.length?`<div class="namen">👤 ${freigegebeneNamen.join(' · ')}</div>`:''}
    <div class="kurzinfo">${erfolg.kurzinfo||''}</div>
  </div>
  <div class="footer">
    <span>SLZB-Erfolge · ${new Date().toLocaleDateString('de-DE')}</span>
    <span>SLZB_A3_${erfolg.erfolgNr||'ERF'}_${new Date().toISOString().slice(0,10)}.pdf</span>
  </div>
</div>
</body></html>`;

    const win = window.open('','_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(()=>win.print(), 800);
    }
  },

  // ── Bildschirm-HTML ───────────────────────────────────────
  erzeugeScreenHTML(erfolg, beteiligte) {
    const sp  = SLZB_DB.getSportart(erfolg.sportartId);
    const mi  = {Gold:'🥇',Silber:'🥈',Bronze:'🥉'};
    const namen = (beteiligte||[])
      .filter(b=>SLZB_DB.pruefeEinwilligung(b.schuelerId,'digitalSignage').ok)
      .map(b=>SLZB_DB.getSchueler(b.schuelerId)?.anzeigename||b.schuelerId);

    const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8">
<title>SLZB Bildschirm</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:960px;height:1080px;overflow:hidden;background:#003366;color:#fff;
       font-family:'Segoe UI',Arial,sans-serif;display:flex;flex-direction:column;}
  .header{background:#E8001D;padding:20px 30px;font-size:14px;font-weight:700;text-align:center;letter-spacing:.1em;text-transform:uppercase;}
  .body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;gap:16px;}
  .platz{font-size:200px;font-weight:900;line-height:1;}
  .medaille{font-size:80px;}
  .sport{font-size:24px;opacity:.8;margin-top:10px;}
  .titel{font-size:32px;font-weight:700;line-height:1.3;max-width:800px;}
  .ergebnis{font-size:28px;color:#F5A800;font-weight:600;}
  .namen{font-size:22px;opacity:.9;margin-top:10px;}
  .meta{font-size:18px;opacity:.6;}
  .footer{background:rgba(0,0,0,.4);padding:16px 30px;font-size:14px;text-align:center;opacity:.8;}
</style></head><body>
  <div class="header">🏫 Schul- und Leistungssportzentrum Berlin</div>
  <div class="body">
    <div class="platz">${erfolg.platzierung?erfolg.platzierung+'.':'–'}</div>
    <div class="medaille">${erfolg.medaille&&erfolg.medaille!=='keine'?mi[erfolg.medaille]||'':''}</div>
    <div class="sport">${sp?.name||''}${erfolg.disziplin?' · '+erfolg.disziplin:''}</div>
    <div class="titel">${erfolg.titel.replace('[SYNTHETISCH] ','')}</div>
    ${erfolg.ergebnisWert?`<div class="ergebnis">${erfolg.ergebnisWert} ${erfolg.ergebnisEinheit||''}</div>`:''}
    ${namen.length?`<div class="namen">👤 ${namen.slice(0,3).join(' · ')}${namen.length>3?' + '+(namen.length-3)+' weitere':''}</div>`:''}
    <div class="meta">${erfolg.datum?new Date(erfolg.datum).toLocaleDateString('de-DE'):''} ${erfolg.ort?'· '+erfolg.ort:''}</div>
  </div>
  <div class="footer">Anzeigedauer: 15 Sekunden · SLZB-Erfolge</div>
</body></html>`;

    const blob = new Blob([html],{type:'text/html;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download=`SLZB_Bildschirm_${erfolg.erfolgNr||'ERF'}_${new Date().toISOString().slice(0,10)}.html`;
    a.click(); URL.revokeObjectURL(url);
  },

  // ── Social-Media-Paket ────────────────────────────────────
  erzeugeSocialMediaPaket(erfolg, beteiligte) {
    const sp = SLZB_DB.getSportart(erfolg.sportartId);
    const wb = SLZB_DB.getWettbewerb(erfolg.wettbewerbId);
    const smOk  = (beteiligte||[]).filter(b=>SLZB_DB.pruefeEinwilligung(b.schuelerId,'socialMedia').ok);
    const smNok = (beteiligte||[]).filter(b=>!SLZB_DB.pruefeEinwilligung(b.schuelerId,'socialMedia').ok);
    const titelSauber = erfolg.titel.replace('[SYNTHETISCH] ','');

    const textLang = `[KI-ENTWURF – MANUELL PRÜFEN UND ANPASSEN]\n\n${
      smOk.length?smOk.map(b=>SLZB_DB.getSchueler(b.schuelerId)?.anzeigename||b.schuelerId).join(', ')+' vom SLZB Berlin':'Das SLZB Berlin'
    } erreichte beim ${wb?.name||titelSauber} einen hervorragenden ${
      erfolg.platzierung?erfolg.platzierung+'. Platz':'Erfolg'
    }! ${erfolg.ergebnisWert?`Ergebnis: ${erfolg.ergebnisWert} ${erfolg.ergebnisEinheit||''}.`:''} Herzlichen Glückwunsch! 🎉\n\n#SLZB #Berlin #${(sp?.name||'Sport').replace(/\s/g,'')} #Schulsport #Erfolg`;

    const textKurz = `${smOk.length?SLZB_DB.getSchueler(smOk[0].schuelerId)?.anzeigename+' vom SLZB Berlin':'SLZB Berlin'}: ${erfolg.platzierung?erfolg.platzierung+'. Platz':'Toller Erfolg'} bei ${wb?.name||titelSauber}! 🏆 #SLZB`.slice(0,280);

    const nachweis = `VERÖFFENTLICHUNGSNACHWEIS\n========================\nErfolg-ID: ${erfolg.erfolgNr||erfolg.id}\nTitel: ${titelSauber}\nKanal: [Bitte eintragen]\nURL: [Bitte eintragen]\nDatum: [Bitte eintragen]\nVeröffentlicht von: [Name]\n\nDATENSCHUTZ\n===========\nSocial-Media-Freigabe geprüft: JA\nPersonen ohne SM-Freigabe ausgeschlossen: ${smNok.length>0?'JA ('+smNok.length+' Person(en))':'Keine gesperrt'}`;

    const dateien = [
      {name:'text_lang.txt',inhalt:textLang},
      {name:'text_kurz.txt',inhalt:textKurz},
      {name:'hashtags.txt',inhalt:`#SLZB #Berlin #${(sp?.name||'Sport').replace(/\s/g,'')} #Schulsport #Erfolg #${(erfolg.ebene||'Sport').replace(/\s/g,'')}`},
      {name:'veroeffentlichungsnachweis.txt',inhalt:nachweis},
    ];
    dateien.forEach(d=>{
      const blob=new Blob([d.inhalt],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=d.name;
      a.click(); URL.revokeObjectURL(url);
    });
    return {smNamen:smOk.length,smGesperrt:smNok.length};
  },

  // ── CSV-Importvorlage ─────────────────────────────────────
  downloadImportvorlage() {
    const csv=[
      'Titel,Meldungsart,Sportart,Disziplin,Wettbewerb_Name,Datum,Ort,Ebene,Platzierung,Medaille,Ergebnis_Wert,Ergebnis_Einheit,Ergebnis_Text,Schueler_Anzeigename,Kurzinfo',
      '[SYNTHETISCH] Beispiel 100m Sprint,Einzelerfolg,Leichtathletik,100m Sprint,Berliner Landesmeisterschaften 2026,2026-03-15,Berlin,Landesebene,1,Gold,10.85,Sekunden,Neuer Schulrekord,M. Mustermann,Hervorragende Leistung',
    ].join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='SLZB_Sammelimport_Vorlage_v2.csv';
    a.click(); URL.revokeObjectURL(url);
  },

  // ── CSV einlesen (ohne SheetJS) ───────────────────────────
  async leseCSV(datei) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=(e)=>{
        try {
          const text=e.target.result;
          const zeilen=text.split('\n').filter(z=>z.trim());
          const header=zeilen[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
          const daten=zeilen.slice(1).map(z=>{
            const werte=z.split(',').map(w=>w.trim().replace(/^"|"$/g,''));
            const obj={};
            header.forEach((h,i)=>obj[h]=werte[i]||'');
            return obj;
          });
          resolve(daten);
        } catch(err){reject(err);}
      };
      reader.onerror=reject;
      reader.readAsText(datei,'UTF-8');
    });
  },

  // ── Jahreschronik CSV-Export ──────────────────────────────
  exportiereChronikCSV(erfolge, schuljahr) {
    const zeilen=[
      ['Schuljahr','Datum','Titel','Meldungsart','Sportart','Disziplin','Wettbewerb','Ebene','Platzierung','Medaille','Ergebnis','Einheit'],
      ...erfolge.map(e=>{
        const sp=SLZB_DB.getSportart(e.sportartId);
        const wb=SLZB_DB.getWettbewerb(e.wettbewerbId);
        return [
          SLZB_DB.getSchuljahr(e.datum),
          e.datum?new Date(e.datum).toLocaleDateString('de-DE'):'',
          e.titel.replace('[SYNTHETISCH] ',''),
          e.meldungsart, sp?.name||'', e.disziplin||'',
          wb?.name||'', e.ebene||'',
          e.platzierung||'',
          e.medaille&&e.medaille!=='keine'?e.medaille:'',
          e.ergebnisWert||e.ergebnisText||'', e.ergebnisEinheit||'',
        ];
      })
    ];
    const csv='\uFEFF'+zeilen.map(z=>z.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`SLZB_Jahreschronik_${schuljahr||'Alle'}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  },
};