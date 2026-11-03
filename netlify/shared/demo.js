// Demo-Daten: komplett erfundene Mannschaft, Eltern und Kasse. Nur aktiv mit DEMO_MODUS=1.
// Alle Termine werden relativ zum heutigen Tag erzeugt, damit die Demo immer aktuell aussieht.

import { termineZeitraum } from "./termine.js";

export const DEMO_TEAMS = {
  jugend: { name: "männliche C-Jugend", text: "Jugendmannschaft: Eltern organisieren, die Jungs melden sich für Training und Spiele." },
  herren: { name: "1. Herren", text: "Erwachsenenmannschaft: Die Spieler organisieren alles selbst, mit Hallenaufbau-Diensten und Mannschaftstour." },
};
export const DEMO_PERSONEN = {
  jugend: {
    spieler: { vorname: "Ben", kind: "Ben", text: "Ben, Spieler" },
    eltern: { vorname: "Sandra", kind: "Ben", text: "Sandra, Mutter von Ben" },
    trainer: { vorname: "Jan", kind: "", text: "Jan, Trainer" },
    kasse: { vorname: "Markus", kind: "Finn", text: "Markus, Kassenwart und Vater von Finn" },
  },
  herren: {
    spieler: { vorname: "Marco", kind: "Marco", text: "Marco, Spieler" },
    trainer: { vorname: "Uwe", kind: "", text: "Uwe, Trainer" },
    kasse: { vorname: "Dennis", kind: "Dennis", text: "Dennis, Spieler und Kassenwart" },
  },
};

export const heuteBerlin = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

const plus = (iso, tage) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
};
const WT = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MO = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const lang = (iso) => { const d = new Date(iso + "T12:00:00Z"); return `${WT[d.getUTCDay()]}, ${d.getUTCDate()}. ${MO[d.getUTCMonth()]}`; };
const zaehler = (o) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(";");

// Liefert { einstellungen, eintraege: [[schluessel, objekt], ...] }
export function demoDaten(heute, standard) {
  const wt = new Date(heute + "T12:00:00Z").getUTCDay();
  const n1 = plus(heute, ((6 - wt + 7) % 7) || 7); // nächster Samstag
  const t = (n) => plus(n1, n);
  const jetzt = new Date().toISOString();
  const E = [];
  const add = (col, obj) => E.push([`${col}/${obj.id}`, { erstellt: jetzt, ...obj }]);

  const halleHeim = "Sporthalle am Park";
  const einstellungen = {
    ...standard,
    anfangsbestand: 48520,
    anfangsdatum: t(-63),
    teamText: "Wir sind die männliche C-Jugend (Jahrgänge 2012 und 2013) und spielen in dieser Saison in der Kreisliga. Trainiert wird zweimal pro Woche, dazu kommen Turniere und ein Trainingslager im Frühjahr.\n\nDies ist eine Demo: Alle Namen, Spiele und Beträge sind erfunden.",
    liga: "Kreisliga männliche C (Demo)",
    mannschaftstyp: "jugend",
    mannschaftName: "männliche C-Jugend",
    vereinName: "Ohligser TV 1888",
    module: { dienste: false },
    trainingszeiten: [
      { tag: "Dienstag", zeit: "17:30 bis 19:00 Uhr", halle: halleHeim },
      { tag: "Donnerstag", zeit: "18:00 bis 19:30 Uhr", halle: "Schulzentrum Nord" },
    ],
    hallen: [
      { name: halleHeim, adresse: "Parkstraße 1, Musterstadt" },
      { name: "Schulzentrum Nord", adresse: "Nordring 20, Musterstadt" },
    ],
    standdienstPlaetze: 2,
    reservePlaetze: 1,
    galerieAktiv: false,
    namenZuordnung: { sabine: "Oskar" },
    handballNetUrl: "https://www.handball.net",
    widgetToken: "",
    datenstand: 8,
  };

  // Kader und Trainer
  const kader = ["Anton", "Ben", "Elias", "Felix", "Finn", "Henry", "Jakob", "Jonas", "Leo", "Leon", "Luca", "Milan", "Moritz", "Noah", "Oskar", "Theo"];
  const nummern = { Ben: "7", Finn: "1", Jonas: "10", Leon: "4", Noah: "12", Theo: "9" };
  kader.forEach((v, i) => add("kader", { id: `demo-k${i + 1}`, vorname: v, nummer: nummern[v] || "", reihenfolge: i + 1 }));
  add("trainer", { id: "demo-t1", name: "Jan Hoffmann", rolle: "Trainer", reihenfolge: 1, text: "Trainiert die Mannschaft seit der D-Jugend. Schwerpunkt: Abwehr und Tempospiel." });
  add("trainer", { id: "demo-t2", name: "Lukas Weber", rolle: "Co-Trainer", reihenfolge: 2, text: "Spielt selbst in der ersten Herren und kümmert sich um Athletik." });
  add("trainer", { id: "demo-t3", name: "Kai Schröder", rolle: "Torwarttrainer", reihenfolge: 3, text: "Einmal pro Woche Torwarttraining für Finn und Leo." });

  // Spiele: vier vergangene, sieben kommende
  const spiele = [
    ["p4", t(-35), "14:00", "TuS Lindenfeld", true],
    ["p3", t(-21), "15:30", "HC Ahornbach", true],
    ["p2", t(-14), "12:00", "SG Kronenberg", false, "Kronenberghalle"],
    ["p1", t(-7), "14:30", "HSG Bergtal", true],
    ["n1", t(0), "15:00", "JSG Rheinhöhe", true, "", "Wir bekommen Besuch von der D-Jugend, bitte gerne einen Kuchen mehr."],
    ["n2", t(8), "11:30", "TV Wupperau", false, "Wupperhalle"],
    ["n3", t(14), "14:00", "TSV Eichenhain", true],
    ["n4", t(21), "13:00", "HSG Bergtal", false, "Bergtalhalle"],
    ["n5", t(28), "15:30", "SG Kronenberg", true],
    ["n6", t(35), "12:30", "TuS Lindenfeld", false, "Lindenhalle"],
    ["n7", t(49), "14:15", "HC Ahornbach", true],
  ];
  const sid = {};
  for (const [k, datum, zeit, gegner, heim, halle, hinweis] of spiele) {
    sid[k] = `demo-${k}`;
    add("spiele", { id: sid[k], datum, zeit, gegner, heim, halle: heim ? halleHeim : halle, hinweis: hinweis || "" });
  }

  // Standdienst (demo-eltern = Sandra, demo-kasse = Markus, andere Geräte erfunden)
  const sd = (id, spiel, name, besitzer, extra = {}) => add("standdienst", { id, spielId: sid[spiel], name, besitzer, ...extra });
  sd("demo-sd1", "p4", "Julia (Jonas)", "demo-g1"); sd("demo-sd2", "p4", "Daniel (Felix)", "demo-g2");
  sd("demo-sd3", "p3", "Katrin (Luca)", "demo-g3"); sd("demo-sd4", "p3", "Frank (Anton)", "demo-g4");
  sd("demo-sd5", "p1", "Sandra (Ben)", "demo-eltern"); sd("demo-sd6", "p1", "Katrin (Luca)", "demo-g3");
  sd("demo-sd7", "n1", "Sandra (Ben)", "demo-eltern");
  sd("demo-sd8", "n3", "Birgit (Leo)", "demo-g5"); sd("demo-sd9", "n3", "Sven (Oskar)", "demo-g6"); sd("demo-sd10", "n3", "Nicole (Elias)", "demo-g7", { reserve: true });

  // Mitbringliste
  const ct = (id, spiel, artikel, name, besitzer) => add("catering", { id, spielId: sid[spiel], artikel, name, besitzer, menge: "" });
  ct("demo-c1", "p1", "Kuchen", "Julia (Jonas)", "demo-g1"); ct("demo-c2", "p1", "Kuchen", "Nicole (Elias)", "demo-g7");
  ct("demo-c3", "p1", "Muffins", "Tanja (Jakob)", "demo-g8"); ct("demo-c4", "p1", "Laugengebäck", "Stefan (Leon)", "demo-g9");
  ct("demo-c5", "n1", "Kuchen", "Melanie (Henry)", "demo-g10"); ct("demo-c6", "n1", "Muffins", "Sabine", "demo-g11");
  ct("demo-c7", "n3", "Kuchen", "Sandra (Ben)", "demo-eltern");

  // Zeitnehmer und Wäsche
  add("zeitnehmer", { id: "demo-z1", spielId: sid.p1, name: "Daniel (Felix)", besitzer: "demo-g2" });
  add("zeitnehmer", { id: "demo-z2", spielId: sid.n2, name: "Jens (Milan)", besitzer: "demo-g12" });
  add("waschdienst", { id: "demo-w1", spielId: sid.p1, name: "Claudia (Theo)", besitzer: "demo-g13" });

  // Fahrgemeinschaft zum nächsten Auswärtsspiel
  add("fahrten", { id: "demo-f1", spielId: sid.n2, fahrer: "Markus (Finn)", plaetze: 3, treffpunkt: "10:15 Uhr Parkplatz Sporthalle am Park", hinweis: "", richtung: "beide", besitzer: "demo-kasse" });
  add("fahrten", { id: "demo-f2", spielId: sid.n2, fahrer: "Nicole (Elias)", plaetze: 2, treffpunkt: "10:15 Uhr Parkplatz Sporthalle am Park", hinweis: "zurück muss ich direkt weiter", richtung: "hin", besitzer: "demo-g7" });
  add("mitfahrer", { id: "demo-m3", fahrtId: "demo-f2", name: "Elias", eingetragenVon: "Nicole (Elias)", besitzer: "demo-g7" });
  add("fahrtbedarf", { id: "demo-fb1", spielId: sid.n2, spieler: "Elias", richtung: "rueck", von: "Nicole (Elias)", besitzer: "demo-g7" });
  add("fahrtbedarf", { id: "demo-fb2", spielId: sid.n2, spieler: "Leon", richtung: "beide", von: "Stefan (Leon)", besitzer: "demo-g9" });
  add("mitfahrer", { id: "demo-m1", fahrtId: "demo-f1", name: "Finn", eingetragenVon: "Markus (Finn)", besitzer: "demo-kasse" });
  add("mitfahrer", { id: "demo-m2", fahrtId: "demo-f1", name: "Noah", eingetragenVon: "Andreas (Noah)", besitzer: "demo-g14" });

  // Trikots: Familie von Ben ist nach dem Auswärtsspiel dran, vergangene Spiele erledigt
  add("trikots", { id: sid.n2, familie: "Familie von Ben", erledigt: false });
  for (const k of ["p4", "p3", "p2", "p1"]) add("trikots", { id: sid[k], erledigt: true });

  // Vorrat
  add("vorrat", { id: "kaffee", artikel: "Kaffee", status: "knapp", von: "Katrin (Luca)", datum: t(-7) });
  add("vorrat", { id: "becher", artikel: "Becher", status: "leer", von: "Katrin (Luca)", datum: t(-7) });

  // Strichliste vom letzten Heimspiel (zwei Handys des Standdienstes)
  E.push([`strichliste/${sid.p1}__demo-eltern`, { id: `${sid.p1}__demo-eltern`, spielId: sid.p1, zaehler: zaehler({ Cola: 6, Fanta: 3, "Wasser still": 4, "Fassbrause rot": 2 }), erstellt: jetzt }]);
  E.push([`strichliste/${sid.p1}__demo-g3`, { id: `${sid.p1}__demo-g3`, spielId: sid.p1, zaehler: zaehler({ Cola: 3, Apfelschorle: 4, "Wasser mit Sprudel": 2, "Fassbrause gelb": 3 }), erstellt: jetzt }]);

  // Kasse
  const k = (id, datum, art, betrag, zweck, kategorie, kanal, extra = {}) => add("kasse", { id, datum, art, betrag, zweck, kategorie, kanal, beleg: "", spielId: "", ...extra });
  k("demo-b1", t(-61), "ausgabe", 8350, "Ausgaben Turnier (Pokale, Verpflegung)", "Turnier/Fahrten", "Bar", { beleg: "Beleg 1" });
  k("demo-b2", t(-60), "einnahme", 26400, "Einnahmen Turnier", "Turnier/Fahrten", "Bar");
  k("demo-b3", t(-45), "einnahme", 10000, "Spende Autohaus Musterstadt", "Sonstiges", "Überweisung");
  k("demo-b4", t(-40), "ausgabe", 6400, "Bälle und Leibchen", "Sonstiges", "Überweisung", { beleg: "Rechnung Sporthaus" });
  k("demo-b5", t(-35), "einnahme", 11800, "Heimspiel-Catering gegen TuS Lindenfeld", "Heimspiel-Catering", "Bar", { spielId: sid.p4 });
  k("demo-b6", t(-35), "einnahme", 2450, "Heimspiel-Catering gegen TuS Lindenfeld", "Heimspiel-Catering", "PayPal", { spielId: sid.p4 });
  k("demo-b7", t(-35), "ausgabe", 2575, "Anteil Getränke an den OTV (50 % von 51,50 €), Heimspiel gegen TuS Lindenfeld", "Getränke OTV", "Überweisung",
    { spielId: sid.p4, offen: false, getraenke: zaehler({ Cola: 8, Fanta: 5, "Wasser still": 6, "Fassbrause rot": 4 }), beleg: `an OTV bezahlt am ${t(-15).split("-").reverse().join(".")}` });
  k("demo-b8", t(-35), "ausgabe", 1890, "Einkauf Catering, Heimspiel gegen TuS Lindenfeld", "Einkauf Catering", "Bar", { spielId: sid.p4, beleg: "Kassenbon Supermarkt" });
  k("demo-b9", t(-21), "einnahme", 12650, "Heimspiel-Catering gegen HC Ahornbach", "Heimspiel-Catering", "Bar", { spielId: sid.p3 });
  k("demo-b10", t(-21), "ausgabe", 2825, "Anteil Getränke an den OTV (50 % von 56,50 €), Heimspiel gegen HC Ahornbach", "Getränke OTV", "",
    { spielId: sid.p3, offen: true, getraenke: zaehler({ Cola: 7, Fanta: 4, Apfelschorle: 5, "Wasser mit Sprudel": 6, "Fassbrause gelb": 3 }) });
  k("demo-b11", t(-10), "ausgabe", 2350, "Kaffee, Milch und Becher", "Einkauf Catering", "Bar", { beleg: "Kassenbon" });

  // Infos vom Trainerteam
  add("hinweise", { id: "demo-h2", text: "Bitte zum nächsten Heimspiel die neuen Aufwärmshirts mitbringen.", bis: t(0), von: "Lukas (Trainer)" });

  // Abfragen
  const ferien = [plus(heute, 9), plus(heute, 11), plus(heute, 16)];
  add("abfragen", { id: "demo-a1", titel: "Training in den Ferien", text: "Wir bieten in den Ferien drei zusätzliche Trainings an. Bitte ankreuzen, wann euer Sohn dabei ist.",
    optionen: ferien.map((d) => `${lang(d)}, 10:00 bis 12:00 Uhr`).join("\n"), frist: plus(heute, 6), geschlossen: false, von: "Jan (Trainer)" });
  const a1 = { Anton: "0,1", Elias: "0,1,2", Felix: "1", Finn: "0,1,2", Henry: "keiner", Jonas: "0,2", Leon: "0,1,2", Milan: "2", Noah: "0,1" };
  for (const [sp, g] of Object.entries(a1)) add("abfrageAntworten", { id: `demo-a1-${sp.toLowerCase()}`, abfrageId: "demo-a1", spieler: sp, gewaehlt: g, bemerkung: sp === "Henry" ? "Wir sind im Urlaub" : "", von: "" });
  add("abfragen", { id: "demo-a2", titel: `Hallenturnier am ${lang(t(42))}`, text: "Turnier in Musterstadt, Start ca. 10 Uhr, Ende gegen 16 Uhr. Wir melden nur, wenn mindestens zehn Jungs dabei sind.",
    optionen: "", frist: plus(heute, 12), geschlossen: false, von: "Jan (Trainer)" });
  const a2 = { Anton: "ja", Finn: "ja", Jakob: "nein", Leo: "ja", Luca: "ja", Moritz: "ja", Theo: "ja" };
  for (const [sp, g] of Object.entries(a2)) add("abfrageAntworten", { id: `demo-a2-${sp.toLowerCase()}`, abfrageId: "demo-a2", spieler: sp, gewaehlt: g, bemerkung: "", von: "" });

  // Termine mit Rückmeldung
  add("termine", { id: "demo-tm1", titel: "Mannschaftsabend mit Pizza", datum: t(20), zeit: "18:00", ort: "Vereinsheim",
    beschreibung: "ab 18:00 Uhr: Spieler gegen Eltern in der Halle\nab ca. 19:30 Uhr: Pizza und gemütliches Zusammensitzen\n\nFür Spieler und Trainer übernimmt die Mannschaftskasse die Kosten. Alle anderen zahlen 5 € pro Person.",
    kostenProPerson: 500, frage: "Wie viele zusätzliche Personen (Eltern, Geschwister) kommen mit?", frist: t(10) });
  const tm = { Anton: [true, 2, true], Elias: [true, 1, false], Felix: [true, 2, true], Finn: [true, 1, true], Jonas: [true, 0, false], Leon: [false, 0, false], Moritz: [true, 3, false], Theo: [true, 2, true] };
  for (const [fam, [kommt, personen, bezahlt]] of Object.entries(tm)) add("antworten", { id: `demo-tm1-${fam.toLowerCase()}`, terminId: "demo-tm1", familie: fam, kommt, personen, bezahlt, bemerkung: "", von: "" });
  add("termine", { id: "demo-tm2", titel: "Mannschaftsfoto", datum: plus(heute, 2), zeit: "17:15", ort: halleHeim, beschreibung: "Bitte im Heimtrikot und mit Hallenschuhen kommen. Danach normales Training.", kostenProPerson: 0 });

  // Training fällt einmal aus, An- und Abmeldungen für die nächsten zwei Wochen
  const ausfallTag = termineZeitraum({ trainingszeiten: einstellungen.trainingszeiten, spiele: [], ausfaelle: [] }, plus(heute, 7), plus(heute, 13)).find((x) => x.slot === 1);
  if (ausfallTag) {
    add("trainingsausfall", { id: "demo-ta1", von: ausfallTag.datum, bis: ausfallTag.datum, slot: "1", grund: "Halle wegen Schulveranstaltung belegt" });
    add("hinweise", { id: "demo-h1", text: `Am ${lang(ausfallTag.datum)} fällt das Training aus, die Halle ist wegen einer Schulveranstaltung belegt. Bitte trotzdem am Dienstag kommen.`, bis: ausfallTag.datum, von: "Jan (Trainer)" });
  }
  const kommend = termineZeitraum({ trainingszeiten: einstellungen.trainingszeiten, spiele: spiele.map(([k, datum, zeit, gegner, heim]) => ({ id: sid[k], datum, zeit, gegner, heim })), ausfaelle: [] }, plus(heute, 1), plus(heute, 14));
  const slug = (x) => x.toLowerCase();
  const melde = (termin, spieler, status, bemerkung = "") => add("anwesenheit", { id: `${termin.key}-${slug(spieler)}`, termin: termin.key, spieler, status, bemerkung, von: spieler });
  const trainings = kommend.filter((x) => x.art === "training");
  if (trainings[0]) { melde(trainings[0], "Henry", "nein", "Familienbesuch"); melde(trainings[0], "Milan", "nein"); }
  if (trainings[1]) melde(trainings[1], "Jakob", "nein", "Klassenfahrt");
  if (trainings[2]) melde(trainings[2], "Jakob", "nein", "Klassenfahrt");
  for (const sp of kommend.filter((x) => x.art === "spiel").slice(0, 2)) {
    const ja = ["Anton", "Elias", "Felix", "Finn", "Jonas", "Leo", "Leon", "Luca", "Moritz", "Noah", "Oskar"];
    for (const n of ja) melde(sp, n, "ja");
    melde(sp, "Henry", "nein", "Familienfeier");
    if (sp.spiel.heim === false) melde(sp, "Ben", "ja");
  }

  return { einstellungen, eintraege: E };
}

// ---------- Zweite Demo-Mannschaft: 1. Herren (Erwachsene, ohne Eltern) ----------
export function demoHerren(heute, standard) {
  const wt = new Date(heute + "T12:00:00Z").getUTCDay();
  const n1 = plus(heute, ((6 - wt + 7) % 7) || 7); // nächster Samstag
  const t = (n) => plus(n1, n);
  const jetzt = new Date().toISOString();
  const E = [];
  const add = (col, obj) => E.push([`${col}/${obj.id}`, { erstellt: jetzt, ...obj }]);
  const halle = "Sporthalle am Park";
  const dienstArten = [
    { name: "Hallenaufbau", personen: 4, vorlauf: 90 },
    { name: "Tribüne ausziehen", personen: 2, vorlauf: 90 },
    { name: "Werbebanner aufhängen", personen: 2, vorlauf: 75 },
    { name: "Getränkestand", personen: 2, vorlauf: 45 },
    { name: "Abbau", personen: 4, vorlauf: -1 },
  ];
  const einstellungen = {
    ...standard,
    mannschaftstyp: "erwachsene",
    mannschaftName: "1. Herren",
    vereinName: "Ohligser TV 1888",
    module: { standdienst: false, strichliste: false, waesche: false, galerie: false, dienste: true },
    dienstArten,
    dienstVorschlagTage: 7,
    anfangsbestand: 32000,
    anfangsdatum: t(-70),
    teamText: "Wir sind die 1. Herren und spielen in der Landesliga. Heimspiele samstags um 18 Uhr, Training dienstags und donnerstags.\n\nDies ist eine Demo: Alle Namen, Spiele und Beträge sind erfunden.",
    liga: "Landesliga Männer (Demo)",
    trainingszeiten: [
      { tag: "Dienstag", zeit: "20:00 bis 21:30 Uhr", halle },
      { tag: "Donnerstag", zeit: "20:00 bis 21:30 Uhr", halle },
    ],
    hallen: [{ name: halle, adresse: "Parkstraße 1, Musterstadt" }],
    standdienstVorlauf: 60,
    anwesenheitTraining: "abmelden",
    kassenKategorien: ["Mannschaftskasse Beiträge", "Strafen", "Getränke", "Mannschaftstour", "Mannschaftsabend", "Sonstiges"],
    kassenKanaele: ["Bar", "PayPal", "Überweisung"],
    namenZuordnung: {},
    handballNetUrl: "https://www.handball.net",
    widgetToken: "",
    galerieAktiv: false,
    datenstand: 8,
  };
  const kader = ["Christian", "Dennis", "Florian", "Kevin", "Marco", "Mirko", "Niklas", "Patrick", "Philipp", "Robin", "Sebastian", "Stefan", "Timo", "Tobias"];
  const nr = { Dennis: "7", Kevin: "11", Marco: "23", Tobias: "1", Philipp: "4", Timo: "12" };
  kader.forEach((v, i) => add("kader", { id: `h-k${i + 1}`, vorname: v, nummer: nr[v] || "", reihenfolge: i + 1 }));
  add("trainer", { id: "h-t1", name: "Uwe Brandt", rolle: "Trainer", reihenfolge: 1, text: "Seit drei Jahren Trainer der Ersten." });
  add("trainer", { id: "h-t2", name: "Holger Klein", rolle: "Co-Trainer", reihenfolge: 2, text: "Kümmert sich um Athletik und Videoanalyse." });

  const spiele = [
    ["p3", t(-21), "18:00", "TV Wupperau", true],
    ["p2", t(-14), "17:00", "SG Kronenberg", false, "Kronenberghalle"],
    ["p1", t(-7), "18:00", "HSG Bergtal", true],
    ["n1", t(0), "18:00", "TuS Lindenfeld", true],
    ["n2", t(8), "18:30", "HC Ahornbach", false, "Ahornhalle, Haan"],
    ["n3", t(14), "18:00", "TSV Eichenhain", true],
    ["n4", t(22), "17:00", "JSG Rheinhöhe", false, "Rheinhalle"],
    ["n5", t(28), "18:00", "SG Kronenberg", true],
  ];
  const sid = {};
  for (const [k, datum, zeit, gegner, heim, h] of spiele) {
    sid[k] = `h-${k}`;
    add("spiele", { id: sid[k], datum, zeit, gegner, heim, halle: heim ? halle : h, hinweis: "" });
  }
  // Helferdienste: vergangene Heimspiele (ungleich verteilt, wie im echten Leben), dazu das nächste Heimspiel teilweise besetzt
  let i = 0;
  const dienst = (spiel, d, person, besitzer = `h-g-${person.toLowerCase()}`) => add("dienste", { id: `h-d${++i}`, spielId: sid[spiel], dienst: d, name: person, person, besitzer });
  for (const sp of ["p3", "p1"]) {
    for (const p of ["Tobias", "Kevin", "Philipp", "Stefan"]) dienst(sp, "Hallenaufbau", p);
    for (const p of ["Tobias", "Kevin"]) dienst(sp, "Tribüne ausziehen", p);
    for (const p of ["Philipp", "Robin"]) dienst(sp, "Werbebanner aufhängen", p);
    for (const p of ["Stefan", "Niklas"]) dienst(sp, "Getränkestand", p);
    for (const p of ["Tobias", "Kevin", "Philipp", "Dennis"]) dienst(sp, "Abbau", p, p === "Dennis" ? "demo-kasse" : undefined);
  }
  dienst("n1", "Hallenaufbau", "Tobias"); dienst("n1", "Hallenaufbau", "Kevin");
  dienst("n1", "Tribüne ausziehen", "Philipp");
  dienst("n1", "Getränkestand", "Stefan"); dienst("n1", "Getränkestand", "Niklas");
  dienst("n1", "Abbau", "Dennis", "demo-kasse");

  // Zeitnehmer (Kampfgericht)
  add("zeitnehmer", { id: "h-z1", spielId: sid.n1, name: "Patrick", besitzer: "h-g-patrick" });
  // Fahrgemeinschaft zum Auswärtsspiel, ab Haan Ost
  add("fahrten", { id: "h-f1", spielId: sid.n2, fahrer: "Kevin", plaetze: 3, treffpunkt: "17:00 Uhr ab Haan Ost (Parkplatz Bahnhof)", hinweis: "", richtung: "beide", besitzer: "h-g-kevin" });
  add("mitfahrer", { id: "h-m1", fahrtId: "h-f1", name: "Robin", eingetragenVon: "Robin", besitzer: "h-g-robin" });
  add("fahrten", { id: "h-f2", spielId: sid.n2, fahrer: "Sebastian", plaetze: 2, treffpunkt: "16:45 Uhr ab Halle", hinweis: "", richtung: "beide", besitzer: "h-g-sebastian" });
  add("fahrtbedarf", { id: "h-fb1", spielId: sid.n2, spieler: "Timo", richtung: "beide", von: "Timo", besitzer: "h-g-timo" });
  // Trikots reihum
  for (const k of ["p3", "p2", "p1"]) add("trikots", { id: sid[k], erledigt: true });

  // An- und Abmeldung
  const kommend = termineZeitraum({ trainingszeiten: einstellungen.trainingszeiten, spiele: spiele.map(([k, datum, zeit, gegner, heim]) => ({ id: sid[k], datum, zeit, gegner, heim })), ausfaelle: [] }, plus(heute, 1), plus(heute, 14));
  const melde = (termin, spieler, status, bemerkung = "") => add("anwesenheit", { id: `${termin.key}-${spieler.toLowerCase()}`, termin: termin.key, spieler, status, bemerkung, von: spieler });
  const tr = kommend.filter((x) => x.art === "training");
  if (tr[0]) { melde(tr[0], "Niklas", "nein", "Spätschicht"); melde(tr[0], "Mirko", "nein"); }
  if (tr[1]) melde(tr[1], "Christian", "nein", "Dienstreise");
  for (const sp of kommend.filter((x) => x.art === "spiel").slice(0, 2)) {
    for (const n of ["Christian", "Dennis", "Florian", "Kevin", "Niklas", "Patrick", "Philipp", "Robin", "Sebastian", "Stefan", "Tobias"]) melde(sp, n, "ja");
    melde(sp, "Mirko", "nein", "Hochzeit eines Freundes");
  }

  // Kasse
  const k = (id, datum, art, betrag, zweck, kategorie, kanal, extra = {}) => add("kasse", { id, datum, art, betrag, zweck, kategorie, kanal, beleg: "", spielId: "", ...extra });
  k("h-b1", t(-60), "einnahme", 14000, "Beiträge Mannschaftskasse (14 × 10 €)", "Mannschaftskasse Beiträge", "PayPal");
  k("h-b2", t(-30), "einnahme", 14000, "Beiträge Mannschaftskasse (14 × 10 €)", "Mannschaftskasse Beiträge", "PayPal");
  k("h-b3", t(-21), "ausgabe", 4800, "Kiste Bier und Wasser nach dem Heimspiel", "Getränke", "Bar", { spielId: sid.p3 });
  k("h-b4", t(-14), "einnahme", 3500, "Strafen (Verspätung, Handy in der Kabine)", "Strafen", "Bar");
  k("h-b5", t(-10), "einnahme", 25000, "Anzahlungen Mannschaftstour (5 × 50 €)", "Mannschaftstour", "Überweisung");
  k("h-b6", t(-7), "ausgabe", 6200, "Pizza nach dem Sieg gegen Bergtal", "Mannschaftsabend", "Bar", { spielId: sid.p1 });

  // Infos, Abfragen, Termine
  add("hinweise", { id: "h-h1", text: "Samstag ist Heimspiel: Aufbau ab 16:30 Uhr. Wer sich nicht eingetragen hat, schaut bitte in den Vorschlag bei den Helferdiensten.", bis: t(0), von: "Uwe (Trainer)" });
  const tourVon = plus(n1, 7 * 26 - 1); // Freitag in einem halben Jahr
  add("abfragen", { id: "h-a1", titel: "Mannschaftstour: Wie lange kannst du?", text: "Damit wir planen können: Wie viele Tage bekommst du frei? Mehrere Antworten möglich.",
    optionen: "2 Tage (Freitag bis Samstag)\n3 Tage (Freitag bis Sonntag)\n5 Tage (Mittwoch bis Sonntag)", frist: plus(heute, 10), geschlossen: false, von: "Dennis (Kasse)" });
  const a1 = { Christian: "0,1", Dennis: "0,1,2", Florian: "0,1", Kevin: "0,1,2", Niklas: "0", Patrick: "0,1", Philipp: "0,1,2", Sebastian: "0,1", Tobias: "0,1,2", Timo: "0" };
  for (const [sp, g] of Object.entries(a1)) add("abfrageAntworten", { id: `h-a1-${sp.toLowerCase()}`, abfrageId: "h-a1", spieler: sp, gewaehlt: g, bemerkung: sp === "Niklas" ? "Schichtdienst, mehr geht nicht" : "", von: sp });
  add("abfragen", { id: "h-a2", titel: "Wohin soll die Tour gehen?", text: "", optionen: "Hamburg\nPrag\nMallorca", frist: plus(heute, 10), geschlossen: false, von: "Dennis (Kasse)" });
  const a2 = { Christian: "0", Dennis: "0,1", Kevin: "2", Philipp: "1", Tobias: "0", Sebastian: "0,1", Patrick: "1" };
  for (const [sp, g] of Object.entries(a2)) add("abfrageAntworten", { id: `h-a2-${sp.toLowerCase()}`, abfrageId: "h-a2", spieler: sp, gewaehlt: g, bemerkung: "", von: sp });

  add("termine", { id: "h-tm1", titel: "Mannschaftsabend: Bowling", datum: t(13), zeit: "19:30", ort: "Bowlingcenter Musterstadt",
    beschreibung: "Zwei Bahnen sind reserviert. Die Bahnen zahlt die Mannschaftskasse, Essen und Getränke zahlt jeder selbst.", kostenProPerson: 0, frage: "", frist: t(9) });
  for (const [n, kommt] of Object.entries({ Christian: true, Dennis: true, Florian: true, Kevin: true, Philipp: true, Robin: false, Tobias: true, Stefan: true }))
    add("antworten", { id: `h-tm1-${n.toLowerCase()}`, terminId: "h-tm1", familie: n, kommt, personen: 0, bezahlt: false, angezahlt: false, bemerkung: "", von: n });
  add("termine", { id: "h-tm2", titel: "Mannschaftstour", datum: tourVon, bis: plus(tourVon, 2), zeit: "", ort: "Ziel wird abgestimmt (siehe Abfrage)",
    beschreibung: "Drei Tage mit der ganzen Mannschaft. Im Preis: Bus, zwei Übernachtungen mit Frühstück, ein gemeinsames Abendessen.\nDie Anzahlung sichert deinen Platz, der Rest wird vier Wochen vorher fällig.",
    kostenProPerson: 18000, anzahlung: 5000, anzahlungBis: plus(heute, 21), frage: "", frist: plus(heute, 21) });
  const tour = { Christian: [true, true, false], Dennis: [true, true, false], Florian: [true, false, false], Kevin: [true, true, false], Philipp: [true, true, false], Sebastian: [true, false, false], Tobias: [true, true, false], Niklas: [false, false, false] };
  for (const [n, [kommt, angezahlt, bezahlt]] of Object.entries(tour))
    add("antworten", { id: `h-tm2-${n.toLowerCase()}`, terminId: "h-tm2", familie: n, kommt, personen: 0, angezahlt, bezahlt, bemerkung: "", von: n });

  return { einstellungen, eintraege: E };
}
