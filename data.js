// ============================================================
// SLZB-Erfolge v2 – Datenschicht (lokal + localStorage)
// ALLE DATEN SIND SYNTHETISCH – KEINE ECHTEN SCHÜLERDATEN
// ============================================================

const SLZB_DB = {

  // ── Sportarten ──────────────────────────────────────────
  sportarten: [
    {id:'SP01',name:'Basketball',       kuerzel:'BA',kategorie:'Mannschaftssport',aktiv:true,disziplinen:['Mannschaft']},
    {id:'SP02',name:'Beachvolleyball',  kuerzel:'BV',kategorie:'Mannschaftssport',aktiv:true,disziplinen:['Mannschaft','Mixed']},
    {id:'SP03',name:'Bogenschießen',    kuerzel:'BO',kategorie:'Leichtathletik',  aktiv:true,disziplinen:['Recurve','Compound','Blankbogen']},
    {id:'SP04',name:'Boxen',            kuerzel:'BX',kategorie:'Kampfsport',      aktiv:true,disziplinen:['Einzel']},
    {id:'SP05',name:'Eishockey',        kuerzel:'EH',kategorie:'Mannschaftssport',aktiv:true,disziplinen:['Mannschaft']},
    {id:'SP06',name:'Eiskunstlauf',     kuerzel:'EK',kategorie:'Turnen',          aktiv:true,disziplinen:['Einzel','Paarlauf','Eistanz']},
    {id:'SP07',name:'Eisschnelllauf',   kuerzel:'ES',kategorie:'Leichtathletik',  aktiv:true,disziplinen:['500m','1000m','1500m','3000m','5000m','10000m','Massenstart']},
    {id:'SP08',name:'Gewichtheben',     kuerzel:'GH',kategorie:'Kampfsport',      aktiv:true,disziplinen:['Reißen','Stoßen','Zweikampf']},
    {id:'SP09',name:'Handball',         kuerzel:'HB',kategorie:'Mannschaftssport',aktiv:true,disziplinen:['Mannschaft']},
    {id:'SP10',name:'Judo',             kuerzel:'JU',kategorie:'Kampfsport',      aktiv:true,disziplinen:['Einzel','Mannschaft','Kata']},
    {id:'SP11',name:'Leichtathletik',   kuerzel:'LA',kategorie:'Leichtathletik',  aktiv:true,disziplinen:['100m Sprint','200m Sprint','400m','800m','1500m','5000m','10000m','110m Hürden','400m Hürden','Hochsprung','Weitsprung','Dreisprung','Stabhochsprung','Kugelstoßen','Diskuswurf','Speerwurf','Hammerwurf','4×100m Staffel','4×400m Staffel','Zehnkampf','Siebenkampf']},
    {id:'SP12',name:'Para-Schwimmen',   kuerzel:'PS',kategorie:'Wassersport',     aktiv:true,disziplinen:['50m Freistil','100m Freistil','200m Freistil','400m Freistil','100m Rücken','100m Brust','100m Schmetterling','200m Lagen']},
    {id:'SP13',name:'Radsport',         kuerzel:'RS',kategorie:'Radsport',        aktiv:true,disziplinen:['Straße','Bahn','MTB','BMX','Zeitfahren']},
    {id:'SP14',name:'Schwimmen',        kuerzel:'SW',kategorie:'Wassersport',     aktiv:true,disziplinen:['50m Freistil','100m Freistil','200m Freistil','400m Freistil','800m Freistil','1500m Freistil','100m Rücken','200m Rücken','100m Brust','200m Brust','100m Schmetterling','200m Schmetterling','200m Lagen','400m Lagen']},
    {id:'SP15',name:'Turnen (männlich)',kuerzel:'TM',kategorie:'Turnen',          aktiv:true,disziplinen:['Boden','Reck','Barren','Ringe','Pferd','Sprung','Mehrkampf']},
    {id:'SP16',name:'Volleyball',       kuerzel:'VB',kategorie:'Mannschaftssport',aktiv:true,disziplinen:['Mannschaft']},
    {id:'SP17',name:'Wasserspringen',   kuerzel:'WS',kategorie:'Wassersport',     aktiv:true,disziplinen:['1m Brett','3m Brett','10m Turm','Synchron 3m','Synchron 10m']},
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
  // Demo-Nutzer deaktiviert. Echte Nutzer via Supabase.
  // Fallback für Offline-Modus:
  nutzer: [
    // Admins
    {id:'bueh1',username:'bueh',passwordHash:'3795d7ae4e6e172d381f7aaab441787aba8da52e25e715fd66a3b41c1fcb92dc',anzeigename:'Bueh',rolle:'admin',aktiv:true},
    {id:'pfe1', username:'pfe', passwordHash:'7f12c71d6f935f73b3dd1bda5bcd7cd34282b05ee13f997d8465682919cfa0b5',anzeigename:'Pfe', rolle:'admin',aktiv:true},
    // Öffentlichkeitsarbeit
    {id:'str1', username:'str', passwordHash:'93f4f4262a091cb4a8d8b317488f611a740854cdc4220dee02df21523f2563e8',anzeigename:'Str', rolle:'oea',aktiv:true},
    // Redaktion
    {id:'unt1', username:'unt', passwordHash:'a4886e3310aa045745970ff1b858853ecd1470c0041e3653311bb1f236e609a8',anzeigename:'Unt', rolle:'redaktion',aktiv:true},
    // Trainer je Sportart (Passwort: 1234)
    {id:'t_ba',username:'basketball',      passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Basketball',       rolle:'trainer',aktiv:true},
    {id:'t_bv',username:'beachvolleyball', passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Beachvolleyball',  rolle:'trainer',aktiv:true},
    {id:'t_bo',username:'bogenschiessen',  passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Bogenschießen',    rolle:'trainer',aktiv:true},
    {id:'t_bx',username:'boxen',           passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Boxen',            rolle:'trainer',aktiv:true},
    {id:'t_eh',username:'eishockey',       passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Eishockey',        rolle:'trainer',aktiv:true},
    {id:'t_ek',username:'eiskunstlauf',    passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Eiskunstlauf',     rolle:'trainer',aktiv:true},
    {id:'t_es',username:'eisschnelllauf',  passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Eisschnelllauf',   rolle:'trainer',aktiv:true},
    {id:'t_gh',username:'gewichtheben',    passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Gewichtheben',     rolle:'trainer',aktiv:true},
    {id:'t_hb',username:'handball',        passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Handball',         rolle:'trainer',aktiv:true},
    {id:'t_ju',username:'judo',            passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Judo',             rolle:'trainer',aktiv:true},
    {id:'t_la',username:'leichtathletik',  passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Leichtathletik',   rolle:'trainer',aktiv:true},
    {id:'t_ps',username:'para_schwimmen',  passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Para-Schwimmen',   rolle:'trainer',aktiv:true},
    {id:'t_rs',username:'radsport',        passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Radsport',         rolle:'trainer',aktiv:true},
    {id:'t_sw',username:'schwimmen',       passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Schwimmen',        rolle:'trainer',aktiv:true},
    {id:'t_tm',username:'turnen_maennlich',passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Turnen (männlich)','rolle':'trainer',aktiv:true},
    {id:'t_vb',username:'volleyball',      passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Volleyball',       rolle:'trainer',aktiv:true},
    {id:'t_ws',username:'wasserspringen',  passwordHash:'03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',anzeigename:'Wasserspringen',   rolle:'trainer',aktiv:true},
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