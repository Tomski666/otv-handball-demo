// Elternseite OTV männliche C-Jugend: Single-Page-App ohne Framework.

// ---------- Grundlagen ----------
const $ = (sel, el = document) => el.querySelector(sel);
const inhalt = $("#inhalt");
let Z = null; // Gesamtzustand vom Server
let galerie = [];
let galerieGeladen = false;
let albumFilter = "Alle";
let kassenFilter = "alle";
let kassenDetails = false;

function lokal(key, wert) {
  try {
    if (wert === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, wert);
  } catch { return null; }
}
// Kennung dieses Geräts, damit Eltern ihre eigenen Einträge wieder löschen können
let besitzer = lokal("otv_besitzer");
if (!besitzer) {
  besitzer = crypto.randomUUID();
  lokal("otv_besitzer", besitzer);
}
const gemerkterName = () => lokal("otv_name") || "";
const meinVorname = () => lokal("otv_vorname") || (lokal("otv_name") || "").split(" (")[0];
const meinKind = () => lokal("otv_kind") || "";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const euro = (cent) => (cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const heute = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MO = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const datum = (iso) => new Date(iso + "T12:00:00");
const datumKurz = (iso) => datum(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const datumLang = (iso) => datum(iso).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

async function api(methode, pfad, body) {
  const opts = { method: methode, headers: { "x-besitzer": besitzer } };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) {
    opts.headers["content-type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(pfad, opts);
  if (res.status === 401) {
    location.href = "/login.html?ziel=" + encodeURIComponent(location.pathname + location.hash);
    throw new Error("Nicht angemeldet");
  }
  const daten = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(daten.fehler || "Fehler " + res.status);
  return daten;
}

function meldung(text, istFehler = false) {
  const t = document.createElement("div");
  t.className = "toast" + (istFehler ? " fehler" : "");
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), istFehler ? 5000 : 2500);
}

async function laden() {
  Z = await api("GET", "/api/zustand");
  // Der Spieler-Zugang bekommt nur einen Teil der Daten: fehlende Listen leer setzen
  for (const k of ["spiele", "kader", "trainer", "standdienst", "catering", "trikots", "fahrten", "mitfahrer", "fahrtbedarf", "vorrat", "waesche", "zeitnehmer", "waschdienst",
    "hinweise", "abfragen", "abfrageAntworten", "termine", "antworten", "kasse", "anwesenheit", "trainingsausfall"]) if (!Array.isArray(Z[k])) Z[k] = [];
  document.body.classList.toggle("rolle-kasse", Z.rolle === "kasse");
  document.body.classList.toggle("rolle-trainer", Z.rolle === "trainer" || Z.rolle === "kasse");
  document.body.classList.toggle("rolle-spieler", nurSpielerSicht());
  if (Z.demo) demoLeiste();
}

// ---------- Demo ----------
const ROLLEN_NAME = { spieler: "Spieler", eltern: "Elternteil", trainer: "Trainer", kasse: "Kasse" };
function demoLeiste() {
  let l = $("#demo-leiste");
  if (!l) {
    l = document.createElement("div");
    l.id = "demo-leiste";
    l.className = "demo-leiste";
    document.body.prepend(l);
    l.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.demo === "wechseln") { await fetch("/api/logout", { method: "POST" }); location.href = "/login.html"; }
      if (b.dataset.demo === "zuruecksetzen" && confirm("Alle Änderungen in der Demo verwerfen und die Beispieldaten neu laden?")) {
        b.disabled = true;
        await api("POST", "/api/demo/zuruecksetzen");
        await neuLaden("Demo zurückgesetzt");
      }
    });
  }
  l.innerHTML = `<span><strong>Demo ${esc(Z.einstellungen.mannschaftName || "")}</strong> mit erfundenen Daten · Du siehst die Seite als <strong>${ROLLEN_NAME[Z.rolle]}</strong> (${esc(Z.demo.person.text)})</span>
    <span class="demo-knoepfe"><a href="#/funktionen">Funktionen</a><button type="button" data-demo="wechseln">Rolle oder Mannschaft wechseln</button><button type="button" data-demo="zuruecksetzen">Zurücksetzen</button></span>`;
}
// Funktionsübersicht (nur in der Demo)
function seiteFunktionen() {
  if (!Z.demo) return seiteStart();
  const r = (...rollen) => `<span class="rollen">${rollen.map((x) => `<span class="rolle-${x}">${ROLLEN_NAME[x]}</span>`).join("")}</span>`;
  const block = (titel, rollen, punkte, probier) => `<section class="karte funktion">
    <div class="karte-kopf"><h2 style="margin:0">${titel}</h2>${rollen}</div>
    <ul class="punkte-liste">${punkte.map((p) => `<li>${p}</li>`).join("")}</ul>
    ${probier ? `<p class="probier"><strong>Probier aus:</strong> ${probier}</p>` : ""}
  </section>`;
  return `${kopfzeile("Demo", "Was kann die Seite?")}
  <section class="karte hinweis-demo">
    <p>Eine Seite für Eltern, Trainer und Kassenwart einer Jugendmannschaft. Sie ersetzt Listen in der WhatsApp-Gruppe, Zettel am Kuchenstand und das Kassenbuch auf Papier. Keine App aus dem Store, keine Benutzerkonten: ein Passwort pro Rolle, eingetragen wird nur der Vorname.</p>
    <p><strong>Zur Demo:</strong> Alle Namen, Spiele und Beträge sind erfunden. Du kannst alles ausprobieren, eintragen und löschen. Die Daten werden <strong>jeden Tag neu angelegt</strong> und lassen sich oben über „Zurücksetzen“ sofort wiederherstellen. Über „Rolle wechseln“ siehst du die Seite als Elternteil, Trainer oder Kasse.</p>
    <p class="leise klein">Du bist gerade angemeldet als <strong>${ROLLEN_NAME[Z.rolle]}</strong> (${esc(Z.demo.person.text)}) bei der Demo-Mannschaft <strong>${esc(Z.einstellungen.mannschaftName || "")}</strong>. Über „Rolle oder Mannschaft wechseln“ kommst du zur zweiten Demo-Mannschaft.</p>
  </section>
  <h2 class="bereich-titel">Für jede Mannschaft passend</h2>
  ${block("Jugend und Erwachsene", r("kasse"), [
    "<strong>Jugend:</strong> Eltern organisieren Standdienst, Kuchen und Fahrten. Die Jungs melden sich mit eigenem Zugang für Training und Spiele.",
    "<strong>Erwachsene:</strong> Es gibt keinen Eltern-Zugang. Die Spieler übernehmen selbst Dienste, Fahrten, Zu- und Absagen. Alle Texte sprechen sie direkt an.",
    "Umschalten in der Verwaltung, die Daten bleiben dabei erhalten.",
  ], "Beide Demo-Mannschaften ansehen: C-Jugend und 1. Herren.")}
  ${block("Module ein- und ausschalten", r("kasse"), [
    "Jede Mannschaft schaltet nur ein, was sie braucht: Standdienst, Strichliste, Helferdienste, Zeitnehmer, Wäsche, Trikots, Fahrten, An- und Abmeldung, Infos, Termine, Abfragen, Kasse, Galerie, Erinnerungen.",
    "Was aus ist, verschwindet überall: Menü, Startseite, Spielkarten, WhatsApp-Texte und Erinnerungen. So bleibt die Seite übersichtlich.",
  ], "Als Kasse unter Mehr › Verwaltung › Einstellungen › Module einen Bereich ausschalten und die Startseite ansehen.")}
  ${block("Helferdienste mit Fairness", r("spieler", "eltern", "trainer", "kasse"), [
    "Frei anlegbare Dienste pro Heimspiel, zum Beispiel Hallenaufbau, Tribüne, Werbebanner, Getränkestand und Abbau, jeweils mit Anzahl Personen und Uhrzeit.",
    "Eine Übersicht für alle zeigt, wer wie oft dran war. So hängt es nicht immer an denselben.",
    "Sind Dienste kurz vor dem Spiel noch offen, schlägt die Seite die vor, die bisher am seltensten dran waren, und erinnert sie per Push.",
    "Trainer und Kasse können Spieler direkt eintragen.",
  ], "Bei den 1. Herren als Spieler (Marco) das nächste Heimspiel öffnen: Marco steht im Vorschlag, weil er noch nie dran war.")}
  ${block("Mannschaftsabende und Touren", r("spieler", "eltern", "trainer", "kasse"), [
    "Termine mit Zu- und Absage, Begleitpersonen und Kosten, auch über mehrere Tage.",
    "Für die Mannschaftstour: Kosten pro Person, Anzahlung mit Frist, Liste wer angezahlt und wer bezahlt hat. Die Kasse bucht Anzahlung und Restzahlung mit einem Klick.",
    "Vorab eine Abfrage: Wie viele Tage kannst du? Wohin soll es gehen?",
  ], "Bei den 1. Herren unter Infos & Termine die Mannschaftstour und die Abfragen ansehen.")}
  <h2 class="bereich-titel">Für alle Eltern</h2>
  ${block("Start: Deine Aufgaben", r("eltern", "trainer", "kasse"), [
    "Oben steht, was du zugesagt hast: Standdienst, Kuchen, Fahrt, Zeitnehmer, Wäsche, Trikots, Termine.",
    "Offene Rückmeldungen (Abfragen, Termine) erscheinen mit Frist, bis sie beantwortet sind.",
    "Jeder Termin lässt sich mit einem Klick in den eigenen Kalender übernehmen.",
    "Darunter die nächsten Spiele mit allem, was noch fehlt.",
  ], "Als Elternteil die Startseite ansehen: Sandra hat Standdienst und noch zwei Rückmeldungen offen.")}
  ${block("Spiele", r("eltern", "trainer", "kasse"), [
    "Eine Karte pro Spiel mit allen Aufgaben: Standdienst, Mitbringliste, Zeitnehmer, Wäsche, Trikots und bei Auswärtsspielen Fahrgemeinschaften.",
    "Standdienst mit Reserveplatz. Sagt jemand ab, rückt die Reserve automatisch nach.",
    "Treffzeit in der Halle wird aus der Anwurfzeit berechnet, die Halle ist mit Route verlinkt.",
    "Austragen geht auf dem eigenen Handy jederzeit, ohne jemanden fragen zu müssen.",
    "Fahrten: Hin- und Rückfahrt getrennt anbieten, Kinder in ein anderes Auto umsteigen lassen, „Wir suchen noch eine Fahrt“ melden. Fahrer nehmen gesuchte Kinder mit einem Klick mit.",
    "Kalender-Abo: alle Spiele und Termine automatisch im Handykalender, Änderungen kommen von selbst nach.",
  ], "Beim nächsten Heimspiel „Ich mache das“ beim Zeitnehmer drücken oder bei der Fahrt „Ben fährt mit“.")}
  ${block("Training und Spiele: an- und abmelden", r("spieler", "eltern", "trainer", "kasse"), [
    "Die Jungs haben einen eigenen Zugang und melden sich selbst für Training und Spiele an oder ab, mit kurzem Hinweis.",
    "Beim Training gilt wahlweise: dabei, wer sich nicht abmeldet. Bei Spielen sagen alle zu oder ab.",
    "Eltern sehen, wie sich ihr Sohn gemeldet hat, melden aber nicht selbst. Der Spieler-Zugang sieht keine Kasse und keine Einträge der Eltern.",
    "Das Trainerteam sieht pro Termin, wer kommt, wer fehlt und wer sich noch nicht gemeldet hat, und kann Trainings absagen, auch für ganze Ferien.",
  ], "Über „Rolle wechseln“ als Spieler anmelden: Ben muss für das nächste Heimspiel noch zusagen.")}
  ${block("Erinnerungen aufs Handy", r("spieler", "eltern", "trainer", "kasse"), [
    "Push-Nachrichten ohne App-Store: Am Vortag erinnert die Seite an Standdienst, Kuchen, Fahrt und Zeitnehmer.",
    "Zwei Tage vor dem Spiel: was noch fehlt. Die Jungs werden erinnert, wenn sie sich noch nicht gemeldet haben.",
    "Fällt ein Training aus oder schreibt das Trainerteam eine wichtige Info, geht sofort eine Nachricht raus.",
    "In der Demo kannst du über Mehr › Benachrichtigungen eine Testnachricht an dein Handy schicken.",
  ])}
  ${block("Infos & Termine", r("eltern", "trainer", "kasse"), [
    "Infos vom Trainerteam mit Ablaufdatum, alte Infos verschwinden von selbst.",
    "Abfragen mit Mehrfachauswahl (z. B. Ferientraining) oder Ja/Nein (z. B. Turnier), mit Frist und Übersicht, wer schon geantwortet hat.",
    "Termine mit Rückmeldung, Personenzahl und Kostenbeitrag, die Kasse hakt ab, wer bezahlt hat.",
  ], "Als Elternteil beim Ferientraining für Ben ankreuzen.")}
  ${block("Kasse, transparent für alle", r("eltern", "trainer", "kasse"), [
    "Kassenstand, Einnahmen nach Zahlungsart und Ausgaben nach Zweck.",
    "Ergebnis je Heimspiel: was der Kuchenstand eingebracht hat.",
    "Alle Buchungen einsehbar, Namen erscheinen dort nicht.",
  ])}
  ${block("Trikots, Mannschaft, Galerie", r("eltern", "trainer", "kasse"), [
    "Trikot-Waschplan, der reihum durch alle Familien läuft. Tauschen geht selbst.",
    "Mannschaft mit Trainerteam, Kader und Trainingszeiten samt Hallenadresse.",
    "Optionale Fotogalerie mit Meldefunktion: Ein gemeldetes Foto ist sofort ausgeblendet.",
    "Die Seite lässt sich auf dem Handy wie eine App auf den Startbildschirm legen.",
  ])}
  <h2 class="bereich-titel">Für das Trainerteam</h2>
  ${block("Infos, Abfragen, Termine anlegen", r("trainer", "kasse"), [
    "Trainer schreiben Infos, legen Abfragen und Termine an und sehen die Antworten gesammelt.",
    "Fertiger WhatsApp-Text pro Spiel: Trainer-Infos oben, darunter was noch gesucht wird und wer schon eingetragen ist, mit Link zur Seite.",
  ], "Als Trainer unter Infos eine neue Abfrage anlegen.")}
  <h2 class="bereich-titel">Für die Kasse</h2>
  ${block("Heimspiel abrechnen", r("kasse"), [
    "Einmal nach dem Spiel ausfüllen: Einnahmen je Zahlungsart, verkaufte Getränke, Einkauf.",
    "Daraus entstehen die Buchungen und ein fertiger Text für die WhatsApp-Gruppe.",
    "Getränke: Der Standdienst zählt am Handy mit (Strichliste). Die Zahlen stehen in der Abrechnung schon drin.",
    "Der Anteil, der an den Verein geht, wird automatisch berechnet und als offen geführt, bis er bezahlt ist.",
  ], "Als Kasse unter Kasse „Heimspiel abrechnen“ öffnen: Das letzte Heimspiel ist vorausgewählt und die Strichliste schon eingetragen.")}
  ${block("Kassenbuch", r("kasse"), [
    "Einzelne Buchungen erfassen, ändern und löschen, mit Kategorie, Zahlungsart und Beleg.",
    "Export als CSV für Excel.",
  ])}
  ${block("Verwaltung", r("kasse"), [
    "Spielplan, Kader und Trainer pflegen.",
    "Einstellungen: Plätze im Standdienst, Mitbringliste, Vorrat, Getränke mit Preisen, Hallen mit Adresse, Trainingszeiten.",
    "Helferübersicht: wer wie oft Standdienst, Kuchen, Fahrten und Wäsche übernommen hat.",
    "Namen zuordnen und bereinigen, damit überall nur Vorname und Sohn stehen.",
  ], "Als Kasse unter Mehr › Verwaltung die Helferübersicht ansehen.")}
  <h2 class="bereich-titel">Datenschutz und Technik</h2>
  ${block("Sparsam mit Daten", r("eltern", "trainer", "kasse"), [
    "Nur Vornamen, keine Nachnamen, keine Telefonnummern, keine Adressen.",
    "Keine Benutzerkonten, keine Werbung, kein Tracking. Suchmaschinen sind ausgeschlossen.",
    "Vier Zugänge: Spieler, Eltern, Trainer, Kasse. Jede Rolle sieht und darf nur, was sie braucht.",
    "Läuft im Browser auf jedem Handy, ohne Installation aus einem App-Store.",
  ])}`;
}

// In der Demo bekommt jede Rolle eine feste Person, damit kein Namensdialog stört
function demoPerson() {
  const p = Z.demo.person;
  lokal("otv_vorname", p.vorname);
  lokal("otv_kind", p.kind);
  lokal("otv_name", Z.rolle === "spieler" || (erwachsen() && p.kind) ? p.kind : p.kind ? `${p.vorname} (${p.kind})` : Z.rolle === "trainer" ? `${p.vorname} (Trainer)` : p.vorname);
  lokal("otv_willkommen", "1");
  lokal("otv_rolle", Z.rolle);
}

// ---------- abgeleitete Daten ----------
const spieleSortiert = () => [...Z.spiele].sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));
const heimspiele = () => spieleSortiert().filter((s) => s.heim);
const kommende = (liste) => liste.filter((s) => s.datum >= heute());
const vergangene = (liste) => liste.filter((s) => s.datum < heute());
const kader = () => [...Z.kader].sort((a, b) => (a.reihenfolge - b.reihenfolge) || a.vorname.localeCompare(b.vorname, "de"));
const familien = () => kader().map((k) => wirIhr().Familie + k.vorname);
const istAdmin = () => Z.rolle === "kasse";
// Ab 2.0: Mannschaftstyp und Module
const erwachsen = () => Z.einstellungen.mannschaftstyp === "erwachsene";
const nurSpielerSicht = () => Z.rolle === "spieler" && !erwachsen(); // Jugend: eingeschränkte Ansicht für die Jungs
const modul = (k) => (k === "dienste" ? (Z.einstellungen.module || {}).dienste === true : (Z.einstellungen.module || {})[k] !== false);
const MODULE = [
  ["standdienst", "Standdienst und Mitbringliste", "Heimspiel-Catering mit Reserve, Kuchen und Vorrat"],
  ["strichliste", "Getränke-Strichliste", "Zählen am Stand, Vereinsanteil in der Abrechnung"],
  ["dienste", "Helferdienste", "z. B. Hallenaufbau, Tribüne, Werbebanner, mit Fairness-Vorschlag"],
  ["zeitnehmer", "Zeitnehmer", ""],
  ["waesche", "Wäsche nach dem Heimspiel", ""],
  ["trikots", "Trikots waschen (reihum)", ""],
  ["fahrten", "Fahrgemeinschaften", ""],
  ["anwesenheit", "Training und Spiele: An- und Abmeldung", ""],
  ["infos", "Infos vom Trainerteam", ""],
  ["termine", "Termine, Mannschaftsabende, Touren", ""],
  ["abfragen", "Abfragen", ""],
  ["kasse", "Mannschaftskasse", ""],
  ["galerie", "Fotogalerie", ""],
  ["push", "Erinnerungen aufs Handy", ""],
];
// Wer bin ich in der Mannschaft? Jugend: der Sohn (Familie), Erwachsene: man selbst
const wirIhr = () => (erwachsen() ? { wir: "ich", ihr: "du", euch: "dich", seid: "bist", Familie: "" } : { wir: "wir", ihr: "ihr", euch: "euch", seid: "seid", Familie: "Familie von " });
const istTrainer = () => Z.rolle === "trainer" || Z.rolle === "kasse";
const darfLoeschen = (e) => istAdmin() || e.eigen;

function trikotPlan() {
  const fam = familien();
  return spieleSortiert().map((s, i) => {
    const eintrag = Z.trikots.find((t) => t.id === s.id) || {};
    return {
      spiel: s,
      familie: eintrag.familie || (fam.length ? fam[i % fam.length] : "–"),
      getauscht: !!eintrag.familie,
      erledigt: !!eintrag.erledigt,
    };
  });
}

function kassenBuchungen() {
  return [...Z.kasse].sort((a, b) => (a.datum + a.erstellt).localeCompare(b.datum + b.erstellt));
}
function kassenSummen() {
  const b = kassenBuchungen();
  const ein = b.filter((x) => x.art === "einnahme").reduce((s, x) => s + x.betrag, 0);
  const aus = b.filter((x) => x.art === "ausgabe").reduce((s, x) => s + x.betrag, 0);
  return { ein, aus, saldo: Z.einstellungen.anfangsbestand + ein - aus };
}

function spielName(id) {
  const s = Z.spiele.find((x) => x.id === id);
  return s ? `${datumKurz(s.datum)} gegen ${s.gegner}` : "";
}

function datumBlock(iso) {
  const d = datum(iso);
  return `<div class="datum-block"><div class="wt">${WT[d.getDay()]}</div><div class="tg">${d.getDate()}</div><div class="mo">${MO[d.getMonth()]}</div></div>`;
}
function spielZeile(s) {
  return `<div class="spiel">${datumBlock(s.datum)}<div>
    <div class="spiel-titel">${s.heim ? "OTV gegen " + esc(s.gegner) : esc(s.gegner) + " gegen OTV"}</div>
    <div class="leise">${s.zeit ? esc(s.zeit) + " Uhr · " : ""}${esc(s.halle || "Halle folgt")}
      <span class="${s.heim ? "marke-heim" : "marke-aus"}">${s.heim ? "Heim" : "Auswärts"}</span></div>
    ${s.hinweis ? `<div class="klein">${esc(s.hinweis)}</div>` : ""}
  </div></div>`;
}
// Uhrzeit, zu der der Standdienst da sein soll (Anpfiff minus Vorlauf)
function treffzeit(s) {
  if (!s.zeit) return "";
  const [h, m] = s.zeit.split(":").map(Number);
  const min = Math.max(0, h * 60 + m - (Z.einstellungen.standdienstVorlauf ?? 60));
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
// grober Vorschlag: 45 Minuten Fahrt vor der Treffzeit
function abfahrtVorschlag(s) {
  const t = treffzeit(s);
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const min = Math.max(0, h * 60 + m - 45);
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
// Hallen mit Adresse (Verwaltung) und Route-Link zu Google Maps (öffnet auf dem Handy die Karten-App)
function halleZu(name) {
  const n = (name || "").trim().toLowerCase();
  if (!n) return null;
  const hallen = Z.einstellungen.hallen || [];
  return hallen.find((h) => h.name.toLowerCase() === n) || hallen.find((h) => n.includes(h.name.toLowerCase()) || h.name.toLowerCase().includes(n)) || null;
}
function routeLink(name, klasse = "knopf klein zweit") {
  const h = halleZu(name);
  const ziel = h && h.adresse ? h.adresse : "";
  return ziel ? `<a class="${klasse}" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ziel)}" target="_blank" rel="noopener">Route</a>` : "";
}
const halleAdresse = (name) => halleZu(name)?.adresse || "";

function hallenZeile(s) {
  const t = treffzeit(s);
  const wer = erwachsen() ? "Treffen" : "Die Jungs müssen";
  return `<p class="info-zeile">${t ? `${wer} spätestens um <strong>${t} Uhr</strong> in der Halle${erwachsen() ? "" : " sein"}` : `${wer} ${Z.einstellungen.standdienstVorlauf ?? 60} Minuten vor Anwurf in der Halle${erwachsen() ? "" : " sein"}`} (${Z.einstellungen.standdienstVorlauf ?? 60} Minuten vor Anwurf). Abfahrt bitte entsprechend früher planen.</p>`;
}
const AUSTRAGEN_HINWEIS = "Austragen geht nur auf dem Handy, mit dem du dich eingetragen hast. Sonst kurz in die WhatsApp-Gruppe schreiben.";
const kopfzeile = (unter, titel) => `<p class="unterzeile">${unter}</p><h1>${titel}</h1>`;

// ---------- Seiten ----------
const SEITEN = {
  "": seiteStart,
  mannschaft: seiteMannschaft,
  spiele: seiteSpiele,
  catering: seiteCatering,
  fahrten: seiteFahrten,
  termine: seiteInfos,
  infos: seiteInfos,
  trikots: seiteTrikots,
  kasse: seiteKasse,
  galerie: seiteGalerie,
  verwaltung: seiteVerwaltung,
  datenschutz: seiteDatenschutz,
  funktionen: seiteFunktionen,
  anwesenheit: seiteAnwesenheit,
};
const SPIELER_SEITEN = { "": seiteSpielerStart, mannschaft: seiteMannschaft, datenschutz: seiteDatenschutz, funktionen: seiteFunktionen };

function meineTermine() {
  const t = [];
  const spiel = (id) => Z.spiele.find((x) => x.id === id);
  const kommt = (sp) => sp && sp.datum >= heute();
  for (const d of Z.standdienst.filter((x) => x.eigen && modul("standdienst"))) {
    const sp = spiel(d.spielId);
    if (kommt(sp)) t.push({ key: "s" + d.id, spiel: sp, text: d.reserve ? "Du bist Reserve beim Standdienst" : `Du hast Standdienst${d.nachgerueckt ? " (nachgerückt)" : ""}${treffzeit(sp) ? `, ab ${treffzeit(sp)} Uhr` : ""}`, standdienst: true, link: "#/catering" });
  }
  for (const c of Z.catering.filter((x) => x.eigen && modul("standdienst"))) {
    const sp = spiel(c.spielId);
    if (kommt(sp)) t.push({ key: "c" + c.id, spiel: sp, text: `Du bringst ${c.artikel} mit${c.menge ? ` (${c.menge})` : ""}`, link: "#/catering" });
  }
  for (const x of (Z.dienste || []).filter((x) => x.eigen && modul("dienste"))) {
    const sp = spiel(x.spielId);
    const art = dienstArten().find((a) => a.name === x.dienst);
    if (kommt(sp)) t.push({ key: "d" + x.id, spiel: sp, text: `Du hast ${x.dienst}${art ? dienstZeitText(sp, art, true) : ""}`, standdienst: true, link: "#/spiele" });
  }
  for (const f of Z.fahrten.filter((x) => x.eigen && modul("fahrten"))) {
    const sp = spiel(f.spielId);
    const mit = Z.mitfahrer.filter((m) => m.fahrtId === f.id).map((m) => m.name);
    if (kommt(sp)) t.push({ key: "f" + f.id, spiel: sp, text: `Du fährst${mit.length ? ": " + mit.join(", ") : ""}${f.treffpunkt ? " · " + f.treffpunkt : ""}${treffzeit(sp) ? ` · in der Halle um ${treffzeit(sp)}` : ""}`, standdienst: true, link: "#/fahrten" });
  }
  for (const m of Z.mitfahrer.filter((x) => x.eigen && modul("fahrten"))) {
    const f = Z.fahrten.find((x) => x.id === m.fahrtId);
    const sp = f && spiel(f.spielId);
    if (kommt(sp)) t.push({ key: "m" + m.id, spiel: sp, text: `${erwachsen() && m.name === meinKind() ? "Du fährst" : m.name + " fährt"} mit bei ${anzeigeName(f.fahrer)}${f.treffpunkt ? " · " + f.treffpunkt : ""}`, standdienst: true, link: "#/fahrten" });
  }
  for (const w of (Z.waschdienst || []).filter((x) => x.eigen && modul("waesche"))) {
    const sp = spiel(w.spielId);
    if (!sp) continue;
    if (kommt(sp)) t.push({ key: "w" + w.id, spiel: sp, text: `Du nimmst nach dem Spiel ${waescheText()} mit`, standdienst: true, link: "#/catering" });
    else {
      const naechstes = kommende(heimspiele()).find((x) => x.datum > sp.datum);
      if (naechstes) t.push({ key: "wz" + w.id, spiel: naechstes, text: `Bitte ${waescheText()} gewaschen mitbringen`, standdienst: true, link: "#/catering" });
    }
  }
  for (const z of (Z.zeitnehmer || []).filter((x) => x.eigen && modul("zeitnehmer"))) {
    const sp = spiel(z.spielId);
    if (kommt(sp)) t.push({ key: "z" + z.id, spiel: sp, text: "Du bist Zeitnehmer", standdienst: true, link: "#/spiele" });
  }
  if (meinKind() && modul("termine")) {
    for (const a of (Z.antworten || []).filter((x) => x.familie === meinKind() && x.kommt)) {
      const tm = (Z.termine || []).find((x) => x.id === a.terminId);
      if (tm && tm.datum >= heute()) t.push({ key: "a" + a.id, spiel: { datum: tm.datum, zeit: tm.zeit, titel: tm.titel, ort: tm.ort }, text: `${tm.titel}${a.personen ? ` (+${a.personen})` : ""}`, link: "#/infos" });
    }
  }
  if (meinKind() && modul("trikots")) {
    for (const p of trikotPlan().filter((p) => !p.erledigt && p.spiel.datum >= heute() && p.familie === wirIhr().Familie + meinKind())) {
      t.push({ key: "t" + p.spiel.id, spiel: p.spiel, text: erwachsen() ? "Du nimmst die Trikots zum Waschen mit" : "Ihr nehmt die Trikots zum Waschen mit", link: "#/trikots" });
    }
  }
  return t.sort((a, b) => (a.spiel.datum + a.spiel.zeit).localeCompare(b.spiel.datum + b.spiel.zeit));
}

function kalenderLaden(termine) {
  if (!termine.length) return;
  const f = (d) => d.replace(/-/g, "");
  const z = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OTV C-Jugend//DE", "CALSCALE:GREGORIAN"];
  for (const t of termine) {
    const s = t.spiel;
    const titel = t.titel || (s.titel ? t.text : `${t.text.split(" · ")[0]}: ${s.heim ? "OTV gegen " + s.gegner : s.gegner + " gegen OTV"}`);
    z.push("BEGIN:VEVENT", `UID:${t.key}@otv-c-jugend`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`);
    if (s.zeit) {
      const start = t.standdienst && treffzeit(s) ? treffzeit(s) : s.zeit;
      const [h, m] = start.split(":").map(Number);
      const ende = `${String(Math.min(23, h + 2)).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
      z.push(`DTSTART:${f(s.datum)}T${start.replace(":", "")}00`, `DTEND:${f(s.datum)}T${ende}`);
    } else {
      z.push(`DTSTART;VALUE=DATE:${f(s.datum)}`);
    }
    z.push(`SUMMARY:${titel.replace(/[,;]/g, "\\$&")}`);
    const ort = s.halle ? [s.halle, halleAdresse(s.halle)].filter(Boolean).join(", ") : s.ort;
    if (ort) z.push(`LOCATION:${ort.replace(/[,;]/g, "\\$&")}`);
    z.push(`DESCRIPTION:${(t.text + "\\n" + location.origin + "/" + t.link).replace(/[,;]/g, "\\$&")}`);
    z.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Erinnerung OTV C-Jugend", "END:VALARM", "END:VEVENT");
  }
  z.push("END:VCALENDAR");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([z.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  a.download = termine.length === 1 ? "OTV-Termin.ics" : "OTV-Termine.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  meldung("Kalenderdatei geladen, bitte öffnen und hinzufügen");
}

const wochentagLang = (s) => datum(s.datum).toLocaleDateString("de-DE", { weekday: "long" });
const istBald = (s) => (datum(s.datum) - datum(heute())) / 864e5 < 7;

// Eine Zeile in der Aufgabenliste: Status-Punkt, Titel, Stand, Details, Knopf
function aufgabe({ status = "offen", titel, stand = "", detail = "", knopf = "" }) {
  return `<li class="aufgabe st-${status}"><span class="punkt" aria-hidden="true"></span>
    <div class="aufgabe-text"><div><strong>${titel}</strong>${stand ? ` <span class="aufgabe-stand">${stand}</span>` : ""}</div>${detail ? `<div class="aufgabe-detail">${detail}</div>` : ""}</div>
    ${knopf ? `<div class="aufgabe-knopf">${knopf}</div>` : ""}</li>`;
}
// Name mit Sohn anzeigen. Fehlt der Sohn im Eintrag, hilft die Zuordnung aus der Verwaltung.
// Angezeigt wird nur der Vorname (Datensparsamkeit), auch wenn jemand den Nachnamen mit eingetragen hat.
function anzeigeName(name) {
  const n = (name || "").trim();
  const f = (Z.einstellungen.namenZuordnung || {})[n.toLowerCase()];
  const klammer = /\(([^()]+)\)\s*$/.exec(n);
  const basis = n.replace(/\s*\([^()]+\)\s*$/, "").split(/\s+/)[0] || n;
  const sohn = f && f !== "-" ? f : klammer ? klammer[1].trim() : "";
  return sohn ? `${basis} (${sohn})` : basis;
}
const wer = (liste) => liste.map((x) => `${esc(anzeigeName(x.name))}${x.eigen ? " · du" : ""}`).join(", ");
const offenZaehler = (html) => (html.match(/st-(offen|dringend)/g) || []).length;
function statusPill(n) {
  return n ? `<span class="pill offen">${n} ${n === 1 ? "Aufgabe" : "Aufgaben"} offen</span>` : `<span class="pill ok">✓ Alles besetzt</span>`;
}


function uebernaechstesHinweis(heim, schonGezeigt = []) {
  if (!cateringStatus(heim).komplett) return "";
  const naechste = kommende(heimspiele()).filter((s) => s.id !== heim.id && !schonGezeigt.includes(s.id)).find((s) => !cateringStatus(s).komplett);
  if (!naechste) return "";
  const st = cateringStatus(naechste);
  const frei = st.plaetze - st.dienst;
  const mitbringen = st.offen.length === st.artikel.length ? ["die ganze Mitbringliste"] : st.offen.map((a) => a.name);
  const teile = [frei > 0 ? `${frei}× Standdienst` : "", ...mitbringen].filter(Boolean);
  return `<p class="danach"><a href="#/catering" data-aktion="springen-catering" data-id="${naechste.id}">Am ${datum(naechste.datum).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })} gegen ${esc(naechste.gegner)} fehlen auch noch ${esc(teile.join(", "))} ›</a></p>`;
}

// ---------- Strichliste Getränke ----------
const getraenkeListe = () => Z.einstellungen.getraenke || [];
const otvAnteil = () => (Z.einstellungen.otvAnteilProzent ?? 50) / 100;
const darfStrich = (s) => s && s.heim && (Z.strichBerechtigt === "alle" || (Z.strichBerechtigt || []).includes(s.id));
// Standdienst sieht die Strichliste am Spieltag und am Tag danach, die Kasse ab dem Spieltag
function strichSichtbar(s) {
  if (!darfStrich(s)) return false;
  const tage = (datum(heute()) - datum(s.datum)) / 864e5;
  return Z.strichBerechtigt === "alle" ? true : tage >= 0 && tage <= 1;
}
const strichVon = (s) => (Z.strichSummen || {})[s.id] || {};
function getraenkeRechnung(zaehler) {
  let stueck = 0, umsatz = 0;
  for (const g of getraenkeListe()) { const n = zaehler[g.name] || 0; stueck += n; umsatz += n * g.preis; }
  for (const [k, n] of Object.entries(zaehler)) if (!getraenkeListe().some((g) => g.name === k)) stueck += n; // Getränke ohne Preis zählen mit
  return { stueck, umsatz, otv: Math.round(umsatz * otvAnteil()) };
}
function strichKarte(s, offen = false) {
  const z = strichVon(s);
  const r = getraenkeRechnung(z);
  return `<details class="strichliste" id="strich-${s.id}" ${offen ? "open" : ""}>
    <summary><span>Strichliste Getränke</span><span class="pill neutral">${r.stueck} verkauft · ${euro(r.umsatz)}</span></summary>
    <p class="leise klein">Nur für den Standdienst sichtbar. Pro verkauftem Getränk einmal auf + tippen. Mehrere Handys zählen zusammen.</p>
    ${s.datum > heute() ? `<p class="hinweis" style="margin:0 0 6px">Vorschau für die Kasse: Der Standdienst sieht die Liste erst am Spieltag. Probeklicks bitte mit − wieder zurücknehmen.</p>` : ""}
    <ul class="strich-liste">${getraenkeListe().map((g) => `<li>
      <div class="strich-name"><strong>${esc(g.name)}</strong><span class="leise klein">${euro(g.preis)}</span></div>
      <button class="strich-minus" data-aktion="strich" data-spiel="${s.id}" data-getraenk="${esc(g.name)}" data-delta="-1" ${(z[g.name] || 0) ? "" : "disabled"} aria-label="${esc(g.name)} eins weniger">−</button>
      <span class="strich-zahl">${z[g.name] || 0}</span>
      <button class="strich-plus" data-aktion="strich" data-spiel="${s.id}" data-getraenk="${esc(g.name)}" data-delta="1" aria-label="${esc(g.name)} eins mehr">+</button>
    </li>`).join("")}</ul>
    <p class="strich-summe"><strong>${r.stueck} Getränke · ${euro(r.umsatz)}</strong>${istAdmin() ? ` <span class="leise">· davon an den OTV: ${euro(r.otv)}</span>` : ""}</p>
  </details>`;
}

// ---------- Eine Spielkarte für Startseite und Spiele-Seite ----------
function heimAufgaben(s) {
  const st = cateringStatus(s);
  const dienst = Z.standdienst.filter((x) => x.spielId === s.id && !x.reserve);
  const ichDienst = dienst.some((x) => x.eigen);
  const frei = st.plaetze - st.dienst;
  const bald = (datum(s.datum) - datum(heute())) / 864e5 <= 3;
  const z = [{
    status: frei > 0 ? (bald ? "dringend" : "offen") : "ok", titel: "Standdienst", kurz: "Standdienst",
    stand: `${st.dienst} von ${st.plaetze}${frei > 0 && bald ? " · dringend" : ""}`,
    detail: [dienst.length ? wer(dienst) : "", treffzeit(s) ? `ab ${treffzeit(s)} Uhr in der Halle` : ""].filter(Boolean).join(" · "),
    knopf: frei > 0 && !ichDienst ? `<button class="knopf klein" data-aktion="standdienst-ich" data-spiel="${s.id}">Ich übernehme</button>` : "",
  }];
  if (st.artikel.length) {
    const ok = st.artikel.filter((a) => a.zugesagt >= a.bedarf).length;
    const offen = st.artikel.filter((a) => a.zugesagt < a.bedarf);
    z.push({
      status: offen.length ? "offen" : "ok", titel: "Mitbringen", kurz: "Mitbringen",
      stand: `${ok} von ${st.artikel.length}`,
      detail: st.artikel.map((a) => `${esc(a.name)} <span class="${a.zugesagt >= a.bedarf ? "gut-text" : "offen-text"}">${a.zugesagt}/${a.bedarf}</span>`).join(" · "),
      knopf: offen.length ? `<button class="knopf klein zweit" data-aktion="mitbringen-liste" data-ziel="mb-${s.id}" aria-expanded="false">Ich bringe mit</button>` : "",
    });
  }
  return z;
}
function auswAufgaben(s) {
  const st = fahrtStatus(s);
  const kind = meinKind();
  const bedarf = bedarfVon(s);
  const ichFahre = st.fahrten.some((f) => f.eigen);
  const v = Z.einstellungen.standdienstVorlauf ?? 60;
  const z = [{
    status: "info", titel: "Treffen in der Halle",
    stand: treffzeit(s) ? `${treffzeit(s)} Uhr` : `${v} Min. vor Anwurf`,
    detail: `${s.halle ? esc(s.halle) + (halleAdresse(s.halle) && !s.halle.includes(halleAdresse(s.halle)) ? ", " + esc(halleAdresse(s.halle)) : "") : "Halle folgt"}`,
    knopf: routeLink(s.halle),
  }];
  if (!modul("fahrten")) return z;
  if (!st.fahrten.length) {
    z.push({ status: "offen", titel: "Fahrgemeinschaft", kurz: "Fahrer", stand: "noch kein Fahrer",
      knopf: `<button class="knopf klein" data-aktion="fahrt-anbieten" data-id="${s.id}">Ich fahre</button>` });
  }
  for (const f of st.fahrten) {
    const mit = Z.mitfahrer.filter((m) => m.fahrtId === f.id).map((m) => m.name);
    const frei = f.plaetze - mit.length;
    z.push({
      status: frei > 0 ? "ok" : "info",
      titel: `${esc(anzeigeName(f.fahrer))} fährt${richtungText(f) ? ` (${richtungText(f)})` : ""}${f.eigen ? " · du" : ""}`,
      stand: frei > 0 ? `${frei} frei` : "voll",
      detail: [f.treffpunkt ? "Abfahrt " + esc(abfahrtText(f.treffpunkt)) : "", mit.length ? "dabei: " + esc(mit.join(", ")) : "noch niemand dabei"].filter(Boolean).join(" · "),
      knopf: frei > 0 && kind && !fahrtKonflikt(kind, f) && !(erwachsen() && f.eigen) ? `<button class="knopf klein" data-aktion="mitfahren-schnell" data-fahrt="${f.id}">${erwachsen() ? "Ich fahre mit" : esc(kind) + " fährt mit"}</button>` : "",
    });
  }
  if (bedarf.length) {
    z.push({ status: "offen", titel: "Fahrt gesucht", kurz: "Fahrt gesucht", stand: `${bedarf.length} Spieler`,
      detail: esc(bedarf.map(bedarfText).join(", ")),
      knopf: `<button class="knopf klein zweit" data-aktion="mehr-oeffnen" data-id="${s.id}">Ansehen</button>` });
  }
  if (st.fahrten.length && !ichFahre) {
    z.push({ status: "info", titel: "Weitere Fahrer willkommen",
      knopf: `<button class="knopf klein zweit" data-aktion="fahrt-anbieten" data-id="${s.id}">Ich fahre auch</button>` });
  }
  return z;
}
function spielKarte(s, { start = false, schonGezeigt = [] } = {}) {
  const zeilen = [...(s.heim ? (modul("standdienst") ? heimAufgaben(s) : []) : auswAufgaben(s)), ...dienstAufgaben(s), zeitnehmerAufgabe(s), s.heim ? waescheAufgabe(s) : null, trikotAufgabe(s)].filter(Boolean);
  const offen = zeilen.filter((z) => z.status === "offen" || z.status === "dringend");
  const status = offen.length
    ? `<span class="pill ${offen.some((z) => z.status === "dringend") ? "dringend" : "offen"}">${offen.length <= 3 ? "Offen: " + offen.map((z) => z.kurz || z.titel).join(", ") : `${offen.length} Aufgaben offen`}</span>`
    : zeilen.some((z) => z.status === "ok") ? `<span class="pill ok">✓ Alles besetzt</span>` : "";
  const st = s.heim ? cateringStatus(s) : null;
  const auswahl = s.heim && modul("standdienst") && st.offen.length ? `<div class="mitbringen-auswahl" id="mb-${s.id}" hidden>
      <p class="leise klein" style="margin:4px 0 6px">Was bringst du mit? Einmal antippen genügt.</p>
      <div class="hero-knoepfe">${st.offen.map((a) => `<button class="knopf zweit gross" data-aktion="bringe-schnell" data-spiel="${s.id}" data-artikel="${esc(a.name)}">${esc(a.name)}${a.hinweis ? `<small>je ${esc(a.hinweis)}</small>` : ""}</button>`).join("")}</div></div>` : "";
  const offenGesetzt = start || (offeneSpiele && offeneSpiele.has(s.id));
  return `<details class="karte spiel-karte spielkarte ${s.heim ? "" : "aus"}" data-spiel="${s.id}" id="spiel-${s.id}" ${offenGesetzt ? "open" : ""}>
    <summary>${start ? `<span class="kachel-label">${s.heim ? "Nächstes Heimspiel" : "Nächstes Auswärtsspiel"}</span>` : ""}
      <div class="summary-innen">${spielZeile(s)}<div class="summary-status">${status}</div></div></summary>
    <div class="spielkarte-inhalt">
      <ul class="aufgaben">${zeilen.map(aufgabe).join("")}</ul>
      ${auswahl}
      ${modul("strichliste") && strichSichtbar(s) ? strichKarte(s, start && s.datum === heute()) : ""}
      ${(s.heim ? modul("standdienst") : modul("fahrten")) ? `<details class="mehr-details" id="mehr-${s.id}" ${offeneMehr.has(s.id) ? "open" : ""}><summary>${s.heim ? "Standdienst, Reserve und Mitbringliste im Detail" : erwachsen() ? "Fahrten im Detail: mitfahren, Plätze anbieten, Fahrt suchen" : "Fahrten im Detail: mitfahren, Plätze anbieten"}</summary>
        <div class="abstand">${s.heim ? cateringDetails(s) : fahrtenDetails(s)}</div></details>` : ""}
      ${istTrainer() || istAdmin() ? `<div class="spielkarte-fuss">
        ${istTrainer() ? `<button class="knopf klein zweit" data-aktion="whatsapp-spiel" data-spiel="${s.id}">Für WhatsApp kopieren</button>` : "<span></span>"}
        ${istAdmin() ? `<span class="ausrichten"><button class="link-knopf" data-aktion="spiel-bearbeiten" data-id="${s.id}">Spiel bearbeiten</button>
          <button class="link-knopf gefahr-text" data-aktion="loeschen" data-col="spiele" data-id="${s.id}" data-frage="Spiel löschen? Einträge zu diesem Spiel bleiben erhalten, werden aber nicht mehr angezeigt.">löschen</button></span>` : ""}
      </div>` : ""}
      ${start && s.heim ? uebernaechstesHinweis(s, schonGezeigt) : ""}
    </div>
  </details>`;
}
const heimKarte = (s, schonGezeigt) => spielKarte(s, { start: true, schonGezeigt });
const auswaertsKarte = (s) => spielKarte(s, { start: true });

function seiteStart() {
  const zwei = kommende(spieleSortiert()).slice(0, 2);
  const gezeigt = zwei.map((s) => s.id);
  const karten = zwei.map((s) => (s.heim ? heimKarte(s, gezeigt) : auswaertsKarte(s)));
  // Ist unter den zwei Spielen kein Heimspiel, das nächste Heimspiel kurz erwähnen
  const naechstesHeim = kommende(heimspiele())[0];
  const heimHinweis = naechstesHeim && !zwei.some((s) => s.heim) && !cateringStatus(naechstesHeim).komplett
    ? `<p class="danach"><a href="#/catering" data-aktion="springen-catering" data-id="${naechstesHeim.id}">Nächstes Heimspiel am ${datum(naechstesHeim.datum).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })}: Catering eintragen ›</a></p>` : "";

  const termine = meineTermine();
  const aufgabeLi = (t) => `<li><a class="meine-aufgabe" href="${t.link}"><span class="ma-datum">${wochentagKurz(t.spiel.datum)} ${kurzDatum(t.spiel.datum)}</span>
      <span class="ma-text"><strong>${esc(t.text)}</strong><span class="leise klein">${t.spiel.titel ? esc(t.spiel.ort || "") : (t.spiel.heim ? "gegen " : "bei ") + esc(t.spiel.gegner)}</span></span></a>
    <button class="link-knopf klein" data-aktion="kalender" data-key="${t.key}" aria-label="In den Kalender">Kalender</button></li>`;
  const meine = termine.length ? `<section class="karte deine-aufgaben">
    <div class="karte-kopf"><h2 style="margin:0">Deine Aufgaben</h2>
      ${termine.length > 1 ? `<button class="link-knopf klein" data-aktion="kalender" data-alle="1">Alle in den Kalender</button>` : ""}</div>
    <ul class="liste">${termine.slice(0, 4).map(aufgabeLi).join("")}</ul>
    ${termine.length > 4 ? `<details><summary class="klein">Alle anzeigen (${termine.length})</summary><ul class="liste">${termine.slice(4).map(aufgabeLi).join("")}</ul></details>` : ""}
  </section>` : "";

  const terminHinweis = offeneRueckmeldungen().filter((x) => !x.meins).map((x) => `<a class="termin-hinweis ${fristBald(x.frist) ? "dringend" : ""}" href="#/infos"><span><strong>${esc(x.titel)}</strong>${x.datum ? ` am ${kurzDatum(x.datum)}` : ""}: bitte ${meinKind() && !erwachsen() ? `für ${esc(meinKind())} ` : ""}${x.art === "termin" ? "zurückmelden" : "antworten"}${x.frist && x.frist >= heute() ? ` <span class="frist-text">bis ${wochentagKurz(x.frist)} ${kurzDatum(x.frist)}</span>` : ""}</span> ›</a>`).join("");

  const infos = modul("infos") && aktiveHinweise().length ? `<section class="karte infos-start"><div class="karte-kopf"><h2 style="margin:0">Vom Trainerteam</h2><a class="klein" href="#/infos">alle ›</a></div>${hinweiseKarte(true)}</section>` : "";
  return `<p class="unterzeile">${meinVorname() ? "Hallo " + esc(meinVorname()) : "Willkommen"}</p><h1>Die nächsten Spiele</h1>
  ${installKarte()}
  ${!meinKind() && Z.rolle !== "trainer" ? `<section class="karte sohn-fehlt"><div><strong>${erwachsen() ? "Wer bist du?" : "Wer ist dein Sohn?"}</strong>
      <div class="leise klein">${erwachsen() ? "Einmal auswählen, dann zählen deine Dienste für dich und du kannst bei Terminen und Abfragen antworten." : "Einmal auswählen, dann sind deine Einträge eurer Familie zugeordnet und du kannst bei Terminen und Abfragen antworten."}</div></div>
      <button class="knopf klein" data-aktion="name-aendern">Jetzt auswählen</button></section>` : ""}
  ${pushKarte()}
  ${infos}
  ${meine}
  ${anwesenheitStartKarte()}
  ${terminHinweis}
  ${karten.length ? karten.map((k, i) => `<div class="${i ? "abstand" : ""}">${k}</div>`).join("") : `<section class="karte"><p class="leer">Gerade steht kein Spiel an.</p></section>`}
  ${heimHinweis}`;
}

function seiteMannschaft() {
  const e = Z.einstellungen;
  const trainer = [...Z.trainer].sort((a, b) => a.reihenfolge - b.reihenfolge);
  const init = (n) => n.split(" ").map((t) => t[0]).join("").slice(0, 2).toUpperCase();
  return `${kopfzeile("Über uns", "Die Mannschaft")}
  <div class="raster-2">
    <section class="karte">
      <h2>Wer wir sind</h2>
      ${e.teamText.split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join("")}
      <p class="leise">Liga: ${esc(e.liga)}</p>
    </section>
    <section class="karte">
      <h2>Trainingszeiten</h2>
      <ul class="liste">${e.trainingszeiten.map((t) => `<li><div><strong>${esc(t.tag)}</strong><div class="leise">${esc(t.zeit)}</div></div>
        <div class="training-halle"><div>${esc(t.halle)}</div>${halleAdresse(t.halle) ? `<div class="leise klein">${esc(halleAdresse(t.halle))}</div>` : ""}${routeLink(t.halle, "link-knopf")}</div></li>`).join("")}</ul>
    </section>
  </div>
  <section class="karte abstand">
    <h2>Kader</h2>
    ${kader().length ? `<div class="kader">${kader().map((k) => `<span class="spieler">${k.nummer ? `<small>#${esc(k.nummer)}</small>` : ""}${esc(k.vorname)}</span>`).join("")}</div>`
      : `<p class="leer">Kader wird noch eingetragen.</p>`}
    <p class="leise abstand" style="margin-bottom:0">Wir nennen Spieler hier bewusst nur mit Vornamen.</p>
  </section>
  <p class="unterzeile abstand">Trainerteam</p>
  <div class="raster abstand" style="margin-top:8px">
    ${trainer.map((t) => `<section class="karte">
      <div class="trainer-kopf"><div class="initialen">${esc(init(t.name))}</div><div><h3 style="margin:0">${esc(t.name)}</h3><div class="leise">${esc(t.rolle)}</div></div></div>
      ${t.text ? t.text.split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join("") : `<p class="leer">Text folgt.</p>`}
    </section>`).join("")}
  </div>`;
}

// ---------- Kalender-Abo ----------
let kalenderPfad = null;
function kalenderAboKarte() {
  if (kalenderPfad === null) {
    kalenderPfad = "";
    api("GET", "/api/kalender-link").then((r) => { kalenderPfad = r.pfad; if (location.hash.startsWith("#/spiele") || nurSpielerSicht()) zeigen(); }).catch(() => { kalenderPfad = null; });
  }
  const https = kalenderPfad ? location.origin + kalenderPfad : "";
  const webcal = kalenderPfad ? "webcal://" + location.host + kalenderPfad : "";
  const android = /Android/i.test(navigator.userAgent);
  return `<details class="karte kalender-abo formular-klappe"><summary>Spiele und Termine im Handy-Kalender</summary>
    <p class="abstand">Einmal abonnieren, dann stehen alle Spiele automatisch in deinem Kalender und bleiben aktuell, auch wenn sich eine Anwurfzeit oder Halle ändert.</p>
    <p class="hinweis info" style="margin-bottom:12px"><strong>Gut zu wissen:</strong> Im Abo stehen nicht nur die Spiele, sondern auch andere Termine der Mannschaft, zum Beispiel Weihnachtsfeier oder Elternabend. Namen oder Einträge von Eltern stehen nicht darin.</p>
    ${kalenderPfad ? `<div class="ausrichten">
      ${android ? "" : `<a class="knopf" href="${webcal}">Kalender abonnieren</a>`}
      <button class="knopf ${android ? "" : "zweit"}" data-aktion="kalender-link-kopieren" data-link="${https}">Link kopieren</button>
    </div>
    <details class="abstand"><summary>${android ? "So geht es mit Android und Google Kalender" : "Android oder Google Kalender? So geht es"}</summary>
      <ol class="schritte abstand">
        <li>Oben auf <strong>„Link kopieren“</strong> tippen.</li>
        <li>Im Browser <strong>calendar.google.com</strong> öffnen (am besten am PC, in der Handy-App geht es leider nicht).</li>
        <li>Links bei „Weitere Kalender“ auf <strong>+</strong> und dann <strong>„Per URL“</strong>.</li>
        <li>Link einfügen und <strong>„Kalender hinzufügen“</strong>. Nach kurzer Zeit erscheint er auch in der App auf dem Handy.</li>
      </ol>
      <p class="leise klein">Google Kalender aktualisiert Abos nur alle paar Stunden. Kurzfristige Änderungen am Spieltag kommen weiter über WhatsApp.</p>
    </details>
    <p class="leise klein abstand">Den Link bitte nur innerhalb der Mannschaft weitergeben. ${kommende(spieleSortiert()).length ? `<button class="link-knopf" data-aktion="kalender-spiele">Spiele stattdessen einmalig als Datei laden</button>` : ""}</p>`
      : `<p class="leise">Link wird geladen …</p>`}
  </details>`;
}

let spieleFilter = "alle";
function seiteSpiele() {
  const e = Z.einstellungen;
  const alle = spieleSortiert();
  const f = spieleFilter;
  const liste = alle.filter((s) => f === "alle" || (f === "heim" ? s.heim : !s.heim));
  const k = kommende(liste), v = vergangene(liste);
  if (offeneSpiele === null) offeneSpiele = new Set(k.length ? [k[0].id] : []);
  const knopf = (wert, text) => `<button class="seg ${f === wert ? "an ok" : ""}" data-aktion="spiele-filter" data-wert="${wert}">${text}</button>`;
  return `${kopfzeile([modul("standdienst") && "Standdienst, Mitbringen", modul("dienste") && "Helferdienste", modul("fahrten") && "Fahrten", modul("zeitnehmer") && "Zeitnehmer"].filter(Boolean).join(", ") || "Spielplan", "Spiele")}
  <div class="spiele-kopf">
    <div class="segment filter">${knopf("alle", "Alle")}${knopf("heim", "Heimspiele")}${knopf("aus", "Auswärts")}</div>
  </div>
  <p class="leise klein">Spiel antippen, um alle Aufgaben zu sehen. ${AUSTRAGEN_HINWEIS}</p>
  ${k.length ? k.map((s) => spielKarte(s)).join("") : `<section class="karte"><p class="leer">Keine kommenden Spiele${f === "heim" ? " (Heim)" : f === "aus" ? " (Auswärts)" : ""} eingetragen.</p></section>`}
  ${v.length ? `<details class="abstand"><summary>Vergangene Spiele (${v.length})</summary><div class="abstand">${[...v].reverse().map((s) => spielKarte(s)).join("")}</div></details>` : ""}
  <h2 class="bereich-titel">Rund um die Spiele</h2>
  ${f !== "aus" && modul("standdienst") ? vorratKarte() : ""}
  ${f !== "aus" && modul("dienste") ? dienstFairnessKarte() : ""}
  ${kalenderAboKarte()}
  <details class="karte formular-klappe"><summary>Spielplan und Tabelle (handball.net)</summary>
    <div class="abstand">${e.widgetToken ? `<div id="handball-spielplan"></div><div id="handball-tabelle" class="abstand"></div>` : `<p>Spielplan, Ergebnisse und Tabelle kommen direkt von handball.net.</p>`}
    <a class="knopf zweit" href="${esc(e.handballNetUrl)}" target="_blank" rel="noopener">Auf handball.net öffnen</a></div>
  </details>
  <details class="karte formular-klappe nur-kasse" id="spiel-formular"><summary id="spiel-titel">Spiel hinzufügen</summary>
    <form class="zeile abstand" data-form="spiel">
      <input type="hidden" name="id">
      <div class="feld"><label>Datum</label><input type="date" name="datum" required></div>
      <div class="feld" style="flex-basis:110px"><label>Anwurf</label><input type="time" name="zeit"></div>
      <div class="feld"><label>Gegner</label><input type="text" name="gegner" required maxlength="80"></div>
      <div class="feld"><label>Halle</label><input type="text" name="halle" maxlength="80" list="hallen-liste"><datalist id="hallen-liste">${(e.hallen || []).map((h) => `<option value="${esc(h.name)}">`).join("")}</datalist></div>
      <div class="feld" style="flex-basis:130px"><label>Art</label><select name="heim"><option value="true">Heimspiel</option><option value="false">Auswärts</option></select></div>
      <div class="feld" style="flex-basis:100%"><label>Hinweis (optional)</label><input type="text" name="hinweis" maxlength="300" placeholder="z. B. Treffpunkt 13:45 Uhr"></div>
      <button class="knopf">Speichern</button>
      <button class="knopf zweit" type="reset" data-aktion="spiel-abbrechen">Leeren</button>
    </form>
  </details>`;
}

let offeneSpiele = null; // welche Heimspiel-Karten aufgeklappt sind
const meinName = () => gemerkterName().trim();

// Wird ein Artikel bei diesem Spiel gebraucht? Grundeinstellung ("immer" oder "bei Bedarf"), pro Spiel umschaltbar.
const mengenAnders = (s) => Object.fromEntries((s.mengen || "").split(",").map((x) => x.split("=")).filter((x) => x.length === 2 && x[0].trim()).map(([k, v]) => [k.trim(), Math.max(1, parseInt(v, 10) || 1)]));
const mengeFuer = (s, a) => mengenAnders(s)[a.name] ?? a.bedarf;
const anders = (s) => (s.artikelAnders || "").split(",").map((x) => x.trim()).filter(Boolean);
const gebraucht = (s, a) => (a.immer !== false) !== anders(s).includes(a.name);

// ---------- Vorrat und Wäsche ----------
const slug = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function vorratStand(name) {
  const v = (Z.vorrat || []).find((x) => x.id === slug(name));
  if (!v || v.status === "ok") return { status: "ok", v };
  const seit = v.datum || (v.geaendert || v.erstellt || "").slice(0, 10);
  // Wurde der Artikel nach der Meldung bei einem inzwischen gespielten Heimspiel mitgebracht, gilt er als aufgefüllt
  const aufgefuellt = Z.catering.some((c) => {
    if (c.artikel !== name) return false;
    const sp = Z.spiele.find((x) => x.id === c.spielId);
    return sp && sp.datum >= seit && sp.datum < heute();
  });
  return aufgefuellt ? { status: "ok", v, aufgefuellt: true } : { status: v.status, v };
}

// ---------- Zeitnehmer ----------
const zeitnehmerPlaetze = () => Z.einstellungen.zeitnehmerPlaetze ?? 1;
const zeitnehmerNoetig = (s) => modul("zeitnehmer") && zeitnehmerPlaetze() > 0 && (Z.einstellungen.zeitnehmerBei !== "heim" || s.heim);
const zeitnehmerVon = (s) => (Z.zeitnehmer || []).filter((x) => x.spielId === s.id);
const zeitnehmerFehlt = (s) => zeitnehmerNoetig(s) && zeitnehmerVon(s).length < zeitnehmerPlaetze();
function zeitnehmerAufgabe(s) {
  if (!zeitnehmerNoetig(s)) return null;
  const zn = zeitnehmerVon(s);
  const fehlt = zn.length < zeitnehmerPlaetze();
  const dringend = fehlt && (datum(s.datum) - datum(heute())) / 864e5 <= 7;
  const eigen = zn.find((z) => darfLoeschen(z) && z.eigen);
  return {
    status: fehlt ? (dringend ? "dringend" : "offen") : "ok",
    titel: "Zeitnehmer", kurz: "Zeitnehmer",
    stand: fehlt ? (dringend ? "dringend gesucht" : "offen") : "",
    detail: zn.length ? wer(zn) + (eigen ? ` · <button class="link-knopf" data-aktion="loeschen" data-col="zeitnehmer" data-id="${eigen.id}" data-frage="Als Zeitnehmer austragen?">austragen</button>` : "") : (dringend ? "Ohne Zeitnehmer droht eine Strafe." : ""),
    knopf: fehlt ? `<button class="knopf klein" data-aktion="zeitnehmer-ich" data-spiel="${s.id}">Ich mache das</button>` : "",
  };
}
const zeitnehmerZeile = (s) => { const a = zeitnehmerAufgabe(s); return a ? aufgabe(a) : ""; };
// Kurzform für die Spieleliste
function zeitnehmerKurz(s) {
  if (!zeitnehmerNoetig(s)) return "";
  const zn = zeitnehmerVon(s);
  return zn.length >= zeitnehmerPlaetze()
    ? `<div class="zn-kurz ok">Zeitnehmer: ${wer(zn)}</div>`
    : `<div class="zn-kurz offen">Zeitnehmer gesucht · <button class="link-knopf" data-aktion="zeitnehmer-ich" data-spiel="${s.id}">Ich mache das</button></div>`;
}

// ---------- Wäsche: wer nimmt nach dem Heimspiel Geschirrtücher und Spüllappen mit ----------
const waescheText = () => { const w = Z.einstellungen.waescheArtikel || []; return w.length > 1 ? `${w.slice(0, -1).join(", ")} und ${w.at(-1)}` : w[0] || ""; };
const waescheNoetig = (s) => modul("waesche") && s.heim && (Z.einstellungen.waescheArtikel || []).length > 0;
const waescheVon = (s) => (Z.waschdienst || []).find((x) => x.spielId === s.id);
const waescheFehlt = (s) => waescheNoetig(s) && !waescheVon(s);
const vorherigesHeim = (s) => heimspiele().filter((x) => x.datum < s.datum).sort((a, b) => b.datum.localeCompare(a.datum))[0];
function waescheAufgabe(s) {
  if (!waescheNoetig(s)) return null;
  const w = waescheVon(s);
  const vor = vorherigesHeim(s);
  const bringt = vor && waescheVon(vor);
  return {
    status: w ? "ok" : "offen",
    titel: "Wäsche nach dem Spiel", kurz: "Wäsche",
    stand: w ? "" : "offen",
    detail: `${w ? wer([w]) + (darfLoeschen(w) && w.eigen ? ` · <button class="link-knopf" data-aktion="loeschen" data-col="waschdienst" data-id="${w.id}" data-frage="Austragen?">austragen</button>` : "") + " · " : ""}${esc(waescheText())}: mitnehmen, waschen, nächstes Heimspiel wieder mitbringen${bringt ? `. Bringt diesmal mit: ${esc(anzeigeName(bringt.name))}` : ""}`,
    knopf: w ? "" : `<button class="knopf klein zweit" data-aktion="waesche-ich" data-spiel="${s.id}">Ich nehme sie mit</button>`,
  };
}
const waescheZeile = (s) => { const a = waescheAufgabe(s); return a ? aufgabe(a) : ""; };
function trikotAufgabe(s) {
  if (!modul("trikots")) return null;
  const p = trikotPlan().find((x) => x.spiel.id === s.id);
  if (!p) return null;
  const wer = p.familie.replace(/^Familie von /, "");
  const ihr = meinKind() && wer === meinKind();
  return {
    status: p.erledigt ? "ok" : "info",
    titel: "Trikots waschen",
    stand: esc(wer) + (ihr ? ` <span class="pill offen">${erwachsen() ? "das bist du" : "das seid ihr"}</span>` : ""),
    detail: p.erledigt ? "erledigt, danke!" : "Satz nach dem Spiel mitnehmen, gewaschen zum nächsten Spiel",
    knopf: `<a class="link-knopf" href="#/trikots">${ihr ? "tauschen" : "Plan"}</a>`,
  };
}

function cateringStatus(s) {
  const e = Z.einstellungen;
  const dienst = Z.standdienst.filter((x) => x.spielId === s.id && !x.reserve).length;
  // Vorrat: was leer oder knapp ist, steht beim nächsten Heimspiel auf der Mitbringliste
  const naechstesHeim = kommende(heimspiele())[0];
  const vorrat = (e.vorratArtikel || []).filter((a) => Z.catering.some((c) => c.spielId === s.id && c.artikel === a.name)
    || (naechstesHeim && naechstesHeim.id === s.id && vorratStand(a.name).status !== "ok"))
    .map((a) => ({ ...a, bedarf: 1, vorrat: true, stand: vorratStand(a.name).status }));
  const artikel = [...e.cateringArtikel.filter((a) => gebraucht(s, a)).map((a) => ({ ...a, bedarf: mengeFuer(s, a), standard: a.bedarf })), ...vorrat].map((a) => ({
    ...a, zugesagt: Z.catering.filter((c) => c.spielId === s.id && c.artikel === a.name).length,
  }));
  const offen = artikel.filter((a) => a.zugesagt < a.bedarf);
  return { dienst: Math.min(dienst, e.standdienstPlaetze), plaetze: e.standdienstPlaetze, artikel, offen, komplett: dienst >= e.standdienstPlaetze && !offen.length };
}
const pill = (ist, soll, text = `${ist}/${soll}`) =>
  `<span class="pill ${ist >= soll ? "ok" : "offen"}">${ist >= soll ? "✓ " : ""}${text}</span>`;

function vorratKarte() {
  const e = Z.einstellungen;
  const va = e.vorratArtikel || [];
  if (!va.length) return "";
  const staende = va.map((a) => ({ a, st: vorratStand(a.name) }));
  const fehlend = staende.filter((x) => x.st.status !== "ok");
  const kurz = fehlend.length ? `${fehlend.map((x) => x.a.name).join(", ")} ${fehlend.length === 1 ? "fehlt" : "fehlen"}` : "Vorrat ok";
  const knopf = (a, status, text) => `<button class="seg ${vorratStand(a.name).status === status && (status !== "ok" || !vorratStand(a.name).v || true) ? "an" : ""} ${status}" data-aktion="vorrat-setzen" data-artikel="${esc(a.name)}" data-status="${status}">${text}</button>`;
  return `<details class="karte vorrat-karte">
    <summary><span>Vorrat</span> <span class="pill ${fehlend.length ? "offen" : "ok"}">${esc(kurz)}</span></summary>
    <p class="leise klein">Bitte nach jedem Heimspiel kurz antippen. Was <strong>leer</strong> oder <strong>knapp</strong> ist, steht automatisch auf der Mitbringliste fürs nächste Heimspiel.</p>
    ${va.length ? `<ul class="liste">${staende.map(({ a, st }) => `<li>
      <div><strong>${esc(a.name)}</strong>${st.v && st.status !== "ok" && st.v.von ? `<div class="leise klein">gemeldet von ${esc(st.v.von.split(" (")[0])}</div>` : st.aufgefuellt ? `<div class="leise klein">wurde aufgefüllt</div>` : ""}</div>
      <div class="segment">${knopf(a, "ok", "reicht")}${knopf(a, "knapp", "knapp")}${knopf(a, "leer", "leer")}</div></li>`).join("")}</ul>` : ""}
  </details>`;
}

function cateringDetails(s) {
  const e = Z.einstellungen;
    const st = cateringStatus(s);
    const alle = Z.standdienst.filter((x) => x.spielId === s.id).sort((a, b) => a.erstellt.localeCompare(b.erstellt));
    const dienst = alle.filter((x) => !x.reserve);
    const reserve = alle.filter((x) => x.reserve);
    const frei = Math.max(0, st.plaetze - dienst.length);
    const reserveFrei = Math.max(0, (e.reservePlaetze ?? 1) - reserve.length);
    const eintrag = (d) => `<li><span><span class="haken">✓</span><strong>${esc(anzeigeName(d.name))}</strong>${d.hinweis ? ` <span class="leise">· ${esc(d.hinweis)}</span>` : ""}</span>
        ${darfLoeschen(d) ? `<button class="link-knopf" data-aktion="loeschen" data-col="standdienst" data-id="${d.id}" data-frage="Eintrag entfernen?">austragen</button>` : ""}</li>`;
    const plaetze = [
      ...dienst.map(eintrag),
      ...Array.from({ length: frei }, () => `<li><span class="platz-frei">Platz frei</span>
        <button class="knopf klein" data-aktion="standdienst-ich" data-spiel="${s.id}">Ich übernehme</button></li>`),
    ].join("");
    const reservePlaetze = [
      ...reserve.map(eintrag),
      ...Array.from({ length: reserveFrei }, () => `<li><span class="platz-frei">Reserve frei</span>
        <button class="knopf klein zweit" data-aktion="standdienst-ich" data-reserve="1" data-spiel="${s.id}">Als Reserve</button></li>`),
    ].join("");
    const artikel = st.artikel.map((a, i) => {
      const zusagen = Z.catering.filter((c) => c.spielId === s.id && c.artikel === a.name);
      const voll = a.zugesagt >= a.bedarf;
      const key = `${s.id}-${i}`;
      return `<li style="display:block">
        <div class="artikel-zeile">
          <div class="artikel-name"><strong>${esc(a.name)}</strong> ${pill(a.zugesagt, a.bedarf)}${a.vorrat ? ` <span class="pill neutral">Vorrat ${a.stand === "leer" ? "leer" : a.stand === "knapp" ? "knapp" : "auffüllen"}</span>` : ""}${a.hinweis ? `<span class="leise klein artikel-hinweis">je ${esc(a.hinweis)}</span>` : ""}</div>
          <button class="${voll ? "link-knopf" : "knopf klein zweit"}" data-aktion="mitbringen-oeffnen" data-key="${key}">${voll ? "+ zusätzlich" : "Ich bringe mit"}</button>
        </div>
        ${istAdmin() && !a.vorrat ? `<div class="artikel-admin"><span class="menge-stepper" title="Anzahl für dieses Spiel"><button class="mini" data-aktion="menge-aendern" data-spiel="${s.id}" data-artikel="${esc(a.name)}" data-delta="-1" ${a.bedarf <= 1 ? "disabled" : ""} aria-label="weniger">−</button><span>${a.bedarf}×</span><button class="mini" data-aktion="menge-aendern" data-spiel="${s.id}" data-artikel="${esc(a.name)}" data-delta="1" aria-label="mehr">+</button></span>${a.bedarf !== a.standard ? `<span class="leise klein">sonst ${a.standard}×</span>` : ""}<button class="link-knopf klein" data-aktion="artikel-umschalten" data-spiel="${s.id}" data-artikel="${esc(a.name)}">diesmal nicht nötig</button></div>` : ""}
        ${zusagen.length ? `<div>${zusagen.map((c) => `<span class="chip">${esc(anzeigeName(c.name))}${c.menge ? " · " + esc(c.menge) : ""}${darfLoeschen(c) ? `<button class="x" title="entfernen" data-aktion="loeschen" data-col="catering" data-id="${c.id}" data-frage="Zusage entfernen?">×</button>` : `<span style="width:6px"></span>`}</span>`).join("")}</div>` : ""}
        <form class="zeile mitbringen" data-form="catering" data-spiel="${s.id}" data-key="${key}" hidden>
          <input type="hidden" name="artikel" value="${esc(a.name)}">
          <div class="feld"><input type="text" name="menge" maxlength="60" placeholder="Menge, z. B. 1 Blech (optional)" aria-label="Menge"></div>
          <button class="knopf klein">Zusagen</button>
        </form>
      </li>`;
    }).join("");
    const status = st.komplett
      ? `<span class="pill ok">✓ Alles besetzt</span>`
      : `${pill(st.dienst, st.plaetze, `Standdienst ${st.dienst}/${st.plaetze}`)} ${!st.offen.length ? "" : st.offen.length === st.artikel.length ? `<span class="pill offen">Mitbringliste offen</span>` : `<span class="pill offen">Offen: ${st.offen.map((a) => esc(a.name)).join(", ")}</span>`}`;
    return `<div class="raster-2 abstand">
        <div><h3>Standdienst</h3>
          <p class="info-zeile">${treffzeit(s) ? `Bitte spätestens um <strong>${treffzeit(s)} Uhr</strong> da sein.` : `Bitte mindestens ${Z.einstellungen.standdienstVorlauf ?? 60} Minuten vor Anpfiff da sein.`} ${esc(Z.einstellungen.standdienstInfo || "")}</p>
          <ul class="liste">${plaetze}</ul>
          ${reservePlaetze ? `<h3 class="abstand" style="margin-bottom:2px">Reserve</h3>
          <p class="leise klein" style="margin:0 0 4px">Springt ein, wenn jemand ausfällt.</p>
          <ul class="liste">${reservePlaetze}</ul>` : ""}</div>
        <div><h3>Mitbringliste</h3><ul class="liste">${artikel}</ul>
          ${istAdmin() ? Z.einstellungen.cateringArtikel.filter((a) => !gebraucht(s, a)).map((a) => `<p class="nicht-noetig">${esc(a.name)}: diesmal nicht nötig
            <button class="link-knopf" data-aktion="artikel-umschalten" data-spiel="${s.id}" data-artikel="${esc(a.name)}">+ diesmal brauchen</button></p>`).join("") : ""}</div>
      </div>`;
}

// Alte Adressen #/catering und #/fahrten zeigen die Spiele-Seite mit passendem Filter
function seiteCatering() { spieleFilter = "heim"; return seiteSpiele(); }

function seiteTrikots() {
  const plan = trikotPlan();
  const fam = familien();
  const naechstes = plan.find((p) => !p.erledigt && p.spiel.datum >= heute());
  const kurz = (f) => f.replace(/^Familie von /, "");
  return `${kopfzeile(erwachsen() ? "Reihum, jeder ist mal dran" : "Reihum, jede Familie ist dran", "Trikots waschen")}
  ${naechstes ? `<section class="karte trikot-naechstes"><span class="kachel-label">Als Nächstes dran</span>
    <div class="trikot-wer">${esc(kurz(naechstes.familie))}${meinKind() && kurz(naechstes.familie) === meinKind() ? ` <span class="pill offen">${erwachsen() ? "das bist du" : "das seid ihr"}</span>` : ""}</div>
    <div class="leise">nach dem Spiel am ${wochentagKurz(naechstes.spiel.datum)} ${kurzDatum(naechstes.spiel.datum)} ${naechstes.spiel.heim ? "gegen" : "bei"} ${esc(naechstes.spiel.gegner)}</div></section>` : ""}
  <div class="hinweis info">${erwachsen() ? "Die Reihenfolge ergibt sich aus dem Kader. Nach jedem Spiel nimmt der Eingetragene den Trikotsatz mit, wäscht ihn und bringt ihn zum nächsten Spiel wieder mit. Wer nicht kann, tauscht und ändert es hier." : "Die Reihenfolge ergibt sich aus dem Kader. Nach jedem Spiel nimmt die eingetragene Familie den Trikotsatz mit, wäscht ihn und bringt ihn zum nächsten Spiel wieder mit. Wer nicht kann, tauscht einfach mit einer anderen Familie und ändert es hier."}</div>
  ${fam.length < 2 ? `<div class="hinweis">Es sind erst ${fam.length} Spieler im Kader eingetragen. Die Kassenführung ergänzt den Kader unter Verwaltung, dann verteilt sich der Plan automatisch.</div>` : ""}
  <section class="karte">
    ${plan.length ? `<div class="tabelle-wrap"><table>
      <thead><tr><th>Spiel</th><th>Wer</th><th>Erledigt</th><th></th></tr></thead>
      <tbody>${plan.map((p) => `<tr class="${p.erledigt ? "erledigt" : ""} ${p === naechstes ? "naechstes" : ""}">
        <td><strong>${datumKurz(p.spiel.datum)}</strong><div class="leise">${p.spiel.heim ? "Heim" : "Auswärts"} gegen ${esc(p.spiel.gegner)}</div></td>
        <td><strong>${esc(kurz(p.familie))}</strong>${p.getauscht ? ` <span class="leise klein">(getauscht)</span>` : ""}</td>
        <td><input type="checkbox" aria-label="erledigt" data-aktion="trikot-erledigt" data-id="${p.spiel.id}" ${p.erledigt ? "checked" : ""}></td>
        <td><select class="klein" data-aktion="trikot-tausch" data-id="${p.spiel.id}" aria-label="Familie ändern" style="padding:5px 8px;font-size:13px;width:auto">
          <option value="">${p.getauscht ? (erwachsen() ? "wie im Plan" : "Ursprüngliche Familie") : (erwachsen() ? "tauschen mit …" : "Familie ändern …")}</option>
          ${fam.filter((f) => f !== p.familie).map((f) => `<option value="${esc(f)}">${esc(kurz(f))}</option>`).join("")}</select></td>
      </tr>`).join("")}</tbody></table></div>`
      : `<p class="leer">Noch keine Spiele eingetragen.</p>`}
  </section>`;
}

function kasseEinfach() {
  const e = Z.einstellungen;
  const { saldo } = kassenSummen();
  const letzte = kassenBuchungen().reverse().slice(0, 5);
  return `${kopfzeile("Transparent für alle Eltern", "Mannschaftskasse")}
  <section class="karte kasse-gross">
    <div class="kachel-label">Aktueller Kassenstand</div>
    <div class="zahl-riesig ${saldo < 0 ? "minus" : ""}">${euro(saldo)}</div>
  </section>
  <section class="karte abstand">
    <h2>Letzte Buchungen</h2>
    ${letzte.length ? `<ul class="liste">${letzte.map((b) => `<li>
      <div><strong>${esc(buchungTitel(b))}</strong><div class="leise klein">${datumKurz(b.datum)}${b.offen && istAdmin() ? " · noch an den OTV zu zahlen" : b.kanal ? " · " + esc(b.kanal) : ""}</div></div>
      <strong class="${b.art === "einnahme" ? "plus" : "minus"}" style="white-space:nowrap">${b.art === "einnahme" ? "+" : "−"} ${euro(b.betrag)}</strong></li>`).join("")}</ul>`
      : `<p class="leer">Noch keine Buchungen.</p>`}
    <button class="knopf zweit abstand" data-aktion="kassen-details">Alle Details anzeigen</button>
  </section>`;
}

function seiteKasse() {
  if (!modul("kasse")) return `${kopfzeile("", "Kasse")}<p class="leer">Die Mannschaftskasse ist ausgeschaltet.</p>`;
  if (!istAdmin() && !kassenDetails) return kasseEinfach();
  const e = Z.einstellungen;
  const { ein, aus, saldo } = kassenSummen();
  const buchungen = kassenBuchungen();
  let lauf = e.anfangsbestand;
  const mitSaldo = buchungen.map((b) => {
    lauf += b.art === "einnahme" ? b.betrag : -b.betrag;
    return { ...b, saldo: lauf };
  });
  const gefiltert = mitSaldo.filter((b) => kassenFilter === "alle" || b.art === kassenFilter).reverse();
  const gruppe = (art, feld) => {
    const m = new Map();
    const name = (b) => (b[feld] === "Getränke OTV" ? "Anteil Getränke an den OTV" : b[feld]) || "ohne Angabe";
    buchungen.filter((b) => b.art === art).forEach((b) => m.set(name(b), (m.get(name(b)) || 0) + b.betrag));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const balken = (eintraege, summe, farbe) => eintraege.length ? `<ul class="liste">${eintraege.map(([k, v]) => `<li style="display:block">
      <div class="ausrichten" style="justify-content:space-between"><span>${esc(k)}</span><strong>${euro(v)}</strong></div>
      <div class="fortschritt"><div style="width:${summe ? (v / summe) * 100 : 0}%;background:${farbe}"></div></div></li>`).join("")}</ul>`
    : `<p class="leer">Noch keine Buchungen.</p>`;
  const opt = (liste, wert) => liste.map((x) => `<option ${x === wert ? "selected" : ""}>${esc(x)}</option>`).join("");
  return `${kopfzeile("Transparent für alle Eltern", "Mannschaftskasse")}
  ${!istAdmin() ? `<p><button class="link-knopf" data-aktion="kassen-details">‹ Zurück zur einfachen Ansicht</button></p>` : ""}
  <div class="raster">
    <section class="karte"><div class="kachel-label">Kassenstand</div><div class="zahl-gross ${saldo < 0 ? "minus" : ""}">${euro(saldo)}</div>
      <p class="leise" style="margin:0">Anfangsbestand ${euro(e.anfangsbestand)} am ${datumKurz(e.anfangsdatum)}</p></section>
    <section class="karte"><div class="kachel-label">Einnahmen</div><div class="zahl-gross" style="color:var(--gruen)">${euro(ein)}</div></section>
    <section class="karte"><div class="kachel-label">Ausgaben</div><div class="zahl-gross" style="color:var(--rot)">${euro(aus)}</div></section>
  </div>
  <div class="raster-2 abstand">
    <section class="karte"><h2>Einnahmen nach Zahlungsart</h2>${balken(gruppe("einnahme", "kanal"), ein, "var(--gruen)")}</section>
    <section class="karte"><h2>Ausgaben nach Zweck</h2>${balken(gruppe("ausgabe", "kategorie"), aus, "var(--rot)")}</section>
  </div>

  ${modul("strichliste") ? otvOffenKarte() : ""}
  ${spielErgebnisse()}
  ${abrechnungsFormular()}
  <details class="karte abstand nur-kasse formular-klappe" id="buchung-klappe"><summary id="buchung-titel">Einzelne Buchung erfassen</summary>
    <form class="zeile abstand" data-form="kasse">
      <input type="hidden" name="id">
      <div class="feld" style="flex-basis:150px"><label>Datum</label><input type="date" name="datum" required value="${heute()}"></div>
      <div class="feld" style="flex-basis:130px"><label>Art</label><select name="art"><option value="einnahme">Einnahme</option><option value="ausgabe">Ausgabe</option></select></div>
      <div class="feld" style="flex-basis:120px"><label>Betrag (€)</label><input type="text" name="betrag" inputmode="decimal" required placeholder="0,00"></div>
      <div class="feld" style="flex-basis:260px"><label>Zweck</label><input type="text" name="zweck" required maxlength="120" placeholder="z. B. Catering Heimspiel gegen BHC III"></div>
      <div class="feld"><label>Kategorie</label><select name="kategorie">${opt(e.kassenKategorien)}</select></div>
      <div class="feld"><label>bezahlt per</label><select name="kanal">${opt(e.kassenKanaele)}</select></div>
      <div class="feld"><label>Spiel (optional)</label><select name="spielId"><option value="">–</option>${spieleSortiert().map((s) => `<option value="${s.id}">${datumKurz(s.datum)} ${esc(s.gegner)}</option>`).join("")}</select></div>
      <div class="feld"><label>Beleg / Notiz</label><input type="text" name="beleg" maxlength="120" placeholder="z. B. Kassenbon Rewe"></div>
      <button class="knopf">Speichern</button>
      <button class="knopf zweit" type="reset" data-aktion="buchung-abbrechen">Leeren</button>
    </form>
  </details>

  <section class="karte abstand">
    <div class="karte-kopf"><h2 style="margin:0">Buchungen</h2>
      <div class="ausrichten">
        <div class="tabs" style="margin:0">${[["alle", "Alle"], ["einnahme", "Einnahmen"], ["ausgabe", "Ausgaben"]].map(([k, t]) => `<button class="tab ${kassenFilter === k ? "aktiv" : ""}" data-aktion="kassenfilter" data-wert="${k}">${t}</button>`).join("")}</div>
        <button class="knopf zweit klein" data-aktion="csv">CSV-Export</button>
      </div></div>
    ${gefiltert.length ? `<div class="tabelle-wrap"><table>
      <thead><tr><th>Datum</th><th>Zweck</th><th>Bezahlt per</th><th class="betrag">Betrag</th><th class="betrag">Stand</th><th class="nur-kasse"></th></tr></thead>
      <tbody>${gefiltert.map((b) => `<tr>
        <td>${datumKurz(b.datum)}</td>
        <td><strong>${esc(buchungTitel(b))}</strong>${b.offen && istAdmin() ? ` <span class="pill offen">noch an OTV zu zahlen</span>` : ""}<div class="leise klein">${esc(b.kategorie)}${b.spielId && spielName(b.spielId) ? " · " + esc(spielName(b.spielId)) : ""}${b.beleg ? " · " + esc(b.beleg) : ""}</div></td>
        <td>${esc(b.kanal)}</td>
        <td class="betrag ${b.art === "einnahme" ? "plus" : "minus"}">${b.art === "einnahme" ? "+" : "−"} ${euro(b.betrag)}</td>
        <td class="betrag">${euro(b.saldo)}</td>
        <td class="nur-kasse" style="white-space:nowrap"><button class="link-knopf" data-aktion="buchung-bearbeiten" data-id="${b.id}">ändern</button>
          <button class="link-knopf" style="color:var(--rot);margin-left:8px" data-aktion="loeschen" data-col="kasse" data-id="${b.id}" data-frage="Buchung wirklich löschen?">löschen</button></td>
      </tr>`).join("")}</tbody></table></div>`
      : `<p class="leer">Noch keine Buchungen.</p>`}
  </section>`;
}

function seiteGalerie() {
  if (!Z.einstellungen.galerieAktiv && !istAdmin()) {
    return `${kopfzeile("Erinnerungen der Saison", "Galerie")}<section class="karte"><p>Die Galerie startet, sobald mit dem Verein alles abgestimmt ist.</p></section>`;
  }
  if (!galerieGeladen) {
    api("GET", "/api/galerie").then((g) => { galerie = g; galerieGeladen = true; zeigen(); })
      .catch((e) => meldung(e.message, true));
    return `${kopfzeile("Erinnerungen der Saison", "Galerie")}<p class="leer">Lade Fotos …</p>`;
  }
  const alben = ["Alle", ...new Set(galerie.map((f) => f.album))];
  if (!alben.includes(albumFilter)) albumFilter = "Alle";
  const sichtbar = galerie.filter((f) => albumFilter === "Alle" || f.album === albumFilter);
  const gemeldet = galerie.filter((f) => f.gemeldet).length;
  const albumVorschlaege = [...new Set([...galerie.map((f) => f.album), ...heimspiele().concat(vergangene(spieleSortiert())).map((s) => `${datumKurz(s.datum)} ${s.gegner}`)])];
  return `${kopfzeile("Erinnerungen der Saison", "Galerie")}
  ${istAdmin() && !Z.einstellungen.galerieAktiv ? `<div class="hinweis">Die Galerie ist für Eltern noch ausgeblendet. Freigabe unter Verwaltung.</div>` : ""}
  ${istAdmin() && gemeldet ? `<div class="hinweis">${gemeldet} Foto${gemeldet === 1 ? " wurde" : "s wurden"} zur Prüfung gemeldet und ist für Eltern ausgeblendet. Rot markiert, bitte prüfen.</div>` : ""}
  <details class="karte" ${galerie.length ? "" : "open"}>
    <summary>Fotos hochladen</summary>
    <div class="hinweis">Bitte nur Fotos hochladen, mit denen die abgebildeten Jungs und deren Eltern einverstanden sind. Keine Fotos aus der Umkleide, keine peinlichen Situationen. Fotos werden vor dem Hochladen verkleinert, Standortdaten werden dabei entfernt.</div>
    <div class="hinweis info">📸 <strong>Datensparsam knipsen 😉</strong> Lieber das eine Siegerfoto als 47 fast gleiche Serienbilder. Sucht die besten 5 bis 10 Bilder pro Spiel aus, der Rest darf gern auf dem eigenen Handy bleiben. Das schont Speicher, Datenvolumen und die Nerven aller, die durchscrollen.</div>
    <form class="zeile" data-form="galerie">
      <div class="feld"><label>Album</label><input type="text" name="album" list="alben" required maxlength="80" placeholder="z. B. 10.10.2026 Bergischer HC III"><datalist id="alben">${albumVorschlaege.map((a) => `<option value="${esc(a)}">`).join("")}</datalist></div>
      <div class="feld"><label>Dein Name</label><input type="text" name="name" maxlength="60" value="${esc(gemerkterName())}"></div>
      <div class="feld" style="flex-basis:100%"><label>Fotos (mehrere möglich)</label><input type="file" name="dateien" accept="image/*" multiple required></div>
      <button class="knopf">Hochladen</button>
      <div style="flex-basis:100%" id="upload-status"></div>
    </form>
  </details>
  <section class="karte abstand">
    <div class="tabs">${alben.map((a) => `<button class="tab ${a === albumFilter ? "aktiv" : ""}" data-aktion="album" data-wert="${esc(a)}">${esc(a)}</button>`).join("")}</div>
    ${sichtbar.length ? `<div class="galerie">${sichtbar.map((f, i) => `<button class="foto ${f.gemeldet ? "gemeldet" : ""}" data-aktion="foto" data-index="${i}" aria-label="Foto öffnen">
      <img src="/api/foto/${f.id}/klein" loading="lazy" alt="${esc(f.titel || f.album)}">${f.gemeldet ? `<span class="marke-gemeldet">gemeldet</span>` : ""}</button>`).join("")}</div>`
      : `<p class="leer">Noch keine Fotos in diesem Album.</p>`}
  </section>`;
}

function seiteVerwaltung() {
  if (!istAdmin()) return `${kopfzeile("", "Verwaltung")}<p>Nur für die Kassenführung.</p>`;
  const e = Z.einstellungen;
  const trainer = [...Z.trainer].sort((a, b) => a.reihenfolge - b.reihenfolge);
  const bereich = (titel, unter, inhalt, offen = false) => `<details class="karte verwaltung-bereich formular-klappe" ${offen ? "open" : ""}><summary><span>${titel}<span class="leise klein bereich-unter">${unter}</span></span></summary><div class="abstand">${inhalt}</div></details>`;
  const kaderHtml = `<p class="leise klein">Nur Vornamen. Die Reihenfolge bestimmt den Trikot-Waschplan.</p>
      <ul class="liste">${kader().map((k, i) => `<li><span>${i + 1}. <strong>${esc(k.vorname)}</strong>${k.nummer ? ` <span class="leise">#${esc(k.nummer)}</span>` : ""}</span>
        <button class="link-knopf" style="color:var(--rot)" data-aktion="loeschen" data-col="kader" data-id="${k.id}" data-frage="${esc(k.vorname)} aus dem Kader entfernen?">entfernen</button></li>`).join("")}</ul>
      <form class="zeile abstand" data-form="kader">
        <div class="feld"><label>Vorname</label><input type="text" name="vorname" required maxlength="30"></div>
        <div class="feld" style="flex-basis:80px"><label>Nr.</label><input type="text" name="nummer" maxlength="3"></div>
        <div class="feld" style="flex-basis:90px"><label>Reihenf.</label><input type="number" name="reihenfolge" value="${kader().length + 1}"></div>
        <button class="knopf">Hinzufügen</button>
      </form>`;
  const trainerHtml = `<div class="raster">${trainer.map((t) => `<section class="karte flach"><form data-form="trainer" data-id="${t.id}">
      <label>Name</label><input type="text" name="name" value="${esc(t.name)}" maxlength="80" required>
      <div class="ausrichten abstand" style="margin-top:8px">
        <div class="feld"><label>Rolle</label><input type="text" name="rolle" value="${esc(t.rolle)}" maxlength="60"></div>
        <div class="feld" style="flex-basis:80px"><label>Reihenf.</label><input type="number" name="reihenfolge" value="${t.reihenfolge}"></div>
      </div>
      <label class="abstand" style="margin-top:8px">Text</label><textarea name="text" maxlength="1500">${esc(t.text)}</textarea>
      <div class="ausrichten abstand" style="margin-top:8px"><button class="knopf klein">Speichern</button>
        <button type="button" class="knopf klein gefahr" data-aktion="loeschen" data-col="trainer" data-id="${t.id}" data-frage="Trainer entfernen?">Entfernen</button></div>
    </form></section>`).join("")}
    <section class="karte flach"><form data-form="trainer-neu">
      <h3>Trainer hinzufügen</h3>
      <label>Name</label><input type="text" name="name" maxlength="80" required>
      <label class="abstand" style="margin-top:8px">Rolle</label><input type="text" name="rolle" value="Trainer" maxlength="60">
      <button class="knopf klein abstand">Hinzufügen</button>
    </form></section></div>`;
  const gruppe = (titel, inhalt) => `<fieldset class="einst-gruppe"><legend>${titel}</legend>${inhalt}</fieldset>`;
  const einstellungen = `<form data-form="einstellungen">
    ${gruppe("Mannschaft", `
      <div class="ausrichten">
        <div class="feld" style="flex-basis:220px"><label>Name der Mannschaft</label><input type="text" name="mannschaftName" maxlength="60" value="${esc(e.mannschaftName || "")}"></div>
        <div class="feld" style="flex-basis:220px"><label>Verein</label><input type="text" name="vereinName" maxlength="60" value="${esc(e.vereinName || "")}"></div>
        <div class="feld" style="flex-basis:260px"><label>Art der Mannschaft</label><select name="mannschaftstyp">
          <option value="jugend" ${!erwachsen() ? "selected" : ""}>Jugend: Eltern organisieren, Jungs melden sich</option>
          <option value="erwachsene" ${erwachsen() ? "selected" : ""}>Erwachsene: Spieler organisieren selbst</option></select></div>
      </div>
      <p class="leise klein">Bei Erwachsenen gibt es keinen Eltern-Zugang. Die Spieler melden sich mit dem Spieler-Passwort an und können alles, was sonst Eltern können.</p>`)}
    ${gruppe("Module: was soll die Seite zeigen?", `
      <p class="leise klein">Ausgeschaltete Bereiche verschwinden aus Menü, Startseite, Spielkarten, WhatsApp-Texten und Erinnerungen. Die Daten bleiben erhalten.</p>
      <div class="modul-liste">${MODULE.map(([k, name, info]) => `<label class="schalter modul"><input type="checkbox" name="mod:${k}" ${modul(k) ? "checked" : ""}> <span><strong>${esc(name)}</strong>${info ? `<span class="leise klein"> · ${esc(info)}</span>` : ""}</span></label>`).join("")}</div>`)}
    ${gruppe("Helferdienste", `
      <label>Dienste bei Heimspielen (je Zeile: Name | Personen | Minuten vor Anwurf oder „danach“)</label>
      <textarea name="dienstArten" style="min-height:110px" placeholder="Hallenaufbau | 4 | 90&#10;Werbebanner aufhängen | 2 | 75&#10;Abbau | 4 | danach">${esc((e.dienstArten || []).map((d) => `${d.name} | ${d.personen} | ${d.vorlauf < 0 ? "danach" : d.vorlauf}`).join("\n"))}</textarea>
      <div class="feld abstand" style="max-width:320px"><label>Vorschlag für offene Dienste (Tage vor dem Spiel)</label><input type="number" min="0" max="14" name="dienstVorschlagTage" value="${e.dienstVorschlagTage ?? 3}"></div>
      <p class="leise klein">Ab diesem Zeitpunkt zeigt die Seite bei offenen Diensten, wer bisher am seltensten dran war. Diese Spieler bekommen auch eine Erinnerung aufs Handy.</p>`)}
    ${gruppe("Mannschaft und Training", `
      <label>Liga</label><input type="text" name="liga" value="${esc(e.liga)}">
      <label class="abstand">Text zur Mannschaft</label><textarea name="teamText">${esc(e.teamText)}</textarea>
      <label class="abstand">Hallen mit Adresse (je Zeile: Name | Straße Nr., PLZ Ort). Daraus entsteht der Knopf „Route“.</label>
      <textarea name="hallen" style="min-height:90px" placeholder="Humboldt | Humboldtstraße 1, 42651 Solingen">${esc((e.hallen || []).map((h) => `${h.name} | ${h.adresse}`).join("\n"))}</textarea>
      <label class="abstand">Trainingszeiten (je Zeile: Tag | Uhrzeit | Halle). Hallenname wie oben, dann erscheint die Route.</label>
      <textarea name="trainingszeiten" style="min-height:70px">${esc(e.trainingszeiten.map((t) => `${t.tag} | ${t.zeit} | ${t.halle}`).join("\n"))}</textarea>`)}
    ${gruppe("Training: An- und Abmeldung", `
      <div class="ausrichten">
        <div class="feld" style="flex-basis:260px"><label>Beim Training gilt</label><select name="anwesenheitTraining"><option value="abmelden" ${e.anwesenheitTraining !== "zusagen" ? "selected" : ""}>dabei, wer sich nicht abmeldet</option><option value="zusagen" ${e.anwesenheitTraining === "zusagen" ? "selected" : ""}>jeder muss zusagen</option></select></div>
        <div class="feld" style="flex-basis:180px"><label>Termine im Voraus (Tage)</label><input type="number" min="3" max="42" name="anwesenheitTage" value="${e.anwesenheitTage || 14}"></div>
      </div>
      <p class="leise klein">Bei Spielen müssen die Jungs immer zu- oder absagen. Spieler-Zugang: ${Z.spielerZugang ? "eingerichtet ✓" : "<strong>noch nicht eingerichtet</strong>. In Netlify die Umgebungsvariable SPIELER_PASSWORT anlegen und neu deployen."}</p>
      <label class="schalter abstand"><input type="checkbox" name="pushOffeneAufgaben" ${e.pushOffeneAufgaben !== false ? "checked" : ""}> Push an alle Eltern zwei Tage vor dem Spiel, wenn Standdienst, Zeitnehmer oder Fahrer fehlen</label>`)}
    ${gruppe("Heimspiel-Catering", `
      <div class="ausrichten">
        <div class="feld"><label>Standdienst-Plätze pro Heimspiel</label><input type="number" min="1" max="10" name="standdienstPlaetze" value="${e.standdienstPlaetze}"></div>
        <div class="feld"><label>Reserveplätze</label><input type="number" min="0" max="5" name="reservePlaetze" value="${e.reservePlaetze ?? 1}"></div>
        <div class="feld" style="flex-basis:200px"><label>In der Halle sein (Minuten vor Anwurf, für Standdienst und Jungs)</label><input type="number" min="0" max="180" name="standdienstVorlauf" value="${e.standdienstVorlauf ?? 60}"></div>
      </div>
      <label class="abstand">Infotext Standdienst</label><textarea name="standdienstInfo" style="min-height:70px" maxlength="400">${esc(e.standdienstInfo || "")}</textarea>
      <label class="abstand">Mitbringliste (je Zeile: Artikel | Anzahl | Menge je Zusage | „bei Bedarf“, wenn nicht jedes Spiel nötig)</label>
      <textarea name="cateringArtikel" style="min-height:110px">${esc(e.cateringArtikel.map((a) => `${a.name} | ${a.bedarf} | ${a.hinweis || ""}${a.immer === false ? " | bei Bedarf" : ""}`).join("\n"))}</textarea>
      <label class="abstand">Vorrat (je Zeile: Artikel | Menge beim Nachkaufen)</label>
      <textarea name="vorratArtikel" style="min-height:90px">${esc((e.vorratArtikel || []).map((a) => `${a.name} | ${a.hinweis || ""}`).join("\n"))}</textarea>
      <label class="abstand">Getränke vom OTV (je Zeile: Name | Preis), erscheinen in der Strichliste und in der Abrechnung</label>
      <textarea name="getraenke" style="min-height:130px" placeholder="Cola | 2,50">${esc(getraenkeListe().map((g) => `${g.name} | ${(g.preis / 100).toFixed(2).replace(".", ",")}`).join("\n"))}</textarea>
      <div class="feld" style="max-width:220px"><label>Anteil an den OTV (%)</label><input type="number" min="0" max="100" name="otvAnteilProzent" value="${e.otvAnteilProzent ?? 50}"></div>
      <label class="abstand">Wäsche, die nach jedem Heimspiel jemand mitnimmt (ein Teil pro Zeile, leer = aus)</label>
      <textarea name="waescheArtikel" style="min-height:60px">${esc((e.waescheArtikel || []).join("\n"))}</textarea>`)}
    ${gruppe("Zeitnehmer", `
      <div class="ausrichten">
        <div class="feld" style="flex-basis:200px"><label>Zeitnehmer gebraucht bei</label><select name="zeitnehmerBei"><option value="alle" ${e.zeitnehmerBei !== "heim" ? "selected" : ""}>allen Spielen</option><option value="heim" ${e.zeitnehmerBei === "heim" ? "selected" : ""}>nur Heimspielen</option></select></div>
        <div class="feld" style="flex-basis:140px"><label>Zeitnehmer pro Spiel</label><input type="number" min="0" max="3" name="zeitnehmerPlaetze" value="${e.zeitnehmerPlaetze ?? 1}"></div>
      </div>`)}
    ${gruppe("Kasse", `
      <div class="ausrichten">
        <div class="feld"><label>Anfangsbestand (€)</label><input type="text" name="anfangsbestand" inputmode="decimal" value="${(e.anfangsbestand / 100).toFixed(2).replace(".", ",")}"></div>
        <div class="feld"><label>Stichtag</label><input type="date" name="anfangsdatum" value="${esc(e.anfangsdatum)}"></div>
      </div>
      <label class="abstand">Kassen-Kategorien (eine pro Zeile)</label>
      <textarea name="kassenKategorien" style="min-height:90px">${esc(e.kassenKategorien.join("\n"))}</textarea>
      <label class="abstand">Zahlungskanäle (einer pro Zeile)</label>
      <textarea name="kassenKanaele" style="min-height:70px">${esc(e.kassenKanaele.join("\n"))}</textarea>`)}
    ${gruppe("Galerie und handball.net", `
      <label class="schalter"><input type="checkbox" name="galerieAktiv" ${e.galerieAktiv ? "checked" : ""}> Galerie für Eltern freigeben</label>
      <label class="abstand">Link zur Mannschaft auf handball.net</label>
      <input type="text" name="handballNetUrl" value="${esc(e.handballNetUrl)}">
      <label class="abstand">handball.net Widget-Token (optional)</label>
      <input type="text" name="widgetToken" value="${esc(e.widgetToken)}" placeholder="z. B. 585937e1379b81a963168635">
      <p class="leise klein">Zu finden auf handball.net im Reiter Spielplan unter „Füge den Spielplan deiner Website hinzu“.</p>`)}
    <div class="speichern-leiste"><button class="knopf">Einstellungen speichern</button></div>
  </form>`;
  return `${kopfzeile("Nur für die Kassenführung", "Verwaltung")}
  <p class="leise klein">Bereich antippen zum Öffnen. Alle Einstellungen speicherst du gemeinsam mit dem Knopf unten im Bereich „Einstellungen“.</p>
  ${bereich("Helfer-Übersicht", "Wer hat wie oft geholfen, Namen zuordnen", helferUebersicht())}
  ${bereich("Einstellungen", "Mannschaft, Module, Helferdienste, Training, Hallen, Catering, Zeitnehmer, Kasse, Galerie", einstellungen)}
  ${bereich("Kader", `${kader().length} Spieler`, kaderHtml)}
  ${bereich("Trainerteam", `${trainer.length} Trainer, Texte für die Mannschaftsseite`, trainerHtml)}
  ${bereich("Kalender-Abo", "Link erneuern, falls er weitergegeben wurde", `<p class="leise klein">Eltern abonnieren unter „Spiele“ einen Link mit allen Spielen und Terminen. Falls der Link an die falschen Leute geraten ist, hier einen neuen erzeugen. Danach müssen alle einmal neu abonnieren.</p>
    <button class="knopf zweit klein" data-aktion="kalender-link-neu">Neuen Kalender-Link erzeugen</button>`)}`;
}

// Kosten eines Termins: Jugend zahlt meist nur für zusätzliche Personen, Erwachsene (oder "alle") für jeden Teilnehmer
const kostenFuer = (t) => t.kostenFuer || (erwachsen() ? "alle" : "zusatz");
const zahlende = (t, a) => (a && a.kommt ? (kostenFuer(t) === "alle" ? 1 + (a.personen || 0) : a.personen || 0) : 0);
const terminZeitraum = (t) => (t.bis && t.bis > t.datum ? `${wochentagKurz(t.datum)} ${kurzDatum(t.datum)} bis ${wochentagKurz(t.bis)} ${kurzDatum(t.bis)}` : "");
function termineBereich() {
  const alle = [...(Z.termine || [])].sort((a, b) => (a.datum + (a.zeit || "")).localeCompare(b.datum + (b.zeit || "")));
  const k = alle.filter((t) => (t.bis || t.datum) >= heute()), v = alle.filter((t) => (t.bis || t.datum) < heute());
  const familien = kader().map((x) => x.vorname);
  const w = wirIhr();
  const karte = (t) => {
    const ant = (Z.antworten || []).filter((a) => a.terminId === t.id);
    const zu = ant.filter((a) => a.kommt), ab = ant.filter((a) => !a.kommt);
    const zusatz = zu.reduce((n, a) => n + (a.personen || 0), 0);
    const kosten = t.kostenProPerson || 0;
    const anz = t.anzahlung || 0;
    const meine = meinKind() ? ant.find((a) => a.familie === meinKind()) : null;
    const offenFam = familien.filter((f) => !ant.some((a) => a.familie === f));
    const erwartet = zu.reduce((n, a) => n + zahlende(t, a) * kosten, 0);
    const bezahlt = zu.filter((a) => a.bezahlt).reduce((n, a) => n + zahlende(t, a) * kosten, 0)
      + zu.filter((a) => a.angezahlt && !a.bezahlt).reduce((n, a) => n + zahlende(t, a) * anz, 0);
    const angezahlt = zu.filter((a) => a.angezahlt || a.bezahlt).length;
    const personenAuswahl = (wert) => Array.from({ length: 9 }, (_, i) => `<option value="${i}" ${i === (wert ?? 0) ? "selected" : ""}>${i}</option>`).join("");
    const meinBetrag = meine ? zahlende(t, meine) * kosten : 0;
    const statusZahlung = meine && meine.kommt && kosten ? ` <span class="leise">${erwachsen() ? "Dein Anteil" : "Kosten für euch"}: ${euro(meinBetrag)}${meine.bezahlt ? " · bezahlt ✓" : anz ? (meine.angezahlt ? ` · Anzahlung ${euro(zahlende(t, meine) * anz)} bezahlt ✓` : ` · Anzahlung ${euro(zahlende(t, meine) * anz)} noch offen`) : ""}</span>` : "";
    const zusatzFrage = t.frage || (erwachsen() ? "Bringst du jemanden mit? (zusätzliche Personen)" : "Wie viele zusätzliche Personen kommen mit?");
    const eigene = meinKind() ? `<div class="antwort-box">
        ${meine ? `<p class="gut" style="margin:0 0 8px">${meine.kommt ? `✓ ${erwachsen() ? "Du bist" : "Ihr seid"} dabei${meine.personen ? `, mit ${meine.personen} zusätzlichen ${meine.personen === 1 ? "Person" : "Personen"}` : ""}.` : erwachsen() ? "Du hast abgesagt." : "Ihr habt abgesagt."}${statusZahlung}</p>`
          : `<p style="margin:0 0 8px"><strong>${erwachsen() ? "Bist du dabei?" : `Familie von ${esc(meinKind())}:</strong> Seid ihr dabei?<strong>`}</strong></p>`}
        <form class="zeile" data-form="antwort" data-termin="${t.id}">
          <div class="feld" style="flex-basis:100%"><label>${esc(zusatzFrage)}</label>
            <select name="personen">${personenAuswahl(meine?.personen)}</select></div>
          <button class="knopf">${meine ? (erwachsen() ? "Ändern: ich bin dabei" : "Ändern: wir kommen") : erwachsen() ? "Ich bin dabei" : "Wir kommen"}</button>
          <button type="button" class="knopf zweit" data-aktion="antwort-absage" data-termin="${t.id}">${erwachsen() ? "Ich kann nicht" : "Wir können nicht"}</button>
        </form>
        ${kosten ? `<p class="leise klein" style="margin:8px 0 0">${euro(kosten)} pro ${kostenFuer(t) === "alle" ? "Person" : "zusätzlicher Person. Spieler und Trainer sind frei"}.${anz ? ` Anzahlung ${euro(anz)} pro Person${t.anzahlungBis ? ` bis ${wochentagKurz(t.anzahlungBis)} ${kurzDatum(t.anzahlungBis)}` : "."}` : ""}</p>` : ""}
      </div>`
      : `<p class="hinweis">Bitte zuerst ${erwachsen() ? "auswählen, wer du bist" : "deinen Sohn auswählen"}, dann kannst du zu- oder absagen. <button class="link-knopf" data-aktion="name-aendern">Jetzt auswählen</button></p>`;
    const spalteName = erwachsen() ? "Spieler" : "Familie";
    const verwaltung = istTrainer() ? `<details class="abstand"><summary>Verwalten und bearbeiten (${ant.length} von ${familien.length} Rückmeldungen)</summary>
        <p class="leise klein">Zu- und Absagen aus WhatsApp kannst du hier eintragen.</p>
        <div class="tabelle-wrap"><table class="antwort-tabelle">
          <thead><tr><th>${spalteName}</th><th>Dabei?</th><th>+ Pers.</th>${kosten ? `<th class="betrag">Betrag</th>${anz ? "<th>Anzahlung</th>" : ""}<th>Bezahlt</th>` : ""}</tr></thead>
          <tbody>${familien.map((f) => {
            const a = ant.find((x) => x.familie === f);
            const betrag = zahlende(t, a) * kosten;
            const anzBetrag = zahlende(t, a) * anz;
            return `<tr>
              <td>${esc(f)}</td>
              <td><select data-aktion="antwort-admin" data-termin="${t.id}" data-familie="${esc(f)}" data-feld="kommt">
                <option value="" ${!a ? "selected" : ""}>offen</option><option value="ja" ${a && a.kommt ? "selected" : ""}>ja</option><option value="nein" ${a && !a.kommt ? "selected" : ""}>nein</option></select></td>
              <td><select data-aktion="antwort-admin" data-termin="${t.id}" data-familie="${esc(f)}" data-feld="personen" ${a && a.kommt ? "" : "disabled"}>${personenAuswahl(a?.personen)}</select></td>
              ${kosten ? `<td class="betrag">${betrag ? euro(betrag) : "–"}</td>
              ${anz ? `<td>${!betrag ? "" : a.angezahlt || a.bezahlt ? "✓" : istAdmin() ? `<button class="knopf klein zweit" data-aktion="antwort-anzahlung" data-termin="${t.id}" data-familie="${esc(f)}">${euro(anzBetrag)} buchen</button>` : "offen"}</td>` : ""}
              <td>${!istAdmin() ? (a && a.bezahlt ? "✓" : "") : betrag ? (a.bezahlt ? `✓ <button class="link-knopf" data-aktion="antwort-bezahlt" data-termin="${t.id}" data-familie="${esc(f)}" data-wert="nein">zurück</button>` : `<button class="knopf klein" data-aktion="antwort-buchen" data-termin="${t.id}" data-familie="${esc(f)}">${a.angezahlt ? `Rest ${euro(betrag - anzBetrag)}` : "bezahlt"} + buchen</button>`) : ""}</td>` : ""}
            </tr>`;
          }).join("")}</tbody></table></div>
        ${kosten ? `<p class="abstand"><strong>Eingegangen:</strong> ${euro(bezahlt)} von ${euro(erwartet)}${anz ? ` · Anzahlung von ${angezahlt} ${angezahlt === 1 ? "Teilnehmer" : "Teilnehmern"}` : ""}</p>` : ""}
        <h3 class="abstand">Termin bearbeiten</h3>
        ${terminFormular(t)}
        <button class="knopf klein gefahr abstand" data-aktion="loeschen" data-col="termine" data-id="${t.id}" data-frage="Termin mit allen Rückmeldungen löschen?">Termin löschen</button>
      </details>` : "";
    return `<section class="karte termin-karte ${t.bis && t.bis > t.datum ? "mehrtaegig" : ""}">
      <div class="spiel">${datumBlock(t.datum)}<div>
        <div class="spiel-titel">${esc(t.titel)}</div>
        <div class="leise">${terminZeitraum(t) ? esc(terminZeitraum(t)) : t.zeit ? esc(t.zeit) + " Uhr" : ""}${t.ort ? " · " + esc(t.ort) : ""}</div>
        ${kosten ? `<div class="klein">${euro(kosten)} pro ${kostenFuer(t) === "alle" ? "Person" : "zusätzlicher Person"}${anz ? ` · Anzahlung ${euro(anz)}${t.anzahlungBis ? ` bis ${kurzDatum(t.anzahlungBis)}` : ""}` : ""}</div>` : ""}</div></div>
      ${t.beschreibung ? `<div class="termin-text">${esc(t.beschreibung).replace(/\n/g, "<br>")}</div>` : ""}
      <div class="termin-stand">
        <span class="pill ok">${zu.length} dabei</span> <span class="pill neutral">${ab.length} abgesagt</span> <span class="pill offen">${offenFam.length} offen</span>
        ${zusatz ? `<span class="leise">· ${zusatz} zusätzliche Personen</span>` : ""}
        ${anz ? `<span class="leise">· ${angezahlt} angezahlt</span>` : ""}
      </div>
      ${t.frist && t.datum >= heute() ? `<p class="frist ${t.frist < heute() ? "vorbei" : fristBald(t.frist) ? "bald" : ""}">${t.frist < heute() ? `Rückmeldefrist war der ${kurzDatum(t.frist)}. Nachzügler bitte trotzdem eintragen.` : `Bitte bis <strong>${wochentagKurz(t.frist)} ${kurzDatum(t.frist)}</strong> zurückmelden.`}</p>` : ""}
      ${t.datum >= heute() ? eigene : ""}
      ${verwaltung}
    </section>`;
  };
  return `${k.map((t, i) => `<div class="${i ? "abstand" : ""}">${karte(t)}</div>`).join("")}
  ${!k.length && istTrainer() ? `<p class="leer">Gerade steht kein Termin an.</p>` : ""}
  ${v.length ? `<details class="abstand"><summary>Vergangene Termine (${v.length})</summary><div class="abstand">${[...v].reverse().map(karte).join("")}</div></details>` : ""}
  ${istTrainer() ? `<details class="karte abstand formular-klappe"><summary>Neuen Termin anlegen (Feier, Mannschaftsabend, Tour)</summary><div class="abstand">${terminFormular(null)}</div></details>` : ""}`;
}

function terminFormular(t) {
  const geld = (c) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");
  const kf = t ? kostenFuer(t) : erwachsen() ? "alle" : "zusatz";
  return `<form class="zeile" data-form="termin" ${t ? `data-id="${t.id}"` : ""}>
    <div class="feld" style="flex-basis:220px"><label>Titel</label><input type="text" name="titel" required maxlength="80" value="${esc(t?.titel || "")}" placeholder="z. B. Mannschaftsabend, Mannschaftstour"></div>
    <div class="feld" style="flex-basis:150px"><label>Datum (Beginn)</label><input type="date" name="datum" required value="${esc(t?.datum || "")}"></div>
    <div class="feld" style="flex-basis:150px"><label>bis (bei mehreren Tagen)</label><input type="date" name="bis" value="${esc(t?.bis || "")}"></div>
    <div class="feld" style="flex-basis:110px"><label>Uhrzeit</label><input type="time" name="zeit" value="${esc(t?.zeit || "")}"></div>
    <div class="feld" style="flex-basis:200px"><label>Ort</label><input type="text" name="ort" maxlength="120" value="${esc(t?.ort || "")}"></div>
    <div class="feld" style="flex-basis:100%"><label>Beschreibung</label><textarea name="beschreibung" maxlength="2000">${esc(t?.beschreibung || "")}</textarea></div>
    <div class="feld" style="flex-basis:160px"><label>Rückmeldung bis</label><input type="date" name="frist" value="${esc(t?.frist || "")}"></div>
    <div class="feld" style="flex-basis:150px"><label>Kosten pro Person (€)</label><input type="text" inputmode="decimal" name="kosten" value="${geld(t?.kostenProPerson)}" placeholder="0,00"></div>
    <div class="feld" style="flex-basis:220px"><label>Kosten gelten für</label><select name="kostenFuer"><option value="alle" ${kf === "alle" ? "selected" : ""}>jeden Teilnehmer</option><option value="zusatz" ${kf === "zusatz" ? "selected" : ""}>nur zusätzliche Personen</option></select></div>
    <div class="feld" style="flex-basis:150px"><label>Anzahlung pro Person (€)</label><input type="text" inputmode="decimal" name="anzahlung" value="${geld(t?.anzahlung)}" placeholder="optional"></div>
    <div class="feld" style="flex-basis:160px"><label>Anzahlung bis</label><input type="date" name="anzahlungBis" value="${esc(t?.anzahlungBis || "")}"></div>
    <div class="feld" style="flex-basis:300px"><label>Frage zu zusätzlichen Personen</label><input type="text" name="frage" maxlength="160" value="${esc(t?.frage ?? (erwachsen() ? "" : "Wie viele zusätzliche Personen (Eltern, Geschwister) kommen mit?"))}" placeholder="${erwachsen() ? "Bringst du jemanden mit?" : ""}"></div>
    <button class="knopf">${t ? "Speichern" : "Termin anlegen"}</button>
  </form>`;
}

// ---------- Helfer-Übersicht (nur Kasse) ----------
const familieAusName = (name) => { const m = /\(([^()]+)\)\s*$/.exec(name || ""); return m ? m[1].trim() : null; };
function helferUebersicht() {
  const namen = kader().map((k) => k.vorname);
  const zeilen = Object.fromEntries(namen.map((n) => [n, { standdienst: 0, mitgebracht: 0, gefahren: 0, zeitnehmer: 0, waesche: 0, trikots: 0 }]));
  const ohne = {};
  const zuordnung = Z.einstellungen.namenZuordnung || {};
  const zaehle = (name, feld) => {
    const n = (name || "?").trim();
    const f = zuordnung[n.toLowerCase()] || familieAusName(n);
    if (f === "-" || f === "Trainer") return;
    if (f && zeilen[f]) zeilen[f][feld]++;
    else ohne[n] = (ohne[n] || 0) + 1;
  };
  Z.standdienst.filter((x) => !x.reserve).forEach((x) => zaehle(x.name, "standdienst"));
  Z.catering.forEach((x) => zaehle(x.name, "mitgebracht"));
  Z.fahrten.forEach((x) => zaehle(x.fahrer, "gefahren"));
  (Z.zeitnehmer || []).forEach((x) => zaehle(x.name, "zeitnehmer"));
  (Z.waschdienst || []).forEach((x) => zaehle(x.name, "waesche"));
  trikotPlan().filter((p) => p.erledigt).forEach((p) => { const f = p.familie.replace(/^Familie von /, ""); if (zeilen[f]) zeilen[f].trikots++; });
  const summe = (z) => z.standdienst + z.mitgebracht + z.gefahren + z.zeitnehmer + z.waesche + z.trikots;
  const liste = namen.map((n) => ({ n, z: zeilen[n], s: summe(zeilen[n]) })).sort((a, b) => a.s - b.s || a.n.localeCompare(b.n, "de"));
  return `<section>
    <p class="leise klein">Nur für die Kassenführung sichtbar. Gezählt wird über den Namen in Klammern, z. B. „Peggy (Piet)“. Oben stehen die Familien, die bisher am wenigsten gemacht haben.</p>
    <div class="tabelle-wrap"><table class="helfer-tabelle">
      <thead><tr><th>Familie</th><th>Stand&shy;dienst</th><th>Mit&shy;gebracht</th><th>Gefahren</th><th>Zeit&shy;nehmer</th><th>Wäsche</th><th>Trikots</th><th>Gesamt</th></tr></thead>
      <tbody>${liste.map(({ n, z, s }) => `<tr class="${s === 0 ? "null" : ""}"><td>${esc(n)}</td><td>${z.standdienst}</td><td>${z.mitgebracht}</td><td>${z.gefahren}</td><td>${z.zeitnehmer}</td><td>${z.waesche}</td><td>${z.trikots}</td><td><strong>${s}</strong></td></tr>`).join("")}</tbody>
    </table></div>
    <div class="hinweis info abstand"><strong>Namen bereinigen:</strong> Trägt in allen Einträgen nur den Vornamen ein und schreibt den Sohn fest dazu, z. B. „Peggy Evertz“ wird „Peggy (Piet)“. Danach sind die Zuordnungen unten nicht mehr nötig.
      <div class="abstand" style="margin-top:8px"><button class="knopf klein" data-aktion="namen-bereinigen">Namen jetzt bereinigen</button></div></div>
    ${Object.keys(ohne).length ? `<h3 class="abstand">Ohne Zuordnung</h3>
      <p class="leise klein">Diese Einträge haben keinen Sohn in Klammern. Einmal zuordnen, dann zählen auch alle künftigen Einträge mit diesem Namen. Mehrere Elternteile können zum selben Sohn gehören.</p>
      <ul class="liste zuordnung-liste">${Object.entries(ohne).sort((a, b) => a[0].localeCompare(b[0], "de")).map(([n, c]) => `<li><span><strong>${esc(n)}</strong> <span class="leise">(${c}×)</span></span>
        <select data-aktion="name-zuordnen" data-name="${esc(n)}"><option value="">Sohn wählen …</option>${namen.map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join("")}<option value="-">nicht mitzählen (z. B. Trainer)</option></select></li>`).join("")}</ul>` : ""}
    ${Object.keys(zuordnung).length ? `<details class="abstand"><summary>Zugeordnete Namen (${Object.keys(zuordnung).length})</summary>
      <ul class="liste zuordnung-liste">${Object.entries(zuordnung).sort((a, b) => a[0].localeCompare(b[0], "de")).map(([n, f]) => `<li><span>${esc(anzeigeName(n.replace(/(^|[\s(-])\S/g, (c) => c.toUpperCase())).replace(/\s*\([^()]+\)$/, ""))}</span>
        <select data-aktion="name-zuordnen" data-name="${esc(n)}">${namen.map((k) => `<option value="${esc(k)}" ${k === f ? "selected" : ""}>${esc(k)}</option>`).join("")}<option value="-" ${f === "-" ? "selected" : ""}>nicht mitzählen</option><option value="__loesen">Zuordnung lösen</option></select></li>`).join("")}</ul></details>` : ""}
    <details class="abstand"><summary>Einen Namen von Hand zuordnen</summary>
      <p class="leise klein">Für Einträge mit falschem oder fehlendem Sohn, z. B. „René“ oder „Anja (Max)“ statt „Anja (Mats)“. Gilt für alle Einträge mit genau diesem Namen.</p>
      <form class="zeile" data-form="name-zuordnen">
        <div class="feld" style="flex-basis:220px"><label>Name wie eingetragen</label><input type="text" name="name" required maxlength="80" list="alle-namen">
          <datalist id="alle-namen">${[...new Set([...Z.standdienst, ...Z.catering, ...(Z.zeitnehmer || []), ...(Z.waschdienst || [])].map((x) => x.name).concat(Z.fahrten.map((x) => x.fahrer)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de")).map((x) => `<option value="${esc(x)}">`).join("")}</datalist></div>
        <div class="feld" style="flex-basis:160px"><label>Sohn</label><select name="sohn">${namen.map((k) => `<option>${esc(k)}</option>`).join("")}<option value="-">nicht mitzählen</option></select></div>
        <button class="knopf">Zuordnen</button>
      </form></details>
  </section>`;
}

// ---------- Infos vom Trainerteam und Abfragen ----------
const aktiveHinweise = () => (Z.hinweise || []).filter((h) => !h.bis || h.bis >= heute()).sort((a, b) => (b.erstellt || "").localeCompare(a.erstellt || ""));
const abfrageOptionen = (a) => (a.optionen || "").split("\n").map((x) => x.trim()).filter(Boolean);
const abfrageOffen = (a) => !a.geschlossen && (!a.frist || a.frist >= heute());
const abfrageAntwort = (a, spieler) => (Z.abfrageAntworten || []).find((x) => x.abfrageId === a.id && x.spieler === spieler);
const offeneAbfragenFuerMich = () => meinKind() ? (Z.abfragen || []).filter((a) => abfrageOffen(a) && !abfrageAntwort(a, meinKind())) : [];
const fristBald = (iso) => iso && iso >= heute() && (datum(iso) - datum(heute())) / 864e5 <= 3;
const wochentagKurz = (iso) => datum(iso).toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "") + ".";
// offene Rückmeldungen (Termine und Abfragen) für Hinweise und WhatsApp
function offeneRueckmeldungen() {
  const n = kader().length;
  const termine = (modul("termine") ? Z.termine || [] : []).filter((t) => t.datum >= heute() && (datum(t.datum) - datum(heute())) / 864e5 <= 60)
    .map((t) => ({ art: "termin", titel: t.titel, datum: t.datum, frist: t.frist, offen: n - new Set((Z.antworten || []).filter((a) => a.terminId === t.id).map((a) => a.familie)).size, meins: !!(meinKind() && (Z.antworten || []).some((a) => a.terminId === t.id && a.familie === meinKind())) }));
  const abfragen = (modul("abfragen") ? Z.abfragen || [] : []).filter(abfrageOffen)
    .map((a) => ({ art: "abfrage", titel: a.titel, frist: a.frist, offen: n - new Set((Z.abfrageAntworten || []).filter((x) => x.abfrageId === a.id).map((x) => x.spieler)).size, meins: !!(meinKind() && abfrageAntwort(a, meinKind())) }));
  return [...termine, ...abfragen].filter((x) => x.offen > 0);
}
const kurzDatum = (iso) => datum(iso).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });

function hinweiseKarte(nurStart = false) {
  const h = aktiveHinweise();
  if (!h.length) return nurStart ? "" : `<p class="leer">Gerade gibt es keine Infos vom Trainerteam.</p>`;
  return `<ul class="hinweis-liste">${(nurStart ? h.slice(0, 3) : h).map((x) => `<li>
      <div class="hinweis-text">${esc(x.text).replace(/\n/g, "<br>")}</div>
      <div class="leise klein">${x.von ? esc(x.von) + " · " : ""}${kurzDatum((x.erstellt || heute()).slice(0, 10))}${x.bis ? ` · gilt bis ${kurzDatum(x.bis)}` : ""}
</div>
      ${istTrainer() && !nurStart ? `<details class="bearbeiten"><summary>bearbeiten</summary>
        <form data-form="hinweis-edit" data-id="${x.id}">
          <div class="feld"><textarea name="text" required maxlength="600">${esc(x.text)}</textarea></div>
          <div class="zeile"><div class="feld" style="flex-basis:160px"><label>Anzeigen bis</label><input type="date" name="bis" value="${esc(x.bis || "")}"></div>
          <button class="knopf klein">Speichern</button>
          <button type="button" class="link-knopf gefahr-text" data-aktion="loeschen" data-col="hinweise" data-id="${x.id}" data-frage="Info löschen?">löschen</button></div>
        </form></details>` : ""}
    </li>`).join("")}</ul>${nurStart && h.length > 3 ? `<p class="klein"><a href="#/infos">Alle Infos ›</a></p>` : ""}`;
}

function antwortText(a, x) {
  if (!x) return "";
  const opt = abfrageOptionen(a);
  if (!opt.length) return x.gewaehlt === "ja" ? "Ja" : "Nein";
  const idx = (x.gewaehlt || "").split(",").filter((i) => i !== "" && i !== "keiner").map(Number);
  return idx.length ? idx.map((i) => opt[i]).filter(Boolean).join(", ") : "An keinem Termin";
}

function abfrageKarte(a) {
  const opt = abfrageOptionen(a);
  const spieler = kader().map((k) => k.vorname);
  const antworten = (Z.abfrageAntworten || []).filter((x) => x.abfrageId === a.id);
  const offen = abfrageOffen(a);
  const fehlt = spieler.filter((n) => !antworten.some((x) => x.spieler === n));
  const meine = meinKind() ? abfrageAntwort(a, meinKind()) : null;
  const gewaehlt = new Set((meine?.gewaehlt || "").split(","));
  const formular = !offen ? "" : meinKind() ? `<div class="antwort-box">
      ${meine ? `<p class="gut" style="margin:0 0 8px">✓ ${erwachsen() ? "Deine Antwort" : "Antwort für " + esc(meinKind())}: ${esc(antwortText(a, meine))}</p>` : `<p style="margin:0 0 8px"><strong>${erwachsen() ? "Deine Antwort" : "Antwort für " + esc(meinKind())}</strong></p>`}
      <form data-form="abfrage" data-id="${a.id}">
        ${opt.length ? `<div class="optionen">${opt.map((o, i) => `<label class="option"><input type="checkbox" name="o" value="${i}" ${gewaehlt.has(String(i)) ? "checked" : ""}> <span>${esc(o)}</span></label>`).join("")}</div>`
          : `<div class="optionen"><label class="option"><input type="radio" name="o" value="ja" ${meine?.gewaehlt === "ja" ? "checked" : ""} required> <span>${erwachsen() ? "Ja, bin dabei" : "Ja, ist dabei"}</span></label><label class="option"><input type="radio" name="o" value="nein" ${meine?.gewaehlt === "nein" ? "checked" : ""}> <span>Nein</span></label></div>`}
        <input type="text" name="bemerkung" maxlength="200" placeholder="Bemerkung (optional)" value="${esc(meine?.bemerkung || "")}" aria-label="Bemerkung">
        <div class="ausrichten" style="margin-top:10px"><button class="knopf">${meine ? "Antwort ändern" : "Antwort senden"}</button>
          ${opt.length ? `<span class="leise klein">Nichts angekreuzt heißt: an keinem Termin.</span>` : ""}</div>
      </form></div>`
    : `<p class="hinweis">Bitte zuerst ${erwachsen() ? "auswählen, wer du bist" : "deinen Sohn auswählen"}, dann kannst du antworten. <button class="link-knopf" data-aktion="name-aendern">Jetzt auswählen</button></p>`;
  const spalten = opt.length ? opt : ["Dabei"];
  const zelle = (n, i) => {
    const x = antworten.find((y) => y.spieler === n);
    const an = x && (opt.length ? (x.gewaehlt || "").split(",").includes(String(i)) : x.gewaehlt === "ja");
    const inhalt = !x ? `<span class="leise">–</span>` : an ? "✓" : `<span class="leise">✗</span>`;
    return istTrainer() && offen ? `<td><button class="zelle ${an ? "an" : ""}" data-aktion="abfrage-zelle" data-id="${a.id}" data-spieler="${esc(n)}" data-index="${opt.length ? i : "ja"}">${inhalt}</button></td>` : `<td>${inhalt}</td>`;
  };
  const summe = (i) => antworten.filter((x) => opt.length ? (x.gewaehlt || "").split(",").includes(String(i)) : x.gewaehlt === "ja").length;
  const uebersicht = `<details class="abstand" ${istTrainer() ? "open" : ""}><summary>Übersicht (${antworten.length} von ${spieler.length} geantwortet)</summary>
      ${istTrainer() && offen ? `<p class="leise klein">Antworten aus WhatsApp kannst du direkt in der Tabelle antippen.</p>` : ""}
      <div class="tabelle-wrap"><table class="abfrage-tabelle">
        <thead><tr><th>Spieler</th>${spalten.map((o) => `<th>${esc(o)}</th>`).join("")}<th>Bemerkung</th></tr></thead>
        <tbody>${spieler.map((n) => { const x = antworten.find((y) => y.spieler === n); return `<tr><td>${esc(n)}</td>${spalten.map((_, i) => zelle(n, i)).join("")}<td class="klein">${esc(x?.bemerkung || "")}</td></tr>`; }).join("")}</tbody>
        <tfoot><tr><th>Summe</th>${spalten.map((_, i) => `<th>${summe(i)}</th>`).join("")}<th></th></tr></tfoot>
      </table></div>
      ${fehlt.length ? `<p class="klein abstand"><strong>Noch keine Antwort:</strong> ${esc(fehlt.join(", "))}</p>` : `<p class="gut klein abstand">Alle haben geantwortet.</p>`}
      ${istTrainer() ? `<details class="bearbeiten abstand"><summary>Abfrage bearbeiten</summary>
        <form data-form="abfrage-edit" data-id="${a.id}">
          <div class="feld"><label>Frage</label><input type="text" name="titel" required maxlength="120" value="${esc(a.titel)}"></div>
          <div class="feld"><label>Erklärung</label><textarea name="text" maxlength="800">${esc(a.text || "")}</textarea></div>
          <div class="feld"><label>Termine zum Ankreuzen, einer pro Zeile</label><textarea name="optionen" maxlength="600">${esc(a.optionen || "")}</textarea>
            ${antworten.length && opt.length ? `<p class="leise klein">Es gibt schon Antworten. Termine bitte nur umbenennen oder unten ergänzen, nicht umsortieren oder löschen, sonst verrutschen die Kreuze.</p>` : ""}</div>
          <div class="zeile"><div class="feld" style="flex-basis:160px"><label>Antworten bis</label><input type="date" name="frist" value="${esc(a.frist || "")}"></div>
          <button class="knopf klein">Speichern</button></div>
        </form></details>
      <div class="ausrichten abstand">
        <button class="knopf zweit klein" data-aktion="abfrage-schliessen" data-id="${a.id}" data-wert="${a.geschlossen ? "nein" : "ja"}">${a.geschlossen ? "Wieder öffnen" : "Abfrage beenden"}</button>
        <button class="link-knopf gefahr-text" data-aktion="loeschen" data-col="abfragen" data-id="${a.id}" data-frage="Abfrage mit allen Antworten löschen?">löschen</button></div>` : ""}
    </details>`;
  return `<section class="karte abfrage-karte">
    <div class="karte-kopf"><h2 style="margin:0">${esc(a.titel)}</h2>${offen ? (a.frist ? `<span class="pill offen">bis ${kurzDatum(a.frist)}</span>` : "") : `<span class="pill neutral">beendet</span>`}</div>
    ${a.text ? `<p class="termin-text">${esc(a.text).replace(/\n/g, "<br>")}</p>` : ""}
    ${a.von ? `<p class="leise klein" style="margin-top:-6px">von ${esc(a.von)}</p>` : ""}
    ${formular}
    ${uebersicht}
  </section>`;
}

function seiteInfos() {
  const abfragen = [...(Z.abfragen || [])].sort((a, b) => (b.erstellt || "").localeCompare(a.erstellt || ""));
  const aktuell = abfragen.filter((a) => abfrageOffen(a) || (a.frist || "9") >= heute());
  const alt = abfragen.filter((a) => !aktuell.includes(a));
  const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const termine = termineBereich();
  return `${kopfzeile("Trainerteam, Feiern, Abfragen", [modul("infos") && "Infos", modul("termine") && "Termine", !modul("infos") && !modul("termine") && "Abfragen"].filter(Boolean).join(" & "))}
  ${modul("infos") ? `<section class="karte"><h2>Infos vom Trainerteam</h2>${hinweiseKarte()}
    ${istTrainer() ? `<details class="abstand"><summary>Neue Info schreiben</summary>
      <form data-form="hinweis">
        <div class="feld"><label>Text</label><textarea name="text" required maxlength="600" placeholder="z. B. Training am Freitag fällt aus, die Halle ist belegt."></textarea></div>
        <label class="schalter"><input type="checkbox" name="push"> Auch als Push-Nachricht an alle senden (Eltern und Spieler mit eingeschalteten Benachrichtigungen)</label>
        <div class="zeile"><div class="feld" style="flex-basis:160px"><label>Anzeigen bis</label><input type="date" name="bis" value="${in14}"></div>
        <button class="knopf">Veröffentlichen</button></div>
      </form></details>` : ""}
  </section>` : ""}
  ${modul("termine") && termine.trim() ? `<h2 class="bereich-titel">Termine</h2>${termine}` : ""}
  ${modul("abfragen") && (aktuell.length || istTrainer()) ? `<h2 class="bereich-titel">Abfragen</h2>` : ""}
  ${modul("abfragen") ? aktuell.map((a, i) => `<div class="${i ? "abstand" : ""}">${abfrageKarte(a)}</div>`).join("") : ""}
  ${modul("abfragen") && istTrainer() ? `<details class="karte abstand formular-klappe"><summary>Neue Abfrage starten</summary><div class="abstand">
      <p class="leise klein">${erwachsen() ? "Zum Beispiel: Wie lange kannst du bei der Mannschaftstour? Jeder antwortet für sich, du siehst sofort die Übersicht." : "Zum Beispiel: Wer ist in den Herbstferien beim Training? Die Eltern antworten für ihren Sohn, du siehst sofort die Übersicht."}</p>
      <form data-form="abfrage-neu">
        <div class="feld"><label>Frage</label><input type="text" name="titel" required maxlength="120" placeholder="Training in den Herbstferien"></div>
        <div class="feld"><label>Erklärung (optional)</label><textarea name="text" maxlength="800"></textarea></div>
        <div class="feld"><label>Termine zum Ankreuzen, einer pro Zeile (leer lassen für eine Ja/Nein-Frage)</label><textarea name="optionen" maxlength="600" placeholder="Di 20.10. 17:30\nFr 23.10. 18:00\nDi 27.10. 17:30"></textarea></div>
        <div class="zeile"><div class="feld" style="flex-basis:160px"><label>Antworten bis</label><input type="date" name="frist"></div>
        <button class="knopf">Abfrage starten</button></div>
      </form></div></details>` : ""}
  ${modul("abfragen") && alt.length ? `<details class="abstand"><summary>Frühere Abfragen (${alt.length})</summary>${alt.map((a) => `<div class="abstand">${abfrageKarte(a)}</div>`).join("")}</details>` : ""}`;
}

function seiteDatenschutz() {
  return `${kopfzeile("Kurz und klar", "Datenschutz")}
  <section class="karte">
    <p>${erwachsen() ? `Diese Seite ist ein privates Angebot der Mannschaft ${esc(Z.einstellungen.mannschaftName || "")}${Z.einstellungen.vereinName ? " (" + esc(Z.einstellungen.vereinName) + ")" : ""}. Sie ist passwortgeschützt und nur für Spieler und Trainer der Mannschaft gedacht.` : `Diese Seite ist ein privates Angebot der Eltern der ${esc(Z.einstellungen.mannschaftName || "Mannschaft")}${Z.einstellungen.vereinName ? " des " + esc(Z.einstellungen.vereinName) : ""}. Sie ist passwortgeschützt und nur für Eltern der Mannschaft gedacht.`} Suchmaschinen sind ausgeschlossen.</p>
    <h3>Welche Daten gespeichert werden</h3>
    <p>Namen und Angaben, die ihr selbst eintragt (Standdienst, Mitbringliste, Trikotplan, Fotos), die Buchungen der Mannschaftskasse sowie Vornamen der Spieler. Gespeichert wird bei Netlify (Netlify, Inc.). Für die Anmeldung wird ein technisch notwendiges Cookie gesetzt. Euer Browser merkt sich lokal eine zufällige Gerätekennung und euren zuletzt eingetragenen Namen, damit ihr eigene Einträge wieder entfernen könnt.</p>
    <h3>Spieler-Zugang</h3>
    <p>Die Jungs können sich mit einem eigenen Passwort für Training und Spiele an- und abmelden. Gespeichert werden dabei Vorname, Zu- oder Absage und ein optionaler kurzer Hinweis. Bitte keine Gesundheitsangaben eintragen, „kann nicht“ genügt. Der Spieler-Zugang sieht weder die Kasse noch Einträge der Eltern außer den Fahrgemeinschaften.</p>
    <h3>Benachrichtigungen</h3>
    <p>Wer Erinnerungen einschaltet, erlaubt dem Browser, Nachrichten zu empfangen. Gespeichert wird dafür eine technische Adresse des Browsers (vom Hersteller, z. B. Google oder Apple, vergeben), die Rolle und der Vorname. Ausschalten geht jederzeit unter Mehr › Benachrichtigungen oder in den Einstellungen des Handys.</p>
    <h3>Fotos</h3>
    <p>Fotos werden nur mit Einverständnis der abgebildeten Personen beziehungsweise ihrer Eltern hochgeladen. Wer ein Foto entfernt haben möchte, nutzt in der Galerie „Melden“. Das Foto wird sofort ausgeblendet und von der Kassenführung geprüft.</p>
    <h3>handball.net</h3>
    <p>Diese Webseite bindet Widgets von handball.net (www.handball.net) ein. Der Browser ruft direkt die Server von handball.net auf. Handball.net erstellt anonymisierte Aufrufstatistiken und speichert alle Zugriffe für maximal 3 Monate.</p>
    <h3>Ansprechpartner</h3>
    <p>Fragen und Löschwünsche an die Kassenführung über die Eltern-WhatsApp-Gruppe.</p>
  </section>`;
}


// ---------- Bausteine ----------
const wtDatum = (s) => datum(s.datum).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
const namenListe = (arr) => [...new Set(arr)].join(", ");

// Teilen-Fenster: Text kopieren oder direkt in WhatsApp öffnen
function teilen(text) {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.innerHTML = `<div class="teilen-box">
    <h2 style="margin-bottom:8px">Text für WhatsApp</h2>
    <textarea readonly>${esc(text)}</textarea>
    <div class="ausrichten abstand" style="margin-top:12px">
      <button class="knopf" data-t="kopieren">Kopieren</button>
      <a class="knopf zweit" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">In WhatsApp öffnen</a>
      <button class="knopf zweit" data-t="zu">Schließen</button>
    </div></div>`;
  box.addEventListener("click", async (e) => {
    if (e.target === box || e.target.dataset.t === "zu") return box.remove();
    if (e.target.dataset.t === "kopieren") {
      try { await navigator.clipboard.writeText(text); }
      catch { const t = box.querySelector("textarea"); t.select(); document.execCommand("copy"); }
      meldung("Text kopiert, jetzt in die WhatsApp-Gruppe einfügen");
    }
  });
  document.body.appendChild(box);
}

function cateringText(s) {
  const e = Z.einstellungen;
  const alle = Z.standdienst.filter((x) => x.spielId === s.id).sort((a, b) => a.erstellt.localeCompare(b.erstellt));
  const dienst = alle.filter((x) => !x.reserve).map((x) => anzeigeName(x.name));
  const reserve = alle.filter((x) => x.reserve).map((x) => anzeigeName(x.name));
  const frei = Math.max(0, e.standdienstPlaetze - dienst.length);
  const z = [`🤾 Heimspiel ${wtDatum(s)}${s.zeit ? " " + s.zeit + " Uhr" : ""} gegen ${s.gegner}`];
  if (s.halle) z.push(`📍 ${s.halle}`);
  z.push("", `👕 Standdienst${treffzeit(s) ? ` (bitte spätestens um ${treffzeit(s)} Uhr da sein)` : ""}:`);
  z.push(dienst.length ? `${frei ? "" : "✅ "}${dienst.join(", ")}` : "");
  if (frei) z.push(`❗ noch ${frei} ${frei === 1 ? "Platz" : "Plätze"} frei`);
  if ((e.reservePlaetze ?? 1) > 0) z.push(reserve.length ? `Reserve: ${reserve.join(", ")}` : "Reserve: noch frei");
  if (zeitnehmerNoetig(s)) z.push(`⏱ Zeitnehmer: ${zeitnehmerVon(s).map((x) => anzeigeName(x.name)).join(", ") || "❗ noch offen"}`);
  if (waescheNoetig(s)) {
    const vor = vorherigesHeim(s), bringt = vor && waescheVon(vor);
    if (bringt) z.push(`🧺 Wäsche bringt mit: ${bringt.name}`);
    z.push(`🧺 Wäsche nach dem Spiel mitnehmen: ${waescheVon(s)?.name || "❗ noch offen"}`);
  }
  z.push("", "🍰 Mitbringliste:");
  for (const a of cateringStatus(s).artikel) {
    const zus = Z.catering.filter((c) => c.spielId === s.id && c.artikel === a.name);
    const wer = zus.map((c) => (c.menge ? `${c.menge} von ` : "") + anzeigeName(c.name)).join(", ");
    const fehlt = a.bedarf - zus.length;
    const name = a.hinweis ? `${a.name} (je ${a.hinweis})` : a.name;
    z.push(fehlt > 0 ? `❗ ${name}: ${wer ? wer + ", " : ""}noch ${fehlt} gesucht` : `✅ ${a.name}: ${wer}`);
  }
  z.push("", `Eintragen: ${location.origin}/#/catering`);
  return z.filter((x, i, arr) => !(x === "" && arr[i - 1] === "")).join("\n").replace(/Standdienst:\n\n/, "Standdienst:\n");
}

// ---------- Kasse: Ergebnis je Heimspiel ----------
function spielBilanz(spielId) {
  const b = Z.kasse.filter((x) => x.spielId === spielId);
  const ein = b.filter((x) => x.art === "einnahme");
  const aus = b.filter((x) => x.art === "ausgabe");
  const summe = (l) => l.reduce((t, x) => t + x.betrag, 0);
  const nach = (l, feld) => {
    const m = new Map();
    l.forEach((x) => m.set(x[feld] || "Sonstiges", (m.get(x[feld] || "Sonstiges") || 0) + x.betrag));
    return [...m.entries()];
  };
  return { anzahl: b.length, ein: summe(ein), aus: summe(aus), einNach: nach(ein, "kanal"), ausNach: nach(aus, "kategorie") };
}

function spielErgebnisse() {
  const zeilen = heimspiele().map((s) => ({ s, b: spielBilanz(s.id) })).filter((x) => x.b.anzahl);
  if (!zeilen.length) return "";
  return `<section class="karte abstand">
    <h2>Ergebnis je Heimspiel</h2>
    <div class="tabelle-wrap"><table>
      <thead><tr><th>Heimspiel</th><th class="betrag">Einnahmen</th><th class="betrag">Ausgaben</th><th class="betrag">Ergebnis</th><th></th></tr></thead>
      <tbody>${zeilen.reverse().map(({ s, b }) => `<tr>
        <td><strong>${wtDatum(s)}</strong> <span class="leise">gegen ${esc(s.gegner)}</span></td>
        <td class="betrag plus">${euro(b.ein)}</td>
        <td class="betrag minus">${euro(b.aus)}</td>
        <td class="betrag"><strong>${euro(b.ein - b.aus)}</strong></td>
        <td style="text-align:right"><button class="link-knopf" data-aktion="whatsapp-abrechnung" data-spiel="${s.id}">teilen</button></td>
      </tr>`).join("")}</tbody></table></div>
  </section>`;
}

// Buchungstext für die Anzeige: OTV-Anteil einheitlich und verständlich benennen
function buchungTitel(b) {
  if (b.kategorie !== "Getränke OTV") return b.zweck;
  const sp = Z.spiele.find((x) => x.id === b.spielId);
  return `Anteil Getränke an den OTV${sp ? `, Heimspiel gegen ${sp.gegner}` : ""}`;
}

function otvOffenKarte() {
  if (!istAdmin()) return "";
  const offen = Z.kasse.filter((b) => b.offen).sort((a, b) => a.datum.localeCompare(b.datum));
  const summe = offen.reduce((n, b) => n + b.betrag, 0);
  const bezahlt = Z.kasse.filter((b) => b.kategorie === "Getränke OTV" && !b.offen);
  if (!offen.length) return "";
  return `<section class="karte abstand otv-offen">
    <div class="karte-kopf"><h2 style="margin:0">Getränke: an den OTV zu zahlen</h2><span class="pill ${summe ? "offen" : "ok"}">${summe ? euro(summe) : "alles bezahlt"}</span></div>
    <p class="leise klein">Der OTV-Anteil ist im Kassenstand schon abgezogen. Wird monatlich gesammelt bezahlt.</p>
    ${offen.length ? `<ul class="liste">${offen.map((b) => `<li><span>${datumKurz(b.datum)} · ${esc(spielName(b.spielId) || b.zweck)}<div class="leise klein">${esc((b.getraenke || "").split(";").map((x) => x.replace("=", " × ")).join(", "))}</div></span><strong>${euro(b.betrag)}</strong></li>`).join("")}</ul>
      ${istAdmin() ? `<form class="zeile abstand" data-form="otv-bezahlt">
        <div class="feld" style="flex-basis:150px"><label>Bezahlt am</label><input type="date" name="datum" value="${heute()}" required></div>
        <div class="feld" style="flex-basis:130px"><label>bezahlt per</label><select name="kanal">${Z.einstellungen.kassenKanaele.map((k) => `<option>${esc(k)}</option>`).join("")}</select></div>
        <button class="knopf">Alle ${euro(summe)} als bezahlt markieren</button></form>` : ""}` : `<p class="gut klein">Alles an den OTV bezahlt.</p>`}
  </section>`;
}

function abrechnungsFormular() {
  const e = Z.einstellungen;
  const liste = heimspiele();
  const vorschlag = [...vergangene(liste)].reverse().find((s) => !spielBilanz(s.id).anzahl) || kommende(liste)[0];
  const opt = (l, wert) => l.map((x) => `<option ${x === wert ? "selected" : ""}>${esc(x)}</option>`).join("");
  return `<details class="karte abstand nur-kasse formular-klappe"><summary>Heimspiel abrechnen</summary><div class="abstand">
    <p class="leise">Nach dem Spiel einmal ausfüllen. Daraus entstehen die Buchungen und ein fertiger Text für die Gruppe. Leere Felder werden übersprungen.</p>
    <form data-form="abrechnung">
      <div class="zeile">
        <div class="feld" style="flex-basis:260px"><label>Heimspiel</label><select name="spielId" required>${liste.map((s) => `<option value="${s.id}" ${vorschlag && s.id === vorschlag.id ? "selected" : ""}>${wtDatum(s)} gegen ${esc(s.gegner)}</option>`).join("")}</select></div>
      </div>
      <h3 class="abstand">Einnahmen</h3>
      <div class="zeile">${e.kassenKanaele.map((k) => `<div class="feld" style="flex-basis:130px"><label>${esc(k)} (€)</label><input type="text" inputmode="decimal" name="ein:${esc(k)}" placeholder="0,00"></div>`).join("")}</div>
      ${modul("strichliste") ? `<h3 class="abstand">Getränke (verkaufte Stück)</h3>
      <p class="leise klein">Aus der Strichliste des Standdienstes vorausgefüllt, bitte mit der Papierliste abgleichen. Der Verkauf ist im Bargeld oben schon enthalten. ${e.otvAnteilProzent ?? 50} % des Getränkeumsatzes gehen an den OTV und werden als „offen an den OTV“ gebucht.</p>
      <div class="zeile getraenke-felder">${getraenkeListe().map((g) => `<div class="feld" style="flex-basis:120px"><label>${esc(g.name)} <span class="leise">${euro(g.preis)}</span></label><input type="number" min="0" step="1" inputmode="numeric" name="g:${esc(g.name)}" value="${(vorschlag && strichVon(vorschlag)[g.name]) || ""}" placeholder="0"></div>`).join("")}</div>
      <p class="getraenke-ergebnis" id="getraenke-ergebnis"></p>` : ""}
      <h3 class="abstand">Ausgaben</h3>
      <div class="zeile">
        <div class="feld" style="flex-basis:150px"><label>Einkauf Catering (€)</label><input type="text" inputmode="decimal" name="einkauf" placeholder="0,00"></div>
        <div class="feld" style="flex-basis:130px"><label>bezahlt per</label><select name="einkaufKanal">${opt(e.kassenKanaele, "Bar")}</select></div>
        <div class="feld" style="flex-basis:200px"><label>Beleg / Notiz</label><input type="text" name="beleg" maxlength="120" placeholder="optional"></div>
      </div>
      <button class="knopf abstand">Abrechnung speichern</button>
    </form></div>
  </details>`;
}

function abrechnungsText(spielId) {
  const s = Z.spiele.find((x) => x.id === spielId);
  const buch = Z.kasse.filter((x) => x.spielId === spielId);
  const ein = buch.filter((x) => x.art === "einnahme").reduce((n, x) => n + x.betrag, 0);
  const otv = buch.filter((x) => x.art === "ausgabe" && x.kategorie === "Getränke OTV");
  const sonst = buch.filter((x) => x.art === "ausgabe" && x.kategorie !== "Getränke OTV");
  const gz = {};
  for (const b of otv) for (const [k, v] of Object.entries(Object.fromEntries((b.getraenke || "").split(";").map((t) => t.split("=")).filter((t) => t.length === 2)))) gz[k] = (gz[k] || 0) + (parseInt(v, 10) || 0);
  const getr = getraenkeRechnung(gz);
  const otvSumme = otv.reduce((n, x) => n + x.betrag, 0);
  const aus = otvSumme + sonst.reduce((n, x) => n + x.betrag, 0);
  const z = [`💰 Abrechnung Heimspiel gegen ${s.gegner} (${wtDatum(s)})`, ""];
  z.push(`Einnahmen (Kuchen, Kaffee und Getränke): ${euro(ein)}`);
  if (getr.umsatz) z.push(`davon Getränke: ${euro(getr.umsatz)}`);
  if (aus) {
    z.push("", "Abzüglich:");
    if (otvSumme) z.push(`• Anteil Getränke an den OTV (${Z.einstellungen.otvAnteilProzent ?? 50} %): ${euro(otvSumme)}`);
    const nachKat = new Map();
    for (const x of sonst) nachKat.set(x.kategorie || "Sonstiges", (nachKat.get(x.kategorie || "Sonstiges") || 0) + x.betrag);
    for (const [k, v] of nachKat) z.push(`• ${k}: ${euro(v)}`);
  }
  z.push("", `Ergebnis für die Mannschaftskasse: ${ein - aus >= 0 ? "+" : "−"}${euro(Math.abs(ein - aus))}`);
  z.push(`Kassenstand aktuell: ${euro(kassenSummen().saldo)}`);
  z.push("", "Vielen Dank an alle, die beim Standdienst, mit Kuchen und beim Spiel geholfen haben! 🙌");
  z.push("", `Details: ${location.origin}/#/kasse`);
  return z.join("\n");
}

// ---------- Fahrgemeinschaften ----------
const auswaertsspiele = () => spieleSortiert().filter((s) => !s.heim);

function fahrtStatus(s) {
  const fahrten = Z.fahrten.filter((f) => f.spielId === s.id);
  const plaetze = fahrten.reduce((t, f) => t + f.plaetze, 0);
  const belegt = Z.mitfahrer.filter((m) => fahrten.some((f) => f.id === m.fahrtId)).length;
  return { fahrten, plaetze, belegt, frei: plaetze - belegt };
}

function fahrtKachel() {
  const s = kommende(auswaertsspiele())[0];
  if (!s) return "";
  const st = fahrtStatus(s);
  return `<section class="karte"><div class="kachel-label">Nächste Auswärtsfahrt</div>
    ${spielZeile(s)}
    ${hallenZeile(s)}
    <p class="abstand" style="margin-bottom:4px"><strong>${st.fahrten.length ? `${st.fahrten.length} Fahrer, ${st.frei} ${st.frei === 1 ? "Platz" : "Plätze"} frei` : "Noch keine Fahrgemeinschaft"}</strong></p>
    <a class="knopf" href="#/fahrten">Mitfahren oder Plätze anbieten</a></section>`;
}

// "10:30" -> "10:30 Uhr" (nur wenn "Uhr" noch fehlt)
const mitUhr = (t) => String(t || "").replace(/\b(\d{1,2})[:.](\d{2})\b(?!\s*Uhr)/gi, "$1:$2 Uhr");
const abfahrtText = (t) => mitUhr(String(t || "").trim().replace(/^abfahrt:?\s*/i, ""));

function spielNachricht(sp) {
  const z = [];
  // 1. Infos vom Trainerteam
  const infos = aktiveHinweise();
  if (infos.length) {
    z.push("📣 *Info vom Trainerteam*");
    for (const h of infos) z.push(h.text.trim());
    z.push("");
  }
  // 2. Kopf: Spiel, Tag, Anwurf, Treffen, Halle
  const tag = datum(sp.datum).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const tz = treffzeit(sp);
  const adr = halleAdresse(sp.halle);
  const halle = [sp.halle, adr && !(sp.halle || "").includes(adr) ? adr : ""].filter(Boolean).join(", ");
  z.push(sp.heim ? `🏠 *Heimspiel gegen ${sp.gegner}*` : `🚗 *Auswärtsspiel bei ${sp.gegner}*`);
  z.push(`${tag}${sp.zeit ? ` · Anwurf ${sp.zeit} Uhr` : ""}`);
  if (tz) z.push(`Jungs${sp.heim ? " und Standdienst" : ""} um ${tz} Uhr in der Halle`);
  z.push(`Halle: ${halle || "folgt"}`);
  // 3. Was fehlt, was steht
  const fehlt = [], steht = [];
  for (const art of sp.heim ? dienstArten() : []) {
    const wer = dienstVon(sp, art);
    const frei = art.personen - wer.length;
    if (frei > 0) fehlt.push(`${frei}× ${art.name}${dienstZeitText(sp, art) ? ` (${dienstZeitText(sp, art)})` : ""}`);
    if (wer.length) steht.push(`${art.name}: ${wer.map((d) => d.person || anzeigeName(d.name)).join(", ")}`);
  }
  if (sp.heim && modul("standdienst")) {
    const st = cateringStatus(sp);
    const dienst = Z.standdienst.filter((x) => x.spielId === sp.id && !x.reserve);
    const frei = st.plaetze - st.dienst;
    if (frei > 0) fehlt.push(`${frei}× Standdienst`);
    if (dienst.length) steht.push(`Standdienst: ${dienst.map((x) => anzeigeName(x.name)).join(", ")}`);
    const offen = st.artikel.filter((a) => a.zugesagt < a.bedarf);
    if (offen.length) fehlt.push(offen.map((a) => `${a.name}${a.bedarf - a.zugesagt > 1 ? ` (${a.bedarf - a.zugesagt}×)` : ""}`).join(", "));
    for (const a of st.artikel) {
      const zus = Z.catering.filter((c) => c.spielId === sp.id && c.artikel === a.name);
      if (zus.length) steht.push(`${a.name}: ${zus.map((c) => anzeigeName(c.name)).join(", ")}`);
    }
  } else if (!sp.heim && modul("fahrten")) {
    const st = fahrtStatus(sp);
    if (!st.fahrten.length) fehlt.push("Fahrer mit freien Plätzen");
    for (const f of st.fahrten) {
      const mit = Z.mitfahrer.filter((m) => m.fahrtId === f.id).map((m) => m.name);
      const frei = f.plaetze - mit.length;
      steht.push(`${anzeigeName(f.fahrer)} fährt${richtungText(f) ? ` (${richtungText(f)})` : ""}: ${frei > 0 ? `${frei} ${frei === 1 ? "Platz" : "Plätze"} frei` : "voll"}${f.treffpunkt ? `, Abfahrt ${abfahrtText(f.treffpunkt)}` : ""}${mit.length ? `, dabei: ${mit.join(", ")}` : ""}`);
    }
    const bedarf = bedarfVon(sp);
    if (bedarf.length) fehlt.push(`Fahrt für ${bedarf.map(bedarfText).join(", ")}`);
  }
  if (zeitnehmerNoetig(sp)) {
    const zn = zeitnehmerVon(sp);
    if (zn.length < zeitnehmerPlaetze()) fehlt.push("Zeitnehmer");
    if (zn.length) steht.push(`Zeitnehmer: ${zn.map((x) => anzeigeName(x.name)).join(", ")}`);
  }
  if (waescheNoetig(sp)) {
    const w = waescheVon(sp);
    if (w) steht.push(`Wäsche danach: ${anzeigeName(w.name)}`); else fehlt.push("Wäsche nach dem Spiel mitnehmen");
  }
  if (fehlt.length) { z.push("", "❗ *Noch gesucht*"); for (const x of fehlt) z.push(`• ${x}`); }
  if (steht.length) { z.push("", "✅ *Schon eingetragen*"); for (const x of steht) z.push(`• ${x}`); }
  if (!fehlt.length) z.push("", "Alles besetzt, danke! 👍");
  // 4. Offene Rückmeldungen
  const rm = offeneRueckmeldungen();
  if (rm.length) {
    z.push("", "📅 *Bitte zurückmelden*");
    for (const x of rm) z.push(`• ${x.titel}${x.datum ? ` am ${kurzDatum(x.datum)}` : ""}${x.frist && x.frist >= heute() ? `, bis ${kurzDatum(x.frist)}` : ""} (${x.offen} ${x.offen === 1 ? "Familie fehlt" : "Familien fehlen"} noch)`);
  }
  z.push("", `👉 ${location.origin}`);
  return z.join("\n");
}

function fahrtenText(s) {
  const st = fahrtStatus(s);
  const z = [`🚗 Fahrgemeinschaften Auswärtsspiel ${wtDatum(s)}${s.zeit ? " " + s.zeit + " Uhr" : ""} bei ${s.gegner}`];
  if (s.halle) z.push(`📍 ${s.halle}`);
  if (treffzeit(s)) z.push(`⏰ Jungs spätestens um ${treffzeit(s)} Uhr in der Halle`);
  if (zeitnehmerNoetig(s)) z.push(`⏱ Zeitnehmer: ${zeitnehmerVon(s).map((x) => anzeigeName(x.name)).join(", ") || "❗ noch offen"}`);
  z.push("");
  if (!st.fahrten.length) z.push("❗ Bisher bietet noch niemand Plätze an.");
  for (const f of st.fahrten) {
    const mit = Z.mitfahrer.filter((m) => m.fahrtId === f.id).map((m) => m.name);
    const frei = f.plaetze - mit.length;
    z.push(`${anzeigeName(f.fahrer)}${richtungText(f) ? ` (${richtungText(f)})` : ""}${f.treffpunkt ? " · " + f.treffpunkt : ""}: ${mit.length ? mit.join(", ") : "noch niemand"}${frei > 0 ? ` (noch ${frei} frei)` : " (voll)"}`);
  }
  const bedarf = bedarfVon(s);
  if (bedarf.length) z.push("", `❗ Suchen noch eine Fahrt: ${bedarf.map(bedarfText).join(", ")}`);
  z.push("", `Eintragen: ${location.origin}/#/fahrten`);
  return z.join("\n");
}

function fahrtenDetails(s) {
    const st = fahrtStatus(s);
    const eigeneFahrten = st.fahrten.filter((f) => f.eigen);
    const fahrten = st.fahrten.map((f) => {
      const mit = Z.mitfahrer.filter((m) => m.fahrtId === f.id).sort((a, b) => a.erstellt.localeCompare(b.erstellt));
      const frei = f.plaetze - mit.length;
      const kinder = kader().map((x) => x.vorname).filter((n) => !fahrtKonflikt(n, f));
      const andere = (m) => st.fahrten.some((g) => g.id !== f.id && Z.mitfahrer.filter((x) => x.fahrtId === g.id).length < g.plaetze && !fahrtKonflikt(m.name, g, m.id));
      return `<li class="fahrt">
        <div class="fahrt-kopf">
          <div><strong>${esc(anzeigeName(f.fahrer))}</strong> <span class="pill ${frei > 0 ? "ok" : "neutral"}">${frei > 0 ? `${frei} von ${f.plaetze} frei` : "voll"}</span>${richtungText(f) ? ` <span class="pill neutral">${richtungText(f)}</span>` : ""}
            ${f.treffpunkt ? `<div class="leise klein">Abfahrt: ${esc(abfahrtText(f.treffpunkt))}</div>` : ""}
            ${f.hinweis ? `<div class="leise klein">${esc(f.hinweis)}</div>` : ""}</div>
          ${darfLoeschen(f) ? `<button class="link-knopf" style="color:var(--rot)" data-aktion="loeschen" data-col="fahrten" data-id="${f.id}" data-frage="Fahrt löschen? Eingetragene Mitfahrer werden mit entfernt.">Fahrt löschen</button>` : ""}
        </div>
        <div>${mit.map((m) => { const darf = darfLoeschen(m) || f.eigen; return `<span class="chip">${esc(m.name)}${darf && andere(m) ? `<button class="x" title="in ein anderes Auto umsteigen" aria-label="${esc(m.name)} umsteigen" data-aktion="umsteigen" data-id="${m.id}">⇄</button>` : ""}${darf ? `<button class="x" title="austragen" data-aktion="loeschen" data-col="mitfahrer" data-id="${m.id}" data-frage="${esc(m.name)} austragen?">×</button>` : `<span style="width:6px"></span>`}</span>`; }).join("")}</div>
        ${frei > 0 ? `<form class="zeile mitfahren" data-form="mitfahrer" data-fahrt="${f.id}">
          <div class="feld"><select name="name" aria-label="Spieler auswählen">${kinder.length ? `<option value="">Spieler auswählen …</option>${kinder.map((n) => `<option ${n === meinKind() ? "selected" : ""}>${esc(n)}</option>`).join("")}` : `<option value="">alle Jungs eingetragen</option>`}<option value="__andere">jemand anderes …</option></select></div>
          <button class="knopf klein">Mitfahren</button></form>` : ""}
      </li>`;
    }).join("");
  const bedarf = bedarfVon(s);
  const bedarfHtml = bedarf.length ? `<div class="fahrt-gesucht"><strong>Suchen noch eine Fahrt</strong><ul class="liste">${bedarf.map((b) => {
      const passend = eigeneFahrten.find((f) => Z.mitfahrer.filter((m) => m.fahrtId === f.id).length < f.plaetze && strecken(f.richtung).some((r) => strecken(b.richtung).includes(r)) && !fahrtKonflikt(b.spieler, f));
      return `<li><span>${esc(bedarfText(b))}${b.von ? `<div class="leise klein">gemeldet von ${esc(anzeigeName(b.von))}</div>` : ""}</span><span class="ausrichten">
        ${passend ? `<button class="knopf klein" data-aktion="mitnehmen" data-id="${b.id}" data-fahrt="${passend.id}">Nehme ich mit</button>` : ""}
        ${b.eigen || istAdmin() ? `<button class="link-knopf" data-aktion="loeschen" data-col="fahrtbedarf" data-id="${b.id}" data-frage="Eintrag entfernen?">entfernen</button>` : ""}</span></li>`; }).join("")}</ul></div>` : "";
  const ohneFahrt = kader().map((x) => x.vorname).filter((n) => !Z.mitfahrer.some((m) => m.name === n && st.fahrten.some((f) => f.id === m.fahrtId && strecken(f.richtung).length === 2)));
  return `${bedarfHtml}${fahrten ? `<ul class="liste">${fahrten}</ul>` : `<p class="leer">Noch bietet niemand Plätze an.</p>`}
        <details class="abstand fahrt-anbieten"><summary>${erwachsen() ? "Ich suche eine Fahrt" : "Wir brauchen noch eine Fahrt"}</summary>
          <form class="zeile" data-form="fahrtbedarf" data-spiel="${s.id}">
            <div class="feld" style="flex-basis:160px"><label>Für</label><select name="spieler">${ohneFahrt.map((n) => `<option ${n === meinKind() ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
            <div class="feld" style="flex-basis:180px"><label>Strecke</label><select name="richtung"><option value="beide">hin und zurück</option><option value="hin">nur Hinfahrt</option><option value="rueck">nur Rückfahrt</option></select></div>
            <button class="knopf zweit">Fahrt suchen</button>
          </form>
          <p class="leise klein">${erwachsen() ? "Fahrer sehen das und können dich mit einem Klick mitnehmen." : "Fahrer sehen das und können dein Kind mit einem Klick mitnehmen."}</p></details>
        <details class="abstand fahrt-anbieten" id="anbieten-${s.id}"><summary>Ich fahre und habe Plätze frei</summary>
          <form class="zeile" data-form="fahrt" data-spiel="${s.id}">
            <div class="feld" style="flex-basis:110px"><label>Freie Plätze</label><select name="plaetze">${[1, 2, 3, 4, 5, 6].map((n) => `<option ${n === 3 ? "selected" : ""}>${n}</option>`).join("")}</select></div>
            <div class="feld" style="flex-basis:170px"><label>Strecke</label><select name="richtung"><option value="beide">hin und zurück</option><option value="hin">nur Hinfahrt</option><option value="rueck">nur Rückfahrt</option></select></div>
            <div class="feld" style="flex-basis:240px"><label>Abfahrt: Uhrzeit und Treffpunkt</label><input type="text" name="treffpunkt" maxlength="120" placeholder="${erwachsen() ? `z. B. ${treffzeit(s) ? abfahrtVorschlag(s) + " Uhr " : ""}ab Haan Ost` : treffzeit(s) ? `z. B. Abfahrt ${abfahrtVorschlag(s)} Uhr am OTV-Parkplatz` : "z. B. Abfahrt am OTV-Parkplatz"}"></div>
            <div class="feld" style="flex-basis:200px"><label>Hinweis</label><input type="text" name="hinweis" maxlength="160" placeholder="optional, z. B. nur Hinfahrt"></div>
            <button class="knopf">Fahrt anbieten</button>
          </form></details>`;
}
function seiteFahrten() { spieleFilter = "aus"; return seiteSpiele(); }

// ---------- Als App installieren ----------
let installEreignis = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEreignis = e; if (location.hash.replace(/^#\/?/, "") === "") zeigen(); });
window.addEventListener("appinstalled", () => { installEreignis = null; lokal("otv_install_weg", "1"); meldung("App installiert 👍"); });
const istApp = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const istIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const istHandy = () => /iPhone|iPad|iPod|Android/.test(navigator.userAgent);

function installKarte() {
  if (istApp() || !istHandy() || lokal("otv_install_weg")) return "";
  return `<section class="karte install-karte">
    <div><strong>Als App aufs Handy</strong><div class="leise klein">Dann ist die Seite mit OTV-Logo auf dem Startbildschirm, ohne App-Store.</div></div>
    <div class="ausrichten"><button class="knopf klein" data-aktion="app-installieren">So geht’s</button>
      <button class="link-knopf" data-aktion="install-weg">später</button></div>
  </section>`;
}

async function appInstallieren() {
  if (installEreignis) {
    installEreignis.prompt();
    await installEreignis.userChoice.catch(() => null);
    installEreignis = null;
    return;
  }
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `<div class="dialog-box">
    <h2>Als App installieren</h2>
    ${istIOS() ? `<ol class="schritte">
        <li>Diese Seite in <strong>Safari</strong> öffnen (nicht aus WhatsApp heraus).</li>
        <li>Unten auf das <strong>Teilen-Symbol</strong> tippen (Quadrat mit Pfeil nach oben).</li>
        <li>Nach unten scrollen und <strong>„Zum Home-Bildschirm“</strong> wählen.</li>
        <li>Oben rechts auf <strong>„Hinzufügen“</strong> tippen.</li></ol>`
      : `<ol class="schritte">
        <li>Diese Seite in <strong>Chrome</strong> öffnen (nicht aus WhatsApp heraus).</li>
        <li>Oben rechts auf die <strong>drei Punkte ⋮</strong> tippen.</li>
        <li><strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong> wählen.</li>
        <li>Mit <strong>„Installieren“</strong> bestätigen.</li></ol>`}
    <p class="leise klein">Danach liegt das OTV-Logo auf dem Startbildschirm. Angemeldet bleibt man wie im Browser.</p>
    <button class="knopf gross" data-w="zu">Alles klar</button></div>`;
  box.addEventListener("click", (e) => { if (e.target === box || e.target.dataset.w === "zu") box.remove(); });
  document.body.appendChild(box);
}

// ---------- Willkommen und Name ----------
function installHinweis() {
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) return "";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return `<p class="tipp"><strong>Tipp:</strong> Unten in Safari auf <strong>Teilen</strong> tippen und <strong>„Zum Home-Bildschirm“</strong> wählen. Dann ist die Seite wie eine App auf dem Handy.</p>`;
  if (/Android/.test(ua)) return `<p class="tipp"><strong>Tipp:</strong> Oben rechts im Chrome-Menü <strong>⋮</strong> auf <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong> tippen.</p>`;
  return "";
}

function willkommen({ nurName = false } = {}) {
  return new Promise((fertig) => {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    if (Z.rolle === "spieler" || (erwachsen() && Z.rolle !== "trainer")) {
      box.innerHTML = `<form class="dialog-box"><h2>${nurName ? "Wer bist du?" : "Hallo!"}</h2>
        <p>${nurSpielerSicht() ? "Hier meldest du dich für Training und Spiele an oder ab. So weiß das Trainerteam, wer kommt." : "Hier organisieren wir als Mannschaft alles rund um die Spiele: Dienste, Fahrten, Termine und Kasse. Bitte einmal auswählen, wer du bist."}</p>
        <label for="w-kind">Dein Name</label>
        <select id="w-kind" required><option value="">bitte wählen …</option>${kader().map((k) => `<option ${k.vorname === meinKind() ? "selected" : ""}>${esc(k.vorname)}</option>`).join("")}</select>
        ${installHinweis()}
        <div class="ausrichten abstand" style="margin-top:16px"><button class="knopf gross">Los geht’s</button><button type="button" class="link-knopf" data-w="spaeter">später</button></div></form>`;
      const zu = (wert) => { lokal("otv_willkommen", "1"); box.remove(); fertig(wert); };
      box.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const kind = box.querySelector("#w-kind").value;
        if (!kind) return;
        lokal("otv_vorname", kind); lokal("otv_kind", kind); lokal("otv_name", kind);
        kopfAktualisieren(); pushAuffrischen();
        zu(kind);
      });
      box.querySelector("[data-w=spaeter]").addEventListener("click", () => zu(""));
      document.body.appendChild(box);
      return;
    }
    box.innerHTML = `<form class="dialog-box">
      ${nurName ? `<h2>Wie heißt du?</h2><p class="leise">Damit die anderen sehen, wer sich eingetragen hat.</p>`
        : `<h2>Willkommen!</h2>
        <p>${erwachsen() ? "Hier organisieren wir als Mannschaft alles rund um die Spiele: Dienste, Fahrten, Termine und Kasse." : `Hier organisieren wir Eltern alles rund um die Spiele der ${esc(Z.einstellungen.mannschaftName || "Mannschaft")}: Standdienst, Kuchen, Fahrten, Trikots und Kasse.`}</p>
        <ul class="punkte-liste">
          <li>Eintragen geht mit einem Klick, austragen genauso.</li>
          <li>Was du zugesagt hast, steht auf der Startseite unter <strong>Meine Termine</strong>.</li>
          <li>Absprachen laufen weiter über WhatsApp.</li>
        </ul>`}
      <label for="w-name">Dein Vorname <span class="leise klein">(bitte ohne Nachnamen)</span></label>
      <input id="w-name" type="text" maxlength="40" required value="${esc(meinVorname())}" placeholder="z. B. Peggy" autocomplete="given-name">
      <label for="w-kind" class="abstand" style="margin-top:12px">${erwachsen() ? "Spielst du selbst mit?" : "Dein Sohn in der Mannschaft"}</label>
      <select id="w-kind"><option value="">${erwachsen() ? "nein, ich bin Trainer oder Betreuer" : Z.rolle === "trainer" ? "kein Sohn, ich bin Trainer" : "bitte wählen …"}</option>${kader().map((k) => `<option ${k.vorname === meinKind() ? "selected" : ""}>${esc(k.vorname)}</option>`).join("")}</select>
      ${nurName ? "" : installHinweis()}
      <div class="ausrichten abstand" style="margin-top:16px">
        <button class="knopf gross">${nurName ? "Weiter" : "Los geht’s"}</button>
        <button type="button" class="link-knopf" data-w="spaeter">später</button>
      </div></form>`;
    const schliessen = (wert) => { lokal("otv_willkommen", "1"); box.remove(); fertig(wert); };
    box.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const eingabe = box.querySelector("#w-name").value.trim();
      const vorname = eingabe.split(/\s+/)[0];
      if (vorname !== eingabe) meldung(`Gespeichert wird nur der Vorname: ${vorname}`);
      const kind = box.querySelector("#w-kind").value;
      if (!vorname) return;
      lokal("otv_vorname", vorname);
      lokal("otv_kind", kind);
      lokal("otv_name", erwachsen() ? (kind || (Z.rolle === "trainer" ? `${vorname} (Trainer)` : vorname)) : kind ? `${vorname} (${kind})` : Z.rolle === "trainer" ? `${vorname} (Trainer)` : vorname);
      if (erwachsen() && kind) lokal("otv_vorname", kind);
      kopfAktualisieren(); pushAuffrischen();
      schliessen(gemerkterName());
    });
    box.querySelector("[data-w=spaeter]").addEventListener("click", () => schliessen(""));
    document.body.appendChild(box);
    setTimeout(() => box.querySelector("#w-name").focus(), 50);
  });
}

async function nameSicherstellen() {
  if (meinName()) return meinName();
  const name = await willkommen({ nurName: true });
  if (!name) throw new Error("Ohne Namen geht das Eintragen leider nicht");
  return name;
}

function kopfAktualisieren() {
  const v = meinVorname();
  $("#hallo").textContent = v ? v : "Name eintragen";
  $("#hallo").title = "Name ändern";
  const galerieSichtbar = Z && modul("galerie") && (Z.einstellungen.galerieAktiv || istAdmin());
  document.body.classList.toggle("ohne-galerie", !galerieSichtbar);
}

// Navigation und Kopfzeile nach Modulen und Mannschaft ausrichten
function navAnpassen() {
  if (!Z) return;
  const e = Z.einstellungen;
  const aus = { "#/kasse": !modul("kasse"), "#/trikots": !modul("trikots"), "#/galerie": !modul("galerie"), "#/anwesenheit": !modul("anwesenheit"),
    "#/infos": !modul("infos") && !modul("termine") && !modul("abfragen") };
  document.querySelectorAll(".nav a, .unten-nav a").forEach((a) => { a.hidden = !!aus[a.getAttribute("href")]; });
  const un = $("#unten-nav");
  if (un) un.style.gridTemplateColumns = `repeat(${[...un.children].filter((c) => getComputedStyle(c).display !== "none").length || 1}, 1fr)`;
  const name = e.mannschaftName || "Mannschaft";
  const verein = e.vereinName || "";
  const bereich = erwachsen() ? "Mannschaftsbereich" : "Elternbereich";
  const m = $(".marke-text");
  if (m) m.innerHTML = `<strong>${esc(name)}</strong><span>${esc([verein, bereich].filter(Boolean).join(" · "))}</span>`;
  const f = $("footer .innen span");
  if (f) f.textContent = `${erwachsen() ? "Mannschaftsseite" : "Private Elternseite"} ${name}${verein ? " · " + verein : ""} · Version 2.0`;
  document.title = `${name} · ${bereich}`;
  const infosText = [modul("infos") && "Infos", modul("termine") && "Termine"].filter(Boolean).join(" & ") || "Abfragen";
  const navInfos = $('.nav a[href="#/infos"]'); if (navInfos) navInfos.textContent = infosText;
}

function mehrMenue() {
  const box = document.createElement("div");
  box.className = "lightbox sheet-hinter";
  const links = nurSpielerSicht() ? [["#/mannschaft", "", "Mannschaft und Trainingszeiten"], ...(Z.demo ? [["#/funktionen", "", "Was kann die Seite? (Demo)"]] : [])] : [
    ...(modul("anwesenheit") ? [["#/anwesenheit", "", istTrainer() ? "Anwesenheit Training und Spiele" : erwachsen() ? "Training und Spiele: zu- und absagen" : "Training und Spiele: Meldungen ansehen"]] : []),
    ...(modul("trikots") ? [["#/trikots", "", "Trikots waschen"]] : []), ["#/mannschaft", "", "Mannschaft und Training"],
    ...(modul("galerie") && (Z.einstellungen.galerieAktiv || istAdmin()) ? [["#/galerie", "📷", "Galerie"]] : []),
    ...(istAdmin() ? [["#/verwaltung", "⚙️", "Verwaltung"]] : []),
    ...(Z.demo ? [["#/funktionen", "", "Was kann die Seite? (Demo)"]] : []),
  ];
  box.innerHTML = `<div class="sheet">
    ${links.map(([h, i, t]) => `<a href="${h}">${t}<span class="pfeil">›</span></a>`).join("")}
    <hr>
    <button data-m="name">${Z.rolle === "spieler" || erwachsen() ? "Anderen Spieler wählen" : "Name ändern"}</button>
    ${modul("push") ? `<button data-m="push">Benachrichtigungen</button>` : ""}
    ${istApp() ? "" : `<button data-m="app">Als App installieren</button>`}
    <button data-m="hilfe">Hilfe</button>
    <a href="#/datenschutz">Datenschutz</a>
    <button data-m="abmelden">Abmelden</button>
  </div>`;
  box.addEventListener("click", async (e) => {
    const t = e.target.closest("a,button");
    if (e.target === box || t?.tagName === "A") return box.remove();
    if (!t) return;
    box.remove();
    if (t.dataset.m === "name" || t.dataset.m === "hilfe") { await willkommen({ nurName: t.dataset.m === "name" }); zeigen(); }
    if (t.dataset.m === "app") await appInstallieren();
    if (t.dataset.m === "push") await pushDialog();
    if (t.dataset.m === "abmelden") { await fetch("/api/logout", { method: "POST" }); location.href = "/login.html"; }
  });
  document.body.appendChild(box);
}

// ---------- Training und Spiele: An- und Abmeldung ----------
const TAGE_NR = { sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6 };
const plusTage = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const startZeit = (t) => { const m = /(\d{1,2})[:.](\d{2})/.exec(String(t || "")); return m ? `${m[1].padStart(2, "0")}:${m[2]}` : ""; };
function ausfallFuer(datumIso, slot) {
  return (Z.trainingsausfall || []).find((a) => a.von && datumIso >= a.von && datumIso <= (a.bis || a.von) && (!a.slot || a.slot === "alle" || a.slot === String(slot)));
}
// Termine von heute bis heute + tage (Training aus den Trainingszeiten, dazu alle Spiele)
function anwesenheitTermine(tage = Z.einstellungen.anwesenheitTage || 14, ab = heute()) {
  const bis = plusTage(ab, tage);
  const t = [];
  for (let d = ab; d <= bis; d = plusTage(d, 1)) {
    (Z.einstellungen.trainingszeiten || []).forEach((tr, i) => {
      if (TAGE_NR[String(tr.tag || "").trim().toLowerCase()] !== new Date(d + "T12:00:00Z").getUTCDay()) return;
      const aus = ausfallFuer(d, i);
      t.push({ key: `tr-${d}-${i}`, art: "training", datum: d, zeit: startZeit(tr.zeit), zeitText: tr.zeit || "", ort: tr.halle || "", slot: i, titel: "Training", ausfall: aus || null });
    });
  }
  for (const s of Z.spiele) if (s.datum >= ab && s.datum <= bis) t.push({ key: `sp-${s.id}`, art: "spiel", datum: s.datum, zeit: s.zeit || "", ort: s.halle || "", spiel: s, titel: s.heim ? `Heimspiel gegen ${s.gegner}` : `Auswärtsspiel bei ${s.gegner}`, ausfall: null });
  return t.sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));
}
const trainingModus = () => (Z.einstellungen.anwesenheitTraining === "zusagen" ? "zusagen" : "abmelden");
function anwStatus(t, spieler) {
  const e = (Z.anwesenheit || []).find((x) => x.termin === t.key && x.spieler === spieler);
  if (e) return { status: e.status, eintrag: e, standard: false };
  if (t.art === "training" && trainingModus() === "abmelden") return { status: "ja", standard: true };
  return { status: "offen", standard: true };
}
function anwZahlen(t) {
  const z = { ja: [], nein: [], offen: [] };
  for (const k of kader()) { const st = anwStatus(t, k.vorname); z[st.status].push({ name: k.vorname, ...st }); }
  return z;
}
function terminZeitText(t) {
  if (t.art === "training") return `${t.zeitText || (t.zeit ? t.zeit + " Uhr" : "")}${t.ort ? " · " + t.ort : ""}`;
  const tz = treffzeit(t.spiel);
  return `Anwurf ${t.zeit ? t.zeit + " Uhr" : "folgt"}${tz ? ` · Treffen ${tz} Uhr in der Halle` : ""}${t.ort ? " · " + t.ort : ""}`;
}
// Eine Zeile mit Zu- und Absage für einen Spieler
function anwZeile(t, spieler, { zahlen = true, lesen = false } = {}) {
  const st = anwStatus(t, spieler);
  const z = anwZahlen(t);
  const knopf = (wert, text) => `<button class="anw-knopf ${st.status === wert ? "an " + wert + (st.standard ? " standard" : "") : ""}" data-aktion="anw" data-termin="${t.key}" data-spieler="${esc(spieler)}" data-status="${wert}" ${st.status === wert && st.standard ? 'title="automatisch dabei, solange du dich nicht abmeldest"' : ""}>${text}</button>`;
  const fahrt = t.art === "spiel" && !t.spiel.heim ? Z.mitfahrer.filter((m) => m.name === spieler).map((m) => Z.fahrten.find((f) => f.id === m.fahrtId && f.spielId === t.spiel.id)).filter(Boolean) : [];
  return `<li class="anw-zeile ${t.ausfall ? "ausfall" : ""} ${st.status === "offen" ? "offen" : ""}">
    ${datumBlock(t.datum)}
    <div class="anw-mitte">
      <div class="anw-titel">${esc(t.titel)}${t.ausfall ? ` <span class="pill neutral">fällt aus</span>` : st.status === "offen" ? ` <span class="pill offen">bitte melden</span>` : ""}</div>
      <div class="leise klein">${esc(terminZeitText(t))}</div>
      ${t.ausfall ? `<div class="klein">${esc(t.ausfall.grund || "Das Training fällt aus.")}</div>` : ""}
      ${fahrt.map((f) => `<div class="klein">🚗 fährt bei ${esc(anzeigeName(f.fahrer))} mit${f.treffpunkt ? ", Abfahrt " + esc(abfahrtText(f.treffpunkt)) : ""}${richtungText(f) ? ` (${richtungText(f)})` : ""}</div>`).join("")}
      ${st.eintrag?.bemerkung ? `<div class="klein">„${esc(st.eintrag.bemerkung)}“</div>` : ""}
      ${zahlen && !t.ausfall ? `<details class="anw-wer"><summary class="leise klein">${z.ja.length} dabei · ${z.nein.length} abgemeldet${z.offen.length ? ` · ${z.offen.length} offen` : ""}</summary>
        <p class="klein"><strong>Dabei:</strong> ${esc(z.ja.map((x) => x.name).join(", ") || "noch niemand")}</p>
        ${z.nein.length ? `<p class="klein"><strong>Abgemeldet:</strong> ${esc(z.nein.map((x) => x.name).join(", "))}</p>` : ""}</details>` : ""}
    </div>
    ${t.ausfall ? "" : lesen ? `<div class="anw-knoepfe">${st.status === "ja" ? `<span class="pill ok">${st.standard ? "dabei (nicht abgemeldet)" : "hat zugesagt"}</span>` : st.status === "nein" ? `<span class="pill neutral">abgemeldet</span>` : `<span class="pill offen">noch nicht gemeldet</span>`}</div>`
      : `<div class="anw-knoepfe">${knopf("ja", "Dabei")}${knopf("nein", "Kann nicht")}</div>`}
  </li>`;
}
function anwListe(spieler, termine, lesen = false) {
  return termine.length ? `<ul class="anw-liste">${termine.map((t) => anwZeile(t, spieler, { lesen })).join("")}</ul>` : `<p class="leer">In den nächsten Tagen stehen keine Termine an.</p>`;
}
const anwHinweis = () => trainingModus() === "abmelden"
  ? "Beim Training gilt: Wer sich nicht abmeldet, ist dabei. Bei Spielen bitte immer zu- oder absagen."
  : "Bitte bei Training und Spielen immer zu- oder absagen.";

function seiteSpielerStart() {
  const kind = meinKind();
  const infos = modul("infos") && aktiveHinweise().length ? `<section class="karte infos-start"><div class="karte-kopf"><h2 style="margin:0">Vom Trainerteam</h2></div>${hinweiseKarte(true)}</section>` : "";
  if (!kind) return `<p class="unterzeile">Willkommen</p><h1>Training und Spiele</h1>
    <section class="karte sohn-fehlt"><div><strong>Wer bist du?</strong><div class="leise klein">Einmal deinen Namen auswählen, dann kannst du dich an- und abmelden.</div></div>
    <button class="knopf klein" data-aktion="name-aendern">Auswählen</button></section>${infos}`;
  const termine = anwesenheitTermine();
  const offen = termine.filter((t) => !t.ausfall && anwStatus(t, kind).status === "offen").length;
  return `<p class="unterzeile">Hallo ${esc(kind)}</p><h1>Training und Spiele</h1>
    ${installKarte()}
    ${pushKarte()}
    ${infos}
    <section class="karte">
      <div class="karte-kopf"><h2 style="margin:0">Deine nächsten Termine</h2>${offen ? `<span class="pill offen">${offen} offen</span>` : `<span class="pill ok">✓ alles gemeldet</span>`}</div>
      <p class="leise klein">${anwHinweis()}</p>
      ${anwListe(kind, termine)}
    </section>
    ${kalenderAboKarte()}`;
}

function seiteAnwesenheit() {
  if (istTrainer()) return seiteAnwesenheitTrainer();
  const kind = meinKind();
  if (erwachsen()) return `${kopfzeile("Zu- und absagen", "Training und Spiele")}
    ${kind ? `<section class="karte"><p class="leise klein">${anwHinweis()}</p>${anwListe(kind, anwesenheitTermine())}</section>`
      : `<p class="hinweis">Bitte zuerst auswählen, wer du bist. <button class="link-knopf" data-aktion="name-aendern">Jetzt auswählen</button></p>`}`;
  return `${kopfzeile("An- und abmelden", "Training und Spiele")}
    ${kind ? `<section class="karte"><h2>${esc(kind)}</h2><p class="leise klein">Zu- und Absagen macht ${esc(kind)} selbst mit dem Spieler-Zugang. Hier siehst du, wie er sich gemeldet hat. ${anwHinweis()}</p>${anwListe(kind, anwesenheitTermine(), true)}</section>`
      : `<p class="hinweis">Bitte zuerst deinen Sohn auswählen. <button class="link-knopf" data-aktion="name-aendern">Jetzt auswählen</button></p>`}`;
}

function seiteAnwesenheitTrainer() {
  const termine = anwesenheitTermine();
  const tz = Z.einstellungen.trainingszeiten || [];
  const naechster = termine.find((t) => !t.ausfall);
  const karte = (t) => {
    const z = anwZahlen(t);
    const name = (x, status) => `<button class="anw-name ${status}" data-aktion="anw-trainer" data-termin="${t.key}" data-spieler="${esc(x.name)}" data-status="${status}" title="antippen zum Ändern">${esc(x.name)}${x.standard && status === "ja" ? "" : ""}</button>`;
    const bem = z.nein.concat(z.ja).filter((x) => x.eintrag?.bemerkung);
    return `<details class="karte anw-karte" ${naechster && t.key === naechster.key ? "open" : ""}>
      <summary><div class="summary-innen"><div class="spiel">${datumBlock(t.datum)}<div><div class="spiel-titel">${esc(t.titel)}</div><div class="leise klein">${esc(terminZeitText(t))}</div></div></div>
        <div class="summary-status">${t.ausfall ? `<span class="pill neutral">fällt aus</span>` : `<span class="pill ok">${z.ja.length} dabei</span> ${z.nein.length ? `<span class="pill neutral">${z.nein.length} ab</span>` : ""} ${z.offen.length ? `<span class="pill offen">${z.offen.length} offen</span>` : ""}`}</div></div></summary>
      <div class="abstand">
        ${t.ausfall ? `<p>${esc(t.ausfall.grund || "Das Training fällt aus.")}</p>
          ${t.ausfall.von === (t.ausfall.bis || t.ausfall.von) ? `<button class="knopf klein zweit" data-aktion="loeschen" data-col="trainingsausfall" data-id="${t.ausfall.id}" data-frage="Training findet doch statt?">Findet doch statt</button>` : `<p class="leise klein">Teil des Ausfalls vom ${kurzDatum(t.ausfall.von)} bis ${kurzDatum(t.ausfall.bis)}. Ändern unten bei „Ausfälle“.</p>`}`
        : `<p class="leise klein">Name antippen, um ihn umzustellen (zum Beispiel nach einer Nachricht in WhatsApp).</p>
          <div class="anw-gruppe"><strong>Dabei (${z.ja.length})</strong><div>${z.ja.map((x) => name(x, "ja")).join("") || `<span class="leise">niemand</span>`}</div></div>
          <div class="anw-gruppe"><strong>Abgemeldet (${z.nein.length})</strong><div>${z.nein.map((x) => name(x, "nein")).join("") || `<span class="leise">niemand</span>`}</div></div>
          ${z.offen.length ? `<div class="anw-gruppe"><strong>Noch keine Rückmeldung (${z.offen.length})</strong><div>${z.offen.map((x) => name(x, "offen")).join("")}</div></div>` : ""}
          ${bem.length ? `<ul class="klein anw-bem">${bem.map((x) => `<li><strong>${esc(x.name)}:</strong> ${esc(x.eintrag.bemerkung)}</li>`).join("")}</ul>` : ""}
          <div class="ausrichten abstand">
            <button class="knopf klein zweit" data-aktion="anw-whatsapp" data-termin="${t.key}">Für WhatsApp kopieren</button>
            ${t.art === "training" ? `<button class="link-knopf gefahr-text" data-aktion="ausfall-tag" data-datum="${t.datum}" data-slot="${t.slot}">Training fällt aus</button>` : ""}
          </div>`}
      </div></details>`;
  };
  const ausfaelle = [...(Z.trainingsausfall || [])].filter((a) => (a.bis || a.von) >= heute()).sort((a, b) => a.von.localeCompare(b.von));
  return `${kopfzeile("Für das Trainerteam", "Anwesenheit")}
    <p class="leise klein">${anwHinweis()} ${erwachsen() ? "Die Spieler melden sich selbst. Du kannst Meldungen korrigieren. " : "Die Jungs melden sich mit dem Spieler-Zugang selbst. Du kannst Meldungen korrigieren, Eltern sehen nur den Stand ihres Sohns. "}${Z.spielerZugang === false ? "<strong>Der Spieler-Zugang ist noch nicht eingerichtet (Passwort in Netlify fehlt).</strong>" : ""}</p>
    ${termine.length ? termine.map((t, i) => `<div class="${i ? "abstand" : ""}">${karte(t)}</div>`).join("") : `<section class="karte"><p class="leer">Keine Termine in den nächsten ${Z.einstellungen.anwesenheitTage || 14} Tagen. Trainingszeiten stehen in der Verwaltung.</p></section>`}
    <h2 class="bereich-titel">Ausfälle</h2>
    <section class="karte">
      ${ausfaelle.length ? `<ul class="liste">${ausfaelle.map((a) => `<li><span><strong>${a.bis && a.bis !== a.von ? `${kurzDatum(a.von)} bis ${kurzDatum(a.bis)}` : `${wochentagKurz(a.von)} ${kurzDatum(a.von)}`}</strong> · ${a.slot && a.slot !== "alle" ? esc(tz[Number(a.slot)]?.tag || "Training") : "alle Trainings"}${a.grund ? `<div class="leise klein">${esc(a.grund)}</div>` : ""}</span>
        <button class="link-knopf gefahr-text" data-aktion="loeschen" data-col="trainingsausfall" data-id="${a.id}" data-frage="Ausfall löschen? Das Training findet dann wieder statt.">löschen</button></li>`).join("")}</ul>` : `<p class="leise">Kein Training fällt aus.</p>`}
      <details class="abstand"><summary>Ausfall eintragen (z. B. Ferien)</summary>
        <form class="zeile abstand" data-form="ausfall">
          <div class="feld" style="flex-basis:150px"><label>von</label><input type="date" name="von" required value="${heute()}"></div>
          <div class="feld" style="flex-basis:150px"><label>bis</label><input type="date" name="bis"></div>
          <div class="feld" style="flex-basis:160px"><label>Welches Training</label><select name="slot"><option value="alle">alle</option>${tz.map((t, i) => `<option value="${i}">${esc(t.tag)}</option>`).join("")}</select></div>
          <div class="feld" style="flex-basis:220px"><label>Grund</label><input type="text" name="grund" maxlength="120" placeholder="z. B. Herbstferien, Halle belegt"></div>
          <button class="knopf">Eintragen</button>
        </form>
        <p class="leise klein">Alle mit eingeschalteten Benachrichtigungen bekommen sofort eine Nachricht.</p>
      </details>
    </section>`;
}

function anwWhatsapp(key) {
  const t = anwesenheitTermine(60, plusTage(heute(), -1)).find((x) => x.key === key);
  if (!t) return "";
  const z = anwZahlen(t);
  const d = datumLang(t.datum);
  const zeilen = [`🏐 ${t.titel}, ${d}${t.zeit ? " · " + t.zeit + " Uhr" : ""}`, ""];
  zeilen.push(`✅ Dabei (${z.ja.length}): ${z.ja.map((x) => x.name).join(", ") || "noch niemand"}`);
  if (z.nein.length) zeilen.push(`❌ Abgemeldet (${z.nein.length}): ${z.nein.map((x) => x.name).join(", ")}`);
  if (z.offen.length) zeilen.push(`❓ Noch keine Rückmeldung: ${z.offen.map((x) => x.name).join(", ")}`);
  zeilen.push("", `Bitte zu- oder absagen: ${location.origin}`);
  return zeilen.join("\n");
}

// ---------- Push-Benachrichtigungen ----------
const pushMoeglich = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const pushAn = () => lokal("otv_push") === "1";
function b64zuBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
async function pushAbo() {
  if (!pushMoeglich()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
async function pushMelden(sub) {
  await api("POST", "/api/push/abo", { subscription: sub.toJSON(), kind: meinKind(), name: meinName() });
}
async function pushEinschalten() {
  if (istIOS() && !istApp()) {
    meldung("Auf dem iPhone geht das nur, wenn die Seite als App auf dem Startbildschirm liegt.", true);
    await appInstallieren();
    return false;
  }
  if (!pushMoeglich()) throw new Error("Dieses Gerät oder dieser Browser kann leider keine Benachrichtigungen empfangen.");
  const erlaubt = await Notification.requestPermission();
  if (erlaubt !== "granted") throw new Error("Benachrichtigungen wurden nicht erlaubt. Das lässt sich in den Einstellungen des Handys bei dieser App ändern.");
  const { publicKey } = await api("GET", "/api/push/schluessel");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64zuBytes(publicKey) });
  await pushMelden(sub);
  lokal("otv_push", "1");
  return true;
}
async function pushAusschalten() {
  const sub = await pushAbo().catch(() => null);
  if (sub) { await api("DELETE", "/api/push/abo", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
  lokal("otv_push", "0");
}
// Beim Start Abo still auffrischen (z. B. nach Rollen- oder Namenswechsel)
async function pushAuffrischen() {
  if (!pushAn()) return;
  try { const sub = await pushAbo(); if (sub) await pushMelden(sub); else lokal("otv_push", "0"); } catch { /* egal */ }
}
function pushKarte() {
  if (!modul("push") || pushAn() || lokal("otv_push_weg") || (!pushMoeglich() && !istIOS())) return "";
  const aufgaben = [modul("standdienst") && "Standdienst, Kuchen", modul("dienste") && "Helferdienste", modul("fahrten") && "Fahrten", modul("zeitnehmer") && "Zeitnehmer"].filter(Boolean).join(", ");
  const text = nurSpielerSicht() ? "Du bekommst eine Nachricht, wenn du dich für ein Spiel noch melden musst oder ein Training ausfällt."
    : `${aufgaben ? `Am Vortag eine Erinnerung an ${aufgaben}. ` : ""}Dazu wichtige Infos vom Trainerteam${modul("dienste") ? " und ein Hinweis, wenn du bei einem Dienst an der Reihe wärst" : ""}.`;
  return `<section class="karte install-karte push-karte">
    <div><strong>🔔 Erinnerungen aufs Handy</strong><div class="leise klein">${text}</div></div>
    <div class="ausrichten"><button class="knopf klein" data-aktion="push-an">Einschalten</button>
      <button class="link-knopf" data-aktion="push-weg">später</button></div>
  </section>`;
}
async function pushDialog() {
  const box = document.createElement("div");
  box.className = "lightbox";
  const an = pushAn();
  box.innerHTML = `<div class="dialog-box">
    <h2>Benachrichtigungen</h2>
    <p>${an ? "Auf diesem Handy sind Erinnerungen <strong>eingeschaltet</strong>." : "Auf diesem Handy sind Erinnerungen <strong>aus</strong>."}</p>
    <ul class="punkte-liste klein">${nurSpielerSicht()
      ? "<li>Erinnerung, wenn du dich für ein Spiel noch nicht gemeldet hast</li><li>Training fällt aus</li><li>Infos vom Trainerteam</li>"
      : `<li>Am Vortag: deine Aufgaben fürs Spiel (${[modul("standdienst") && "Standdienst, Kuchen", modul("dienste") && "Helferdienste", modul("fahrten") && "Fahrten", modul("zeitnehmer") && "Zeitnehmer", modul("waesche") && "Wäsche"].filter(Boolean).join(", ") || "Spiel"})</li><li>Zwei Tage vorher: was beim Spiel noch fehlt</li>${modul("dienste") ? "<li>Wenn du bei einem offenen Dienst an der Reihe wärst</li>" : ""}${erwachsen() && modul("anwesenheit") ? "<li>Wenn du dich für ein Spiel noch nicht gemeldet hast</li>" : ""}<li>Infos vom Trainerteam, Training fällt aus</li>`}</ul>
    ${istIOS() && !istApp() ? `<p class="hinweis klein">Auf dem iPhone bitte zuerst die Seite als App auf den Startbildschirm legen und von dort öffnen (ab iOS 16.4).</p>` : ""}
    <div class="ausrichten abstand" style="margin-top:14px">
      ${an ? `<button class="knopf" data-p="test">Test senden</button><button class="knopf zweit" data-p="aus">Ausschalten</button>` : `<button class="knopf" data-p="an">Einschalten</button>`}
      <button class="link-knopf" data-p="zu">Schließen</button></div></div>`;
  box.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-p]");
    if (e.target === box || b?.dataset.p === "zu") return box.remove();
    if (!b) return;
    try {
      b.disabled = true;
      if (b.dataset.p === "an") { if (await pushEinschalten()) meldung("Erinnerungen sind eingeschaltet"); }
      if (b.dataset.p === "aus") { await pushAusschalten(); meldung("Erinnerungen sind aus"); }
      if (b.dataset.p === "test") {
        const sub = await pushAbo();
        if (!sub) throw new Error("Auf diesem Gerät ist kein Abo mehr aktiv. Bitte aus- und wieder einschalten.");
        const r = await api("POST", "/api/push/test", { endpoint: sub.endpoint });
        meldung(r.gesendet ? "Test gesendet, kommt gleich an" : "Senden hat nicht geklappt. Bitte aus- und wieder einschalten.", !r.gesendet);
      }
      box.remove(); zeigen();
    } catch (err) { b.disabled = false; meldung(err.message, true); }
  });
  document.body.appendChild(box);
}

// ---------- Fahrten: Hin- und Rückfahrt, Umsteigen, Fahrt gesucht ----------
const RICHTUNG = { hin: "nur Hinfahrt", rueck: "nur Rückfahrt" };
const richtungText = (f) => RICHTUNG[f.richtung] || "";
const strecken = (r) => (r === "hin" ? ["hin"] : r === "rueck" ? ["rueck"] : ["hin", "rueck"]);
// Sitzt name bei diesem Spiel schon für eine der Strecken von fahrt in einem anderen Auto?
function fahrtKonflikt(name, fahrt, ausser = null) {
  const ziel = strecken(fahrt.richtung);
  return Z.mitfahrer.some((m) => m.name === name && m.id !== ausser && (() => { const f = Z.fahrten.find((x) => x.id === m.fahrtId && x.spielId === fahrt.spielId); return f && strecken(f.richtung).some((r) => ziel.includes(r)); })());
}
function bedarfVon(s) { return (Z.fahrtbedarf || []).filter((b) => b.spielId === s.id); }
const bedarfText = (b) => `${b.spieler}${b.richtung === "hin" ? " (Hinfahrt)" : b.richtung === "rueck" ? " (Rückfahrt)" : ""}`;
function umsteigenDialog(m) {
  const alt = Z.fahrten.find((f) => f.id === m.fahrtId);
  const ziele = Z.fahrten.filter((f) => f.spielId === alt.spielId && f.id !== alt.id && Z.mitfahrer.filter((x) => x.fahrtId === f.id).length < f.plaetze && !fahrtKonflikt(m.name, f, m.id));
  if (!ziele.length) return meldung("Es gibt gerade kein anderes Auto mit freiem Platz für diese Strecke.", true);
  return new Promise((fertig) => {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.innerHTML = `<div class="dialog-box"><h2>${esc(m.name)} umsteigen</h2><p class="leise">In welches Auto soll ${esc(m.name)} wechseln?</p>
      <div class="hero-knoepfe">${ziele.map((f) => `<button class="knopf zweit gross" data-ziel="${f.id}">${esc(anzeigeName(f.fahrer))}<small>${f.plaetze - Z.mitfahrer.filter((x) => x.fahrtId === f.id).length} frei${richtungText(f) ? " · " + richtungText(f) : ""}${f.treffpunkt ? " · " + esc(abfahrtText(f.treffpunkt)) : ""}</small></button>`).join("")}</div>
      <button class="link-knopf abstand" data-ziel="">abbrechen</button></div>`;
    box.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-ziel]");
      if (e.target !== box && !b) return;
      box.remove();
      if (!b || !b.dataset.ziel) return fertig();
      try {
        await api("PUT", "/api/c/mitfahrer/" + m.id, { fahrtId: b.dataset.ziel });
        offeneSpiele?.add(alt.spielId);
        await neuLaden(`${m.name} fährt jetzt bei ${anzeigeName(Z.fahrten.find((f) => f.id === b.dataset.ziel)?.fahrer || "")} mit`);
      } catch (err) { meldung(err.message, true); }
      fertig();
    });
    document.body.appendChild(box);
  });
}

// ---------- Helferdienste (z. B. Hallenaufbau) ----------
const dienstArten = () => (modul("dienste") ? Z.einstellungen.dienstArten || [] : []);
const dienstVon = (s, art) => (Z.dienste || []).filter((d) => d.spielId === s.id && d.dienst === art.name);
// Uhrzeit des Dienstes: Minuten vor Anwurf, -1 = nach dem Spiel
function dienstZeitText(s, art, kurz = false) {
  if (art.vorlauf < 0) return kurz ? " nach dem Spiel" : "nach dem Spiel";
  if (!s.zeit || !art.vorlauf) return "";
  const [h, m] = s.zeit.split(":").map(Number);
  const t = (h * 60 + m - art.vorlauf + 1440) % 1440;
  const uhr = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  return kurz ? `, ab ${uhr} Uhr` : `ab ${uhr} Uhr`;
}
// Wer zählt als "ich" bei den Diensten? Erwachsene: man selbst, Jugend: die Familie (Vorname des Sohns)
const dienstPerson = () => meinKind() || (erwachsen() ? meinVorname() : "");
function dienstZaehlerC() {
  const z = new Map();
  for (const d of Z.dienste || []) {
    const sp = Z.spiele.find((s) => s.id === d.spielId);
    if (!sp || !d.person) continue;
    const e = z.get(d.person) || { geleistet: 0, geplant: 0, zuletzt: "" };
    if (sp.datum < heute()) { e.geleistet++; if (sp.datum > e.zuletzt) e.zuletzt = sp.datum; } else e.geplant++;
    z.set(d.person, e);
  }
  return z;
}
// Gleiche Regel wie in netlify/shared/dienste.js: offene Plätze an die, die bisher am seltensten dran waren
function dienstVorschlaegeC(s) {
  const tage = Z.einstellungen.dienstVorschlagTage ?? 3;
  if ((datum(s.datum) - datum(heute())) / 864e5 > tage || s.datum < heute()) return {};
  const zaehler = dienstZaehlerC();
  const imSpiel = new Set((Z.dienste || []).filter((d) => d.spielId === s.id).map((d) => d.person).filter(Boolean));
  const ab = new Set(modul("anwesenheit") ? (Z.anwesenheit || []).filter((a) => a.termin === `sp-${s.id}` && a.status === "nein").map((a) => a.spieler) : []);
  const leer = { geleistet: 0, geplant: 0, zuletzt: "" };
  const kand = kader().map((k) => k.vorname).filter((n) => !imSpiel.has(n) && !ab.has(n)).sort((a, b) => {
    const za = zaehler.get(a) || leer, zb = zaehler.get(b) || leer;
    return (za.geleistet + za.geplant) - (zb.geleistet + zb.geplant) || za.zuletzt.localeCompare(zb.zuletzt) || a.localeCompare(b, "de");
  });
  const v = {};
  for (const art of dienstArten()) {
    const offen = art.personen - dienstVon(s, art).length;
    v[art.name] = offen > 0 ? kand.splice(0, offen) : [];
  }
  return v;
}
function dienstAufgaben(s) {
  if (!s.heim || !dienstArten().length) return [];
  const vorschlag = dienstVorschlaegeC(s);
  const ich = dienstPerson();
  const bald = (datum(s.datum) - datum(heute())) / 864e5 <= 3;
  return dienstArten().map((art) => {
    const wer = dienstVon(s, art);
    const frei = art.personen - wer.length;
    const meins = wer.find((d) => d.eigen || (ich && d.person === ich));
    const v = vorschlag[art.name] || [];
    const namen = wer.map((d) => `${esc(erwachsen() ? d.person || anzeigeName(d.name) : anzeigeName(d.name))}${istTrainer() || d.eigen ? ` <button class="x-klein" title="austragen" data-aktion="loeschen" data-col="dienste" data-id="${d.id}" data-frage="${esc(d.person || d.name)} bei ${esc(art.name)} austragen?">×</button>` : ""}`).join(", ");
    const zuweisen = istTrainer() && frei > 0 && s.datum >= heute() ? ` <select class="zuweisen" data-aktion="dienst-zuweisen" data-spiel="${s.id}" data-dienst="${esc(art.name)}" aria-label="Spieler eintragen"><option value="">eintragen …</option>${kader().map((k) => k.vorname).filter((n) => !wer.some((d) => d.person === n)).map((n) => `<option>${esc(n)}</option>`).join("")}</select>` : "";
    return {
      status: frei > 0 ? (bald ? "dringend" : "offen") : "ok", titel: art.name, kurz: art.name.split(" ")[0],
      stand: `${wer.length} von ${art.personen}`,
      detail: [dienstZeitText(s, art), namen].filter(Boolean).join(" · ")
        + (frei > 0 && v.length ? `<div class="vorschlag">Vorschlag: ${esc(v.join(", "))} <span class="leise">(bisher am seltensten dran)</span></div>` : "") + zuweisen,
      knopf: meins ? "" : frei > 0 && s.datum >= heute() ? `<button class="knopf klein ${v.includes(ich) ? "" : "zweit"}" data-aktion="dienst-ich" data-spiel="${s.id}" data-dienst="${esc(art.name)}">Ich übernehme</button>` : "",
    };
  });
}
function dienstFairnessKarte() {
  if (!dienstArten().length) return "";
  const z = dienstZaehlerC();
  const leer = { geleistet: 0, geplant: 0, zuletzt: "" };
  const zeilen = kader().map((k) => ({ n: k.vorname, ...(z.get(k.vorname) || leer) })).sort((a, b) => (a.geleistet - b.geleistet) || a.n.localeCompare(b.n, "de"));
  const max = Math.max(1, ...zeilen.map((x) => x.geleistet));
  const ich = dienstPerson();
  return `<details class="karte formular-klappe fairness"><summary>Helferdienste: wer war wie oft dran?</summary><div class="abstand">
    <p class="leise klein">Gezählt werden die Dienste bei vergangenen Heimspielen dieser Saison. Wer selten dran war, steht oben und wird bei offenen Diensten ${Z.einstellungen.dienstVorschlagTage ?? 3} Tage vorher vorgeschlagen.</p>
    <ul class="fairness-liste">${zeilen.map((x) => `<li class="${x.n === ich ? "ich" : ""}"><span class="fn">${esc(x.n)}${x.n === ich ? ` <span class="leise">(${erwachsen() ? "du" : "ihr"})</span>` : ""}</span>
      <span class="balken"><span style="width:${Math.round((x.geleistet / max) * 100)}%"></span></span><span class="zahl">${x.geleistet}×${x.geplant ? ` <span class="leise">+${x.geplant}</span>` : ""}</span></li>`).join("")}</ul>
    <p class="leise klein">+ = schon für kommende Spiele eingetragen.</p></div></details>`;
}
// Erwachsene: kompakte Zu- und Absage auf der Startseite
function anwesenheitStartKarte() {
  if (!erwachsen() || !modul("anwesenheit") || !meinKind()) return "";
  const termine = anwesenheitTermine(7).slice(0, 3);
  if (!termine.length) return "";
  return `<section class="karte anw-start"><div class="karte-kopf"><h2 style="margin:0">Training und Spiele</h2><a class="klein" href="#/anwesenheit">alle ›</a></div>
    <ul class="anw-liste">${termine.map((t) => anwZeile(t, meinKind(), { zahlen: false })).join("")}</ul></section>`;
}

// ---------- Router ----------
function zeigen() {
  const pfad = location.hash.replace(/^#\/?/, "").split("?")[0];
  const seite = nurSpielerSicht() ? (SPIELER_SEITEN[pfad] || seiteSpielerStart) : (SEITEN[pfad] || seiteStart);
  inhalt.innerHTML = seite();
  const abr = inhalt.querySelector('form[data-form="abrechnung"]');
  if (abr) abrechnungRechnen(abr);
  const nav = { catering: "spiele", fahrten: "spiele", termine: "infos" }[pfad] ?? pfad;
  document.querySelectorAll(".nav a, .unten-nav a").forEach((a) => a.classList.toggle("aktiv", a.getAttribute("href") === "#/" + nav));
  $("#unten-mehr").classList.toggle("aktiv", !["", "spiele", "infos", "kasse", ...(nurSpielerSicht() ? ["mannschaft"] : [])].includes(nav));
  navAnpassen();
  kopfAktualisieren();
  if (pfad === "spiele" && Z.einstellungen.widgetToken) widgetsLaden();
}

let widgetScript = false;
function widgetsLaden() {
  const token = Z.einstellungen.widgetToken;
  if (!widgetScript) {
    // Offizieller Einbettungscode von handball.net
    (function (e, t, n, r, i, s, o) {
      e[i] = e[i] || function () { (e[i].q = e[i].q || []).push(arguments); };
      e[i].l = 1 * new Date(); s = t.createElement(n); o = t.getElementsByTagName(n)[0]; s.async = 1; s.src = r; o.parentNode.insertBefore(s, o);
    })(window, document, "script", "https://www.handball.madebytickaroo.com/widgets/embed/v1.js", "_hb");
    widgetScript = true;
  }
  window._hb({ widget: "spielplan", token, container: "handball-spielplan" });
  window._hb({ widget: "tabelle", token, container: "handball-tabelle" });
}

// ---------- Aktionen ----------
const formWerte = (form) => Object.fromEntries(new FormData(form).entries());
const inCent = (s) => Math.round(Number(String(s).replace(/\./g, "").replace(",", ".")) * 100);
const zeilen = (s) => String(s).split("\n").map((z) => z.trim()).filter(Boolean);

async function neuLaden(text) {
  zuletztGeladen = Date.now();
  await laden();
  zeigen();
  if (text) meldung(text);
}

inhalt.addEventListener("submit", async (ev) => {
  const form = ev.target.closest("form[data-form]");
  if (!form) return;
  ev.preventDefault();
  const art = form.dataset.form;
  const w = formWerte(form);
  const knopf = form.querySelector("button:not([type=button]):not([type=reset])");
  if (knopf) knopf.disabled = true;
  try {
    if (w.name && ["standdienst", "catering", "galerie"].includes(art)) lokal("otv_name", w.name);
    switch (art) {
      case "spiel": {
        const daten = { ...w, heim: w.heim === "true" };
        delete daten.id;
        if (w.id) await api("PUT", "/api/c/spiele/" + w.id, daten);
        else await api("POST", "/api/c/spiele", daten);
        await neuLaden(w.id ? "Spiel geändert, alle Einträge bleiben erhalten" : "Spiel hinzugefügt"); break;
      }
      case "standdienst":
        await api("POST", "/api/c/standdienst", { ...w, spielId: form.dataset.spiel });
        await neuLaden("Danke, du bist eingetragen"); break;
      case "catering": {
        const name = await nameSicherstellen();
        offeneSpiele?.add(form.dataset.spiel);
        await api("POST", "/api/c/catering", { ...w, name, spielId: form.dataset.spiel });
        await neuLaden("Danke für die Zusage"); break;
      }
      case "hinweis":
        await api("POST", "/api/c/hinweise", { text: w.text, bis: w.bis, von: meinVorname() || (Z.rolle === "trainer" ? "Trainerteam" : ""), push: w.push === "on" });
        await neuLaden(w.push === "on" ? "Info veröffentlicht und als Push verschickt" : "Info veröffentlicht"); break;
      case "ausfall":
        if (w.bis && w.bis < w.von) throw new Error("„bis“ liegt vor „von“");
        await api("POST", "/api/c/trainingsausfall", { von: w.von, bis: w.bis || w.von, slot: w.slot, grund: w.grund });
        await neuLaden("Ausfall eingetragen"); break;
      case "fahrtbedarf":
        if (!w.spieler) throw new Error("Bitte einen Spieler auswählen");
        await api("POST", "/api/c/fahrtbedarf", { spielId: form.dataset.spiel, spieler: w.spieler, richtung: w.richtung, von: meinName() });
        offeneSpiele?.add(form.dataset.spiel);
        await neuLaden("Eingetragen: Fahrt gesucht"); break;
      case "name-zuordnen": {
        const zuordnung = { ...(Z.einstellungen.namenZuordnung || {}), [w.name.trim().toLowerCase()]: w.sohn };
        await api("PUT", "/api/einstellungen", { namenZuordnung: zuordnung });
        await neuLaden(w.sohn === "-" ? `${w.name} wird nicht mitgezählt` : `${w.name} gehört zu ${w.sohn}`); break;
      }
      case "hinweis-edit":
        await api("PUT", "/api/c/hinweise/" + form.dataset.id, { text: w.text, bis: w.bis || "" });
        await neuLaden("Info geändert"); break;
      case "abfrage-edit":
        await api("PUT", "/api/c/abfragen/" + form.dataset.id, { titel: w.titel, text: w.text, optionen: w.optionen, frist: w.frist || "" });
        await neuLaden("Abfrage geändert"); break;
      case "abfrage-neu":
        await api("POST", "/api/c/abfragen", { titel: w.titel, text: w.text, optionen: w.optionen, frist: w.frist, von: meinVorname() });
        await neuLaden("Abfrage gestartet"); break;
      case "abfrage": {
        if (!meinKind()) throw new Error("Bitte zuerst deinen Sohn auswählen");
        const opt = abfrageOptionen(Z.abfragen.find((a) => a.id === form.dataset.id) || {});
        const werte = [...form.querySelectorAll("input[name=o]:checked")].map((x) => x.value);
        if (!opt.length && !werte.length) throw new Error("Bitte Ja oder Nein wählen");
        await api("PUT", `/api/c/abfrageAntworten/${form.dataset.id}-${slug(meinKind())}`, { abfrageId: form.dataset.id, spieler: meinKind(), gewaehlt: opt.length ? (werte.join(",") || "keiner") : werte[0], bemerkung: w.bemerkung || "", von: meinName() });
        await neuLaden("Danke, Antwort gespeichert"); break;
      }
      case "antwort": {
        if (!meinKind()) throw new Error(erwachsen() ? "Bitte zuerst auswählen, wer du bist" : "Bitte zuerst deinen Sohn auswählen");
        const id = `${form.dataset.termin}-${slug(meinKind())}`;
        await api("PUT", "/api/c/antworten/" + id, { terminId: form.dataset.termin, familie: meinKind(), kommt: true, personen: Number(w.personen) || 0, von: meinName() });
        await neuLaden("Danke für deine Rückmeldung"); break;
      }
      case "termin": {
        const kosten = w.kosten.trim() ? inCent(w.kosten) : 0;
        if (!Number.isFinite(kosten) || kosten < 0) throw new Error("Kosten bitte im Format 5,00 eingeben");
        const anzahlung = w.anzahlung.trim() ? inCent(w.anzahlung) : 0;
        if (!Number.isFinite(anzahlung) || anzahlung < 0) throw new Error("Anzahlung bitte im Format 50,00 eingeben");
        if (w.bis && w.bis < w.datum) throw new Error("„bis“ liegt vor dem Beginn");
        const daten = { titel: w.titel, datum: w.datum, bis: w.bis || "", zeit: w.zeit, ort: w.ort, beschreibung: w.beschreibung, frage: w.frage, kostenProPerson: kosten, kostenFuer: w.kostenFuer,
          anzahlung, anzahlungBis: w.anzahlungBis || "", frist: w.frist || "" };
        if (form.dataset.id) await api("PUT", "/api/c/termine/" + form.dataset.id, daten);
        else await api("POST", "/api/c/termine", daten);
        await neuLaden("Termin gespeichert"); break;
      }
      case "fahrt": {
        const name = await nameSicherstellen();
        offeneSpiele?.add(form.dataset.spiel);
        await api("POST", "/api/c/fahrten", { ...w, fahrer: name, plaetze: Number(w.plaetze), spielId: form.dataset.spiel });
        await neuLaden("Danke, deine Fahrt ist eingetragen"); break;
      }
      case "mitfahrer": {
        let kind = w.name;
        if (kind === "__andere") kind = (prompt("Wer fährt mit? (nur Vorname)") || "").trim();
        if (!kind) throw new Error("Bitte einen Spieler auswählen");
        await api("POST", "/api/c/mitfahrer", { fahrtId: form.dataset.fahrt, name: kind, eingetragenVon: meinName() });
        await neuLaden(`${kind} fährt mit`); break;
      }
      case "abrechnung": {
        const spiel = Z.spiele.find((x) => x.id === w.spielId);
        if (spielBilanz(spiel.id).anzahl && !confirm("Für dieses Spiel gibt es schon Buchungen. Trotzdem zusätzlich buchen?")) break;
        const zweck = `Heimspiel-Catering gegen ${spiel.gegner}`;
        const buchungen = [];
        for (const k of Z.einstellungen.kassenKanaele) {
          const c = inCent(w["ein:" + k] || "");
          if (c > 0) buchungen.push({ art: "einnahme", betrag: c, zweck, kategorie: "Heimspiel-Catering", kanal: k });
        }
        const gz = {};
        for (const g of getraenkeListe()) { const n = parseInt(w["g:" + g.name] || "0", 10); if (n > 0) gz[g.name] = n; }
        const gr = getraenkeRechnung(gz);
        if (gr.otv > 0) buchungen.push({ art: "ausgabe", betrag: gr.otv, offen: true, kanal: "",
          getraenke: Object.entries(gz).map(([k, v]) => `${k}=${v}`).join(";"),
          zweck: `Anteil Getränke an den OTV (${Z.einstellungen.otvAnteilProzent ?? 50} % von ${euro(gr.umsatz)}), Heimspiel gegen ${spiel.gegner}`, kategorie: "Getränke OTV" });
        const eink = inCent(w.einkauf || "");
        if (eink > 0) buchungen.push({ art: "ausgabe", betrag: eink, zweck: `Einkauf Catering, Heimspiel gegen ${spiel.gegner}`, kategorie: "Einkauf Catering", kanal: w.einkaufKanal });
        if ([...Object.entries(w)].some(([k, v]) => /^(ein:|einkauf$)/.test(k) && v.trim() && !(inCent(v) > 0))) throw new Error("Bitte Beträge im Format 12,50 eingeben");
        if (!buchungen.length) throw new Error("Bitte mindestens einen Betrag eintragen");
        for (const b of buchungen) await api("POST", "/api/c/kasse", { ...b, datum: spiel.datum, spielId: spiel.id, beleg: b.offen ? "" : (w.beleg || "") });
        await neuLaden(`${buchungen.length} Buchung${buchungen.length === 1 ? "" : "en"} gespeichert`);
        teilen(abrechnungsText(spiel.id));
        break;
      }
      case "otv-bezahlt": {
        const offen = Z.kasse.filter((b) => b.offen);
        for (const b of offen) await api("PUT", "/api/c/kasse/" + b.id, { offen: false, kanal: w.kanal, beleg: `an OTV bezahlt am ${datumKurz(w.datum)}` });
        await neuLaden(`${offen.length} Posten als bezahlt markiert`); break;
      }
      case "kader":
        await api("POST", "/api/c/kader", w);
        await neuLaden("Spieler hinzugefügt"); break;
      case "trainer":
        await api("PUT", "/api/c/trainer/" + form.dataset.id, w);
        await neuLaden("Gespeichert"); break;
      case "trainer-neu":
        await api("POST", "/api/c/trainer", { ...w, reihenfolge: Z.trainer.length + 1 });
        await neuLaden("Trainer hinzugefügt"); break;
      case "kasse": {
        const betrag = inCent(w.betrag);
        if (!(betrag > 0)) throw new Error("Bitte einen gültigen Betrag eingeben, z. B. 12,50");
        const daten = { ...w, betrag };
        delete daten.id;
        if (w.id) await api("PUT", "/api/c/kasse/" + w.id, daten);
        else await api("POST", "/api/c/kasse", daten);
        await neuLaden(w.id ? "Buchung geändert" : "Buchung gespeichert"); break;
      }
      case "einstellungen": {
        const daten = {
          anfangsbestand: inCent(w.anfangsbestand),
          anfangsdatum: w.anfangsdatum,
          standdienstPlaetze: w.standdienstPlaetze,
          reservePlaetze: w.reservePlaetze,
          galerieAktiv: w.galerieAktiv === "on",
          vorratArtikel: zeilen(w.vorratArtikel).map((z) => { const [name, hinweis] = z.split("|").map((x) => (x || "").trim()); return { name, hinweis: hinweis || "" }; }),
          waescheArtikel: zeilen(w.waescheArtikel),
          zeitnehmerBei: w.zeitnehmerBei,
          zeitnehmerPlaetze: w.zeitnehmerPlaetze,
          standdienstVorlauf: w.standdienstVorlauf,
          standdienstInfo: w.standdienstInfo,
          liga: w.liga,
          teamText: w.teamText,
          getraenke: zeilen(w.getraenke).map((z) => { const [name, preis] = z.split("|").map((x) => (x || "").trim()); return { name, preis: inCent(preis || "0") }; }).filter((g) => g.name && g.preis >= 0),
          otvAnteilProzent: w.otvAnteilProzent,
          hallen: zeilen(w.hallen).map((z) => { const [name, ...rest] = z.split("|").map((x) => (x || "").trim()); return { name, adresse: rest.join(", ") }; }).filter((h) => h.name),
          trainingszeiten: zeilen(w.trainingszeiten).map((z) => { const [tag, zeit, halle] = z.split("|").map((x) => (x || "").trim()); return { tag, zeit, halle }; }),
          cateringArtikel: zeilen(w.cateringArtikel).map((z) => { const [name, bedarf, hinweis, modus] = z.split("|").map((x) => (x || "").trim()); return { name, bedarf: Math.max(1, parseInt(bedarf, 10) || 1), hinweis: hinweis || "", immer: !/bedarf/i.test(modus || "") }; }),
          kassenKategorien: zeilen(w.kassenKategorien),
          kassenKanaele: zeilen(w.kassenKanaele),
          widgetToken: w.widgetToken.trim(),
          anwesenheitTraining: w.anwesenheitTraining,
          mannschaftstyp: w.mannschaftstyp,
          mannschaftName: w.mannschaftName,
          vereinName: w.vereinName,
          module: Object.fromEntries(MODULE.map(([k]) => [k, w["mod:" + k] === "on"])),
          dienstArten: zeilen(w.dienstArten).map((z) => { const [name, personen, wann] = z.split("|").map((x) => (x || "").trim()); return { name, personen: parseInt(personen, 10) || 1, vorlauf: /danach|nach/i.test(wann || "") ? -1 : parseInt(wann, 10) || 0 }; }).filter((d) => d.name),
          dienstVorschlagTage: w.dienstVorschlagTage,
          anwesenheitTage: w.anwesenheitTage,
          pushOffeneAufgaben: w.pushOffeneAufgaben === "on",
          handballNetUrl: w.handballNetUrl.trim(),
        };
        if (!Number.isFinite(daten.anfangsbestand)) throw new Error("Anfangsbestand ungültig");
        await api("PUT", "/api/einstellungen", daten);
        await neuLaden("Einstellungen gespeichert"); break;
      }
      case "galerie":
        await fotosHochladen(form, w); break;
    }
  } catch (e) {
    meldung(e.message, true);
  } finally {
    if (knopf) knopf.disabled = false;
  }
});

inhalt.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-aktion]");
  if (!el || el.tagName === "SELECT" || el.type === "checkbox") return;
  const a = el.dataset.aktion;
  try {
    if (a === "anw" || a === "anw-trainer") {
      let status = el.dataset.status;
      const spieler = el.dataset.spieler;
      const termin = el.dataset.termin;
      if (a === "anw-trainer") status = status === "ja" ? "nein" : "ja";
      let bemerkung = "";
      if (a === "anw" && status === "nein") {
        const alt = (Z.anwesenheit || []).find((x) => x.termin === termin && x.spieler === spieler);
        const b = prompt("Kurzer Hinweis fürs Trainerteam? (optional, z. B. Klassenfahrt)", alt?.bemerkung || "");
        if (b === null) return;
        bemerkung = b.trim().slice(0, 80);
      }
      el.disabled = true;
      const von = Z.rolle === "spieler" || erwachsen() && spieler === meinKind() ? spieler : a === "anw-trainer" ? (meinVorname() ? `${meinVorname()} (Trainer)` : "Trainer") : meinName();
      await api("PUT", `/api/c/anwesenheit/${termin}-${slug(spieler)}`, { termin, spieler, status, bemerkung, von });
      await neuLaden(status === "ja" ? `${spieler}: dabei` : `${spieler}: abgemeldet`);
    } else if (a === "dienst-ich") {
      const person = dienstPerson();
      if (!person) { await willkommen({ nurName: true }); if (!dienstPerson()) throw new Error(erwachsen() ? "Bitte zuerst auswählen, wer du bist" : "Bitte zuerst deinen Sohn auswählen, damit der Dienst eurer Familie zählt"); }
      const name = erwachsen() ? dienstPerson() : await nameSicherstellen();
      el.disabled = true;
      offeneSpiele?.add(el.dataset.spiel);
      await api("POST", "/api/c/dienste", { spielId: el.dataset.spiel, dienst: el.dataset.dienst, name, person: dienstPerson(), eingetragenVon: meinName() });
      await neuLaden(`Danke! Du bist für ${el.dataset.dienst} eingetragen`);
    } else if (a === "ausfall-tag") {
      const grund = prompt("Training fällt aus. Grund (optional):", "");
      if (grund === null) return;
      await api("POST", "/api/c/trainingsausfall", { von: el.dataset.datum, bis: el.dataset.datum, slot: el.dataset.slot, grund: grund.trim() });
      await neuLaden("Ausfall eingetragen");
    } else if (a === "anw-whatsapp") {
      teilen(anwWhatsapp(el.dataset.termin));
    } else if (a === "push-an") {
      el.disabled = true;
      if (await pushEinschalten()) { meldung("Erinnerungen sind eingeschaltet 👍"); zeigen(); } else el.disabled = false;
    } else if (a === "push-weg") {
      lokal("otv_push_weg", "1"); zeigen();
    } else if (a === "umsteigen") {
      const m = Z.mitfahrer.find((x) => x.id === el.dataset.id);
      if (m) await umsteigenDialog(m);
    } else if (a === "mitnehmen") {
      const b = (Z.fahrtbedarf || []).find((x) => x.id === el.dataset.id);
      el.disabled = true;
      offeneSpiele?.add(b.spielId);
      await api("POST", "/api/c/mitfahrer", { fahrtId: el.dataset.fahrt, name: b.spieler, eingetragenVon: meinName() });
      await neuLaden(`Danke! ${b.spieler} fährt bei dir mit`);
    } else if (a === "loeschen") {
      if (el.dataset.frage && !confirm(el.dataset.frage)) return;
      const r = await api("DELETE", `/api/c/${el.dataset.col}/${el.dataset.id}`);
      await neuLaden(r && r.nachgerueckt ? `Ausgetragen. ${anzeigeName(r.nachgerueckt)} rückt von der Reserve nach.` : "Entfernt");
    } else if (a === "standdienst-ich") {
      const name = await nameSicherstellen();
      offeneSpiele?.add(el.dataset.spiel);
      el.disabled = true;
      await api("POST", "/api/c/standdienst", { spielId: el.dataset.spiel, name, reserve: el.dataset.reserve === "1" });
      await neuLaden(el.dataset.reserve ? "Danke, du bist als Reserve eingetragen" : "Danke, du bist eingetragen");
    } else if (a === "springen-catering") {
      ev.preventDefault();
      if (offeneSpiele === null) offeneSpiele = new Set();
      offeneSpiele.add(el.dataset.id);
      location.hash = "#/catering";
      setTimeout(() => document.getElementById("spiel-" + el.dataset.id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } else if (a === "menge-aendern") {
      const sp = Z.spiele.find((x) => x.id === el.dataset.spiel);
      const art = Z.einstellungen.cateringArtikel.find((x) => x.name === el.dataset.artikel);
      const m = mengenAnders(sp);
      const neu = Math.max(1, mengeFuer(sp, art) + Number(el.dataset.delta));
      if (neu === art.bedarf) delete m[art.name]; else m[art.name] = neu;
      offeneSpiele?.add(sp.id);
      await api("PUT", "/api/c/spiele/" + sp.id, { mengen: Object.entries(m).map(([k, v]) => `${k}=${v}`).join(",") });
      await neuLaden(`${art.name}: diesmal ${neu}×`);
    } else if (a === "artikel-umschalten") {
      const sp = Z.spiele.find((x) => x.id === el.dataset.spiel);
      const liste = anders(sp);
      const neu = liste.includes(el.dataset.artikel) ? liste.filter((x) => x !== el.dataset.artikel) : [...liste, el.dataset.artikel];
      offeneSpiele?.add(sp.id);
      await api("PUT", "/api/c/spiele/" + sp.id, { artikelAnders: neu.join(",") });
      await neuLaden(`${el.dataset.artikel}: ${gebraucht({ artikelAnders: neu.join(",") }, Z.einstellungen.cateringArtikel.find((x) => x.name === el.dataset.artikel)) ? "wird diesmal gebraucht" : "diesmal nicht nötig"}`);
    } else if (a === "spiel-bearbeiten") {
      const sp = Z.spiele.find((x) => x.id === el.dataset.id);
      const f = inhalt.querySelector('form[data-form="spiel"]');
      for (const k of ["id", "datum", "zeit", "gegner", "halle", "hinweis"]) f.elements[k].value = sp[k] || "";
      f.elements.heim.value = sp.heim ? "true" : "false";
      $("#spiel-titel").textContent = `Spiel ändern: ${sp.gegner}`;
      $("#spiel-formular").open = true;
      f.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (a === "spiel-abbrechen") {
      setTimeout(() => { $("#spiel-titel").textContent = "Spiel hinzufügen"; inhalt.querySelector('form[data-form="spiel"]').elements.id.value = ""; });
    } else if (a === "zeitnehmer-ich") {
      const name = await nameSicherstellen();
      el.disabled = true;
      await api("POST", "/api/c/zeitnehmer", { spielId: el.dataset.spiel, name });
      await neuLaden("Danke, du bist Zeitnehmer");
    } else if (a === "whatsapp-zeitnehmer") {
      const fehlend = kommende(spieleSortiert()).filter(zeitnehmerFehlt);
      teilen(["⏱ Zeitnehmer gesucht!", Z.einstellungen.zeitnehmerHinweis || "", "",
        ...fehlend.map((s) => `• ${wtDatum(s)}${s.zeit ? " " + s.zeit + " Uhr" : ""} ${s.heim ? "gegen" : "bei"} ${s.gegner}`),
        "", `Eintragen: ${location.origin}/#/spiele`].filter((x, i, arr) => !(x === "" && arr[i - 1] === "")).join("\n"));
    } else if (a === "vorrat-setzen") {
      const name = await nameSicherstellen();
      await api("PUT", "/api/c/vorrat/" + slug(el.dataset.artikel), { artikel: el.dataset.artikel, status: el.dataset.status, von: name, datum: heute() });
      await neuLaden(el.dataset.status === "ok" ? `${el.dataset.artikel}: reicht` : `${el.dataset.artikel} kommt auf die Mitbringliste`);
    } else if (a === "waesche-ich") {
      const name = await nameSicherstellen();
      el.disabled = true;
      offeneSpiele?.add(el.dataset.spiel);
      await api("POST", "/api/c/waschdienst", { spielId: el.dataset.spiel, name });
      await neuLaden("Danke fürs Waschen");
    } else if (a === "antwort-absage") {
      if (!meinKind()) throw new Error(erwachsen() ? "Bitte zuerst auswählen, wer du bist" : "Bitte zuerst deinen Sohn auswählen");
      await api("PUT", `/api/c/antworten/${el.dataset.termin}-${slug(meinKind())}`, { terminId: el.dataset.termin, familie: meinKind(), kommt: false, personen: 0, von: meinName() });
      await neuLaden("Schade, Absage ist eingetragen");
    } else if (a === "antwort-buchen" || a === "antwort-bezahlt") {
      const tm = Z.termine.find((x) => x.id === el.dataset.termin);
      const id = `${tm.id}-${slug(el.dataset.familie)}`;
      const ant = Z.antworten.find((x) => x.id === id);
      if (a === "antwort-buchen") {
        const gesamt = zahlende(tm, ant) * (tm.kostenProPerson || 0);
        const betrag = ant.angezahlt ? gesamt - zahlende(tm, ant) * (tm.anzahlung || 0) : gesamt;
        const kat = Z.einstellungen.kassenKategorien.find((k) => /tour/i.test(k) && tm.bis) || Z.einstellungen.kassenKategorien.find((k) => /feier|abend/i.test(k)) || "Mannschaftsfeier";
        await api("POST", "/api/c/kasse", { datum: heute(), art: "einnahme", betrag, zweck: `${tm.titel}: ${wirIhr().Familie}${el.dataset.familie}${ant.angezahlt ? " (Restzahlung)" : ""}`, kategorie: kat, kanal: "Bar", beleg: "" });
        await api("PUT", "/api/c/antworten/" + id, { bezahlt: true });
        await neuLaden(`${euro(betrag)} gebucht`);
      } else {
        await api("PUT", "/api/c/antworten/" + id, { bezahlt: false });
        await neuLaden("Als unbezahlt markiert. Die Buchung bitte in der Kasse löschen, falls nötig.");
      }
    } else if (a === "antwort-anzahlung") {
      const tm = Z.termine.find((x) => x.id === el.dataset.termin);
      const id = `${tm.id}-${slug(el.dataset.familie)}`;
      const ant = Z.antworten.find((x) => x.id === id);
      const betrag = zahlende(tm, ant) * (tm.anzahlung || 0);
      const kat = Z.einstellungen.kassenKategorien.find((k) => /tour/i.test(k)) || Z.einstellungen.kassenKategorien.find((k) => /feier|abend/i.test(k)) || "Mannschaftsfeier";
      await api("POST", "/api/c/kasse", { datum: heute(), art: "einnahme", betrag, zweck: `${tm.titel}: Anzahlung ${wirIhr().Familie}${el.dataset.familie}`, kategorie: kat, kanal: "Überweisung", beleg: "" });
      await api("PUT", "/api/c/antworten/" + id, { angezahlt: true });
      await neuLaden(`Anzahlung ${euro(betrag)} gebucht`);
    } else if (a === "abfrage-zelle") {
      const ab = Z.abfragen.find((x) => x.id === el.dataset.id);
      const alt = abfrageAntwort(ab, el.dataset.spieler);
      let gewaehlt;
      if (el.dataset.index === "ja") gewaehlt = alt?.gewaehlt === "ja" ? "nein" : "ja";
      else {
        const menge = new Set((alt?.gewaehlt || "").split(",").filter((x) => x !== "" && x !== "keiner"));
        if (menge.has(el.dataset.index)) menge.delete(el.dataset.index); else menge.add(el.dataset.index);
        gewaehlt = [...menge].sort((x, y) => x - y).join(",") || "keiner";
      }
      await api("PUT", `/api/c/abfrageAntworten/${ab.id}-${slug(el.dataset.spieler)}`, { abfrageId: ab.id, spieler: el.dataset.spieler, gewaehlt, von: alt?.von || `${meinVorname() || "Trainer"} (eingetragen)` });
      await neuLaden("Gespeichert");
    } else if (a === "abfrage-schliessen") {
      await api("PUT", "/api/c/abfragen/" + el.dataset.id, { geschlossen: el.dataset.wert === "ja" });
      await neuLaden(el.dataset.wert === "ja" ? "Abfrage beendet" : "Abfrage wieder offen");
    } else if (a === "name-zuordnung-loesen") {
      const zuordnung = { ...(Z.einstellungen.namenZuordnung || {}) };
      delete zuordnung[el.dataset.name];
      await api("PUT", "/api/einstellungen", { namenZuordnung: zuordnung });
      await neuLaden("Zuordnung gelöst");
    } else if (a === "name-aendern") {
      await willkommen({ nurName: true }); zeigen();
    } else if (a === "mitfahren-schnell") {
      el.disabled = true;
      await api("POST", "/api/c/mitfahrer", { fahrtId: el.dataset.fahrt, name: meinKind(), eingetragenVon: meinName() });
      await neuLaden(`${meinKind()} fährt mit`);
    } else if (a === "fahrt-anbieten") {
      ev.preventDefault();
      if (offeneSpiele === null) offeneSpiele = new Set();
      offeneSpiele.add(el.dataset.id);
      for (const id of ["spiel-", "mehr-", "anbieten-"]) { const d = document.getElementById(id + el.dataset.id); if (d) d.open = true; }
      document.getElementById("anbieten-" + el.dataset.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (a === "mehr-oeffnen") {
      if (offeneSpiele === null) offeneSpiele = new Set();
      offeneSpiele.add(el.dataset.id);
      for (const id of ["spiel-", "mehr-"]) { const d = document.getElementById(id + el.dataset.id); if (d) d.open = true; }
      document.getElementById("mehr-" + el.dataset.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (a === "namen-bereinigen") {
      if (!confirm("Alle Einträge auf Vorname (Sohn) umstellen? Nachnamen werden dabei dauerhaft entfernt.")) return;
      const r = await api("POST", "/api/namen-bereinigen");
      await neuLaden(r.geaendert ? `${r.geaendert} Einträge bereinigt` : "Alles war schon sauber");
    } else if (a === "strich") {
      el.disabled = true;
      const r = await api("PUT", "/api/strich/" + el.dataset.spiel, { getraenk: el.dataset.getraenk, delta: Number(el.dataset.delta) });
      Z.strichSummen = { ...(Z.strichSummen || {}), [el.dataset.spiel]: r.summen };
      const y = window.scrollY; zeigen(); window.scrollTo(0, y);
      const d = document.getElementById("strich-" + el.dataset.spiel); if (d) d.open = true;
    } else if (a === "spiele-filter") {
      spieleFilter = el.dataset.wert;
      if (location.hash !== "#/spiele") location.hash = "#/spiele"; else zeigen();
    } else if (a === "app-installieren") {
      await appInstallieren();
    } else if (a === "install-weg") {
      lokal("otv_install_weg", "1"); zeigen();
    } else if (a === "mitbringen-liste") {
      const box = document.getElementById(el.dataset.ziel || "mitbringen-auswahl");
      box.hidden = !box.hidden;
      el.setAttribute("aria-expanded", String(!box.hidden));
      if (!box.hidden) box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (a === "bringe-schnell") {
      const name = await nameSicherstellen();
      el.disabled = true;
      await api("POST", "/api/c/catering", { spielId: el.dataset.spiel, artikel: el.dataset.artikel, name, menge: "" });
      await neuLaden(`Danke, du bringst ${el.dataset.artikel} mit`);
    } else if (a === "kalender-link-kopieren") {
      try { await navigator.clipboard.writeText(el.dataset.link); meldung("Link kopiert"); }
      catch { window.prompt("Link zum Kopieren:", el.dataset.link); }
    } else if (a === "kalender-link-neu") {
      if (!confirm("Neuen Kalender-Link erzeugen? Der alte funktioniert dann nicht mehr, alle Eltern müssen neu abonnieren.")) return;
      const r = await api("POST", "/api/kalender-link/neu");
      kalenderPfad = r.pfad;
      await neuLaden("Neuer Kalender-Link erzeugt");
    } else if (a === "kalender-spiele") {
      kalenderLaden(kommende(spieleSortiert()).map((sp) => ({
        key: "spiel-" + sp.id, spiel: sp, link: "#/spiele",
        titel: `Handball C-Jugend: ${sp.heim ? "OTV gegen " + sp.gegner : sp.gegner + " gegen OTV"}`,
        text: `${sp.heim ? "Heimspiel" : "Auswärtsspiel"}${treffzeit(sp) ? `, Jungs um ${treffzeit(sp)} Uhr in der Halle` : ""}`,
      })));
    } else if (a === "kalender") {
      kalenderLaden(el.dataset.alle ? meineTermine() : meineTermine().filter((t) => t.key === el.dataset.key));
    } else if (a === "kassen-details") {
      kassenDetails = !kassenDetails; zeigen();
    } else if (a === "mitbringen-oeffnen") {
      const f = inhalt.querySelector(`form[data-key="${el.dataset.key}"]`);
      f.hidden = !f.hidden;
      if (!f.hidden) f.querySelector("input[name=menge]").focus();
    } else if (a === "whatsapp-spiel") {
      const sp = Z.spiele.find((x) => x.id === el.dataset.spiel);
      teilen(spielNachricht(sp));
    } else if (a === "whatsapp-catering") {
      teilen(cateringText(Z.spiele.find((x) => x.id === el.dataset.spiel)));
    } else if (a === "whatsapp-fahrten") {
      teilen(fahrtenText(Z.spiele.find((x) => x.id === el.dataset.spiel)));
    } else if (a === "whatsapp-abrechnung") {
      teilen(abrechnungsText(el.dataset.spiel));
    } else if (a === "springen") {
      const d = document.getElementById("spiel-" + el.dataset.id);
      d.open = true;
      d.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (a === "kassenfilter") {
      kassenFilter = el.dataset.wert; zeigen();
    } else if (a === "album") {
      albumFilter = el.dataset.wert; zeigen();
    } else if (a === "csv") {
      csvExport();
    } else if (a === "buchung-bearbeiten") {
      const b = Z.kasse.find((x) => x.id === el.dataset.id);
      const f = inhalt.querySelector('form[data-form="kasse"]');
      for (const [k, v] of Object.entries(b)) if (f.elements[k]) f.elements[k].value = k === "betrag" ? (v / 100).toFixed(2).replace(".", ",") : v;
      $("#buchung-titel").textContent = "Buchung ändern";
      $("#buchung-klappe").open = true;
      f.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (a === "buchung-abbrechen") {
      setTimeout(() => { $("#buchung-titel").textContent = "Einzelne Buchung erfassen"; inhalt.querySelector('form[data-form="kasse"]').elements.id.value = ""; });
    } else if (a === "foto") {
      lightbox(Number(el.dataset.index));
    }
  } catch (e) {
    meldung(e.message, true);
  }
});

const offeneMehr = new Set(); // aufgeklappte Detailbereiche bleiben nach dem Neuladen offen
inhalt.addEventListener("toggle", (ev) => {
  const d = ev.target;
  if (d.classList?.contains("mehr-details")) { const id = d.id.replace(/^mehr-/, ""); if (d.open) offeneMehr.add(id); else offeneMehr.delete(id); return; }
  if (!d.classList?.contains("spiel-karte")) return;
  const menge = offeneSpiele;
  if (!menge) return;
  if (d.open) menge.add(d.dataset.spiel); else menge.delete(d.dataset.spiel);
}, true);

function abrechnungRechnen(form) {
  const z = {};
  for (const g of getraenkeListe()) { const n = parseInt(form.elements["g:" + g.name]?.value || "0", 10); if (n > 0) z[g.name] = n; }
  const r = getraenkeRechnung(z);
  const ziel = form.querySelector("#getraenke-ergebnis");
  if (ziel) ziel.innerHTML = r.stueck ? `<strong>${r.stueck} Getränke · Umsatz ${euro(r.umsatz)}</strong> · an den OTV: <strong>${euro(r.otv)}</strong>` : "";
}
inhalt.addEventListener("input", (ev) => {
  const form = ev.target.closest?.('form[data-form="abrechnung"]');
  if (form) abrechnungRechnen(form);
});

inhalt.addEventListener("change", async (ev) => {
  const el = ev.target;
  const abr = el.closest?.('form[data-form="abrechnung"]');
  if (abr && el.name === "spielId") {
    const sp = Z.spiele.find((x) => x.id === el.value);
    for (const g of getraenkeListe()) { const f = abr.elements["g:" + g.name]; if (f) f.value = (sp && strichVon(sp)[g.name]) || ""; }
    abrechnungRechnen(abr);
    return;
  }
  try {
    if (el.dataset.aktion === "dienst-zuweisen") {
      if (!el.value) return;
      offeneSpiele?.add(el.dataset.spiel);
      await api("POST", "/api/c/dienste", { spielId: el.dataset.spiel, dienst: el.dataset.dienst, name: el.value, person: el.value, eingetragenVon: meinName() || "Trainer" });
      await neuLaden(`${el.value} ist für ${el.dataset.dienst} eingetragen`);
      return;
    }
    if (el.dataset.aktion === "antwort-admin") {
      const id = `${el.dataset.termin}-${slug(el.dataset.familie)}`;
      const alt = Z.antworten.find((x) => x.id === id);
      if (el.dataset.feld === "kommt") {
        if (el.value === "") { if (alt) await api("DELETE", "/api/c/antworten/" + id); }
        else await api("PUT", "/api/c/antworten/" + id, { terminId: el.dataset.termin, familie: el.dataset.familie, kommt: el.value === "ja", personen: el.value === "ja" ? (alt?.personen || 0) : 0, von: "Kasse" });
      } else {
        await api("PUT", "/api/c/antworten/" + id, { terminId: el.dataset.termin, familie: el.dataset.familie, kommt: true, personen: Number(el.value) || 0 });
      }
      await neuLaden("Gespeichert");
      return;
    }
    if (el.dataset.aktion === "name-zuordnen") {
      if (!el.value) return;
      if (el.value === "__loesen") {
        const z = { ...(Z.einstellungen.namenZuordnung || {}) };
        delete z[el.dataset.name.trim().toLowerCase()];
        await api("PUT", "/api/einstellungen", { namenZuordnung: z });
        await neuLaden("Zuordnung gelöst");
        return;
      }
      const zuordnung = { ...(Z.einstellungen.namenZuordnung || {}), [el.dataset.name.trim().toLowerCase()]: el.value };
      await api("PUT", "/api/einstellungen", { namenZuordnung: zuordnung });
      await neuLaden(el.value === "-" ? `${el.dataset.name} wird nicht mitgezählt` : `${el.dataset.name} gehört zu ${el.value}`);
      return;
    }
    if (el.dataset.aktion === "trikot-erledigt") {
      await api("PUT", "/api/c/trikots/" + el.dataset.id, { erledigt: el.checked });
      await neuLaden(el.checked ? "Als gewaschen markiert" : "Markierung entfernt");
    } else if (el.dataset.aktion === "trikot-tausch") {
      await api("PUT", "/api/c/trikots/" + el.dataset.id, { familie: el.value });
      await neuLaden("Trikotplan aktualisiert");
    }
  } catch (e) {
    meldung(e.message, true);
  }
});

function csvExport() {
  const e = Z.einstellungen;
  let lauf = e.anfangsbestand;
  const zeilenCsv = [["Datum", "Art", "Betrag", "Zweck", "Kategorie", "Bezahlt per", "Spiel", "Beleg", "Kassenstand"]];
  zeilenCsv.push([e.anfangsdatum, "Anfangsbestand", "", "", "", "", "", "", (lauf / 100).toFixed(2).replace(".", ",")]);
  for (const b of kassenBuchungen()) {
    lauf += b.art === "einnahme" ? b.betrag : -b.betrag;
    zeilenCsv.push([b.datum, b.art === "einnahme" ? "Einnahme" : "Ausgabe", ((b.art === "einnahme" ? 1 : -1) * b.betrag / 100).toFixed(2).replace(".", ","),
      b.zweck, b.kategorie, b.kanal, spielName(b.spielId), b.beleg, (lauf / 100).toFixed(2).replace(".", ",")]);
  }
  const csv = "﻿" + zeilenCsv.map((z) => z.map((f) => `"${String(f ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `Kassenbericht_C-Jugend_${heute()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ---------- Galerie: verkleinern, hochladen, ansehen ----------
async function verkleinern(datei, maxKante, qualitaet) {
  let bild;
  try {
    bild = await createImageBitmap(datei, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`„${datei.name}“ kann nicht gelesen werden. Bitte als JPEG oder PNG hochladen.`);
  }
  const faktor = Math.min(1, maxKante / Math.max(bild.width, bild.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bild.width * faktor);
  canvas.height = Math.round(bild.height * faktor);
  canvas.getContext("2d").drawImage(bild, 0, 0, canvas.width, canvas.height);
  bild.close?.();
  // Neu kodiert: EXIF-Daten inklusive GPS-Standort gehen dabei verloren
  return new Promise((ok) => canvas.toBlob(ok, "image/jpeg", qualitaet));
}

async function fotosHochladen(form, w) {
  const dateien = [...form.elements.dateien.files];
  if (!dateien.length) throw new Error("Bitte Fotos auswählen");
  if (dateien.length > 30) throw new Error("Bitte höchstens 30 Fotos auf einmal");
  const status = $("#upload-status");
  let fertig = 0;
  for (const datei of dateien) {
    status.innerHTML = `<div class="leise">Lade ${fertig + 1} von ${dateien.length} hoch …</div><div class="fortschritt"><div style="width:${(fertig / dateien.length) * 100}%"></div></div>`;
    const gross = await verkleinern(datei, 1800, 0.82);
    const klein = await verkleinern(datei, 480, 0.75);
    const fd = new FormData();
    fd.append("gross", gross, "gross.jpg");
    fd.append("klein", klein, "klein.jpg");
    fd.append("album", w.album);
    fd.append("name", w.name || "");
    await api("POST", "/api/galerie", fd);
    fertig++;
  }
  galerie = await api("GET", "/api/galerie");
  albumFilter = w.album.trim() || "Alle";
  zeigen();
  meldung(`${fertig} Foto${fertig === 1 ? "" : "s"} hochgeladen`);
}

function lightbox(start) {
  const liste = galerie.filter((f) => albumFilter === "Alle" || f.album === albumFilter);
  let i = start;
  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  const zeichnen = () => {
    const f = liste[i];
    box.innerHTML = `<button class="lb-zu" aria-label="Schließen">×</button>
      ${liste.length > 1 ? `<button class="lb-nav links" aria-label="Vorheriges">‹</button><button class="lb-nav rechts" aria-label="Nächstes">›</button>` : ""}
      <img src="/api/foto/${f.id}/gross" alt="${esc(f.titel || f.album)}">
      <div class="lightbox-leiste"><span>${esc(f.album)}${f.name ? " · von " + esc(f.name) : ""} · ${i + 1}/${liste.length}</span>
        <a class="knopf zweit klein" href="/api/foto/${f.id}/gross" download="OTV-C-Jugend-${f.id}.jpg">Speichern</a>
        ${f.gemeldet && istAdmin() ? `<span style="color:#ffb3ab">Gemeldet: ${esc(f.meldegrund || "ohne Grund")}</span><button class="knopf zweit klein" data-lb="freigeben">Freigeben</button>`
          : `<button class="knopf zweit klein" data-lb="melden">Melden</button>`}
        ${darfLoeschen(f) ? `<button class="knopf zweit klein" data-lb="loeschen">Löschen</button>` : ""}
      </div>`;
  };
  const schliessen = () => { box.remove(); document.removeEventListener("keydown", tasten); };
  const tasten = (e) => {
    if (e.key === "Escape") schliessen();
    if (e.key === "ArrowLeft") { i = (i - 1 + liste.length) % liste.length; zeichnen(); }
    if (e.key === "ArrowRight") { i = (i + 1) % liste.length; zeichnen(); }
  };
  box.addEventListener("click", async (e) => {
    const t = e.target;
    if (t === box || t.classList.contains("lb-zu")) return schliessen();
    if (t.classList.contains("links")) { i = (i - 1 + liste.length) % liste.length; return zeichnen(); }
    if (t.classList.contains("rechts")) { i = (i + 1) % liste.length; return zeichnen(); }
    const f = liste[i];
    try {
      if (t.dataset.lb === "melden") {
        const grund = prompt("Warum soll das Foto entfernt werden? Es wird sofort ausgeblendet und von der Kassenführung geprüft.");
        if (grund === null) return;
        await api("POST", `/api/galerie/${f.id}/melden`, { grund });
        meldung("Danke, das Foto wurde ausgeblendet");
      } else if (t.dataset.lb === "freigeben") {
        await api("POST", `/api/galerie/${f.id}/freigeben`);
        meldung("Foto freigegeben");
      } else if (t.dataset.lb === "loeschen") {
        if (!confirm("Foto endgültig löschen?")) return;
        await api("DELETE", `/api/galerie/${f.id}`);
        meldung("Foto gelöscht");
      } else return;
      galerie = await api("GET", "/api/galerie");
      schliessen();
      zeigen();
    } catch (err) {
      meldung(err.message, true);
    }
  });
  document.addEventListener("keydown", tasten);
  zeichnen();
  document.body.appendChild(box);
}

// ---------- Start ----------
$("#unten-mehr").addEventListener("click", mehrMenue);
$("#hallo").addEventListener("click", async () => { await willkommen({ nurName: true }); zeigen(); });
$("#abmelden").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  location.href = "/login.html";
});
let letzterPfad = "";
window.addEventListener("hashchange", () => {
  const pfad = location.hash.replace(/^#\/?/, "").split("?")[0];
  if (pfad === "spiele" && !["spiele", "catering", "fahrten"].includes(letzterPfad)) spieleFilter = "alle";
  letzterPfad = pfad;
  zeigen(); window.scrollTo(0, 0);
});

// Aktuelle Daten holen, wenn die Seite wieder in den Vordergrund kommt (z. B. App vom Startbildschirm)
let zuletztGeladen = Date.now();
async function stillAktualisieren() {
  if (document.hidden || Date.now() - zuletztGeladen < 60_000) return;
  // Nicht stören, wenn gerade ein Fenster offen ist oder jemand tippt
  if (document.querySelector(".lightbox") || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  try {
    await laden();
    zuletztGeladen = Date.now();
    const y = window.scrollY;
    zeigen();
    window.scrollTo(0, y);
  } catch { /* offline: alten Stand behalten */ }
}
document.addEventListener("visibilitychange", stillAktualisieren);
window.addEventListener("focus", stillAktualisieren);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

// Früher eingegebene Nachnamen auf dem Gerät entfernen, damit neue Einträge nur den Vornamen tragen
(() => {
  const v = (lokal("otv_vorname") || "").trim();
  if (v && /\s/.test(v)) {
    const nur = v.split(/\s+/)[0];
    lokal("otv_vorname", nur);
    const k = lokal("otv_kind");
    lokal("otv_name", k ? `${nur} (${k})` : (lokal("otv_name") || "").includes("(Trainer)") ? `${nur} (Trainer)` : nur);
  }
})();

laden().then(() => {
  setTimeout(pushAuffrischen, 1500);
  if (Z.demo) { if (lokal("otv_rolle") !== Z.rolle || !meinName()) demoPerson(); zeigen(); return; }
  zeigen();
  const alteRolle = lokal("otv_rolle");
  lokal("otv_rolle", Z.rolle);
  if (!lokal("otv_willkommen") && !meinName()) willkommen().then(() => zeigen());
  else if (alteRolle && alteRolle !== Z.rolle) willkommen({ nurName: true }).then(() => zeigen());
  else if (meinKind() && !Z.kader.some((k) => k.vorname === meinKind())) {
    // Kader wurde geändert (z. B. "Levi" heißt jetzt "Levi H."): Sohn einmal neu auswählen lassen
    lokal("otv_kind", "");
    willkommen({ nurName: true }).then(() => zeigen());
  }
}).catch((e) => {
  inhalt.innerHTML = `<div class="hinweis">Die Seite konnte nicht geladen werden: ${esc(e.message)}</div>`;
});
