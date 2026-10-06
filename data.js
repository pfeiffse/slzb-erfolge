// ============================================================
// SLZB-Erfolge v2 – Datenschicht (lokal + localStorage)
// ALLE DATEN SIND SYNTHETISCH – KEINE ECHTEN SCHÜLERDATEN
// ============================================================

const SLZB_DB = {

  // ── Sportarten ──────────────────────────────────────────
  sportarten: [
    {id:'SP01',name:'Leichtathletik',kuerzel:'LA',kategorie:'Leichtathletik',aktiv:true,
     disziplinen:['100m Sprint','200m Sprint','400m','800m','1500m','5000m','110m Hürden','400m Hürden','Hochsprung','Weitsprung','Dreisprung','Stabhochsprung','Kugelstoßen','Diskuswurf','Speerwurf','Hammerwurf','4×100m Staffel','4×400m Staffel','Zehnkampf','Siebenkampf']},
    {id:'SP02',name:'Schwimmen',kuerzel:'SW',kategorie:'Wassersport',aktiv:true,
     disziplinen:['50m Freistil','100m Freistil','200m Freistil','400m Freistil','800m Freistil','100m Rücken','200m Rücken','100m Brust','200m Brust','100m Schmetterling','200m Schmetterling','200m Lagen','400m Lagen']},
    {id:'SP03',name:'Judo',kuerzel:'JU',kategorie:'Kampfsport',aktiv:true,
     disziplinen:['Einzel','Mannschaft','Kata']},
    {id:'SP04',name:'Fußball',kuerzel:'FB',kategorie:'Mannschaftssport',aktiv:true,
     disziplinen:['Mannschaft','Futsal']},
    {id:'SP05',name:'Turnen',kuerzel:'TU',kategorie:'Turnen',aktiv:true,
     disziplinen:['Boden','Reck','Barren','Ringe','Pferd','Sprung','Mehrkampf','Rhythmische Sportgymnastik']},
    {id:'SP06',name:'Radsport',kuerzel:'RS',kategorie:'Radsport',aktiv:true,
     disziplinen:['Straße','Bahn','MTB','BMX']},
    {id:'SP07',name:'Boxen',kuerzel:'BX',kategorie:'Kampfsport',aktiv:true,
     disziplinen:['Einzel']},
    {id:'SP08',name:'Rudern',kuerzel:'RU',kategorie:'Wassersport',aktiv:true,
     disziplinen:['Einer','Zweier','Vierer','Achter']},
    {id:'SP09',name:'Volleyball',kuerzel:'VB',kategorie:'Mannschaftssport',aktiv:true,
     disziplinen:['Mannschaft','Beach-Volleyball']},
    {id:'SP10',name:'Ringen',kuerzel:'RI',kategorie:'Kampfsport',aktiv:true,
     disziplinen:['Freistil','Griechisch-Römisch']},
  ],

  // ── Wettbewerbe ─────────────────────────────────────────
  wettbewerbe: [
    {id:'WB01',name:'Berliner Landesmeisterschaften Leichtathletik 2026',veranstalter:'Leichtathletik-Verband Berlin',ort:'Friedrich-Ludwig-Jahn-Sportpark Berlin',beginn:'2026-03-14',ende:'2026-03-15',ebene:'Landesebene',sportartId:'SP01'},
    {id:'WB02',name:'Deutsche Schülermeisterschaften Schwimmen 2026',veranstalter:'Deutscher Schwimm-Verband',ort:'Schwimmhalle Musterstadt',beginn:'2026-04-20',ende:'2026-04-21',ebene:'Bundesebene',sportartId:'SP02'},
    {id:'WB03',name:'Berliner Meisterschaften Judo 2026',veranstalter:'Berliner Judo-Verband',ort:'Sporthalle Mitte',beginn:'2026-02-08',ende:'2026-02-09',ebene:'Landesebene',sportartId:'SP03'},
    {id:'WB04',name:'Jugend trainiert für Olympia – Fußball Berlin 2026',veranstalter:'Berliner Senat für Bildung',ort:'Sportanlage Tempelhof',beginn:'2026-05-10',ende:'2026-05-10',ebene:'Bezirk',sportartId:'SP04'},
    {id:'WB05',name:'Bundesfinale Jugend trainiert – Turnen 2026',veranstalter:'Schulsport Deutschland',ort:'Berlin',beginn:'2026-09-01',ende:'2026-09-05',ebene:'Bundesebene',sportartId:'SP05'},
    {id:'WB06',name:'Bezirksmeisterschaften Leichtathletik Pankow 2026',veranstalter:'Bezirksamt Pankow',ort:'Sportplatz Pankow',beginn:'2026-02-20',ende:'2026-02-20',ebene:'Bezirk',sportartId:'SP01'},
  ],

  // ── Schüler (SYNTHETISCH) ────────────────────────────────
  schueler: [
    {id:'SLZB-000001',schuelerNr:'SLZB-000001',vorname:'Max',nachname:'Mustermann',anzeigename:'M. Mustermann',klasse:'10a',sportartId:'SP01',gruppe:'Kader B',aktiv:true,
     ew:{foto:true,print:true,homepage:true,digitalSignage:true,socialMedia:false,einzeldarstellung:true,klasse:false},ewGueltigBis:'2027-08-31',ewWiderruf:false},
    {id:'SLZB-000002',schuelerNr:'SLZB-000002',vorname:'Lena',nachname:'Beispiel',anzeigename:'L. Beispiel',klasse:'11b',sportartId:'SP01',gruppe:'Kader A',aktiv:true,
     ew:{foto:true,print:true,homepage:true,digitalSignage:true,socialMedia:true,einzeldarstellung:true,klasse:true},ewGueltigBis:'2027-08-31',ewWiderruf:false},
    {id:'SLZB-000003',schuelerNr:'SLZB-000003',vorname:'Tom',nachname:'Testperson',anzeigename:'T. Testperson',klasse:'9c',sportartId:'SP01',gruppe:'Schüler',aktiv:true,
     ew:{foto:false,print:false,homepage:false,digitalSignage:false,socialMedia:false,einzeldarstellung:false,klasse:false},ewGueltigBis:'2027-08-31',ewWiderruf:false},
    {id:'SLZB-000004',schuelerNr:'SLZB-000004',vorname:'Anna',nachname:'Probe',anzeigename:'A. Probe',klasse:'12a',sportartId:'SP01',gruppe:'Kader A',aktiv:true,
     ew:{foto:true,print:true,homepage:false,digitalSignage:false,socialMedia:false,einzeldarstellung:false,klasse:false},ewGueltigBis:'2026-12-31',ewWiderruf:false},
    {id:'SLZB-000005',schuelerNr:'SLZB-000005',vorname:'Jonas',nachname:'Beispielmann',anzeigename:'J. Beispielmann',klasse:'10b',sportartId:'SP02',gruppe:'Kader B',aktiv:true,
     ew:{foto:true,print:true,homepage:true,digitalSignage:true,socialMedia:true,einzeldarstellung:true,klasse:true},ewGueltigBis:'2027-08-31',ewWiderruf:false},
    {id:'SLZB-000006',schuelerNr:'SLZB-000006',vorname:'Sara',nachname:'Musterfrau',anzeigename:'S. Musterfrau',klasse:'11a',sportartId:'SP03',gruppe:'Kader A',aktiv:true,
     ew:{foto:true,print:true,homepage:true,digitalSignage:false,socialMedia:false,einzeldarstellung:true,klasse:true},ewGueltigBis:'2027-08-31',ewWiderruf:false},
    {id:'SLZB-000007',schuelerNr:'SLZB-000007',vorname:'Felix',nachname:'Proband',anzeigename:'F. Proband',klasse:'9a',sportartId:'SP04',gruppe:'Schüler',aktiv:true,
     ew:{foto:true,print:false,homepage:false,digitalSignage:false,socialMedia:false,einzeldarstellung:false,klasse:false},ewGueltigBis:'2027-08-31',ewWiderruf:false},
    {id:'SLZB-000008',schuelerNr:'SLZB-000008',vorname:'Marie',nachname:'Testfall',anzeigename:'M. Testfall',klasse:'12b',sportartId:'SP05',gruppe:'Perspektivkader',aktiv:true,
     ew:{foto:true,print:true,homepage:true,digitalSignage:true,socialMedia:false,einzeldarstellung:true,klasse:true},ewGueltigBis:'2027-08-31',ewWiderruf:false},
  ],

  // ── Teams ────────────────────────────────────────────────
  teams: [
    {id:'TM01',name:'Staffel 4×100m Männer',sportartId:'SP01',kategorie:'Kader B',schuljahr:'2025/26',aktiv:true},
    {id:'TM02',name:'Staffel 4×100m Frauen',sportartId:'SP01',kategorie:'Kader A',schuljahr:'2025/26',aktiv:true},
    {id:'TM03',name:'Fußball Jungen U16',sportartId:'SP04',kategorie:'Schüler',schuljahr:'2025/26',aktiv:true},
    {id:'TM04',name:'Judo Mannschaft Mädchen',sportartId:'SP03',kategorie:'Kader A',schuljahr:'2025/26',aktiv:true},
  ],

  // ── Nutzer ───────────────────────────────────────────────
  // Passwort für alle: Admin1234!
  // SHA-256: 5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6
  nutzer: [
    {id:'admin1',username:'admin',passwordHash:'5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6',anzeigename:'Administrator',rolle:'admin',aktiv:true},
    {id:'trainer1',username:'trainer1',passwordHash:'5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6',anzeigename:'K. Trainer',rolle:'trainer',aktiv:true},
    {id:'redaktion1',username:'redaktion1',passwordHash:'5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6',anzeigename:'R. Redakteur',rolle:'redaktion',aktiv:true},
    {id:'oea1',username:'oea1',passwordHash:'5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6',anzeigename:'Ö. Öffentlichkeit',rolle:'oea',aktiv:true},
    {id:'datenschutz1',username:'datenschutz1',passwordHash:'5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6',anzeigename:'D. Datenschutz',rolle:'datenschutz',aktiv:true},
  ],

  // ── Erfolge ──────────────────────────────────────────────
  erfolge: [
    {id:'ERF-00000001',erfolgNr:'ERF-00000001',meldungsart:'Einzelerfolg',
     titel:'[SYNTHETISCH] Landesmeister 100m Sprint',
     sportartId:'SP01',disziplin:'100m Sprint',wettbewerbId:'WB01',
     datum:'2026-03-15',ort:'Berlin',ebene:'Landesebene',
     platzierung:1,medaille:'Gold',ergebnisWert:10.85,ergebnisEinheit:'Sekunden',
     kurzinfo:'Herausragende Leistung bei den Berliner Landesmeisterschaften.',
     textArtikel:'M. Mustermann sicherte sich in beeindruckender Manier den Titel des Berliner Landesmeisters über 100 Meter.',
     status:'Freigegeben',melderId:'trainer1',melderName:'K. Trainer',
     eingangsdatum:'2026-03-16T09:00:00',einwilligungGeprueft:true,
     beteiligte:[{schuelerId:'SLZB-000001',rolle:'Athlet',einwilligungsstatus:'Freigegeben'}],
     medien:[],
     protokoll:[
       {statusAlt:'',statusNeu:'Entwurf',zeitpunkt:'2026-03-16T09:00:00',person:'K. Trainer',kommentar:''},
       {statusAlt:'Entwurf',statusNeu:'Eingereicht',zeitpunkt:'2026-03-16T09:05:00',person:'K. Trainer',kommentar:''},
       {statusAlt:'Eingereicht',statusNeu:'Redaktion',zeitpunkt:'2026-03-16T10:00:00',person:'R. Redakteur',kommentar:'Daten geprüft'},
       {statusAlt:'Redaktion',statusNeu:'Freigegeben',zeitpunkt:'2026-03-16T11:00:00',person:'Ö. Öffentlichkeit',kommentar:'Freigabe erteilt'},
     ]},
    {id:'ERF-00000002',erfolgNr:'ERF-00000002',meldungsart:'Teamerfolg',
     titel:'[SYNTHETISCH] Staffel 4×100m – Silber Landesmeisterschaften',
     sportartId:'SP01',disziplin:'4×100m Staffel',wettbewerbId:'WB01',
     datum:'2026-03-15',ort:'Berlin',ebene:'Landesebene',
     platzierung:2,medaille:'Silber',ergebnisWert:41.20,ergebnisEinheit:'Sekunden',
     kurzinfo:'Die Staffel des SLZB erreichte Silber bei den Landesmeisterschaften.',
     status:'Einwilligungsprüfung',melderId:'trainer1',melderName:'K. Trainer',
     eingangsdatum:'2026-03-16T09:30:00',einwilligungGeprueft:false,
     beteiligte:[
       {schuelerId:'SLZB-000001',rolle:'Athlet',einwilligungsstatus:'Freigegeben'},
       {schuelerId:'SLZB-000002',rolle:'Athlet',einwilligungsstatus:'Freigegeben'},
       {schuelerId:'SLZB-000003',rolle:'Athlet',einwilligungsstatus:'Gesperrt'},
       {schuelerId:'SLZB-000004',rolle:'Athlet',einwilligungsstatus:'Eingeschränkt'},
     ],
     medien:[],
     protokoll:[
       {statusAlt:'',statusNeu:'Eingereicht',zeitpunkt:'2026-03-16T09:30:00',person:'K. Trainer',kommentar:''},
       {statusAlt:'Eingereicht',statusNeu:'Einwilligungsprüfung',zeitpunkt:'2026-03-16T10:30:00',person:'R. Redakteur',kommentar:'Einwilligung für T. Testperson fehlt'},
     ]},
    {id:'ERF-00000003',erfolgNr:'ERF-00000003',meldungsart:'Minimalmeldung',
     titel:'[SYNTHETISCH] Bezirksmeisterschaft Judo',
     sportartId:'SP03',disziplin:'Einzel',wettbewerbId:'WB03',
     datum:'2026-02-09',ort:'Berlin',ebene:'Bezirk',
     kurzinfo:'Teilnahme und gute Platzierungen unserer Judoka.',
     status:'Unvollständig',melderId:'trainer1',melderName:'K. Trainer',
     eingangsdatum:'2026-02-10T08:00:00',einwilligungGeprueft:false,
     beteiligte:[{schuelerId:'SLZB-000006',rolle:'Athlet',einwilligungsstatus:'Nicht geprüft'}],
     medien:[],
     protokoll:[{statusAlt:'',statusNeu:'Unvollständig',zeitpunkt:'2026-02-10T08:00:00',person:'K. Trainer',kommentar:'Minimalmeldung'}]},
    {id:'ERF-00000004',erfolgNr:'ERF-00000004',meldungsart:'Einzelerfolg',
     titel:'[SYNTHETISCH] Bundesmeisterin 100m Freistil Schwimmen',
     sportartId:'SP02',disziplin:'100m Freistil',wettbewerbId:'WB02',
     datum:'2026-04-21',ort:'Musterstadt',ebene:'Bundesebene',
     platzierung:1,medaille:'Gold',ergebnisWert:55.30,ergebnisEinheit:'Sekunden',
     kurzinfo:'Nationaler Titel für SLZB-Schwimmerin.',
     status:'Redaktion',melderId:'trainer1',melderName:'K. Trainer',
     eingangsdatum:'2026-04-22T10:00:00',einwilligungGeprueft:true,
     beteiligte:[{schuelerId:'SLZB-000005',rolle:'Athlet',einwilligungsstatus:'Freigegeben'}],
     medien:[],
     protokoll:[
       {statusAlt:'',statusNeu:'Eingereicht',zeitpunkt:'2026-04-22T10:00:00',person:'K. Trainer',kommentar:''},
       {statusAlt:'Eingereicht',statusNeu:'Redaktion',zeitpunkt:'2026-04-22T11:00:00',person:'R. Redakteur',kommentar:'Daten plausibel'},
     ]},
    {id:'ERF-00000005',erfolgNr:'ERF-00000005',meldungsart:'Einzelerfolg',
     titel:'[SYNTHETISCH] Dublettenverdacht – 100m Sprint',
     sportartId:'SP01',disziplin:'100m Sprint',wettbewerbId:'WB01',
     datum:'2026-03-15',ort:'Berlin',ebene:'Landesebene',
     platzierung:1,medaille:'Gold',ergebnisWert:10.85,ergebnisEinheit:'Sekunden',
     kurzinfo:'Mögliche Doppelmeldung zu ERF-00000001.',
     status:'Dublettenverdacht',melderId:'trainer1',melderName:'K. Trainer',
     eingangsdatum:'2026-03-17T08:00:00',einwilligungGeprueft:false,
     dublettenhinweis:true,dublettenhinweisText:'Mögliche Dublette zu ERF-00000001',
     beteiligte:[{schuelerId:'SLZB-000001',rolle:'Athlet',einwilligungsstatus:'Nicht geprüft'}],
     medien:[],
     protokoll:[
       {statusAlt:'',statusNeu:'Eingereicht',zeitpunkt:'2026-03-17T08:00:00',person:'K. Trainer',kommentar:''},
       {statusAlt:'Eingereicht',statusNeu:'Dublettenverdacht',zeitpunkt:'2026-03-17T08:01:00',person:'System',kommentar:'Automatische Dublettenprüfung'},
     ]},
  ],

  // ── Importaufträge ───────────────────────────────────────
  importauftraege: [
    {id:'IMP001',quelldateiName:'Ergebnisse_LA_März_2026.xlsx',melderId:'trainer1',
     importDatum:'2026-03-20T14:00:00',gesamtZeilen:12,erfolgreich:9,fehler:3,
     status:'Abgeschlossen mit Fehlern',
     fehlerprotokoll:'Zeile 4: Platzierung fehlt\nZeile 7: Schüler-ID nicht gefunden\nZeile 11: Datum ungültig'},
  ],

  // ── Sequenz ──────────────────────────────────────────────
  _nextErfolgNr: 6,

  // ── Hilfsfunktionen ──────────────────────────────────────
  getSchueler(id)    { return this.schueler.find(s=>s.id===id); },
  getSportart(id)    { return this.sportarten.find(s=>s.id===id); },
  getWettbewerb(id)  { return this.wettbewerbe.find(w=>w.id===id); },
  getErfolg(id)      { return this.erfolge.find(e=>e.id===id); },
  getNutzer(id)      { return this.nutzer.find(n=>n.id===id); },

  neueErfolgNr() {
    const nr = String(this._nextErfolgNr++).padStart(8,'0');
    return `ERF-${nr}`;
  },

  

  pruefeEinwilligung(schuelerId, kanal) {
    const s = this.getSchueler(schuelerId);
    if (!s) return {ok:false,grund:'Schüler nicht gefunden'};
    if (s.ewWiderruf) return {ok:false,grund:'Einwilligung widerrufen'};
    if (s.ewGueltigBis && new Date(s.ewGueltigBis)<new Date())
      return {ok:false,grund:'Einwilligung abgelaufen'};
    const kanalMap = {
      print:'print',homepage:'homepage',digitalSignage:'digitalSignage',
      socialMedia:'socialMedia',foto:'foto',einzeldarstellung:'einzeldarstellung',klasse:'klasse'
    };
    const feld = kanalMap[kanal];
    if (feld && !s.ew[feld]) return {ok:false,grund:`Keine Freigabe für "${kanal}"`};
    return {ok:true};
  },

  pruefeDubletten(neuerErfolg) {
    return this.erfolge.filter(e=>
      e.id!==neuerErfolg.id &&
      e.wettbewerbId===neuerErfolg.wettbewerbId &&
      e.datum===neuerErfolg.datum &&
      e.sportartId===neuerErfolg.sportartId &&
      e.disziplin===neuerErfolg.disziplin &&
      e.platzierung===neuerErfolg.platzierung &&
      e.status!=='Gelöscht/Anonymisiert'
    );
  },

  validiereErfolg(daten) {
    const fehler=[];
    if (!daten.titel?.trim()) fehler.push('Titel ist Pflichtfeld');
    if (!daten.sportartId && !daten.sportartText) fehler.push('Sportart ist Pflichtfeld');
    if (!daten.datum) fehler.push('Datum ist Pflichtfeld');
    else {
      const d=new Date(daten.datum);
      if (isNaN(d)) fehler.push('Datum ist ungültig');
      else if (d>new Date(Date.now()+365*24*60*60*1000)) fehler.push('Datum liegt mehr als 1 Jahr in der Zukunft');
      else if (d<new Date('2000-01-01')) fehler.push('Datum vor dem Jahr 2000');
    }
    if (daten.platzierung!==undefined&&daten.platzierung!==null&&daten.platzierung<1)
      fehler.push('Platzierung muss mindestens 1 sein');
    if (daten.meldungsart==='Minimalmeldung'&&!daten.kurzinfo?.trim())
      fehler.push('Kurzinfo ist bei Minimalmeldung Pflichtfeld');
    return fehler;
  },

  // Schuljahr berechnen
  getSchuljahr(datum) {
    if (!datum) return '';
    const d=new Date(datum);
    const jahr=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;
    return `${jahr}/${String(jahr+1).slice(2)}`;
  },
};

// ── Persistenz (lokal) ───────────────────────────────────────
function slzbSave() {
  try {
    const data = {
      erfolge:        SLZB_DB.erfolge,
      nutzer:         SLZB_DB.nutzer,
      schueler:       SLZB_DB.schueler,
      wettbewerbe:    SLZB_DB.wettbewerbe,
      teams:          SLZB_DB.teams,
      importauftraege:SLZB_DB.importauftraege,
      _nextErfolgNr:  SLZB_DB._nextErfolgNr,
    };
    localStorage.setItem('slzb_db_v2', JSON.stringify(data));
  } catch(e) { console.warn('Speichern fehlgeschlagen:', e.message); }
}

function slzbLoad() {
  try {
    const raw = localStorage.getItem('slzb_db_v2');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.erfolge)         SLZB_DB.erfolge         = saved.erfolge;
    if (saved.nutzer)          SLZB_DB.nutzer          = saved.nutzer;
    if (saved.schueler)        SLZB_DB.schueler        = saved.schueler;
    if (saved.wettbewerbe)     SLZB_DB.wettbewerbe     = saved.wettbewerbe;
    if (saved.teams)           SLZB_DB.teams           = saved.teams;
    if (saved.importauftraege) SLZB_DB.importauftraege = saved.importauftraege;
    if (saved._nextErfolgNr)   SLZB_DB._nextErfolgNr   = saved._nextErfolgNr;
  } catch(e) { console.warn('Laden fehlgeschlagen:', e.message); }
}

// ── Persistenz + Supabase-Sync ───────────────────────────────
async function slzbSaveUndSync(objekt, typ) {
  slzbSave();
  if (typeof Sync === 'undefined' || !Sync.verfuegbar) return;
  try {
    switch(typ) {
      case 'erfolg':     await Sync.uploadErfolg(objekt); break;
      case 'nutzer':     await Sync.uploadNutzer(objekt); break;
      case 'schueler':   await Sync.uploadSchueler(objekt); break;
      case 'wettbewerb': await Sync.uploadWettbewerb(objekt); break;
    }
  } catch(e) { console.warn('Sync-Fehler:', e.message); }
}